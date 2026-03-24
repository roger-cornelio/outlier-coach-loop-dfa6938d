import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Zap, Target, ChevronRight, Lock, Trophy, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import OutlierRadarChart from '@/components/diagnostico/OutlierRadarChart';
import type { CalculatedScore } from '@/utils/hyroxPercentileCalculator';

interface SearchResult {
  athlete_name: string;
  event_name: string;
  division: string;
  time_formatted: string;
  result_url: string;
  season_id: number;
  event_index?: number;
}

interface ScrapeResult {
  event_name?: string;
  race_category?: string;
  time_in_seconds?: number;
  formatted_time?: string;
  splits?: Record<string, number>;
  confidence?: string;
  error?: string;
}

const METRIC_LABELS: Record<string, string> = {
  run_avg: 'Run (média)',
  roxzone: 'Roxzone',
  ski: 'Ski Erg',
  sled_push: 'Sled Push',
  sled_pull: 'Sled Pull',
  bbj: 'Burpee Broad Jump',
  row: 'Row',
  farmers: 'Farmers Carry',
  sandbag: 'Sandbag Lunges',
  wallballs: 'Wall Balls',
};

function formatTimeSec(sec: number): string {
  if (!sec || sec <= 0) return '—';
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.round(sec % 60);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

type Step = 'search' | 'loading' | 'results';

export default function DiagnosticoGratuito() {
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [scores, setScores] = useState<CalculatedScore[]>([]);
  const [scrapedData, setScrapedData] = useState<ScrapeResult | null>(null);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [consentGiven, setConsentGiven] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedRef = useRef('');

  const executeSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (trimmed === lastSearchedRef.current) return;
    lastSearchedRef.current = trimmed;

    const parts = trimmed.split(/\s+/);
    let firstName = '', lastName = '';
    if (parts.length === 1) {
      lastName = parts[0];
    } else {
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }

    setSearching(true);
    setSearchDone(false);

    try {
      const { data, error } = await supabase.functions.invoke('search-hyrox-athlete', {
        body: { firstName, lastName, gender: gender === 'F' ? 'W' : '' },
      });
      if (error) throw error;

      const rawResults: SearchResult[] = data?.results || [];
      const sorted = rawResults.sort((a, b) => {
        if (b.season_id !== a.season_id) return b.season_id - a.season_id;
        return (a.event_index ?? 999) - (b.event_index ?? 999);
      });
      setSearchResults(sorted.slice(0, 5));
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Erro ao buscar resultados HYROX.');
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  }, [gender]);

  function handleQueryChange(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 3) {
      debounceRef.current = setTimeout(() => executeSearch(value), 800);
    }
  }

  async function handleSelectResult(result: SearchResult) {
    setSelectedResult(result);
    setStep('loading');

    try {
      // Step 1: Scrape the HYROX result page
      const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke('scrape-hyrox-result', {
        body: { url: result.result_url },
      });

      if (scrapeError || scrapeData?.error) {
        throw new Error(scrapeData?.error || 'Erro ao importar dados da prova');
      }

      setScrapedData(scrapeData);

      // Step 2: Build metrics from scraped splits
      const splits = scrapeData?.splits || {};
      const metricsToCalc = [
        'run_avg', 'roxzone', 'ski', 'sled_push', 'sled_pull',
        'bbj', 'row', 'farmers', 'sandbag', 'wallballs'
      ].map(metric => ({
        metric,
        raw_time_sec: splits[`${metric}_sec`] || splits[metric] || 0,
        data_source: (splits[`${metric}_sec`] || splits[metric]) ? 'real' as const : 'estimated' as const,
      })).filter(m => m.raw_time_sec > 0);

      if (metricsToCalc.length === 0) {
        throw new Error('Nenhum split encontrado na prova.');
      }

      // Determine division from scraped data
      const division = scrapeData?.race_category === 'PRO' ? 'HYROX PRO' : 'HYROX';
      const detectedGender = result.division?.includes('Women') || result.division?.includes('Female') ? 'F' : 'M';

      // Step 3: Calculate percentiles server-side (no auth needed)
      const { data: percentileData, error: percentileError } = await supabase.functions.invoke('public-calculate-percentiles', {
        body: {
          division,
          gender: detectedGender,
          metrics: metricsToCalc,
        },
      });

      if (percentileError) {
        throw new Error('Erro ao calcular percentis');
      }

      const calculatedScores: CalculatedScore[] = (percentileData?.scores || []).map((s: any) => ({
        ...s,
        percentile_set_id_used: 'v1',
      }));

      setScores(calculatedScores);
      setStep('results');
    } catch (err: any) {
      console.error('Diagnostic error:', err);
      toast.error(err.message || 'Erro ao gerar diagnóstico. Tente novamente.');
      setStep('search');
    }
  }

  // Find weakest stations (lowest percentiles)
  const weakStations = [...scores]
    .sort((a, b) => a.percentile_value - b.percentile_value)
    .slice(0, 3);

  const strongStations = [...scores]
    .sort((a, b) => b.percentile_value - a.percentile_value)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link to="/">
          <OutlierWordmark size="sm" />
        </Link>
        <Link
          to="/login"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Já tenho conta
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* ═══ STEP: SEARCH ═══ */}
        <AnimatePresence mode="wait">
          {step === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <h1 className="font-display text-2xl md:text-3xl tracking-widest text-foreground">
                  DIAGNÓSTICO <span className="text-primary">GRATUITO</span>
                </h1>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Descubra seus pontos fortes e pontos fracos com base na sua última prova HYROX. Sem cadastro.
                </p>
              </div>

              {/* Gender selector */}
              <div className="flex gap-2 justify-center">
                {(['M', 'F'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`px-4 py-2 rounded-lg text-xs font-display tracking-wider transition-colors ${
                      gender === g
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {g === 'M' ? 'MASCULINO' : 'FEMININO'}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Digite seu nome completo..."
                  value={searchQuery}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeSearch(searchQuery)}
                  className="pl-10 h-12 text-base bg-card border-border"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                )}
              </div>

              {/* Search hint */}
              {!searchDone && !searching && (
                <p className="text-xs text-center text-muted-foreground">
                  Buscamos seu resultado diretamente no site oficial do HYROX
                </p>
              )}

              {/* Search results */}
              {searchDone && searchResults.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground text-sm">
                    Nenhum resultado encontrado. Verifique o nome ou tente outra grafia.
                  </p>
                  <Link
                    to="/login?mode=signup"
                    className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    Nunca fez HYROX? Crie sua conta e faça o onboarding por perfil
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Selecione sua prova:</p>
                  {searchResults.map((result, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectResult(result)}
                      className="w-full text-left p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground text-sm">{result.event_name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {result.division} · {result.time_formatted}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ STEP: LOADING ═══ */}
          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-6"
            >
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <p className="font-display tracking-wider text-foreground">ANALISANDO SUA PROVA</p>
                <p className="text-xs text-muted-foreground">
                  Extraindo splits e calculando percentis...
                </p>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP: RESULTS ═══ */}
          {step === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <h2 className="font-display text-xl tracking-widest text-foreground">
                  SEU DIAGNÓSTICO
                </h2>
                {selectedResult && (
                  <p className="text-xs text-muted-foreground">
                    {selectedResult.event_name} · {scrapedData?.formatted_time || selectedResult.time_formatted}
                  </p>
                )}
              </div>

              {/* Radar Chart */}
              {scores.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-display text-sm tracking-wider text-foreground mb-4 text-center">
                    PERFIL DE PERFORMANCE
                  </h3>
                  <OutlierRadarChart scores={scores} />
                </div>
              )}

              {/* Gargalos (weaknesses) */}
              {weakStations.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                  <h3 className="font-display text-sm tracking-wider text-foreground flex items-center gap-2">
                    <Target className="w-4 h-4 text-destructive" />
                    SEUS PONTOS FRACOS
                  </h3>
                  <div className="space-y-3">
                    {weakStations.map((station) => (
                      <div key={station.metric} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{METRIC_LABELS[station.metric] || station.metric}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatTimeSec(station.raw_time_sec)} · P{station.percentile_value}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(5, station.percentile_value)}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: station.percentile_value < 25
                                ? 'hsl(var(--destructive))'
                                : station.percentile_value < 50
                                ? 'hsl(35, 92%, 50%)'
                                : 'hsl(var(--primary))',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pontos fortes */}
              {strongStations.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                  <h3 className="font-display text-sm tracking-wider text-foreground flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    PONTOS FORTES
                  </h3>
                  <div className="space-y-3">
                    {strongStations.map((station) => (
                      <div key={station.metric} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{METRIC_LABELS[station.metric] || station.metric}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatTimeSec(station.raw_time_sec)} · P{station.percentile_value}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(5, station.percentile_value)}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="h-full rounded-full bg-primary"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ CTA GATE ═══ */}
              <div className="relative">
                {/* Blurred preview of what's behind the gate */}
                <div className="bg-card rounded-2xl border border-border p-6 space-y-4 opacity-40 blur-[2px] select-none pointer-events-none">
                  <h3 className="font-display text-sm tracking-wider text-foreground">
                    PLANO DE EVOLUÇÃO PERSONALIZADO
                  </h3>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-4/5" />
                  </div>
                </div>

                {/* Overlay CTA */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-2xl">
                  <Lock className="w-8 h-8 text-primary mb-4" />
                  <p className="font-display text-sm tracking-wider text-foreground mb-2 text-center px-4">
                    TREINE COM O COACH IDEAL PARA VOCÊ
                  </p>
                  <p className="text-xs text-muted-foreground mb-6 text-center max-w-sm px-4">
                    Acesse um treino específico para trabalhar seus pontos fracos e obter a melhor performance. 30 dias grátis.
                  </p>
                  <Link
                    to="/login?mode=signup"
                    className="font-display text-sm tracking-widest px-8 py-4 rounded-xl bg-primary text-primary-foreground hover:brightness-110 hover:scale-105 transition-all duration-200 shadow-2xl shadow-primary/50 ring-2 ring-primary/40 flex items-center gap-3"
                  >
                    <Zap className="w-5 h-5" />
                    QUERO MEU PLANO DE TREINO
                  </Link>
                </div>
              </div>

              {/* Back to search */}
              <div className="text-center">
                <button
                  onClick={() => { setStep('search'); setScores([]); setSearchResults([]); setSearchDone(false); lastSearchedRef.current = ''; }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Buscar outro atleta
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
