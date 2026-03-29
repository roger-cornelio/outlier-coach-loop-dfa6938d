/**
 * MAIN BLOCK IDENTIFIER - Identificação automática por prioridade
 * 
 * ============================================================
 * PRINCÍPIO: PRIORIDADE AUTOMÁTICA (Categoria + Duração)
 * ============================================================
 * - NÃO exige marcação manual do coach
 * - Score = CATEGORY_PRIORITY_WEIGHT[tipo] + duracaoEstimadaMinutos
 * - Bloco com maior score = "principal" (para badge e proteção)
 * - Corrida NUNCA é removida, apenas reduzida
 * ============================================================
 */

import type { WorkoutBlock, DayWorkout } from '@/types/outlier';
import { CATEGORY_PRIORITY_WEIGHT, NEVER_REMOVE_CATEGORIES } from '@/utils/categoryValidation';

export interface MainBlockResult {
  block: WorkoutBlock | null;
  blockIndex: number;
  reason: 'auto_priority' | 'manual' | 'none';
  score: number;
}

/**
 * Estima a duração de um bloco em minutos
 */
export function estimateBlockDuration(block: WorkoutBlock): number {
  if (block.durationMinutes && block.durationMinutes > 0) {
    return block.durationMinutes;
  }
  
  if (block.targetRange) {
    return (block.targetRange.max + block.targetRange.min) / 2 / 60;
  }
  
  const content = block.content.toLowerCase();
  
  const amrapMatch = content.match(/amrap\s*(\d+)/i);
  if (amrapMatch) return parseInt(amrapMatch[1], 10);
  
  const emomMatch = content.match(/emom\s*(\d+)/i);
  if (emomMatch) return parseInt(emomMatch[1], 10);
  
  const roundsMatch = content.match(/(\d+)\s*rounds?/i);
  if (roundsMatch) return parseInt(roundsMatch[1], 10) * 3;
  
  switch (block.type) {
    case 'conditioning':
    case 'metcon':
      return 15;
    case 'corrida':
      return 20;
    case 'forca':
      return 10;
    case 'especifico':
      return 12;
    case 'core':
    case 'acessorio':
      return 8;
    case 'aquecimento':
      return 10;
    case 'mobilidade':
      return 10;
    case 'tecnica':
      return 15;
    case 'notas':
      return 0;
    default:
      return 5;
  }
}

/**
 * Calcula score de prioridade de um bloco
 * Score = peso da categoria + duração estimada em minutos
 */
export function calculateBlockScore(block: WorkoutBlock): number {
  const categoryWeight = CATEGORY_PRIORITY_WEIGHT[block.type] ?? 0;
  const duration = estimateBlockDuration(block);
  return categoryWeight + duration;
}

/**
 * Identifica o bloco principal de um treino
 * REGRA: isMainWod manual tem prioridade absoluta.
 * Caso contrário, bloco com maior score (categoria + duração) é o principal.
 */
export function identifyMainBlock(blocks: WorkoutBlock[]): MainBlockResult {
  if (!blocks || blocks.length === 0) {
    return { block: null, blockIndex: -1, reason: 'none', score: 0 };
  }
  
  // Prioridade 1: Override manual (backward compat)
  const manualMainIndex = blocks.findIndex(b => b.isMainWod === true);
  if (manualMainIndex >= 0) {
    return {
      block: blocks[manualMainIndex],
      blockIndex: manualMainIndex,
      reason: 'manual',
      score: calculateBlockScore(blocks[manualMainIndex]),
    };
  }
  
  // Prioridade 2: Score automático (categoria + duração)
  let bestIndex = -1;
  let bestScore = -1;
  
  blocks.forEach((block, index) => {
    // Notas não podem ser principal
    if (block.type === 'notas') return;
    
    const score = calculateBlockScore(block);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  
  if (bestIndex >= 0) {
    return {
      block: blocks[bestIndex],
      blockIndex: bestIndex,
      reason: 'auto_priority',
      score: bestScore,
    };
  }
  
  return { block: null, blockIndex: -1, reason: 'none', score: 0 };
}

/**
 * Obtém o bloco principal de um treino
 */
export function getMainBlock(blocks: WorkoutBlock[]): WorkoutBlock | null {
  return identifyMainBlock(blocks).block;
}

/**
 * @deprecated Prioridade automática substituiu marcação manual
 */
export function setAsMainBlock(blocks: WorkoutBlock[], targetIndex: number): WorkoutBlock[] {
  return blocks.map((block, index) => ({
    ...block,
    isMainWod: index === targetIndex,
  }));
}

/**
 * @deprecated Prioridade automática substituiu marcação manual
 */
export function clearMainBlock(blocks: WorkoutBlock[]): WorkoutBlock[] {
  return blocks.map(block => ({
    ...block,
    isMainWod: undefined,
  }));
}

/**
 * Verifica se um bloco é o principal (automático ou manual)
 */
export function isMainBlock(blocks: WorkoutBlock[], blockIndex: number): boolean {
  const result = identifyMainBlock(blocks);
  return result.blockIndex === blockIndex;
}

/**
 * Ordena blocos para adaptação por tempo:
 * - Menor score primeiro (removidos primeiro)
 * - Corrida NUNCA é removida, vai para o final
 */
export function sortBlocksForTimeAdaptation(blocks: WorkoutBlock[]): WorkoutBlock[] {
  const scored = blocks.map((block, index) => ({
    block,
    index,
    score: calculateBlockScore(block),
    neverRemove: NEVER_REMOVE_CATEGORIES.has(block.type),
  }));
  
  // Ordenar: neverRemove ao final, depois por score crescente
  scored.sort((a, b) => {
    if (a.neverRemove && !b.neverRemove) return 1;
    if (!a.neverRemove && b.neverRemove) return -1;
    return a.score - b.score;
  });
  
  return scored.map(s => s.block);
}

/**
 * Retorna blocos que podem ser removidos para reduzir tempo
 * Corrida NUNCA é removida. Notas e aquecimento podem ser removidos.
 */
export function getRemovableBlocks(blocks: WorkoutBlock[]): WorkoutBlock[] {
  const mainResult = identifyMainBlock(blocks);
  
  return blocks.filter((block, index) => {
    // Nunca remover o bloco principal
    if (index === mainResult.blockIndex) return false;
    // Nunca remover corrida (apenas reduzir duração)
    if (NEVER_REMOVE_CATEGORIES.has(block.type)) return false;
    // Notas não ocupam tempo
    if (block.type === 'notas') return false;
    return true;
  });
}
