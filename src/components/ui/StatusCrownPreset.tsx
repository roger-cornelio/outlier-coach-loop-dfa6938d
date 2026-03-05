import { StatusCrown, type StatusCrownSize } from '@/components/ui/StatusCrown';
import { cn } from '@/lib/utils';
import type { AthleteStatus } from '@/types/outlier';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * StatusCrownPreset — Preset Canônico do Ícone de Status
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Renderiza o ícone correto por status (seta OPEN, espadas PRO, coroa ELITE).
 */

interface StatusCrownPresetProps {
  /** Status do atleta — determina qual ícone */
  status?: AthleteStatus;
  /** Tamanho do ícone (default: 'md') */
  size?: StatusCrownSize;
  /** Cor customizada (tailwind class) */
  colorClass?: string;
  /** Classes adicionais de posicionamento */
  className?: string;
}

export function StatusCrownPreset({
  status = 'elite',
  size = 'md',
  colorClass,
  className,
}: StatusCrownPresetProps) {
  return (
    <StatusCrown
      status={status}
      size={size}
      colorClass={colorClass}
      className={cn('drop-shadow-md', className)}
    />
  );
}

export default StatusCrownPreset;
