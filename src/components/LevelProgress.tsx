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

// Heraldic shield SVG shapes per level — premium design with depth, details and texture
function ShieldCrest({ level, active, className }: { level: ExtendedLevelKey; active: boolean; className?: string }) {
  const id = `shield-${level}-${active ? 'on' : 'off'}`;

  if (level === 'OPEN') {
    return (
      <svg viewBox="0 0 100 120" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={active ? '#c084fc' : '#888'} stopOpacity={active ? 1 : 0.12} />
            <stop offset="100%" stopColor={active ? '#7c3aed' : '#666'} stopOpacity={active ? 0.9 : 0.06} />
          </linearGradient>
          <linearGradient id={`${id}-inner`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={active ? '#e9d5ff' : '#aaa'} stopOpacity={active ? 0.5 : 0.08} />
            <stop offset="100%" stopColor={active ? '#a855f7' : '#888'} stopOpacity={active ? 0.3 : 0.04} />
          </linearGradient>
          {active && <filter id={`${id}-glow`}><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>}
        </defs>
        {/* Shield body — classic kite shape */}
        <path d="M50 4 L92 24 L92 60 Q92 95 50 116 Q8 95 8 60 L8 24 Z" 
          fill={`url(#${id}-bg)`} stroke={active ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.04)'} strokeWidth="2"
          filter={active ? `url(#${id}-glow)` : undefined} />
        {/* Inner border */}
        <path d="M50 14 L82 30 L82 58 Q82 87 50 106 Q18 87 18 58 L18 30 Z"
          fill="none" stroke={active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)'} strokeWidth="1" />
        {/* Inner panel */}
        <path d="M50 20 L76 33 L76 56 Q76 81 50 98 Q24 81 24 56 L24 33 Z"
          fill={`url(#${id}-inner)`} />
        {/* Star emblem */}
        <path d="M50 36 L54.5 48 L67 48 L57 56 L61 68 L50 60 L39 68 L43 56 L33 48 L45.5 48 Z" 
          fill={active ? 'white' : '#999'} opacity={active ? 0.85 : 0.15}
          stroke={active ? 'rgba(255,255,255,0.4)' : 'none'} strokeWidth="0.5" />
        {/* Horizontal divider lines */}
        <line x1="30" y1="78" x2="70" y2="78" stroke={active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.03)'} strokeWidth="0.8" />
        <line x1="35" y1="84" x2="65" y2="84" stroke={active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.02)'} strokeWidth="0.6" />
      </svg>
    );
  }

  if (level === 'PRO') {
    return (
      <svg viewBox="0 0 100 120" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor={active ? '#fbbf24' : '#888'} stopOpacity={active ? 1 : 0.12} />
            <stop offset="50%" stopColor={active ? '#f59e0b' : '#777'} stopOpacity={active ? 0.95 : 0.08} />
            <stop offset="100%" stopColor={active ? '#b45309' : '#666'} stopOpacity={active ? 0.85 : 0.06} />
          </linearGradient>
          <linearGradient id={`${id}-inner`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={active ? '#fef3c7' : '#aaa'} stopOpacity={active ? 0.4 : 0.06} />
            <stop offset="100%" stopColor={active ? '#d97706' : '#888'} stopOpacity={active ? 0.25 : 0.03} />
          </linearGradient>
          {active && <filter id={`${id}-glow`}><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>}
        </defs>
        {/* Wings / flourish at top */}
        <path d="M50 12 L62 6 L58 16 L72 10 L66 22 L80 20 L72 28 L50 24 L28 28 L20 20 L34 22 L28 10 L42 16 L38 6 Z"
          fill={active ? '#f59e0b' : '#888'} opacity={active ? 0.5 : 0.06} />
        {/* Shield body */}
        <path d="M50 8 L90 28 L90 62 Q90 96 50 116 Q10 96 10 62 L10 28 Z"
          fill={`url(#${id}-bg)`} stroke={active ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.04)'} strokeWidth="2"
          filter={active ? `url(#${id}-glow)` : undefined} />
        {/* Inner border */}
        <path d="M50 18 L80 34 L80 60 Q80 88 50 106 Q20 88 20 60 L20 34 Z"
          fill="none" stroke={active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.03)'} strokeWidth="1.2" />
        {/* Inner panel */}
        <path d="M50 24 L74 37 L74 58 Q74 82 50 98 Q26 82 26 58 L26 37 Z"
          fill={`url(#${id}-inner)`} />
        {/* Hexagonal emblem */}
        <path d="M50 36 L62 43 L62 57 L50 64 L38 57 L38 43 Z"
          fill="none" stroke={active ? 'white' : '#999'} strokeWidth="1.8" opacity={active ? 0.7 : 0.12} />
        {/* Diamond core */}
        <path d="M50 42 L56 50 L50 58 L44 50 Z"
          fill={active ? 'white' : '#999'} opacity={active ? 0.8 : 0.1} />
        {/* Side bars */}
        <line x1="32" y1="72" x2="68" y2="72" stroke={active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.03)'} strokeWidth="1" />
        <line x1="36" y1="80" x2="64" y2="80" stroke={active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.02)'} strokeWidth="0.7" />
        {/* Corner dots */}
        <circle cx="30" cy="42" r="2" fill={active ? 'white' : '#999'} opacity={active ? 0.3 : 0.05} />
        <circle cx="70" cy="42" r="2" fill={active ? 'white' : '#999'} opacity={active ? 0.3 : 0.05} />
      </svg>
    );
  }

  // ELITE
  return (
    <svg viewBox="0 0 100 120" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor={active ? '#fde047' : '#888'} stopOpacity={active ? 1 : 0.12} />
          <stop offset="40%" stopColor={active ? '#facc15' : '#777'} stopOpacity={active ? 0.95 : 0.08} />
          <stop offset="100%" stopColor={active ? '#a16207' : '#666'} stopOpacity={active ? 0.8 : 0.06} />
        </linearGradient>
        <linearGradient id={`${id}-inner`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? '#fefce8' : '#aaa'} stopOpacity={active ? 0.45 : 0.06} />
          <stop offset="100%" stopColor={active ? '#ca8a04' : '#888'} stopOpacity={active ? 0.2 : 0.03} />
        </linearGradient>
        <linearGradient id={`${id}-crown`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? '#fef9c3' : '#aaa'} stopOpacity={active ? 0.9 : 0.1} />
          <stop offset="100%" stopColor={active ? '#eab308' : '#888'} stopOpacity={active ? 0.7 : 0.06} />
        </linearGradient>
        {active && <filter id={`${id}-glow`}><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>}
      </defs>
      {/* Crown atop the shield */}
      <path d="M28 18 L34 8 L40 16 L46 4 L50 0 L54 4 L60 16 L66 8 L72 18 L72 28 L28 28 Z"
        fill={`url(#${id}-crown)`} stroke={active ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.04)'} strokeWidth="1" />
      {/* Crown jewels */}
      <circle cx="40" cy="20" r="2.5" fill={active ? '#fff' : '#999'} opacity={active ? 0.6 : 0.08} />
      <circle cx="50" cy="16" r="3" fill={active ? '#fff' : '#999'} opacity={active ? 0.7 : 0.08} />
      <circle cx="60" cy="20" r="2.5" fill={active ? '#fff' : '#999'} opacity={active ? 0.6 : 0.08} />
      {/* Shield body */}
      <path d="M50 16 L92 32 L92 64 Q92 98 50 116 Q8 98 8 64 L8 32 Z"
        fill={`url(#${id}-bg)`} stroke={active ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.04)'} strokeWidth="2.5"
        filter={active ? `url(#${id}-glow)` : undefined} />
      {/* Double inner border */}
      <path d="M50 26 L82 38 L82 62 Q82 90 50 106 Q18 90 18 62 L18 38 Z"
        fill="none" stroke={active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.03)'} strokeWidth="1.5" />
      <path d="M50 32 L76 42 L76 60 Q76 84 50 98 Q24 84 24 60 L24 42 Z"
        fill={`url(#${id}-inner)`} stroke={active ? 'rgba(255,255,255,0.1)' : 'none'} strokeWidth="0.8" />
      {/* Central eagle/phoenix silhouette */}
      <g opacity={active ? 0.85 : 0.1} transform="translate(50,62) scale(0.9)">
        {/* Wings spread */}
        <path d="M0 -14 L-18 -6 L-22 2 L-14 0 L-8 4 L0 -4 L8 4 L14 0 L22 2 L18 -6 Z"
          fill={active ? 'white' : '#999'} />
        {/* Body */}
        <path d="M-4 -4 L0 -10 L4 -4 L4 8 L0 14 L-4 8 Z"
          fill={active ? 'white' : '#999'} opacity="0.9" />
        {/* Tail feathers */}
        <path d="M-6 10 L0 18 L6 10" fill="none" stroke={active ? 'white' : '#999'} strokeWidth="1.2" opacity="0.6" />
      </g>
      {/* Bottom divider */}
      <line x1="32" y1="86" x2="68" y2="86" stroke={active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.03)'} strokeWidth="1" />
      {/* Corner laurels */}
      <path d="M20 50 Q14 56 18 64" fill="none" stroke={active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.02)'} strokeWidth="1.5" />
      <path d="M80 50 Q86 56 82 64" fill="none" stroke={active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.02)'} strokeWidth="1.5" />
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
