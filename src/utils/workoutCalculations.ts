import type { AthleteConfig, WorkoutBlock, AthleteLevel } from '@/types/outlier';
import { getEffectiveDuration, getEffectivePSE } from '@/utils/benchmarkVariants';

// Base kcal per minute for different workout types
const BASE_KCAL_PER_MIN: Record<string, number> = {
  aquecimento: 6.0,   // ~360 kcal/h
  conditioning: 12.0,  // ~720 kcal/h
  forca: 8.0,         // ~480 kcal/h
  especifico: 14.0,   // ~840 kcal/h (HYROX specific)
  core: 5.0,          // ~300 kcal/h
  corrida: 10.0,      // ~600 kcal/h
  notas: 0,
};

// PSE factor multipliers (base = PSE 5)
const PSE_FACTORS: Record<number, number> = {
  1: 0.5,   // Very light
  2: 0.6,
  3: 0.7,   // Light
  4: 0.85,
  5: 1.0,   // Moderate (base)
  6: 1.1,
  7: 1.2,   // Vigorous
  8: 1.35,
  9: 1.5,   // Very hard
  10: 1.7,  // Maximum
};

// Time multipliers by level (for reference time estimation only)
const LEVEL_TIME_MULTIPLIERS: Record<AthleteLevel, number> = {
  iniciante: 1.3,
  intermediario: 1.0,
  avancado: 0.85,
  hyrox_pro: 0.75,
};

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
 * Get REFERENCE time (informational only, NOT for calories)
 * This shows the athlete how long the workout typically takes
 */
export function getReferenceTimeForLevel(
  block: WorkoutBlock,
  level: AthleteLevel
): number | null {
  // If block has explicit reference times, use them
  if (block.referenceTime) {
    return Math.round(block.referenceTime[level] / 60);
  }

  // Estimate from content patterns
  const baseMinutes = estimateFromContent(block);
  if (baseMinutes === null) return null;

  const multiplier = LEVEL_TIME_MULTIPLIERS[level];
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

  // Default estimates by block type
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
 * Calculate calories using ONLY block duration
 * Formula: duration_min × base_kcal_per_min × pse_factor × weight_factor × age_factor × sex_factor
 */
export function calculateCalories(
  block: WorkoutBlock,
  athleteConfig: AthleteConfig | null,
  level?: AthleteLevel // Explicit level parameter
): number | null {
  if (!athleteConfig) return null;
  
  // CRITICAL: Use ONLY block.durationMinutes for calories
  const effectiveLevel = level;
  const duration = getBlockDuration(block, effectiveLevel);
  if (!duration || duration <= 0) return null;
  
  // Need weight to calculate calories
  const weight = athleteConfig.peso;
  if (!weight) return null;

  // Base kcal per minute for this block type
  const baseKcal = BASE_KCAL_PER_MIN[block.type] || 8.0;
  
  // PSE factor (default to PSE 5 = factor 1.0)
  const pse = getEffectivePSE(block, effectiveLevel) || 5;
  const pseFactor = PSE_FACTORS[Math.min(10, Math.max(1, Math.round(pse)))] || 1.0;
  
  // Weight factor (normalized to 70kg baseline)
  const weightFactor = weight / 70;
  
  // Age factor (metabolism decreases with age)
  let ageFactor = 1.0;
  if (athleteConfig.idade) {
    ageFactor = athleteConfig.idade < 30 ? 1.05 : 
                athleteConfig.idade < 40 ? 1.0 :
                athleteConfig.idade < 50 ? 0.95 : 0.90;
  }

  // Sex factor (men ~10% higher metabolic rate)
  const sexFactor = athleteConfig.sexo === 'masculino' ? 1.1 : 1.0;

  // Final calculation
  const calories = duration * baseKcal * pseFactor * weightFactor * ageFactor * sexFactor;
  
  return Math.round(calories);
}

/**
 * Calculate total workout calories
 */
export function calculateTotalWorkoutCalories(
  blocks: WorkoutBlock[],
  athleteConfig: AthleteConfig | null
): number {
  if (!athleteConfig || !athleteConfig.peso) return 0;

  let total = 0;
  for (const block of blocks) {
    const calories = calculateCalories(block, athleteConfig);
    if (calories) total += calories;
  }
  return total;
}

/**
 * Format time display
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
