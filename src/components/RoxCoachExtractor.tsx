import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Zap, Search, Trophy, Check, CheckCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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

export default function RoxCoachExtractor({ onSuccess, mode = 'full' }: RoxCoachExtractorProps) {
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
  const [importingAll, setImportingAll] = useState(false);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [consentGiven, setConsentGiven] = useState(false);

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

      // In diagnostic_only mode, show all results; in full mode, show only most recent
      const sorted = rawResults.sort((a, b) => b.season_id - a.season_id);
      const displayed = mode === 'diagnostic_only' ? sorted : sorted.slice(0, 1);

      // Filter out already-imported races
      if (user) {
        const urls = displayed.map(r => buildRoxCoachUrl(r));
        const { data: existing } = await supabase
          .from('diagnostico_resumo')
          .select('source_url')
          .eq('atleta_id', user.id)
          .in('source_url', urls);
        
        const importedUrls = new Set((existing || []).map(e => e.source_url));
        const filtered = displayed.filter(r => !importedUrls.has(buildRoxCoachUrl(r)));
        setSearchResults(filtered);
      } else {
        setSearchResults(displayed);
      }
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

    // Override metadata with SearchResult (source of truth)
    parsed.resumoRow.evento = result.event_name;
    parsed.resumoRow.temporada = String(result.season_id);
    parsed.resumoRow.divisao = result.division;
    parsed.resumoRow.finish_time = result.time_formatted;
    parsed.resumoRow.nome_atleta = result.athlete_name;

    // Deduplication check
    const { data: existingDiag } = await supabase
      .from('diagnostico_resumo')
      .select('id')
      .eq('atleta_id', user.id)
      .eq('source_url', roxCoachUrl)
      .maybeSingle();

    if (existingDiag) {
      toast.info('Diagnóstico desta prova já foi importado.');
      return ['já importado'];
    }

    // Insert resumo first to get its ID for linking
    const { data: insertedResumo, error: resumoError } = await supabase
      .from('diagnostico_resumo')
      .insert(parsed.resumoRow)
      .select('id')
      .single();

    if (resumoError || !insertedResumo) {
      throw new Error(`Erro ao salvar resumo: ${resumoError?.message || 'unknown'}`);
    }

    const resumoId = insertedResumo.id;
    const results: string[] = [];

    if (parsed.diagRows.length > 0) {
      const rowsWithResumoId = parsed.diagRows.map(r => ({ ...r, resumo_id: resumoId }));
      const { error } = await supabase.from('diagnostico_melhoria').insert(rowsWithResumoId);
      if (error) throw new Error(`Erro ao salvar diagnóstico: ${error.message}`);
      results.push(`${parsed.diagRows.length} diagnósticos`);
    }
    if (parsed.splitRows.length > 0) {
      const rowsWithResumoId = parsed.splitRows.map(r => ({ ...r, resumo_id: resumoId }));
      const { error } = await supabase.from('tempos_splits').insert(rowsWithResumoId);
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
      // In diagnostic_only mode, skip race history save
      const tasks: Promise<any>[] = [generateDiagnostic(result)];
      if (mode === 'full') {
        tasks.unshift(saveRaceHistory(result));
      }
      const settled = await Promise.allSettled(tasks);
      const diagnosticResult = mode === 'full' ? settled[1] : settled[0];

      if (diagnosticResult.status === 'fulfilled' && diagnosticResult.value) {
        toast.success(`Diagnóstico gerado: ${diagnosticResult.value.join(' + ')} 🔥`);
        // Remove imported result from list
        setSearchResults(prev => prev.filter(r => r.result_url !== result.result_url));
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

  /** Import selected results sequentially */
  async function handleImportSelected() {
    if (!user || selectedResults.size === 0) return;
    const toImport = searchResults.filter(r => selectedResults.has(r.result_url));
    if (toImport.length === 0) return;

    setImportingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const result of toImport) {
      setSelectedUrl(result.result_url);
      try {
        const tasks: Promise<any>[] = [generateDiagnostic(result)];
        if (mode === 'full') tasks.unshift(saveRaceHistory(result));
        const settled = await Promise.allSettled(tasks);
        const diagResult = mode === 'full' ? settled[1] : settled[0];
        if (diagResult.status === 'fulfilled' && diagResult.value) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setSelectedUrl('');
    setImportingAll(false);
    setSelectedResults(new Set());

    if (successCount > 0) {
      toast.success(`${successCount} diagnóstico(s) importado(s) com sucesso! 🔥`);
      setSearchResults(prev => prev.filter(r => !selectedResults.has(r.result_url)));
      onSuccess();
    }
    if (failCount > 0) {
      toast.error(`${failCount} prova(s) não puderam ser importadas.`);
    }
  }

  function toggleResultSelection(url: string) {
    setSelectedResults(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedResults.size === searchResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(searchResults.map(r => r.result_url)));
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
          {mode === 'diagnostic_only'
            ? 'Busque seu nome para encontrar suas provas e importar o diagnóstico.'
            : 'Busque seu nome para encontrar sua última prova e gerar o diagnóstico automaticamente.'}
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
          <span className="text-sm">
            {mode === 'diagnostic_only' ? 'Buscando provas...' : 'Buscando sua última prova...'}
          </span>
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
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">
                {mode === 'diagnostic_only'
                  ? `${searchResults.length} prova(s) nova(s) encontrada(s):`
                  : 'Última prova encontrada — clique para gerar o diagnóstico:'}
              </p>
              {mode === 'diagnostic_only' && searchResults.length > 1 && (
                <button
                  onClick={toggleSelectAll}
                  disabled={generating || importingAll}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-40"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {selectedResults.size === searchResults.length ? 'Desmarcar todas' : 'Selecionar todas'}
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {searchResults.map((result, idx) => {
                const isSelected = selectedUrl === result.result_url;
                const isChecked = selectedResults.has(result.result_url);
                return (
                  <motion.div
                    key={`${result.result_url}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : isChecked
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-background hover:border-primary/50 hover:bg-muted/30'
                    } ${(generating || importingAll) && !isSelected ? 'opacity-40' : ''}`}
                  >
                    {mode === 'diagnostic_only' ? (
                      <button
                        onClick={() => toggleResultSelection(result.result_url)}
                        disabled={generating || importingAll}
                        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          isChecked ? 'bg-primary border-primary' : 'border-muted-foreground/30 hover:border-primary/60'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </button>
                    ) : (
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <button
                      onClick={() => mode === 'diagnostic_only' ? toggleResultSelection(result.result_url) : handleGenerateDiagnostic(result)}
                      disabled={generating || importingAll}
                      className="flex-1 min-w-0 text-left disabled:cursor-not-allowed"
                    >
                      <p className="text-sm font-medium text-foreground truncate">
                        {result.event_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.athlete_name} • {result.division}
                      </p>
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {result.time_formatted && (
                        <span className="text-sm font-bold text-primary">
                          {result.time_formatted}
                        </span>
                      )}
                      {isSelected && (generating || importingAll) && (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Consent + Import button */}
            {(mode === 'diagnostic_only' ? selectedResults.size > 0 : searchResults.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 pt-2"
              >
                <label className="flex items-start gap-3 cursor-pointer group">
                  <Checkbox
                    checked={consentGiven}
                    onCheckedChange={(v) => setConsentGiven(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                    <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-primary" />
                    Autorizo a utilização dos meus dados de performance para geração do diagnóstico e análise dentro da plataforma Outlier.
                  </span>
                </label>

                <Button
                  onClick={() => {
                    if (mode === 'diagnostic_only') {
                      handleImportSelected();
                    } else {
                      const result = searchResults[0];
                      if (result) handleGenerateDiagnostic(result);
                    }
                  }}
                  disabled={!consentGiven || generating || importingAll || (mode === 'diagnostic_only' && selectedResults.size === 0)}
                  className="w-full h-11 rounded-xl font-bold"
                >
                  {generating || importingAll ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importando...</>
                  ) : mode === 'diagnostic_only' ? (
                    <>Importar selecionadas ({selectedResults.size})</>
                  ) : (
                    <>Gerar diagnóstico</>
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!searching && searchDone && searchResults.length === 0 && (
        <div className="py-6 text-center space-y-2">
          <Search className="w-8 h-8 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Nenhuma prova nova encontrada. Todas já foram importadas ou tente outro nome.
          </p>
        </div>
      )}
    </div>
  );
}
