/**
 * MAIN BLOCK IDENTIFIER - Identificação do bloco principal
 * 
 * ============================================================
 * PRINCÍPIO FUNDAMENTAL: ATLETA > COACH
 * ============================================================
 * - Nenhum bloco nasce como principal (zero inferência)
 * - O coach DEVE marcar explicitamente qual é o WOD principal
 * - Se não marcado, o sistema BLOQUEIA publicação (protege atleta)
 * ============================================================
 * 
 * REGRAS DE IDENTIFICAÇÃO (ÚNICA):
 * 1. Se isMainWod === true (definido manualmente pelo coach), esse é o principal
 * 2. Caso contrário, retorna null (exige ação do coach)
 * 
 * GARANTIAS:
 * - Máximo 1 bloco principal por treino
 * - Bloco principal só existe se marcado manualmente
 * - Tipo do bloco (força, conditioning, etc.) NÃO define hierarquia
 */

import type { WorkoutBlock, DayWorkout } from '@/types/outlier';

// Tipos de bloco que NUNCA devem ser principais (para validação)
const NEVER_MAIN_TYPES: WorkoutBlock['type'][] = ['aquecimento', 'notas', 'mobilidade', 'tecnica'];

export interface MainBlockResult {
  block: WorkoutBlock | null;
  blockIndex: number;
  reason: 'manual' | 'none';
}

// Função removida - não há mais detecção por palavras-chave

/**
 * Estima a duração de um bloco em minutos
 * Usa durationMinutes se disponível, ou estima pelo conteúdo
 */
export function estimateBlockDuration(block: WorkoutBlock): number {
  // Se tem duração explícita, usa ela
  if (block.durationMinutes && block.durationMinutes > 0) {
    return block.durationMinutes;
  }
  
  // Estima pela range de tempo alvo
  if (block.targetRange) {
    return (block.targetRange.max + block.targetRange.min) / 2 / 60;
  }
  
  // Estima pelo conteúdo (heurística simples)
  const content = block.content.toLowerCase();
  
  // AMRAP geralmente indica duração no texto
  const amrapMatch = content.match(/amrap\s*(\d+)/i);
  if (amrapMatch) {
    return parseInt(amrapMatch[1], 10);
  }
  
  // EMOM geralmente indica duração
  const emomMatch = content.match(/emom\s*(\d+)/i);
  if (emomMatch) {
    return parseInt(emomMatch[1], 10);
  }
  
  // For Time pode ter rounds que indicam duração aproximada
  const roundsMatch = content.match(/(\d+)\s*rounds?/i);
  if (roundsMatch) {
    const rounds = parseInt(roundsMatch[1], 10);
    return rounds * 3; // Estimativa: ~3 min por round
  }
  
  // Fallback baseado no tipo
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
 * Identifica o bloco principal de um treino
 * REGRA ÚNICA: Só retorna bloco se isMainWod === true (marcado pelo coach)
 * NÃO há detecção automática!
 */
export function identifyMainBlock(blocks: WorkoutBlock[]): MainBlockResult {
  if (!blocks || blocks.length === 0) {
    return { block: null, blockIndex: -1, reason: 'none' };
  }
  
  // ÚNICA REGRA: Override manual (isMainWod === true)
  const manualMainIndex = blocks.findIndex(b => b.isMainWod === true);
  if (manualMainIndex >= 0) {
    return {
      block: blocks[manualMainIndex],
      blockIndex: manualMainIndex,
      reason: 'manual',
    };
  }
  
  // Nenhum bloco marcado como principal - retorna null
  // O coach DEVE marcar explicitamente
  return { block: null, blockIndex: -1, reason: 'none' };
}

/**
 * Obtém o bloco principal de um treino, garantindo que exista no máximo 1
 * Retorna o bloco identificado automaticamente ou null
 */
export function getMainBlock(blocks: WorkoutBlock[]): WorkoutBlock | null {
  return identifyMainBlock(blocks).block;
}

/**
 * Define um bloco como principal, removendo a marcação de outros
 * Retorna os blocos atualizados
 */
export function setAsMainBlock(blocks: WorkoutBlock[], targetIndex: number): WorkoutBlock[] {
  return blocks.map((block, index) => ({
    ...block,
    isMainWod: index === targetIndex,
  }));
}

/**
 * Remove a marcação de bloco principal de todos os blocos
 * Retorna os blocos atualizados
 */
export function clearMainBlock(blocks: WorkoutBlock[]): WorkoutBlock[] {
  return blocks.map(block => ({
    ...block,
    isMainWod: undefined,
  }));
}

/**
 * Verifica se um bloco é o principal (manual ou automático)
 */
export function isMainBlock(blocks: WorkoutBlock[], blockIndex: number): boolean {
  const result = identifyMainBlock(blocks);
  return result.blockIndex === blockIndex;
}

/**
 * Ordena blocos para adaptação por tempo:
 * - Blocos secundários primeiro (serão removidos primeiro se necessário)
 * - Bloco principal por último (será reduzido apenas como último recurso)
 */
export function sortBlocksForTimeAdaptation(blocks: WorkoutBlock[]): WorkoutBlock[] {
  const mainResult = identifyMainBlock(blocks);
  const mainIndex = mainResult.blockIndex;
  
  if (mainIndex < 0) {
    return blocks;
  }
  
  // Criar cópia ordenada: secundários primeiro, principal último
  const secondary = blocks.filter((_, index) => index !== mainIndex);
  const main = blocks[mainIndex];
  
  return [...secondary, main];
}

/**
 * Retorna blocos que podem ser removidos para reduzir tempo
 * (todos exceto o principal e aquecimento)
 */
export function getRemovableBlocks(blocks: WorkoutBlock[]): WorkoutBlock[] {
  const mainResult = identifyMainBlock(blocks);
  
  return blocks.filter((block, index) => {
    // Nunca remover o bloco principal
    if (index === mainResult.blockIndex) return false;
    // Nunca remover aquecimento
    if (block.type === 'aquecimento') return false;
    // Blocos de notas não ocupam tempo, não precisa remover
    if (block.type === 'notas') return false;
    return true;
  });
}
