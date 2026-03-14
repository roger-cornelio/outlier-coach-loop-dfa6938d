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
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { Activity, ChevronDown, ChevronUp, Info, Target, Crown, TrendingUp, Flame, ChevronRight, Star, Trophy, Lock, BarChart3, Check, X, Calendar, Dumbbell, Timer, Zap, Mountain, Crosshair, Gauge, Footprints, Bike, HeartPulse, Swords, AlertTriangle, Loader2, Clock } from 'lucide-react';
import { calculateEvolutionTimeframe } from '@/utils/evolutionTimeframe';
import { supabase } from '@/integrations/supabase/client';
import { StatusCrownPreset } from '@/components/ui/StatusCrownPreset';
import { ShieldCrest } from '@/components/ui/ShieldCrest';
import { NextLevelModal } from '@/components/NextLevelModal';
import type { ExtendedLevelKey } from '@/hooks/useJourneyProgress';
import { PerformanceStatusCard } from './dashboard/PerformanceStatusCard';
import { getScoreDescription, getScoreColorClass } from '@/utils/outlierScoring';
import { type CalculatedScore } from '@/utils/hyroxPercentileCalculator';
import { formatOfficialTime } from '@/utils/athleteStatusSystem';
import { DiagnosticStationsBars } from './DiagnosticStationsBar';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Switch } from './ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useOutlierStore } from '@/store/outlierStore';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';
import { useIsMobile } from '@/hooks/use-mobile';
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
  if (p >= 80) return { count: 5, colorClass: 'text-green-500' };
  if (p >= 60) return { count: 4, colorClass: 'text-blue-500' };
  if (p >= 40) return { count: 3, colorClass: 'text-yellow-500' };
  if (p >= 20) return { count: 2, colorClass: 'text-orange-500' };
  return { count: 1, colorClass: 'text-red-500' };
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

function MobilePathToEliteCard({
  athleteName,
  journeyData,
  scores,
  todayWorkoutLabel,
  hasTodayWorkout,
  onStartWorkout,
  currentTimeSec,
  targetTimeSec,
  targetLabel,
  provaAlvo,
  provaAlvoTargetTime,
}: {
  athleteName: string;
  journeyData: ReturnType<typeof useJourneyProgress>;
  scores: CalculatedScore[];
  todayWorkoutLabel?: string;
  hasTodayWorkout?: boolean;
  onStartWorkout?: () => void;
  currentTimeSec?: number | null;
  targetTimeSec?: number | null;
  targetLabel?: string;
  provaAlvo?: RaceInfo | null;
  provaAlvoTargetTime?: string | null;
}) {
  const { currentLevelLabel, targetLevelLabel, progressToTarget, isAtTop, isCapped, targetLevel } = journeyData;

  const missingBenchmarks = Math.max(0, targetLevel.benchmarksRequired - targetLevel.benchmarksCompleted);
  const missingSessions = Math.max(0, targetLevel.trainingRequired - targetLevel.trainingSessions);
  const needsOfficialRace = targetLevel.officialRaceRequired && !targetLevel.hasOfficialRace;

  const worstMetrics = useMemo(() =>
  [...scores].sort((a, b) => a.percentile_value - b.percentile_value).slice(0, 2),
  [scores]
  );

  const projectedGain = useMemo(() => calculateProjectedGain(scores), [scores]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-amber-800/20 bg-gradient-to-br from-neutral-900/95 to-amber-950/60">

      <div className="px-4 py-5">
        {/* Header: Name + Level */}
        <div className="mb-4">
          <h1 className="font-display text-xl font-bold tracking-wide text-foreground uppercase">
            {athleteName}
          </h1>
          {isAtTop ?
          <p className="text-xs text-emerald-400 font-semibold mt-0.5">Nível máximo alcançado 🏆</p> :

          <p className="text-xs text-amber-400 font-semibold mt-0.5">
              {currentLevelLabel} → {targetLevelLabel} — {progressToTarget}% do caminho
            </p>
          }

          {/* Prova Alvo inline */}
          {provaAlvo && (
            <div className="flex items-center gap-2 mt-2 text-xs">
              <Target className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground">{deduplicateRaceName(provaAlvo.nome)}</span>
              <span className="text-border/40">·</span>
              <span className="font-semibold text-foreground">{provaAlvo.daysUntil}d</span>
              {provaAlvoTargetTime && (
                <>
                  <span className="text-border/40">·</span>
                  <span className="text-muted-foreground">Meta</span>
                  <span className="font-bold text-primary">{provaAlvoTargetTime}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* META DE RESULTADO — "Estou aqui → Chego aqui" */}
        {currentTimeSec && targetTimeSec && (
          <ProjectedTimeBlock
            currentTimeSec={currentTimeSec}
            targetTimeSec={targetTimeSec}
            targetLabel={targetLabel || 'ELITE'}
            projectedGainSec={projectedGain}
          />
        )}

        {/* Progress Bar (thick) — always rendered when not at top */}
        {!isAtTop &&
        <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70">{currentLevelLabel}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70">{targetLevelLabel}</span>
            </div>
            <div className="relative h-6 w-full rounded-full bg-black/40 overflow-hidden">
              {progressToTarget > 0 ?
            <>
                  <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressToTarget}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400" />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-sm">
                    {progressToTarget}%
                  </span>
                </> :

            <div className="h-full w-full rounded-full bg-muted/30" />
            }
            </div>
            {progressToTarget === 0 &&
          <p className="text-[10px] text-muted-foreground italic mt-1">Progresso em cálculo</p>
          }
            {isCapped && progressToTarget > 0 &&
          <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Travado em {journeyData.capPercent}% sem prova oficial
              </p>
          }
          </div>
        }

        {/* Journey Shields — OPEN / PRO / ELITE */}
        <JourneyShieldsRow journeyData={journeyData} />

        {/* Checklist: contadores progressivos */}
        {!isAtTop &&
        <div className="mb-4 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70 mb-2">
              Requisitos para {targetLevelLabel}
            </p>
            <RequirementsChecklist
              journeyData={journeyData}
              compact
              showNextLevelButton
            />

          </div>
        }

        {/* Today's Workout */}
        {hasTodayWorkout && todayWorkoutLabel &&
        <div className="flex items-center gap-2 mb-4 text-xs text-foreground/80">
            <Flame className="w-4 h-4 text-orange-400 shrink-0" />
            <span>Treino de hoje: <span className="font-semibold text-foreground">{todayWorkoutLabel}</span></span>
          </div>
        }

        {/* CTA Button */}
        <Button
          size="lg"
          onClick={onStartWorkout}
          className="w-full font-display text-xl tracking-wider rounded-2xl bg-orange-500 hover:bg-orange-600 text-white transition-all flex items-center justify-center gap-3 shadow-lg h-16">

          <Flame className="w-7 h-7" />
          BORA TREINAR
          <ChevronRight className="w-6 h-6" />
        </Button>
        <p className="text-muted-foreground/60 text-[10px] text-center mt-1.5">Veja seu treino do dia</p>
      </div>
    </motion.div>);

}

// ============================================
// MOBILE BLOCK 3 — GARGALOS DE PERFORMANCE
// ============================================
function MobileBottlenecksBlock({
  scores


}: {scores: CalculatedScore[];}) {
  const [showAll, setShowAll] = useState(false);

  const bottlenecks = useMemo(() =>
  [...scores].
  filter((s) => s.percentile_value < 50).
  sort((a, b) => a.percentile_value - b.percentile_value),
  [scores]
  );

  if (bottlenecks.length === 0 && scores.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card-elevated rounded-xl px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Target className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Gargalos de performance</span>
        </div>
        <p className="text-xs text-muted-foreground text-center py-3">Lance seu primeiro simulado para ver seus gargalos</p>
      </motion.div>
    );
  }
  if (bottlenecks.length === 0) return null;

  const visibleBottlenecks = showAll ? bottlenecks : bottlenecks.slice(0, 3);
  const hasMore = bottlenecks.length > 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="card-elevated rounded-xl px-4 py-3">

      <div className="flex items-center gap-1.5 mb-2">
        <Target className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Gargalos de performance</span>
      </div>
      <ul className="space-y-1.5">
        {visibleBottlenecks.map((m, i) => {
          const stars = percentileToStars(m.percentile_value);
          return (
            <li key={i} className="flex items-center gap-2 text-xs text-foreground/80">
              <span className="flex-1 font-semibold">{METRIC_LABELS[m.metric] || m.metric}</span>
              <span className={`flex items-center gap-0.5 ${stars.colorClass}`}>
                {Array.from({ length: 5 }).map((_, si) =>
                <Star key={si} className="w-2.5 h-2.5" fill={si < stars.count ? 'currentColor' : 'none'} strokeWidth={si < stars.count ? 0 : 1.5} />
                )}
              </span>
            </li>);

        })}
      </ul>
      {hasMore &&
      <button
        onClick={() => setShowAll(!showAll)}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 pt-2 border-t border-border/20 text-center">

          {showAll ? 'Mostrar menos ▴' : `Ver todos (${bottlenecks.length}) ▾`}
        </button>
      }
    </motion.div>);

}

// ============================================
// MOBILE BLOCK 4 — PRÓXIMO PASSO
// ============================================
function MobileNextStepBlock({
  scores,
  journeyData



}: {scores: CalculatedScore[];journeyData: ReturnType<typeof useJourneyProgress>;}) {
  const { targetLevel } = journeyData;

  const nextBenchmark = useMemo(() => {
    if (!scores.length) return null;
    const sorted = [...scores].sort((a, b) => a.percentile_value - b.percentile_value);
    return METRIC_LABELS[sorted[0].metric] || sorted[0].metric;
  }, [scores]);

  const needsOfficialRace = targetLevel.officialRaceRequired && !targetLevel.hasOfficialRace;

  if (!nextBenchmark && !needsOfficialRace) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card-elevated rounded-xl px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Próximo passo</span>
        </div>
        <p className="text-xs text-muted-foreground text-center py-3">Lance um simulado para receber sugestões personalizadas</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="card-elevated rounded-xl px-4 py-3">

      <div className="flex items-center gap-1.5 mb-2">
        <TrendingUp className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Próximo passo</span>
      </div>
      <div className="space-y-1.5 text-xs text-foreground/80">
        {nextBenchmark &&
        <p>Próximo benchmark sugerido: <span className="font-semibold text-foreground">{nextBenchmark}</span></p>
        }
        {needsOfficialRace &&
        <p className="text-destructive font-semibold flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            Completar prova oficial HYROX
          </p>
        }
      </div>

      {/* Ciclo semanal */}
      <div className="mt-3 pt-2 border-t border-border/30 space-y-1 text-xs text-foreground/70">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <span>Ciclo atual: <span className="font-semibold text-foreground">---</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Flame className="w-3 h-3 text-muted-foreground" />
          <span>Sessões da semana: <span className="font-semibold text-foreground">---</span></span>
        </div>
      </div>
    </motion.div>);

}

// ============================================
// MOBILE COLLAPSIBLE SECTIONS
// ============================================

function MobilePhysiologicalModal({
  scores,
  radarData,
  vo2maxEstimate,
  lactateThresholdEstimate





}: {scores: CalculatedScore[];radarData: {name: string;shortName: string;value: number;fullMark: number;}[];vo2maxEstimate: number | null;lactateThresholdEstimate: string | null;}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full px-4 py-3 flex items-center justify-between card-elevated rounded-xl hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Perfil fisiológico</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-full h-[100dvh] sm:max-w-lg sm:h-auto overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Perfil Fisiológico</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Radar */}
          <div className="h-56 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="hsl(var(--foreground))" strokeOpacity={0.12} gridType="circle" radialLines />
                <PolarAngleAxis dataKey="shortName" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 500 }} tickLine={false} />
                <Radar name="Perfil" dataKey="visualValue" stroke="hsl(var(--primary))" strokeWidth={2} fill="hsl(var(--primary))" fillOpacity={0.4} dot={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Seus pontos fortes e fracos impactam diretamente seu Outlier Score.
          </p>

          {/* Station Bars */}
          <DiagnosticStationsBars scores={scores} />

          {/* VO2 & Lactate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card/60 border border-border/30 rounded-xl p-4">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">VO₂ máx</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-xl font-semibold text-foreground/85">{vo2maxEstimate || '—'}</span>
                <span className="text-xs text-muted-foreground/60">ml/kg/min</span>
              </div>
            </div>
            <div className="bg-card/60 border border-border/30 rounded-xl p-4">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Limiar lactato</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-xl font-semibold text-foreground/85">{lactateThresholdEstimate || '—'}</span>
                <span className="text-xs text-muted-foreground/60">/km</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>);

}

function MobileAdvancedDataSection({
  journeyData,
  scores,
  mainLimiter,
  affectedStations,
  athleteCategory






}: {journeyData: ReturnType<typeof useJourneyProgress>;scores: CalculatedScore[];mainLimiter: {metric: string;name: string;percentile: number;relativePerformance: number;} | null;affectedStations: {name: string;percentile: number;impactLevel: string;}[];athleteCategory: string;}) {
  const [isOpen, setIsOpen] = useState(false);
  const { targetLevel } = journeyData;
  const missingBenchmarks = Math.max(0, targetLevel.benchmarksRequired - targetLevel.benchmarksCompleted);
  const missingSessions = Math.max(0, targetLevel.trainingRequired - targetLevel.trainingSessions);

  const worstMetrics = useMemo(() =>
  [...scores].sort((a, b) => a.percentile_value - b.percentile_value).slice(0, 2),
  [scores]
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full px-4 py-3 flex items-center justify-between card-elevated rounded-xl hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Dados avançados</span>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 space-y-3 px-1">
          {/* Volume checklist (no bars) */}
          <div className="card-elevated rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Volume</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground/80">
              {targetLevel.benchmarksCompleted >= targetLevel.benchmarksRequired ?
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> :
              <X className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              <span>Benchmarks: {targetLevel.benchmarksCompleted}/{targetLevel.benchmarksRequired}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground/80">
              {targetLevel.trainingSessions >= targetLevel.trainingRequired ?
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> :
              <X className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              <span>Treinos: {targetLevel.trainingSessions}/{targetLevel.trainingRequired}</span>
            </div>
          </div>

          {/* Performance bottlenecks */}
          {worstMetrics.length > 0 &&
          <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/10">
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Gargalos</span>
              </div>
              <ul className="space-y-1.5">
                {worstMetrics.map((m, i) => {
                const stars = percentileToStars(m.percentile_value);
                return (
                  <li key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                      <ChevronRight className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="flex-1 font-semibold">{METRIC_LABELS[m.metric] || m.metric}</span>
                      <span className={`flex items-center gap-0.5 ${stars.colorClass}`}>
                        {Array.from({ length: 5 }).map((_, si) =>
                      <Star key={si} className="w-3 h-3" fill={si < stars.count ? 'currentColor' : 'none'} strokeWidth={si < stars.count ? 0 : 1.5} />
                      )}
                      </span>
                    </li>);

              })}
              </ul>
            </div>
          }

          {/* Volume */}
          {(missingBenchmarks > 0 || missingSessions > 0 || targetLevel.officialRaceRequired && !targetLevel.hasOfficialRace) &&
          <div className="bg-yellow-500/5 rounded-lg p-3 border border-yellow-500/10">
              <div className="flex items-center gap-1.5 mb-2">
                <Activity className="w-3.5 h-3.5 text-yellow-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-600">Volume</span>
              </div>
              <ul className="space-y-1.5">
                {missingBenchmarks > 0 &&
              <li className="flex items-start gap-2 text-xs text-foreground/80">
                    <ChevronRight className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
                    <span>{missingBenchmarks} benchmark{missingBenchmarks > 1 ? 's' : ''} restante{missingBenchmarks > 1 ? 's' : ''}</span>
                  </li>
              }
                {missingSessions > 0 &&
              <li className="flex items-start gap-2 text-xs text-foreground/80">
                    <ChevronRight className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
                    <span>{missingSessions} sessões de treino restantes</span>
                  </li>
              }
                {targetLevel.officialRaceRequired && !targetLevel.hasOfficialRace &&
              <li className="flex items-start gap-2 text-xs text-foreground/80">
                    <ChevronRight className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                    <span className="font-semibold text-destructive">Completar prova oficial HYROX</span>
                  </li>
              }
              </ul>
            </div>
          }

          {/* Limitador */}
          {mainLimiter &&
          <div className="card-elevated border-l-4 border-l-amber-500 bg-amber-500/5 rounded-lg p-3">
              <p className="text-xs font-semibold text-foreground mb-1">Principal limitador: {mainLimiter.name}</p>
              <p className="text-[11px] text-foreground/70">
                Abaixo de {mainLimiter.relativePerformance}% dos atletas da categoria.
              </p>
            </div>
          }
        </motion.div>
      </CollapsibleContent>
    </Collapsible>);

}

// ============================================
// TRAINING PRIORITIES BLOCK
// ============================================

const METRIC_INSIGHTS: Record<string, string[]> = {
  run_avg:   ['-1m45 vs Elite', '+2min média', 'Cardio crítico'],
  sled_push: ['-55s vs Elite', 'Força limitante', '+40s média'],
  sled_pull: ['-1m10 vs Elite', 'Perda por fadiga', '+52s média'],
  bbj:       ['+38s média', 'Técnica inconsistente', '-45s vs Elite'],
  ski:       ['-50s vs Elite', 'Potência baixa', '+35s média'],
  row:       ['+48s média', '-1m vs Elite', 'Anaeróbico crítico'],
  roxzone:   ['2 pausas', 'Core limitante', '+30s média'],
  farmers:   ['+42s média', 'Grip falha', '-55s vs Elite'],
  sandbag:   ['+52s média', '-1m05 vs Elite', 'Ritmo irregular'],
  wallballs: ['2 pausas', '+45s média', '-50s vs Elite'],
};

function StarRating({ count, colorClass }: { count: number; colorClass: string }) {
  return (
    <span className={`flex items-center gap-0.5 ${colorClass} shrink-0`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-3 h-3"
          fill={i < count ? 'currentColor' : 'none'}
          strokeWidth={i < count ? 0 : 1.5}
        />
      ))}
    </span>
  );
}

function TrainingPrioritiesBlock({
  scores,
  onViewAll,
}: {
  scores: CalculatedScore[];
  onViewAll?: () => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const worstStations = useMemo(() => {
    return [...scores]
      .sort((a, b) => a.percentile_value - b.percentile_value)
      .slice(0, showAll ? scores.length : 3)
      .map((s) => {
        const stars = percentileToStars(s.percentile_value);
        const insights = METRIC_INSIGHTS[s.metric] || ['-vs Elite'];
        const insight = insights[0];
        return {
          metric: s.metric,
          label: METRIC_LABELS[s.metric] || s.metric,
          stars,
          insight,
          percentile: s.percentile_value,
        };
      });
  }, [scores, showAll]);

  const totalBad = useMemo(
    () => scores.filter((s) => s.percentile_value < 50).length,
    [scores]
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

        {/* List */}
        <ul className="space-y-2">
          {worstStations.map((station, i) => (
            <li
              key={station.metric}
              className="flex items-center gap-2.5 text-xs"
            >
              {/* Rank number */}
              <span className="w-4 text-[10px] font-bold text-muted-foreground tabular-nums shrink-0">
                {i + 1}.
              </span>

              {/* Station name */}
              <span className="flex-1 font-semibold text-foreground/90 truncate">
                {station.label}
              </span>

              {/* Stars */}
              <StarRating count={station.stars.count} colorClass={station.stars.colorClass} />

              {/* Insight */}
              <span className="text-[10px] text-muted-foreground/80 shrink-0 min-w-[70px] text-right tabular-nums">
                {station.insight}
              </span>
            </li>
          ))}
        </ul>

        {/* Footer: Ver todas */}
        {totalBad > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors mt-3 pt-2.5 border-t border-border/20 text-center"
          >
            {showAll ? 'Mostrar menos ▴' : `Ver todas (${totalBad}) ▾`}
          </button>
        )}
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
}: DiagnosticRadarBlockProps) {
  const { profile } = useAuth();
  const { status, outlierScore, validatingCompetition } = useAthleteStatus();
  const { athleteConfig } = useOutlierStore();
  const journeyData = useJourneyProgress();
  const isMobile = useIsMobile();
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
    const previousTime = previousCompetition?.time_in_seconds ?? null;
    const targetSec = eliteTarget?.targetSeconds ?? null;
    const targetLabel = eliteTarget?.targetLabel ?? 'ELITE';

    let metaValue = '—';
    let metaClass = 'text-foreground';
    if (currentTime && targetSec) {
      const delta = currentTime - targetSec;
      if (delta <= 0) {
        metaValue = `${formatOfficialTime(targetSec)} ✔`;
        metaClass = 'text-emerald-400';
      } else {
        metaValue = formatOfficialTime(targetSec);
        metaClass = 'text-amber-400';
      }
    }

    let gainValue = '—';
    let gainClass = 'text-muted-foreground';
    if (currentTime && targetSec) {
      const gainSeconds = Math.max(currentTime - targetSec, 0);
      if (gainSeconds <= 0) {
        gainValue = 'Meta atingida';
        gainClass = 'text-emerald-400';
      } else {
        gainValue = `↓ ${formatDeltaTime(gainSeconds)}`;
        gainClass = 'text-primary';
      }
    }

    let evolutionValue = '—';
    let evolutionClass = 'text-muted-foreground';
    if (currentTime && previousTime) {
      const diff = currentTime - previousTime;
      if (diff === 0) {
        evolutionValue = '0s';
      } else {
        evolutionValue = diff < 0 ? `↓ ${formatDeltaTime(diff)}` : `↑ ${formatDeltaTime(diff)}`;
        evolutionClass = diff < 0 ? 'text-emerald-400' : 'text-amber-400';
      }
    }

    return {
      currentTime,
      targetLabel,
      metaValue,
      metaClass,
      gainValue,
      gainClass,
      evolutionValue,
      evolutionClass,
    };
  }, [
    validatingCompetition?.time_in_seconds,
    previousCompetition?.time_in_seconds,
    eliteTarget?.targetSeconds,
    eliteTarget?.targetLabel,
  ]);

  // Evolution projection — compact strip based on diagnostic gaps (weak stations)
  const evolutionProjection = useMemo(() => {
    const currentTime = validatingCompetition?.time_in_seconds;
    if (!currentTime || scores.length === 0) return null;
    const totalGap = calculateProjectedGain(scores);
    if (totalGap <= 0) return null;
    return calculateEvolutionTimeframe(currentTime, totalGap);
  }, [validatingCompetition?.time_in_seconds, scores]);

  // Advanced mode (mobile only, persisted)
  const [advancedMode, setAdvancedMode] = useState(() => {
    try {return localStorage.getItem('outlier-advanced-mode') === 'true';} catch {return false;}
  });

  useEffect(() => {
    try {localStorage.setItem('outlier-advanced-mode', String(advancedMode));} catch {}
  }, [advancedMode]);

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
    const runScore = scores.find((s) => s.metric === 'run_avg');
    if (!runScore) return null;
    const base = 45;
    const delta = (runScore.percentile_value - 50) * 0.3;
    return Math.round(base + delta);
  }, [scores]);

  const lactateThresholdEstimate = useMemo(() => {
    const runScore = scores.find((s) => s.metric === 'run_avg');
    if (!runScore) return null;
    const baseSeconds = 330;
    const delta = (runScore.percentile_value - 50) * 2;
    const totalSeconds = Math.max(baseSeconds - delta, 180);
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.round(totalSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [scores]);

  const trainingFocus = useMemo(() => {
    if (!mainLimiter) return 'Foco em desenvolver todas as capacidades de forma equilibrada.';
    return `O foco do próximo ciclo será ${mainLimiter.name.toLowerCase()}, visando maior consistência nas estações onde hoje ocorre a maior perda de rendimento.`;
  }, [mainLimiter]);

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

  // ============================================
  // MOBILE SIMPLIFIED VIEW
  // ============================================
  if (isMobile && !advancedMode) {
    return (
      <div className="space-y-3">
        {/* Bloco 1: Caminho para Elite */}
        <MobilePathToEliteCard
          athleteName={athleteName}
          journeyData={journeyData}
          scores={scores}
          todayWorkoutLabel={todayWorkoutLabel}
          hasTodayWorkout={hasTodayWorkout}
          onStartWorkout={onStartWorkout}
          currentTimeSec={validatingCompetition?.time_in_seconds}
          targetTimeSec={eliteTarget?.targetSeconds}
          targetLabel={eliteTarget?.targetLabel}
          provaAlvo={provaAlvo}
          provaAlvoTargetTime={provaAlvoTargetTime} />


        {/* CTA importar prova quando ainda não há prova oficial válida */}
        {!performanceSnapshot.currentTime && (
          <ImportProvaInlineCTA />
        )}

        {/* Barra de métricas da prova mais recente */}
        {performanceSnapshot.currentTime && (
          <div className="mx-3 mb-3 mt-1 grid grid-cols-2 gap-1.5 p-2.5 bg-muted/5 border border-border/15 rounded-xl sm:grid-cols-4">
            {/* Tempo da prova */}
            <div className="flex flex-col items-center text-center gap-0.5">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase tracking-wider">
                <Timer className="w-3 h-3" />
                <span>Tempo prova</span>
              </div>
              <span className="font-bold text-xs text-foreground">{formatOfficialTime(performanceSnapshot.currentTime)}</span>
            </div>

            {/* Meta */}
            <div className="flex flex-col items-center text-center gap-0.5 border-l border-border/10">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase tracking-wider">
                <Target className="w-3 h-3" />
                <span>Requisito {performanceSnapshot.targetLabel}</span>
              </div>
              <span className={cn('font-bold text-xs', performanceSnapshot.metaClass)}>{performanceSnapshot.metaValue}</span>
            </div>

            {/* Ganho potencial */}
            <div className="flex flex-col items-center text-center gap-0.5 border-l border-border/10">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase tracking-wider">
                <Zap className="w-3 h-3" />
                <span>Ganho</span>
              </div>
              <span className={cn('font-bold text-xs', performanceSnapshot.gainClass)}>{performanceSnapshot.gainValue}</span>
            </div>

            {/* Evolução */}
            <div className="flex flex-col items-center text-center gap-0.5 border-l border-border/10">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase tracking-wider">
                <TrendingUp className="w-3 h-3" />
                <span>Evolução</span>
              </div>
              <span className={cn('font-bold text-xs', performanceSnapshot.evolutionClass)}>{performanceSnapshot.evolutionValue}</span>
            </div>
          </div>
        )}

        {/* Projeção de Evolução — card completo (mobile) */}
        {evolutionProjection && performanceSnapshot.currentTime && (
          <div className="mx-3 mb-2 border border-primary/20 bg-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wide">Projeção de Evolução</h3>
              </div>
              <span className="text-[10px] uppercase tracking-wider border border-border/30 px-2 py-0.5 rounded-full text-muted-foreground/60">{evolutionProjection.tierLabel}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              🎯 A ciência do esporte projeta que a eliminação deste gap de{' '}
              <strong className="text-foreground">{evolutionProjection.gapFormatted}</strong> exigirá um ciclo de
              treinamento contínuo de aproximadamente{' '}
              <strong className="text-primary">{evolutionProjection.months} {evolutionProjection.months === 1 ? 'mês' : 'meses'}</strong>.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Ganho mensal: {evolutionProjection.ratePerMonth}s/mês
                </span>
                <span>~{evolutionProjection.months} {evolutionProjection.months === 1 ? 'mês' : 'meses'} para meta</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((1 / evolutionProjection.months) * 100, 100)}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Cada mês representa ~{Math.round(Math.min((1 / evolutionProjection.months) * 100, 100))}% do gap total
              </p>
            </div>
          </div>
        )}

        {/* Blocos sempre visíveis — mostram empty state quando sem dados */}
        <TrainingPrioritiesBlock scores={scores} onViewAll={onStartWorkout} />
        <MobileBottlenecksBlock scores={scores} />
        <MobileNextStepBlock scores={scores} journeyData={journeyData} />
        <MobilePhysiologicalModal
          scores={scores}
          radarData={radarData}
          vo2maxEstimate={vo2maxEstimate}
          lactateThresholdEstimate={lactateThresholdEstimate} />

        {/* Dados avançados (toggle) */}
        <div className="flex items-center justify-end gap-2 px-1">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Avançado</span>
          <Switch
            checked={advancedMode}
            onCheckedChange={setAdvancedMode}
            className="scale-75" />
        </div>
      </div>);

  }

  // ============================================
  // DESKTOP / ADVANCED MODE — FULL LAYOUT (unchanged)
  // ============================================
  return (
    <div className="space-y-3">
      
      {/* Mobile advanced mode toggle (shown at top when in advanced mode) */}
      {isMobile && advancedMode &&
      <div className="flex items-center justify-end gap-2 px-1">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Modo avançado</span>
          <Switch checked={advancedMode} onCheckedChange={setAdvancedMode} className="scale-75" />
        </div>
      }

      {/* BLOCO 1: HEADER — IDENTIDADE + DADOS COMPETITIVOS */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-4 pb-2">
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-wide text-foreground uppercase mb-2">{athleteName}</h1>
        <div className="flex items-center justify-center gap-2.5 mb-1">
          <StatusCrownPreset status={status} size="lg" colorClass="text-amber-400" />
          <span className="font-bold text-amber-400 tracking-wider text-2xl">{athleteCategory}</span>
        </div>

        {/* Prova Alvo inline — desktop */}
        {provaAlvo && (
          <div className="flex items-center justify-center gap-2 text-sm mb-3">
            <Target className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground">{deduplicateRaceName(provaAlvo.nome)}</span>
            <span className="text-border/40">·</span>
            <span className="font-semibold text-foreground">{provaAlvo.daysUntil} dias</span>
            {provaAlvoTargetTime && (
              <>
                <span className="text-border/40">·</span>
                <span className="text-muted-foreground">Meta</span>
                <span className="font-bold text-primary">{provaAlvoTargetTime}</span>
              </>
            )}
          </div>
        )}
        {!provaAlvo && <div className="mb-3" />}

        {/* Barra de métricas — grid com tempo/meta/ganho/evolução */}
        {!performanceSnapshot.currentTime ? (
          <ImportProvaInlineCTA />
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 p-3 bg-muted/5 border border-border/15 rounded-xl sm:grid-cols-4">
            <div className="flex flex-col items-center text-center gap-0.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                <Timer className="w-3.5 h-3.5" />
                <span>Tempo prova</span>
              </div>
              <span className="font-bold text-sm text-foreground">{formatOfficialTime(performanceSnapshot.currentTime)}</span>
            </div>

            <div className="flex flex-col items-center text-center gap-0.5 border-l border-border/10">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                <Target className="w-3.5 h-3.5" />
                <span>Requisito {performanceSnapshot.targetLabel}</span>
              </div>
              <span className={cn('font-bold text-sm', performanceSnapshot.metaClass)}>{performanceSnapshot.metaValue}</span>
            </div>

            <div className="flex flex-col items-center text-center gap-0.5 border-l border-border/10">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                <span>Ganho</span>
              </div>
              <span className={cn('font-bold text-sm', performanceSnapshot.gainClass)}>{performanceSnapshot.gainValue}</span>
            </div>

            <div className="flex flex-col items-center text-center gap-0.5 border-l border-border/10">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Evolução</span>
              </div>
              <span className={cn('font-bold text-sm', performanceSnapshot.evolutionClass)}>{performanceSnapshot.evolutionValue}</span>
            </div>
          </div>
        )}
      </motion.div>

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
            🎯 A ciência do esporte projeta que a eliminação deste gap de{' '}
            <strong className="text-foreground">{evolutionProjection.gapFormatted}</strong> exigirá um ciclo de
            treinamento contínuo de aproximadamente{' '}
            <strong className="text-primary">{evolutionProjection.months} {evolutionProjection.months === 1 ? 'mês' : 'meses'}</strong>.
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Ganho mensal: {evolutionProjection.ratePerMonth}s/mês
              </span>
              <span>~{evolutionProjection.months} {evolutionProjection.months === 1 ? 'mês' : 'meses'} para meta</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((evolutionProjection.ratePerMonth / (evolutionProjection.months * evolutionProjection.ratePerMonth)) * 100, 100)}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Cada mês representa ~{Math.round(Math.min((evolutionProjection.ratePerMonth / (evolutionProjection.months * evolutionProjection.ratePerMonth)) * 100, 100))}% do gap total
            </p>
          </div>
        </div>
      )}

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

      {/* Blocos sempre visíveis — mostram empty state quando sem dados */}
      {/* BLOCO PRIORIDADES DE TREINO */}
      <TrainingPrioritiesBlock scores={scores} onViewAll={onStartWorkout} />

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
                      <DiagnosticStationsBars scores={scores} />
                    </motion.div>
                  }
                </AnimatePresence>
              </motion.div>
            </CollapsibleContent>
          )}
        </Collapsible>
      </motion.div>
      </TooltipProvider>

      {/* BLOCO ANÁLISE ÚLTIMA PROVA */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card-elevated overflow-hidden">
        <Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Análise última prova</span>
              </div>
              {isAnalysisOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {hasData ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-2 pb-3 space-y-3">
                <div className="rounded-lg bg-red-950/80 border border-red-800/30 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-2">Limitador</p>
                  <p className="text-base font-bold text-foreground">{mainLimiter?.name || 'Análise não disponível'}</p>
                  {mainLimiter ?
                  <p className="text-xs text-foreground/70 mt-1">
                    {loadingInsights ? (
                      <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Analisando...</span>
                    ) : coachInsights?.limitador_descricao || `Abaixo de ${mainLimiter.relativePerformance}% da categoria`}
                  </p> :
                  <p className="text-xs text-foreground/70 mt-1">Registre uma prova para ver seu limitador.</p>
                  }
                </div>
                <div className="rounded-lg bg-emerald-950/80 border border-emerald-800/30 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2">Ganho Potencial</p>
                  {mainLimiter ?
                  <>
                      <p className="text-sm text-foreground">
                        {coachInsights?.ganho_acao || `Corrigindo ${mainLimiter.name} →`}
                      </p>
                      <p className="text-xs text-foreground/70 mt-1">
                        {coachInsights?.ganho_descricao || 'Zona competitiva superior da categoria'}
                      </p>
                    </> :
                  <p className="text-xs text-foreground/70">Ganhos estimados disponíveis após 2 provas.</p>
                  }
                </div>
                <div className="rounded-lg bg-amber-950/80 border border-amber-800/30 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">Próximo Passo</p>
                  <ul className="space-y-1 mb-4">
                    {(coachInsights?.proximos_passos || topStations.map(s => s.name)).map((step, index) =>
                    <li key={index} className="text-sm text-foreground">• {step}</li>
                    )}
                  </ul>
                </div>
                <button
                  onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2 text-center">
                  {showDetailedAnalysis ? 'Ocultar detalhes ▾' : 'Ver análise detalhada ▸'}
                </button>
                {showDetailedAnalysis &&
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 text-sm text-foreground/90 leading-relaxed">
                    <div className="border-l-2 border-red-800/50 pl-3 space-y-2">
                      <p className="font-semibold text-red-400 text-xs uppercase">Limitador — Análise completa</p>
                      <p>{coachInsights?.limitador_descricao || `${mainLimiter?.name} foi identificado como o principal fator limitante da sua performance atual, onde a exigência de sustentação de força sob fadiga é determinante.`}</p>
                      <p>Nessa variável específica, você performou abaixo de <span className="font-semibold text-destructive">{mainLimiter?.relativePerformance || 0}%</span> dos atletas da sua categoria, o que compromete drasticamente seus resultados.</p>
                    </div>
                    <div className="border-l-2 border-emerald-800/50 pl-3 space-y-2">
                      <p className="font-semibold text-emerald-400 text-xs uppercase">Projeção</p>
                      <p>{coachInsights?.ganho_descricao || `Ao corrigir este limitador, sua performance tende a se deslocar para a zona competitiva superior da categoria ${athleteCategory}.`}</p>
                    </div>
                    <div className="border-l-2 border-amber-800/50 pl-3 space-y-2">
                      <p className="font-semibold text-amber-400 text-xs uppercase">Impacto na prova</p>
                      <div className="flex flex-wrap gap-2">
                        {affectedStations.map((station, index) =>
                      <span key={index} className="text-xs px-2 py-1 rounded bg-background/50 border border-border/20">{station.name}</span>
                      )}
                      </div>
                      <p className="text-xs text-muted-foreground">Sob fadiga acumulada, essas estações tendem a sofrer queda acelerada de eficiência.</p>
                    </div>
                  </motion.div>
                }
              </motion.div>
            ) : (
              <div className="px-4 pb-4">
                <p className="text-xs text-muted-foreground text-center py-4">Aguardando registro de resultados</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </motion.div>

      {/* BLOCO 8: DIRECIONAMENTO DO TREINO */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-primary/5 border-l-4 border-l-primary rounded-lg px-4 py-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Direcionamento</p>
        <p className="text-xs text-foreground/90 leading-relaxed">{hasData ? trainingFocus : 'Lance seu primeiro simulado para receber direcionamento personalizado de treino.'}</p>
      </motion.div>

      {/* BLOCO 9: CTA FINAL */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="pt-1">
        <Button
          size="lg"
          onClick={onStartWorkout}
          className="w-full font-display text-lg tracking-wider px-6 py-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg">

          <Flame className="w-5 h-5" />
          BORA TREINAR
          <ChevronRight className="w-5 h-5" />
        </Button>
        <p className="text-muted-foreground/60 text-xs text-center mt-2">Veja seu treino do dia</p>
      </motion.div>
    </div>);

}