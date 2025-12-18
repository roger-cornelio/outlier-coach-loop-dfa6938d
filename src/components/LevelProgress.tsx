import { motion } from 'framer-motion';
import { 
  Trophy, Star, Zap, Crown, Flame, Lock, ChevronRight, 
  TrendingUp, Target, Sparkles 
} from 'lucide-react';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { LEVEL_NAMES, type AthleteStatus } from '@/types/outlier';
import { STATUS_THRESHOLDS, CONFIDENCE_LABELS } from '@/utils/athleteStatusSystem';

// Level configuration with visual details
const LEVEL_CONFIG: Record<AthleteStatus, {
  icon: React.ReactNode;
  color: string;
  gradient: string;
  bgGradient: string;
  glowColor: string;
  description: string;
  emoji: string;
}> = {
  iniciante: {
    icon: <Star className="w-6 h-6" />,
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-cyan-400',
    bgGradient: 'from-blue-500/20 to-cyan-500/10',
    glowColor: 'shadow-blue-500/30',
    description: 'Primeiros passos na jornada',
    emoji: '🌱',
  },
  intermediario: {
    icon: <Zap className="w-6 h-6" />,
    color: 'text-green-400',
    gradient: 'from-green-500 to-emerald-400',
    bgGradient: 'from-green-500/20 to-emerald-500/10',
    glowColor: 'shadow-green-500/30',
    description: 'Fundamentos sólidos',
    emoji: '💪',
  },
  avancado: {
    icon: <Flame className="w-6 h-6" />,
    color: 'text-orange-400',
    gradient: 'from-orange-500 to-amber-400',
    bgGradient: 'from-orange-500/20 to-amber-500/10',
    glowColor: 'shadow-orange-500/30',
    description: 'Performance consistente',
    emoji: '🔥',
  },
  hyrox_open: {
    icon: <Trophy className="w-6 h-6" />,
    color: 'text-purple-400',
    gradient: 'from-purple-500 to-pink-400',
    bgGradient: 'from-purple-500/20 to-pink-500/10',
    glowColor: 'shadow-purple-500/30',
    description: 'Pronto para competir',
    emoji: '🏆',
  },
  hyrox_pro: {
    icon: <Crown className="w-6 h-6" />,
    color: 'text-amber-400',
    gradient: 'from-amber-400 to-yellow-300',
    bgGradient: 'from-amber-500/20 to-yellow-500/10',
    glowColor: 'shadow-amber-500/30',
    description: 'Elite competitiva',
    emoji: '👑',
  },
};

const LEVELS_ORDER: AthleteStatus[] = ['iniciante', 'intermediario', 'avancado', 'hyrox_open', 'hyrox_pro'];

export function LevelProgress() {
  const { 
    status, 
    rulerScore, 
    confidence, 
    progressToNextStatus, 
    nextStatus,
    eligibleForPromotion,
    benchmarksUsed,
    weeksWithGoodPerformance,
  } = useAthleteStatus();

  const currentConfig = LEVEL_CONFIG[status];
  const currentIndex = LEVELS_ORDER.indexOf(status);

  return (
    <div className="space-y-6">
      {/* Current Level Hero Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${currentConfig.bgGradient} border border-white/10 p-6`}
      >
        {/* Animated background glow */}
        <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${currentConfig.gradient} rounded-full blur-3xl opacity-30`} />
        
        <div className="relative z-10">
          {/* Level Badge */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ rotate: -10 }}
                animate={{ rotate: [0, 5, 0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className={`p-3 rounded-xl bg-gradient-to-br ${currentConfig.gradient} shadow-lg ${currentConfig.glowColor}`}
              >
                {currentConfig.icon}
              </motion.div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Seu Nível</p>
                <h2 className={`font-display text-2xl bg-gradient-to-r ${currentConfig.gradient} bg-clip-text text-transparent`}>
                  {LEVEL_NAMES[status]}
                </h2>
              </div>
            </div>
            <span className="text-4xl">{currentConfig.emoji}</span>
          </div>

          {/* Score Display */}
          <div className="flex items-end gap-2 mb-4">
            <span className={`font-display text-5xl bg-gradient-to-r ${currentConfig.gradient} bg-clip-text text-transparent`}>
              {Math.round(rulerScore)}
            </span>
            <span className="text-muted-foreground text-lg mb-1">/100 pts</span>
          </div>

          {/* Progress to Next Level */}
          {nextStatus && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progresso para {LEVEL_NAMES[nextStatus]}</span>
                <span className={currentConfig.color}>{Math.round(progressToNextStatus)}%</span>
              </div>
              <div className="relative h-3 bg-black/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNextStatus}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${currentConfig.gradient} rounded-full`}
                />
                {/* Shimmer effect */}
                <motion.div
                  animate={{ x: [-200, 400] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                />
              </div>
            </div>
          )}

          {/* Promotion Alert */}
          {eligibleForPromotion && nextStatus && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-400" />
                <span className="text-sm text-green-400 font-medium">
                  Pronto para subir para {LEVEL_NAMES[nextStatus]}!
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Level Progression Track */}
      <div className="relative">
        <h3 className="font-display text-lg mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Jornada de Evolução
        </h3>
        
        <div className="relative flex items-center justify-between">
          {/* Connection Line */}
          <div className="absolute top-6 left-8 right-8 h-1 bg-secondary/50 rounded-full" />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentIndex / (LEVELS_ORDER.length - 1)) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`absolute top-6 left-8 h-1 bg-gradient-to-r ${currentConfig.gradient} rounded-full`}
            style={{ maxWidth: 'calc(100% - 4rem)' }}
          />

          {LEVELS_ORDER.map((level, index) => {
            const config = LEVEL_CONFIG[level];
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isLocked = index > currentIndex;
            const threshold = STATUS_THRESHOLDS[level];

            return (
              <motion.div
                key={level}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative z-10 flex flex-col items-center"
              >
                {/* Level Node */}
                <motion.div
                  whileHover={!isLocked ? { scale: 1.1 } : {}}
                  className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${isCurrent 
                      ? `bg-gradient-to-br ${config.gradient} shadow-lg ${config.glowColor} ring-2 ring-white/20` 
                      : isCompleted 
                        ? `bg-gradient-to-br ${config.gradient} opacity-80` 
                        : 'bg-secondary/80 border border-border'
                    }
                  `}
                >
                  {isLocked ? (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <span className={`${isCurrent ? 'text-white' : isCompleted ? 'text-white/80' : config.color}`}>
                      {config.icon}
                    </span>
                  )}
                  
                  {/* Current indicator pulse */}
                  {isCurrent && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.gradient}`}
                    />
                  )}
                </motion.div>

                {/* Level Name */}
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${isCurrent ? config.color : isLocked ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                    {LEVEL_NAMES[level].split(' ')[0]}
                  </p>
                  {LEVEL_NAMES[level].split(' ')[1] && (
                    <p className={`text-[10px] ${isCurrent ? config.color : isLocked ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                      {LEVEL_NAMES[level].split(' ')[1]}
                    </p>
                  )}
                </div>

                {/* Threshold indicator */}
                <p className={`text-[10px] mt-1 ${isLocked ? 'text-muted-foreground/30' : 'text-muted-foreground/60'}`}>
                  {threshold.min}+
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-3 rounded-xl bg-secondary/30 border border-border/50 text-center"
        >
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="font-display text-xl">{benchmarksUsed}</p>
          <p className="text-[10px] text-muted-foreground">Benchmarks</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-3 rounded-xl bg-secondary/30 border border-border/50 text-center"
        >
          <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
          <p className="font-display text-xl">{weeksWithGoodPerformance}</p>
          <p className="text-[10px] text-muted-foreground">Sem. STRONG+</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-3 rounded-xl bg-secondary/30 border border-border/50 text-center"
        >
          <Target className="w-5 h-5 mx-auto mb-1 text-green-500" />
          <p className="font-display text-xl">{CONFIDENCE_LABELS[confidence]}</p>
          <p className="text-[10px] text-muted-foreground">Confiança</p>
        </motion.div>
      </div>

      {/* Next Level Teaser */}
      {nextStatus && !eligibleForPromotion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="p-4 rounded-xl border border-dashed border-border/50 bg-secondary/10"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${LEVEL_CONFIG[nextStatus].gradient} opacity-50`}>
              {LEVEL_CONFIG[nextStatus].icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium flex items-center gap-1">
                <span className="text-muted-foreground">Próximo:</span>
                <span className={LEVEL_CONFIG[nextStatus].color}>{LEVEL_NAMES[nextStatus]}</span>
              </p>
              <p className="text-xs text-muted-foreground">{LEVEL_CONFIG[nextStatus].description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
