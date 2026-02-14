/**
 * DiagnosticRadarBlock - Perfil de Performance do Atleta OUTLIER
 * 
 * MOBILE-FIRST: Card de Decisão compacto no mobile, layout completo no desktop.
 * Toggle "Modo Avançado" para mobile (persistido em localStorage).
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { Activity, ChevronDown, ChevronUp, Info, Target, Crown, TrendingUp, Flame, ChevronRight, Star, Trophy, Lock, BarChart3, Check, X, Calendar } from 'lucide-react';
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
  wallballs: 'Wall Balls',
};

const STATUS_LABELS: Record<string, string> = {
  iniciante: 'INICIANTE',
  intermediario: 'INTERMEDIÁRIO',
  avancado: 'AVANÇADO',
  hyrox_open: 'HYROX OPEN',
  hyrox_pro: 'HYROX PRO',
  elite: 'ELITE',
};

const STATUS_SUMMARY: Record<string, string> = {
  iniciante: 'Você está construindo as bases para competir. Continue evoluindo.',
  intermediario: 'Você compete em um nível consistente dentro da sua categoria.',
  avancado: 'Seu nível de performance te coloca entre os atletas mais preparados.',
  hyrox_open: 'Você compete no nível OPEN com resultados validados em prova.',
  hyrox_pro: 'Você compete no nível PRO com resultados validados em prova.',
  elite: 'Você está entre os atletas de elite da modalidade.',
};

const RADAR_AXES = [
  { key: 'run_avg', name: 'Resistência Cardiovascular', shortName: 'Cardio' },
  { key: 'sled_push', name: 'Força & Resistência Muscular', shortName: 'Força' },
  { key: 'ski', name: 'Potência & Vigor', shortName: 'Potência' },
  { key: 'row', name: 'Capacidade Anaeróbica', shortName: 'Anaeróbica' },
  { key: 'roxzone', name: 'Core & Estabilidade', shortName: 'Core' },
  { key: 'wallballs', name: 'Coordenação sob Fadiga', shortName: 'Eficiência' },
];

// ============================================
// COMPONENT PROPS
// ============================================

interface DiagnosticRadarBlockProps {
  scores: CalculatedScore[];
  loading?: boolean;
  hasData: boolean;
  todayWorkoutLabel?: string;
  hasTodayWorkout?: boolean;
  onStartWorkout?: () => void;
}

// ============================================
// ANIMATED COUNTER COMPONENT
// ============================================

function AnimatedCounter({ target, duration = 1000 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
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
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);

  return <>{value}</>;
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
function MobilePathToEliteCard({
  athleteName,
  journeyData,
  scores,
  todayWorkoutLabel,
  hasTodayWorkout,
  onStartWorkout,
}: {
  athleteName: string;
  journeyData: ReturnType<typeof useJourneyProgress>;
  scores: CalculatedScore[];
  todayWorkoutLabel?: string;
  hasTodayWorkout?: boolean;
  onStartWorkout?: () => void;
}) {
  const { currentLevelLabel, targetLevelLabel, progressToTarget, isAtTop, isCapped } = journeyData;

  const xpForNext = Math.max(0, 100 - progressToTarget);

  const worstMetrics = useMemo(() => 
    [...scores].sort((a, b) => a.percentile_value - b.percentile_value).slice(0, 2),
    [scores]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-orange-800/30 bg-gradient-to-r from-orange-950/90 to-amber-950/80"
    >
      <div className="px-4 py-5">
        {/* Header: Name + Level */}
        <div className="mb-4">
          <h1 className="font-display text-xl font-bold tracking-wide text-foreground uppercase">
            {athleteName}
          </h1>
          {isAtTop ? (
            <p className="text-xs text-emerald-400 font-semibold mt-0.5">Nível máximo alcançado 🏆</p>
          ) : (
            <p className="text-xs text-amber-400 font-semibold mt-0.5">
              {currentLevelLabel} → {targetLevelLabel} — Faltam {xpForNext} XP
            </p>
          )}
        </div>

        {/* Progress Bar (thick) */}
        {!isAtTop && progressToTarget > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70">{currentLevelLabel}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70">{targetLevelLabel}</span>
            </div>
            <div className="relative h-6 w-full rounded-full bg-black/40 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressToTarget}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-sm">
                {progressToTarget}%
              </span>
            </div>
            {isCapped && (
              <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Travado em {journeyData.capPercent}% sem prova oficial
              </p>
            )}
          </div>
        )}

        {!isAtTop && progressToTarget === 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-muted-foreground italic">Progresso disponível após 1 prova + 1 benchmark</p>
          </div>
        )}

        {/* Top 2 Bottlenecks */}
        {worstMetrics.length > 0 && !isAtTop && (
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70 mb-2">
              Faltam:
            </p>
            <ul className="space-y-1.5">
              {worstMetrics.map((m, i) => {
                const stars = percentileToStars(m.percentile_value);
                return (
                  <li key={i} className="flex items-center gap-2 text-xs text-foreground/90">
                    <ChevronRight className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="flex-1 font-semibold">{METRIC_LABELS[m.metric] || m.metric}</span>
                    <span className={`flex items-center gap-0.5 ${stars.colorClass}`}>
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star key={si} className="w-2.5 h-2.5" fill={si < stars.count ? 'currentColor' : 'none'} strokeWidth={si < stars.count ? 0 : 1.5} />
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Today's Workout */}
        {hasTodayWorkout && todayWorkoutLabel && (
          <div className="flex items-center gap-2 mb-4 text-xs text-foreground/80">
            <Flame className="w-4 h-4 text-orange-400 shrink-0" />
            <span>Treino de hoje: <span className="font-semibold text-foreground">{todayWorkoutLabel}</span></span>
          </div>
        )}

        {/* CTA Button */}
        <Button
          size="lg"
          onClick={onStartWorkout}
          className="w-full font-display text-lg tracking-wider rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all flex items-center justify-center gap-2 shadow-lg h-14"
        >
          <Flame className="w-6 h-6" />
          BORA TREINAR
          <ChevronRight className="w-5 h-5" />
        </Button>
        <p className="text-muted-foreground/60 text-[10px] text-center mt-1.5">Veja seu treino do dia</p>
      </div>
    </motion.div>
  );
}

// ============================================
// MOBILE BLOCK 2 — STATUS DO ATLETA
// ============================================
function MobileStatusBlock({
  outlierScore,
  validatingCompetition,
}: {
  outlierScore: { score: number; isProvisional: boolean };
  validatingCompetition: { time_in_seconds: number; open_equivalent_seconds: number; event_date?: string | null; event_name?: string | null } | null;
}) {
  const rank = Math.max(1, Math.round(100 - outlierScore.score));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="card-elevated rounded-xl px-4 py-3"
    >
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Top</span>
          <span className="font-bold text-foreground">{rank}% da categoria</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Última prova</span>
          <span className="font-semibold text-foreground">
            {validatingCompetition?.time_in_seconds 
              ? formatOfficialTime(validatingCompetition.time_in_seconds) 
              : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Evolução</span>
          <span className="text-muted-foreground">---</span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// MOBILE BLOCK 3 — GARGALOS DE PERFORMANCE
// ============================================
function MobileBottlenecksBlock({
  scores,
}: {
  scores: CalculatedScore[];
}) {
  const [showAll, setShowAll] = useState(false);
  
  const bottlenecks = useMemo(() => 
    [...scores]
      .filter(s => s.percentile_value < 50)
      .sort((a, b) => a.percentile_value - b.percentile_value),
    [scores]
  );

  if (bottlenecks.length === 0) return null;

  const visibleBottlenecks = showAll ? bottlenecks : bottlenecks.slice(0, 3);
  const hasMore = bottlenecks.length > 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="card-elevated rounded-xl px-4 py-3"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Target className="w-3.5 h-3.5 text-red-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Gargalos de performance</span>
      </div>
      <ul className="space-y-1.5">
        {visibleBottlenecks.map((m, i) => {
          const stars = percentileToStars(m.percentile_value);
          return (
            <li key={i} className="flex items-center gap-2 text-xs text-foreground/80">
              <span className="flex-1 font-semibold">{METRIC_LABELS[m.metric] || m.metric}</span>
              <span className={`flex items-center gap-0.5 ${stars.colorClass}`}>
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star key={si} className="w-2.5 h-2.5" fill={si < stars.count ? 'currentColor' : 'none'} strokeWidth={si < stars.count ? 0 : 1.5} />
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 pt-2 border-t border-border/20 text-center"
        >
          {showAll ? 'Mostrar menos ▴' : `Ver todos (${bottlenecks.length}) ▾`}
        </button>
      )}
    </motion.div>
  );
}

// ============================================
// MOBILE BLOCK 4 — PRÓXIMO PASSO
// ============================================
function MobileNextStepBlock({
  scores,
  journeyData,
}: {
  scores: CalculatedScore[];
  journeyData: ReturnType<typeof useJourneyProgress>;
}) {
  const { targetLevel } = journeyData;

  const nextBenchmark = useMemo(() => {
    if (!scores.length) return null;
    const sorted = [...scores].sort((a, b) => a.percentile_value - b.percentile_value);
    return METRIC_LABELS[sorted[0].metric] || sorted[0].metric;
  }, [scores]);

  const needsOfficialRace = targetLevel.officialRaceRequired && !targetLevel.hasOfficialRace;

  if (!nextBenchmark && !needsOfficialRace) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="card-elevated rounded-xl px-4 py-3"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <TrendingUp className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Próximo passo</span>
      </div>
      <div className="space-y-1.5 text-xs text-foreground/80">
        {nextBenchmark && (
          <p>Próximo benchmark sugerido: <span className="font-semibold text-foreground">{nextBenchmark}</span></p>
        )}
        {needsOfficialRace && (
          <p className="text-destructive font-semibold flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            Completar prova oficial HYROX
          </p>
        )}
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
    </motion.div>
  );
}

// ============================================
// MOBILE COLLAPSIBLE SECTIONS
// ============================================

function MobilePhysiologicalModal({
  scores,
  radarData,
  vo2maxEstimate,
  lactateThresholdEstimate,
}: {
  scores: CalculatedScore[];
  radarData: { name: string; shortName: string; value: number; fullMark: number }[];
  vo2maxEstimate: number | null;
  lactateThresholdEstimate: string | null;
}) {
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
                <Radar name="Perfil" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="hsl(var(--primary))" fillOpacity={0.4} dot={false} />
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
    </Dialog>
  );
}

function MobileAdvancedDataSection({
  journeyData,
  scores,
  mainLimiter,
  affectedStations,
  athleteCategory,
}: {
  journeyData: ReturnType<typeof useJourneyProgress>;
  scores: CalculatedScore[];
  mainLimiter: { metric: string; name: string; percentile: number; relativePerformance: number } | null;
  affectedStations: { name: string; percentile: number; impactLevel: string }[];
  athleteCategory: string;
}) {
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
              {targetLevel.benchmarksCompleted >= targetLevel.benchmarksRequired
                ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                : <X className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              <span>Benchmarks: {targetLevel.benchmarksCompleted}/{targetLevel.benchmarksRequired}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground/80">
              {targetLevel.trainingSessions >= targetLevel.trainingRequired
                ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                : <X className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              <span>Treinos: {targetLevel.trainingSessions}/{targetLevel.trainingRequired}</span>
            </div>
          </div>

          {/* Performance bottlenecks */}
          {worstMetrics.length > 0 && (
            <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/10">
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Gargalos</span>
              </div>
              <ul className="space-y-1.5">
                {worstMetrics.map((m, i) => {
                  const stars = percentileToStars(m.percentile_value);
                  return (
                    <li key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                      <ChevronRight className="w-3 h-3 text-red-500 shrink-0" />
                      <span className="flex-1 font-semibold">{METRIC_LABELS[m.metric] || m.metric}</span>
                      <span className={`flex items-center gap-0.5 ${stars.colorClass}`}>
                        {Array.from({ length: 5 }).map((_, si) => (
                          <Star key={si} className="w-3 h-3" fill={si < stars.count ? 'currentColor' : 'none'} strokeWidth={si < stars.count ? 0 : 1.5} />
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Volume */}
          {(missingBenchmarks > 0 || missingSessions > 0 || (targetLevel.officialRaceRequired && !targetLevel.hasOfficialRace)) && (
            <div className="bg-yellow-500/5 rounded-lg p-3 border border-yellow-500/10">
              <div className="flex items-center gap-1.5 mb-2">
                <Activity className="w-3.5 h-3.5 text-yellow-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-600">Volume</span>
              </div>
              <ul className="space-y-1.5">
                {missingBenchmarks > 0 && (
                  <li className="flex items-start gap-2 text-xs text-foreground/80">
                    <ChevronRight className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
                    <span>{missingBenchmarks} benchmark{missingBenchmarks > 1 ? 's' : ''} restante{missingBenchmarks > 1 ? 's' : ''}</span>
                  </li>
                )}
                {missingSessions > 0 && (
                  <li className="flex items-start gap-2 text-xs text-foreground/80">
                    <ChevronRight className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
                    <span>{missingSessions} sessões de treino restantes</span>
                  </li>
                )}
                {targetLevel.officialRaceRequired && !targetLevel.hasOfficialRace && (
                  <li className="flex items-start gap-2 text-xs text-foreground/80">
                    <ChevronRight className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                    <span className="font-semibold text-destructive">Completar prova oficial HYROX</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Limitador */}
          {mainLimiter && (
            <div className="card-elevated border-l-4 border-l-destructive bg-destructive/5 rounded-lg p-3">
              <p className="text-xs font-semibold text-foreground mb-1">Principal limitador: {mainLimiter.name}</p>
              <p className="text-[11px] text-foreground/70">
                Abaixo de {mainLimiter.relativePerformance}% dos atletas da categoria.
              </p>
            </div>
          )}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
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
}: DiagnosticRadarBlockProps) {
  const { profile } = useAuth();
  const { status, outlierScore, validatingCompetition } = useAthleteStatus();
  const { athleteConfig } = useOutlierStore();
  const journeyData = useJourneyProgress();
  const isMobile = useIsMobile();
  
  // Advanced mode (mobile only, persisted)
  const [advancedMode, setAdvancedMode] = useState(() => {
    try { return localStorage.getItem('outlier-advanced-mode') === 'true'; } catch { return false; }
  });
  
  useEffect(() => {
    try { localStorage.setItem('outlier-advanced-mode', String(advancedMode)); } catch {}
  }, [advancedMode]);

  const hasData = hasDataProp && scores.length > 0;
  
  // Collapsible states (desktop)
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [isRadarOpen, setIsRadarOpen] = useState(true);
  const [showStationDetails, setShowStationDetails] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  // Derived data
  const athleteName = profile?.name?.toUpperCase() || 'ATLETA';
  const athleteCategory = useMemo(() => {
    const gender = athleteConfig?.sexo === 'feminino' ? 'WOMEN' : 'MEN';
    const level = status === 'hyrox_pro' ? 'PRO' : 'OPEN';
    return `HYROX ${level} ${gender}`;
  }, [athleteConfig?.sexo, status]);
  
  const statusLabel = STATUS_LABELS[status] || 'INTERMEDIÁRIO';
  const statusSummary = STATUS_SUMMARY[status] || STATUS_SUMMARY.intermediario;
  
  const mainLimiter = useMemo(() => {
    if (!scores.length) return null;
    const sorted = [...scores].sort((a, b) => a.percentile_value - b.percentile_value);
    const weakest = sorted[0];
    return {
      metric: weakest.metric,
      name: METRIC_LABELS[weakest.metric] || weakest.metric,
      percentile: weakest.percentile_value,
      relativePerformance: 100 - weakest.percentile_value,
    };
  }, [scores]);
  
  const affectedStations = useMemo(() => {
    return scores
      .filter(s => s.percentile_value < 50)
      .sort((a, b) => a.percentile_value - b.percentile_value)
      .slice(0, 5)
      .map(s => ({
        name: METRIC_LABELS[s.metric] || s.metric,
        percentile: s.percentile_value,
        impactLevel: s.percentile_value < 25 ? 'Alto' : 'Moderado',
      }));
  }, [scores]);
  
  const topStations = affectedStations.slice(0, 2);
  const hasMoreStations = affectedStations.length > 2;
  
  const radarData = useMemo(() => {
    return RADAR_AXES.map(axis => {
      const score = scores.find(s => s.metric === axis.key);
      return { name: axis.name, shortName: axis.shortName, value: score?.percentile_value || 50, fullMark: 100 };
    });
  }, [scores]);
  
  const vo2maxEstimate = useMemo(() => {
    const runScore = scores.find(s => s.metric === 'run_avg');
    if (!runScore) return null;
    const base = 45;
    const delta = (runScore.percentile_value - 50) * 0.3;
    return Math.round(base + delta);
  }, [scores]);
  
  const lactateThresholdEstimate = useMemo(() => {
    const runScore = scores.find(s => s.metric === 'run_avg');
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
      </motion.div>
    );
  }

  // Empty state
  if (!hasData) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-6 border-l-4 border-l-muted-foreground/30">
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">PERFIL DE PERFORMANCE</h3>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Activity className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm text-center max-w-xs">
            Lance seu primeiro simulado ou prova oficial para ver seu perfil de performance completo.
          </p>
        </div>
      </motion.div>
    );
  }

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
        />

        {/* Bloco 2: Status do Atleta */}
        <MobileStatusBlock
          outlierScore={outlierScore}
          validatingCompetition={validatingCompetition}
        />

        {/* Bloco 3: Gargalos */}
        <MobileBottlenecksBlock scores={scores} />

        {/* Bloco 4: Próximo Passo */}
        <MobileNextStepBlock scores={scores} journeyData={journeyData} />

        {/* Bloco 5: Perfil Fisiológico (colapsado) */}
        <MobilePhysiologicalModal
          scores={scores}
          radarData={radarData}
          vo2maxEstimate={vo2maxEstimate}
          lactateThresholdEstimate={lactateThresholdEstimate}
        />

        {/* Dados avançados (toggle) */}
        <div className="flex items-center justify-end gap-2 px-1">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Avançado</span>
          <Switch
            checked={advancedMode}
            onCheckedChange={setAdvancedMode}
            className="scale-75"
          />
        </div>
      </div>
    );
  }

  // ============================================
  // DESKTOP / ADVANCED MODE — FULL LAYOUT (unchanged)
  // ============================================
  return (
    <div className="space-y-3">
      
      {/* Mobile advanced mode toggle (shown at top when in advanced mode) */}
      {isMobile && advancedMode && (
        <div className="flex items-center justify-end gap-2 px-1">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Modo avançado</span>
          <Switch checked={advancedMode} onCheckedChange={setAdvancedMode} className="scale-75" />
        </div>
      )}

      {/* BLOCO 1: HEADER — IDENTIDADE + DADOS COMPETITIVOS */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-3">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-foreground uppercase mb-1">{athleteName}</h1>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-amber-400 tracking-wider">{athleteCategory}</span>
        </div>
        {validatingCompetition?.time_in_seconds ? (
          <div className="flex items-center justify-center gap-3 text-xs text-foreground/70">
            <span>Última prova: <span className="font-semibold text-foreground">{formatOfficialTime(validatingCompetition.time_in_seconds)}</span></span>
            <span className="text-muted-foreground/30">|</span>
            <span>Top <span className="font-semibold text-foreground">{Math.round(100 - outlierScore.score * 10)}%</span></span>
            <span className="text-muted-foreground/30">|</span>
            <span>Evolução: <span className="text-muted-foreground">---</span></span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/50">Sem prova oficial registrada</p>
        )}
      </motion.div>

      {/* BLOCO 2.5: JORNADA OUTLIER */}
      {(() => {
        const journey = journeyData;
        if (journey.loading || journey.allLevels.length === 0) return null;

        const { targetLevel, currentLevelLabel, targetLevelLabel, progressToTarget, isAtTop, isCapped } = journey;
        const missingBenchmarks = Math.max(0, targetLevel.benchmarksRequired - targetLevel.benchmarksCompleted);
        const missingSessions = Math.max(0, targetLevel.trainingRequired - targetLevel.trainingSessions);
        const worstMetrics = [...scores].sort((a, b) => a.percentile_value - b.percentile_value).slice(0, 2);
        // Score is now shown as ranking (Top X%), no longer as absolute number
        const scoreLabel = getScoreDescription(outlierScore.score);
        const scoreColorClass = getScoreColorClass(outlierScore.score);

        const milestones = [
          { position: 25, icon: Target, label: '25%' },
          { position: 50, icon: TrendingUp, label: '50%' },
          { position: 75, icon: Crown, label: '75%' },
        ];

        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.075 }} className="card-elevated rounded-2xl overflow-hidden">
            <div className="px-4 py-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" fill="currentColor" />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-orange-500">Jornada Outlier</span>
                </div>
                <span className="text-[10px] font-bold font-display uppercase tracking-wide text-foreground/70">{currentLevelLabel} → {targetLevelLabel}</span>
              </div>

              {/* OUTLIER SCORE — compact ranking metric */}
              <div className="bg-gradient-to-br from-background/80 to-muted/20 border border-border/30 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Outlier Score</span>
                      {outlierScore.isProvisional && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />Provisório
                        </span>
                      )}
                    </div>
                    <p className={`text-lg font-bold font-display ${scoreColorClass}`}>
                      Top {Math.max(1, Math.round(100 - outlierScore.score))}% <span className="text-xs font-medium text-muted-foreground">da categoria</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">Evolução: <span className="text-muted-foreground">---</span></p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${scoreColorClass} border-current/20`}>{scoreLabel}</span>
                  </div>
                </div>
              </div>

              {/* ELITE state */}
              {isAtTop ? (
                <div className="text-center py-4">
                  <Crown className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">Você está no topo</p>
                  <p className="text-xs text-muted-foreground mt-1">Modo manutenção — mantenha sua consistência.</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{currentLevelLabel}</span>
                      <span className="text-3xl font-bold text-foreground font-display">{progressToTarget}%</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{targetLevelLabel}</span>
                    </div>
                    <div className="relative h-4 w-full rounded-full bg-secondary overflow-visible">
                      <div className="absolute inset-0 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progressToTarget}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400" />
                      </div>
                      {milestones.map((ms) => {
                        const Icon = ms.icon;
                        const reached = progressToTarget >= ms.position;
                        return (
                          <div key={ms.position} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${ms.position}%` }}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${reached ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted border-border text-muted-foreground'}`}>
                              <Icon className="w-2.5 h-2.5" />
                            </div>
                          </div>
                        );
                      })}
                      {isCapped && <div className="absolute top-0 h-full w-px bg-destructive" style={{ left: `${journey.capPercent}%` }} />}
                    </div>
                    {isCapped && (
                      <p className="text-[10px] text-destructive mt-1.5 flex items-center gap-1">
                        <Lock className="w-3 h-3" />Travado em {journey.capPercent}% sem prova oficial
                      </p>
                    )}
                  </div>




                  {/* REQUISITOS PARA {targetLevel} — UNIFIED CHECKLIST */}
                  <div className="rounded-lg border border-border/30 p-3">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Target className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Requisitos para {targetLevelLabel}</span>
                    </div>
                    <ul className="space-y-2">
                      {/* Volume items (orange X) */}
                      {missingBenchmarks > 0 ? (
                        <li className="flex items-center gap-2 text-xs">
                          <X className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-foreground">{missingBenchmarks} benchmark{missingBenchmarks > 1 ? 's' : ''} faltando</span>
                        </li>
                      ) : (
                        <li className="flex items-center gap-2 text-xs">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-foreground/60">Benchmarks completos</span>
                        </li>
                      )}
                      {missingSessions > 0 ? (
                        <li className="flex items-center gap-2 text-xs">
                          <X className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-foreground">{missingSessions} sessões restantes</span>
                        </li>
                      ) : (
                        <li className="flex items-center gap-2 text-xs">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-foreground/60">Sessões completas</span>
                        </li>
                      )}
                      {/* Official race */}
                      {targetLevel.officialRaceRequired && (
                        <li className="flex items-center gap-2 text-xs">
                          {targetLevel.hasOfficialRace
                            ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            : <X className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                          <span className={targetLevel.hasOfficialRace ? 'text-foreground/60' : 'text-foreground font-semibold'}>
                            Prova oficial HYROX
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        );
      })()}

      {/* BLOCO 6: PERFIL FISIOLÓGICO */}
      <TooltipProvider>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-elevated border-l-4 border-l-muted-foreground/20 overflow-hidden">
        <Collapsible open={isRadarOpen} onOpenChange={setIsRadarOpen}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xs text-muted-foreground tracking-wide">PERFIL FISIOLÓGICO</h3>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Baseado na última prova registrada</p>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-7 px-2">
                  {isRadarOpen ? (<>Ocultar<ChevronUp className="w-3 h-3 ml-1" /></>) : (<>Ver perfil<ChevronDown className="w-3 h-3 ml-1" /></>)}
                </Button>
              </CollapsibleTrigger>
            </div>
            {/* VO₂ máx e Limiar de Lactato — sempre visíveis */}
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
          <CollapsibleContent>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="px-4 pb-4 space-y-4">
              <p className="text-xs text-muted-foreground mb-3 text-center">Seus pontos fortes e fracos impactam diretamente seu Outlier Score.</p>
              <div className="h-48 sm:h-56 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--foreground))" strokeOpacity={0.12} gridType="circle" radialLines />
                    <PolarAngleAxis dataKey="shortName" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 500 }} tickLine={false} />
                    <Radar name="Perfil Fisiológico" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="hsl(var(--primary))" fillOpacity={0.4} dot={false} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 pt-3 border-t border-border/30">
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground h-7" onClick={() => setShowStationDetails(!showStationDetails)}>
                  {showStationDetails ? (<><ChevronUp className="w-3 h-3 mr-1" />Ocultar estações</>) : (<><ChevronDown className="w-3 h-3 mr-1" />Análise por estação</>)}
                </Button>
              </div>
              <AnimatePresence>
                {showStationDetails && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="mt-3 overflow-hidden">
                    <DiagnosticStationsBars scores={scores} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </CollapsibleContent>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-2 pb-3 space-y-3">
              {/* CARD 1 — LIMITADOR */}
              <div className="rounded-lg bg-red-950/80 border border-red-800/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-2">Limitador</p>
                <p className="text-base font-bold text-foreground">{mainLimiter?.name || 'Análise não disponível'}</p>
                {mainLimiter ? (
                  <p className="text-xs text-foreground/70 mt-1">Abaixo de {mainLimiter.relativePerformance}% da categoria</p>
                ) : (
                  <p className="text-xs text-foreground/70 mt-1">Registre uma prova para ver seu limitador.</p>
                )}
              </div>

              {/* CARD 2 — GANHO POTENCIAL */}
              <div className="rounded-lg bg-emerald-950/80 border border-emerald-800/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2">Ganho Potencial</p>
                {mainLimiter ? (
                  <>
                    <p className="text-sm text-foreground">Corrigindo {mainLimiter.name} →</p>
                    <p className="text-xs text-foreground/70 mt-1">Zona competitiva superior da categoria</p>
                  </>
                ) : (
                  <p className="text-xs text-foreground/70">Ganhos estimados disponíveis após 2 provas.</p>
                )}
              </div>

              {/* CARD 3 — PRÓXIMO PASSO */}
              <div className="rounded-lg bg-amber-950/80 border border-amber-800/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">Próximo Passo</p>
                <ul className="space-y-1 mb-4">
                  {topStations.map((station, index) => (
                    <li key={index} className="text-sm text-foreground">• {station.name}</li>
                  ))}
                </ul>
              </div>

              {/* Ver análise detalhada */}
              <button
                onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2 text-center"
              >
                {showDetailedAnalysis ? 'Ocultar detalhes ▾' : 'Ver análise detalhada ▸'}
              </button>

              {showDetailedAnalysis && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 text-sm text-foreground/90 leading-relaxed">
                  <div className="border-l-2 border-red-800/50 pl-3 space-y-2">
                    <p className="font-semibold text-red-400 text-xs uppercase">Limitador — Análise completa</p>
                    <p>{mainLimiter?.name} foi identificado como o principal fator limitante da sua performance atual, onde a exigência de sustentação de força sob fadiga é determinante.</p>
                    <p>Nessa variável específica, você performou abaixo de <span className="font-semibold text-destructive">{mainLimiter?.relativePerformance || 0}%</span> dos atletas da sua categoria, o que compromete drasticamente seus resultados.</p>
                  </div>
                  <div className="border-l-2 border-emerald-800/50 pl-3 space-y-2">
                    <p className="font-semibold text-emerald-400 text-xs uppercase">Projeção</p>
                    <p>Ao corrigir este limitador, sua performance tende a se deslocar para a <span className="font-semibold text-emerald-500">zona competitiva superior</span> da categoria {athleteCategory}.</p>
                  </div>
                  <div className="border-l-2 border-amber-800/50 pl-3 space-y-2">
                    <p className="font-semibold text-amber-400 text-xs uppercase">Impacto na prova</p>
                    <div className="flex flex-wrap gap-2">
                      {affectedStations.map((station, index) => (
                        <span key={index} className="text-xs px-2 py-1 rounded bg-background/50 border border-border/20">{station.name}</span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Sob fadiga acumulada, essas estações tendem a sofrer queda acelerada de eficiência.</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>


      {/* BLOCO 8: DIRECIONAMENTO DO TREINO */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-primary/5 border-l-4 border-l-primary rounded-lg px-4 py-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Direcionamento</p>
        <p className="text-xs text-foreground/90 leading-relaxed">{trainingFocus}</p>
      </motion.div>

      {/* BLOCO 9: CTA FINAL */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="pt-1">
        <Button
          size="lg"
          onClick={onStartWorkout}
          className="w-full font-display text-lg tracking-wider px-6 py-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          <Flame className="w-5 h-5" />
          BORA TREINAR
          <ChevronRight className="w-5 h-5" />
        </Button>
        <p className="text-muted-foreground/60 text-xs text-center mt-2">Veja seu treino do dia</p>
      </motion.div>
    </div>
  );
}
