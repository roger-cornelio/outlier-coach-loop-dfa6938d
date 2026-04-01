/**
 * DiagnosticRadarBlock - Perfil de Performance do Atleta OUTLIER
 * 
 * MOBILE-FIRST: Card de Decisão compacto no mobile, layout completo no desktop.
 * Toggle "Modo Avançado" para mobile (persistido em localStorage).
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { Activity, ChevronDown, ChevronUp, Info, Target, Crown, TrendingUp, Flame, ChevronRight, Star, Trophy, Lock, BarChart3, Check, X, Calendar, Dumbbell, Timer, Zap, Mountain, Crosshair, Gauge, Footprints, Bike, HeartPulse, Swords, AlertTriangle, Loader2, Clock, BookOpen, ExternalLink, Users, Medal, Flag } from 'lucide-react';
import { calculateEvolutionTimeframe, calculateProvaAlvoTarget } from '@/utils/evolutionTimeframe';
import { MOCK_USER_AGE_GROUP } from '@/utils/evolutionUtils';
import { supabase } from '@/integrations/supabase/client';
import { StatusCrownPreset } from '@/components/ui/StatusCrownPreset';
import { ShieldCrest } from '@/components/ui/ShieldCrest';
import { NextLevelModal } from '@/components/NextLevelModal';
import type { ExtendedLevelKey } from '@/hooks/useJourneyProgress';
import { PerformanceStatusCard } from './dashboard/PerformanceStatusCard';
import { getScoreDescription, getScoreColorClass } from '@/utils/outlierScoring';
import { type CalculatedScore } from '@/utils/hyroxPercentileCalculator';
import { type PerfilFisiologico } from '@/hooks/useDiagnosticScores';
import { formatOfficialTime } from '@/utils/athleteStatusSystem';
import { DiagnosticStationsBars } from './DiagnosticStationsBar';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

import { useAuth } from '@/hooks/useAuth';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useOutlierStore } from '@/store/outlierStore';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';
// useIsMobile removed — unified responsive layout
import { useBenchmarkResults } from '@/hooks/useBenchmarkResults';
import { getEliteTargetSeconds } from './dashboard/PerformanceStatusCard';
import { useTargetTimes } from '@/hooks/useTargetTimes';
import { useTopPercent } from '@/hooks/useTopPercent';
import { deduplicateRaceName } from '@/utils/raceNameDedup';

// ============================================
// MAPAS DE MÉTRICAS → LABELS E ANÁLISE
// ============================================

const METRIC_LABELS: Record<string, string> = {
  run_avg: 'Corrida',
  roxzone: 'Roxzone',
  ski: 'Ski Erg',
  sled_push: 'Sled Push',
  sled_pull: 'Sled Pull',
  bbj: 'Burpee Broad Jump',
  row: 'Remo',
  farmers: 'Farmer\'s Carry',
  sandbag: 'Sandbag Lunges',
  wallballs: 'Wall Balls'
};

const STATUS_LABELS: Record<string, string> = {
  open: 'OPEN',
  pro: 'PRO',
  elite: 'ELITE',
};

const STATUS_SUMMARY: Record<string, string> = {
  open: 'Você está na categoria OPEN. Importe uma prova oficial para evoluir.',
  pro: 'Você compete no nível PRO com resultados validados em prova.',
  elite: 'Você está entre os atletas de elite da modalidade.',
};

const RADAR_AXES = [
  { metrics: ['run_avg', 'row'], name: 'Resistência Cardiovascular', shortName: 'Cardio' },
  { metrics: ['sled_push', 'sled_pull'], name: 'Força & Resistência Muscular', shortName: 'Força' },
  { metrics: ['wallballs'], name: 'Potência & Vigor', shortName: 'Potência' },
  { metrics: ['ski', 'bbj'], name: 'Capacidade Anaeróbica', shortName: 'Anaeróbica' },
  { metrics: ['sandbag', 'farmers'], name: 'Core & Estabilidade', shortName: 'Core' },
  { metrics: ['roxzone'], name: 'Coordenação sob Fadiga', shortName: 'Eficiência' },
];


// ============================================
// INLINE CTA: Importar Última Prova HYROX — auto-search + import
// ============================================

/** Convert a string to a URL-friendly slug */
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Build the RoxCoach URL from search result data */
function buildRoxCoachUrl(result: { event_name: string; athlete_name: string; season_id?: number }): string {
  const seasonId = result.season_id || 8;
  const eventPart = result.event_name.split(' • ')[0] || result.event_name;
  const eventSlug = toSlug(eventPart);
  const athleteSlug = toSlug(result.athlete_name);
  return `https://www.rox-coach.com/seasons/${seasonId}/races/${eventSlug}/results/${athleteSlug}`;
}

function ImportProvaInlineCTA() {
  const { user, profile } = useAuth();
  const { athleteConfig, triggerExternalResultsRefresh } = useOutlierStore();
  const [state, setState] = useState<'idle' | 'searching' | 'importing' | 'done' | 'error' | 'no-race'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [importedResult, setImportedResult] = useState<{
    eventName: string;
    totalSeconds: number;
    raceCategory: string;
  } | null>(null);

  const profileName = profile?.name || '';

  async function handleClick() {
    if (!profileName || profileName.length < 2) {
      setErrorMsg('Configure seu nome no perfil primeiro.');
      setState('error');
      return;
    }

    setState('searching');
    setErrorMsg('');

    try {
      const parts = profileName.trim().split(/\s+/);
      const firstName = parts.length > 1 ? parts[0] : '';
      const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
      const gender = athleteConfig?.sexo === 'feminino' ? 'W' : athleteConfig?.sexo === 'masculino' ? 'M' : '';

      const { data, error } = await supabase.functions.invoke('search-hyrox-athlete', {
        body: { firstName, lastName, gender },
      });

      if (error) throw error;
      const results = data?.results || [];
      if (results.length === 0) {
        setErrorMsg('Faça uma prova HYROX para desbloquear seu diagnóstico OUTLIER.');
        setState('no-race');
        return;
      }

      // Sort by most recent: season desc, then event_index desc (higher = more recent)
      const sorted = [...results].sort((a: any, b: any) => {
        if ((b.season_id || 0) !== (a.season_id || 0)) return (b.season_id || 0) - (a.season_id || 0);
        return (b.event_index ?? -1) - (a.event_index ?? -1);
      });
      const mostRecent = sorted[0];

      // Auto-import without confirmation
      await importRace(mostRecent);
    } catch (err: any) {
      console.error('Quick search error:', err);
      setErrorMsg('Erro ao buscar provas. Tente novamente.');
      setState('error');
    }
  }

  async function importRace(raceResult: any) {
    if (!user) return;
    setState('importing');

    const url = raceResult.result_url;
    const roxCoachUrl = buildRoxCoachUrl(raceResult);

    try {
      // FIX 1: Dedup — check if this URL was already imported
      const { data: existingResults } = await supabase
        .from('benchmark_results')
        .select('id, time_in_seconds, event_name, race_category')
        .eq('user_id', user.id)
        .eq('screenshot_url', url)
        .limit(1);

      if (existingResults && existingResults.length > 0) {
        const existing = existingResults[0];
        toast.info('Essa prova já foi importada anteriormente.');
        setImportedResult({
          eventName: existing.event_name || 'Prova HYROX',
          totalSeconds: existing.time_in_seconds || 0,
          raceCategory: existing.race_category || 'OPEN',
        });
        triggerExternalResultsRefresh();
        setState('done');
        
        // Dispatch event to trigger category modal
        window.dispatchEvent(new CustomEvent('outlier:race-imported', { 
          detail: { status: (existing.race_category || 'OPEN').toLowerCase() } 
        }));
        return;
      }

      // Action A: Scrape Hyrox data + Action B: Diagnostic via proxy — in parallel
      const [scrapeResult, diagResult] = await Promise.all([
        supabase.functions.invoke('scrape-hyrox-result', { body: { url } }),
        supabase.functions.invoke('proxy-roxcoach', {
          body: {
            athlete_name: raceResult.athlete_name,
            event_name: raceResult.event_name,
            division: raceResult.division,
            season_id: raceResult.season_id,
            result_url: url, // Original HYROX URL with idp/event params
          },
        }).catch(() => ({ data: null, error: null })),
      ]);

      const { data: scrapeData, error: scrapeError } = scrapeResult;
      if (scrapeError || scrapeData?.error || !scrapeData?.time_in_seconds) {
        throw new Error(scrapeData?.error || 'Não foi possível ler os dados da prova.');
      }

      const totalSeconds = scrapeData.time_in_seconds;
      const eventName = scrapeData.event_name || 'Prova HYROX';
      const eventYear = scrapeData.event_year || new Date().getFullYear();
      const eventDate = scrapeData.event_date || `${eventYear}-06-15`; // Mid-year fallback avoids timezone edge cases
      const raceCategory = scrapeData.race_category || 'OPEN';
      const splits = scrapeData.splits || null;
      const hasSplits = splits && Object.values(splits).some((v: any) => v && v > 0);

      // source_index: maior season + maior event_index = prova mais recente
      const sourceIndex = (raceResult.season_id && raceResult.event_index !== undefined)
        ? (raceResult.season_id * 1000) + (raceResult.event_index ?? 0)
        : null;

      const insertPayload: any = {
        user_id: user.id,
        result_type: 'prova_oficial',
        event_name: eventName,
        event_date: eventDate,
        time_in_seconds: totalSeconds,
        screenshot_url: url,
        race_category: raceCategory,
        completed: true,
        block_id: `prova_oficial_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        workout_id: `prova_oficial_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        benchmark_id: 'HYROX_OFFICIAL',
        source_index: sourceIndex,
      };

      if (hasSplits) {
        const splitKeys = ['run_avg_sec', 'roxzone_sec', 'ski_sec', 'sled_push_sec', 'sled_pull_sec', 'bbj_sec', 'row_sec', 'farmers_sec', 'sandbag_sec', 'wallballs_sec'];
        for (const key of splitKeys) {
          if (splits[key]) insertPayload[key] = Math.round(splits[key]);
        }
      }

      const { data: insertedData, error: insertError } = await supabase
        .from('benchmark_results')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          toast.info('Essa prova já foi importada anteriormente.');
          setState('done');
          setImportedResult({ eventName, totalSeconds, raceCategory });
          triggerExternalResultsRefresh();
          return;
        }
        throw insertError;
      }

      // Save race_results reference
      const idpMatch = url.match(/idp=([^&]+)/);
      const eventMatch = url.match(/event=([^&]+)/);
      if (idpMatch) {
        await supabase.from('race_results').insert({
          athlete_id: user.id,
          hyrox_idp: idpMatch[1],
          hyrox_event: eventMatch ? eventMatch[1] : null,
          source_url: url,
        } as any).single();
      }

      // Calculate percentiles
      const resultId = insertedData?.id;
      const hasGenderConfigured = athleteConfig?.sexo && ['masculino', 'feminino'].includes(athleteConfig.sexo);
      if (resultId && hasGenderConfigured) {
        const { hasExistingScores, calculateAndSaveHyroxPercentiles } = await import('@/utils/hyroxPercentileCalculator');
        const alreadyExists = await hasExistingScores(resultId);
        if (!alreadyExists) {
          const division = raceCategory === 'PRO' ? 'HYROX PRO' : 'HYROX';
          const gender = athleteConfig?.sexo === 'feminino' ? 'F' : 'M';
          
          const mapping: Record<string, string> = {
            run_avg_sec: 'run_avg', roxzone_sec: 'roxzone', ski_sec: 'ski',
            sled_push_sec: 'sled_push', sled_pull_sec: 'sled_pull', bbj_sec: 'bbj',
            row_sec: 'row', farmers_sec: 'farmers', sandbag_sec: 'sandbag', wallballs_sec: 'wallballs',
          };
          
          let metrics: any[] = [];
          if (hasSplits) {
            for (const [key, metricName] of Object.entries(mapping)) {
              if (splits[key] && splits[key] > 0) {
                metrics.push({ metric: metricName, raw_time_sec: Math.round(splits[key]), data_source: 'real' });
              }
            }
          }
          if (metrics.length > 0) {
            await calculateAndSaveHyroxPercentiles(resultId, division, gender, metrics);
          }
        }
      }

      // FIX 2: Save diagnostic data WITHOUT deleting all history
      // Insert new diagnostic linked to this specific result, don't wipe previous ones
      const diagData = diagResult?.data;
      if (diagData && diagData.ok !== false) {
        try {
          const { parseDiagnosticResponse, hasDiagnosticData } = await import('@/utils/diagnosticParser');
          const parsed = parseDiagnosticResponse(diagData, user.id, roxCoachUrl);
          if (hasDiagnosticData(parsed)) {
            // Check if diagnostic already exists for this source_url
            const { data: existingDiag } = await supabase
              .from('diagnostico_resumo')
              .select('id')
              .eq('atleta_id', user.id)
              .eq('source_url', roxCoachUrl)
              .limit(1);

            if (!existingDiag || existingDiag.length === 0) {
              // Insert new resumo and get its id to link melhoria/splits
              const { data: insertedResumo } = await supabase
                .from('diagnostico_resumo')
                .insert(parsed.resumoRow)
                .select('id')
                .single();

              const resumoId = insertedResumo?.id;
              if (resumoId) {
                if (parsed.diagRows.length > 0) {
                  const linkedDiagRows = parsed.diagRows.map(r => ({ ...r, resumo_id: resumoId }));
                  await supabase.from('diagnostico_melhoria').insert(linkedDiagRows);
                }
                if (parsed.splitRows.length > 0) {
                  const linkedSplitRows = parsed.splitRows.map(r => ({ ...r, resumo_id: resumoId }));
                  await supabase.from('tempos_splits').insert(linkedSplitRows);
                }
              }
            }
          }
        } catch (err) {
          console.warn('Diagnostic save failed (non-critical):', err);
        }
      }

      // FIX 3: Set state to 'done' with result data
      setImportedResult({ eventName, totalSeconds, raceCategory });
      triggerExternalResultsRefresh();
      toast.success('Dados da prova atualizados.');
      setState('done');
      
      // Dispatch event to trigger category modal in Dashboard
      window.dispatchEvent(new CustomEvent('outlier:race-imported', { 
        detail: { status: raceCategory.toLowerCase() } 
      }));
    } catch (err: any) {
      console.error('Quick import error:', err);
      setErrorMsg(err.message || 'Erro ao importar prova.');
      setState('error');
    }
  }

  // FIX 3: Show imported result instead of CTA
  if (state === 'done' && importedResult) {
    const hrs = Math.floor(importedResult.totalSeconds / 3600);
    const mins = Math.floor((importedResult.totalSeconds % 3600) / 60);
    const secs = importedResult.totalSeconds % 60;
    const timeStr = hrs > 0
      ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${mins}:${String(secs).padStart(2, '0')}`;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-accent/10 border border-accent/30 rounded-xl p-4"
      >
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              {importedResult.eventName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {importedResult.raceCategory} • {timeStr}
            </p>
          </div>
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
        </div>
      </motion.div>
    );
  }

  if (state === 'no-race') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4"
      >
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-orange-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Faça uma prova HYROX para desbloquear seu diagnóstico OUTLIER</p>
            <p className="text-xs text-muted-foreground mt-0.5">Nenhuma prova encontrada no hyrox.com para o seu nome.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (state === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 cursor-pointer hover:bg-destructive/15 transition-colors"
        onClick={() => { setState('idle'); setErrorMsg(''); }}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{errorMsg}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Toque para tentar novamente</p>
          </div>
        </div>
      </motion.div>
    );
  }

  const isLoading = state === 'searching' || state === 'importing';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-primary/15 border border-primary/30 rounded-xl p-4 transition-colors",
        !isLoading && "cursor-pointer hover:bg-primary/20"
      )}
      onClick={isLoading ? undefined : handleClick}
    >
      <div className="flex items-center gap-3">
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-primary shrink-0 animate-spin" />
        ) : (
          <Flame className="w-5 h-5 text-primary shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">
            {state === 'searching' ? 'Buscando sua última prova...' :
             state === 'importing' ? 'Importando prova e diagnóstico...' :
             'Descubra seu nível OUTLIER'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading ? 'Aguarde, estamos processando...' :
             'Importamos automaticamente sua última prova HYROX'}
          </p>
        </div>
        {!isLoading && <ChevronRight className="w-4 h-4 text-primary shrink-0" />}
      </div>
      {!isLoading && (
        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
          <Info className="w-3 h-3 inline mr-1 text-amber-400" />
          Válido para nível OUTLIER: provas dos últimos 12 meses
        </p>
      )}
    </motion.div>
  );
}

// ============================================
// COMPONENT PROPS
// ============================================

interface RaceInfo {
  nome: string;
  race_date: string;
  categoria: string;
  daysUntil: number;
  partner_name?: string | null;
  participation_type?: string | null;
}

interface DiagnosticRadarBlockProps {
  scores: CalculatedScore[];
  loading?: boolean;
  hasData: boolean;
  todayWorkoutLabel?: string;
  hasTodayWorkout?: boolean;
  onStartWorkout?: () => void;
  provaAlvo?: RaceInfo | null;
  provaAlvoTargetTime?: string | null;
  perfilFisiologico?: PerfilFisiologico | null;
  splitTimes?: import('@/hooks/useDiagnosticScores').SplitTime[];
}

// ============================================
// ANIMATED COUNTER COMPONENT
// ============================================

function AnimatedCounter({ target, duration = 1000 }: {target: number;duration?: number;}) {
  const [value, setValue] = useState(0);
  const ref = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {setValue(0);return;}
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };

    ref.current = requestAnimationFrame(animate);
    return () => {if (ref.current) cancelAnimationFrame(ref.current);};
  }, [target, duration]);

  return <>{value}</>;
}

// ============================================
// REQUIREMENTS CHECKLIST — progressive counters
// ============================================
// MINI PIE PROGRESS — SVG conic-gradient
// ============================================
interface MiniPieProgressProps {
  value: number;
  total: number;
  size?: number;
}

function MiniPieProgress({ value, total, size = 22 }: MiniPieProgressProps) {
  const progress = total > 0 ? Math.min(value / total, 1) : 0;
  const isComplete = progress >= 1;

  if (isComplete) {
    return (
      <span className="inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <Check className="text-emerald-400" style={{ width: size * 0.7, height: size * 0.7 }} />
      </span>
    );
  }

  const r = (size - 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Background track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="3"
        opacity="0.4"
      />
      {/* Progress arc */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#f97316"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  );
}

// ============================================
// REQUIREMENTS CHECKLIST — mini pizza + fração
// ============================================
interface RequirementsChecklistProps {
  journeyData: ReturnType<typeof useJourneyProgress>;
  compact?: boolean;
}

function LargeCircleProgress({ value, total, label }: { value: number; total: number; label: string }) {
  const size = 72;
  const strokeWidth = 5;
  const progress = total > 0 ? Math.min(value / total, 1) : 0;
  const isComplete = progress >= 1;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={strokeWidth}
            opacity="0.25"
          />
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={isComplete ? '#10b981' : '#f97316'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isComplete ? (
            <Check className="w-6 h-6 text-emerald-400" />
          ) : (
            <span className="font-mono font-bold text-lg text-foreground">{value}</span>
          )}
        </div>
      </div>
      <span className="text-xs font-medium text-foreground/80">{total} {label}</span>
    </div>
  );
}

function RequirementsChecklist({ journeyData, compact, showNextLevelButton }: RequirementsChecklistProps & { showNextLevelButton?: boolean }) {
  const { targetLevel } = journeyData;
  const {
    benchmarksCompleted, benchmarksRequired,
    trainingSessions, trainingRequired,
    officialRaceRequired, hasOfficialRace
  } = targetLevel;

  return (
    <div className="space-y-3">
      {/* All circles side by side — Sessões first, then Benchmarks */}
      <div className="flex items-center justify-center gap-6">
        <LargeCircleProgress
          value={trainingSessions}
          total={trainingRequired}
          label="Sessões"
        />
        <LargeCircleProgress
          value={benchmarksCompleted}
          total={benchmarksRequired}
          label="Benchmarks"
        />
        {officialRaceRequired && (
          <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: 72, height: 72 }}>
              <svg width={72} height={72} viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={36} cy={36} r={33.5} fill="none" stroke="hsl(var(--muted))" strokeWidth={5} opacity={0.5} />
                <circle cx={36} cy={36} r={33.5} fill="none"
                  stroke={hasOfficialRace ? '#10b981' : 'hsl(var(--muted))'}
                  strokeWidth={5} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 33.5}
                  strokeDashoffset={hasOfficialRace ? 0 : 2 * Math.PI * 33.5}
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {hasOfficialRace ? (
                  <Check className="w-6 h-6 text-emerald-400" />
                ) : (
                  <X className="w-5 h-5 text-muted-foreground/60" />
                )}
              </div>
            </div>
            <span className="text-xs font-medium text-foreground/80">Prova Oficial</span>
          </div>
        )}
      </div>

      {/* Próximo nível button */}
      {showNextLevelButton && (
        <div className="pt-2">
          <NextLevelModal journeyProgress={journeyData} />
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER: percentileToStars
// ============================================
function percentileToStars(p: number) {
  if (p >= 80) return { count: 5 };
  if (p >= 60) return { count: 4 };
  if (p >= 40) return { count: 3 };
  if (p >= 20) return { count: 2 };
  return { count: 1 };
}

// ============================================
// MOBILE BLOCK 1 — CAMINHO PARA ELITE (CARD PRINCIPAL)
// ============================================
// ============================================
// PROJECTED TIME BLOCK — "Estou aqui → Chego aqui"
// ============================================
function ProjectedTimeBlock({
  currentTimeSec,
  targetTimeSec,
  targetLabel,
  projectedGainSec,
}: {
  currentTimeSec: number;
  targetTimeSec: number;
  targetLabel: string;
  projectedGainSec: number;
}) {
  const projectedTimeSec = Math.max(currentTimeSec - projectedGainSec, targetTimeSec);
  const reached = currentTimeSec <= targetTimeSec;

  return (
    <div className="rounded-xl bg-black/30 border border-amber-500/15 p-3 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70 mb-2.5">
        Meta de resultado
      </p>
      <div className="flex items-center justify-between gap-2">
        {/* Current time */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Atual</span>
          <span className="font-display text-xl font-bold text-foreground">
            {formatOfficialTime(currentTimeSec)}
          </span>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center gap-0.5 px-1">
          <ChevronRight className="w-5 h-5 text-amber-400" />
          {projectedGainSec > 0 && !reached && (
            <span className="text-[9px] text-emerald-400 font-semibold whitespace-nowrap">
              −{Math.floor(projectedGainSec / 60)}m{(projectedGainSec % 60).toString().padStart(2, '0')}s
            </span>
          )}
        </div>

        {/* Target time */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Requisito {targetLabel}</span>
          {reached ? (
            <span className="font-display text-xl font-bold text-emerald-400">
              {formatOfficialTime(targetTimeSec)} ✔
            </span>
          ) : (
            <span className="font-display text-xl font-bold text-amber-400">
              {formatOfficialTime(targetTimeSec)}
            </span>
          )}
        </div>
      </div>

      {/* Projected gain explanation */}
      {projectedGainSec > 0 && !reached && (
        <p className="text-[10px] text-muted-foreground mt-2 text-center leading-relaxed">
          Corrigindo seus pontos fracos, você pode ganhar até{' '}
          <span className="text-emerald-400 font-semibold">
            {Math.floor(projectedGainSec / 60)}m{(projectedGainSec % 60).toString().padStart(2, '0')}s
          </span>{' '}
          na prova
        </p>
      )}
      {reached && (
        <p className="text-[10px] text-emerald-400 mt-2 text-center font-semibold">
          Parabéns! Você já atingiu a meta 🏆
        </p>
      )}
    </div>
  );
}

// ============================================
// HELPER: Calculate projected gain from fixing weak stations
// Stations below P50 → estimate time gain if brought to P50
// ============================================
function calculateProjectedGain(scores: CalculatedScore[]): number {
  if (scores.length === 0) return 0;
  
  let totalGainSec = 0;
  
  for (const score of scores) {
    if (score.percentile_value >= 50) continue;
    
    // Estimate: each percentile point below 50 represents ~1-2s of potential gain
    // This is a conservative heuristic based on HYROX station time distributions
    const percentileGap = 50 - score.percentile_value;
    
    // Larger gaps = more gain potential (non-linear — diminishing returns near P50)
    const gainPerPoint = score.percentile_value < 25 ? 1.8 : 1.2;
    const stationGain = Math.round(percentileGap * gainPerPoint);
    
    totalGainSec += stationGain;
  }
  
  return totalGainSec;
}

// ============================================
// JOURNEY SHIELDS ROW — 3 escudos OPEN/PRO/ELITE
// ============================================
const SHIELDS_ORDER: ExtendedLevelKey[] = ['OPEN', 'PRO', 'ELITE'];

function JourneyShieldsRow({ journeyData }: { journeyData: ReturnType<typeof useJourneyProgress> }) {
  const { allLevels, trainingSessions, targetLevel, category, hasOfficialRace } = journeyData;

  return (
    <div className="flex items-start justify-between my-6 px-2">
      {SHIELDS_ORDER.map((levelKey, index) => {
        const levelRule = allLevels.find((l: any) => l.level_key === levelKey);
        const requiresRace = levelRule?.official_race_required && levelKey !== 'OPEN';

        const trainingReq = levelRule?.training_min_sessions || 120;
        const benchReq = levelRule?.benchmarks_required || 3;
        const trainingDone = trainingSessions;
        const benchDone = targetLevel.benchmarksCompleted;
        const trainingMet = trainingDone >= trainingReq;
        const benchMet = benchDone >= benchReq;
        const categoryIdx = SHIELDS_ORDER.indexOf(category);
        const raceMet = !requiresRace || (hasOfficialRace && categoryIdx >= index);

        const isOutlierAtLevel = trainingMet && benchMet && raceMet;

        // NEW RULE: Shield is unlocked (active image) if athlete's official category
        // is ABOVE this level (strictly). E.g. ELITE category unlocks OPEN + PRO, but NOT ELITE itself.
        const isUnlockedByCategory = hasOfficialRace && categoryIdx > index;

        // Previous level must be outlier to show progress
        const prevLevelOutlier = index === 0 ? true : (() => {
          const prevRule = allLevels.find((l: any) => l.level_key === SHIELDS_ORDER[index - 1]);
          const prevTrainingReq = prevRule?.training_min_sessions || 120;
          const prevBenchReq = prevRule?.benchmarks_required || 3;
          const prevRaceReq = prevRule?.official_race_required && SHIELDS_ORDER[index - 1] !== 'OPEN';
          const prevRaceMet = !prevRaceReq || (hasOfficialRace && categoryIdx >= index - 1);
          return trainingDone >= prevTrainingReq && benchDone >= prevBenchReq && prevRaceMet;
        })();

        let shieldFillPercent = 0;
        if (isOutlierAtLevel) {
          shieldFillPercent = 100;
        } else if (isUnlockedByCategory) {
          // Unlocked by category but not yet outlier — show journey progress
          const tProg = Math.min(1, trainingDone / trainingReq);
          const bProg = Math.min(1, benchDone / benchReq);
          const avgProg = (tProg + bProg) / 2;
          shieldFillPercent = Math.max(1, Math.round(avgProg * 100)); // min 1% to keep it active-looking
        } else if (prevLevelOutlier || index === 0) {
          const tProg = Math.min(1, trainingDone / trainingReq);
          const bProg = Math.min(1, benchDone / benchReq);
          const avgProg = (tProg + bProg) / 2;
          shieldFillPercent = Math.round((!raceMet && avgProg > 0.9) ? 90 : avgProg * 100);
        }

        // Shield shows active (colored) if outlier OR unlocked by category
        const showActive = isOutlierAtLevel || isUnlockedByCategory;

        return (
          <div key={levelKey} className="flex flex-col items-center flex-1">
            <div className="w-[7rem] h-[7rem] sm:w-[9rem] sm:h-[9rem] flex items-center justify-center">
              <ShieldCrest
                level={levelKey}
                active={showActive}
                fillPercent={shieldFillPercent}
                className={`w-full h-full object-contain transition-all duration-300 ${
                  !showActive ? 'opacity-35 grayscale-[30%]' : ''
                }`}
              />
            </div>
            <p className={`font-display font-extrabold tracking-[0.15em] mt-2 leading-none text-center ${
              isOutlierAtLevel
                ? 'text-amber-400'
                : showActive
                  ? 'text-foreground/80'
                  : 'text-muted-foreground/50'
            }`}>
              <span className="block text-base sm:text-lg">{levelKey}</span>
              <span className="block text-base sm:text-lg mt-0.5">OUTLIER</span>
            </p>
            {isOutlierAtLevel && (
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.12em] font-semibold mt-1 text-amber-400/70">
                ★ CONQUISTADO
              </p>
            )}
            {!showActive && (
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.12em] font-semibold mt-1 text-muted-foreground/40">
                🔒 BLOQUEADO
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Mobile-only components removed — unified responsive layout below

// ============================================
// TRAINING PRIORITIES BLOCK
// ============================================

// METRIC_INSIGHTS mock removed — gap values are now derived from real diagMelhorias data

/** Format a gap in seconds to a human-readable string */
function formatGapLabel(gapSec: number): string {
  if (gapSec <= 0) return '✓ Meta batida';
  if (gapSec < 60) return `↓ ${Math.round(gapSec)}s`;
  const mins = Math.floor(gapSec / 60);
  const secs = Math.round(gapSec % 60);
  return `↓ ${mins}:${secs.toString().padStart(2, '0')}`;
}

function StarRating({ count }: { count: number; colorClass?: string }) {
  return (
    <span className="flex items-center gap-1 shrink-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < count ? 'text-primary' : 'text-muted-foreground/20'}`}
          fill={i < count ? 'currentColor' : 'none'}
          strokeWidth={i < count ? 0 : 1.5}
        />
      ))}
    </span>
  );
}

function TrainingPrioritiesBlock({
  scores,
  diagMelhorias,
  prioridadesIA,
  onViewAll,
}: {
  scores: CalculatedScore[];
  diagMelhorias?: { improvement_value: number; movement: string; metric: string; percentage: number }[];
  prioridadesIA?: { exercicio: string; nivel_urgencia: number; metric: string }[] | null;
  onViewAll?: () => void;
}) {
  const showAll = true; // Always show all stations (filtered by <5 stars in render)

  // Normalize metric aliases (IA may return wrong names)
  const normalizeMetric = (raw: string): string => {
    const lower = raw.toLowerCase().trim();
    const ALIASES: Record<string, string> = {
      'roxygen': 'roxzone',
      'rox_zone': 'roxzone',
      'rox zone': 'roxzone',
      'run total': 'run_avg',
      'run_total': 'run_avg',
      'run': 'run_avg',
      'corrida': 'run_avg',
      'sled push': 'sled_push',
      'sled pull': 'sled_pull',
      'burpee broad jump': 'bbj',
      'wall balls': 'wallballs',
      'wall_balls': 'wallballs',
      'farmer carry': 'farmers',
      'farmers carry': 'farmers',
      "farmer's carry": 'farmers',
      'sandbag lunges': 'sandbag',
      'sandbag lunge': 'sandbag',
      'ski erg': 'ski',
      'ski_erg': 'ski',
      'remo': 'row',
    };
    return ALIASES[lower] || lower;
  };

  const worstStations = useMemo(() => {
    // Build lookup maps from diagMelhorias
    const melhoriaMap = new Map<string, number>();
    const percentageMap = new Map<string, number>();
    if (diagMelhorias) {
      for (const m of diagMelhorias) {
        if (m.metric) {
          const key = normalizeMetric(m.metric);
          if (m.improvement_value > 0) melhoriaMap.set(key, m.improvement_value);
          percentageMap.set(key, m.percentage ?? 0);
        }
      }
    }

    // Helper: build a station item from scores (for injection)
    function buildFromScore(s: CalculatedScore) {
      const pct = percentageMap.get(s.metric);
      const realGap = melhoriaMap.get(s.metric);
      let starCount: number;
      if (pct != null) {
        if (pct > 20) starCount = 0;
        else if (pct > 10) starCount = 1;
        else if (pct > 5) starCount = 2;
        else if (pct > 2) starCount = 3;
        else if (pct > 1) starCount = 4;
        else starCount = 5;
      } else {
        starCount = percentileToStars(s.percentile_value).count;
      }
      const insight = realGap != null && realGap > 0
        ? formatGapLabel(realGap)
        : (s.percentile_value >= 50 ? '✓ Meta batida' : `P${s.percentile_value}`);
      return {
        metric: s.metric,
        label: METRIC_LABELS[s.metric] || s.metric,
        stars: { count: starCount },
        insight,
        percentile: s.percentile_value,
        isMetBatida: insight.startsWith('✓'),
      };
    }

    // Helper: inject missing run_avg/roxzone from scores into an existing items list
    function injectMissingMetrics(items: typeof result): typeof result {
      const presentMetrics = new Set(items.map(i => normalizeMetric(i.metric)));
      const REQUIRED_METRICS = ['run_avg', 'roxzone'];
      for (const reqMetric of REQUIRED_METRICS) {
        if (!presentMetrics.has(reqMetric)) {
          const scoreEntry = scores.find(s => s.metric === reqMetric);
          if (scoreEntry) {
            items.push(buildFromScore(scoreEntry));
          }
        }
      }
      // Re-sort: lower stars = higher priority (show first)
      items.sort((a, b) => a.stars.count - b.stars.count);
      return items;
    }

    let result: {
      metric: string;
      label: string;
      stars: { count: number };
      insight: string;
      percentile: number;
      isMetBatida: boolean;
    }[] = [];

    // Try to use IA-generated priorities with cross-validation
    if (prioridadesIA && prioridadesIA.length > 0) {
      // Normalize IA metrics before validation
      const normalizedIA = prioridadesIA.map(p => ({
        ...p,
        metric: normalizeMetric(p.metric),
      }));

      // Validate each item against real diagMelhorias data
      const validMetrics = new Set(
        (diagMelhorias || []).map(m => normalizeMetric(m.metric))
      );
      // Also accept metrics from scores as valid
      for (const s of scores) {
        validMetrics.add(s.metric.toLowerCase());
      }

      const validatedRaw = normalizedIA.filter(p =>
        p.metric && validMetrics.has(p.metric)
      );

      // Deduplicate by normalized metric — keep highest urgency
      const validatedMap = new Map<string, typeof validatedRaw[0]>();
      for (const item of validatedRaw) {
        const existing = validatedMap.get(item.metric);
        if (!existing || item.nivel_urgencia > existing.nivel_urgencia) {
          validatedMap.set(item.metric, item);
        }
      }
      const validated = Array.from(validatedMap.values());

      // If more than 50% were invalid, discard IA data entirely
      if (validated.length > 0 && validated.length >= prioridadesIA.length * 0.5) {
        const items = validated
          .sort((a, b) => b.nivel_urgencia - a.nivel_urgencia)
          .slice(0, showAll ? validated.length : 3)
          .map(p => {
            const realGap = melhoriaMap.get(p.metric);
            const pct = percentageMap.get(p.metric);
            const insight = realGap != null && realGap > 0
              ? formatGapLabel(realGap)
              : `Urgência ${p.nivel_urgencia}/5`;
            // Use percentage (FOCO) for stars when available, otherwise invert nivel_urgencia
            // High urgency (5) = few stars (priority), low urgency (1) = many stars (ok)
            let starCount: number;
            if (pct != null) {
              if (pct > 20) starCount = 0;
              else if (pct > 10) starCount = 1;
              else if (pct > 5) starCount = 2;
              else if (pct > 2) starCount = 3;
              else if (pct > 1) starCount = 4;
              else starCount = 5;
            } else {
              // FIX: Invert urgency → stars (urgency 5 = 0 stars = highest priority shown)
              starCount = Math.max(0, 5 - p.nivel_urgencia);
            }
            return {
              metric: p.metric,
              label: METRIC_LABELS[p.metric] || p.exercicio || p.metric,
              stars: { count: starCount },
              insight,
              percentile: 0,
              isMetBatida: false,
            };
          });
        result = injectMissingMetrics(items);
        return result;
      }
    }

    // Fallback 1: use diagMelhorias sorted by improvement_value (same source as Parecer Outlier)
    if (diagMelhorias && diagMelhorias.length > 0) {
      // Normalize metrics in diagMelhorias
      const normalizedDiagRaw = diagMelhorias.map(d => ({
        ...d,
        metric: normalizeMetric(d.metric),
      }));

      // Deduplicate by normalized metric — keep highest improvement_value
      const diagMap = new Map<string, typeof normalizedDiagRaw[0]>();
      for (const item of normalizedDiagRaw) {
        const existing = diagMap.get(item.metric);
        if (!existing || item.improvement_value > existing.improvement_value) {
          diagMap.set(item.metric, item);
        }
      }
      const normalizedDiag = Array.from(diagMap.values());

      const allSorted = [...normalizedDiag]
        .sort((a, b) => b.improvement_value - a.improvement_value);
      const maxGap = allSorted[0]?.improvement_value || 1;
      
      const sliced = showAll ? allSorted : allSorted.filter(d => d.improvement_value > 0).slice(0, 3);

      if (sliced.length > 0) {
        const items = sliced.map(d => {
          const pct = d.percentage ?? 0;
          let starCount: number;
          if (d.improvement_value <= 0) starCount = 5; // Meta batida
          else if (pct > 20) starCount = 0;
          else if (pct > 10) starCount = 1;
          else if (pct > 5) starCount = 2;
          else if (pct > 2) starCount = 3;
          else if (pct > 1) starCount = 4;
          else starCount = 5;
          return {
            metric: d.metric,
            label: METRIC_LABELS[d.metric] || d.movement || d.metric,
            stars: { count: Math.min(5, Math.max(0, starCount)) },
            insight: d.improvement_value > 0 ? formatGapLabel(d.improvement_value) : '✓ Meta batida',
            percentile: 0,
            isMetBatida: d.improvement_value <= 0,
          };
        });
        result = injectMissingMetrics(items);
        return result;
      }
    }

    // Fallback 2 (último recurso): heuristic based on percentiles
    return [...scores]
      .sort((a, b) => a.percentile_value - b.percentile_value)
      .slice(0, showAll ? scores.length : 3)
      .map((s) => {
        const stars = percentileToStars(s.percentile_value);
        const realGap = melhoriaMap.get(s.metric.toLowerCase()) || melhoriaMap.get(s.metric);
        const insight = realGap != null && realGap > 0
          ? formatGapLabel(realGap)
          : (s.percentile_value >= 50 ? '✓ Meta batida' : `P${s.percentile_value}`);
        return {
          metric: s.metric,
          label: METRIC_LABELS[s.metric] || s.metric,
          stars,
          insight,
          percentile: s.percentile_value,
          isMetBatida: insight.startsWith('✓'),
        };
      });
  }, [scores, showAll, diagMelhorias, prioridadesIA]);

  const totalStations = useMemo(
    () => diagMelhorias?.length || scores.length,
    [diagMelhorias, scores]
  );

  if (scores.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} className="card-elevated rounded-2xl overflow-hidden">
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-3">
            <Flame className="w-3.5 h-3.5 text-orange-500" fill="currentColor" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-orange-500">Prioridades de Treino</span>
          </div>
          <p className="text-xs text-muted-foreground text-center py-4">Aguardando registro de resultados</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.09 }}
      className="card-elevated rounded-2xl overflow-hidden"
    >
      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-3">
          <Flame className="w-3.5 h-3.5 text-orange-500" fill="currentColor" />
          <span className="text-[10px] font-bold tracking-wider uppercase text-orange-500">
            Prioridades de Treino
          </span>
        </div>

        {/* List — hide 5-star items (meta batida / no priority) */}
        <ul className="space-y-2.5">
          {worstStations.filter(s => s.stars.count < 5).map((station, i) => (
            <li
              key={station.metric}
              className="flex items-center justify-between gap-3 text-sm"
            >
              {/* Left: rank + name */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-4 text-xs font-bold text-muted-foreground tabular-nums shrink-0">
                  {i + 1}.
                </span>
                <span className="font-semibold text-foreground/90 truncate">
                  {station.label}
                </span>
              </div>

              {/* Right: stars only */}
              <StarRating count={station.stars.count} />
            </li>
          ))}
        </ul>

      </div>
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DiagnosticRadarBlock({
  scores,
  loading = false,
  hasData: hasDataProp,
  todayWorkoutLabel,
  hasTodayWorkout,
  onStartWorkout,
  provaAlvo,
  provaAlvoTargetTime,
  perfilFisiologico,
  splitTimes,
}: DiagnosticRadarBlockProps) {
  const { profile } = useAuth();
  const { status, outlierScore, validatingCompetition } = useAthleteStatus();
  const { athleteConfig, externalResultsRefreshKey } = useOutlierStore();
  const journeyData = useJourneyProgress();
  // isMobile removed — unified responsive layout

  // Fetch diagnostico_melhoria + prioridades_treino/direcionamento for the latest resumo
  const [diagMelhorias, setDiagMelhorias] = useState<{ improvement_value: number; movement: string; metric: string; percentage: number }[]>([]);
  const [prioridadesIA, setPrioridadesIA] = useState<{ exercicio: string; nivel_urgencia: number; metric: string }[] | null>(null);
  const [direcionamentoIA, setDirecionamentoIA] = useState<string | null>(null);
  useEffect(() => {
    if (!profile?.user_id) return;
    (async () => {
      // Get latest resumo — atleta_id stores auth.uid(), NOT profile.id
      const { data: resumos } = await supabase
        .from('diagnostico_resumo')
        .select('id, prioridades_treino, direcionamento')
        .eq('atleta_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!resumos?.length) return;
      const resumo = resumos[0];

      // Cache prioridades_treino and direcionamento from DB
      if ((resumo as any).prioridades_treino) {
        setPrioridadesIA((resumo as any).prioridades_treino);
      }
      if ((resumo as any).direcionamento) {
        setDirecionamentoIA((resumo as any).direcionamento);
      }

      const { data: melhorias } = await supabase
        .from('diagnostico_melhoria')
        .select('improvement_value, movement, metric, percentage')
        .eq('resumo_id', resumo.id);
      if (melhorias) setDiagMelhorias(melhorias);
    })();
  }, [profile?.user_id]);
  // Fetch last simulation time
  const [lastSimulationTime, setLastSimulationTime] = useState<number | null>(null);
  useEffect(() => {
    // Debug override: check localStorage first (owner/QA only)
    const debugOverride = localStorage.getItem('DEBUG_SIMULATION_TIME');
    if (debugOverride) {
      const val = Number(debugOverride);
      if (!isNaN(val) && val > 0) {
        setLastSimulationTime(val);
        return;
      }
    }

    if (!profile?.user_id) return;
    (async () => {
      const { data } = await supabase
        .from('simulations')
        .select('total_time')
        .eq('athlete_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data?.length && (data[0] as any).total_time) {
        const simTime = (data[0] as any).total_time;
        // Simulados com menos de 30min são testes — ignorar para nível competitivo
        if (simTime >= 1800) {
          setLastSimulationTime(simTime);
        }
      }
    })();
  }, [profile?.user_id, externalResultsRefreshKey]);

  const { getOfficialCompetitions } = useBenchmarkResults();

  // Derivar prova anterior e meta do próximo nível (sem chamadas de rede extras)
  const officialCompetitions = useMemo(() => getOfficialCompetitions(), [getOfficialCompetitions]);

  // previousCompetition: segunda prova mais recente com tempo válido
  const previousCompetition = useMemo(() => {
    const withTime = officialCompetitions.filter((c) => typeof c.time_in_seconds === 'number' && c.time_in_seconds > 0);
    if (withTime.length < 2) return null;
    const p = withTime[1];
    return { time_in_seconds: p.time_in_seconds as number };
  }, [officialCompetitions]);

  const adminTarget = useTargetTimes(status, athleteConfig?.sexo || 'masculino');

  // Top% deterministic calculation from admin thresholds
  const topPercentData = useTopPercent(
    validatingCompetition?.time_in_seconds,
    athleteConfig?.sexo || 'masculino',
    athleteConfig?.idade,
  );
  
  const eliteTarget = useMemo(() => {
    // Determine next level based on current status
    // OPEN athletes → meta PRO, PRO athletes → meta ELITE, ELITE → meta ELITE
    const isOpen = status === 'open';
    
    if (isOpen && topPercentData.metaProSeconds) {
      return { targetSeconds: topPercentData.metaProSeconds, targetLabel: 'PRO' };
    }
    if (topPercentData.metaEliteSeconds) {
      return { targetSeconds: topPercentData.metaEliteSeconds, targetLabel: 'ELITE' };
    }
    if (adminTarget) return adminTarget;
    const gender = athleteConfig?.sexo || 'masculino';
    return getEliteTargetSeconds(status, gender);
  }, [status, athleteConfig?.sexo, adminTarget, topPercentData.metaEliteSeconds, topPercentData.metaProSeconds]);

  const formatDeltaTime = (seconds: number) => {
    const abs = Math.abs(Math.round(seconds));
    const formatted = formatOfficialTime(abs);
    return formatted.startsWith('00:') ? formatted.slice(3) : formatted;
  };

  const performanceSnapshot = useMemo(() => {
    const currentTime = validatingCompetition?.time_in_seconds ?? null;
    const proReqSec = topPercentData.metaProSeconds ?? null;
    const eliteReqSec = topPercentData.metaEliteSeconds ?? null;

    // Determine next level target
    let nextStatusLabel = 'PRO';
    let nextReqSec: number | null = proReqSec;
    const isOpen = status === 'open';
    const isPro = status === 'pro';
    const isElite = status === 'elite';

    if (isPro) {
      nextStatusLabel = 'ELITE';
      nextReqSec = eliteReqSec;
    } else if (isElite) {
      nextStatusLabel = 'ELITE';
      nextReqSec = eliteReqSec;
    }

    // Gap real do atleta para o próximo nível
    let gapToNextSec = 0;
    let gapValue = '—';
    let gapClass = 'text-muted-foreground';
    let isGoalReached = false;

    if (isElite) {
      gapValue = 'Meta atingida';
      gapClass = 'text-emerald-400';
      isGoalReached = true;
    } else if (currentTime && nextReqSec) {
      gapToNextSec = currentTime - nextReqSec;
      if (gapToNextSec <= 0) {
        gapValue = 'Meta atingida';
        gapClass = 'text-emerald-400';
        isGoalReached = true;
      } else if (gapToNextSec < 60) {
        gapValue = `↓ ${Math.round(gapToNextSec)}s`;
        gapClass = 'text-emerald-400 animate-pulse';
      } else {
        gapValue = `↓ ${formatDeltaTime(gapToNextSec)}`;
        gapClass = 'text-primary';
      }
    }

    // Progress bar: régua de evolução real
    // 0% = tempo da última prova oficial, 100% = meta do próximo nível
    // Posição atual = último simulado (se existir e for melhor que a prova oficial)
    let progressPercent = 0;
    if (isGoalReached) {
      progressPercent = 100;
    } else if (currentTime && nextReqSec && gapToNextSec > 0) {
      if (lastSimulationTime && lastSimulationTime < currentTime) {
        // Régua real: quanto o simulado avançou desde a prova oficial
        const totalRange = currentTime - nextReqSec;
        const improved = currentTime - lastSimulationTime;
        progressPercent = Math.min(100, Math.max(0, (improved / totalRange) * 100));
      } else {
        // Sem simulado ou simulado pior que prova = ponto de partida (0%)
        progressPercent = 0;
      }
    }

    // Previsão de meses usando evolutionProjection
    let monthsToNext: number | null = null;
    let ratePerMonth: number | null = null;
    if (!isGoalReached && gapToNextSec > 0 && currentTime) {
      const evoData = calculateEvolutionTimeframe(currentTime, gapToNextSec);
      monthsToNext = evoData.months;
      ratePerMonth = evoData.ratePerMonth;
    }

    // Frase de ação
    let actionPhrase = '';
    if (isGoalReached) {
      actionPhrase = `Você já atingiu o nível ${nextStatusLabel}! 🏆`;
    } else if (monthsToNext && ratePerMonth) {
      actionPhrase = `Com evolução de ${ratePerMonth}s/mês, você atinge ${nextStatusLabel} em ~${monthsToNext} ${monthsToNext === 1 ? 'mês' : 'meses'}`;
    } else if (gapToNextSec > 0) {
      actionPhrase = `Reduza ${formatDeltaTime(gapToNextSec)} para alcançar ${nextStatusLabel}`;
    }

    const nextReqFormatted = nextReqSec ? formatOfficialTime(nextReqSec) : '—';
    const previsaoFormatted = isGoalReached ? '✓' : monthsToNext ? `~${monthsToNext} ${monthsToNext === 1 ? 'mês' : 'meses'}` : '—';

    return {
      currentTime,
      nextStatusLabel,
      nextReqFormatted,
      gapValue,
      gapClass,
      isGoalReached,
      progressPercent,
      actionPhrase,
      previsaoFormatted,
      monthsToNext,
      ratePerMonth,
    };
  }, [
    validatingCompetition?.time_in_seconds,
    topPercentData.metaProSeconds,
    topPercentData.metaEliteSeconds,
    status,
  ]);

  // Evolution projection — uses the same gap as the header "Ganho" (currentTime - targetSec)
  // Fallback chain: header gap → diagMelhorias sum → scores estimate
  const evolutionProjection = useMemo(() => {
    const currentTime = validatingCompetition?.time_in_seconds;
    if (!currentTime) return null;

    const targetSec = eliteTarget?.targetSeconds ?? null;

    let totalGap: number;

    if (currentTime && targetSec && currentTime > targetSec) {
      // Primary: same calculation as header "Ganho" = currentTime - targetSec
      totalGap = currentTime - targetSec;
    } else if (diagMelhorias.length > 0) {
      // Fallback 1: sum of improvement_value from diagnostico_melhoria
      totalGap = diagMelhorias.reduce((sum, d) => sum + (d.improvement_value || 0), 0);
    } else if (scores.length > 0) {
      // Fallback 2: estimate gap from scores below P50
      totalGap = calculateProjectedGain(scores);
    } else {
      return null;
    }

    if (totalGap <= 0) return null;
    return calculateEvolutionTimeframe(currentTime, totalGap);
  }, [validatingCompetition?.time_in_seconds, eliteTarget?.targetSeconds, diagMelhorias, scores]);

  // 12-month projection chart data + gain
  const projectionChartData = useMemo(() => {
    if (!evolutionProjection || !validatingCompetition?.time_in_seconds) return [];
    const currentSec = validatingCompetition.time_in_seconds;
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    return Array.from({ length: 13 }, (_, i) => {
      const monthIdx = (now.getMonth() + i) % 12;
      return {
        month: monthNames[monthIdx],
        tempo: Math.round(Math.max(0, currentSec - (evolutionProjection.ratePerMonth * i))),
      };
    });
  }, [evolutionProjection, validatingCompetition?.time_in_seconds]);

  const gain12mFormatted = useMemo(() => {
    if (!evolutionProjection || !validatingCompetition?.time_in_seconds) return '';
    const currentSec = validatingCompetition.time_in_seconds;
    const projectedAt12 = Math.max(0, currentSec - (evolutionProjection.ratePerMonth * 12));
    const gain = Math.max(0, currentSec - projectedAt12);
    const m = Math.floor(gain / 60);
    const s = Math.round(gain % 60);
    return s > 0 ? `${m}min ${s}s` : `${m} min`;
  }, [evolutionProjection, validatingCompetition?.time_in_seconds]);

  const resultadoEsperadoFormatted = useMemo(() => {
    if (!evolutionProjection || !validatingCompetition?.time_in_seconds) return '';
    const currentSec = validatingCompetition.time_in_seconds;
    const projectedAt12 = Math.max(3600, currentSec - (evolutionProjection.ratePerMonth * 12));
    const h = Math.floor(projectedAt12 / 3600);
    const m = Math.floor((projectedAt12 % 3600) / 60);
    const s = Math.round(projectedAt12 % 60);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [evolutionProjection, validatingCompetition?.time_in_seconds]);

  const projectionTargetSec = useMemo(() => {
    if (!evolutionProjection || !validatingCompetition?.time_in_seconds) return 0;
    const currentSec = validatingCompetition.time_in_seconds;
    const totalGapSec = evolutionProjection.ratePerMonth * evolutionProjection.months;
    return Math.max(3600, currentSec - totalGapSec);
  }, [evolutionProjection, validatingCompetition?.time_in_seconds]);


  const hasData = hasDataProp && scores.length > 0;

  // Collapsible states (desktop)
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [isRadarOpen, setIsRadarOpen] = useState(true);
  const [showStationDetails, setShowStationDetails] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  // Coach Insights (AI-generated copy, cached in diagnostico_resumo.coach_insights)
  interface CoachInsights {
    limitador_descricao: string;
    ganho_acao: string;
    ganho_descricao: string;
    proximos_passos: string[];
  }
  const [coachInsights, setCoachInsights] = useState<CoachInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const insightsFetchedRef = useRef<string | null>(null);

  // Fetch or load cached coach insights when mainLimiter is available
  useEffect(() => {
    if (!hasData || !profile?.user_id) return;

    const limiterMetric = scores.length > 0
      ? [...scores].sort((a, b) => a.percentile_value - b.percentile_value)[0]?.metric
      : null;
    if (!limiterMetric) return;

    // Prevent duplicate fetches for same user
    const fetchKey = `${profile.user_id}-${limiterMetric}`;
    if (insightsFetchedRef.current === fetchKey) return;
    insightsFetchedRef.current = fetchKey;

    const loadInsights = async () => {
      try {
        // 1. Check cache in diagnostico_resumo
        const { data: resumos } = await supabase
          .from('diagnostico_resumo')
          .select('id, coach_insights')
          .eq('atleta_id', profile.user_id)
          .order('created_at', { ascending: false })
          .limit(1);

        const resumo = resumos?.[0];
        if (resumo?.coach_insights) {
          setCoachInsights(resumo.coach_insights as unknown as CoachInsights);
          return;
        }

        // 2. Generate via edge function
        setLoadingInsights(true);
        const limiterName = METRIC_LABELS[limiterMetric] || limiterMetric;
        const limiterPercentile = scores.find(s => s.metric === limiterMetric)?.percentile_value || 0;

        const splitsPayload = scores.map(s => ({
          metric: s.metric,
          name: METRIC_LABELS[s.metric] || s.metric,
          percentile: s.percentile_value,
          time_sec: s.raw_time_sec,
        }));

        const coachStyle = profile ? (profile as any).coach_style || 'PULSE' : 'PULSE';

        const { data, error } = await supabase.functions.invoke('generate-coach-insights', {
          body: {
            athlete_name: profile.name || 'Atleta',
            main_limiter_name: limiterName,
            main_limiter_percentile: limiterPercentile,
            splits: splitsPayload,
            coach_style: coachStyle,
          },
        });

        if (error || !data?.insights) {
          console.warn('[CoachInsights] Generation failed:', error || data?.error);
          return;
        }

        setCoachInsights(data.insights);

        // 3. Cache in DB
        if (resumo?.id) {
          await supabase
            .from('diagnostico_resumo')
            .update({ coach_insights: data.insights } as any)
            .eq('id', resumo.id);
        }
      } catch (err) {
        console.warn('[CoachInsights] Error:', err);
      } finally {
        setLoadingInsights(false);
      }
    };

    loadInsights();
  }, [hasData, profile?.user_id, scores]);

  // Derived data
  const athleteName = profile?.name?.toUpperCase() || 'ATLETA';
  const athleteCategory = useMemo(() => {
    const gender = athleteConfig?.sexo === 'feminino' ? 'WOMEN' : 'MEN';
    const level = status === 'elite' ? 'ELITE' : status === 'pro' ? 'PRO' : 'OPEN';
    return `HYROX ${level} ${gender}`;
  }, [athleteConfig?.sexo, status]);

  const statusLabel = STATUS_LABELS[status] || 'OPEN';
  const statusSummary = STATUS_SUMMARY[status] || STATUS_SUMMARY.open;

  const mainLimiter = useMemo(() => {
    if (!scores.length) return null;
    const sorted = [...scores].sort((a, b) => a.percentile_value - b.percentile_value);
    const weakest = sorted[0];
    return {
      metric: weakest.metric,
      name: METRIC_LABELS[weakest.metric] || weakest.metric,
      percentile: weakest.percentile_value,
      relativePerformance: 100 - weakest.percentile_value
    };
  }, [scores]);

  const affectedStations = useMemo(() => {
    return scores.
    filter((s) => s.percentile_value < 50).
    sort((a, b) => a.percentile_value - b.percentile_value).
    slice(0, 5).
    map((s) => ({
      name: METRIC_LABELS[s.metric] || s.metric,
      percentile: s.percentile_value,
      impactLevel: s.percentile_value < 25 ? 'Alto' : 'Moderado'
    }));
  }, [scores]);

  const topStations = affectedStations.slice(0, 2);
  const hasMoreStations = affectedStations.length > 2;

  const radarData = useMemo(() => {
    const scoreMap = new Map(scores.map(s => [s.metric, s.percentile_value]));
    return RADAR_AXES.map((axis) => {
      const values = axis.metrics
        .map(m => scoreMap.get(m))
        .filter((v): v is number => v != null);
      const avg = values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : 50;
      const clamped = Math.max(0, Math.min(100, avg));
      // Visual floor: prevents low percentiles from collapsing to center (FIFA/NBA2K pattern)
      const visualValue = Math.round(25 + clamped * 0.75);
      return { name: axis.name, shortName: axis.shortName, value: clamped, visualValue, fullMark: 100 };
    });
  }, [scores]);

  const vo2maxEstimate = useMemo(() => {
    // Prioridade 1: cache determinístico do banco (Dexheimer 2020)
    if (perfilFisiologico?.vo2_max) return perfilFisiologico.vo2_max;
    // Prioridade 2: calcular deterministicamente com raw_time_sec disponível
    const runScore = scores.find((s) => s.metric === 'run_avg');
    if (!runScore || !runScore.raw_time_sec) return null;
    // CS (Critical Speed) = 1000m / tempo médio por km (em segundos) → m/s
    const cs = 1000 / runScore.raw_time_sec;
    const sexoNum = athleteConfig?.sexo === 'feminino' ? 0 : 1;
    // Dexheimer 2020: VO2max = 8.449 * CS + 4.387 * sexo + 14.683
    return Math.round((8.449 * cs) + (4.387 * sexoNum) + 14.683);
  }, [scores, perfilFisiologico, athleteConfig?.sexo]);

  const lactateThresholdEstimate = useMemo(() => {
    // Prioridade 1: cache determinístico do banco
    if (perfilFisiologico?.limiar_lactato) return perfilFisiologico.limiar_lactato;
    // Prioridade 2: calcular deterministicamente — Limiar ≈ pace no CS
    const runScore = scores.find((s) => s.metric === 'run_avg');
    if (!runScore || !runScore.raw_time_sec) return null;
    const cs = 1000 / runScore.raw_time_sec;
    const paceSeconds = Math.round(1000 / cs); // segundos por km
    const mins = Math.floor(paceSeconds / 60);
    const secs = paceSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [scores, perfilFisiologico]);

  const METRIC_TRAINING_FOCUS: Record<string, string> = {
    run_avg: 'resistência aeróbica e ritmo de corrida',
    roxzone: 'transições e capacidade anaeróbica',
    ski: 'potência de puxada e resistência cardiorrespiratória',
    sled_push: 'força de empurrada e potência de membros inferiores',
    sled_pull: 'força de puxada e grip',
    bbj: 'potência explosiva e coordenação',
    row: 'resistência de remada e eficiência cardiovascular',
    farmers: 'força de grip e estabilidade de core',
    sandbag: 'resistência muscular de membros inferiores',
    wallballs: 'potência de membros inferiores e resistência de ombro',
  };

  // Deterministic fallback — uses movement labels, never raw metric keys
  const deterministicFocus = useMemo(() => {
    const gaps = [...(diagMelhorias || [])]
      .filter(d => d.improvement_value > 0)
      .sort((a, b) => b.improvement_value - a.improvement_value)
      .slice(0, 2);

    if (gaps.length === 0)
      return 'Foco em consolidação: desenvolvimento equilibrado de todas as valências.';

    const focuses = gaps.map(g => {
      // Priority: known training focus → known label → movement name (never raw metric key)
      return METRIC_TRAINING_FOCUS[g.metric] || METRIC_LABELS[g.metric] || METRIC_LABELS[g.movement?.toLowerCase()] || g.movement || g.metric;
    });
    const joined = focuses.length === 1 ? focuses[0] : `${focuses[0]} e ${focuses[1]}`;

    return `Os próximos treinos terão ênfase em ${joined} — os pontos com maior potencial de evolução identificados no seu diagnóstico.`;
  }, [diagMelhorias]);

  const [trainingFocus, setTrainingFocus] = useState<string>('');
  const [periodizationLoading, setPeriodizationLoading] = useState(false);
  const periodizationFetched = useRef(false);

  useEffect(() => {
    if (periodizationFetched.current) return;
    if (!diagMelhorias || diagMelhorias.length === 0) {
      setTrainingFocus(deterministicFocus);
      return;
    }

    const gaps = [...diagMelhorias]
      .filter(d => d.improvement_value > 0)
      .sort((a, b) => b.improvement_value - a.improvement_value)
      .slice(0, 3)
      .map(g => ({
        metric: g.metric,
        movement: g.movement,
        movement_label: METRIC_LABELS[g.metric] || g.movement,
        improvement_value: g.improvement_value,
      }));

    if (gaps.length === 0) {
      setTrainingFocus(deterministicFocus);
      return;
    }

    setPeriodizationLoading(true);

    const fetchWithRetry = async (retries = 2): Promise<void> => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-periodization-text', { body: { gaps } });
        if (error || !data?.texto) {
          if (retries > 0) return fetchWithRetry(retries - 1);
          console.warn('Periodization AI fallback:', error);
          setTrainingFocus(deterministicFocus);
        } else {
          setTrainingFocus(data.texto);
          periodizationFetched.current = true; // Only mark fetched on success
        }
      } catch {
        if (retries > 0) return fetchWithRetry(retries - 1);
        setTrainingFocus(deterministicFocus);
      } finally {
        setPeriodizationLoading(false);
      }
    };

    fetchWithRetry();
  }, [diagMelhorias, deterministicFocus]);

  // Loading state
  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-6 border-l-4 border-l-muted-foreground/30">
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">PERFIL DE PERFORMANCE</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground/60 text-sm">Carregando diagnóstico...</p>
        </div>
      </motion.div>);

  }

  // No more early return for !hasData — we render the full layout
  // and guard score-dependent blocks with hasData checks below

  // Mobile-only branch removed — unified responsive layout below

  // ============================================
  // UNIFIED RESPONSIVE LAYOUT
  // ============================================
  return (
    <div className="space-y-3">

      {/* BLOCO 1: HEADER — IDENTIDADE + DADOS COMPETITIVOS */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-4 pb-2">
        <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold tracking-wide text-foreground uppercase mb-2">{athleteName}</h1>
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 mb-1">
          <StatusCrownPreset status={status} size="lg" colorClass="text-amber-400" />
          <span className="font-bold text-amber-400 tracking-wider text-sm sm:text-2xl">{athleteCategory}</span>
        </div>

        <div className="mb-3" />

        {/* CTA para importar prova quando não tem dados */}
        {!performanceSnapshot.currentTime && (
          <ImportProvaInlineCTA />
        )}
      </motion.div>

      {/* BLOCO 2.5: JORNADA OUTLIER */}
      {(() => {
        const journey = journeyData;
        if (journey.loading || journey.allLevels.length === 0) return null;

        const { targetLevel, currentLevelLabel, targetLevelLabel, progressToTarget, isAtTop, isCapped } = journey;
        const missingBenchmarks = Math.max(0, targetLevel.benchmarksRequired - targetLevel.benchmarksCompleted);
        const missingSessions = Math.max(0, targetLevel.trainingRequired - targetLevel.trainingSessions);

        const BENCHMARK_ICONS = [Target, Dumbbell, Timer, Zap, Mountain, Crosshair, Gauge, Footprints, HeartPulse, Swords];
        const benchmarksRequired = targetLevel.benchmarksRequired || 3;
        const benchmarksCompleted = targetLevel.benchmarksCompleted || 0;
        const milestones = Array.from({ length: benchmarksRequired }, (_, i) => {
          const position = ((i + 1) / (benchmarksRequired + 1)) * 100;
          return {
            position,
            icon: BENCHMARK_ICONS[i % BENCHMARK_ICONS.length],
            label: `Benchmark ${i + 1}`,
            index: i,
            completed: i < benchmarksCompleted,
            unlocked: progressToTarget >= position,
          };
        });


        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.075 }} className="card-elevated rounded-2xl overflow-hidden">
            <div className="px-4 py-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" fill="currentColor" />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-orange-500">Jornada Outlier</span>
                </div>
                
              </div>


              {/* ELITE state */}
              {isAtTop ?
              <div className="text-center py-4">
                  <StatusCrownPreset status={status} size="lg" colorClass="text-amber-400" className="mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">Você está no topo</p>
                  <p className="text-xs text-muted-foreground mt-1">Modo manutenção — mantenha sua consistência.</p>
                </div> :

              <>
                  <div className="mb-4">
                    <div className="text-center mb-1">
                      <span className="text-3xl font-bold text-foreground font-display">{progressToTarget}%</span>
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{currentLevelLabel}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{targetLevelLabel}</span>
                    </div>
                    <div className="relative h-8 w-full rounded-full bg-secondary overflow-visible">
                      <div className="absolute inset-0 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progressToTarget}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400" />
                      </div>
                      {milestones.map((ms) => {
                      const Icon = ms.icon;
                      return (
                        <div key={ms.index} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10" style={{ left: `${ms.position}%` }}>
                            <button
                              onClick={() => {
                                if (ms.completed) {
                                  toast.success(`Benchmark ${ms.index + 1} concluído! ✓`);
                                } else if (!ms.unlocked) {
                                  toast.info('Benchmark ainda não disponível. Continue treinando para desbloquear!');
                                } else {
                                  toast.info(`Benchmark ${ms.index + 1} desbloqueado — registre seu resultado!`);
                                }
                              }}
                              className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                ms.completed
                                  ? 'bg-primary border-primary text-primary-foreground scale-105'
                                  : ms.unlocked
                                    ? 'bg-muted border-orange-500/60 text-orange-400 animate-pulse'
                                    : 'bg-muted/60 border-border/40 text-muted-foreground/40 cursor-not-allowed'
                              }`}
                            >
                              {ms.completed ? <Check className="w-3.5 h-3.5" /> : ms.unlocked ? <Icon className="w-3.5 h-3.5" /> : <Lock className="w-2.5 h-2.5" />}
                            </button>
                          </div>);
                    })}
                      {isCapped && <div className="absolute top-0 h-full w-px bg-destructive" style={{ left: `${journey.capPercent}%` }} />}
                    </div>
                    {isCapped &&
                  <p className="text-[10px] text-destructive mt-1.5 flex items-center gap-1">
                         <Lock className="w-3 h-3" />Travado em {journey.capPercent}% sem prova oficial
                       </p>
                   }
                  </div>

                  {/* Journey Shields — OPEN / PRO / ELITE */}
                  <JourneyShieldsRow journeyData={journeyData} />

                  {/* REQUISITOS PARA {targetLevel} — UNIFIED CHECKLIST */}
                  <div className="rounded-lg border border-border/30 p-3">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Target className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Requisitos para {targetLevelLabel}</span>
                    </div>
                    <RequirementsChecklist
                      journeyData={journeyData}
                      showNextLevelButton
                    />

                  </div>
                </>
              }
            </div>
          </motion.div>);

      })()}

      {/* NÍVEL COMPETITIVO — painel independente */}
      {performanceSnapshot.currentTime && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="p-4 bg-gradient-to-b from-card/80 to-card/40 border border-border/30 rounded-xl space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border/20 mb-1">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Nível Competitivo
              </span>
            </div>

            {/* 4 metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-card/50 border border-border/20 rounded-lg p-3 flex flex-col items-center text-center gap-1">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                  <Timer className="w-3.5 h-3.5 text-primary/70" />
                  <span>Última Prova</span>
                </div>
                <span className="font-extrabold text-lg text-foreground">{formatOfficialTime(performanceSnapshot.currentTime)}</span>
              </div>
              <div className="bg-card/50 border border-border/20 rounded-lg p-3 flex flex-col items-center text-center gap-1">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                  <Target className="w-3.5 h-3.5 text-primary/70" />
                  <span>Meta {performanceSnapshot.nextStatusLabel}</span>
                </div>
                <span className="font-extrabold text-lg text-foreground">{performanceSnapshot.nextReqFormatted}</span>
              </div>
              <div className={cn(
                'rounded-lg p-3 flex flex-col items-center text-center gap-1 border',
                performanceSnapshot.isGoalReached
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              )}>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-primary/70" />
                  <span>Faltam</span>
                </div>
                <span className={cn('font-extrabold text-lg', performanceSnapshot.gapClass)}>{performanceSnapshot.gapValue}</span>
              </div>
              <div className="bg-card/50 border border-border/20 rounded-lg p-3 flex flex-col items-center text-center gap-1">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-primary/70" />
                  <span>Previsão</span>
                </div>
                <span className={cn('font-extrabold text-lg', performanceSnapshot.isGoalReached ? 'text-emerald-400' : 'text-foreground')}>{performanceSnapshot.previsaoFormatted}</span>
              </div>
            </div>

            {/* Progress bar */}
            {!performanceSnapshot.isGoalReached && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-secondary/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${performanceSnapshot.progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-muted-foreground min-w-[36px] text-right">{performanceSnapshot.progressPercent}%</span>
              </div>
            )}

            {/* Action phrase */}
            {!performanceSnapshot.isGoalReached && performanceSnapshot.actionPhrase && (
              <Popover>
                <PopoverTrigger asChild>
                  <p className="text-xs text-muted-foreground leading-relaxed text-center cursor-help hover:text-foreground/70 transition-colors">
                    {performanceSnapshot.actionPhrase}
                    <Info className="w-3 h-3 inline-block ml-1 opacity-50" />
                  </p>
                </PopoverTrigger>
                <PopoverContent className="w-64 text-xs p-3">
                  <p className="text-muted-foreground leading-relaxed">
                    A régua avança conforme você realiza <strong>simulados</strong>. Cada simulado mede o quão próximo você está da meta do próximo nível.
                  </p>
                </PopoverContent>
              </Popover>
            )}
            {performanceSnapshot.isGoalReached && performanceSnapshot.actionPhrase && (
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                {performanceSnapshot.actionPhrase}
              </p>
            )}

            {/* Prova Alvo section */}
            {provaAlvo && performanceSnapshot.currentTime && (() => {
              const baseTime = lastSimulationTime ?? performanceSnapshot.currentTime;
              const projected = calculateProvaAlvoTarget(baseTime, provaAlvo.daysUntil);
              const usedSimulation = !!lastSimulationTime;
              const fullName = deduplicateRaceName(provaAlvo.nome);
              const yearMatch = fullName.match(/\b(20\d{2})\b/);
              const year = yearMatch ? yearMatch[1] : '';
              const withoutYear = fullName.replace(/\s*20\d{2}\s*/, ' ').trim();
              const knownPrefixes = ['HYROX', 'BOPE GAMES', 'BOPE', 'IRON MAN', 'SPARTAN'];
              let eventName = withoutYear;
              let cityName = '';
              for (const prefix of knownPrefixes) {
                if (withoutYear.toUpperCase().startsWith(prefix)) {
                  eventName = prefix;
                  cityName = withoutYear.slice(prefix.length).trim();
                  break;
                }
              }
              const displayName = `${eventName}${year ? ` ${year}` : ''}`;
              return (
                <div className="pt-3 mt-1 border-t border-border/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Flag className="w-3.5 h-3.5 text-primary/70" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prova Alvo</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="bg-card/40 border border-border/15 rounded-md p-2 flex flex-col items-center gap-0.5 text-center">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Evento</span>
                      <span className="font-bold text-sm text-foreground leading-tight">{displayName}</span>
                      {cityName && <span className="text-[9px] text-muted-foreground">({cityName})</span>}
                    </div>
                    <div className="bg-card/40 border border-border/15 rounded-md p-2 flex flex-col items-center gap-0.5 text-center">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Categoria</span>
                      <span className="font-bold text-sm text-foreground">{provaAlvo.categoria.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="bg-card/40 border border-border/15 rounded-md p-2 flex flex-col items-center gap-0.5 text-center">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Preparação</span>
                      <span className="font-bold text-sm text-foreground">{provaAlvo.daysUntil} dias</span>
                    </div>
                    <div className="bg-card/40 border border-border/15 rounded-md p-2 flex flex-col items-center gap-0.5 text-center">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Últ. Simulado</span>
                      <span className="font-bold text-sm text-foreground">{lastSimulationTime ? formatOfficialTime(lastSimulationTime) : '—'}</span>
                    </div>
                    <div className="bg-card/40 border border-border/15 rounded-md p-2 flex flex-col items-center gap-0.5 text-center">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Result. Esperado</span>
                      <span className="font-bold text-sm text-foreground">{formatOfficialTime(projected.targetSeconds)}</span>
                      <span className="text-[8px] text-muted-foreground/70">{usedSimulation ? '(base: simulado)' : '(base: prova oficial)'}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Ghost button — Top% position */}
            {topPercentData.topPercent && topPercentData.shouldShow && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="w-full h-auto py-1 px-2 text-[11px] text-muted-foreground hover:text-foreground">
                    👻 Se a prova fosse hoje, você estaria no <span className="font-bold text-primary mx-0.5">{topPercentData.topText}</span> da sua categoria
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-sm flex items-center gap-2">
                      👻 Sua Posição Competitiva
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                      <span className="text-muted-foreground">Posição atual</span>
                      <span className="font-bold text-primary text-sm">{topPercentData.topText}</span>
                    </div>
                    {performanceSnapshot.currentTime && (
                      <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                        <span className="text-muted-foreground">Última Prova</span>
                        <span className="font-semibold">{formatOfficialTime(performanceSnapshot.currentTime)}</span>
                      </div>
                    )}
                    {topPercentData.metaProSeconds && performanceSnapshot.currentTime && performanceSnapshot.currentTime > topPercentData.metaProSeconds && (
                      <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                        <span className="text-muted-foreground">Meta PRO</span>
                        <span className="font-semibold">{formatOfficialTime(topPercentData.metaProSeconds)} <span className="text-muted-foreground">(↓ {formatDeltaTime(performanceSnapshot.currentTime - topPercentData.metaProSeconds)})</span></span>
                      </div>
                    )}
                    {topPercentData.metaEliteSeconds && performanceSnapshot.currentTime && performanceSnapshot.currentTime > topPercentData.metaEliteSeconds && (
                      <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                        <span className="text-muted-foreground">Meta ELITE</span>
                        <span className="font-semibold">{formatOfficialTime(topPercentData.metaEliteSeconds)} <span className="text-muted-foreground">(↓ {formatDeltaTime(performanceSnapshot.currentTime - topPercentData.metaEliteSeconds)})</span></span>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      Baseado nos tempos de referência da sua faixa etária e categoria
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </motion.div>
      )}

      {/* Projeção de Evolução — card completo (desktop) */}
      {evolutionProjection && performanceSnapshot.currentTime && (
        <div className="border border-primary/20 bg-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Projeção de Evolução</h3>
            </div>
            <span className="text-[10px] uppercase tracking-wider border border-border/30 px-2 py-0.5 rounded-full text-muted-foreground/60">{evolutionProjection.tierLabel}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            🎯 Com o método OUTLIER, baseado em fisiologia aplicada, essa é a evolução esperada nos próximos 12 meses
          </p>

          {/* 12-month evolution chart */}
          {projectionChartData.length > 0 && (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionChartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="evolutionGradientInline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val: number) => { const h = Math.floor(val / 3600); const m = Math.floor((val % 3600) / 60); const s = Math.round(val % 60); return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }} domain={['dataMin - 60', 'dataMax + 60']} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => { const h = Math.floor(value / 3600); const m = Math.floor((value % 3600) / 60); const s = Math.round(value % 60); return [`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, 'Tempo']; }} labelFormatter={(label: string) => `Mês ${label.replace('M', '')}`} />
                  {projectionTargetSec > 0 && (
                    <ReferenceLine y={projectionTargetSec} stroke="hsl(var(--primary))" strokeDasharray="4 4" opacity={0.6} label={{ value: `Meta`, fill: 'hsl(var(--primary))', fontSize: 10, position: 'right' }} />
                  )}
                  <Area type="monotone" dataKey="tempo" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#evolutionGradientInline)" dot={{ fill: 'hsl(var(--primary))', r: 2 }} activeDot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-foreground">{resultadoEsperadoFormatted}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Resultado esperado</div>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-primary">{evolutionProjection.ratePerMonth}s</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Ganho/mês</div>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-foreground">{gain12mFormatted}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Ganho em 12m</div>
            </div>
          </div>
        </div>
      )}

      {/* Blocos sempre visíveis — mostram empty state quando sem dados */}
      {/* BLOCO PRIORIDADES DE TREINO */}
      <TrainingPrioritiesBlock scores={scores} diagMelhorias={diagMelhorias} prioridadesIA={prioridadesIA} onViewAll={onStartWorkout} />

      {/* BLOCO 6: PERFIL FISIOLÓGICO */}
      <TooltipProvider>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated border-l-4 border-l-muted-foreground/20 overflow-hidden">
        <Collapsible open={isRadarOpen} onOpenChange={setIsRadarOpen}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xs text-muted-foreground tracking-wide">PERFIL FISIOLÓGICO</h3>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{hasData ? 'Baseado na última prova registrada' : 'Aguardando registro de resultados'}</p>
              </div>
              {hasData && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-7 px-2">
                    {isRadarOpen ? <>Ocultar<ChevronUp className="w-3 h-3 ml-1" /></> : <>Ver perfil<ChevronDown className="w-3 h-3 ml-1" /></>}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-card/60 border border-border/30 rounded-xl p-3 shadow-sm text-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">VO₂ máx (estimado)</span>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <span className="font-display text-xl font-semibold text-foreground/85">{vo2maxEstimate || '—'}</span>
                  <span className="text-xs text-muted-foreground/60 font-medium">ml/kg/min</span>
                </div>
              </div>
              <div className="bg-card/60 border border-border/30 rounded-xl p-3 shadow-sm text-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Limiar de lactato</span>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <span className="font-display text-xl font-semibold text-foreground/85">{lactateThresholdEstimate || '—'}</span>
                  <span className="text-xs text-muted-foreground/60 font-medium">/km</span>
                </div>
              </div>
            </div>

            {/* Botão discreto — referência bibliográfica */}
            <div className="flex justify-center mt-2">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                    <BookOpen className="w-3 h-3" />
                    Como calculamos?
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-display leading-snug">Como o Outlier calcula o seu Perfil Fisiológico?</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                    <p className="text-foreground/80">Nossas estimativas são construídas sobre duas camadas de ciência do esporte:</p>

                    <div className="space-y-1.5">
                      <p className="text-foreground/90 font-semibold">1. A Fisiologia da Prova</p>
                      <p>Conforme mapeado em estudos recentes e específicos da modalidade, como o <em>"Acute physiological responses in Hyrox©"</em>, a corrida de fitness híbrido impõe um estresse sistêmico massivo, operando acima de 80% da frequência cardíaca máxima. A prova funciona como um verdadeiro teste de exaustão em campo.</p>
                      <a href="https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2024.1396079/full" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-[10px]">
                        <ExternalLink className="w-3 h-3" />
                        Frontiers in Physiology, 2024
                      </a>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-foreground/90 font-semibold">2. O Modelo Matemático HIFT</p>
                      <p>Como o HYROX é classificado cientificamente como um Treinamento Funcional de Alta Intensidade (HIFT), nosso algoritmo utiliza a equação de regressão linear validada por Dexheimer et al. (2020) para atletas da mesma categoria. Cruzamos a sua Velocidade Crítica — a quebra e sustentação do seu pace de corrida nas últimas estações sob altíssima fadiga — com seus dados biométricos para extrair uma predição clínica fiel do seu VO₂ Máximo e Pace de Limiar de Lactato (LT2), sem a necessidade de exames de sangue ou máscara de oxigênio.</p>
                      <a href="https://pubmed.ncbi.nlm.nih.gov/32698256/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-[10px]">
                        <ExternalLink className="w-3 h-3" />
                        Dexheimer et al., J Sports Sci Med, 2020
                      </a>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

          </div>
          {hasData && (
            <CollapsibleContent>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="px-4 pb-4 space-y-4">
                <p className="text-xs text-muted-foreground mb-3 text-center">Seus pontos fortes e fracos impactam diretamente seu Outlier Score.</p>
                <div className="h-48 sm:h-56 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="hsl(var(--foreground))" strokeOpacity={0.12} gridType="circle" radialLines />
                      <PolarAngleAxis dataKey="shortName" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 500 }} tickLine={false} />
                      <Radar name="Perfil Fisiológico" dataKey="visualValue" stroke="hsl(var(--primary))" strokeWidth={2} fill="hsl(var(--primary))" fillOpacity={0.4} dot={false} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 pt-3 border-t border-border/30">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground h-7" onClick={() => setShowStationDetails(!showStationDetails)}>
                    {showStationDetails ? <><ChevronUp className="w-3 h-3 mr-1" />Ocultar estações</> : <><ChevronDown className="w-3 h-3 mr-1" />Análise por estação</>}
                  </Button>
                </div>
                <AnimatePresence>
                  {showStationDetails &&
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="mt-3 overflow-hidden">
                      <DiagnosticStationsBars scores={scores} splitTimes={splitTimes} />
                    </motion.div>
                  }
                </AnimatePresence>
              </motion.div>
            </CollapsibleContent>
          )}
        </Collapsible>
      </motion.div>
      </TooltipProvider>




      {/* BLOCO 8: PERIODIZAÇÃO OUTLIER */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-gradient-to-r from-primary/10 to-primary/5 border-l-4 border-l-primary rounded-lg px-4 py-4">
        <p className="text-[11px] font-display text-primary uppercase tracking-widest mb-1.5">Periodização OUTLIER</p>
        {periodizationLoading ? (
          <p className="text-xs text-muted-foreground leading-relaxed italic">Analisando periodização...</p>
        ) : (
          <p className="text-xs text-foreground/90 leading-relaxed">{hasData ? (trainingFocus || deterministicFocus) : 'Importe sua primeira prova para receber periodização personalizada.'}</p>
        )}
      </motion.div>

      {/* BLOCO 9: CTA FINAL */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="pt-1">
        <Button
          size="lg"
          onClick={onStartWorkout}
          className="w-full font-display text-xl sm:text-lg tracking-wider px-6 py-5 rounded-2xl sm:rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-3 sm:gap-2 shadow-lg h-16 sm:h-auto">

          <Flame className="w-7 h-7 sm:w-5 sm:h-5" />
          BORA TREINAR
          <ChevronRight className="w-6 h-6 sm:w-5 sm:h-5" />
        </Button>
        <p className="text-muted-foreground/60 text-[10px] sm:text-xs text-center mt-1.5 sm:mt-2">Veja seu treino do dia</p>
      </motion.div>
    </div>);

}