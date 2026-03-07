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
}

interface SearchResult {
  athlete_name: string;
  event_name: string;
  division: string;
  time_formatted: string;
  result_url: string;
  season_id: number;
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
      setSearchResults(data?.results || []);
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

  /** Save diagnostic data using shared parser — only to diagnostic tables, never benchmark_results */
  async function saveDiagnosticData(apiData: any, sourceUrl: string) {
    if (!user) return;
    const parsed = parseDiagnosticResponse(apiData, user.id, sourceUrl);
    if (!hasDiagnosticData(parsed)) {
      throw new Error('Não foi possível extrair dados válidos dessa prova.');
    }

    // Delete old + insert new (same pattern as ImportarProva)
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

  async function handleGenerateDiagnostic(result: SearchResult) {
    if (!user) {
      toast.error('Faça login para continuar.');
      return;
    }

    setSelectedUrl(result.result_url);
    setGenerating(true);

    try {
      let proxyData: any = null;
      try {
        const result2 = await supabase.functions.invoke('proxy-roxcoach', {
          body: { url: result.result_url },
        });
        if (!result2.error) {
          proxyData = result2.data;
        } else {
          console.warn('proxy-roxcoach returned error (non-fatal):', result2.error.message);
        }
      } catch (networkErr) {
        console.warn('proxy-roxcoach network error (non-fatal):', networkErr);
      }

      if (!proxyData) {
        toast.error('A API de diagnóstico está indisponível para esta prova. Tente outra prova ou tente novamente mais tarde.');
        return;
      }

      console.log('Raw API Response:', JSON.stringify(proxyData, null, 2));

      const results = await saveDiagnosticData(proxyData, result.result_url);
      toast.success(`Diagnóstico gerado: ${(results || []).join(' + ')} 🔥`);
      onSuccess();
    } catch (err: any) {
      console.error('Diagnostic generation error:', err);
      toast.error(err?.message || 'Erro ao gerar diagnóstico.');
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
          Busque seu nome para encontrar suas provas e gerar o diagnóstico automaticamente.
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
          <span className="text-sm">Buscando suas provas...</span>
        </div>
      )}

      {/* Results list */}
      <AnimatePresence>
        {!searching && searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground font-medium">
              {searchResults.length} resultado{searchResults.length > 1 ? 's' : ''} encontrado{searchResults.length > 1 ? 's' : ''} — selecione a prova para diagnosticar:
            </p>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {searchResults.map((result, idx) => {
                const isSelected = selectedUrl === result.result_url;
                return (
                  <motion.button
                    key={`${result.result_url}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
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
