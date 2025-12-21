/**
 * MAIN BLOCK IDENTIFIER - Identificação automática do bloco principal
 * 
 * REGRAS DE IDENTIFICAÇÃO (em ordem de prioridade):
 * 1. Override manual: se isMainWod === true (definido pelo coach), usa esse
 * 2. Tipo "conditioning" ou block.type === "main" → candidato principal
 * 3. Bloco com maior impacto fisiológico (maior duração)
 * 4. Fallback por palavras-chave no título
 * 
 * GARANTIAS:
 * - Máximo 1 bloco principal por treino
 * - Se múltiplos candidatos, escolhe o de maior duração
 */

import type { WorkoutBlock, DayWorkout } from '@/types/outlier';

// Palavras-chave que indicam bloco principal
const MAIN_BLOCK_KEYWORDS = [
  'wod',
  'workout',
  'principal',
  'amrap',
  'for time',
  'fortime',
  'emom',
  'metcon',
  'conditioning',
  'circuito',
  'hyrox',
  'race',
  'corrida contínua',
  'corrida continua',
];

// Tipos de bloco com alta prioridade para ser principal
const HIGH_PRIORITY_TYPES: WorkoutBlock['type'][] = ['conditioning', 'corrida', 'especifico'];

// Tipos de bloco que NUNCA devem ser principais
const NEVER_MAIN_TYPES: WorkoutBlock['type'][] = ['aquecimento', 'notas'];

export interface MainBlockResult {
  block: WorkoutBlock | null;
  blockIndex: number;
  reason: 'manual' | 'type' | 'duration' | 'keyword' | 'fallback' | 'none';
}

/**
 * Verifica se o título contém palavras-chave de bloco principal
 */
function hasMainKeyword(title: string): boolean {
  const normalizedTitle = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return MAIN_BLOCK_KEYWORDS.some(keyword => normalizedTitle.includes(keyword));
}

/**
 * Estima a duração de um bloco em minutos
 * Usa durationMinutes se disponível, ou estima pelo conteúdo
 */
function estimateBlockDuration(block: WorkoutBlock): number {
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
      return 15;
    case 'corrida':
      return 20;
    case 'forca':
      return 10;
    case 'especifico':
      return 12;
    case 'core':
      return 8;
    case 'aquecimento':
      return 10;
    default:
      return 5;
  }
}

/**
 * Identifica o bloco principal de um treino
 */
export function identifyMainBlock(blocks: WorkoutBlock[]): MainBlockResult {
  if (!blocks || blocks.length === 0) {
    return { block: null, blockIndex: -1, reason: 'none' };
  }
  
  // 1. PRIORIDADE MÁXIMA: Override manual (isMainWod === true)
  const manualMainIndex = blocks.findIndex(b => b.isMainWod === true);
  if (manualMainIndex >= 0) {
    return {
      block: blocks[manualMainIndex],
      blockIndex: manualMainIndex,
      reason: 'manual',
    };
  }
  
  // Filtrar blocos que NUNCA podem ser principais
  const eligibleBlocks = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => !NEVER_MAIN_TYPES.includes(block.type));
  
  if (eligibleBlocks.length === 0) {
    return { block: null, blockIndex: -1, reason: 'none' };
  }
  
  // 2. Blocos com tipo de alta prioridade
  const highPriorityBlocks = eligibleBlocks.filter(
    ({ block }) => HIGH_PRIORITY_TYPES.includes(block.type)
  );
  
  if (highPriorityBlocks.length === 1) {
    return {
      block: highPriorityBlocks[0].block,
      blockIndex: highPriorityBlocks[0].index,
      reason: 'type',
    };
  }
  
  if (highPriorityBlocks.length > 1) {
    // Múltiplos candidatos: escolher o de maior duração
    const sorted = highPriorityBlocks.sort(
      (a, b) => estimateBlockDuration(b.block) - estimateBlockDuration(a.block)
    );
    return {
      block: sorted[0].block,
      blockIndex: sorted[0].index,
      reason: 'duration',
    };
  }
  
  // 3. Buscar por palavras-chave no título
  const keywordBlocks = eligibleBlocks.filter(
    ({ block }) => hasMainKeyword(block.title)
  );
  
  if (keywordBlocks.length === 1) {
    return {
      block: keywordBlocks[0].block,
      blockIndex: keywordBlocks[0].index,
      reason: 'keyword',
    };
  }
  
  if (keywordBlocks.length > 1) {
    // Múltiplos candidatos: escolher o de maior duração
    const sorted = keywordBlocks.sort(
      (a, b) => estimateBlockDuration(b.block) - estimateBlockDuration(a.block)
    );
    return {
      block: sorted[0].block,
      blockIndex: sorted[0].index,
      reason: 'duration',
    };
  }
  
  // 4. Fallback: bloco de maior duração entre os elegíveis
  const sorted = eligibleBlocks.sort(
    (a, b) => estimateBlockDuration(b.block) - estimateBlockDuration(a.block)
  );
  
  return {
    block: sorted[0].block,
    blockIndex: sorted[0].index,
    reason: 'fallback',
  };
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
