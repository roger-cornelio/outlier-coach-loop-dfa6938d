import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flame, ExternalLink, CheckCircle2, Loader2, AlertTriangle, Search, Trophy, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import {
  calculateAndSaveHyroxPercentiles,
  hasExistingScores,
  type MetricInput,
} from '@/utils/hyroxPercentileCalculator';
import { parseDiagnosticResponse, hasDiagnosticData } from '@/utils/diagnosticParser';

// --- Utility functions ---

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

function generateMetricsFromSplits(splits: Record<string, number>): MetricInput[] {
  const metrics: MetricInput[] = [];
  const mapping: Record<string, string> = {
    run_avg_sec: 'run_avg', roxzone_sec: 'roxzone', ski_sec: 'ski',
    sled_push_sec: 'sled_push', sled_pull_sec: 'sled_pull', bbj_sec: 'bbj',
    row_sec: 'row', farmers_sec: 'farmers', sandbag_sec: 'sandbag', wallballs_sec: 'wallballs',
  };
  for (const [key, metricName] of Object.entries(mapping)) {
    if (splits[key] && splits[key] > 0) {
      metrics.push({ metric: metricName, raw_time_sec: Math.round(splits[key]), data_source: 'real' as const });
    }
  }
  return metrics;
}

function generateMetricsFromTotal(totalSeconds: number): MetricInput[] {
  const runPercent = 0.42;
  const stationPercent = 0.48;
  const roxzonePercent = 0.10;
  const totalRunTime = totalSeconds * runPercent;
  const totalStationTime = totalSeconds * stationPercent;
  const totalRoxzone = totalSeconds * roxzonePercent;
  const runAvg = totalRunTime / 8;
  const stationWeights: Record<string, number> = {
    ski: 0.14, sled_push: 0.12, sled_pull: 0.10, bbj: 0.14,
    row: 0.14, farmers: 0.12, sandbag: 0.14, wallballs: 0.10,
  };
  return [
    { metric: 'run_avg', raw_time_sec: Math.round(runAvg), data_source: 'estimated' as const },
    { metric: 'roxzone', raw_time_sec: Math.round(totalRoxzone), data_source: 'estimated' as const },
    ...Object.entries(stationWeights).map(([key, weight]) => ({
      metric: key, raw_time_sec: Math.round(totalStationTime * weight), data_source: 'estimated' as const,
    })),
  ];
}

function splitAthleteName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: '', lastName: parts[0] || '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/** Convert "LastName, FirstName" (HYROX format) to "FirstName LastName" */
function formatAthleteName(hyroxName: string): string {
  if (!hyroxName.includes(',')) return hyroxName;
  const [last, first] = hyroxName.split(',').map(s => s.trim());
  return first ? `${first} ${last}` : last;
}

// --- Types ---

type SearchResult = {
  athlete_name: string;
  event_name: string;
  division?: string;
  time_formatted: string;
  result_url: string;
  season_id?: number;
};

type ImportStep = 'search' | 'input' | 'loading' | 'success' | 'error' | 'batch-loading' | 'batch-success';

// --- Component ---

export default function ImportarProva() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { athleteConfig, triggerExternalResultsRefresh } = useOutlierStore();

  const [step, setStep] = useState<ImportStep>('search');
  const [url, setUrl] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [savedUrl, setSavedUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [extractedInfo, setExtractedInfo] = useState('');

  // Search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchDone, setSearchDone] = useState(false);

  // Multi-select state
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, errors: 0 });


  // Fuzzy search: single input with debounce
  const profileName = profile?.name || '';
  const [searchQuery, setSearchQuery] = useState(profileName);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedRef = useRef('');

  const hasGenderConfigured = athleteConfig?.sexo && ['masculino', 'feminino'].includes(athleteConfig.sexo);

  const executeSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (trimmed === lastSearchedRef.current) return;
    lastSearchedRef.current = trimmed;

    // Split query into first/last name for the API
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
    setSearchError('');
    setSearchDone(false);

    try {
      const gender = athleteConfig?.sexo === 'feminino' ? 'W' : athleteConfig?.sexo === 'masculino' ? 'M' : '';

      const { data, error } = await supabase.functions.invoke('search-hyrox-athlete', {
        body: { firstName: firstName, lastName: lastName, gender },
      });

      if (error) throw error;
      setSearchResults(data?.results || []);
      setSelectedIndices(new Set());
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError('Não foi possível buscar resultados automaticamente.');
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  }, [athleteConfig?.sexo]);

  // Auto-search on mount if profile name exists
  useEffect(() => {
    if (!profileName || !user) return;
    executeSearch(profileName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search on query change
  function handleQueryChange(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 3) {
      debounceRef.current = setTimeout(() => executeSearch(value), 800);
    }
  }

  function toggleSelection(idx: number) {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function selectAll() {
    if (selectedIndices.size === searchResults.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(searchResults.map((_, i) => i)));
    }
  }

  async function handleImportFromSearch(result: SearchResult) {
    if (!agreed) {
      toast.error('Aceite a autorização para continuar.');
      return;
    }
    setUrl(result.result_url);
    await handleImport(result.result_url);
  }

  async function handleBatchImport() {
    if (!agreed) {
      toast.error('Aceite a autorização para continuar.');
      return;
    }
    if (selectedIndices.size === 0) {
      toast.error('Selecione pelo menos uma prova.');
      return;
    }

    const selected = Array.from(selectedIndices).map(i => searchResults[i]);
    setBatchImporting(true);
    setBatchProgress({ done: 0, total: selected.length, errors: 0 });
    setStep('batch-loading');

    let errors = 0;
    for (let i = 0; i < selected.length; i++) {
      try {
        await handleImportSilent(selected[i].result_url);
      } catch {
        errors++;
      }
      setBatchProgress({ done: i + 1, total: selected.length, errors });
    }

    triggerExternalResultsRefresh();
    setBatchImporting(false);
    setStep('batch-success');
    setBatchProgress(prev => ({ ...prev, errors }));
  }

  /** Silent import — no step/UI changes, throws on error */
  async function handleImportSilent(importUrl: string) {
    // Run scrape + diagnostic proxy in parallel
    const [scrapeResult, diagResult] = await Promise.all([
      supabase.functions.invoke('scrape-hyrox-result', { body: { url: importUrl } }),
      supabase.functions.invoke('proxy-roxcoach', { body: { url: importUrl } }).catch(() => ({ data: null, error: null })),
    ]);

    const { data: scrapeData, error: scrapeError } = scrapeResult;
    if (scrapeError) throw new Error('Não foi possível ler os dados do link.');
    if (scrapeData?.error || !scrapeData?.time_in_seconds) {
      throw new Error(scrapeData?.error || 'Não encontramos os tempos no link.');
    }

    const totalSeconds = scrapeData.time_in_seconds;
    const eventName = scrapeData.event_name || 'Prova HYROX';
    const eventYear = scrapeData.event_year || new Date().getFullYear();
    const eventDate = `${eventYear}-01-01`;
    const raceCategory = scrapeData.race_category || 'OPEN';
    const splits = scrapeData.splits || null;
    const hasSplits = splits && Object.values(splits).some((v: any) => v && v > 0);

    const insertPayload = {
      user_id: user!.id,
      result_type: 'prova_oficial',
      event_name: eventName,
      event_date: eventDate,
      time_in_seconds: totalSeconds,
      screenshot_url: importUrl,
      race_category: raceCategory,
      completed: true,
      block_id: `prova_oficial_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      workout_id: `prova_oficial_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      benchmark_id: 'HYROX_OFFICIAL',
      ...(hasSplits && splits.run_avg_sec ? { run_avg_sec: Math.round(splits.run_avg_sec) } : {}),
      ...(hasSplits && splits.roxzone_sec ? { roxzone_sec: Math.round(splits.roxzone_sec) } : {}),
      ...(hasSplits && splits.ski_sec ? { ski_sec: Math.round(splits.ski_sec) } : {}),
      ...(hasSplits && splits.sled_push_sec ? { sled_push_sec: Math.round(splits.sled_push_sec) } : {}),
      ...(hasSplits && splits.sled_pull_sec ? { sled_pull_sec: Math.round(splits.sled_pull_sec) } : {}),
      ...(hasSplits && splits.bbj_sec ? { bbj_sec: Math.round(splits.bbj_sec) } : {}),
      ...(hasSplits && splits.row_sec ? { row_sec: Math.round(splits.row_sec) } : {}),
      ...(hasSplits && splits.farmers_sec ? { farmers_sec: Math.round(splits.farmers_sec) } : {}),
      ...(hasSplits && splits.sandbag_sec ? { sandbag_sec: Math.round(splits.sandbag_sec) } : {}),
      ...(hasSplits && splits.wallballs_sec ? { wallballs_sec: Math.round(splits.wallballs_sec) } : {}),
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('benchmark_results')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') return; // Already imported, skip silently
      throw insertError;
    }

    const resultId = insertedData?.id;
    const { idp, event } = extractIdpFromUrl(importUrl);

    if (idp) {
      await supabase.from('race_results').insert({
        athlete_id: user!.id,
        hyrox_idp: idp,
        hyrox_event: event,
        source_url: importUrl,
      } as any).single();
    }

    if (resultId && hasGenderConfigured) {
      const alreadyExists = await hasExistingScores(resultId);
      if (!alreadyExists) {
        const division = raceCategory === 'PRO' ? 'HYROX PRO' : 'HYROX';
        const gender = athleteConfig?.sexo === 'feminino' ? 'F' : 'M';
        const metrics = hasSplits ? generateMetricsFromSplits(splits) : generateMetricsFromTotal(totalSeconds);
        await calculateAndSaveHyroxPercentiles(resultId, division, gender, metrics);
      }
    }

    // Save diagnostic data in parallel (non-blocking — don't fail import if diagnostic fails)
    if (diagResult.data) {
      try {
        await saveDiagnosticData(diagResult.data, importUrl);
      } catch (err) {
        console.warn('Diagnostic save failed (non-critical):', err);
      }
    }
  }

  /** Save parsed diagnostic data to the database */
  async function saveDiagnosticData(apiData: any, sourceUrl: string) {
    if (!user) return;
    const parsed = parseDiagnosticResponse(apiData, user.id, sourceUrl);
    if (!hasDiagnosticData(parsed)) return;

    // Delete old + insert new
    await Promise.all([
      supabase.from('diagnostico_resumo').delete().eq('atleta_id', user.id),
      supabase.from('diagnostico_melhoria').delete().eq('atleta_id', user.id),
      supabase.from('tempos_splits').delete().eq('atleta_id', user.id),
    ]);

    await supabase.from('diagnostico_resumo').insert(parsed.resumoRow);
    if (parsed.diagRows.length > 0) {
      await supabase.from('diagnostico_melhoria').insert(parsed.diagRows);
    }
    if (parsed.splitRows.length > 0) {
      await supabase.from('tempos_splits').insert(parsed.splitRows);
    }
  }

  async function handleSubmitManual() {
    if (!user) { toast.error('Faça login para continuar.'); return; }
    if (!url.trim()) { toast.error('Cole o link do seu resultado HYROX.'); return; }
    const { idp } = extractIdpFromUrl(url.trim());
    if (!idp) { toast.error('Link inválido. O link precisa conter o parâmetro idp='); return; }
    if (!agreed) { toast.error('Aceite a autorização para continuar.'); return; }
    await handleImport(url.trim());
  }

  async function handleImport(importUrl: string) {
    setStep('loading');
    setExtractedInfo('Acessando página de resultado...');

    try {
      setExtractedInfo('Lendo dados da prova...');
      const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke(
        'scrape-hyrox-result',
        { body: { url: importUrl } }
      );

      if (scrapeError) throw new Error('Não foi possível ler os dados do link.');
      if (scrapeData?.error || !scrapeData?.time_in_seconds) {
        throw new Error(scrapeData?.error || 'Não encontramos os tempos no link informado.');
      }

      const totalSeconds = scrapeData.time_in_seconds;
      const eventName = scrapeData.event_name || 'Prova HYROX';
      const eventYear = scrapeData.event_year || new Date().getFullYear();
      const eventDate = `${eventYear}-01-01`;
      const raceCategory = scrapeData.race_category || 'OPEN';
      const splits = scrapeData.splits || null;
      const hasSplits = splits && Object.values(splits).some((v: any) => v && v > 0);

      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      const formattedTime = `${h}h${String(m).padStart(2, '0')}m${String(s).padStart(2, '0')}s`;
      setExtractedInfo(`${eventName} — ${formattedTime} (${raceCategory})`);

      const insertPayload = {
        user_id: user!.id,
        result_type: 'prova_oficial',
        event_name: eventName,
        event_date: eventDate,
        time_in_seconds: totalSeconds,
        screenshot_url: importUrl,
        race_category: raceCategory,
        completed: true,
        block_id: `prova_oficial_${Date.now()}`,
        workout_id: `prova_oficial_${Date.now()}`,
        benchmark_id: 'HYROX_OFFICIAL',
        ...(hasSplits && splits.run_avg_sec ? { run_avg_sec: Math.round(splits.run_avg_sec) } : {}),
        ...(hasSplits && splits.roxzone_sec ? { roxzone_sec: Math.round(splits.roxzone_sec) } : {}),
        ...(hasSplits && splits.ski_sec ? { ski_sec: Math.round(splits.ski_sec) } : {}),
        ...(hasSplits && splits.sled_push_sec ? { sled_push_sec: Math.round(splits.sled_push_sec) } : {}),
        ...(hasSplits && splits.sled_pull_sec ? { sled_pull_sec: Math.round(splits.sled_pull_sec) } : {}),
        ...(hasSplits && splits.bbj_sec ? { bbj_sec: Math.round(splits.bbj_sec) } : {}),
        ...(hasSplits && splits.row_sec ? { row_sec: Math.round(splits.row_sec) } : {}),
        ...(hasSplits && splits.farmers_sec ? { farmers_sec: Math.round(splits.farmers_sec) } : {}),
        ...(hasSplits && splits.sandbag_sec ? { sandbag_sec: Math.round(splits.sandbag_sec) } : {}),
        ...(hasSplits && splits.wallballs_sec ? { wallballs_sec: Math.round(splits.wallballs_sec) } : {}),
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('benchmark_results')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertError) {
        if (insertError.code === '23505') throw new Error('Este resultado já foi importado.');
        throw insertError;
      }

      const resultId = insertedData?.id;
      const { idp, event } = extractIdpFromUrl(importUrl);

      if (idp) {
        await supabase.from('race_results').insert({
          athlete_id: user!.id,
          hyrox_idp: idp,
          hyrox_event: event,
          source_url: importUrl,
        } as any).single();
      }

      if (resultId && hasGenderConfigured) {
        setExtractedInfo('Calculando diagnóstico...');
        const alreadyExists = await hasExistingScores(resultId);
        if (!alreadyExists) {
          const division = raceCategory === 'PRO' ? 'HYROX PRO' : 'HYROX';
          const gender = athleteConfig?.sexo === 'feminino' ? 'F' : 'M';
          const metrics = hasSplits ? generateMetricsFromSplits(splits) : generateMetricsFromTotal(totalSeconds);
          await calculateAndSaveHyroxPercentiles(resultId, division, gender, metrics);
        }
      }

      triggerExternalResultsRefresh();
      setSavedUrl(importUrl);
      setStep('success');
      toast.success('Prova oficial registrada! 🏆');
    } catch (error: any) {
      console.error('Import error:', error);
      setErrorMsg(error?.message || 'Erro ao importar resultado.');
      setStep('error');
    }
  }

  // --- Render: Loading ---
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center space-y-6">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Importando resultado...</h2>
          <p className="text-sm text-muted-foreground">{extractedInfo}</p>
          <p className="text-xs text-muted-foreground">Estamos lendo os dados diretamente do site HYROX.</p>
        </motion.div>
      </div>
    );
  }

  // --- Render: Error ---
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Erro na importação</h1>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <div className="flex flex-col gap-3">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-2xl" onClick={() => { setStep('search'); setErrorMsg(''); }}>
                Tentar novamente
              </Button>
              <Button variant="ghost" onClick={() => navigate(-1)}>Voltar</Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Render: Success ---
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Resultado salvo com sucesso</h1>
            <p className="text-muted-foreground">🔥 Agora vamos encontrar seus gargalos de prova.</p>
            <div className="flex flex-col gap-3">
              <Button variant="outline" className="w-full" onClick={() => window.open(savedUrl, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" /> Ver resultado oficial
              </Button>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-base font-bold rounded-2xl" onClick={() => navigate('/app')}>
                Gerar diagnóstico OUTLIER
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Render: Manual input ---
  if (step === 'input') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => searchQuery ? setStep('search') : navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Importar Resultado HYROX</h1>
        </header>
        <main className="flex-1 flex items-start justify-center px-4 pt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Link do resultado HYROX</label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Cole aqui o link do seu resultado HYROX" className="h-12 rounded-xl" />
                <p className="text-xs text-muted-foreground">Ex: https://results.hyrox.com/...&idp=XXXXX</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <p className="text-xs text-muted-foreground">✨ Os dados serão extraídos automaticamente do link:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Nome e data do evento</li>
                  <li>Categoria (OPEN / PRO)</li>
                  <li>Tempo total e splits por estação</li>
                </ul>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="consent-manual" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                <label htmlFor="consent-manual" className="text-sm text-muted-foreground cursor-pointer">
                  Autorizo uso do meu resultado para análise de performance.
                </label>
              </div>
              <Button onClick={handleSubmitManual} disabled={!url.trim() || !agreed} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-base font-bold rounded-2xl">
                <Flame className="w-5 h-5 mr-2" /> IMPORTAR RESULTADO
              </Button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // --- Render: Batch Loading ---
  if (step === 'batch-loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center space-y-6">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Importando {batchProgress.total} prova{batchProgress.total > 1 ? 's' : ''}...</h2>
          <p className="text-sm text-muted-foreground">{batchProgress.done} de {batchProgress.total} concluída{batchProgress.done > 1 ? 's' : ''}</p>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }} />
          </div>
          {batchProgress.errors > 0 && (
            <p className="text-xs text-amber-400">{batchProgress.errors} erro{batchProgress.errors > 1 ? 's' : ''} (duplicadas ou inacessíveis)</p>
          )}
        </motion.div>
      </div>
    );
  }

  // --- Render: Batch Success ---
  if (step === 'batch-success') {
    const imported = batchProgress.total - batchProgress.errors;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {imported} prova{imported > 1 ? 's' : ''} importada{imported > 1 ? 's' : ''}!
            </h1>
            {batchProgress.errors > 0 && (
              <p className="text-sm text-muted-foreground">{batchProgress.errors} já existia{batchProgress.errors > 1 ? 'm' : ''} ou falhou.</p>
            )}
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-base font-bold rounded-2xl" onClick={() => navigate('/app')}>
              Gerar diagnóstico OUTLIER
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Render: Search (default) ---
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Importar Resultado HYROX</h1>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pt-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-4">
          {/* Fuzzy search input */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <p className="text-sm font-medium text-foreground">Buscar atleta</p>
            <p className="text-xs text-muted-foreground">Digite seu nome completo ou parcial. A busca é aproximada.</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') executeSearch(searchQuery); }}
                placeholder="Ex: Rafael Costa"
                className="h-12 rounded-xl pl-10 pr-10"
                maxLength={80}
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchDone(false); lastSearchedRef.current = ''; }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searching && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Buscando <span className="text-primary">{searchQuery}</span>...</span>
              </div>
            )}
          </div>

          {/* Search results - inline dropdown style */}
          <AnimatePresence>
            {searchDone && !searching && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      <h2 className="text-base font-bold text-foreground">
                        {searchResults.length} resultado{searchResults.length > 1 ? 's' : ''}
                      </h2>
                    </div>
                    {searchResults.length > 1 && (
                      <button
                        onClick={selectAll}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        {selectedIndices.size === searchResults.length ? 'Desmarcar tudo' : 'Selecionar tudo'}
                      </button>
                    )}
                  </div>

                  {searchResults.length > 1 && (
                    <p className="text-xs text-muted-foreground">Selecione as provas que deseja importar.</p>
                  )}

                  {/* Consent checkbox */}
                  <div className="flex items-start gap-3">
                    <Checkbox id="consent-search" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                    <label htmlFor="consent-search" className="text-sm text-muted-foreground cursor-pointer">
                      Autorizo uso do meu resultado para análise de performance.
                    </label>
                  </div>

                  {/* Results list */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {searchResults.map((result, idx) => {
                      const isSelected = selectedIndices.has(idx);
                      const athleteName = formatAthleteName(result.athlete_name);
                      // Extract location from event_name (strip "HYROX" and year)
                      const location = (result.event_name || '').replace(/^HYROX\s*/i, '').replace(/\s*\b20\d{2}\b\s*$/, '').trim() || result.event_name;
                      return (
                        <button
                          key={idx}
                          onClick={() => searchResults.length > 1 ? toggleSelection(idx) : handleImportFromSearch(result)}
                          disabled={searchResults.length > 1 ? false : !agreed}
                          className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                            isSelected
                              ? 'bg-primary/10 border border-primary/30'
                              : 'bg-muted/50 hover:bg-muted border border-transparent'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {searchResults.length > 1 ? (
                            <div className="shrink-0">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelection(idx)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Flame className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {athleteName}
                              <span className="text-muted-foreground font-normal ml-1 text-xs">
                                ({location} — {result.time_formatted})
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {result.division || 'HYROX'}
                              {result.season_id ? ` • T${result.season_id}` : ''}
                            </p>
                          </div>
                          {searchResults.length === 1 && (
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Batch import button */}
                  {searchResults.length > 1 && selectedIndices.size > 0 && (
                    <Button
                      onClick={handleBatchImport}
                      disabled={!agreed}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-base font-bold rounded-2xl"
                    >
                      <Flame className="w-5 h-5 mr-2" />
                      Importar {selectedIndices.size} prova{selectedIndices.size > 1 ? 's' : ''} selecionada{selectedIndices.size > 1 ? 's' : ''}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* No results */}
          {searchDone && !searching && searchResults.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
              <Search className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {searchError || `Nenhum resultado encontrado para "${searchQuery}".`}
              </p>
            </div>
          )}

          {/* Manual fallback */}
          {(searchDone || !searchQuery.trim()) && !searching && (
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl"
              onClick={() => setStep('input')}
            >
              {searchResults.length > 0 ? 'Não encontrou? Cole o link manualmente' : 'Colar link do resultado manualmente'}
            </Button>
          )}

        </motion.div>
      </main>
    </div>
  );
}
