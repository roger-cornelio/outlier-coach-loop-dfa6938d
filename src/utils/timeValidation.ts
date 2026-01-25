/**
 * TIME VALIDATION & METADATA
 * ============================================
 * Sistema de validação e metadados de tempo de blocos.
 * 
 * REGRA DETERMINÍSTICA (prioridade inviolável):
 * 1. durationSec > 0 → source = "CONFIRMED"
 * 2. durationMinutes > 0 → source = "ESTIMATED"
 * 3. Nenhum dos dois → usar default por tipo, source = "ESTIMATED", warning = "DURATION_ESTIMATED_DEFAULT"
 * 
 * PROIBIDO usar para cálculo de tempo:
 * - extractTimeFromContent
 * - parsing de texto em content/lines
 * - heurísticas baseadas em regex
 * ============================================
 */

import type { WorkoutBlock, DayWorkout } from '@/types/outlier';
import { getBlockEffectiveDurationSec, type BlockDurationSource } from './timeCalc';

// ============================================
// DEFAULTS DETERMINÍSTICOS POR TIPO DE BLOCO
// ============================================

/**
 * Duração padrão por tipo de bloco (em segundos).
 * Usado APENAS quando durationSec e durationMinutes estão ausentes.
 * Valores conservadores para garantir tempo utilizável.
 */
export const DEFAULT_DURATION_SEC_BY_TYPE: Record<string, number> = {
  aquecimento: 10 * 60,  // 10 min
  conditioning: 20 * 60, // 20 min
  forca: 15 * 60,        // 15 min
  core: 10 * 60,         // 10 min
  corrida: 15 * 60,      // 15 min
  especifico: 15 * 60,   // 15 min
  notas: 5 * 60,         // 5 min
};

/** Default fallback quando tipo não está mapeado */
const FALLBACK_DURATION_SEC = 15 * 60; // 15 min

/**
 * Obtém duração padrão para um tipo de bloco (em segundos).
 */
export function getDefaultDurationSecByType(blockType: string | undefined): number {
  if (!blockType) return FALLBACK_DURATION_SEC;
  return DEFAULT_DURATION_SEC_BY_TYPE[blockType] ?? FALLBACK_DURATION_SEC;
}

// ============================================
// TIPOS
// ============================================

/**
 * Fonte do tempo do bloco
 * - CONFIRMED: durationSec existe no JSON (fonte de verdade persistida)
 * - ESTIMATED: durationSec derivado de durationMinutes OU de default por tipo
 */
export type TimeSource = 'CONFIRMED' | 'ESTIMATED';

/**
 * Metadados de tempo de um bloco
 */
export interface TimeMeta {
  /** Fonte do tempo: CONFIRMED ou ESTIMATED */
  source: TimeSource;
  /** Duração efetiva usada no cálculo (em segundos) - NUNCA zero */
  durationSecUsed: number;
  /** Bloco original tinha durationSec explícito? */
  hadExplicitDurationSec: boolean;
  /** Bloco original tinha durationMinutes? */
  hadDurationMinutes: boolean;
  /** Tempo veio de default por tipo? (nenhum campo explícito) */
  usedDefaultByType: boolean;
}

/**
 * Tipos de warning de tempo
 */
export type TimeWarningType = 'DURATION_ESTIMATED_DEFAULT' | 'ZERO_DURATION';

/**
 * Warning de tempo de um bloco
 */
export interface TimeWarning {
  type: TimeWarningType;
  blockId: string;
  blockTitle?: string;
  blockType?: string;
  message: string;
  /** Duração default aplicada (em segundos) */
  defaultAppliedSec?: number;
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
  /** Blocos que usaram default por tipo */
  defaultBlocks: number;
  /** Treino é válido? (sempre true, warnings não bloqueiam) */
  isValid: boolean;
}

// ============================================
// FUNÇÃO PRINCIPAL: getBlockTimeMeta
// ============================================

/** Interface estendida para incluir type do bloco */
interface BlockWithType extends BlockDurationSource {
  type?: string;
}

/**
 * Obtém metadados de tempo de um bloco.
 * 
 * Segue a regra determinística:
 * 1. durationSec > 0 → CONFIRMED
 * 2. durationMinutes > 0 → ESTIMATED
 * 3. Nenhum → usar default por tipo, ESTIMATED, com flag usedDefaultByType
 * 
 * NUNCA retorna durationSecUsed = 0 (sempre há um valor utilizável)
 * 
 * @param block - WorkoutBlock com campos de tempo opcionais
 * @returns TimeMeta com source e durationSecUsed (sempre > 0)
 */
export function getBlockTimeMeta(block: BlockWithType): TimeMeta {
  const hadExplicitDurationSec = typeof block.durationSec === 'number' && block.durationSec > 0;
  const hadDurationMinutes = typeof block.durationMinutes === 'number' && block.durationMinutes > 0;
  
  // Usar função determinística para obter duração explícita
  const explicitDurationSec = getBlockEffectiveDurationSec(block);
  
  // Determinar source e durationSecUsed
  let source: TimeSource;
  let durationSecUsed: number;
  let usedDefaultByType = false;
  
  if (hadExplicitDurationSec) {
    // Prioridade 1: durationSec explícito = CONFIRMED
    source = 'CONFIRMED';
    durationSecUsed = explicitDurationSec;
  } else if (hadDurationMinutes) {
    // Prioridade 2: derivado de durationMinutes = ESTIMATED
    source = 'ESTIMATED';
    durationSecUsed = explicitDurationSec;
  } else {
    // Prioridade 3: usar default por tipo = ESTIMATED com flag
    source = 'ESTIMATED';
    durationSecUsed = getDefaultDurationSecByType(block.type);
    usedDefaultByType = true;
  }
  
  return {
    source,
    durationSecUsed,
    hadExplicitDurationSec,
    hadDurationMinutes,
    usedDefaultByType,
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
  
  // Blocos do tipo 'notas' não precisam de warning
  if (block.type === 'notas') {
    return null;
  }
  
  // Se usou default por tipo, gerar warning informativo
  if (meta.usedDefaultByType) {
    const defaultSec = getDefaultDurationSecByType(block.type);
    return {
      type: 'DURATION_ESTIMATED_DEFAULT',
      blockId: block.id,
      blockTitle: block.title,
      blockType: block.type,
      message: `Bloco "${block.title || block.id}" não possui duração definida. Usando default de ${Math.round(defaultSec / 60)} min para tipo "${block.type}".`,
      defaultAppliedSec: defaultSec,
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
  let defaultBlocks = 0;
  
  for (const block of day.blocks) {
    const meta = getBlockTimeMeta(block);
    
    if (meta.source === 'CONFIRMED') {
      confirmedBlocks++;
    } else {
      estimatedBlocks++;
      if (meta.usedDefaultByType) {
        defaultBlocks++;
      }
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
    defaultBlocks,
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
  let defaultBlocks = 0;
  
  for (const day of days) {
    const dayResult = validateDayTime(day);
    
    allWarnings.push(...dayResult.warnings);
    totalBlocks += dayResult.totalBlocks;
    confirmedBlocks += dayResult.confirmedBlocks;
    estimatedBlocks += dayResult.estimatedBlocks;
    defaultBlocks += dayResult.defaultBlocks;
  }
  
  return {
    warnings: allWarnings,
    totalBlocks,
    confirmedBlocks,
    estimatedBlocks,
    defaultBlocks,
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
