import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Zap, Search, Trophy, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import { parseDiagnosticResponse, hasDiagnosticData } from '@/utils/diagnosticParser';
import { motion, AnimatePresence } from 'framer-motion';

interface RoxCoachExtractorProps {
  onSuccess: () => void;
  /** 'full' = save race + diagnostic (default); 'diagnostic_only' = only diagnostic tables */
  mode?: 'full' | 'diagnostic_only';
}

interface SearchResult {
  athlete_name: string;
  event_name: string;
  division: string;
  time_formatted: string;
  result_url: string;
  season_id: number;
}

/** Convert a string to a URL-friendly slug */
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')    // remove special chars
    .trim()
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/-+/g, '-');            // collapse multiple hyphens
}

/** Build the RoxCoach URL from SearchResult data */
function buildRoxCoachUrl(result: SearchResult): string {
  const seasonId = result.season_id;
  // event_name comes as "2025 Rio de Janeiro • HYROX PRO" — extract before " • "
  const eventPart = result.event_name.split(' • ')[0] || result.event_name;
  const eventSlug = toSlug(eventPart);
  const athleteSlug = toSlug(result.athlete_name);
  return `https://www.rox-coach.com/seasons/${seasonId}/races/${eventSlug}/results/${athleteSlug}`;
}

/** Extract idp from a Hyrox result URL */
function extractIdpFromUrl(url: string): { idp: string | null; event: string | null } {
  try {
    const urlObj = new URL(url);
    return {
      idp: urlObj.searchParams.get('idp'),
      event: urlObj.searchParams.get('event') || null,
    };
  } catch {
    const idpMatch = url.match(/idp=([^&]+)/);
    const eventMatch = url.match(/event=([^&]+)/);
    return {
      idp: idpMatch ? idpMatch[1] : null,
      event: eventMatch ? eventMatch[1] : null,
    };
  }
}

export default function RoxCoachExtractor({ onSuccess }: RoxCoachExtractorProps) {
  const { user, profile } = useAuth();
  const { athleteConfig } = useOutlierStore();

  const profileName = profile?.name || '';
  const [searchQuery, setSearchQuery] = useState(profileName);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedRef = useRef('');

  const [generating, setGenerating] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState('');

  useEffect(() => {
    if (!profileName || !user) return;
    executeSearch(profileName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executeSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (trimmed === lastSearchedRef.current) return;
    lastSearchedRef.current = trimmed;

    const parts = trimmed.split(/\s+/);
    let firstName = '';
    let lastName = '';
    if (parts.length === 1) {
      lastName = parts[0];
    } else {
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }

    setSearching(true);
    setSearchDone(false);

    try {
      const gender = athleteConfig?.sexo === 'feminino' ? 'W' : athleteConfig?.sexo === 'masculino' ? 'M' : '';
      const { data, error } = await supabase.functions.invoke('search-hyrox-athlete', {
        body: { firstName, lastName, gender },
      });
      if (error) throw error;

      const rawResults: SearchResult[] = data?.results || [];

      // REGRA 1: Sort by most recent (higher season_id first) then slice to 1
      const sorted = rawResults.sort((a, b) => b.season_id - a.season_id);
      const mostRecent = sorted.slice(0, 1);

      setSearchResults(mostRecent);
    } catch (err: any) {
      console.error('Search error:', err);
      toast.error('Erro ao buscar resultados.');
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  }, [athleteConfig?.sexo]);

  function handleQueryChange(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 3) {
      debounceRef.current = setTimeout(() => executeSearch(value), 800);
    }
  }

  /** Action A: Save race history to race_results table */
  async function saveRaceHistory(result: SearchResult) {
    if (!user) return;
    const { idp, event: eventCode } = extractIdpFromUrl(result.result_url);
    if (!idp) {
      console.warn('No idp found in result URL, skipping race history save');
      return;
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('race_results')
      .select('id')
      .eq('athlete_id', user.id)
      .eq('hyrox_idp', idp)
      .maybeSingle();

    if (existing) {
      console.log('Race already saved, skipping duplicate');
      return;
    }

    const { error } = await supabase.from('race_results').insert({
      athlete_id: user.id,
      hyrox_idp: idp,
      source_url: result.result_url,
      hyrox_event: result.event_name,
    });

    if (error) {
      console.error('Error saving race history:', error);
    } else {
      console.log('Race history saved successfully');
    }
  }

  /** Action B: Generate diagnostic via RoxCoach URL */
  async function generateDiagnostic(result: SearchResult): Promise<string[] | null> {
    if (!user) return null;

    const roxCoachUrl = buildRoxCoachUrl(result);
    console.log('[RoxCoachExtractor] Built RoxCoach URL:', roxCoachUrl);

    let proxyData: any = null;
    try {
      const proxyResult = await supabase.functions.invoke('proxy-roxcoach', {
        body: { url: roxCoachUrl },
      });
      if (!proxyResult.error) {
        proxyData = proxyResult.data;
      } else {
        console.warn('proxy-roxcoach returned error:', proxyResult.error.message);
      }
    } catch (networkErr) {
      console.warn('proxy-roxcoach network error:', networkErr);
    }

    if (!proxyData) {
      return null;
    }

    // Check for upstream error flag
    if (proxyData.ok === false) {
      console.warn('proxy-roxcoach upstream error:', proxyData.upstream_error_detail);
      return null;
    }

    console.log('Raw API Response keys:', Object.keys(proxyData));

    // Parse and save diagnostic data
    const parsed = parseDiagnosticResponse(proxyData, user.id, roxCoachUrl);
    if (!hasDiagnosticData(parsed)) {
      throw new Error('Não foi possível extrair dados válidos dessa prova.');
    }

    // Delete old + insert new
    await Promise.all([
      supabase.from('diagnostico_resumo').delete().eq('atleta_id', user.id),
      supabase.from('diagnostico_melhoria').delete().eq('atleta_id', user.id),
      supabase.from('tempos_splits').delete().eq('atleta_id', user.id),
    ]);

    await supabase.from('diagnostico_resumo').insert(parsed.resumoRow);

    const results: string[] = [];
    if (parsed.diagRows.length > 0) {
      const { error } = await supabase.from('diagnostico_melhoria').insert(parsed.diagRows);
      if (error) throw new Error(`Erro ao salvar diagnóstico: ${error.message}`);
      results.push(`${parsed.diagRows.length} diagnósticos`);
    }
    if (parsed.splitRows.length > 0) {
      const { error } = await supabase.from('tempos_splits').insert(parsed.splitRows);
      if (error) throw new Error(`Erro ao salvar splits: ${error.message}`);
      results.push(`${parsed.splitRows.length} splits`);
    }

    return results;
  }

  /** REGRA 2: Split click into two parallel actions */
  async function handleGenerateDiagnostic(result: SearchResult) {
    if (!user) {
      toast.error('Faça login para continuar.');
      return;
    }

    setSelectedUrl(result.result_url);
    setGenerating(true);

    try {
      // Execute Action A (save history) and Action B (diagnostic) in parallel
      const [, diagnosticResult] = await Promise.allSettled([
        saveRaceHistory(result),
        generateDiagnostic(result),
      ]);

      if (diagnosticResult.status === 'fulfilled' && diagnosticResult.value) {
        toast.success(`Diagnóstico gerado: ${diagnosticResult.value.join(' + ')} 🔥`);
        onSuccess();
      } else if (diagnosticResult.status === 'rejected') {
        console.error('Diagnostic generation error:', diagnosticResult.reason);
        toast.error(diagnosticResult.reason?.message || 'Erro ao gerar diagnóstico.');
      } else {
        // diagnosticResult.value is null — proxy failed
        toast.error('A API de diagnóstico está indisponível para esta prova. Tente novamente mais tarde.');
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      toast.error(err?.message || 'Erro inesperado.');
    } finally {
      setGenerating(false);
      setSelectedUrl('');
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Diagnóstico de Performance
        </h2>
        <p className="text-xs text-muted-foreground">
          Busque seu nome para encontrar sua última prova e gerar o diagnóstico automaticamente.
        </p>
      </div>

      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Digite seu nome completo..."
            className="h-12 rounded-xl pl-10"
            disabled={generating}
          />
        </div>
        <Button
          onClick={() => executeSearch(searchQuery)}
          disabled={searching || searchQuery.trim().length < 2 || generating}
          className="h-12 rounded-xl px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
        >
          {searching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Loading */}
      {searching && (
        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Buscando sua última prova...</span>
        </div>
      )}

      {/* Results list — only 1 result (most recent) */}
      <AnimatePresence>
        {!searching && searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground font-medium">
              Última prova encontrada — clique para gerar o diagnóstico:
            </p>
            <div className="space-y-1.5">
              {searchResults.map((result, idx) => {
                const isSelected = selectedUrl === result.result_url;
                return (
                  <motion.button
                    key={`${result.result_url}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => handleGenerateDiagnostic(result)}
                    disabled={generating}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/50 hover:bg-muted/30'
                    } ${generating && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {result.event_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.athlete_name} • {result.division}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {result.time_formatted && (
                        <span className="text-sm font-bold text-primary">
                          {result.time_formatted}
                        </span>
                      )}
                      {isSelected && generating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!searching && searchDone && searchResults.length === 0 && (
        <div className="py-6 text-center space-y-2">
          <Search className="w-8 h-8 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Nenhum resultado encontrado. Tente outro nome ou verifique a grafia.
          </p>
        </div>
      )}
    </div>
  );
}
