import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Flame, ExternalLink, CheckCircle2, Loader2, AlertTriangle, Search, Trophy, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import {
  calculateAndSaveHyroxPercentiles,
  hasExistingScores,
  type MetricInput,
} from '@/utils/hyroxPercentileCalculator';

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

type ImportStep = 'search' | 'input' | 'loading' | 'success' | 'error';

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

  // Editable search name fields
  const profileName = profile?.name || '';
  const initialSplit = profileName ? splitAthleteName(profileName) : { firstName: '', lastName: '' };
  const [searchFirstName, setSearchFirstName] = useState(initialSplit.firstName);
  const [searchLastName, setSearchLastName] = useState(initialSplit.lastName);

  const hasGenderConfigured = athleteConfig?.sexo && ['masculino', 'feminino'].includes(athleteConfig.sexo);

  // Auto-search on mount
  useEffect(() => {
    if (!searchLastName || !user) return;
    searchByName();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function searchByName() {
    if (!searchLastName.trim()) {
      toast.error('Preencha pelo menos o sobrenome.');
      return;
    }
    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    setSearchDone(false);

    try {
      const gender = athleteConfig?.sexo === 'feminino' ? 'W' : athleteConfig?.sexo === 'masculino' ? 'M' : '';

      const { data, error } = await supabase.functions.invoke('search-hyrox-athlete', {
        body: { firstName: searchFirstName.trim(), lastName: searchLastName.trim(), gender },
      });

      if (error) throw error;
      setSearchResults(data?.results || []);
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError('Não foi possível buscar resultados automaticamente.');
    } finally {
      setSearching(false);
      setSearchDone(true);
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
          <Button variant="ghost" size="icon" onClick={() => searchLastName ? setStep('search') : navigate(-1)}>
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
          {/* Editable search fields */}
          {!searching && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <p className="text-sm font-medium text-foreground">Buscar por nome no site HYROX</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                  <Input
                    value={searchFirstName}
                    onChange={(e) => setSearchFirstName(e.target.value)}
                    placeholder="Nome"
                    className="h-10 rounded-xl"
                    maxLength={50}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Sobrenome *</label>
                  <Input
                    value={searchLastName}
                    onChange={(e) => setSearchLastName(e.target.value)}
                    placeholder="Sobrenome"
                    className="h-10 rounded-xl"
                    maxLength={50}
                  />
                </div>
              </div>
              <Button
                onClick={searchByName}
                disabled={!searchLastName.trim()}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Search className="w-4 h-4 mr-2" /> Buscar resultados
              </Button>
            </div>
          )}

          {/* Search status */}
          {searching && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-primary animate-pulse" />
                <p className="text-sm font-medium text-foreground">
                  Buscando resultados de <span className="text-primary">{[searchFirstName, searchLastName].filter(Boolean).join(' ')}</span>...
                </p>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            </div>
          )}

          {/* Search results */}
          {searchDone && !searching && searchResults.length > 0 && (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">
                    {searchResults.length} resultado{searchResults.length > 1 ? 's' : ''} encontrado{searchResults.length > 1 ? 's' : ''}
                  </h2>
                </div>

                {/* Consent checkbox */}
                <div className="flex items-start gap-3">
                  <Checkbox id="consent-search" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                  <label htmlFor="consent-search" className="text-sm text-muted-foreground cursor-pointer">
                    Autorizo uso do meu resultado para análise de performance.
                  </label>
                </div>

                {/* Results list */}
                <div className="space-y-2">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleImportFromSearch(result)}
                      disabled={!agreed}
                      className="w-full flex items-center gap-3 bg-muted/50 hover:bg-muted rounded-xl p-4 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Flame className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{formatAthleteName(result.athlete_name)}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.event_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.time_formatted}
                          {result.division ? ` • ${result.division}` : ''}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No results or error */}
          {searchDone && !searching && searchResults.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
              <Search className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {searchError || `Nenhum resultado encontrado para "${[searchFirstName, searchLastName].filter(Boolean).join(' ')}".`}
              </p>
            </div>
          )}

          {/* Manual fallback */}
          {(searchDone || !searchLastName) && !searching && (
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
