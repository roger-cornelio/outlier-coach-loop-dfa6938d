import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * StatusCrown — Componente Canônico de Ícone de Status
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ÚNICO ícone de status do atleta em todo o app.
 * Garante consistência pixel-perfect: mesmo stroke, viewBox e proporção.
 * 
 * USO OBRIGATÓRIO: Substituir <Crown /> por <StatusCrown /> em TODOS os 
 * pontos onde o status do atleta é exibido.
 */

export type StatusCrownSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';

interface StatusCrownProps {
  /** Tamanho do ícone */
  size?: StatusCrownSize;
  /** Cor customizada (tailwind class) */
  colorClass?: string;
  /** Classes adicionais */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESCALA CANÔNICA — Proporções fixas para cada tamanho
// ═══════════════════════════════════════════════════════════════════════════
const SIZE_MAP: Record<StatusCrownSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  hero: 'w-20 h-20',
};

// ═══════════════════════════════════════════════════════════════════════════
// PROPRIEDADES CANÔNICAS DO ÍCONE
// ═══════════════════════════════════════════════════════════════════════════
const CANONICAL_STROKE_WIDTH = 1.5;

/**
 * StatusCrown — Coroa canônica do status do atleta
 * 
 * @example
 * // Uso básico
 * <StatusCrown size="md" />
 * 
 * // Com cor customizada
 * <StatusCrown size="lg" colorClass="text-amber-400" />
 */
export function StatusCrown({ 
  size = 'md', 
  colorClass,
  className 
}: StatusCrownProps) {
  return (
    <Crown
      className={cn(
        SIZE_MAP[size],
        colorClass,
        'drop-shadow-sm',
        className
      )}
      strokeWidth={CANONICAL_STROKE_WIDTH}
      // Propriedades fixas para consistência visual
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export default StatusCrown;
