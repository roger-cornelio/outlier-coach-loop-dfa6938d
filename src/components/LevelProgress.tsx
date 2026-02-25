import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Star, Zap, Flame, Lock, 
  TrendingUp, Target, Sparkles, Shield, Swords,
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

  // Calculate fill percentage for the continuous ruler
  const rawFill = journeyProgress.continuousPosition * 100;
  const fillPercentage = journeyProgress.loading 
    ? 0 
    : (rawFill > 0 ? Math.max(2, rawFill) : 0);

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

      {/* Level Journey Track - 3 LEVELS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative"
      >
        <h3 className="font-display text-xl mb-6 flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          Jornada de Evolução
        </h3>
        
        <div className="relative flex items-center justify-between py-4 px-2">
          {/* Track line (background) */}
          <div className="absolute top-1/2 left-8 right-8 h-2 bg-secondary/50 rounded-full -translate-y-1/2" />
          
          {/* Filled track line (progress) */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${fillPercentage}%` }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
            className={`absolute top-1/2 left-8 h-2 bg-gradient-to-r ${currentConfig.gradient} rounded-full -translate-y-1/2`}
            style={{ maxWidth: 'calc(100% - 4rem)' }}
          />

          {/* Level Nodes */}
          {LEVELS_ORDER.map((levelKey, index) => {
            const config = LEVEL_CONFIG[levelKey];
            const isCompleted = index < journeyProgress.currentLevelIndex;
            const isCurrent = index === journeyProgress.currentLevelIndex;
            const isLocked = index > journeyProgress.currentLevelIndex;
            const levelRule = journeyProgress.allLevels.find((l: any) => l.level_key === levelKey);
            const requiresRace = levelRule?.official_race_required && levelKey !== 'OPEN';
            
            const isRaceLocked = requiresRace && !journeyProgress.hasOfficialRace && index > journeyProgress.currentLevelIndex;
            const isTarget = index === journeyProgress.targetLevelIndex;

            return (
              <motion.div
                key={levelKey}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.08, type: 'spring' }}
                className="relative z-10 flex flex-col items-center cursor-pointer"
                onClick={() => setSelectedLevel(levelKey)}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center
                    transition-all duration-300
                    ${isCurrent 
                      ? `bg-gradient-to-br ${config.gradient} shadow-lg ring-2 ring-white/40` 
                      : isCompleted 
                        ? `bg-gradient-to-br ${config.gradient} opacity-80` 
                        : 'bg-secondary/80 border-2 border-border/50'
                    }
                  `}
                >
                  {isLocked ? (
                    <div className="relative">
                      <Lock className="w-4 h-4 text-muted-foreground/50" />
                      {isRaceLocked && (
                        <Trophy className="w-3 h-3 text-amber-400/60 absolute -bottom-1 -right-1" />
                      )}
                    </div>
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-white/90" />
                  ) : (
                    <span className="text-white drop-shadow-lg">{config.icon}</span>
                  )}
                  
                  {/* Current level pulse */}
                  {isCurrent && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${config.gradient}`}
                    />
                  )}
                  
                  {/* Progress indicator within current level */}
                  {isCurrent && !isAtTop && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-black/30 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${journeyProgress.progressToTarget}%` }}
                        transition={{ duration: 1, delay: 1 }}
                        className={`h-full bg-gradient-to-r ${config.gradient}`}
                      />
                    </div>
                  )}
                </motion.div>

                {/* Level label */}
                <p className={`mt-2 text-[10px] md:text-xs font-semibold text-center leading-tight ${
                  isCurrent 
                    ? `bg-gradient-to-r ${config.textGradient} bg-clip-text text-transparent` 
                    : isLocked 
                      ? 'text-muted-foreground/40' 
                      : 'text-muted-foreground'
                }`}>
                  {LEVEL_LABELS[levelKey].split(' ').map((word, i) => (
                    <span key={i} className="block">{word}</span>
                  ))}
                </p>
              </motion.div>
            );
          })}
        </div>
        
        {/* Race requirement notice */}
        {!journeyProgress.hasOfficialRace && !isAtTop && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs text-muted-foreground mt-2"
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
