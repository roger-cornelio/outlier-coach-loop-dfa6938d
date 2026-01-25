/**
 * TIME VALIDATION & METADATA
 * ============================================
 * Sistema de validação e metadados de tempo de blocos.
 * 
 * REGRA DETERMINÍSTICA (prioridade inviolável):
 * 1. durationSec > 0 → source = "CONFIRMED"
 * 2. durationMinutes > 0 → source = "ESTIMATED" (derivado)
 * 3. Nenhum dos dois → source = "MISSING"
 * 
 * PROIBIDO usar para cálculo de tempo:
 * - extractTimeFromContent
 * - parsing de texto em content/lines
 * - defaults por tipo de bloco
 * - heurísticas baseadas em regex
 * ============================================
 */

import type { WorkoutBlock, DayWorkout } from '@/types/outlier';
import { getBlockEffectiveDurationSec, type BlockDurationSource } from './timeCalc';

// ============================================
// TIPOS
// ============================================

/**
 * Fonte do tempo do bloco
 * - CONFIRMED: durationSec existe no JSON (fonte de verdade persistida)
 * - ESTIMATED: durationSec derivado de durationMinutes (compatibilidade)
 * - MISSING: nenhum campo de tempo válido
 */
export type TimeSource = 'CONFIRMED' | 'ESTIMATED' | 'MISSING';

/**
 * Metadados de tempo de um bloco
 */
export interface TimeMeta {
  /** Fonte do tempo: CONFIRMED, ESTIMATED ou MISSING */
  source: TimeSource;
  /** Duração efetiva usada no cálculo (em segundos) */
  durationSecUsed: number;
  /** Bloco original tinha durationSec explícito? */
  hadExplicitDurationSec: boolean;
  /** Bloco original tinha durationMinutes? */
  hadDurationMinutes: boolean;
}

/**
 * Tipos de warning de tempo
 */
export type TimeWarningType = 'MISSING_DURATION' | 'ZERO_DURATION';

/**
 * Warning de tempo de um bloco
 */
export interface TimeWarning {
  type: TimeWarningType;
  blockId: string;
  blockTitle?: string;
  message: string;
}

/**
 * Resultado da validação de tempo de um treino
 */
export interface TimeValidationResult {
  /** Lista de warnings (não-bloqueantes) */
  warnings: TimeWarning[];
  /** Total de blocos analisados */
  totalBlocks: number;
  /** Blocos com tempo confirmado */
  confirmedBlocks: number;
  /** Blocos com tempo estimado */
  estimatedBlocks: number;
  /** Blocos sem tempo */
  missingBlocks: number;
  /** Treino é válido? (sempre true, warnings não bloqueiam) */
  isValid: boolean;
}

// ============================================
// FUNÇÃO PRINCIPAL: getBlockTimeMeta
// ============================================

/**
 * Obtém metadados de tempo de um bloco.
 * 
 * Segue a regra determinística:
 * 1. durationSec > 0 → CONFIRMED
 * 2. durationMinutes > 0 → ESTIMATED
 * 3. Nenhum → MISSING
 * 
 * @param block - WorkoutBlock com campos de tempo opcionais
 * @returns TimeMeta com source e durationSecUsed
 */
export function getBlockTimeMeta(block: BlockDurationSource): TimeMeta {
  const hadExplicitDurationSec = typeof block.durationSec === 'number' && block.durationSec > 0;
  const hadDurationMinutes = typeof block.durationMinutes === 'number' && block.durationMinutes > 0;
  
  // Usar função determinística para obter duração
  const durationSecUsed = getBlockEffectiveDurationSec(block);
  
  // Determinar source com base na prioridade
  let source: TimeSource;
  
  if (hadExplicitDurationSec) {
    // Prioridade 1: durationSec explícito = CONFIRMED
    source = 'CONFIRMED';
  } else if (hadDurationMinutes) {
    // Prioridade 2: derivado de durationMinutes = ESTIMATED
    source = 'ESTIMATED';
  } else {
    // Prioridade 3: sem tempo = MISSING
    source = 'MISSING';
  }
  
  return {
    source,
    durationSecUsed,
    hadExplicitDurationSec,
    hadDurationMinutes,
  };
}

// ============================================
// VALIDAÇÃO DE BLOCOS
// ============================================

/**
 * Valida um bloco e retorna warnings se aplicável.
 * 
 * @param block - WorkoutBlock para validar
 * @returns TimeWarning ou null se não houver problema
 */
export function validateBlockTime(block: WorkoutBlock): TimeWarning | null {
  const meta = getBlockTimeMeta(block);
  
  // Blocos do tipo 'notas' não precisam de tempo
  if (block.type === 'notas') {
    return null;
  }
  
  if (meta.source === 'MISSING') {
    return {
      type: 'MISSING_DURATION',
      blockId: block.id,
      blockTitle: block.title,
      message: `Bloco "${block.title || block.id}" não possui duração definida (durationSec ou durationMinutes).`,
    };
  }
  
  // Se chegou aqui, source é CONFIRMED ou ESTIMATED
  // Verificar se duração é zero (edge case)
  if (meta.durationSecUsed === 0) {
    return {
      type: 'ZERO_DURATION',
      blockId: block.id,
      blockTitle: block.title,
      message: `Bloco "${block.title || block.id}" possui duração zero.`,
    };
  }
  
  return null;
}

/**
 * Valida todos os blocos de um dia e retorna resultado agregado.
 * 
 * NOTA: Warnings são informativos e NÃO bloqueiam salvamento.
 * 
 * @param day - DayWorkout para validar
 * @returns TimeValidationResult com warnings e estatísticas
 */
export function validateDayTime(day: DayWorkout): TimeValidationResult {
  const warnings: TimeWarning[] = [];
  let confirmedBlocks = 0;
  let estimatedBlocks = 0;
  let missingBlocks = 0;
  
  for (const block of day.blocks) {
    const meta = getBlockTimeMeta(block);
    
    if (meta.source === 'CONFIRMED') {
      confirmedBlocks++;
    } else if (meta.source === 'ESTIMATED') {
      estimatedBlocks++;
    } else {
      // MISSING
      missingBlocks++;
    }
    
    const warning = validateBlockTime(block);
    if (warning) {
      warnings.push(warning);
    }
  }
  
  return {
    warnings,
    totalBlocks: day.blocks.length,
    confirmedBlocks,
    estimatedBlocks,
    missingBlocks,
    isValid: true, // Sempre válido, warnings não bloqueiam
  };
}

/**
 * Valida uma semana inteira de treinos.
 * 
 * @param days - Array de DayWorkout para validar
 * @returns TimeValidationResult agregado de todos os dias
 */
export function validateWeekTime(days: DayWorkout[]): TimeValidationResult {
  const allWarnings: TimeWarning[] = [];
  let totalBlocks = 0;
  let confirmedBlocks = 0;
  let estimatedBlocks = 0;
  let missingBlocks = 0;
  
  for (const day of days) {
    const dayResult = validateDayTime(day);
    
    allWarnings.push(...dayResult.warnings);
    totalBlocks += dayResult.totalBlocks;
    confirmedBlocks += dayResult.confirmedBlocks;
    estimatedBlocks += dayResult.estimatedBlocks;
    missingBlocks += dayResult.missingBlocks;
  }
  
  return {
    warnings: allWarnings,
    totalBlocks,
    confirmedBlocks,
    estimatedBlocks,
    missingBlocks,
    isValid: true,
  };
}

// ============================================
// HELPERS PARA UI
// ============================================

/**
 * Converte TimeSource para o formato esperado pela UI.
 * 
 * A UI atual usa confidence: 'high' | 'medium' | 'low'
 * - CONFIRMED → 'high'
 * - ESTIMATED → 'low' (mostra "~" e "(estimado)")
 * - MISSING → 'low'
 * 
 * @param source - TimeSource do bloco
 * @returns Confidence level para a UI
 */
export function timeSourceToConfidence(source: TimeSource): 'high' | 'medium' | 'low' {
  switch (source) {
    case 'CONFIRMED':
      return 'high';
    case 'ESTIMATED':
      return 'low';
    case 'MISSING':
      return 'low';
    default:
      return 'low';
  }
}

/**
 * Verifica se um bloco deve mostrar "(estimado)" na UI.
 * 
 * @param block - WorkoutBlock para verificar
 * @returns true se deve mostrar indicador de estimativa
 */
export function shouldShowEstimatedLabel(block: BlockDurationSource): boolean {
  const meta = getBlockTimeMeta(block);
  return meta.source !== 'CONFIRMED';
}

/**
 * Obtém duração formatada com indicador de estimativa.
 * 
 * @param block - WorkoutBlock para obter duração
 * @returns Objeto com minutos e flag de estimado
 */
export function getBlockTimeDisplay(block: BlockDurationSource): {
  minutes: number;
  isEstimated: boolean;
  source: TimeSource;
} {
  const meta = getBlockTimeMeta(block);
  
  return {
    minutes: Math.round(meta.durationSecUsed / 60),
    isEstimated: meta.source !== 'CONFIRMED',
    source: meta.source,
  };
}
