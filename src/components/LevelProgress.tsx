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
// OPEN  → Corredor (atleta em movimento, corrida)
// PRO   → Atleta com Kettlebell/Sled (força + velocidade)
// ELITE → Pódio com raio (topo absoluto da competição)

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

// OPEN: Corredor em movimento (HYROX é uma prova de corrida + funcionais)
const OpenIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {/* Cabeça */}
    <circle cx="14" cy="3.5" r="1.5" fill="currentColor" stroke="none" />
    {/* Corpo em movimento de corrida */}
    <path d="M12 6l-2 3 3 2-1.5 4" />
    {/* Braços */}
    <path d="M10 9l-2.5 1.5M14 11l2 -2" />
    {/* Pernas */}
    <path d="M10.5 15l-2 3M12.5 15l2.5 2.5" />
    {/* Rastro de movimento */}
    <path d="M4 8.5h2.5M3.5 11h2M4.5 13.5h1.5" opacity="0.4" strokeWidth="1.2" />
  </svg>
);

// PRO: Atleta com kettlebell (força funcional — sled, farmers, etc.)
const ProIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {/* Cabeça */}
    <circle cx="12" cy="3.5" r="1.5" fill="currentColor" stroke="none" />
    {/* Tronco atlético */}
    <path d="M12 5.5v5" />
    {/* Braços levantando peso */}
    <path d="M8 8l4 2.5 4-2.5" />
    <path d="M8 8l-1-2M16 8l1-2" />
    {/* Kettlebell/peso */}
    <rect x="5.5" y="4" width="3" height="2.5" rx="0.8" fill="currentColor" stroke="none" opacity="0.9" />
    <rect x="15.5" y="4" width="3" height="2.5" rx="0.8" fill="currentColor" stroke="none" opacity="0.9" />
    <path d="M5.5 4.5h-1M19.5 4.5h1" strokeWidth="2" />
    {/* Pernas em posição de força */}
    <path d="M10.5 10.5l-1.5 5M13.5 10.5l1.5 5" />
    <path d="M9 15.5l-1 2M15 15.5l1 2" />
  </svg>
);

// ELITE: Pódio com raio (topo absoluto, performance máxima)
const EliteIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {/* Raio central (velocidade, energia máxima) */}
    <path d="M13 2l-5 8h4l-2 12 9-12h-5l3-8z" fill="currentColor" stroke="none" opacity="0.95" />
    {/* Estrelas ao redor */}
    <path d="M3 5l1 2-2 1 2 1-1 2 2-1 1 2 1-2 2 1-1-2 2-1-2-1 1-2-2 1z" fill="currentColor" stroke="none" opacity="0.5" transform="scale(0.5) translate(1, 3)" />
    <circle cx="4" cy="10" r="0.8" fill="currentColor" stroke="none" opacity="0.4" />
    <circle cx="20" cy="14" r="0.8" fill="currentColor" stroke="none" opacity="0.4" />
    <circle cx="19" cy="5" r="1" fill="currentColor" stroke="none" opacity="0.3" />
  </svg>
);

const OpenHeroIcon = () => (
  <div className="relative flex items-center justify-center">
    <OpenIcon size={72} className="opacity-95" />
  </div>
);

const ProHeroIcon = () => (
  <div className="relative flex items-center justify-center">
    <ProIcon size={72} className="opacity-95" />
  </div>
);

const EliteHeroIcon = () => (
  <div className="relative flex items-center justify-center">
    <EliteIcon size={72} className="opacity-95" />
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
    bgPattern: 'radial-gradient(ellipse at top, hsl(50 60% 25% / 0.9), transparent 50%), radial-gradient(ellipse at bottom, hsl(45 50% 20% / 0.6), transparent 50%)',
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
          className={`absolute w-2 h-2 rounded-full`}
          style={{
            backgroundColor: color,
            left: '50%',
            top: '50%',
          }}
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
        initial={{ x: Math.random() * 100 + '%', y: '100%', scale: Math.random() * 0.5 + 0.5 }}
        animate={{ y: '-20%', opacity: [0.6, 0.8, 0], scale: [1, 0.5, 0] }}
        transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2, ease: 'easeOut' }}
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
      <div
        className="relative h-6 rounded-full overflow-hidden"
        style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)', background: 'hsl(var(--secondary)/0.6)' }}
      >
        {/* Fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${fillPercentage}%` }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.4 }}
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${gradient} rounded-full shadow-lg`}
        >
          {/* Shine */}
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
            className="absolute top-0 bottom-0 w-px bg-white/20 z-10"
            style={{ left: `${pct}%` }}
          />
        ))}
      </div>

      {/* Level labels below bar */}
      <div className="flex justify-between mt-1 px-0">
        {LEVELS_ORDER.map((key) => (
          <span key={key} className="text-[9px] font-semibold text-muted-foreground/60 tracking-wider">
            {key}
          </span>
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
  detail,
  progress,
  accentColor,
  delay,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  total?: number;
  detail?: string;
  progress?: number; // 0–100
  accentColor: string;
  delay: number;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`relative rounded-2xl p-4 border overflow-hidden ${
        highlight
          ? 'bg-primary/10 border-primary/30'
          : 'bg-secondary/30 border-border/40'
      }`}
    >
      {/* Icon row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: accentColor }} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        {highlight && (
          <Star className="w-3 h-3" style={{ color: accentColor }} fill={accentColor} />
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-display font-bold" style={{ color: accentColor }}>
          {value}
        </span>
        {total !== undefined && (
          <span className="text-sm text-muted-foreground">/ {total}</span>
        )}
      </div>

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="h-2 bg-secondary/60 rounded-full overflow-hidden mb-1" style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: delay + 0.3 }}
            className="h-full rounded-full"
            style={{ background: accentColor }}
          >
            <div className="absolute inset-x-0 top-0 h-1/2 bg-white/25 rounded-t-full" />
          </motion.div>
        </div>
      )}

      {/* Detail */}
      {detail && (
        <p className="text-[10px] text-muted-foreground/70 leading-tight">{detail}</p>
      )}
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

  // Determinar o que falta mais
  const benchmarksMissing = Math.max(0, tl.benchmarksRequired - tl.benchmarksCompleted);
  const sessionsMissing = Math.max(0, tl.trainingRequired - tl.trainingSessions);

  let milestoneText = '';
  let milestoneIcon = Target;

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
    milestoneText = 'Registre uma prova oficial para avançar';
    milestoneIcon = Trophy;
  } else {
    milestoneText = 'Continue treinando — você está no caminho certo!';
    milestoneIcon = Sparkles;
  }

  const Icon = milestoneIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border/30"
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: accentColor + '22' }}>
        <Icon className="w-4 h-4" style={{ color: accentColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
          Próximo marco
        </p>
        <p className="text-sm font-medium text-foreground leading-tight truncate">
          {milestoneText}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
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
      transition={{ delay: 0.55 }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border"
      style={{ background: '#eab30811', borderColor: '#eab30830' }}
    >
      <Diamond className="w-4 h-4 shrink-0" style={{ color: '#eab308' }} />
      <p className="text-xs text-muted-foreground flex-1">
        <span className="font-semibold" style={{ color: '#eab308' }}>Falta para ELITE: </span>
        {benchmarkGap > 0 && <span>{benchmarkGap} bench{benchmarkGap > 1 ? 's' : ''}</span>}
        {benchmarkGap > 0 && sessionGap > 0 && <span className="text-muted-foreground/50 mx-1">·</span>}
        {sessionGap > 0 && <span>{sessionGap} treinos</span>}
      </p>
    </motion.div>
  );
}

// ─── Level Node Sheet ────────────────────────────────────────────────────────
function LevelNodeSheet({ 
  levelKey, 
  isOpen, 
  onClose, 
  allLevels,
  journeyProgress 
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
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white`}>
              {config.icon}
            </div>
            <span className={`bg-gradient-to-r ${config.textGradient} bg-clip-text text-transparent`}>
              {levelRule.label}
            </span>
            {isCurrent && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Seu nível</span>
            )}
            {isTarget && !isCurrent && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Objetivo</span>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 pb-6">
          <div className="grid gap-3">
            <div className="p-3 bg-secondary/30 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Treinos
                </span>
                <span className="text-sm font-semibold">
                  {progressData ? `${progressData.trainingSessions}/` : ''}{levelRule.training_min_sessions}
                </span>
              </div>
              {progressData && <Progress value={progressData.trainingProgress * 100} className="h-1.5" />}
              <p className="text-xs text-muted-foreground mt-1">nos últimos {levelRule.training_window_days} dias</p>
            </div>
            
            <div className="p-3 bg-secondary/30 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Benchmarks OUTLIER
                </span>
                <span className="text-sm font-semibold">
                  {progressData ? `${progressData.benchmarksCompleted}/` : ''}{levelRule.benchmarks_required}
                </span>
              </div>
              {progressData && <Progress value={progressData.benchmarkProgress * 100} className="h-1.5" />}
            </div>
            
            {levelRule.official_race_required && (
              <div className={`p-3 rounded-xl flex items-center justify-between ${
                journeyProgress.hasOfficialRace
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-amber-500/10 border border-amber-500/20'
              }`}>
                <span className="text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Prova oficial
                </span>
                {journeyProgress.hasOfficialRace ? (
                  <span className="text-green-400 text-sm font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />OK
                  </span>
                ) : (
                  <span className="text-amber-400 text-sm font-semibold">Pendente</span>
                )}
              </div>
            )}
          </div>
          
          {isTarget && journeyProgress.isCapped && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-300 font-medium">
                    Progresso limitado a {levelRule.cap_without_official_race_percent}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Complete uma prova oficial para desbloquear.</p>
                </div>
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
  const [selectedLevel, setSelectedLevel] = useState<ExtendedLevelKey | null>(null);
  const [showLevelUpBurst, setShowLevelUpBurst] = useState(false);
  const prevLevelKey = useRef<ExtendedLevelKey | null>(null);
  
  const { 
    status, 
    rulerScore, 
    confidence, 
    progressToNextStatus, 
    nextStatus,
    eligibleForPromotion,
    benchmarksUsed,
    weeksWithGoodPerformance,
  } = athleteStatus;
  
  const currentLevelKey = journeyProgress.currentLevelKey;
  const targetLevelKey = journeyProgress.targetLevelKey;
  const currentConfig = LEVEL_CONFIG[currentLevelKey];
  const isElite = currentLevelKey === 'ELITE';
  const isPro = currentLevelKey === 'PRO';
  const isAtTop = journeyProgress.isAtTop;

  // Micro-animação ao subir de nível
  useEffect(() => {
    if (prevLevelKey.current && prevLevelKey.current !== currentLevelKey) {
      setShowLevelUpBurst(true);
      setTimeout(() => setShowLevelUpBurst(false), 1200);
    }
    prevLevelKey.current = currentLevelKey;
  }, [currentLevelKey]);

  // % real na barra OPEN→PRO→ELITE
  // Cada segmento ocupa 33.33% da barra
  const totalLevels = 3;
  const fillPercentage = journeyProgress.loading
    ? 0
    : Math.min(100, (journeyProgress.continuousPosition * 100));

  const segmentPercents = [33.33, 66.66]; // divisores entre OPEN|PRO e PRO|ELITE

  // Métricas de nível
  const tl = journeyProgress.targetLevel;
  const benchmarkProgress = tl ? Math.round(tl.benchmarkProgress * 100) : 0;
  const trainingProgress = tl ? Math.round(tl.trainingProgress * 100) : 0;

  // Consistência: semanas com STRONG+
  const consistencyPct = weeksWithGoodPerformance > 0
    ? Math.min(100, Math.round((weeksWithGoodPerformance / 8) * 100))
    : 0;

  // Melhor resultado: bucket com maior score
  const bestResult = benchmarkResults
    .filter((r) => r.completed && r.bucket)
    .sort((a, b) => {
      const order: Record<string, number> = { ELITE: 5, STRONG: 4, OK: 3, TOUGH: 2, DNF: 1 };
      return (order[b.bucket || ''] || 0) - (order[a.bucket || ''] || 0);
    })[0];

  const bucketLabels: Record<string, string> = {
    ELITE: '🏅 ELITE', STRONG: '💪 STRONG', OK: '✅ OK', TOUGH: '⚠️ TOUGH', DNF: '❌ DNF',
  };

  return (
    <div className="space-y-5">
      {/* ─── HERO CARD ─────────────────────────────────────────────────── */}
      <motion.div
        key={currentLevelKey}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`relative overflow-hidden rounded-3xl ${currentConfig.cardStyle} border ${currentConfig.borderStyle}`}
        style={{ backgroundImage: currentConfig.bgPattern }}
      >
        {/* Level-up burst */}
        <AnimatePresence>
          {showLevelUpBurst && (
            <LevelUpBurst color={currentConfig.accentColor} />
          )}
        </AnimatePresence>

        {/* Particles */}
        {(isPro || isElite) && (
          <Particles color={currentConfig.particleColor} count={isElite ? 12 : 7} />
        )}

        {/* Ambient glow */}
        <div className={`absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br ${currentConfig.gradient} rounded-full blur-3xl opacity-20`} />

        <div className="relative z-10 p-5 md:p-7">
          {/* Header: status + ícone */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <motion.p
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1 flex items-center gap-2"
              >
                Seu Status
                <StatusExplainerModal />
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className={`font-display text-4xl md:text-5xl bg-gradient-to-r ${currentConfig.textGradient} bg-clip-text text-transparent tracking-tight`}
              >
                {currentConfig.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-muted-foreground text-sm mt-0.5"
              >
                {currentConfig.subtitle}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 220 }}
              className={`text-white relative ${currentConfig.iconAnimation}`}
            >
              {currentConfig.heroIcon}
              <div className={`absolute inset-0 bg-gradient-to-br ${currentConfig.gradient} blur-2xl opacity-25 -z-10`} />
            </motion.div>
          </div>

          {/* Score + destino */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-4"
          >
            <div className="flex items-baseline gap-2">
              <span className={`font-display text-6xl md:text-7xl bg-gradient-to-r ${currentConfig.textGradient} bg-clip-text text-transparent`}>
                {journeyProgress.progressToTarget}
              </span>
              <span className="text-xl text-muted-foreground">/100</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAtTop ? 'manutenção do status ELITE' : (
                <>rumo ao <span className="font-semibold text-foreground">{journeyProgress.targetLevelLabel}</span></>
              )}
              {journeyProgress.isCapped && (
                <span className="text-amber-400 ml-1">(cap {journeyProgress.capPercent}%)</span>
              )}
            </p>
          </motion.div>

          {/* Gap para ELITE */}
          {!isAtTop && (
            <EliteGapBadge journeyProgress={journeyProgress} accentColor={currentConfig.accentColor} />
          )}

          {/* Melhor resultado */}
          {bestResult && bestResult.bucket && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 flex items-center gap-2"
            >
              <Star className="w-3 h-3 text-amber-400" fill="#f59e0b" />
              <span className="text-xs text-muted-foreground">
                Melhor resultado: <span className="font-semibold text-foreground">{bucketLabels[bestResult.bucket] || bestResult.bucket}</span>
              </span>
            </motion.div>
          )}

          {/* Cap Warning */}
          <AnimatePresence>
            {journeyProgress.isCapped && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">
                  Progresso limitado a {journeyProgress.capPercent}% — registre uma prova oficial para avançar.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Promotion Alert */}
          <AnimatePresence>
            {eligibleForPromotion && nextStatus && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center gap-3"
              >
                <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}>
                  <Sparkles className="w-5 h-5 text-green-400" />
                </motion.div>
                <div>
                  <p className="font-bold text-green-300 text-sm">Promoção disponível!</p>
                  <p className="text-xs text-green-300/80">Pronto para {LEVEL_NAMES[nextStatus]}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Motivation */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-4 text-xs italic text-muted-foreground border-l-2 border-current pl-3 opacity-60"
          >
            "{currentConfig.motivation}"
          </motion.p>
        </div>
      </motion.div>

      {/* ─── RÉGUA OPEN → PRO → ELITE com % real ────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <h3 className="font-display text-lg flex items-center gap-2">
          <Swords className="w-4 h-4 text-primary" />
          Jornada de Evolução
        </h3>

        {/* Nodes + Bar */}
        <div>
          {/* Nodes row */}
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
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + index * 0.08, type: 'spring' }}
                  className="relative flex flex-col items-center cursor-pointer"
                  onClick={() => setSelectedLevel(levelKey)}
                >
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    className={`
                      relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
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
                        <Lock className="w-4 h-4 text-muted-foreground/50" />
                        {isRaceLocked && <Trophy className="w-3 h-3 text-amber-400/60 absolute -bottom-1 -right-1" />}
                      </div>
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-white/90" />
                    ) : (
                      <span className="text-white drop-shadow-lg">{config.nodeIcon}</span>
                    )}

                    {/* Pulse do nível atual */}
                    {isCurrent && (
                      <motion.div
                        animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${config.gradient}`}
                      />
                    )}
                  </motion.div>

                  <p className={`mt-1.5 text-[9px] font-bold tracking-wider uppercase text-center ${
                    isCurrent
                      ? `bg-gradient-to-r ${config.textGradient} bg-clip-text text-transparent`
                      : isLocked
                        ? 'text-muted-foreground/35'
                        : 'text-muted-foreground/70'
                  }`}>
                    {levelKey}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Barra com % real */}
          <RulerBar
            fillPercentage={fillPercentage}
            gradient={currentConfig.gradient}
            segmentPercents={segmentPercents}
          />
        </div>

        {/* Race notice */}
        {!journeyProgress.hasOfficialRace && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[10px] text-muted-foreground">
            🏆 OPEN, PRO e ELITE exigem prova oficial
          </motion.p>
        )}
      </motion.div>

      {/* ─── PRÓXIMO MARCO ─────────────────────────────────────────────── */}
      {!isAtTop && (
        <NextMilestone journeyProgress={journeyProgress} accentColor={currentConfig.accentColor} />
      )}

      {/* ─── MÉTRICAS QUE IMPACTAM NÍVEL ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="space-y-3"
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Métricas que impactam seu nível
        </p>

        <div className="grid grid-cols-3 gap-2">
          <MetricCard
            icon={TrendingUp}
            label="Benchmarks"
            value={tl?.benchmarksCompleted ?? 0}
            total={tl?.benchmarksRequired}
            progress={benchmarkProgress}
            detail={`${benchmarkProgress}% do exigido`}
            accentColor={currentConfig.accentColor}
            delay={0.5}
          />
          <MetricCard
            icon={Activity}
            label="Sessões"
            value={tl?.trainingSessions ?? 0}
            total={tl?.trainingRequired}
            progress={trainingProgress}
            detail={`${tl?.trainingWindowDays ?? 180}d`}
            accentColor={currentConfig.accentColor}
            delay={0.55}
          />
          <MetricCard
            icon={Flame}
            label="Consist."
            value={weeksWithGoodPerformance}
            total={8}
            progress={consistencyPct}
            detail="sem. STRONG+"
            accentColor={currentConfig.accentColor}
            delay={0.6}
            highlight={weeksWithGoodPerformance >= 4}
          />
        </div>
      </motion.div>

      {/* Level Node Sheet */}
      {selectedLevel && (
        <LevelNodeSheet
          levelKey={selectedLevel}
          isOpen={!!selectedLevel}
          onClose={() => setSelectedLevel(null)}
          allLevels={journeyProgress.allLevels}
          journeyProgress={journeyProgress}
        />
      )}

      {/* Next Level Button + Modal */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
      >
        <NextLevelModal journeyProgress={journeyProgress} />
      </motion.div>
    </div>
  );
}
