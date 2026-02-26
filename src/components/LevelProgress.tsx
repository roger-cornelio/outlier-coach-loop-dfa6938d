import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Lock, 
  Target, Shield,
  Crown, CheckCircle2, AlertTriangle, Dumbbell, XCircle
} from 'lucide-react';
import { useState } from 'react';
import { StatusCrownPreset } from '@/components/ui/StatusCrownPreset';
import { StatusExplainerModal } from '@/components/StatusExplainerModal';
import { NextLevelModal } from '@/components/NextLevelModal';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useJourneyProgress, type ExtendedLevelKey } from '@/hooks/useJourneyProgress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';

// Extended level configuration with ELITE
interface LevelVisualConfig {
  icon: React.ReactNode;
  heroIcon: React.ReactNode;
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
}

const LEVEL_CONFIG: Record<ExtendedLevelKey, LevelVisualConfig> = {
  OPEN: {
    icon: <Trophy className="w-5 h-5" />,
    heroIcon: <Trophy className="w-28 h-28" />,
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
  },
  PRO: {
    icon: <StatusCrownPreset size="sm" />,
    heroIcon: <StatusCrownPreset size="hero" />,
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
  },
  ELITE: {
    icon: <Crown className="w-5 h-5" />,
    heroIcon: <Crown className="w-32 h-32" />,
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
  },
};

// Heraldic shield SVG shapes per level
function ShieldCrest({ level, active, className }: { level: ExtendedLevelKey; active: boolean; className?: string }) {
  const configs: Record<ExtendedLevelKey, { path: string; inner: React.ReactNode; gradient: [string, string] }> = {
    OPEN: {
      // Classic pointed shield
      path: 'M50 2 L95 20 L95 55 Q95 85 50 98 Q5 85 5 55 L5 20 Z',
      inner: (
        <g>
          <path d="M50 30 L58 46 L76 46 L62 56 L67 72 L50 62 L33 72 L38 56 L24 46 L42 46 Z" 
            fill={active ? 'white' : 'currentColor'} opacity={active ? 0.9 : 0.3} />
        </g>
      ),
      gradient: ['#a855f7', '#7c3aed'],
    },
    PRO: {
      // Ornate shield with top crest
      path: 'M50 0 L55 8 L65 4 L62 14 L72 14 L66 22 L78 26 L95 30 L95 58 Q95 85 50 98 Q5 85 5 58 L5 30 L22 26 L34 22 L28 14 L38 14 L35 4 L45 8 Z',
      inner: (
        <g>
          <path d="M38 40 L50 32 L62 40 L62 60 L50 68 L38 60 Z" 
            fill="none" stroke={active ? 'white' : 'currentColor'} strokeWidth="2" opacity={active ? 0.9 : 0.3} />
          <path d="M50 44 L54 50 L50 56 L46 50 Z" 
            fill={active ? 'white' : 'currentColor'} opacity={active ? 0.8 : 0.2} />
        </g>
      ),
      gradient: ['#f59e0b', '#d97706'],
    },
    ELITE: {
      // Royal shield with crown top
      path: 'M30 0 L34 10 L42 6 L44 14 L50 8 L56 14 L58 6 L66 10 L70 0 L80 8 L95 22 L95 58 Q95 88 50 98 Q5 88 5 58 L5 22 L20 8 Z',
      inner: (
        <g>
          {/* Crown */}
          <path d="M35 34 L40 42 L45 36 L50 44 L55 36 L60 42 L65 34 L65 46 L35 46 Z" 
            fill={active ? 'white' : 'currentColor'} opacity={active ? 0.9 : 0.3} />
          {/* Diamond below */}
          <path d="M50 50 L58 58 L50 70 L42 58 Z" 
            fill={active ? 'white' : 'currentColor'} opacity={active ? 0.7 : 0.2} />
        </g>
      ),
      gradient: ['#facc15', '#eab308'],
    },
  };

  const c = configs[level];
  const id = `shield-grad-${level}`;

  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? c.gradient[0] : 'hsl(var(--muted-foreground))'} stopOpacity={active ? 1 : 0.15} />
          <stop offset="100%" stopColor={active ? c.gradient[1] : 'hsl(var(--muted-foreground))'} stopOpacity={active ? 0.8 : 0.08} />
        </linearGradient>
        {active && (
          <filter id={`glow-${level}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      {/* Shield shape */}
      <path 
        d={c.path} 
        fill={`url(#${id})`} 
        stroke={active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)'}
        strokeWidth="1.5"
        filter={active ? `url(#glow-${level})` : undefined}
      />
      {/* Inner emblem */}
      {c.inner}
    </svg>
  );
}

const LEVELS_ORDER: ExtendedLevelKey[] = ['OPEN', 'PRO', 'ELITE'];

const LEVEL_LABELS: Record<ExtendedLevelKey, string> = {
  OPEN: 'OPEN',
  PRO: 'PRO',
  ELITE: 'ELITE',
};

// Particle effect component
const Particles = ({ color, count = 6 }: { color: string; count?: number }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        className={`absolute w-2 h-2 rounded-full ${color} opacity-60`}
        initial={{ 
          x: Math.random() * 100 + '%', 
          y: '100%',
          scale: Math.random() * 0.5 + 0.5
        }}
        animate={{ 
          y: '-20%',
          opacity: [0.6, 0.8, 0],
          scale: [1, 0.5, 0]
        }}
        transition={{ 
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 2,
          ease: 'easeOut'
        }}
      />
    ))}
  </div>
);

// Level Node Tooltip Sheet
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
  const needsRace = levelRule.official_race_required && levelKey !== 'OPEN';
  
  // Checklist for this level
  const trainingMet = journeyProgress.trainingSessions >= levelRule.training_min_sessions;
  const benchmarksMet = (progressData?.benchmarksCompleted || 0) >= levelRule.benchmarks_required;
  const categoryIdx = LEVELS_ORDER.indexOf(journeyProgress.category);
  const levelIdx = LEVELS_ORDER.indexOf(levelKey);
  const raceMet = !needsRace || (journeyProgress.hasOfficialRace && categoryIdx >= levelIdx);
  
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
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                Seu nível
              </span>
            )}
            {isTarget && !isCurrent && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                Objetivo
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 pb-6">
          {/* Checklist de requisitos */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Requisitos para OUTLIER {levelKey}</h4>
            
            <div className="grid gap-3">
              {/* Treinos */}
              <div className="p-3 bg-secondary/30 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm flex items-center gap-2">
                    {trainingMet ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Dumbbell className="w-4 h-4" />}
                    Treinos
                  </span>
                  <span className={`text-sm font-semibold ${trainingMet ? 'text-green-400' : ''}`}>
                    {journeyProgress.trainingSessions} / {levelRule.training_min_sessions}
                  </span>
                </div>
                {progressData && (
                  <Progress value={progressData.trainingProgress * 100} className="h-1.5" />
                )}
              </div>
              
              {/* Benchmarks */}
              <div className="p-3 bg-secondary/30 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm flex items-center gap-2">
                    {benchmarksMet ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Target className="w-4 h-4" />}
                    Benchmarks OUTLIER
                  </span>
                  <span className={`text-sm font-semibold ${benchmarksMet ? 'text-green-400' : ''}`}>
                    {progressData ? `${progressData.benchmarksCompleted} / ` : ''}{levelRule.benchmarks_required}
                  </span>
                </div>
                {progressData && (
                  <Progress value={progressData.benchmarkProgress * 100} className="h-1.5" />
                )}
              </div>
              
              {/* Prova oficial */}
              {needsRace && (
                <div className={`p-3 rounded-xl flex items-center justify-between ${
                  raceMet
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  <span className="text-sm flex items-center gap-2">
                    {raceMet ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-amber-400" />}
                    Prova oficial {levelKey}
                  </span>
                  {raceMet ? (
                    <span className="text-green-400 text-sm font-semibold">OK</span>
                  ) : (
                    <span className="text-amber-400 text-sm font-semibold">Pendente</span>
                  )}
                </div>
              )}
              
              {/* OPEN doesn't need race */}
              {!needsRace && (
                <div className="p-3 bg-secondary/30 rounded-xl flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Prova oficial
                  </span>
                  <span className="text-sm text-muted-foreground">Não obrigatória</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function LevelProgress() {
  const athleteStatus = useAthleteStatus();
  const journeyProgress = useJourneyProgress();
  const [selectedLevel, setSelectedLevel] = useState<ExtendedLevelKey | null>(null);
  
  // Map current status to extended level key for visual config
  const currentLevelKey = journeyProgress.currentLevelKey;
  const targetLevelKey = journeyProgress.targetLevelKey;
  const currentConfig = LEVEL_CONFIG[currentLevelKey];
  const targetConfig = LEVEL_CONFIG[targetLevelKey];
  const isElite = currentLevelKey === 'ELITE';
  const isPro = currentLevelKey === 'PRO';
  const isHyrox = currentLevelKey === 'OPEN' || isPro || isElite;
  const isAtTop = journeyProgress.isAtTop;

  // fillPercentage no longer needed — shields replaced the ruler

  return (
    <div className="space-y-6">
      {/* HERO CARD */}
      <motion.div
        key={currentLevelKey}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`
          relative overflow-hidden rounded-3xl 
          ${currentConfig.cardStyle}
          border ${currentConfig.borderStyle}
          ${isElite ? 'animate-level-pulse' : ''}
        `}
        style={{ backgroundImage: currentConfig.bgPattern }}
      >
        {/* Particles for higher levels */}
        {isHyrox && (
          <Particles color={currentConfig.particleColor} count={isElite ? 12 : 8} />
        )}

        {/* Ambient glow */}
        <div className={`absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br ${currentConfig.gradient} rounded-full blur-3xl opacity-20`} />
        {isHyrox && (
          <div className={`absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-br ${currentConfig.gradient} rounded-full blur-3xl opacity-15`} />
        )}

        <div className="relative z-10 p-6 md:p-8">
          {/* Top section with icon and level */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2 flex items-center gap-2"
              >
                {journeyProgress.isOutlier ? 'ATLETA OUTLIER' : 'Sua Categoria'}
                <StatusExplainerModal />
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className={`font-display text-4xl md:text-5xl lg:text-6xl bg-gradient-to-r ${currentConfig.textGradient} bg-clip-text text-transparent tracking-tight`}
              >
                {journeyProgress.isOutlier ? 'OUTLIER' : currentConfig.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground mt-1 text-sm md:text-base"
              >
                {journeyProgress.isOutlier 
                  ? `Categoria ${journeyProgress.category}`
                  : currentConfig.subtitle
                }
              </motion.p>
            </div>

            {/* Hero Icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className={`relative ${currentConfig.iconAnimation}`}
            >
              <div className={`text-white`}>
                {currentConfig.heroIcon}
              </div>
              <div className={`absolute inset-0 bg-gradient-to-br ${currentConfig.gradient} blur-2xl opacity-30 -z-10`} />
            </motion.div>
          </div>

          {/* Counters Section - Treinos & Benchmarks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6 space-y-3"
          >
            {/* Treinos counter */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Dumbbell className="w-4 h-4" />
                  Treinos
                </span>
                <span className={`font-display text-lg ${
                  journeyProgress.trainingSessions >= (journeyProgress.targetLevel.trainingRequired)
                    ? 'text-green-400' : ''
                }`}>
                  {journeyProgress.trainingSessions} / {journeyProgress.targetLevel.trainingRequired}
                </span>
              </div>
              <Progress value={Math.max(journeyProgress.targetLevel.trainingProgress > 0 ? 2 : 0, journeyProgress.targetLevel.trainingProgress * 100)} className="h-2" />
            </div>
            
            {/* Benchmarks counter */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Target className="w-4 h-4" />
                  Benchmarks
                </span>
                <span className={`font-display text-lg ${
                  journeyProgress.targetLevel.benchmarksCompleted >= journeyProgress.targetLevel.benchmarksRequired
                    ? 'text-green-400' : ''
                }`}>
                  {journeyProgress.targetLevel.benchmarksCompleted} / {journeyProgress.targetLevel.benchmarksRequired}
                </span>
              </div>
              <Progress value={journeyProgress.targetLevel.benchmarkProgress * 100} className="h-2" />
            </div>

            {/* Target level label */}
            <p className="text-sm text-muted-foreground mt-1">
              {isAtTop ? (
                'manutenção do status'
              ) : (
                <>
                  rumo ao <span className={`font-semibold ${LEVEL_CONFIG[targetLevelKey].textGradient.includes('yellow') ? 'text-yellow-300' : LEVEL_CONFIG[targetLevelKey].textGradient.includes('amber') ? 'text-amber-400' : 'text-purple-400'}`}>{journeyProgress.targetLevelLabel}</span>
                </>
              )}
            </p>
          </motion.div>

          {/* Missing requirements checklist */}
          <AnimatePresence>
            {journeyProgress.missingRequirements.length > 0 && !isAtTop && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 bg-secondary/30 border border-border/30 rounded-xl"
              >
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                  Para virar {journeyProgress.targetLevelKey}:
                </p>
                <div className="space-y-1">
                  {/* Training check */}
                  <div className="flex items-center gap-2 text-sm">
                    {journeyProgress.nextRequirements.treinosRestantes === 0 
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : <XCircle className="w-4 h-4 text-amber-400" />
                    }
                    <span>{journeyProgress.targetLevel.trainingRequired} treinos</span>
                  </div>
                  {/* Benchmark check */}
                  <div className="flex items-center gap-2 text-sm">
                    {journeyProgress.nextRequirements.benchmarksRestantes === 0 
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : <XCircle className="w-4 h-4 text-amber-400" />
                    }
                    <span>{journeyProgress.targetLevel.benchmarksRequired} benchmarks</span>
                  </div>
                  {/* Race check (if needed) */}
                  {journeyProgress.targetLevel.officialRaceRequired && (
                    <div className="flex items-center gap-2 text-sm">
                      {journeyProgress.nextRequirements.provaNecessaria 
                        ? <XCircle className="w-4 h-4 text-amber-400" />
                        : <CheckCircle2 className="w-4 h-4 text-green-400" />
                      }
                      <span>Prova oficial {journeyProgress.targetLevelKey}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Motivation Quote */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-sm italic text-muted-foreground border-l-2 border-current pl-3 opacity-70"
          >
            "{currentConfig.motivation}"
          </motion.p>
        </div>
      </motion.div>

      {/* Level Shields - 3 CATEGORIES */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative"
      >
        <h3 className="font-display text-xl mb-5 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Jornada de Evolução
        </h3>
        
        <div className="grid grid-cols-3 gap-3">
          {LEVELS_ORDER.map((levelKey, index) => {
            const config = LEVEL_CONFIG[levelKey];
            const isCompleted = index < journeyProgress.currentLevelIndex;
            const isCurrent = index === journeyProgress.currentLevelIndex;
            const isLocked = index > journeyProgress.currentLevelIndex;
            const levelRule = journeyProgress.allLevels.find((l: any) => l.level_key === levelKey);
            const requiresRace = levelRule?.official_race_required && levelKey !== 'OPEN';
            const isExpanded = selectedLevel === levelKey;
            
            // Calculate per-level requirements
            const trainingReq = levelRule?.training_min_sessions || 120;
            const benchReq = levelRule?.benchmarks_required || 3;
            const trainingDone = journeyProgress.trainingSessions;
            const benchDone = journeyProgress.targetLevel.benchmarksCompleted;
            const trainingMet = trainingDone >= trainingReq;
            const benchMet = benchDone >= benchReq;
            const categoryIdx = LEVELS_ORDER.indexOf(journeyProgress.category);
            const raceMet = !requiresRace || (journeyProgress.hasOfficialRace && categoryIdx >= index);
            
            return (
              <motion.div
                key={levelKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1, type: 'spring', stiffness: 200 }}
                className="flex flex-col items-center"
              >
                {/* Heraldic Shield Crest */}
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedLevel(isExpanded ? null : levelKey)}
                  className="relative w-full max-w-[110px] md:max-w-[130px] transition-all duration-500 bg-transparent border-none"
                >
                  <ShieldCrest 
                    level={levelKey} 
                    active={isCurrent || isCompleted} 
                    className={`w-full h-auto drop-shadow-lg ${isLocked ? 'opacity-40' : ''} ${
                      isCurrent ? 'drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]' : ''
                    }`}
                  />
                  
                  {/* Lock overlay for locked levels */}
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* Current pulse */}
                  {isCurrent && (
                    <motion.div
                      animate={{ opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <ShieldCrest level={levelKey} active={true} className="w-full h-auto opacity-30 blur-sm" />
                    </motion.div>
                  )}
                </motion.button>

                {/* Level name + status label */}
                <div className="mt-1 text-center">
                  <p className={`text-sm md:text-base font-display font-bold tracking-wider ${
                    isCurrent 
                      ? `bg-gradient-to-r ${config.textGradient} bg-clip-text text-transparent` 
                      : isCompleted
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground/30'
                  }`}>
                    {levelKey}
                  </p>
                  <p className={`text-[9px] uppercase tracking-widest mt-0.5 ${
                    isCurrent ? 'text-muted-foreground' : 'text-muted-foreground/30'
                  }`}>
                    {isCurrent && journeyProgress.isOutlier ? 'OUTLIER' : isCurrent ? 'ATUAL' : isCompleted ? 'CONQUISTADO' : 'BLOQUEADO'}
                  </p>
                </div>

                {/* Expandable requirements inside */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="w-full overflow-hidden mt-2"
                    >
                      <div className="p-2 bg-secondary/40 rounded-xl border border-border/30 space-y-1.5">
                        {/* Treinos */}
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {trainingMet 
                            ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                            : <Dumbbell className="w-3 h-3 text-muted-foreground shrink-0" />
                          }
                          <span className={trainingMet ? 'text-green-400' : 'text-muted-foreground'}>
                            {isCurrent ? `${trainingDone}/` : ''}{trainingReq} treinos
                          </span>
                        </div>
                        {/* Benchmarks */}
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {benchMet 
                            ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                            : <Target className="w-3 h-3 text-muted-foreground shrink-0" />
                          }
                          <span className={benchMet ? 'text-green-400' : 'text-muted-foreground'}>
                            {isCurrent ? `${benchDone}/` : ''}{benchReq} benchmarks
                          </span>
                        </div>
                        {/* Prova */}
                        {requiresRace && (
                          <div className="flex items-center gap-1.5 text-[10px]">
                            {raceMet 
                              ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                              : <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                            }
                            <span className={raceMet ? 'text-green-400' : 'text-amber-400'}>
                              Prova {levelKey}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
        
        {/* Race notice */}
        {!journeyProgress.hasOfficialRace && !isAtTop && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs text-muted-foreground mt-4"
          >
            🏆 PRO e ELITE exigem prova oficial
          </motion.p>
        )}
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

      {/* Stats Grid - Treinos & Benchmarks */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { Icon: Dumbbell, value: journeyProgress.trainingSessions, label: 'Treinos', delay: 0.4 },
          { Icon: Target, value: journeyProgress.targetLevel.benchmarksCompleted, label: 'Benchmarks', delay: 0.5 },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay }}
            className={`p-4 rounded-2xl ${currentConfig.cardStyle} border ${currentConfig.borderStyle} text-center`}
          >
            <stat.Icon className={`w-5 h-5 mx-auto mb-2`} />
            <p className="font-display text-2xl">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Next Level Button + Modal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <NextLevelModal journeyProgress={journeyProgress} />
      </motion.div>
    </div>
  );
}
