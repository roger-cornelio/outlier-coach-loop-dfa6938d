import { User, UserRound, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AthleteStatus, TrainingLevel } from '@/types/outlier';

// ============================================
// AVATAR COM STATUS VISUAL DO ATLETA
// Cor, borda, glow, animação e COROA interna
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

// Status que exibem coroa (apenas os mais altos)
const CROWN_STATUS: AthleteStatus[] = ['avancado', 'hyrox_open', 'hyrox_pro'];

// Configuração visual por STATUS do atleta (fonte de verdade)
const STATUS_VISUAL: Record<AthleteStatus, {
  gradient: string;
  border: string;
  glow: string;
  glowIntensity: string;
  text: string;
  crownColor: string;
  animate: boolean;
}> = {
  iniciante: {
    gradient: 'from-slate-500 to-slate-600',
    border: 'border-slate-400/60',
    glow: 'rgba(100, 116, 139, 0.3)',
    glowIntensity: '0 0 12px',
    text: 'text-slate-200',
    crownColor: '', // sem coroa
    animate: false,
  },
  intermediario: {
    gradient: 'from-emerald-500 to-green-600',
    border: 'border-emerald-400/70',
    glow: 'rgba(16, 185, 129, 0.4)',
    glowIntensity: '0 0 16px',
    text: 'text-emerald-100',
    crownColor: '', // sem coroa
    animate: false,
  },
  avancado: {
    gradient: 'from-orange-500 to-red-600',
    border: 'border-orange-400/80',
    glow: 'rgba(249, 115, 22, 0.5)',
    glowIntensity: '0 0 20px',
    text: 'text-orange-100',
    crownColor: 'text-white/90',
    animate: false,
  },
  hyrox_open: {
    gradient: 'from-purple-500 to-pink-600',
    border: 'border-purple-400/80',
    glow: 'rgba(168, 85, 247, 0.5)',
    glowIntensity: '0 0 24px',
    text: 'text-purple-100',
    crownColor: 'text-white',
    animate: true,
  },
  hyrox_pro: {
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    border: 'border-amber-400',
    glow: 'rgba(251, 191, 36, 0.6)',
    glowIntensity: '0 0 28px, 0 0 40px',
    text: 'text-amber-100',
    crownColor: 'text-amber-900',
    animate: true,
  },
};

// Cores padrão (fallback - sem status definido)
const DEFAULT_VISUAL = {
  gradient: 'from-muted to-muted',
  border: 'border-border',
  glow: 'transparent',
  glowIntensity: 'none',
  text: 'text-muted-foreground',
  crownColor: '',
  animate: false,
};

// Tamanhos do avatar
const SIZE_CONFIG: Record<AvatarSize, { 
  container: string; 
  icon: string; 
  crown: string;
  crownTop: string;
  text: string;
}> = {
  sm: { container: 'w-8 h-8', icon: 'w-4 h-4', crown: 'w-2.5 h-2.5', crownTop: 'top-0.5', text: 'text-xs font-bold' },
  md: { container: 'w-10 h-10', icon: 'w-5 h-5', crown: 'w-3 h-3', crownTop: 'top-0.5', text: 'text-sm font-bold' },
  lg: { container: 'w-12 h-12', icon: 'w-6 h-6', crown: 'w-3.5 h-3.5', crownTop: 'top-1', text: 'text-base font-bold' },
  xl: { container: 'w-16 h-16', icon: 'w-8 h-8', crown: 'w-4 h-4', crownTop: 'top-1.5', text: 'text-lg font-bold' },
};

/**
 * Extrai as iniciais do nome (1 ou 2 caracteres)
 */
function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Componente de avatar com status visual do atleta.
 * Exibe cor, gradiente, glow, animação e coroa interna para status altos.
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
  // Prioridade: athleteStatus (calculado) > trainingLevel (config)
  const statusKey = athleteStatus || null;
  const visual = statusKey ? STATUS_VISUAL[statusKey] : DEFAULT_VISUAL;
  const sizeConfig = SIZE_CONFIG[size];
  
  // Exibir coroa apenas para status altos
  const showCrown = statusKey && CROWN_STATUS.includes(statusKey);

  // Determinar conteúdo: ícone de gênero ou iniciais
  const renderContent = () => {
    const iconClasses = cn(sizeConfig.icon, visual.text);
    
    if (gender === 'feminino') {
      return <UserRound className={iconClasses} strokeWidth={2.5} />;
    } else if (gender === 'masculino') {
      return <User className={iconClasses} strokeWidth={2.5} />;
    } else {
      return (
        <span className={cn(sizeConfig.text, visual.text)}>
          {getInitials(name)}
        </span>
      );
    }
  };

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
      
      {/* Coroa DENTRO do avatar (apenas status altos) */}
      {showCrown && (
        <Crown 
          className={cn(
            'absolute z-20',
            sizeConfig.crown,
            sizeConfig.crownTop,
            visual.crownColor,
            'drop-shadow-sm'
          )}
          strokeWidth={2.5}
          fill="currentColor"
        />
      )}
      
      {/* Conteúdo do avatar (ícone de usuário) */}
      <div className="relative z-10">
        {renderContent()}
      </div>
    </div>
  );
}
