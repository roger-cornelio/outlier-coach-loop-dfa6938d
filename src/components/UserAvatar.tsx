import { User, UserRound, Crown, Star, Flame, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AthleteStatus, TrainingLevel } from '@/types/outlier';

// ============================================
// AVATAR COM SÍMBOLO DO STATUS DO ATLETA
// Exibe o ícone do nível em vez de silhueta de pessoa
// ============================================

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

// Configuração visual por STATUS do atleta (fonte de verdade)
const STATUS_VISUAL: Record<AthleteStatus, {
  icon: typeof Crown;
  gradient: string;
  border: string;
  glow: string;
  glowIntensity: string;
  iconColor: string;
  animate: boolean;
}> = {
  iniciante: {
    icon: Target,
    gradient: 'from-slate-500 to-slate-600',
    border: 'border-slate-400/60',
    glow: 'rgba(100, 116, 139, 0.3)',
    glowIntensity: '0 0 12px',
    iconColor: 'text-slate-100',
    animate: false,
  },
  intermediario: {
    icon: Zap,
    gradient: 'from-emerald-500 to-green-600',
    border: 'border-emerald-400/70',
    glow: 'rgba(16, 185, 129, 0.4)',
    glowIntensity: '0 0 16px',
    iconColor: 'text-emerald-100',
    animate: false,
  },
  avancado: {
    icon: Flame,
    gradient: 'from-orange-500 to-red-600',
    border: 'border-orange-400/80',
    glow: 'rgba(249, 115, 22, 0.5)',
    glowIntensity: '0 0 20px',
    iconColor: 'text-orange-100',
    animate: false,
  },
  hyrox_open: {
    icon: Star,
    gradient: 'from-purple-500 to-pink-600',
    border: 'border-purple-400/80',
    glow: 'rgba(168, 85, 247, 0.5)',
    glowIntensity: '0 0 24px',
    iconColor: 'text-purple-100',
    animate: true,
  },
  hyrox_pro: {
    icon: Crown,
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    border: 'border-amber-400',
    glow: 'rgba(251, 191, 36, 0.6)',
    glowIntensity: '0 0 28px, 0 0 40px',
    iconColor: 'text-amber-100',
    animate: true,
  },
};

// Cores padrão (fallback - sem status definido)
const DEFAULT_VISUAL = {
  icon: Target,
  gradient: 'from-muted to-muted',
  border: 'border-border',
  glow: 'transparent',
  glowIntensity: 'none',
  iconColor: 'text-muted-foreground',
  animate: false,
};

// Tamanhos do avatar
const SIZE_CONFIG: Record<AvatarSize, { 
  container: string; 
  icon: string; 
}> = {
  sm: { container: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { container: 'w-10 h-10', icon: 'w-5 h-5' },
  lg: { container: 'w-12 h-12', icon: 'w-6 h-6' },
  xl: { container: 'w-16 h-16', icon: 'w-8 h-8' },
};

/**
 * Componente de avatar com símbolo do status do atleta.
 * Exibe o ícone do nível (Target, Zap, Flame, Star, Crown) 
 * com cor, gradiente, glow e animação baseados no status.
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
  // Prioridade: athleteStatus (calculado)
  const statusKey = athleteStatus || null;
  const visual = statusKey ? STATUS_VISUAL[statusKey] : DEFAULT_VISUAL;
  const sizeConfig = SIZE_CONFIG[size];
  
  // Ícone do status
  const StatusIcon = visual.icon;

  return (
    <div
      className={cn(
        // Base
        'relative rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300 overflow-hidden',
        // Tamanho
        sizeConfig.container,
        // Gradiente de fundo
        `bg-gradient-to-br ${visual.gradient}`,
        // Borda
        visual.border,
        // Animação para níveis altos
        visual.animate && 'animate-pulse-slow',
        // Classes customizadas
        className
      )}
      style={{
        // Glow externo baseado no status
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
          style={{
            filter: 'blur(2px)',
          }}
        />
      )}
      
      {/* Símbolo do STATUS do atleta */}
      <StatusIcon 
        className={cn(
          'relative z-10',
          sizeConfig.icon,
          visual.iconColor,
          'drop-shadow-sm'
        )}
        strokeWidth={2.5}
      />
    </div>
  );
}
