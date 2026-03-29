/**
 * MOTOR DE ADAPTAÇÃO INTELIGENTE POR TEMPO
 * =========================================
 * 
 * Integra a identificação do bloco principal com adaptação por tempo disponível.
 * 
 * REGRAS OBRIGATÓRIAS:
 * 1. Bloco principal definido por override manual OU lógica automática
 * 2. Quando tempo_disponivel < tempo_total_original:
 *    a) Remover blocos secundários em ordem de menor prioridade
 *    b) Recalcular tempo total após cada remoção
 *    c) Se ainda exceder, reduzir duração APENAS do bloco principal
 *    d) Se tempo < min_duration do bloco principal, bloquear e sugerir alternativo
 * 3. Recalcular duração real e calorias proporcionalmente
 * 4. Validar que soma dos blocos == tempo disponível (± tolerância)
 */

import type { WorkoutBlock, DayWorkout, TrainingLevel } from '@/types/outlier';
import { identifyMainBlock, MainBlockResult } from '@/utils/mainBlockIdentifier';

// ============================================
// TIPOS
// ============================================

export interface TimeAdaptationConfig {
  blocks: WorkoutBlock[];
  tempoDisponivel: number; // minutos
  nivel: TrainingLevel;
  sexo: 'masculino' | 'feminino';
}

export interface TimeAdaptationResult {
  success: boolean;
  blocks: WorkoutBlock[];
  removedBlocks: WorkoutBlock[];
  mainBlockReduced: boolean;
  mainBlockMinReached: boolean;
  originalDuration: number;
  adaptedDuration: number;
  warnings: string[];
  suggestAlternative: boolean;
  alternativeMessage?: string;
}

export interface BlockWithPriority {
  block: WorkoutBlock;
  index: number;
  priority: number; // 1 = mais importante, maior = menos importante
  estimatedMinutes: number;
  isMain: boolean;
  isRemovable: boolean;
}

// ============================================
// PRIORIDADES DE REMOÇÃO (maior = remover primeiro)
// ============================================

const REMOVAL_PRIORITY: Record<string, number> = {
  notas: 10,        // Notas não ocupam tempo real
  mobilidade: 9.5,  // Mobilidade é removível primeiro
  tecnica: 9.2,     // Técnica é removível cedo
  core: 9,          // Core é acessório
  especifico: 8,    // Específico é acessório  
  corrida: 7,       // Corrida pode ser secundária
  forca: 5,         // Força tem prioridade média
  conditioning: 2,  // Conditioning geralmente é o WOD principal
  aquecimento: 1,   // Aquecimento deve ser mantido se possível
};

// Duração mínima para o bloco principal (em minutos)
const MAIN_BLOCK_MIN_DURATION = 8;

// Tolerância de tempo (5%)
const TIME_TOLERANCE = 0.05;

// ============================================
// ESTIMATIVA DE DURAÇÃO MELHORADA
// ============================================

function estimateBlockMinutes(block: WorkoutBlock): number {
  // Se tem duração explícita, usa ela
  if (block.durationMinutes && block.durationMinutes > 0) {
    return block.durationMinutes;
  }
  
  // Estima pela range de tempo alvo
  if (block.targetRange) {
    return Math.ceil((block.targetRange.max + block.targetRange.min) / 2 / 60);
  }
  
  // Estimativas pelo conteúdo
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
  
  // For Time com rounds
  const roundsMatch = content.match(/(\d+)\s*rounds?/i);
  if (roundsMatch) {
    const rounds = parseInt(roundsMatch[1], 10);
    return rounds * 3; // ~3 min por round
  }
  
  // Fallback por tipo
  switch (block.type) {
    case 'conditioning':
    case 'metcon':
      return 15;
    case 'corrida':
      return 20;
    case 'forca':
      return 12;
    case 'especifico':
      return 10;
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

// ============================================
// CLASSIFICAÇÃO DE BLOCOS COM PRIORIDADE
// ============================================

export function classifyBlocksWithPriority(blocks: WorkoutBlock[]): BlockWithPriority[] {
  const mainResult = identifyMainBlock(blocks);
  const mainIndex = mainResult.blockIndex;
  
  return blocks.map((block, index) => {
    const isMain = index === mainIndex || block.isMainWod === true;
    
    // Bloco principal tem prioridade máxima (nunca remover)
    // Blocos com isMainWod manual também têm prioridade máxima
    let priority = REMOVAL_PRIORITY[block.type] ?? 5;
    
    if (isMain) {
      priority = 0; // Prioridade máxima, nunca remover
    }
    
    const estimatedMinutes = estimateBlockMinutes(block);
    
    // Notas e blocos sem tempo não são removíveis (não fazem diferença)
    const isRemovable = block.type !== 'notas' && estimatedMinutes > 0 && !isMain;
    
    return {
      block,
      index,
      priority,
      estimatedMinutes,
      isMain,
      isRemovable,
    };
  });
}

// ============================================
// CALCULAR TEMPO TOTAL DOS BLOCOS
// ============================================

export function calculateTotalTime(blocks: WorkoutBlock[]): number {
  return blocks.reduce((total, block) => {
    return total + estimateBlockMinutes(block);
  }, 0);
}

// ============================================
// ESCALONAR VOLUME DO BLOCO (para redução proporcional)
// ============================================

function scaleBlockContent(block: WorkoutBlock, ratio: number): WorkoutBlock {
  if (ratio >= 1.0) return block;
  
  // Limitar ratio mínimo a 0.4 (40%)
  const effectiveRatio = Math.max(0.4, ratio);
  
  const lines = block.content.split('\n');
  const scaledLines = lines.map(line => {
    let result = line;
    
    // Escalar metros
    result = result.replace(/(\d+)\s*m\b/gi, (match, p1) => {
      const v = parseInt(p1, 10);
      if (isNaN(v)) return match;
      return `${Math.max(25, Math.floor(v * effectiveRatio))}m`;
    });
    
    // Escalar calorias
    result = result.replace(/(\d+)\s*cal\b/gi, (match, p1) => {
      const v = parseInt(p1, 10);
      if (isNaN(v)) return match;
      return `${Math.max(5, Math.floor(v * effectiveRatio))}cal`;
    });
    
    // Escalar reps no início da linha
    result = result.replace(/^(\s*)(\d+)(\s+)([A-Za-zÀ-ÿ])/g, (match, p1, p2, p3, p4) => {
      const v = parseInt(p2, 10);
      if (isNaN(v)) return match;
      return `${p1}${Math.max(3, Math.floor(v * effectiveRatio))}${p3}${p4}`;
    });
    
    // Escalar rounds (mais conservador)
    result = result.replace(/(\d+)\s*(rounds?|sets?|rodadas?)/gi, (match, p1, p2) => {
      const v = parseInt(p1, 10);
      if (isNaN(v)) return match;
      const roundRatio = Math.max(0.5, effectiveRatio);
      return `${Math.max(1, Math.floor(v * roundRatio))} ${p2}`;
    });
    
    // Escalar AMRAP/EMOM minutos
    result = result.replace(/\b(AMRAP|EMOM)\s*(\d+)/gi, (match, p1, p2) => {
      const v = parseInt(p2, 10);
      if (isNaN(v)) return match;
      return `${p1} ${Math.max(4, Math.floor(v * effectiveRatio))}`;
    });
    
    return result;
  });
  
  // Atualizar durationMinutes proporcionalmente
  const newDuration = block.durationMinutes 
    ? Math.max(MAIN_BLOCK_MIN_DURATION, Math.floor(block.durationMinutes * effectiveRatio))
    : undefined;
  
  return {
    ...block,
    content: scaledLines.join('\n'),
    durationMinutes: newDuration,
  };
}

// ============================================
// MOTOR PRINCIPAL DE ADAPTAÇÃO POR TEMPO
// ============================================

export function adaptWorkoutForTime(config: TimeAdaptationConfig): TimeAdaptationResult {
  const { blocks, tempoDisponivel } = config;
  const warnings: string[] = [];
  
  // 1. Calcular tempo original
  const originalDuration = calculateTotalTime(blocks);
  
  // 2. Se tempo ilimitado ou suficiente, retorna sem alteração
  if (tempoDisponivel >= 9999 || originalDuration <= tempoDisponivel) {
    return {
      success: true,
      blocks,
      removedBlocks: [],
      mainBlockReduced: false,
      mainBlockMinReached: false,
      originalDuration,
      adaptedDuration: originalDuration,
      warnings: [],
      suggestAlternative: false,
    };
  }
  
  // 3. Classificar blocos com prioridade
  const classifiedBlocks = classifyBlocksWithPriority(blocks);
  
  // 4. Identificar bloco principal
  const mainResult = identifyMainBlock(blocks);
  const mainBlock = mainResult.block;
  const mainBlockMinutes = mainBlock ? estimateBlockMinutes(mainBlock) : 0;
  
  // 5. Verificar se tempo disponível é menor que mínimo do bloco principal
  if (tempoDisponivel < MAIN_BLOCK_MIN_DURATION) {
    warnings.push(`⚠️ Tempo disponível (${tempoDisponivel}min) é menor que o mínimo recomendado (${MAIN_BLOCK_MIN_DURATION}min)`);
    
    return {
      success: false,
      blocks,
      removedBlocks: [],
      mainBlockReduced: false,
      mainBlockMinReached: true,
      originalDuration,
      adaptedDuration: originalDuration,
      warnings,
      suggestAlternative: true,
      alternativeMessage: `Tempo insuficiente para treino completo. Sugerimos um treino rápido de ${tempoDisponivel} minutos focado em um único estímulo.`,
    };
  }
  
  // 6. Ordenar blocos removíveis por prioridade (maior prioridade = remover primeiro)
  const removableBlocks = classifiedBlocks
    .filter(b => b.isRemovable)
    .sort((a, b) => b.priority - a.priority);
  
  let currentBlocks = [...blocks];
  const removedBlocks: WorkoutBlock[] = [];
  let currentDuration = originalDuration;
  
  // 7. FASE 1: Remover blocos secundários em ordem de prioridade
  for (const removable of removableBlocks) {
    if (currentDuration <= tempoDisponivel) {
      break; // Já cabe no tempo
    }
    
    // Remover bloco
    const blockToRemove = removable.block;
    currentBlocks = currentBlocks.filter(b => b.id !== blockToRemove.id);
    removedBlocks.push(blockToRemove);
    
    // Recalcular tempo
    currentDuration = calculateTotalTime(currentBlocks);
    
    warnings.push(`ℹ️ Bloco "${blockToRemove.title}" removido para ajustar tempo (prioridade: ${removable.priority})`);
  }
  
  // 8. FASE 2: Se ainda excede, reduzir bloco principal
  let mainBlockReduced = false;
  let mainBlockMinReached = false;
  
  if (currentDuration > tempoDisponivel && mainBlock) {
    const mainBlockIndex = currentBlocks.findIndex(b => b.id === mainBlock.id);
    
    if (mainBlockIndex >= 0) {
      const excessTime = currentDuration - tempoDisponivel;
      const currentMainDuration = estimateBlockMinutes(currentBlocks[mainBlockIndex]);
      const targetMainDuration = Math.max(MAIN_BLOCK_MIN_DURATION, currentMainDuration - excessTime);
      
      // Verificar se chegou no mínimo
      if (targetMainDuration <= MAIN_BLOCK_MIN_DURATION) {
        mainBlockMinReached = true;
        warnings.push(`⚠️ Bloco principal reduzido ao mínimo de ${MAIN_BLOCK_MIN_DURATION} minutos`);
      }
      
      // Calcular ratio de redução
      const reductionRatio = targetMainDuration / currentMainDuration;
      
      // Aplicar redução proporcional ao conteúdo
      const scaledMainBlock = scaleBlockContent(currentBlocks[mainBlockIndex], reductionRatio);
      scaledMainBlock.durationMinutes = targetMainDuration;
      
      currentBlocks[mainBlockIndex] = scaledMainBlock;
      mainBlockReduced = true;
      
      warnings.push(`ℹ️ Bloco principal "${mainBlock.title}" reduzido de ${currentMainDuration}min para ${targetMainDuration}min`);
      
      currentDuration = calculateTotalTime(currentBlocks);
    }
  }
  
  // 9. Verificar se ainda excede (caso extremo)
  if (currentDuration > tempoDisponivel * (1 + TIME_TOLERANCE)) {
    warnings.push(`⚠️ Não foi possível adaptar completamente. Tempo final: ${currentDuration}min > ${tempoDisponivel}min`);
  }
  
  // 10. Atualizar labels e descrições dos blocos adaptados
  const finalBlocks = currentBlocks.map(block => {
    const originalBlock = blocks.find(b => b.id === block.id);
    const wasReduced = originalBlock && 
      estimateBlockMinutes(originalBlock) > estimateBlockMinutes(block);
    
    if (wasReduced) {
      // Adicionar indicador visual de adaptação
      return {
        ...block,
        title: block.title.includes('(adaptado)') ? block.title : block.title,
      };
    }
    
    return block;
  });
  
  // 11. Validação final
  const tolerance = tempoDisponivel * TIME_TOLERANCE;
  const isWithinTolerance = Math.abs(currentDuration - tempoDisponivel) <= tolerance;
  
  if (!isWithinTolerance && currentDuration > tempoDisponivel) {
    warnings.push(`⚠️ Diferença de tempo: ${Math.abs(currentDuration - tempoDisponivel).toFixed(1)} minutos`);
  }
  
  return {
    success: true,
    blocks: finalBlocks,
    removedBlocks,
    mainBlockReduced,
    mainBlockMinReached,
    originalDuration,
    adaptedDuration: currentDuration,
    warnings,
    suggestAlternative: mainBlockMinReached && tempoDisponivel < MAIN_BLOCK_MIN_DURATION,
  };
}

// ============================================
// RECALCULAR CALORIAS PROPORCIONALMENTE
// ============================================

export function recalculateCaloriesProportionally(
  originalCalories: number,
  originalDuration: number,
  adaptedDuration: number
): number {
  if (originalDuration <= 0) return originalCalories;
  const ratio = adaptedDuration / originalDuration;
  return Math.round(originalCalories * ratio);
}

// ============================================
// VALIDAÇÃO DE CONSISTÊNCIA
// ============================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTimeAdaptation(
  tempoDisponivel: number,
  adaptedDuration: number,
  blocks: WorkoutBlock[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Tolerância de 5%
  const tolerance = tempoDisponivel * TIME_TOLERANCE;
  
  // Verificar se está dentro da tolerância
  if (adaptedDuration > tempoDisponivel + tolerance) {
    errors.push(`Tempo adaptado (${adaptedDuration}min) excede disponível (${tempoDisponivel}min) além da tolerância`);
  }
  
  // Verificar se blocos têm duração realista
  for (const block of blocks) {
    const duration = estimateBlockMinutes(block);
    
    if (block.type !== 'notas' && duration <= 0) {
      warnings.push(`Bloco "${block.title}" com duração zero ou negativa`);
    }
    
    // Verificar inconsistência entre label e duração
    const content = block.content.toLowerCase();
    if (content.includes('90') && duration < 90) {
      warnings.push(`Bloco "${block.title}" menciona "90" mas duração estimada é ${duration}min`);
    }
  }
  
  // Verificar soma dos blocos
  const sumDuration = calculateTotalTime(blocks);
  if (Math.abs(sumDuration - adaptedDuration) > 1) {
    warnings.push(`Soma dos blocos (${sumDuration}min) difere da duração adaptada (${adaptedDuration}min)`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// EXPORTAR INFORMAÇÕES DO MOTOR
// ============================================

export const INTELLIGENT_ADAPTATION_INFO = {
  version: '1.0.0',
  name: 'Motor de Adaptação Inteligente por Tempo',
  mainBlockMinDuration: MAIN_BLOCK_MIN_DURATION,
  timeTolerance: TIME_TOLERANCE,
  removalOrder: [
    '1. Notas (não ocupam tempo)',
    '2. Core (acessório)',
    '3. Específico (acessório)',
    '4. Corrida (secundário)',
    '5. Força (prioridade média)',
    '6. Conditioning (geralmente WOD principal)',
    '7. Aquecimento (manter se possível)',
  ],
  phases: [
    'Fase 1: Remover blocos secundários em ordem de prioridade',
    'Fase 2: Reduzir bloco principal (respeitando mínimo)',
    'Fase 3: Sugerir treino alternativo se tempo insuficiente',
  ],
};
