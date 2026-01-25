import type { AthleteConfig, WorkoutBlock, AthleteLevel } from '@/types/outlier';
import { getEffectiveDuration, getEffectivePSE } from '@/utils/benchmarkVariants';
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
import { 
  calculateBlockCaloriesHyrox, 
  HYROX_FACTORS,
  type CalorieCalculationResult 
} from '@/utils/hyroxCalorieEngine';

// ============================================
// MOTOR DETERMINÍSTICO HYROX (v2)
// ============================================
// REGRA INVIOLÁVEL:
// - Tabela de fatores é a ÚNICA fonte de verdade
// - Removido: ageFactor, sexFactor, weightFactor, PSE principal
// - Corrida: kcal = peso_kg × distância_km × fator
// - Estações: kcal = peso_kg × time_min × fator
// ============================================

/**
 * Extrai distância em km do conteúdo do bloco
 */
function extractDistanceKm(content: string): number | null {
  const lower = content.toLowerCase();
  
  // Padrão: Xkm, X km, X quilômetros
  const kmMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(km|quilômetros?|quilometros?)/);
  if (kmMatch) {
    return parseFloat(kmMatch[1].replace(',', '.'));
  }
  
  // Padrão: Xm (metros) -> converter para km
  const mMatch = lower.match(/(\d+)\s*m(?:\s|$|,|;)/);
  if (mMatch) {
    const meters = parseInt(mMatch[1], 10);
    if (meters >= 100) { // Só considera se for >= 100m
      return meters / 1000;
    }
  }
  
  return null;
}

/**
 * Get the block's actual duration in minutes
 * This is the ONLY value used for calorie calculation
 */
export function getBlockDuration(block: WorkoutBlock, level?: AthleteLevel): number | null {
  // Use effective duration based on level variants
  const effectiveDuration = getEffectiveDuration(block, level);
  if (effectiveDuration && effectiveDuration > 0) {
    return effectiveDuration;
  }
  return null;
}

/**
 * Get block duration in SECONDS using the SINGLE DETERMINISTIC RULE.
 * 
 * REGRA ÚNICA (delegada para getBlockEffectiveDurationSec):
 * 1. durationSec > 0 → usar durationSec
 * 2. durationMinutes > 0 → usar durationMinutes * 60
 * 3. senão → retornar 0
 * 
 * NOTA: Esta função considera levelVariants para obter durationMinutes efetivo.
 * 
 * EXPLICITAMENTE PROIBIDO:
 * - extractTimeFromContent
 * - parsing de texto
 * - defaults por tipo de bloco
 * - heurísticas baseadas em regex
 */
export function getBlockDurationSec(block: WorkoutBlock & { durationSec?: number }, level?: AthleteLevel): number {
  // Construir fonte de duração considerando levelVariants
  const effectiveDurationMinutes = getEffectiveDuration(block, level);
  
  const durationSource: BlockDurationSource = {
    durationSec: block.durationSec,
    durationMinutes: effectiveDurationMinutes,
  };
  
  // Delegar para a regra única determinística
  return getBlockEffectiveDurationSec(durationSource);
}

/**
 * Calcula o tempo total do treino em segundos usando sumBlocksDurationSec
 * REGRA: Tempo total = soma real dos blocos
 */
export function calculateTotalWorkoutDurationSec(
  blocks: Array<WorkoutBlock & { durationSec?: number }>,
  level?: AthleteLevel
): { totalSec: number; byBlockSec: Record<string, number> } {
  // Mapear blocos para TimeBlock com durationSec calculado
  const timeBlocks: TimeBlock[] = blocks.map((block, index) => ({
    id: block.id || `block_${index}`,
    title: block.title,
    durationSec: getBlockDurationSec(block, level),
  }));
  
  return sumBlocksDurationSec(timeBlocks);
}

/**
 * Get REFERENCE time (informational only, NOT for calories)
 * This shows the athlete how long the workout typically takes
 */
export function getReferenceTimeForLevel(
  block: WorkoutBlock,
  level: AthleteLevel
): number | null {
  const params = getActiveParams();
  
  // If block has explicit reference times, use them
  if (block.referenceTime) {
    return Math.round(block.referenceTime[level] / 60);
  }

  // Estimate from content patterns
  const baseMinutes = estimateFromContent(block);
  if (baseMinutes === null) return null;

  // Usar multiplicador do config
  const multiplier = getNumericParam(
    params.estimation.levelMultipliers[level],
    1.0,
    `levelMultiplier.${level}`
  );
  return Math.round(baseMinutes * multiplier);
}

/**
 * Legacy function for backward compatibility
 * Uses block duration if available, otherwise estimates
 */
export function getEstimatedTimeForLevel(
  block: WorkoutBlock,
  level: AthleteLevel
): number | null {
  // First try block duration
  const duration = getBlockDuration(block, level);
  if (duration) return duration;
  
  // Fall back to reference time estimation
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

  // Default estimates by block type (usando config)
  const params = getActiveParams();
  const wodTypeFactor = params.estimation.wodTypeFactors[block.type as keyof typeof params.estimation.wodTypeFactors];
  if (wodTypeFactor?.baseMinutes) {
    return wodTypeFactor.baseMinutes;
  }

  // Fallback por tipo de bloco
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
 * Calcula calorias para corrida baseado em distância
 * Fórmula: peso_kg * km * HYROX_FACTORS.RUN
 */
export function calculateRunningCalories(
  weightKg: number,
  distanceKm: number
): number {
  return Math.round(weightKg * distanceKm * HYROX_FACTORS.RUN);
}

/**
 * Calcula calorias para corrida estimando distância pelo tempo e velocidade do nível
 */
export function calculateRunningCaloriesByTime(
  weightKg: number,
  durationMinutes: number,
  level: AthleteLevel
): number {
  const speedKmh = getLevelSpeedKmh(level);
  const estimatedKm = (durationMinutes / 60) * speedKmh;
  return calculateRunningCalories(weightKg, estimatedKm);
}

// ============================================
// MOTOR DETERMINÍSTICO HYROX
// Removido: ageFactor, sexFactor, weightFactor, PSE principal, baseKcal genérico
// Mantido: peso, distância (run), tempo e fator (tabela/arquetipo)
// ============================================

/**
 * Calculate calories using Motor Determinístico HYROX
 * 
 * FÓRMULAS:
 * - Corrida: kcal = peso_kg × distância_km × fator
 * - Estações: kcal = peso_kg × time_min × fator
 * 
 * REMOVIDO DO MOTOR ANTIGO:
 * - ageFactor, sexFactor, weightFactor como multiplicadores globais
 * - PSE do cálculo principal
 * - baseKcal genérico por modalidade
 */
export function calculateCalories(
  block: WorkoutBlock,
  athleteConfig: AthleteConfig | null,
  level?: AthleteLevel
): number | null {
  if (!athleteConfig) return null;
  
  const effectiveLevel = level || 'intermediario';
  const weight = athleteConfig.peso;
  if (!weight) return null;

  // Obter duração do bloco em segundos
  const durationMin = getBlockDuration(block, effectiveLevel);
  const durationSec = durationMin ? durationMin * 60 : 0;
  
  if (durationSec <= 0 && block.type !== 'corrida') {
    return null;
  }

  // Usar Motor Determinístico HYROX
  const blockWithDuration = { ...block, durationSec };
  const result: CalorieCalculationResult = calculateBlockCaloriesHyrox(
    blockWithDuration,
    weight,
    effectiveLevel
  );
  
  if (result.resolution === 'error') {
    console.warn('[calculateCalories] Motor HYROX retornou erro:', result.error);
    return null;
  }
  
  return result.kcal;
}

/**
 * Calculate total workout calories
 * Usa calculateTotalWorkoutDurationSec para garantir consistência
 */
export function calculateTotalWorkoutCalories(
  blocks: WorkoutBlock[],
  athleteConfig: AthleteConfig | null,
  level?: AthleteLevel
): number {
  if (!athleteConfig || !athleteConfig.peso) return 0;

  let total = 0;
  for (const block of blocks) {
    const calories = calculateCalories(block, athleteConfig, level);
    if (calories) total += calories;
  }
  return total;
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
