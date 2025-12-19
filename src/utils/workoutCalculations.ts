import type { AthleteConfig, WorkoutBlock, AthleteLevel } from '@/types/outlier';
import { getEffectiveDuration, getEffectivePSE } from '@/utils/benchmarkVariants';
import { sumBlocksDurationSec, type TimeBlock } from '@/utils/timeCalc';
import { 
  getActiveParams, 
  getModalityKcal, 
  getIntensityFactor, 
  getLevelSpeedKmh,
  getNumericParam 
} from '@/config/outlierParams';

// ============================================
// REGRA INVIOLÁVEL:
// Tempo total exibido = soma real dos blocos
// Tempo do card de cada bloco = durationSec daquele bloco
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
 * Get block duration in SECONDS
 * Returns durationSec if available, otherwise converts durationMinutes
 */
export function getBlockDurationSec(block: WorkoutBlock & { durationSec?: number }, level?: AthleteLevel): number {
  // Prioridade: durationSec explícito
  if (typeof block.durationSec === 'number' && block.durationSec > 0) {
    return Math.round(block.durationSec);
  }
  
  // Fallback: converter de minutos
  const minutes = getBlockDuration(block, level);
  if (minutes && minutes > 0) {
    return Math.round(minutes * 60);
  }
  
  return 0;
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
 * Fórmula: peso_kg * km * RUNNING_KCAL_FACTOR (do config)
 */
export function calculateRunningCalories(
  weightKg: number,
  distanceKm: number
): number {
  const params = getActiveParams();
  const factor = getNumericParam(params.exerciseMets.runningKcalFactor, 1.0, 'runningKcalFactor');
  return Math.round(weightKg * distanceKm * factor);
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

/**
 * Obtém fator de idade do config
 */
function getAgeFactor(idade?: number): number {
  if (!idade) return 1.0;
  
  const params = getActiveParams();
  const ageRules = params.exerciseMets.ageFactorRules;
  
  if (idade < 30) return getNumericParam(ageRules.under30, 1.05, 'ageFactor.under30');
  if (idade < 40) return getNumericParam(ageRules.under40, 1.0, 'ageFactor.under40');
  if (idade < 50) return getNumericParam(ageRules.under50, 0.95, 'ageFactor.under50');
  return getNumericParam(ageRules.over50, 0.90, 'ageFactor.over50');
}

/**
 * Obtém fator de sexo do config
 */
function getSexFactor(sexo?: 'masculino' | 'feminino'): number {
  const params = getActiveParams();
  const sexRules = params.exerciseMets.sexFactorRules;
  
  if (sexo === 'masculino') return getNumericParam(sexRules.masculino, 1.1, 'sexFactor.masculino');
  return getNumericParam(sexRules.feminino, 1.0, 'sexFactor.feminino');
}

/**
 * Calculate calories using ONLY block duration
 * Formula: duration_min × base_kcal_per_min × pse_factor × weight_factor × age_factor × sex_factor
 * 
 * REGRA ESPECIAL PARA CORRIDA:
 * - Se houver distância explícita: peso_kg * km * fator
 * - Se não houver: estimar km por velocidade padrão conforme nível
 */
export function calculateCalories(
  block: WorkoutBlock,
  athleteConfig: AthleteConfig | null,
  level?: AthleteLevel
): number | null {
  if (!athleteConfig) return null;
  
  const params = getActiveParams();
  const effectiveLevel = level || 'intermediario';
  const weight = athleteConfig.peso;
  if (!weight) return null;

  // REGRA ESPECIAL PARA CORRIDA
  if (block.type === 'corrida') {
    const distanceKm = extractDistanceKm(block.content);
    
    if (distanceKm && distanceKm > 0) {
      // Usa fórmula por distância: peso_kg * km * fator
      return calculateRunningCalories(weight, distanceKm);
    }
    
    // Fallback: estimar distância pelo tempo e velocidade do nível
    const duration = getBlockDuration(block, effectiveLevel);
    if (duration && duration > 0) {
      return calculateRunningCaloriesByTime(weight, duration, effectiveLevel);
    }
    
    return null;
  }

  // CÁLCULO PADRÃO PARA OUTROS TIPOS DE BLOCO
  const duration = getBlockDuration(block, effectiveLevel);
  if (!duration || duration <= 0) return null;

  // Base kcal per minute for this block type (do config)
  const baseKcal = getModalityKcal(block.type);
  
  // PSE factor (default to PSE 5 = factor 1.0)
  const pse = getEffectivePSE(block, effectiveLevel) || 5;
  const pseFactor = getIntensityFactor(pse);
  
  // Weight factor (normalized to baseline from config)
  const baselineKg = getNumericParam(
    params.exerciseMets.weightFactorRules.baselineKg, 
    70, 
    'weightBaseline'
  );
  const weightFactor = weight / baselineKg;
  
  // Age factor (from config)
  const ageFactor = getAgeFactor(athleteConfig.idade);

  // Sex factor (from config)
  const sexFactor = getSexFactor(athleteConfig.sexo);

  // Final calculation
  const calories = duration * baseKcal * pseFactor * weightFactor * ageFactor * sexFactor;
  
  // Garantir que nunca retorne NaN
  if (isNaN(calories)) {
    console.warn('[workoutCalculations] Cálculo de calorias resultou em NaN', {
      duration, baseKcal, pseFactor, weightFactor, ageFactor, sexFactor
    });
    return null;
  }
  
  return Math.round(calories);
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
