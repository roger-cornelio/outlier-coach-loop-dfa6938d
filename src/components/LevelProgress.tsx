import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Zap, Flame, Lock, 
  TrendingUp, Target, Sparkles, Shield, Swords,
  Crown, CheckCircle2, AlertTriangle, Diamond,
  ArrowRight, Star, Timer, Activity
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { StatusExplainerModal } from '@/components/StatusExplainerModal';
import { NextLevelModal } from '@/components/NextLevelModal';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useJourneyProgress, type ExtendedLevelKey } from '@/hooks/useJourneyProgress';
import { useBenchmarkResults } from '@/hooks/useBenchmarkResults';
import { LEVEL_NAMES, type AthleteStatus } from '@/types/outlier';
import { CONFIDENCE_LABELS } from '@/utils/athleteStatusSystem';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';

// ─── Ícones temáticos HYROX por categoria ───────────────────────────────────
// OPEN  → Pessoa correndo (corrida é base do HYROX)
// PRO   → Pessoa carregando peso / fazendo movimento funcional
// ELITE → Raio / energia máxima (velocidade + força no limite)

interface LevelVisualConfig {
  icon: React.ReactNode;
  heroIcon: React.ReactNode;
  nodeIcon: React.ReactNode;
  gradient: string;
  textGradient: string;
  bgPattern: string;
  particleColor: string;
  title: string;
  subtitle: string;
  motivation: string;
  borderStyle: string;
  cardStyle: string;
  iconAnimation: string;
  accentColor: string;
}

// OPEN: Corredor em movimento
const OpenIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="14.5" cy="3" r="1.8" />
    <path d="M11 7.5 C10 9 9.5 10.5 10 12 L12.5 12 L14 8.5 Z" />
    <path d="M10 9 L7.5 7.5" strokeWidth="1.8" stroke="currentColor" fill="none" strokeLinecap="round" />
    <path d="M14 9 L16.5 10.5" strokeWidth="1.8" stroke="currentColor" fill="none" strokeLinecap="round" />
    <path d="M12.5 12 L10 17 L12 18" strokeWidth="1.8" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12.5 12 L15 16 L13.5 19" strokeWidth="1.8" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// PRO: Atleta levantando kettlebell
const ProIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="3.5" r="1.8" />
    <path d="M12 5.5 L12 11" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
    <path d="M12 7.5 L7 5 M12 7.5 L17 5" strokeWidth="1.8" stroke="currentColor" fill="none" strokeLinecap="round" />
    <rect x="4.5" y="2.5" width="4" height="3" rx="1" />
    <rect x="15.5" y="2.5" width="4" height="3" rx="1" />
    <path d="M12 11 L9.5 16 L8 19" strokeWidth="1.8" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 11 L14.5 16 L16 19" strokeWidth="1.8" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ELITE: Raio de energia
const EliteIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13 2 L6 13 H11 L9 22 L18 9 H13 L15 2 Z" />
  </svg>
);

const OpenHeroIcon = () => (
  <div className="relative flex items-center justify-center">
    <OpenIcon size={80} className="opacity-95" />
  </div>
);

const ProHeroIcon = () => (
  <div className="relative flex items-center justify-center">
    <ProIcon size={80} className="opacity-95" />
  </div>
);

const EliteHeroIcon = () => (
  <div className="relative flex items-center justify-center">
    <EliteIcon size={80} className="opacity-95" />
    <motion.div
      className="absolute inset-0 rounded-full opacity-30"
      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
);

const LEVEL_CONFIG: Record<ExtendedLevelKey, LevelVisualConfig> = {
  OPEN: {
    icon: <OpenIcon size={20} />,
    heroIcon: <OpenHeroIcon />,
    nodeIcon: <OpenIcon size={20} className="text-white" />,
    gradient: 'from-purple-500 via-violet-500 to-fuchsia-500',
    textGradient: 'from-purple-400 to-fuchsia-400',
    bgPattern: 'radial-gradient(ellipse at top, hsl(270 40% 20% / 0.7), transparent 50%)',
    particleColor: 'bg-purple-400',
    title: 'OPEN',
    subtitle: 'Competidor HYROX',
    motivation: 'Você está no campo de batalha. Evolua para o topo.',
    borderStyle: 'border-purple-500/40',
    cardStyle: 'bg-gradient-to-br from-purple-950/60 to-violet-950/40',
    iconAnimation: '',
    accentColor: '#a855f7',
  },
  PRO: {
    icon: <ProIcon size={20} />,
    heroIcon: <ProHeroIcon />,
    nodeIcon: <ProIcon size={20} className="text-white" />,
    gradient: 'from-amber-400 via-yellow-400 to-orange-400',
    textGradient: 'from-amber-300 to-yellow-300',
    bgPattern: 'radial-gradient(ellipse at top, hsl(45 50% 20% / 0.8), transparent 50%)',
    particleColor: 'bg-amber-400',
    title: 'PRO',
    subtitle: 'Elite competitiva',
    motivation: 'Você é a referência. Mantenha a coroa.',
    borderStyle: 'border-amber-400/50 shadow-[0_0_20px_hsl(45_93%_47%/0.2)]',
    cardStyle: 'bg-gradient-to-br from-amber-950/70 to-yellow-950/50',
    iconAnimation: 'animate-crown-float',
    accentColor: '#f59e0b',
  },
  ELITE: {
    icon: <EliteIcon size={20} />,
    heroIcon: <EliteHeroIcon />,
    nodeIcon: <EliteIcon size={20} className="text-white" />,
    gradient: 'from-yellow-300 via-amber-300 to-yellow-400',
    textGradient: 'from-yellow-200 to-amber-200',
    bgPattern: 'radial-gradient(ellipse at top, hsl(50 60% 25% / 0.9), transparent 50%)',
    particleColor: 'bg-yellow-300',
    title: 'ELITE',
    subtitle: 'Lenda absoluta',
    motivation: 'O topo é seu. Inspire gerações.',
    borderStyle: 'border-yellow-300/60 shadow-[0_0_40px_hsl(50_93%_60%/0.4)]',
    cardStyle: 'bg-gradient-to-br from-yellow-950/80 to-amber-950/60',
    iconAnimation: 'animate-crown-float',
    accentColor: '#eab308',
  },
};

const LEVELS_ORDER: ExtendedLevelKey[] = ['OPEN', 'PRO', 'ELITE'];

const LEVEL_LABELS: Record<ExtendedLevelKey, string> = {
  OPEN: 'OPEN',
  PRO: 'PRO',
  ELITE: 'ELITE',
};

// Particle burst for level-up animation
const LevelUpBurst = ({ color }: { color: string }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 16 }).map((_, i) => {
      const angle = (i / 16) * 360;
      const distance = 60 + Math.random() * 80;
      return (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{ backgroundColor: color, left: '50%', top: '50%' }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{
            x: Math.cos((angle * Math.PI) / 180) * distance,
            y: Math.sin((angle * Math.PI) / 180) * distance,
            scale: 0,
            opacity: 0,
          }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.02 }}
        />
      );
    })}
  </div>
);

// Particle ambient effect
const Particles = ({ color, count = 6 }: { color: string; count?: number }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        className={`absolute w-2 h-2 rounded-full ${color} opacity-60`}
        style={{ left: `${10 + (i * 15) % 80}%`, top: `${20 + (i * 20) % 60}%` }}
        animate={{ y: [-10, 10, -10], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
      />
    ))}
  </div>
);

// ─── Componente: Barra de progresso da régua com % real ─────────────────────
function RulerBar({
  fillPercentage,
  gradient,
  segmentPercents,
}: {
  fillPercentage: number;
  gradient: string;
  segmentPercents: number[];
}) {
  return (
    <div className="relative">
      {/* Track */}
      <div className="relative h-6 rounded-full bg-secondary/60 shadow-inner overflow-hidden border border-border/20">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${fillPercentage}%` }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.4 }}
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${gradient} rounded-full shadow-lg`}
        >
          <div className="absolute inset-x-0 top-0 h-1/2 bg-white/25 rounded-t-full" />
          {/* % label */}
          {fillPercentage > 12 && (
            <div className="absolute inset-0 flex items-center pl-3">
              <span className="text-[10px] font-bold text-white/90 drop-shadow tabular-nums">
                {Math.round(fillPercentage)}%
              </span>
            </div>
          )}
        </motion.div>

        {/* Segment dividers */}
        {segmentPercents.map((pct, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-background/40"
            style={{ left: `${pct}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Componente: Card de métrica que impacta nível ──────────────────────────
function MetricCard({
  icon: Icon,
  label,
  value,
  total,
  highlight,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  total: number;
  highlight?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={`p-3 rounded-xl border text-center ${
        highlight
          ? 'bg-green-500/10 border-green-500/25'
          : 'bg-secondary/40 border-border/30'
      }`}
    >
      <Icon className={`w-4 h-4 mx-auto mb-1.5 ${highlight ? 'text-green-400' : 'text-muted-foreground'}`} />
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${highlight ? 'text-green-400' : 'text-foreground'}`}>
        {value}<span className="text-muted-foreground font-normal text-xs">/{total}</span>
      </p>
    </motion.div>
  );
}

// ─── Componente: Próximo marco ───────────────────────────────────────────────
function NextMilestone({
  journeyProgress,
  accentColor,
}: {
  journeyProgress: any;
  accentColor: string;
}) {
  const tl = journeyProgress.targetLevel;
  if (!tl) return null;

  const benchmarksMissing = Math.max(0, tl.benchmarksRequired - tl.benchmarksCompleted);
  const sessionsMissing = Math.max(0, tl.trainingMinSessions - tl.trainingSessions);

  let milestoneText = '';
  let milestoneIcon: React.ElementType = TrendingUp;

  if (benchmarksMissing > 0 && sessionsMissing > 0) {
    if (benchmarksMissing <= sessionsMissing / 4) {
      milestoneText = `Mais ${benchmarksMissing} benchmark${benchmarksMissing > 1 ? 's' : ''} para ${journeyProgress.targetLevelLabel}`;
      milestoneIcon = TrendingUp;
    } else {
      milestoneText = `Mais ${sessionsMissing} treino${sessionsMissing > 1 ? 's' : ''} para ${journeyProgress.targetLevelLabel}`;
      milestoneIcon = Activity;
    }
  } else if (benchmarksMissing > 0) {
    milestoneText = `${benchmarksMissing} benchmark${benchmarksMissing > 1 ? 's' : ''} para atingir ${journeyProgress.targetLevelLabel}`;
    milestoneIcon = TrendingUp;
  } else if (sessionsMissing > 0) {
    milestoneText = `${sessionsMissing} treino${sessionsMissing > 1 ? 's' : ''} para atingir ${journeyProgress.targetLevelLabel}`;
    milestoneIcon = Activity;
  } else if (tl.officialRaceRequired && !tl.hasOfficialRace) {
    milestoneText = `Prova oficial obrigatória para ${journeyProgress.targetLevelLabel}`;
    milestoneIcon = Trophy;
  } else {
    milestoneText = `Continue evoluindo rumo ao ${journeyProgress.targetLevelLabel}`;
    milestoneIcon = Star;
  }

  const Icon = milestoneIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex items-center gap-2.5 bg-secondary/30 border border-border/30 rounded-xl px-3 py-2.5"
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accentColor}20`, border: `1px solid ${accentColor}40` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
          Próximo marco
        </p>
        <p className="text-sm font-medium text-foreground leading-tight truncate">
          {milestoneText}
        </p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
    </motion.div>
  );
}

// ─── Componente: Diferença para meta Elite ──────────────────────────────────
function EliteGapBadge({
  journeyProgress,
  accentColor,
}: {
  journeyProgress: any;
  accentColor: string;
}) {
  if (journeyProgress.currentLevelKey === 'ELITE') return null;

  const eliteRule = journeyProgress.allLevels.find((l: any) => l.level_key === 'ELITE');
  if (!eliteRule) return null;

  const tl = journeyProgress.targetLevel;
  const benchmarkGap = Math.max(0, eliteRule.benchmarks_required - tl.benchmarksCompleted);
  const sessionGap = Math.max(0, eliteRule.training_min_sessions - tl.trainingSessions);

  if (benchmarkGap === 0 && sessionGap === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/8 border border-yellow-500/20"
    >
      <EliteIcon size={14} className="text-yellow-400 shrink-0" />
      <p className="text-xs text-yellow-300/80">
        <span className="font-semibold text-yellow-300">Diferença para ELITE: </span>
        {benchmarkGap > 0 && <span>{benchmarkGap} bench{benchmarkGap > 1 ? 's' : ''}</span>}
        {benchmarkGap > 0 && sessionGap > 0 && <span> · </span>}
        {sessionGap > 0 && <span>{sessionGap} treino{sessionGap > 1 ? 's' : ''}</span>}
      </p>
    </motion.div>
  );
}

// ─── Componente: Sheet de detalhes de um nível ──────────────────────────────
function LevelDetailSheet({
  levelKey,
  isOpen,
  onClose,
  allLevels,
  journeyProgress,
}: {
  levelKey: ExtendedLevelKey;
  isOpen: boolean;
  onClose: () => void;
  allLevels: any[];
  journeyProgress: any;
}) {
  const levelRule = allLevels.find((l: any) => l.level_key === levelKey);
  const config = LEVEL_CONFIG[levelKey];
  const isCurrent = journeyProgress.currentLevelKey === levelKey;
  const isTarget = journeyProgress.targetLevelKey === levelKey;
  
  if (!levelRule) return null;
  
  const progressData = isTarget ? journeyProgress.targetLevel : null;
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle className={`bg-gradient-to-r ${config.textGradient} bg-clip-text text-transparent`}>
            {config.title} — {config.subtitle}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3 pb-6">
          <div className={`p-3 rounded-xl flex items-center justify-between bg-secondary/40`}>
            <span className="text-sm text-muted-foreground">Treinos</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {progressData ? `${progressData.trainingSessions}/` : ''}{levelRule.training_min_sessions}
              </span>
            </div>
          </div>
          {progressData && <Progress value={progressData.trainingProgress * 100} className="h-1.5" />}
          
          <div className={`p-3 rounded-xl flex items-center justify-between bg-secondary/40`}>
            <span className="text-sm text-muted-foreground">Benchmarks</span>
            <span className="text-sm font-semibold">
              {progressData ? `${progressData.benchmarksCompleted}/` : ''}{levelRule.benchmarks_required}
            </span>
          </div>
          {progressData && <Progress value={progressData.benchmarkProgress * 100} className="h-1.5" />}
          
          {levelRule.official_race_required && (
            <div className={`p-3 rounded-xl flex items-center justify-between ${
              journeyProgress.hasOfficialRace
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-amber-500/10 border border-amber-500/20'
            }`}>
              <span className="text-sm text-muted-foreground">Prova oficial</span>
              {journeyProgress.hasOfficialRace ? (
                <span className="text-green-400 text-sm font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />OK
                </span>
              ) : (
                <span className="text-amber-400 text-sm font-semibold">Pendente</span>
              )}
            </div>
          )}
          
          {isTarget && journeyProgress.isCapped && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  Sem prova oficial, o progresso é limitado a {Math.round((levelRule.cap_without_official_race_percent || 0.89) * 100)}%.
                </p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────
export function LevelProgress() {
  const athleteStatus = useAthleteStatus();
  const journeyProgress = useJourneyProgress();
  const { results: benchmarkResults } = useBenchmarkResults();
  const [showDetails, setShowDetails] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<ExtendedLevelKey | null>(null);
  const [showLevelUpBurst, setShowLevelUpBurst] = useState(false);
  const prevLevelKey = useRef<ExtendedLevelKey | null>(null);
  
  const { 
    status: athleteStatusValue,
    loading: statusLoading 
  } = athleteStatus;

  const currentLevelKey = journeyProgress.currentLevelKey;
  const currentConfig = LEVEL_CONFIG[currentLevelKey];
  const isElite = currentLevelKey === 'ELITE';
  const isAtTop = journeyProgress.isAtTop;

  // Micro-animação ao subir de nível
  useEffect(() => {
    if (prevLevelKey.current && prevLevelKey.current !== currentLevelKey) {
      setShowLevelUpBurst(true);
      setTimeout(() => setShowLevelUpBurst(false), 1000);
    }
    prevLevelKey.current = currentLevelKey;
  }, [currentLevelKey]);

  // Barra contínua 0-100%
  const fillPercentage = journeyProgress.loading
    ? 0
    : Math.min(100, (journeyProgress.continuousPosition * 100));

  const segmentPercents = [33.33, 66.66];

  // Métricas detalhadas (para o sheet)
  const tl = journeyProgress.targetLevel;
  const benchmarksCompleted = tl?.benchmarksCompleted ?? 0;
  const benchmarksRequired = tl?.benchmarksRequired ?? 0;
  const sessionsCompleted = tl?.trainingSessions ?? 0;
  const sessionsRequired = tl?.trainingRequired ?? 0;

  if (statusLoading || journeyProgress.loading) {
    return (
      <div className="animate-pulse rounded-2xl bg-secondary/40 h-44" />
    );
  }

  return (
    <div className="space-y-3">
      {/* ─── CARD PRINCIPAL: status + barra + próximo marco ─────────────── */}
      <motion.div
        key={currentLevelKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={`relative overflow-hidden rounded-2xl border p-4 ${currentConfig.cardStyle} ${currentConfig.borderStyle}`}
      >
        <AnimatePresence>
          {showLevelUpBurst && <LevelUpBurst color={currentConfig.accentColor} />}
        </AnimatePresence>

        {/* ── 1. Status atual ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${currentConfig.gradient} shadow-lg`}
              style={{ boxShadow: `0 0 20px ${currentConfig.accentColor}40` }}
            >
              <span className="text-white">{currentConfig.nodeIcon}</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground leading-none mb-0.5">
                Seu Status
              </p>
              <p className={`text-xl font-bold leading-none bg-gradient-to-r ${currentConfig.textGradient} bg-clip-text text-transparent`}>
                {currentConfig.title}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(true)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            Ver detalhes
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* ── 2. Barra OPEN → PRO → ELITE com % ───────────────────────── */}
        <div className="mb-3">
          <RulerBar
            fillPercentage={fillPercentage}
            gradient={currentConfig.gradient}
            segmentPercents={segmentPercents}
          />
          <div className="flex justify-between mt-1.5 px-0.5">
            {LEVELS_ORDER.map((lk) => {
              const lConfig = LEVEL_CONFIG[lk];
              const isCurrentLabel = lk === currentLevelKey;
              return (
                <span
                  key={lk}
                  className={`text-[9px] uppercase tracking-wider font-semibold transition-colors ${
                    isCurrentLabel
                      ? `bg-gradient-to-r ${lConfig.textGradient} bg-clip-text text-transparent`
                      : 'text-muted-foreground/40'
                  }`}
                >
                  {lk}
                </span>
              );
            })}
          </div>
        </div>

        {/* ── 3. Próximo marco ─────────────────────────────────────────── */}
        {!isAtTop ? (
          <NextMilestone
            journeyProgress={journeyProgress}
            accentColor={currentConfig.accentColor}
          />
        ) : (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
            <EliteIcon size={14} className="text-yellow-300 shrink-0" />
            <p className="text-xs text-yellow-300 font-medium">Status ELITE atingido — manutenção em andamento</p>
          </div>
        )}
      </motion.div>

      {/* ─── SHEET DE DETALHES ───────────────────────────────────────────── */}
      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <span className={`bg-gradient-to-r ${currentConfig.textGradient} bg-clip-text text-transparent font-bold`}>
                {currentConfig.title}
              </span>
              <span className="text-muted-foreground font-normal text-sm">— {currentConfig.subtitle}</span>
            </SheetTitle>
          </SheetHeader>

          {/* Frase motivacional */}
          <p className="text-sm italic text-muted-foreground border-l-2 border-primary/40 pl-3 mb-5 opacity-80">
            "{currentConfig.motivation}"
          </p>

          {/* Jornada de Evolução */}
          <div className="mb-5">
            <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Swords className="w-4 h-4 text-primary" />
              Jornada de Evolução
            </h4>
            <div className="flex items-end justify-between mb-3 px-1">
              {LEVELS_ORDER.map((levelKey, index) => {
                const config = LEVEL_CONFIG[levelKey];
                const isCompleted = index < journeyProgress.currentLevelIndex;
                const isCurrent = index === journeyProgress.currentLevelIndex;
                const isLocked = index > journeyProgress.currentLevelIndex;
                const levelRule = journeyProgress.allLevels.find((l: any) => l.level_key === levelKey);
                const requiresRace = levelRule?.official_race_required || false;
                const isRaceLocked = requiresRace && !journeyProgress.hasOfficialRace && index > journeyProgress.currentLevelIndex;

                return (
                  <motion.div
                    key={levelKey}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="flex flex-col items-center gap-1.5 cursor-pointer"
                    onClick={() => setSelectedLevel(levelKey)}
                  >
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      className={`
                        w-12 h-12 rounded-2xl flex items-center justify-center relative
                        ${isCurrent
                          ? `bg-gradient-to-br ${config.gradient} shadow-lg ring-2 ring-white/40`
                          : isCompleted
                            ? `bg-gradient-to-br ${config.gradient} opacity-75`
                            : 'bg-secondary/70 border-2 border-border/40'
                        }
                      `}
                    >
                      {isLocked ? (
                        <div className="relative">
                          <div className="opacity-30">{config.nodeIcon}</div>
                          {isRaceLocked && <div className="absolute -bottom-1 -right-1"><EliteIcon size={10} className="text-amber-400/60" /></div>}
                        </div>
                      ) : isCompleted ? (
                        <div className="relative">
                          {config.nodeIcon}
                          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-3 h-3 flex items-center justify-center">
                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-white drop-shadow-lg">{config.nodeIcon}</span>
                      )}
                      {isCurrent && (
                        <motion.div
                          className={`absolute -inset-1 rounded-2xl bg-gradient-to-br ${config.gradient} opacity-30 -z-10 blur-sm`}
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                    <span className={`text-[9px] font-semibold uppercase tracking-wider ${
                      isCurrent
                        ? `bg-gradient-to-r ${config.textGradient} bg-clip-text text-transparent`
                        : isLocked
                          ? 'text-muted-foreground/35'
                          : 'text-muted-foreground/70'
                    }`}>
                      {levelKey}
                    </span>
                  </motion.div>
                );
              })}
            </div>
            <RulerBar
              fillPercentage={fillPercentage}
              gradient={currentConfig.gradient}
              segmentPercents={segmentPercents}
            />
          </div>

          {/* Métricas de impacto */}
          <div className="mb-5">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Métricas que impactam seu nível
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <MetricCard
                icon={TrendingUp}
                label="Benchmarks"
                value={benchmarksCompleted}
                total={benchmarksRequired}
                highlight={benchmarksCompleted >= benchmarksRequired}
                delay={0.1}
              />
              <MetricCard
                icon={Activity}
                label="Sessões"
                value={sessionsCompleted}
                total={sessionsRequired}
                highlight={sessionsCompleted >= sessionsRequired}
                delay={0.15}
              />
              <MetricCard
                icon={Flame}
                label="Consist."
                value={Math.min(sessionsCompleted, 4)}
                total={4}
                highlight={sessionsCompleted >= sessionsRequired}
                delay={0.2}
              />
            </div>
          </div>

          {/* Gap para Elite */}
          {!isAtTop && (
            <div className="mb-4">
              <EliteGapBadge journeyProgress={journeyProgress} accentColor={currentConfig.accentColor} />
            </div>
          )}

          {/* Links de explicação */}
          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <StatusExplainerModal />
            <NextLevelModal journeyProgress={journeyProgress} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Level Node Sheet */}
      {selectedLevel && (
        <LevelDetailSheet
          levelKey={selectedLevel}
          isOpen={!!selectedLevel}
          onClose={() => setSelectedLevel(null)}
          allLevels={journeyProgress.allLevels}
          journeyProgress={journeyProgress}
        />
      )}
    </div>
  );
}
