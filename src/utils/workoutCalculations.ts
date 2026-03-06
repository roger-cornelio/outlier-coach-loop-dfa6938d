import type { AthleteConfig, WorkoutBlock, AthleteLevel } from '@/types/outlier';
import { getEffectiveDuration } from '@/utils/benchmarkVariants';
import { 
  sumBlocksDurationSec, 
  getBlockEffectiveDurationSec,
  type TimeBlock,
  type BlockDurationSource,
} from '@/utils/timeCalc';
import { 
  getActiveParams, 
  getLevelSpeedKmh,
  getNumericParam 
} from '@/config/outlierParams';

// ============================================
// MOTOR DE CALORIAS: PHYSICS ENGINE
// ============================================
// Toda estimativa de Kcal agora usa o Motor Físico
// (movement_patterns + energyCalculator.ts).
// Este arquivo mantém APENAS lógica de tempo.
// ============================================

/**
 * Get the block's actual duration in minutes
 */
export function getBlockDuration(block: WorkoutBlock, level?: AthleteLevel): number | null {
  const effectiveDuration = getEffectiveDuration(block, level);
  if (effectiveDuration && effectiveDuration > 0) {
    return effectiveDuration;
  }
  return null;
}

/**
 * Get block duration in SECONDS using the SINGLE DETERMINISTIC RULE.
 */
export function getBlockDurationSec(block: WorkoutBlock & { durationSec?: number }, level?: AthleteLevel): number {
  const effectiveDurationMinutes = getEffectiveDuration(block, level);
  
  const durationSource: BlockDurationSource = {
    durationSec: block.durationSec,
    durationMinutes: effectiveDurationMinutes,
  };
  
  return getBlockEffectiveDurationSec(durationSource);
}

/**
 * Calcula o tempo total do treino em segundos
 */
export function calculateTotalWorkoutDurationSec(
  blocks: Array<WorkoutBlock & { durationSec?: number }>,
  level?: AthleteLevel
): { totalSec: number; byBlockSec: Record<string, number> } {
  const timeBlocks: TimeBlock[] = blocks.map((block, index) => ({
    id: block.id || `block_${index}`,
    title: block.title,
    durationSec: getBlockDurationSec(block, level),
  }));
  
  return sumBlocksDurationSec(timeBlocks);
}

/**
 * Get REFERENCE time (informational only)
 */
export function getReferenceTimeForLevel(
  block: WorkoutBlock,
  level: AthleteLevel
): number | null {
  const params = getActiveParams();
  
  if (block.referenceTime) {
    return Math.round(block.referenceTime[level] / 60);
  }

  const baseMinutes = estimateFromContent(block);
  if (baseMinutes === null) return null;

  const multiplier = getNumericParam(
    params.estimation.levelMultipliers[level],
    1.0,
    `levelMultiplier.${level}`
  );
  return Math.round(baseMinutes * multiplier);
}

/**
 * Legacy function for backward compatibility
 */
export function getEstimatedTimeForLevel(
  block: WorkoutBlock,
  level: AthleteLevel
): number | null {
  const duration = getBlockDuration(block, level);
  if (duration) return duration;
  return getReferenceTimeForLevel(block, level);
}

/**
 * Estimate time from block content (for reference only)
 */
function estimateFromContent(block: WorkoutBlock): number | null {
  const content = block.content.toLowerCase();
  
  const capMatch = content.match(/cap[:\s]*(\d+)/i);
  if (capMatch) return parseInt(capMatch[1]);

  const minMatch = content.match(/(\d+)\s*min/i);
  if (minMatch) return parseInt(minMatch[1]);

  const amrapMatch = content.match(/amrap\s*(\d+)/i);
  if (amrapMatch) return parseInt(amrapMatch[1]);

  const emomMatch = content.match(/emom\s*(\d+)/i);
  if (emomMatch) return parseInt(emomMatch[1]);

  const params = getActiveParams();
  const wodTypeFactor = params.estimation.wodTypeFactors[block.type as keyof typeof params.estimation.wodTypeFactors];
  if (wodTypeFactor?.baseMinutes) {
    return wodTypeFactor.baseMinutes;
  }

  switch (block.type) {
    case 'aquecimento': return 10;
    case 'forca': return 20;
    case 'conditioning': return 15;
    case 'especifico': return 25;
    case 'core': return 10;
    case 'corrida': return 15;
    case 'notas': return null;
    default: return 10;
  }
}

/**
 * Extrai distância em km do conteúdo do bloco
 */
function extractDistanceKm(content: string): number | null {
  const lower = content.toLowerCase();
  
  const kmMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(km|quilômetros?|quilometros?)/);
  if (kmMatch) {
    return parseFloat(kmMatch[1].replace(',', '.'));
  }
  
  const mMatch = lower.match(/(\d+)\s*m(?:\s|$|,|;)/);
  if (mMatch) {
    const meters = parseInt(mMatch[1], 10);
    if (meters >= 100) {
      return meters / 1000;
    }
  }
  
  return null;
}

/**
 * @deprecated Kcal agora é calculada pelo Motor Físico (energyCalculator.ts).
 * Esta função existe apenas para compatibilidade e retorna null.
 */
export function calculateCalories(
  _block: WorkoutBlock,
  _athleteConfig: AthleteConfig | null,
  _level?: AthleteLevel
): number | null {
  // Calorie calculation has been moved to the Physics Engine (energyCalculator.ts)
  // This function is kept for backward compatibility
  return null;
}

/**
 * @deprecated Use Physics Engine instead.
 */
export function calculateTotalWorkoutCalories(
  _blocks: WorkoutBlock[],
  _athleteConfig: AthleteConfig | null,
  _level?: AthleteLevel
): number {
  return 0;
}

/**
 * Format time display (minutes)
 */
export function formatBlockTime(minutes: number | null): string {
  if (minutes === null) return '--';
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${minutes} min`;
}

/**
 * Format time display (seconds to readable)
 */
export function formatBlockTimeSec(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '--';
  const minutes = Math.round(seconds / 60);
  return formatBlockTime(minutes);
}
