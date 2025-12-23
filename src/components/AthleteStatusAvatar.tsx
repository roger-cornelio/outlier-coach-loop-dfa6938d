import { User, UserRound, Crown, Star, Flame, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { AthleteStatus } from '@/types/outlier';

/**
 * AthleteStatusAvatar - Avatar Central de Status
 * 
 * Componente principal de identidade do atleta.
 * Exibe avatar grande com nível/status de forma proeminente.
 * Usa mesma fonte de verdade visual que UserAvatar.
 */

interface AthleteStatusAvatarProps {
  name?: string | null;
  gender?: 'masculino' | 'feminino' | null;
  status: AthleteStatus;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
}

// Configuração visual por nível (fonte de verdade única)
const STATUS_CONFIG: Record<AthleteStatus, {
  label: string;
  icon: typeof Crown;
  gradient: string;
  glow: string;
  glowIntensity: string;
  border: string;
  text: string;
  badge: string;
  animate: boolean;
}> = {
  iniciante: {
    label: 'INICIANTE',
    icon: Target,
    gradient: 'from-slate-500 to-slate-600',
    glow: 'rgba(100, 116, 139, 0.4)',
    glowIntensity: '0 0 20px',
    border: 'border-slate-400/60',
    text: 'text-slate-300',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    animate: false,
  },
  intermediario: {
    label: 'INTERMEDIÁRIO',
    icon: Zap,
    gradient: 'from-emerald-500 to-green-600',
    glow: 'rgba(16, 185, 129, 0.5)',
    glowIntensity: '0 0 30px',
    border: 'border-emerald-400/70',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    animate: false,
  },
  avancado: {
    label: 'AVANÇADO',
    icon: Flame,
    gradient: 'from-orange-500 to-red-600',
    glow: 'rgba(249, 115, 22, 0.5)',
    glowIntensity: '0 0 40px',
    border: 'border-orange-400/80',
    text: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    animate: false,
  },
  hyrox_open: {
    label: 'HYROX OPEN',
    icon: Star,
    gradient: 'from-purple-500 to-pink-600',
    glow: 'rgba(168, 85, 247, 0.6)',
    glowIntensity: '0 0 50px',
    border: 'border-purple-400/80',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    animate: true,
  },
  hyrox_pro: {
    label: 'HYROX PRO',
    icon: Crown,
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    glow: 'rgba(251, 191, 36, 0.7)',
    glowIntensity: '0 0 60px, 0 0 100px',
    border: 'border-amber-400',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    animate: true,
  },
};

// Tamanhos do avatar
const SIZE_CONFIG = {
  sm: { container: 'w-10 h-10', icon: 'w-5 h-5', statusIcon: 'w-3 h-3', text: 'text-xs' },
  md: { container: 'w-14 h-14', icon: 'w-7 h-7', statusIcon: 'w-4 h-4', text: 'text-sm' },
  lg: { container: 'w-20 h-20', icon: 'w-10 h-10', statusIcon: 'w-5 h-5', text: 'text-base' },
  xl: { container: 'w-28 h-28', icon: 'w-14 h-14', statusIcon: 'w-6 h-6', text: 'text-lg' },
  hero: { container: 'w-36 h-36', icon: 'w-18 h-18', statusIcon: 'w-8 h-8', text: 'text-xl' },
};

export function AthleteStatusAvatar({
  name,
  gender,
  status,
  className,
  showLabel = true,
  size = 'hero',
}: AthleteStatusAvatarProps) {
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];
  const StatusIcon = config.icon;

  const renderUserIcon = () => {
    const iconClass = cn(sizeConfig.icon, 'text-white/90');
    if (gender === 'feminino') {
      return <UserRound className={iconClass} strokeWidth={1.5} />;
    }
    return <User className={iconClass} strokeWidth={1.5} />;
  };

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* Avatar Container with Glow */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative"
      >
        {/* Outer Glow Ring */}
        <div 
          className={cn(
            'absolute -inset-2 rounded-full blur-xl opacity-60',
            `bg-gradient-to-br ${config.gradient}`
          )} 
        />
        
        {/* Main Avatar Circle */}
        <div
          className={cn(
            'relative rounded-full flex items-center justify-center',
            'border-4 transition-all duration-300',
            `bg-gradient-to-br ${config.gradient}`,
            config.border,
            config.animate && 'animate-pulse-slow',
            sizeConfig.container
          )}
          style={{
            boxShadow: `${config.glowIntensity} ${config.glow}`,
          }}
        >
          {renderUserIcon()}
          
          {/* Status Icon Badge */}
          <div 
            className={cn(
              'absolute -bottom-1 -right-1 rounded-full p-1.5',
              'bg-background border-2',
              config.border
            )}
          >
            <StatusIcon className={cn(sizeConfig.statusIcon, config.text)} />
          </div>
        </div>
      </motion.div>

      {/* Status Label */}
      {showLabel && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="text-center"
        >
          <div 
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full',
              'border font-bold uppercase tracking-wider',
              config.badge,
              sizeConfig.text
            )}
          >
            <StatusIcon className={cn('w-4 h-4', config.text)} />
            <span>ATLETA {config.label}</span>
          </div>
        </motion.div>
      )}

      {/* Name (optional) */}
      {name && showLabel && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-sm font-medium"
        >
          {name}
        </motion.p>
      )}
    </div>
  );
}

/**
 * Compact version for headers and lists
 */
export function AthleteStatusBadge({ 
  status, 
  size = 'sm' 
}: { 
  status: AthleteStatus; 
  size?: 'sm' | 'md';
}) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;
  
  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full border',
        config.badge,
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}
    >
      <StatusIcon className="w-3 h-3" />
      <span className="font-semibold uppercase">{config.label}</span>
    </div>
  );
}
