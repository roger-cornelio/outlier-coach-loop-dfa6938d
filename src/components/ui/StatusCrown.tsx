import { Crown, Swords, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AthleteStatus } from '@/types/outlier';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * StatusCrown — Componente Canônico de Ícone de Status
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Renderiza o ícone correto baseado no status do atleta:
 *   - OPEN  → Seta para cima (ArrowUp)
 *   - PRO   → Espadas cruzadas (Swords)
 *   - ELITE → Coroa (Crown)
 * 
 * USO OBRIGATÓRIO: Substituir <Crown /> por <StatusCrown status={...} />
 * em TODOS os pontos onde o status do atleta é exibido.
 */

export type StatusCrownSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';

interface StatusCrownProps {
  /** Status do atleta — determina qual ícone é renderizado */
  status?: AthleteStatus;
  /** Tamanho do ícone */
  size?: StatusCrownSize;
  /** Cor customizada (tailwind class) */
  colorClass?: string;
  /** Classes adicionais */
  className?: string;
}

const SIZE_MAP: Record<StatusCrownSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  hero: 'w-20 h-20',
};

const CANONICAL_STROKE_WIDTH = 1.5;

/** Mapa status → ícone Lucide */
const STATUS_ICON_MAP: Record<AthleteStatus, typeof Crown> = {
  open: ArrowUp,
  pro: Swords,
  elite: Crown,
};

export function StatusCrown({ 
  status = 'elite',
  size = 'md', 
  colorClass,
  className 
}: StatusCrownProps) {
  const IconComponent = STATUS_ICON_MAP[status] ?? Crown;

  return (
    <IconComponent
      className={cn(
        SIZE_MAP[size],
        colorClass,
        'drop-shadow-sm',
        className
      )}
      strokeWidth={CANONICAL_STROKE_WIDTH}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export default StatusCrown;
