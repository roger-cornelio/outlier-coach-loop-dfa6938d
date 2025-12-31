import { cn } from '@/lib/utils';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OutlierWordmark — Marca Canônica "OUTLIER"
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Componente que renderiza "OUTLIER" com tipografia e cor TRAVADAS.
 * Garante consistência pixel-perfect em todo o app.
 * 
 * REGRAS VISUAIS FIXAS (NÃO MODIFICAR):
 * - font-family: var(--font-display) (condensada)
 * - font-weight: 700 (bold)
 * - text-transform: uppercase
 * - letter-spacing: 0.1em (tracking-widest)
 * - cor: gradiente laranja oficial (text-gradient-logo)
 * 
 * Props permitidas:
 * - size: controla apenas a escala (sm, md, lg, xl, hero)
 * - className: para alinhamento/posição, SEM alterar fonte/cor/peso
 */

export type WordmarkSize = 'sm' | 'md' | 'lg' | 'xl' | 'hero';

interface OutlierWordmarkProps {
  /** Tamanho do texto (escala proporcional) */
  size?: WordmarkSize;
  /** Classes adicionais para posicionamento (NÃO para estilo visual) */
  className?: string;
  /** Handler de clique opcional (para QA triggers ocultos) */
  onClick?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESCALA DE TAMANHOS — Apenas tamanho de fonte, resto é fixo
// ═══════════════════════════════════════════════════════════════════════════
const SIZE_MAP: Record<WordmarkSize, string> = {
  sm: 'text-2xl md:text-3xl',
  md: 'text-4xl md:text-5xl',
  lg: 'text-5xl md:text-6xl',
  xl: 'text-6xl md:text-7xl',
  hero: 'text-7xl md:text-9xl',
};

/**
 * OutlierWordmark — Renderiza a marca "OUTLIER" com estilo canônico
 * 
 * @example
 * // Hero (maior, para telas de login/welcome)
 * <OutlierWordmark size="hero" />
 * 
 * // Header (menor)
 * <OutlierWordmark size="sm" />
 */
export function OutlierWordmark({ 
  size = 'hero', 
  className,
  onClick,
}: OutlierWordmarkProps) {
  return (
    <span
      className={cn(
        // ═══════════════════════════════════════════════════════════════
        // ESTILOS TRAVADOS — NÃO MODIFICAR
        // ═══════════════════════════════════════════════════════════════
        'font-display',           // Fonte condensada oficial
        'font-bold',              // Peso 700
        'tracking-widest',        // letter-spacing amplo
        'uppercase',              // Sempre maiúscula
        'text-gradient-logo',     // Gradiente laranja oficial
        'select-none',            // Não selecionável
        'cursor-default',         // Cursor padrão
        // ═══════════════════════════════════════════════════════════════
        SIZE_MAP[size],
        className
      )}
      onClick={onClick}
    >
      OUTLIER
    </span>
  );
}

export default OutlierWordmark;
