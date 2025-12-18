import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Star, Zap, Crown, Flame, Lock, ChevronRight, 
  TrendingUp, Target, Sparkles, Shield, Swords
} from 'lucide-react';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { LEVEL_NAMES, type AthleteStatus } from '@/types/outlier';
import { STATUS_THRESHOLDS, CONFIDENCE_LABELS } from '@/utils/athleteStatusSystem';

// Level configuration with radical visual identity
const LEVEL_CONFIG: Record<AthleteStatus, {
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
}> = {
  iniciante: {
    icon: <Star className="w-6 h-6" />,
    heroIcon: <Star className="w-16 h-16" />,
    gradient: 'from-cyan-500 via-blue-500 to-cyan-400',
    textGradient: 'from-cyan-400 to-blue-400',
    bgPattern: 'radial-gradient(ellipse at top, hsl(199 50% 15% / 0.5), transparent 50%)',
    particleColor: 'bg-cyan-400',
    title: 'INICIANTE',
    subtitle: 'O começo de uma jornada',
    motivation: 'Cada treino te aproxima do próximo nível',
    borderStyle: 'border-cyan-500/30',
    cardStyle: 'bg-gradient-to-br from-cyan-950/50 to-blue-950/30',
    iconAnimation: '',
  },
  intermediario: {
    icon: <Zap className="w-6 h-6" />,
    heroIcon: <Zap className="w-20 h-20" />,
    gradient: 'from-emerald-500 via-green-500 to-teal-400',
    textGradient: 'from-emerald-400 to-green-400',
    bgPattern: 'radial-gradient(ellipse at top, hsl(142 40% 15% / 0.6), transparent 50%)',
    particleColor: 'bg-green-400',
    title: 'INTERMEDIÁRIO',
    subtitle: 'Força em construção',
    motivation: 'Você já superou muitos. Continue subindo.',
    borderStyle: 'border-green-500/30',
    cardStyle: 'bg-gradient-to-br from-emerald-950/50 to-green-950/30',
    iconAnimation: '',
  },
  avancado: {
    icon: <Flame className="w-6 h-6" />,
    heroIcon: <Flame className="w-24 h-24 animate-fire-flicker" />,
    gradient: 'from-orange-500 via-amber-500 to-red-500',
    textGradient: 'from-orange-400 to-amber-400',
    bgPattern: 'radial-gradient(ellipse at top, hsl(25 50% 18% / 0.7), transparent 50%), radial-gradient(ellipse at bottom right, hsl(15 50% 15% / 0.4), transparent 40%)',
    particleColor: 'bg-orange-400',
    title: 'AVANÇADO',
    subtitle: 'Fogo interior aceso',
    motivation: 'A elite está ao seu alcance. Não pare.',
    borderStyle: 'border-orange-500/40',
    cardStyle: 'bg-gradient-to-br from-orange-950/60 to-amber-950/40',
    iconAnimation: 'animate-fire-flicker',
  },
  hyrox_open: {
    icon: <Trophy className="w-6 h-6" />,
    heroIcon: <Trophy className="w-28 h-28" />,
    gradient: 'from-purple-500 via-violet-500 to-fuchsia-500',
    textGradient: 'from-purple-400 to-fuchsia-400',
    bgPattern: 'radial-gradient(ellipse at top, hsl(270 40% 20% / 0.7), transparent 50%), radial-gradient(ellipse at bottom left, hsl(290 40% 15% / 0.5), transparent 40%)',
    particleColor: 'bg-purple-400',
    title: 'HYROX OPEN',
    subtitle: 'Competidor oficial',
    motivation: 'Você está entre os melhores. Prove no campo.',
    borderStyle: 'border-purple-500/40',
    cardStyle: 'bg-gradient-to-br from-purple-950/60 to-violet-950/40',
    iconAnimation: '',
  },
  hyrox_pro: {
    icon: <Crown className="w-6 h-6" />,
    heroIcon: <Crown className="w-32 h-32 animate-crown-float" />,
    gradient: 'from-amber-400 via-yellow-400 to-orange-400',
    textGradient: 'from-amber-300 to-yellow-300',
    bgPattern: 'radial-gradient(ellipse at top, hsl(45 50% 20% / 0.8), transparent 50%), radial-gradient(ellipse at bottom, hsl(40 40% 15% / 0.5), transparent 50%), radial-gradient(circle at 20% 80%, hsl(30 50% 15% / 0.3), transparent 30%)',
    particleColor: 'bg-amber-400',
    title: 'HYROX PRO',
    subtitle: 'Elite absoluta',
    motivation: 'Você é a referência. Mantenha a coroa.',
    borderStyle: 'border-amber-400/50 shadow-[0_0_30px_hsl(45_93%_47%/0.3)]',
    cardStyle: 'bg-gradient-to-br from-amber-950/70 to-yellow-950/50',
    iconAnimation: 'animate-crown-float',
  },
};

const LEVELS_ORDER: AthleteStatus[] = ['iniciante', 'intermediario', 'avancado', 'hyrox_open', 'hyrox_pro'];

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
  const isElite = status === 'hyrox_pro';
  const isHyrox = status === 'hyrox_open' || status === 'hyrox_pro';

  // Apply level theme class to document
  useEffect(() => {
    const levelClass = `level-${status}`;
    document.documentElement.classList.forEach(cls => {
      if (cls.startsWith('level-')) {
        document.documentElement.classList.remove(cls);
      }
    });
    document.documentElement.classList.add(levelClass);
    return () => {
      document.documentElement.classList.remove(levelClass);
    };
  }, [status]);

  return (
    <div className="space-y-6">
      {/* HERO CARD - Radical per level */}
      <motion.div
        key={status}
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
        {(status === 'avancado' || isHyrox) && (
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
                className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2"
              >
                Seu Status
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className={`font-display text-4xl md:text-5xl lg:text-6xl bg-gradient-to-r ${currentConfig.textGradient} bg-clip-text text-transparent tracking-tight`}
              >
                {currentConfig.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground mt-1 text-sm md:text-base"
              >
                {currentConfig.subtitle}
              </motion.p>
            </div>

            {/* Hero Icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className={`relative ${currentConfig.iconAnimation}`}
            >
              <div className={`bg-gradient-to-br ${currentConfig.gradient} bg-clip-text text-transparent`}>
                {currentConfig.heroIcon}
              </div>
              {/* Glow behind icon */}
              <div className={`absolute inset-0 bg-gradient-to-br ${currentConfig.gradient} blur-2xl opacity-30 -z-10`} />
            </motion.div>
          </div>

          {/* Score Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <div className="flex items-baseline gap-2">
              <span className={`font-display text-7xl md:text-8xl bg-gradient-to-r ${currentConfig.textGradient} bg-clip-text text-transparent`}>
                {Math.round(rulerScore)}
              </span>
              <span className="text-2xl text-muted-foreground">/100</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">pontos de performance</p>
          </motion.div>

          {/* Progress to Next Level */}
          {nextStatus && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  Progresso para <span className={`bg-gradient-to-r ${LEVEL_CONFIG[nextStatus].textGradient} bg-clip-text text-transparent font-semibold`}>{LEVEL_NAMES[nextStatus]}</span>
                </span>
                <span className={`bg-gradient-to-r ${currentConfig.textGradient} bg-clip-text text-transparent font-bold`}>
                  {Math.round(progressToNextStatus)}%
                </span>
              </div>
              
              <div className="relative h-4 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNextStatus}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.7 }}
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${currentConfig.gradient} rounded-full`}
                />
                {/* Shimmer */}
                <motion.div
                  animate={{ x: [-200, 400] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
                  className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
              </div>
            </motion.div>
          )}

          {/* Promotion Alert */}
          <AnimatePresence>
            {eligibleForPromotion && nextStatus && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`mt-6 p-4 rounded-2xl bg-gradient-to-r ${LEVEL_CONFIG[nextStatus].gradient} bg-opacity-20 border border-white/20`}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <Sparkles className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <p className="font-bold text-white">Promoção disponível!</p>
                    <p className="text-sm text-white/80">Pronto para {LEVEL_NAMES[nextStatus]}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Motivation Quote */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-sm italic text-muted-foreground border-l-2 border-current pl-3 opacity-70"
          >
            "{currentConfig.motivation}"
          </motion.p>
        </div>
      </motion.div>

      {/* Level Journey Track */}
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
        
        <div className="relative flex items-center justify-between py-4">
          {/* Track line */}
          <div className="absolute top-1/2 left-6 right-6 h-1.5 bg-secondary/50 rounded-full -translate-y-1/2" />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentIndex / (LEVELS_ORDER.length - 1)) * 100}%` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
            className={`absolute top-1/2 left-6 h-1.5 bg-gradient-to-r ${currentConfig.gradient} rounded-full -translate-y-1/2`}
            style={{ maxWidth: 'calc(100% - 3rem)' }}
          />

          {LEVELS_ORDER.map((level, index) => {
            const config = LEVEL_CONFIG[level];
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isLocked = index > currentIndex;

            return (
              <motion.div
                key={level}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.1, type: 'spring' }}
                className="relative z-10 flex flex-col items-center"
              >
                <motion.div
                  whileHover={!isLocked ? { scale: 1.15 } : {}}
                  className={`
                    relative w-14 h-14 rounded-2xl flex items-center justify-center
                    transition-all duration-300
                    ${isCurrent 
                      ? `bg-gradient-to-br ${config.gradient} shadow-lg shadow-current/30 ring-2 ring-white/30` 
                      : isCompleted 
                        ? `bg-gradient-to-br ${config.gradient} opacity-70` 
                        : 'bg-secondary/80 border-2 border-border/50'
                    }
                  `}
                >
                  {isLocked ? (
                    <Lock className="w-5 h-5 text-muted-foreground/50" />
                  ) : (
                    <span className="text-white drop-shadow-lg">{config.icon}</span>
                  )}
                  
                  {isCurrent && (
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${config.gradient}`}
                    />
                  )}
                </motion.div>

                <p className={`mt-2 text-xs font-semibold text-center ${isCurrent ? `bg-gradient-to-r ${config.textGradient} bg-clip-text text-transparent` : isLocked ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                  {LEVEL_NAMES[level].split(' ')[0]}
                </p>
                {LEVEL_NAMES[level].split(' ')[1] && (
                  <p className={`text-[10px] ${isCurrent ? `bg-gradient-to-r ${config.textGradient} bg-clip-text text-transparent` : isLocked ? 'text-muted-foreground/40' : 'text-muted-foreground/60'}`}>
                    {LEVEL_NAMES[level].split(' ')[1]}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: TrendingUp, value: benchmarksUsed, label: 'Benchmarks', delay: 0.4 },
          { icon: Flame, value: weeksWithGoodPerformance, label: 'Semanas STRONG+', delay: 0.5 },
          { icon: Shield, value: CONFIDENCE_LABELS[confidence], label: 'Confiança', delay: 0.6 },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay }}
            className={`p-4 rounded-2xl ${currentConfig.cardStyle} border ${currentConfig.borderStyle} text-center`}
          >
            <stat.icon className={`w-5 h-5 mx-auto mb-2 bg-gradient-to-r ${currentConfig.textGradient} bg-clip-text`} style={{ color: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text' }} />
            <p className="font-display text-2xl">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Next Level Preview */}
      {nextStatus && !eligibleForPromotion && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={`p-5 rounded-2xl border-2 border-dashed ${LEVEL_CONFIG[nextStatus].borderStyle} bg-secondary/10`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${LEVEL_CONFIG[nextStatus].gradient} opacity-40`}>
              {LEVEL_CONFIG[nextStatus].icon}
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Próximo nível</p>
              <p className={`font-display text-xl bg-gradient-to-r ${LEVEL_CONFIG[nextStatus].textGradient} bg-clip-text text-transparent`}>
                {LEVEL_NAMES[nextStatus]}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{LEVEL_CONFIG[nextStatus].subtitle}</p>
            </div>
            <ChevronRight className="w-6 h-6 text-muted-foreground" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
