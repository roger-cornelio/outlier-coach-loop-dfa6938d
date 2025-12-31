import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { StatusCrown, type StatusCrownSize } from '@/components/ui/StatusCrown';
import type { AthleteStatus } from '@/types/outlier';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AthleteStatusAvatar — Avatar Central de Status com StatusCrown Canônico
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Componente principal de identidade do atleta.
 * Usa <StatusCrown /> para garantir consistência pixel-perfect.
 */

interface AthleteStatusAvatarProps {
  name?: string | null;
  gender?: 'masculino' | 'feminino' | null;
  status: AthleteStatus;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO VISUAL POR STATUS (ícone é sempre StatusCrown)
// ═══════════════════════════════════════════════════════════════════════════
const STATUS_CONFIG: Record<AthleteStatus, {
  label: string;
  gradient: string;
  glow: string;
  glowIntensity: string;
  border: string;
  text: string;
  badge: string;
  crownColor: string;
  animate: boolean;
}> = {
  iniciante: {
    label: 'INICIANTE',
    gradient: 'from-slate-500 to-slate-600',
    glow: 'rgba(100, 116, 139, 0.4)',
    glowIntensity: '0 0 20px',
    border: 'border-slate-400/60',
    text: 'text-slate-300',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    crownColor: 'text-slate-300',
    animate: false,
  },
  intermediario: {
    label: 'INTERMEDIÁRIO',
    gradient: 'from-emerald-500 to-green-600',
    glow: 'rgba(16, 185, 129, 0.5)',
    glowIntensity: '0 0 30px',
    border: 'border-emerald-400/70',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    crownColor: 'text-emerald-300',
    animate: false,
  },
  avancado: {
    label: 'AVANÇADO',
    gradient: 'from-orange-500 to-red-600',
    glow: 'rgba(249, 115, 22, 0.5)',
    glowIntensity: '0 0 40px',
    border: 'border-orange-400/80',
    text: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    crownColor: 'text-white/90',
    animate: false,
  },
  hyrox_open: {
    label: 'HYROX OPEN',
    gradient: 'from-purple-500 to-pink-600',
    glow: 'rgba(168, 85, 247, 0.6)',
    glowIntensity: '0 0 50px',
    border: 'border-purple-400/80',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    crownColor: 'text-white',
    animate: true,
  },
  hyrox_pro: {
    label: 'HYROX PRO',
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    glow: 'rgba(251, 191, 36, 0.7)',
    glowIntensity: '0 0 60px, 0 0 100px',
    border: 'border-amber-400',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    crownColor: 'text-amber-900',
    animate: true,
  },
};

// Tamanhos do avatar com mapeamento para StatusCrown
const SIZE_CONFIG: Record<string, {
  container: string;
  crownSize: StatusCrownSize;
  badgeCrownSize: StatusCrownSize;
  text: string;
}> = {
  sm: { container: 'w-10 h-10', crownSize: 'sm', badgeCrownSize: 'xs', text: 'text-xs' },
  md: { container: 'w-14 h-14', crownSize: 'md', badgeCrownSize: 'sm', text: 'text-sm' },
  lg: { container: 'w-20 h-20', crownSize: 'lg', badgeCrownSize: 'sm', text: 'text-base' },
  xl: { container: 'w-28 h-28', crownSize: 'xl', badgeCrownSize: 'md', text: 'text-lg' },
  hero: { container: 'w-36 h-36', crownSize: 'hero', badgeCrownSize: 'lg', text: 'text-xl' },
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
            'relative rounded-full flex items-center justify-center overflow-hidden',
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
          {/* StatusCrown canônico */}
          <StatusCrown 
            size={sizeConfig.crownSize}
            colorClass={config.crownColor}
            className="drop-shadow-md"
          />
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
              'border font-bold uppercase tracking-wider text-status-title',
              config.badge,
              sizeConfig.text
            )}
          >
            <StatusCrown size="sm" colorClass={config.text} />
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
  
  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-status-label',
        config.badge,
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}
    >
      <StatusCrown size="xs" colorClass={config.text} />
      <span className="font-semibold uppercase">{config.label}</span>
    </div>
  );
}
