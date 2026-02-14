/**
 * DiagnosticRadarBlock - Perfil de Performance do Atleta OUTLIER
 * 
 * MOBILE-FIRST: Card de Decisão compacto no mobile, layout completo no desktop.
 * Toggle "Modo Avançado" para mobile (persistido em localStorage).
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { Activity, ChevronDown, ChevronUp, Info, Target, Crown, TrendingUp, Flame, ChevronRight, Star, Trophy, Lock, BarChart3 } from 'lucide-react';
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
// MOBILE DECISION CARD
// ============================================
function MobileDecisionCard({
  athleteName,
  athleteCategory,
  journeyData,
  outlierScore,
  validatingCompetition,
  scores,
  todayWorkoutLabel,
  hasTodayWorkout,
  onStartWorkout,
  advancedMode,
  setAdvancedMode,
}: {
  athleteName: string;
  athleteCategory: string;
  journeyData: ReturnType<typeof useJourneyProgress>;
  outlierScore: { score: number; isProvisional: boolean };
  validatingCompetition: { time_in_seconds: number; open_equivalent_seconds: number; event_date?: string | null; event_name?: string | null } | null;
  scores: CalculatedScore[];
  todayWorkoutLabel?: string;
  hasTodayWorkout?: boolean;
  onStartWorkout?: () => void;
  advancedMode: boolean;
  setAdvancedMode: (v: boolean) => void;
}) {
  const { targetLevel, currentLevelLabel, targetLevelLabel, progressToTarget, isAtTop, isCapped } = journeyData;

  const worstMetrics = useMemo(() => 
    [...scores].sort((a, b) => a.percentile_value - b.percentile_value).slice(0, 2),
    [scores]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated rounded-2xl overflow-hidden"
    >
      <div className="px-4 py-4">
        {/* Header: Name + Toggle */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="font-display text-xl font-bold tracking-wide text-foreground uppercase">
              {athleteName}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-semibold text-amber-400 tracking-wider">
                {athleteCategory}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Avançado</span>
            <Switch
              checked={advancedMode}
              onCheckedChange={setAdvancedMode}
              className="scale-75"
            />
          </div>
        </div>

        {/* Competitive Data Line */}
        <div className="mt-3 mb-4 space-y-0.5">
          {validatingCompetition?.time_in_seconds ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-foreground/70">
              <span>Última prova: <span className="font-semibold text-foreground">{formatOfficialTime(validatingCompetition.time_in_seconds)}</span></span>
              <span>Top <span className="font-semibold text-foreground">{Math.round(100 - outlierScore.score * 10)}%</span></span>
              <span>Evolução: <span className="text-muted-foreground">---</span></span>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground/50">Sem prova oficial registrada</p>
          )}
        </div>

        {/* Relative Score */}
        <div className="text-center mb-4">
          <span className="text-3xl font-bold text-foreground font-display">{progressToTarget}</span>
          <span className="text-sm text-muted-foreground font-medium">/100 para {targetLevelLabel}</span>
        </div>

        {/* Progress Bar */}
        {!isAtTop && (
          <>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{currentLevelLabel}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{targetLevelLabel}</span>
              </div>
              <div className="relative h-5 w-full rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToTarget}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                />
              </div>
              {isCapped && (
                <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Travado em {journeyData.capPercent}% sem prova oficial
                </p>
              )}
            </div>

            {/* Top 2 Bottlenecks */}
            {worstMetrics.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Faltam para {targetLevelLabel}:
                </p>
                <ul className="space-y-1.5">
                  {worstMetrics.map((m, i) => {
                    const stars = percentileToStars(m.percentile_value);
                    return (
                      <li key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                        <ChevronRight className="w-3 h-3 text-red-500 shrink-0" />
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
          </>
        )}


        {/* Today's Workout */}
        {hasTodayWorkout && todayWorkoutLabel && (
          <div className="flex items-center gap-2 mb-4 text-xs text-foreground/70">
            <Flame className="w-4 h-4 text-orange-500 shrink-0" />
            <span>Treino de hoje: <span className="font-semibold text-foreground">{todayWorkoutLabel}</span></span>
          </div>
        )}

        {/* CTA Button */}
        <Button
          size="lg"
          disabled={!hasTodayWorkout}
          onClick={onStartWorkout}
          className="w-full font-display text-lg tracking-wider rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg min-h-[30vh]"
        >
          <Flame className="w-6 h-6" />
          {hasTodayWorkout ? (
            <>BORA TREINAR<ChevronRight className="w-5 h-5" /></>
          ) : (
            'Sem treino hoje'
          )}
        </Button>
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
          {/* Mini bars */}
          <div className="space-y-2 card-elevated rounded-xl p-3">
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Activity className="w-3 h-3 text-blue-500" />
                <span className="text-[10px] text-muted-foreground">Benchmarks</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  <AnimatedCounter target={targetLevel.benchmarksCompleted} duration={800} />/{targetLevel.benchmarksRequired}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${targetLevel.benchmarksRequired > 0 ? Math.min(100, (targetLevel.benchmarksCompleted / targetLevel.benchmarksRequired) * 100) : 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Flame className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-muted-foreground">Treinos</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  <AnimatedCounter target={targetLevel.trainingSessions} duration={800} />/{targetLevel.trainingRequired}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${targetLevel.trainingRequired > 0 ? Math.min(100, (targetLevel.trainingSessions / targetLevel.trainingRequired) * 100) : 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400" />
              </div>
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
  const [isLimiterExpanded, setIsLimiterExpanded] = useState(false);
  const [isImpactExpanded, setIsImpactExpanded] = useState(false);
  const [isProjectionExpanded, setIsProjectionExpanded] = useState(false);
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
        {/* Card de Decisão */}
        <MobileDecisionCard
          athleteName={athleteName}
          athleteCategory={athleteCategory}
          journeyData={journeyData}
          outlierScore={outlierScore}
          validatingCompetition={validatingCompetition}
          scores={scores}
          todayWorkoutLabel={todayWorkoutLabel}
          hasTodayWorkout={hasTodayWorkout}
          onStartWorkout={onStartWorkout}
          advancedMode={advancedMode}
          setAdvancedMode={setAdvancedMode}
        />

        {/* Collapsible: Perfil Fisiológico */}
        <MobilePhysiologicalModal
          scores={scores}
          radarData={radarData}
          vo2maxEstimate={vo2maxEstimate}
          lactateThresholdEstimate={lactateThresholdEstimate}
        />

        {/* Collapsible: Dados Avançados */}
        <MobileAdvancedDataSection
          journeyData={journeyData}
          scores={scores}
          mainLimiter={mainLimiter}
          affectedStations={affectedStations}
          athleteCategory={athleteCategory}
        />
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
        const displayScore = Math.round(outlierScore.score * 10);
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

              {/* OUTLIER SCORE BLOCK */}
              <div className="bg-gradient-to-br from-background/80 to-muted/20 border border-border/30 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Outlier Score</span>
                  {outlierScore.isProvisional && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />Provisório
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`font-display text-4xl font-bold ${scoreColorClass}`}>
                    <AnimatedCounter target={displayScore} duration={1200} />
                  </motion.span>
                  <span className="text-sm text-muted-foreground font-medium">/ 1000</span>
                  <span className={`text-xs font-semibold ml-auto ${scoreColorClass}`}>{scoreLabel}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Top {Math.max(1, Math.round(100 - outlierScore.score))}% — <span className="font-semibold text-foreground/80">{athleteCategory}</span>
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Baseado em provas + benchmarks + consistência</p>
                <div className="mt-2.5 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${outlierScore.score}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }} className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60" />
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
                  {/* PROGRESS BAR WITH MILESTONES */}
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

                  {/* MINI BARS */}
                  <div className="space-y-2 mb-4">
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Activity className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] text-muted-foreground">Benchmarks</span>
                        <span className="text-[10px] font-mono text-muted-foreground"><AnimatedCounter target={targetLevel.benchmarksCompleted} duration={800} />/{targetLevel.benchmarksRequired}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${targetLevel.benchmarksRequired > 0 ? Math.min(100, (targetLevel.benchmarksCompleted / targetLevel.benchmarksRequired) * 100) : 100}%` }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }} className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Flame className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] text-muted-foreground">Treinos</span>
                        <span className="text-[10px] font-mono text-muted-foreground"><AnimatedCounter target={targetLevel.trainingSessions} duration={800} />/{targetLevel.trainingRequired}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${targetLevel.trainingRequired > 0 ? Math.min(100, (targetLevel.trainingSessions / targetLevel.trainingRequired) * 100) : 100}%` }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.7 }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400" />
                      </div>
                    </div>
                  </div>




                  {/* REQUISITOS FALTANTES — CATEGORIZED */}
                  <div className="space-y-3">
                    {worstMetrics.length > 0 && (
                      <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/10">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Target className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Gargalos de Performance</span>
                        </div>
                        <ul className="space-y-1.5">
                          {worstMetrics.map((m, i) => {
                            const stars = percentileToStars(m.percentile_value);
                            return (
                              <li key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                                <ChevronRight className="w-3 h-3 text-red-500 shrink-0" />
                                <span className="flex-1"><span className="font-semibold">{METRIC_LABELS[m.metric] || m.metric}</span></span>
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
                              <span className="font-semibold text-destructive">Completar uma prova oficial HYROX</span>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        );
      })()}

      {/* BLOCO 6: PERFIL FISIOLÓGICO */}
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
          </div>
          <CollapsibleContent>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="px-4 pb-4">
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
              {/* LIMITADOR */}
              <div className="card-elevated border-l-4 border-l-destructive bg-destructive/5 overflow-hidden">
                <Collapsible open={isLimiterExpanded} onOpenChange={setIsLimiterExpanded}>
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-base sm:text-lg font-bold text-foreground">{mainLimiter?.name || 'Análise não disponível'}</h3>
                        <p className="text-xs text-foreground/70 mt-0.5 line-clamp-1">{mainLimiter ? 'Limitador direto identificado com base nos seus resultados.' : 'Registre uma prova para ver seu limitador.'}</p>
                      </div>
                      <CollapsibleTrigger asChild>
                        <button className="text-xs text-destructive hover:text-destructive/80 font-medium flex items-center gap-1 shrink-0 transition-colors">
                          {isLimiterExpanded ? (<>Ocultar<ChevronUp className="w-3 h-3" /></>) : (<>Ver análise<ChevronDown className="w-3 h-3" /></>)}
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-4 pt-1 border-t border-destructive/10">
                      <div className="space-y-3 text-sm text-foreground/90 leading-relaxed">
                        <p>{mainLimiter?.name} foi identificado como o principal fator limitante da sua performance atual, onde a exigência de sustentação de força sob fadiga é determinante.</p>
                        <p>Nessa variável específica, você performou abaixo de <span className="font-semibold text-destructive">{mainLimiter?.relativePerformance || 0}%</span> dos atletas da sua categoria, o que compromete drasticamente seus resultados devido à perda de estabilidade e eficiência mecânica sob fadiga.</p>
                        <p className="text-muted-foreground text-xs italic border-l-2 border-muted-foreground/30 pl-3">Este diagnóstico se refere exclusivamente a esta variável e não representa seu desempenho global como atleta.</p>
                      </div>
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* PROJEÇÃO */}
              <div className="card-elevated border-l-4 border-l-emerald-500 bg-emerald-500/5 overflow-hidden">
                <Collapsible open={isProjectionExpanded} onOpenChange={setIsProjectionExpanded}>
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          <p className="text-xs font-semibold text-foreground">Projeção</p>
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed">Correção deste limitador desloca sua performance para a zona competitiva superior.</p>
                      </div>
                      <CollapsibleTrigger asChild>
                        <button className="text-xs text-emerald-500 hover:text-emerald-400 font-medium flex items-center gap-1 shrink-0 transition-colors">
                          {isProjectionExpanded ? (<>Menos<ChevronUp className="w-3 h-3" /></>) : (<>Entender<ChevronDown className="w-3 h-3" /></>)}
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-3 pt-1 border-t border-emerald-500/10">
                      <p className="text-sm text-foreground/90 leading-relaxed">Ao corrigir este limitador, sua performance tende a se deslocar para a <span className="font-semibold text-emerald-500">zona competitiva superior</span> da categoria {athleteCategory}, especialmente nas estações onde hoje ocorre a maior perda de rendimento.</p>
                      <p className="text-muted-foreground text-xs italic mt-2">A projeção considera correção consistente deste fator específico.</p>
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* IMPACTO NA PROVA */}
              <div className="card-elevated border-l-4 border-l-amber-500 overflow-hidden">
                <Collapsible open={isImpactExpanded} onOpenChange={setIsImpactExpanded}>
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-amber-500" />
                        <p className="text-xs font-semibold text-foreground">Impacto na prova</p>
                      </div>
                      {hasMoreStations && (
                        <CollapsibleTrigger asChild>
                          <button className="text-xs text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1 transition-colors">
                            {isImpactExpanded ? (<>Menos<ChevronUp className="w-3 h-3" /></>) : (<>Ver todas<ChevronDown className="w-3 h-3" /></>)}
                          </button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {topStations.map((station, index) => {
                        const stationStars = station.percentile < 20 ? 1 : station.percentile < 40 ? 2 : 3;
                        const starColor = station.impactLevel === 'Alto' ? 'text-destructive' : 'text-amber-500';
                        return (
                          <div key={index} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-background/50 border border-border/20">
                            <span className="text-xs font-medium text-foreground">{station.name}</span>
                            <span className={`flex items-center gap-0.5 ${starColor}`}>
                              {Array.from({ length: 5 }).map((_, si) => (
                                <Star key={si} className="w-2.5 h-2.5" fill={si < stationStars ? 'currentColor' : 'none'} strokeWidth={si < stationStars ? 0 : 1.5} />
                              ))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <CollapsibleContent>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-3 pt-1">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {affectedStations.slice(2).map((station, index) => {
                          const stationStars = station.percentile < 20 ? 1 : station.percentile < 40 ? 2 : 3;
                          const starColor = station.impactLevel === 'Alto' ? 'text-destructive' : 'text-amber-500';
                          return (
                            <div key={index} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-background/50 border border-border/20">
                              <span className="text-xs font-medium text-foreground">{station.name}</span>
                              <span className={`flex items-center gap-0.5 ${starColor}`}>
                                {Array.from({ length: 5 }).map((_, si) => (
                                  <Star key={si} className="w-2.5 h-2.5" fill={si < stationStars ? 'currentColor' : 'none'} strokeWidth={si < stationStars ? 0 : 1.5} />
                                ))}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">Sob fadiga acumulada, essas estações tendem a sofrer queda acelerada de eficiência devido à instabilidade central.</p>
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>

      {/* BLOCO 7: INDICADORES FISIOLÓGICOS */}
      <TooltipProvider>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card/60 border border-border/30 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">VO₂ máx (estimado)</span>
                <Tooltip>
                  <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground/50 cursor-help hover:text-muted-foreground/70 transition-colors" /></TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]"><p className="text-xs">Capacidade máxima de consumo de oxigênio.</p></TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-xl font-semibold text-foreground/85">{vo2maxEstimate || '—'}</span>
                <span className="text-xs text-muted-foreground/60 font-medium">ml/kg/min</span>
              </div>
            </div>
            <div className="bg-card/60 border border-border/30 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Limiar de lactato</span>
                <Tooltip>
                  <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground/50 cursor-help hover:text-muted-foreground/70 transition-colors" /></TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]"><p className="text-xs">Ritmo máximo sustentável sem acúmulo de lactato.</p></TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-xl font-semibold text-foreground/85">{lactateThresholdEstimate || '—'}</span>
                <span className="text-xs text-muted-foreground/60 font-medium">/km</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/50 text-center leading-relaxed px-2">Esses indicadores sustentam seu desempenho aeróbico, mas não são o principal fator limitante no cenário atual.</p>
        </motion.div>
      </TooltipProvider>

      {/* BLOCO 8: DIRECIONAMENTO DO TREINO */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-primary/5 border-l-4 border-l-primary rounded-lg px-4 py-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Direcionamento</p>
        <p className="text-xs text-foreground/90 leading-relaxed">{trainingFocus}</p>
      </motion.div>

      {/* BLOCO 9: CTA FINAL */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="pt-1">
        <Button
          size="lg"
          disabled={onStartWorkout ? !hasTodayWorkout : false}
          onClick={onStartWorkout}
          className="w-full font-display text-lg tracking-wider px-6 py-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          <Flame className="w-5 h-5" />
          BORA TREINAR
          <ChevronRight className="w-5 h-5" />
        </Button>
        <p className="text-muted-foreground/60 text-xs text-center mt-2">Treinar certo muda o jogo.</p>
      </motion.div>
    </div>
  );
}
