/**
 * blockDisplayUtils.ts - Utilitários para exibição de blocos de treino
 * 
 * MVP0: Garantir que título real seja exibido (nunca "Bloco X" se há título)
 * e que a categoria seja sempre visível.
 */

import { WorkoutBlock } from '@/types/outlier';
import { BLOCK_CATEGORIES } from '@/utils/categoryValidation';

/**
 * Retorna o título para exibição do bloco
 * REGRA: Se existe título real, usar. Senão, "Bloco {index + 1}"
 */
export function getBlockDisplayTitle(
  block: { title?: string | null },
  blockIndex: number
): string {
  const title = block.title?.trim();
  if (title && title.length > 0) {
    return title;
  }
  return `Bloco ${blockIndex + 1}`;
}

/**
 * Retorna o label da categoria para exibição
 * REGRA: Se existe categoria, mostrar label. Senão, "Sem categoria"
 */
export function getBlockCategoryLabel(
  block: { type?: string | null }
): string {
  const category = block.type?.trim();
  if (!category || category.length === 0) {
    return 'Sem categoria';
  }
  
  // Buscar label amigável na lista de categorias
  const categoryInfo = BLOCK_CATEGORIES.find(c => c.value === category);
  if (categoryInfo) {
    return categoryInfo.label;
  }
  
  // Fallback: retornar o valor como está
  return category;
}

/**
 * Verifica se o bloco tem título real (não auto-gerado)
 */
export function hasRealTitle(block: { title?: string | null }): boolean {
  const title = block.title?.trim();
  if (!title || title.length === 0) return false;
  
  // Considerar "Bloco X" como auto-gerado
  if (/^Bloco \d+$/i.test(title) || /^BLOCO \d+$/i.test(title)) {
    return false;
  }
  
  return true;
}

/**
 * Verifica se o bloco tem categoria definida
 */
export function hasCategory(block: { type?: string | null }): boolean {
  const category = block.type?.trim();
  return !!category && category.length > 0;
}
