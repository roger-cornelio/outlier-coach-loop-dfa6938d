import { StatusCrown, type StatusCrownSize } from '@/components/ui/StatusCrown';
import { cn } from '@/lib/utils';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * StatusCrownPreset — Preset Canônico do Ícone de Status
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * WRAPPER OBRIGATÓRIO para garantir pixel-match entre:
 *   - Status Badge/Header do atleta
 *   - Jornada de Evolução (LevelProgress)
 *   - Qualquer outro uso do símbolo de status
 * 
 * REGRAS:
 *   - Não permite override de stroke, viewBox ou proporção
 *   - Aceita apenas: size (opcional), colorClass (opcional)
 *   - Classe drop-shadow-md é FIXA para todos os usos
 */

interface StatusCrownPresetProps {
  /** Tamanho do ícone (default: 'md') */
  size?: StatusCrownSize;
  /** Cor customizada (tailwind class) - deve seguir o padrão do status */
  colorClass?: string;
  /** Classes adicionais de posicionamento APENAS (não afeta visual do ícone) */
  className?: string;
}

/**
 * StatusCrownPreset — Uso canônico do símbolo de status
 * 
 * @example
 * // No badge de status
 * <StatusCrownPreset size="sm" colorClass="text-amber-400" />
 * 
 * // Na jornada (step icon)
 * <StatusCrownPreset size="lg" />
 * 
 * // Hero/destaque
 * <StatusCrownPreset size="hero" colorClass="text-amber-900" />
 */
export function StatusCrownPreset({
  size = 'md',
  colorClass,
  className,
}: StatusCrownPresetProps) {
  return (
    <StatusCrown
      size={size}
      colorClass={colorClass}
      // ═══════════════════════════════════════════════════════════════════════
      // CLASSE FIXA — drop-shadow-md é parte do preset canônico
      // ═══════════════════════════════════════════════════════════════════════
      className={cn('drop-shadow-md', className)}
    />
  );
}

export default StatusCrownPreset;
