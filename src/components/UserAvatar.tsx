import { cn } from '@/lib/utils';
import { StatusCrown, type StatusCrownSize } from '@/components/ui/StatusCrown';
import type { AthleteStatus, TrainingLevel } from '@/types/outlier';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UserAvatar — Avatar com Símbolo Canônico do Status do Atleta
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Exibe <StatusCrown /> (componente canônico) em vez de ícone direto.
 * Cor, gradiente e glow variam por status; ícone é sempre idêntico.
 */

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface UserAvatarProps {
  name?: string | null;
  gender?: 'masculino' | 'feminino' | null;
  trainingLevel?: TrainingLevel | null;
  athleteStatus?: AthleteStatus | null;
  size?: AvatarSize;
  className?: string;
  showGlow?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO VISUAL POR STATUS (cores apenas, ícone é StatusCrown)
// ═══════════════════════════════════════════════════════════════════════════
const STATUS_VISUAL: Record<AthleteStatus, {
  gradient: string;
  border: string;
  glow: string;
  glowIntensity: string;
  iconColor: string;
  animate: boolean;
}> = {
  iniciante: {
    gradient: 'from-slate-500 to-slate-600',
    border: 'border-slate-400/60',
    glow: 'rgba(100, 116, 139, 0.3)',
    glowIntensity: '0 0 12px',
    iconColor: 'text-slate-100',
    animate: false,
  },
  intermediario: {
    gradient: 'from-emerald-500 to-green-600',
    border: 'border-emerald-400/70',
    glow: 'rgba(16, 185, 129, 0.4)',
    glowIntensity: '0 0 16px',
    iconColor: 'text-emerald-100',
    animate: false,
  },
  avancado: {
    gradient: 'from-orange-500 to-red-600',
    border: 'border-orange-400/80',
    glow: 'rgba(249, 115, 22, 0.5)',
    glowIntensity: '0 0 20px',
    iconColor: 'text-orange-100',
    animate: false,
  },
  hyrox_open: {
    gradient: 'from-purple-500 to-pink-600',
    border: 'border-purple-400/80',
    glow: 'rgba(168, 85, 247, 0.5)',
    glowIntensity: '0 0 24px',
    iconColor: 'text-purple-100',
    animate: true,
  },
  hyrox_pro: {
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    border: 'border-amber-400',
    glow: 'rgba(251, 191, 36, 0.6)',
    glowIntensity: '0 0 28px, 0 0 40px',
    iconColor: 'text-amber-100',
    animate: true,
  },
};

// Fallback sem status definido
const DEFAULT_VISUAL = {
  gradient: 'from-muted to-muted',
  border: 'border-border',
  glow: 'transparent',
  glowIntensity: 'none',
  iconColor: 'text-muted-foreground',
  animate: false,
};

// Mapeamento de tamanho avatar → tamanho StatusCrown
const SIZE_CONFIG: Record<AvatarSize, { 
  container: string; 
  crownSize: StatusCrownSize;
}> = {
  sm: { container: 'w-8 h-8', crownSize: 'sm' },
  md: { container: 'w-10 h-10', crownSize: 'md' },
  lg: { container: 'w-12 h-12', crownSize: 'lg' },
  xl: { container: 'w-16 h-16', crownSize: 'xl' },
};

/**
 * Avatar com símbolo canônico do status do atleta.
 */
export function UserAvatar({
  name,
  gender,
  trainingLevel,
  athleteStatus,
  size = 'md',
  className,
  showGlow = true,
}: UserAvatarProps) {
  const statusKey = athleteStatus || null;
  const visual = statusKey ? STATUS_VISUAL[statusKey] : DEFAULT_VISUAL;
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className={cn(
        'relative rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300 overflow-hidden',
        sizeConfig.container,
        `bg-gradient-to-br ${visual.gradient}`,
        visual.border,
        visual.animate && 'animate-pulse-slow',
        className
      )}
      style={{
        boxShadow: showGlow && statusKey ? `${visual.glowIntensity} ${visual.glow}` : 'none',
      }}
      title={`${name || 'Usuário'} • ${statusKey ? statusKey.replace('_', ' ').toUpperCase() : 'Nível não definido'}`}
    >
      {/* Anel interno de brilho */}
      {showGlow && statusKey && (
        <div 
          className={cn(
            'absolute inset-0 rounded-full opacity-30',
            `bg-gradient-to-br ${visual.gradient}`
          )}
          style={{ filter: 'blur(2px)' }}
        />
      )}
      
      {/* StatusCrown canônico */}
      <StatusCrown 
        size={sizeConfig.crownSize}
        colorClass={visual.iconColor}
        className="relative z-10"
      />
    </div>
  );
}
