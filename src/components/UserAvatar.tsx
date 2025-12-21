import { User, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AthleteStatus, TrainingLevel } from '@/types/outlier';

// ============================================
// AVATAR AUTOMÁTICO BASEADO EM SEXO E NÍVEL
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

// Mapeamento de cores por nível de treino
const LEVEL_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  // Training Levels (do config)
  base: {
    bg: 'bg-blue-600',
    border: 'border-blue-400',
    text: 'text-blue-100',
    glow: 'shadow-blue-500/40',
  },
  progressivo: {
    bg: 'bg-emerald-600',
    border: 'border-emerald-400',
    text: 'text-emerald-100',
    glow: 'shadow-emerald-500/40',
  },
  performance: {
    bg: 'bg-orange-600',
    border: 'border-orange-400',
    text: 'text-orange-100',
    glow: 'shadow-orange-500/40',
  },
  // Athlete Status (níveis calculados)
  iniciante: {
    bg: 'bg-slate-600',
    border: 'border-slate-400',
    text: 'text-slate-100',
    glow: 'shadow-slate-500/40',
  },
  intermediario: {
    bg: 'bg-emerald-600',
    border: 'border-emerald-400',
    text: 'text-emerald-100',
    glow: 'shadow-emerald-500/40',
  },
  avancado: {
    bg: 'bg-purple-600',
    border: 'border-purple-400',
    text: 'text-purple-100',
    glow: 'shadow-purple-500/40',
  },
  hyrox_open: {
    bg: 'bg-amber-600',
    border: 'border-amber-400',
    text: 'text-amber-100',
    glow: 'shadow-amber-500/40',
  },
  hyrox_pro: {
    bg: 'bg-gradient-to-br from-yellow-500 to-amber-600',
    border: 'border-yellow-400',
    text: 'text-yellow-100',
    glow: 'shadow-yellow-500/50',
  },
};

// Cores padrão (fallback)
const DEFAULT_COLORS = {
  bg: 'bg-muted',
  border: 'border-border',
  text: 'text-muted-foreground',
  glow: '',
};

// Tamanhos do avatar
const SIZE_CONFIG: Record<AvatarSize, { container: string; icon: string; text: string }> = {
  sm: { container: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-xs font-bold' },
  md: { container: 'w-10 h-10', icon: 'w-5 h-5', text: 'text-sm font-bold' },
  lg: { container: 'w-12 h-12', icon: 'w-6 h-6', text: 'text-base font-bold' },
  xl: { container: 'w-16 h-16', icon: 'w-8 h-8', text: 'text-lg font-bold' },
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
 * Componente de avatar automático baseado em sexo e nível de treino.
 * Não usa upload de imagem - apenas ícones vetoriais e cores.
 */
export function UserAvatar({
  name,
  gender,
  trainingLevel,
  athleteStatus,
  size = 'md',
  className,
  showGlow = false,
}: UserAvatarProps) {
  // Prioridade: trainingLevel > athleteStatus
  const levelKey = trainingLevel || athleteStatus || null;
  const colors = levelKey ? (LEVEL_COLORS[levelKey] || DEFAULT_COLORS) : DEFAULT_COLORS;
  const sizeConfig = SIZE_CONFIG[size];

  // Determinar conteúdo: ícone de gênero ou iniciais
  const renderContent = () => {
    const iconClasses = cn(sizeConfig.icon, colors.text);
    
    if (gender === 'feminino') {
      // Ícone feminino (UserRound com estilo suave)
      return <UserRound className={iconClasses} strokeWidth={2.5} />;
    } else if (gender === 'masculino') {
      // Ícone masculino (User padrão)
      return <User className={iconClasses} strokeWidth={2.5} />;
    } else {
      // Fallback: iniciais do nome
      return (
        <span className={cn(sizeConfig.text, colors.text)}>
          {getInitials(name)}
        </span>
      );
    }
  };

  return (
    <div
      className={cn(
        // Base
        'rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-200',
        // Tamanho
        sizeConfig.container,
        // Cores baseadas no nível
        colors.bg,
        colors.border,
        // Glow opcional
        showGlow && colors.glow && `shadow-lg ${colors.glow}`,
        // Classes customizadas
        className
      )}
      title={`${name || 'Usuário'} • ${levelKey || 'Nível não definido'}`}
    >
      {renderContent()}
    </div>
  );
}
