import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OnboardingCoachSelection } from '@/components/OnboardingCoachSelection';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Zap, Target, ChevronRight, Lock, Trophy, AlertTriangle, CheckCircle2, Activity, TrendingDown, Clock, Award, ShieldAlert, ArrowRight, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { normalizeAthleteName } from '@/utils/displayName';
import { useAuth } from '@/hooks/useAuth';
import { isNameSimilar } from '@/utils/nameSimilarity';

import { FatigueIndexCard } from '@/components/evolution/FatigueIndexCard';
import { calculateEvolutionTimeframe } from '@/utils/evolutionTimeframe';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { CalculatedScore } from '@/utils/hyroxPercentileCalculator';
import { timeToSeconds } from '@/components/diagnostico/types';
import type { Split, DiagnosticoResumo, DiagnosticoMelhoria } from '@/components/diagnostico/types';
import PerformanceHighlights from '@/components/diagnostico/PerformanceHighlights';
import SplitTimesGrid from '@/components/diagnostico/SplitTimesGrid';
import ParecerPremium from '@/components/diagnostico/ParecerPremium';
import ImprovementTable from '@/components/diagnostico/ImprovementTable';

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

function getClassificationBadge(totalSeconds: number): { label: string; color: string; bgClass: string } {
  if (totalSeconds <= 3900) return { label: 'ELITE', color: 'text-primary', bgClass: 'bg-primary/20 border-primary/40' };
  if (totalSeconds <= 4500) return { label: 'AVANÇADO', color: 'text-emerald-400', bgClass: 'bg-emerald-500/20 border-emerald-500/40' };
  if (totalSeconds <= 5400) return { label: 'INTERMEDIÁRIO', color: 'text-amber-400', bgClass: 'bg-amber-500/20 border-amber-500/40' };
  return { label: 'INICIANTE', color: 'text-muted-foreground', bgClass: 'bg-muted border-border' };
}

/** Animated counter for the hero time */
function AnimatedTime({ targetSeconds }: { targetSeconds: number }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const duration = 1500;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * targetSeconds));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [targetSeconds]);
  return <span>{formatTimeSec(current)}</span>;
}

type Step = 'search' | 'loading' | 'results' | 'coach-selection';

interface RoxCoachDiagnostico {
  movement: string;
  metric: string;
  your_score: number;
  top_1: number;
  improvement_value: number;
  percentage: number;
}

export default function DiagnosticoGratuito() {
  const { user, profile, loading: authLoading, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
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
  const [telefone, setTelefone] = useState('');
  const [roxCoachDiagnosticos, setRoxCoachDiagnosticos] = useState<RoxCoachDiagnostico[]>([]);
  const [roxCoachFailed, setRoxCoachFailed] = useState(false);
  const [textoIa, setTextoIa] = useState<string | null>(null);
  const [textoIaLoading, setTextoIaLoading] = useState(false);
  const [nameMismatchWarning, setNameMismatchWarning] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedRef = useRef('');

  // Redirect to signup if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?mode=signup&redirect=/diagnostico-gratuito');
    }
  }, [user, authLoading, navigate]);

  // Pre-fill search with profile name
  useEffect(() => {
    if (profile?.name && !searchQuery) {
      setSearchQuery(profile.name);
    }
  }, [profile?.name]);

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
      setSearchResults(sorted.slice(0, 1));
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
    setNameMismatchWarning(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    // Check name similarity against registered profile name (superadmin bypasses)
    if (!isSuperAdmin && profile?.name && value.trim().length >= 3 && !isNameSimilar(profile.name, value.trim())) {
      setNameMismatchWarning(true);
      return; // Don't search if name is too different
    }
    
    if (value.trim().length >= 3) {
      debounceRef.current = setTimeout(() => executeSearch(value), 800);
    }
  }

  // Cache key for diagnostic results (sessionStorage)
  const getDiagCacheKey = (url: string) => `diag_cache_${btoa(url).slice(0, 40)}`;

  async function handleSelectResult(result: SearchResult) {
    setSelectedResult(result);
    setStep('loading');
    setRoxCoachFailed(false);
    setRoxCoachDiagnosticos([]);
    setTextoIa(null);
    setTextoIaLoading(false);

    // Check sessionStorage cache first
    try {
      const cacheKey = getDiagCacheKey(result.result_url);
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const c = JSON.parse(cached);
        const ageMs = Date.now() - (c.timestamp || 0);
        // Cache valid for 30 minutes
        if (ageMs < 30 * 60 * 1000) {
          console.log('[DIAG_FREE] Cache hit for', result.athlete_name);
          setScrapedData(c.scrapedData);
          setScores(c.scores || []);
          if (c.roxCoachDiagnosticos?.length > 0) {
            setRoxCoachDiagnosticos(c.roxCoachDiagnosticos);
            setRoxCoachFailed(false);
          } else {
            setRoxCoachFailed(c.roxCoachFailed ?? true);
          }
          setTextoIa(c.textoIa || null);
          setStep('results');
          return;
        }
      }
    } catch (e) {
      // Cache read failed, proceed normally
    }

    try {
      // Call scrape + RoxCoach proxy in parallel
      const [scrapeResponse, roxCoachResponse] = await Promise.all([
        supabase.functions.invoke('scrape-hyrox-result', {
          body: { url: result.result_url },
        }),
        supabase.functions.invoke('proxy-roxcoach', {
          body: {
            athlete_name: result.athlete_name,
            event_name: result.event_name,
            division: result.division,
            season_id: result.season_id,
            result_url: result.result_url,
          },
        }).catch(err => {
          console.warn('[DIAG_FREE] RoxCoach proxy failed:', err);
          return { data: null, error: err };
        }),
      ]);

      const { data: scrapeData, error: scrapeError } = scrapeResponse;

      if (scrapeError || scrapeData?.error) {
        throw new Error(scrapeData?.error || 'Erro ao importar dados da prova');
      }

      setScrapedData(scrapeData);

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

      const division = scrapeData?.race_category === 'PRO' ? 'HYROX PRO' : 'HYROX';
      const detectedGender = result.division?.includes('Women') || result.division?.includes('Female') ? 'F' : 'M';

      // Calculate percentiles for basic scores (percentile_value, etc.)
      const { data: percentileData, error: percentileError } = await supabase.functions.invoke('calculate-hyrox-percentiles', {
        body: { division, gender: detectedGender, metrics: metricsToCalc, dry_run: true },
      });

      if (percentileError) throw new Error('Erro ao calcular percentis');

      const calculatedScores: CalculatedScore[] = (percentileData?.scores || []).map((s: any) => ({
        ...s,
        percentile_set_id_used: 'v1',
      }));

      setScores(calculatedScores);

      // Parse score: handles "MM:SS" strings and plain numbers
      const parseScore = (val: any): number => {
        if (val == null || val === '') return 0;
        const s = String(val).trim();
        if (s.includes(':')) {
          const parts = s.split(':').map(Number);
          if (parts.some(isNaN)) return 0;
          if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
          if (parts.length === 2) return parts[0] * 60 + parts[1];
          return parts[0] || 0;
        }
        const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
        return isNaN(n) ? 0 : n;
      };

      // Process RoxCoach diagnostic data
      const roxData = roxCoachResponse?.data;
      if (roxData && !roxData.error && roxData.ok !== false && roxData.diagnostico_melhoria) {
        const diagnosticos: RoxCoachDiagnostico[] = (roxData.diagnostico_melhoria || []).map((d: any) => {
          const yourScore = parseScore(d.your_score);
          const top1 = parseScore(d.top_1);
          const improvement = parseScore(d.improvement_value) || Math.max(0, yourScore - top1);
          return {
            movement: d.movement || d.station || '',
            metric: d.metric || '',
            your_score: yourScore,
            top_1: top1,
            improvement_value: improvement,
            percentage: parseScore(d.percentage),
          };
        });
        if (diagnosticos.length > 0 && diagnosticos.some(d => d.top_1 > 0)) {
          setRoxCoachDiagnosticos(diagnosticos);
          setRoxCoachFailed(false);
        } else {
          setRoxCoachFailed(true);
        }
      } else {
        console.warn('[DIAG_FREE] RoxCoach returned no diagnostic data');
        setRoxCoachFailed(true);
      }

      // Determine processed diagnosticos for cache
      const processedDiagnosticos = roxCoachDiagnosticos.length > 0 ? roxCoachDiagnosticos : [];
      const wasRoxCoachFailed = !(roxData && !roxData.error && roxData.ok !== false && roxData.diagnostico_melhoria?.length > 0);

      // Save to localStorage for reuse during onboarding signup
      try {
        localStorage.setItem('outlier_free_diagnostic', JSON.stringify({
          scores: calculatedScores,
          scrapedData: scrapeData,
          roxCoachDiagnosticos: roxData?.diagnostico_melhoria || null,
          selectedResult: { ...result, division: scrapeData?.race_category || result.division },
          gender: detectedGender,
          division,
          timestamp: Date.now(),
        }));
        console.log('[DIAG_FREE] Saved diagnostic to localStorage for onboarding reuse');
      } catch (e) {
        console.warn('[DIAG_FREE] Failed to save to localStorage:', e);
      }

      // Save to sessionStorage for instant reload cache (30min TTL)
      try {
        const cacheKey = getDiagCacheKey(result.result_url);
        const diagsToCache = (roxData?.diagnostico_melhoria || []).map((d: any) => {
          const yourScore = parseScore(d.your_score);
          const top1 = parseScore(d.top_1);
          const improvement = parseScore(d.improvement_value) || Math.max(0, yourScore - top1);
          return {
            movement: d.movement || d.station || '',
            metric: d.metric || '',
            your_score: yourScore,
            top_1: top1,
            improvement_value: improvement,
            percentage: parseScore(d.percentage),
          };
        }).filter((d: any) => d.top_1 > 0);

        sessionStorage.setItem(cacheKey, JSON.stringify({
          scrapedData: scrapeData,
          scores: calculatedScores,
          roxCoachDiagnosticos: diagsToCache,
          roxCoachFailed: wasRoxCoachFailed,
          textoIa: null, // Will be updated after AI generation
          timestamp: Date.now(),
        }));
        console.log('[DIAG_FREE] Saved to sessionStorage cache');
      } catch (e) {
        // Ignore cache write failures
      }

      setStep('results');

      // Save lead to CRM table (non-blocking)
      if (user?.id) {
        supabase.from('diagnostic_leads').insert({
          user_id: user.id,
          athlete_name_searched: result.athlete_name,
          event_name: result.event_name,
          division: result.division,
          result_url: result.result_url,
        }).then(({ error: leadError }) => {
          if (leadError) console.warn('[DIAG_FREE] Lead tracking error:', leadError);
          else console.log('[DIAG_FREE] Lead saved to CRM');
        });

        // Save phone to profile + CRM sync (non-blocking)
        if (telefone.trim().length >= 8) {
          supabase.from('profiles').update({ telefone: telefone.trim() } as any).eq('id', user.id).then(() => {
            console.log('[DIAG_FREE] Phone saved to profile');
          });
          supabase.from('crm_clientes').insert({
            nome: result.athlete_name || profile?.name || 'Lead Diagnóstico',
            telefone: telefone.trim(),
          } as any).then(() => {
            console.log('[DIAG_FREE] Phone saved to CRM');
          });
        }
      }

      // Fire AI parecer generation (non-blocking)
      const roxDiagData = roxData?.diagnostico_melhoria || [];
      const roxSplitsData = roxData?.tempos_splits || [];
      if (roxDiagData.length > 0 || calculatedScores.length > 0) {
        setTextoIaLoading(true);
        supabase.functions.invoke('generate-diagnostic-ai', {
          body: {
            athlete_name: result.athlete_name,
            event_name: scrapeData?.event_name || result.event_name,
            division,
            finish_time: scrapeData?.formatted_time || result.time_formatted,
            splits_data: roxSplitsData,
            diagnostic_data: roxDiagData,
            coach_style: 'PULSE',
          },
        }).then(({ data: aiData }) => {
          if (aiData?.texto_ia) {
            setTextoIa(aiData.texto_ia);
            // Update cache with AI text
            try {
              const cacheKey = getDiagCacheKey(result.result_url);
              const cached = sessionStorage.getItem(cacheKey);
              if (cached) {
                const c = JSON.parse(cached);
                c.textoIa = aiData.texto_ia;
                sessionStorage.setItem(cacheKey, JSON.stringify(c));
              }
            } catch (e) { /* ignore */ }
          }
        }).catch(err => {
          console.warn('[DIAG_FREE] AI parecer failed:', err);
        }).finally(() => {
          setTextoIaLoading(false);
        });
      }
    } catch (err: any) {
      console.error('Diagnostic error:', err);
      toast.error(err.message || 'Erro ao gerar diagnóstico. Tente novamente.');
      setStep('search');
    }
  }

  // Derived data for results
  // Use RoxCoach diagnosticos when available, otherwise fall back to percentile p10_sec
  const stationsWithFocus = useMemo(() => {
    if (roxCoachDiagnosticos.length > 0) {
      // Use RoxCoach top_1 data as source of truth
      const withGap = roxCoachDiagnosticos
        .filter(d => d.your_score > 0 && d.top_1 > 0 && d.your_score > d.top_1)
        .map(d => ({
          metric: d.metric,
          movement: d.movement,
          raw_time_sec: d.your_score,
          top_1: d.top_1,
          improvement_value: d.improvement_value > 0 ? d.improvement_value : Math.max(0, d.your_score - d.top_1),
          percentile_value: scores.find(s => s.metric === d.metric)?.percentile_value || 50,
        }));
      const totalImprovement = withGap.reduce((sum, s) => sum + s.improvement_value, 0);
      return withGap
        .map(s => ({
          ...s,
          focusPct: totalImprovement > 0 ? Math.round((s.improvement_value / totalImprovement) * 100) : 0,
        }))
        .sort((a, b) => b.focusPct - a.focusPct);
    }

    // Fallback to p10_sec from percentiles (only if RoxCoach didn't fail)
    if (roxCoachFailed) return [];

    const withGap = scores
      .filter((s: any) => s.raw_time_sec > 0 && s.p10_sec > 0 && s.raw_time_sec > s.p10_sec)
      .map((s: any) => ({
        ...s,
        improvement_value: s.raw_time_sec - s.p10_sec,
      }));
    const totalImprovement = withGap.reduce((sum: number, s: any) => sum + s.improvement_value, 0);
    return withGap
      .map((s: any) => ({
        ...s,
        focusPct: totalImprovement > 0 ? Math.round((s.improvement_value / totalImprovement) * 100) : 0,
      }))
      .sort((a: any, b: any) => b.focusPct - a.focusPct);
  }, [scores, roxCoachDiagnosticos, roxCoachFailed]);

  const weakStations = useMemo(() => stationsWithFocus.slice(0, 5), [stationsWithFocus]);

  const strongStations = useMemo(() => {
    // When RoxCoach data is available, pick stations with smallest gap (closest to top 1%)
    if (roxCoachDiagnosticos.length > 0) {
      const validDiags = roxCoachDiagnosticos.filter((d: any) => d.your_score > 0 && d.top_1 > 0);
      if (validDiags.length > 0) {
        const sorted = [...validDiags].sort((a: any, b: any) => {
          const gapA = Math.abs(a.your_score - a.top_1);
          const gapB = Math.abs(b.your_score - b.top_1);
          return gapA - gapB;
        });
        return sorted.slice(0, 2).map((d: any) => {
          const matchingScore = scores.find(s => s.metric === d.metric);
          return {
            metric: d.metric,
            movement: d.movement,
            raw_time_sec: d.your_score,
            percentile_value: matchingScore?.percentile_value ?? 0,
            data_source: matchingScore?.data_source ?? 'estimated',
            percentile_set_id_used: '',
          };
        });
      }
    }
    // Fallback: use internal percentile scores
    return [...scores].sort((a, b) => b.percentile_value - a.percentile_value).slice(0, 2);
  }, [scores, roxCoachDiagnosticos]);

  // Total improvement in seconds (real gap)
  const totalImprovementSec = useMemo(() =>
    stationsWithFocus.reduce((sum: number, s: any) => sum + s.improvement_value, 0),
    [stationsWithFocus]
  );

  // Convert scraped splits to FatigueIndexCard Split[] format
  const fatigueSplits: Split[] = useMemo(() => {
    if (!scrapedData?.splits) return [];
    const splits = scrapedData.splits;
    const result: Split[] = [];
    for (let i = 1; i <= 8; i++) {
      const sec = splits[`run_${i}_sec`] || splits[`run_${i}`] || 0;
      if (sec > 0) {
        const m = Math.floor(sec / 60);
        const s = Math.round(sec % 60);
        result.push({
          id: `run-${i}`,
          split_name: `Running ${i}`,
          time: `${m}:${String(s).padStart(2, '0')}`,
        });
      }
    }
    return result;
  }, [scrapedData]);

  // ─── Map data to dashboard component types ───
  const STATION_SPLIT_KEYS = ['ski', 'sled_push', 'sled_pull', 'bbj', 'row', 'farmers', 'sandbag', 'wallballs'];
  const STATION_LABELS_MAP: Record<string, string> = {
    ski: 'Ski Erg', sled_push: 'Sled Push', sled_pull: 'Sled Pull',
    bbj: 'Burpee Broad Jump', row: 'Rowing', farmers: 'Farmers Carry',
    sandbag: 'Sandbag Lunges', wallballs: 'Wall Balls',
  };

  const freeResumo: DiagnosticoResumo = useMemo(() => {
    const splits = scrapedData?.splits || {};
    const runTotal = Object.keys(splits)
      .filter(k => k.startsWith('run_') && k.endsWith('_sec'))
      .reduce((sum, k) => sum + (splits[k] || 0), 0);
    const workoutTotal = STATION_SPLIT_KEYS
      .reduce((sum, k) => sum + (splits[`${k}_sec`] || splits[k] || 0), 0);
    return {
      id: 'free-diag',
      nome_atleta: normalizeAthleteName(selectedResult?.athlete_name) || null,
      temporada: selectedResult?.season_id ? `S${selectedResult.season_id}` : null,
      evento: scrapedData?.event_name || selectedResult?.event_name || null,
      divisao: scrapedData?.race_category || selectedResult?.division || null,
      finish_time: scrapedData?.formatted_time || selectedResult?.time_formatted || null,
      posicao_categoria: null,
      posicao_geral: null,
      run_total: runTotal > 0 ? formatTimeSec(runTotal) : null,
      workout_total: workoutTotal > 0 ? formatTimeSec(workoutTotal) : null,
      texto_ia: null,
      source_url: selectedResult?.result_url || null,
    };
  }, [scrapedData, selectedResult, textoIa]);

  const freeSplits: Split[] = useMemo(() => {
    if (!scrapedData?.splits) return [];
    const splits = scrapedData.splits;
    const result: Split[] = [];
    // 8 runs
    for (let i = 1; i <= 8; i++) {
      const sec = splits[`run_${i}_sec`] || splits[`run_${i}`] || 0;
      if (sec > 0) {
        result.push({ id: `run-${i}`, split_name: `Running ${i}`, time: formatTimeSec(sec) });
      }
    }
    // 8 stations
    for (const key of STATION_SPLIT_KEYS) {
      const sec = splits[`${key}_sec`] || splits[key] || 0;
      if (sec > 0) {
        result.push({ id: key, split_name: STATION_LABELS_MAP[key] || key, time: formatTimeSec(sec) });
      }
    }
    // Roxzone
    const roxSec = splits['roxzone_sec'] || splits['roxzone'] || 0;
    if (roxSec > 0) {
      result.push({ id: 'roxzone', split_name: 'Roxzone', time: formatTimeSec(roxSec) });
    }
    return result;
  }, [scrapedData]);

  const freeDiagnosticos: DiagnosticoMelhoria[] = useMemo(() => {
    if (roxCoachDiagnosticos.length === 0) return [];
    const totalImprov = roxCoachDiagnosticos.reduce((sum, d) => sum + d.improvement_value, 0);
    return roxCoachDiagnosticos.map((d, i) => ({
      id: `free-diag-${i}`,
      movement: d.movement,
      metric: d.metric,
      value: 0,
      your_score: d.your_score,
      top_1: d.top_1,
      improvement_value: d.improvement_value,
      percentage: d.percentage,
      total_improvement: totalImprov,
    }));
  }, [roxCoachDiagnosticos]);


  // Evolution projection
  const totalSeconds = scrapedData?.time_in_seconds || 0;
  const classification = totalSeconds > 0 ? getClassificationBadge(totalSeconds) : null;

  const totalGap = useMemo(() => {
    if (roxCoachDiagnosticos.length > 0) {
      return roxCoachDiagnosticos.reduce((sum, d) => sum + Math.max(0, d.improvement_value), 0);
    }
    // Fallback: percentile-based estimate when no RoxCoach data
    return scores.reduce((sum, s) => {
      const gap = Math.max(0, (80 - s.percentile_value) * 1.2);
      return sum + gap;
    }, 0);
  }, [roxCoachDiagnosticos, scores]);

  const evolution = useMemo(() => {
    if (totalSeconds <= 0 || totalGap <= 0) return null;
    return calculateEvolutionTimeframe(totalSeconds, totalGap);
  }, [totalSeconds, totalGap]);

  const projectionChartData = useMemo(() => {
    if (!evolution || totalSeconds <= 0) return [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const points = [];
    for (let i = 0; i <= 12; i++) {
      const projected = Math.max(0, totalSeconds - (evolution.ratePerMonth * i));
      const monthIdx = (now.getMonth() + i) % 12;
      points.push({ month: monthNames[monthIdx], tempo: Math.round(projected) });
    }
    return points;
  }, [totalSeconds, evolution]);

  const projectedAt12 = evolution ? Math.max(0, totalSeconds - (evolution.ratePerMonth * 12)) : 0;
  const gainIn12 = Math.max(0, totalSeconds - projectedAt12);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-border">
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

      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <AnimatePresence mode="wait">
          {/* ═══ STEP: SEARCH ═══ */}
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
                 Descubra seus pontos fortes e pontos fracos com base na sua última prova HYROX.
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

              {/* Consent checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5">
                  <div
                    onClick={() => setConsentGiven(!consentGiven)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      consentGiven
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/40 hover:border-muted-foreground group-hover:border-muted-foreground'
                    }`}
                  >
                    {consentGiven && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                </div>
                <span
                  onClick={() => setConsentGiven(!consentGiven)}
                  className="text-xs text-muted-foreground leading-relaxed select-none"
                >
                  Autorizo a busca e análise dos meus dados de resultado HYROX disponíveis publicamente para fins de diagnóstico de performance.
                </span>
              </label>

              {/* Phone input */}
              <div className={`transition-opacity ${!consentGiven ? 'opacity-40 pointer-events-none' : ''}`}>
                <Input
                  placeholder="Telefone / WhatsApp"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="h-12 text-base bg-card border-border"
                  type="tel"
                  disabled={!consentGiven}
                />
              </div>

              {/* Search input */}
              <div className={`relative transition-opacity ${!consentGiven || telefone.trim().length < 8 ? 'opacity-40 pointer-events-none' : ''}`}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Digite seu nome completo..."
                  value={searchQuery}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeSearch(searchQuery)}
                  className="pl-10 h-12 text-base bg-card border-border"
                  disabled={!consentGiven || telefone.trim().length < 8}
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                )}
              </div>

              {/* Name mismatch warning */}
              {nameMismatchWarning && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3">
                  <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
                  <p className="text-sm text-foreground font-medium">
                    O nome digitado não corresponde ao seu cadastro
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Seu nome cadastrado é <span className="font-semibold text-foreground">{profile?.name}</span>. 
                    O diagnóstico gratuito está vinculado ao seu perfil. Se você compete com um nome diferente, 
                    atualize seu perfil com o nome de prova.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      if (profile?.name) {
                        setSearchQuery(profile.name);
                        setNameMismatchWarning(false);
                        lastSearchedRef.current = '';
                        setTimeout(() => executeSearch(profile.name), 100);
                      }
                    }}
                  >
                    <RefreshCw className="w-3 h-3 mr-1.5" />
                    Usar meu nome cadastrado
                  </Button>
                </div>
              )}

              {!nameMismatchWarning && !searchDone && !searching && consentGiven && (
                <p className="text-xs text-center text-muted-foreground">
                  Buscamos seu resultado diretamente no site oficial do HYROX
                </p>
              )}

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
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-display tracking-wider text-foreground text-lg">ANALISANDO SUA PROVA</p>
                <p className="text-xs text-muted-foreground">
                  Cruzando seus splits com quase 1 milhão de resultados HYROX...
                </p>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP: RESULTS ═══ */}
          {step === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* ─── 1. HERO ─── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-4 py-6"
              >
                <p className="text-xs text-muted-foreground font-display tracking-[0.3em] uppercase">
                  Seu Raio X HYROX
                </p>

                {/* Big Time */}
                {totalSeconds > 0 && (
                  <div className="relative inline-block">
                    <div className="text-5xl md:text-6xl font-bold font-mono text-foreground tracking-tight">
                      <AnimatedTime targetSeconds={totalSeconds} />
                    </div>
                    <div className="absolute -inset-4 bg-primary/5 rounded-2xl blur-2xl -z-10" />
                  </div>
                )}

                {/* Classification Badge */}
                {classification && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-display tracking-widest ${classification.bgClass} ${classification.color}`}>
                      <Award className="w-3.5 h-3.5" />
                      {classification.label}
                    </span>
                  </motion.div>
                )}

                {/* Event info */}
                {selectedResult && (
                  <p className="text-xs text-muted-foreground">
                    {selectedResult.event_name} · {selectedResult.division}
                  </p>
                )}

                {/* Authority line */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="text-[10px] text-muted-foreground/60 uppercase tracking-widest"
                >
                  Análise baseada em quase 1 milhão de resultados HYROX · Comparamos você com atletas da sua categoria
                </motion.p>
              </motion.div>

              {/* ─── 2. RESULTADO + PARECER + DIAGNÓSTICO ─── */}
              {roxCoachFailed && freeDiagnosticos.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl border border-destructive/30 bg-card p-6 text-center space-y-4"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto">
                    <ShieldAlert className="w-6 h-6 text-destructive" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    Falha na geração do diagnóstico
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Não foi possível gerar o diagnóstico comparativo neste momento.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedResult) {
                        handleSelectResult(selectedResult);
                      }
                    }}
                    className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Tente novamente
                  </Button>
                </motion.div>
              )}
              {freeDiagnosticos.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-6"
                >
                  <ParecerPremium
                    resumo={freeResumo}
                    diagnosticos={freeDiagnosticos}
                  />
                  {/* ImprovementTable oculta temporariamente — será reintroduzida na aba Evolução */}
                </motion.div>
              )}
              {/* Loading skeleton while AI parecer generates */}
              {!roxCoachFailed && freeDiagnosticos.length === 0 && textoIaLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl border border-border bg-card p-6 space-y-3"
                >
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                </motion.div>
              )}

              {/* ─── 3. FADIGA ─── */}
              {fatigueSplits.length >= 8 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <FatigueIndexCard splits={fatigueSplits} />
                </motion.div>
              )}

              {/* ─── 4. PONTOS FORTES ─── */}

              {/* ─── 5. PLANO DE ATAQUE — 3 pontos ─── */}
              {weakStations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="bg-card rounded-2xl border border-primary/20 p-6 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <h3 className="font-display text-sm tracking-wider text-foreground">
                      COMO VAMOS TE FAZER EVOLUIR
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      // ── Frase 01: tempo de melhoria na corrida ──
                      const runRow = roxCoachDiagnosticos.find(d => d.metric === 'run_avg');
                      const runImprovement = runRow ? runRow.improvement_value : 0;
                      const ws0 = weakStations[0];
                      const frase01Desc = runImprovement > 0
                        ? `Treinos específicos para diminuir seu pace total em ${formatTimeSec(runImprovement)}.`
                        : ws0
                          ? `Treinos específicos para diminuir seu tempo de ${ws0.movement || METRIC_LABELS[ws0.metric] || 'estação'} em ${formatTimeSec(ws0.improvement_value || 0)}.`
                          : 'Treinos específicos para melhorar seu ponto mais fraco.';

                      // ── Frase 02: fadiga ou 2ª estação ──
                      const coreRunPaces: number[] = [];
                      if (fatigueSplits.length >= 8) {
                        for (const sp of fatigueSplits) {
                          const num = parseInt(sp.split_name.replace(/\D/g, ''), 10);
                          if (num >= 2 && num <= 7) {
                            const sec = timeToSeconds(sp.time);
                            if (sec > 0) coreRunPaces.push(sec);
                          }
                        }
                      }
                      const bestPace = coreRunPaces.length >= 6 ? Math.min(...coreRunPaces) : 0;
                      const worstPace = coreRunPaces.length >= 6 ? Math.max(...coreRunPaces) : 0;
                      const fatigueIndex = bestPace > 0 ? ((worstPace - bestPace) / bestPace) * 100 : 0;

                      let frase02Title: string;
                      let frase02Desc: string;

                      if (fatigueIndex > 10) {
                        frase02Title = 'Blindar sua resistência sob fadiga';
                        frase02Desc = `Seu pace degrada ${fatigueIndex.toFixed(1)}% entre o melhor e pior split. Protocolos de gestão de pace para eliminar essa queda.`;
                      } else if (weakStations.length > 1) {
                        const ws1 = weakStations[1];
                        frase02Title = `Corrigir ${ws1.movement || METRIC_LABELS[ws1.metric] || 'sua 2ª estação'}`;
                        const ws1Improvement = ws1.improvement_value || 0;
                        frase02Desc = ws1Improvement > 0
                          ? `Treinos direcionados para diminuir seu tempo em ${formatTimeSec(ws1Improvement)}.`
                          : 'Treinos direcionados para melhorar essa estação crítica.';
                      } else {
                        frase02Title = 'Blindar sua resistência sob fadiga';
                        frase02Desc = 'Protocolos de gestão de pace e resistência muscular para que seu desempenho não desabe nas últimas estações.';
                      }

                      return [
                      {
                        num: '01',
                        title: `Corrigir ${ws0?.movement || METRIC_LABELS[ws0?.metric] || 'seu ponto fraco'}`,
                        desc: frase01Desc,
                      },
                      {
                        num: '02',
                        title: frase02Title,
                        desc: frase02Desc,
                      },
                      {
                        num: '03',
                        title: 'Periodização orientada à sua próxima prova',
                        desc: `Plano semanal personalizado com foco em derrubar seu tempo para ${evolution ? formatTimeSec(projectedAt12) : 'o próximo nível'}.`,
                      },
                    ];
                    })().map((item) => (
                      <div key={item.num} className="flex gap-3 items-start">
                        <span className="text-2xl font-bold text-primary/30 font-mono leading-none mt-0.5">{item.num}</span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ─── 6. PROJEÇÃO DE EVOLUÇÃO ─── */}
              {evolution && projectionChartData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  className="bg-card rounded-2xl border border-primary/30 p-6 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-primary" />
                    <h3 className="font-display text-sm tracking-wider text-foreground">
                      SUA EVOLUÇÃO PROJETADA
                    </h3>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Com treino direcionado por um coach OUTLIER, seu tempo pode cair para{' '}
                    <span className="text-primary font-bold">{formatTimeSec(projectedAt12)}</span> em 12 meses.
                  </p>

                  {/* Chart */}
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={projectionChartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(val: number) => formatTimeSec(val)}
                          domain={['dataMin - 60', 'dataMax + 60']}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value: number) => [formatTimeSec(value), 'Tempo']}
                        />
                        {projectedAt12 > 0 && (
                          <ReferenceLine
                            y={projectedAt12}
                            stroke="hsl(var(--primary))"
                            strokeDasharray="4 4"
                            opacity={0.6}
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey="tempo"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#projGradient)"
                          dot={{ fill: 'hsl(var(--primary))', r: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Metric boxes */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-secondary/40 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-foreground">{formatTimeSec(projectedAt12)}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Meta em 12m</div>
                    </div>
                    <div className="bg-secondary/40 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-primary">{evolution.ratePerMonth}s</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Ganho/mês</div>
                    </div>
                    <div className="bg-secondary/40 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-foreground">
                        {String(Math.floor(gainIn12 / 60)).padStart(2, '0')}:{String(Math.round(gainIn12 % 60)).padStart(2, '0')}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Ganho total</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─── 7. CTA FINAL — GATE PREMIUM ─── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="relative mt-4"
              >
                <div className="bg-gradient-to-b from-primary/10 via-card to-card rounded-2xl border border-primary/30 p-8 text-center space-y-6 relative overflow-hidden">
                  {/* Animated glow */}
                  <div className="absolute inset-0 bg-primary/5 animate-pulse rounded-2xl" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />

                  <div className="relative z-10 space-y-6">
                    {/* Loss framing */}
                    {gainIn12 > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-display">
                          Potencial escondido no seu resultado
                        </p>
                        <p className="text-4xl font-bold text-primary font-mono">
                          {Math.floor(gainIn12 / 60)}:{String(Math.round(gainIn12 % 60)).padStart(2, '0')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          minutos que você pode recuperar com treino direcionado
                        </p>
                      </div>
                    )}

                    <div className="w-16 h-px bg-primary/30 mx-auto" />

                    <div className="space-y-3">
                      <h3 className="font-display text-base tracking-wider text-foreground">
                        DESBLOQUEIE SEU POTENCIAL COMPLETO
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                        Um coach dedicado vai criar um plano de treino focado exatamente nos seus pontos fracos. Treinos semanais personalizados, acompanhamento de evolução e suporte contínuo.
                      </p>
                    </div>

                    <button
                      onClick={() => setStep('coach-selection')}
                      className="inline-flex items-center gap-3 font-display text-sm tracking-widest px-8 py-4 rounded-xl bg-primary text-primary-foreground hover:brightness-110 hover:scale-105 transition-all duration-200 shadow-2xl shadow-primary/50 ring-2 ring-primary/40"
                    >
                      <Zap className="w-5 h-5" />
                      COMEÇAR MEUS 30 DIAS GRÁTIS
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <p className="text-[10px] text-muted-foreground/50">
                      Cancele quando quiser
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Back to search */}
              <div className="text-center pt-4">
                <button
                  onClick={() => { setStep('search'); setScores([]); setSearchResults([]); setSearchDone(false); setRoxCoachFailed(false); setRoxCoachDiagnosticos([]); setTextoIa(null); setTextoIaLoading(false); lastSearchedRef.current = ''; }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Buscar outro atleta
                </button>
              </div>
            </motion.div>
          )}

          {/* ===== COACH SELECTION STEP ===== */}
          {step === 'coach-selection' && (
            <motion.div
              key="coach-selection"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="flex flex-col items-center justify-center min-h-[60vh] px-4"
            >


              <OnboardingCoachSelection
                skipLinking
                onCoachSelected={(coachId, coachName) => {
                  try {
                    localStorage.setItem('outlier_selected_coach', JSON.stringify({ coachId, coachName }));
                  } catch {}
                  window.location.href = '/login';
                }}
                onBack={() => setStep('results')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
