import type { AthleteConfig, WorkoutBlock, AthleteLevel } from '@/types/outlier';

// MET values for different workout types (Metabolic Equivalent of Task)
const MET_VALUES: Record<string, number> = {
  aquecimento: 4.0,
  conditioning: 8.0,
  forca: 6.0,
  especifico: 9.0,
  core: 3.5,
  corrida: 7.0,
  notas: 1.0,
};

// Time multipliers by level (relative to intermediate)
const LEVEL_TIME_MULTIPLIERS: Record<AthleteLevel, number> = {
  iniciante: 1.3,
  intermediario: 1.0,
  avancado: 0.85,
  hyrox_pro: 0.75,
};

/**
 * Calculate estimated time for a workout block based on athlete level
 * If the block has referenceTime, use it; otherwise estimate based on content
 */
export function getEstimatedTimeForLevel(
  block: WorkoutBlock,
  level: AthleteLevel
): number | null {
  // If block has reference times, use them
  if (block.referenceTime) {
    return Math.round(block.referenceTime[level] / 60); // Convert to minutes
  }

  // Otherwise, estimate based on block type and content
  const baseMinutes = estimateBaseMinutes(block);
  if (baseMinutes === null) return null;

  const multiplier = LEVEL_TIME_MULTIPLIERS[level];
  return Math.round(baseMinutes * multiplier);
}

/**
 * Estimate base minutes from block content
 */
function estimateBaseMinutes(block: WorkoutBlock): number | null {
  const content = block.content.toLowerCase();
  
  // Look for explicit time caps or durations
  const capMatch = content.match(/cap[:\s]*(\d+)/i);
  if (capMatch) return parseInt(capMatch[1]);

  const minMatch = content.match(/(\d+)\s*min/i);
  if (minMatch) return parseInt(minMatch[1]);

  const amrapMatch = content.match(/amrap\s*(\d+)/i);
  if (amrapMatch) return parseInt(amrapMatch[1]);

  const emomMatch = content.match(/emom\s*(\d+)/i);
  if (emomMatch) return parseInt(emomMatch[1]);

  // Estimate based on block type
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
 * Calculate estimated calories burned
 * Uses the formula: Calories = MET × Weight (kg) × Duration (hours)
 */
export function calculateCalories(
  block: WorkoutBlock,
  athleteConfig: AthleteConfig | null,
  durationMinutes: number | null
): number | null {
  if (!athleteConfig || !durationMinutes) return null;
  
  // Need weight to calculate calories
  const weight = athleteConfig.peso;
  if (!weight) return null;

  const met = MET_VALUES[block.type] || 5.0;
  const durationHours = durationMinutes / 60;
  
  // Base calculation
  let calories = met * weight * durationHours;

  // Adjust for age (metabolism decreases with age)
  if (athleteConfig.idade) {
    const ageMultiplier = athleteConfig.idade < 30 ? 1.05 : 
                          athleteConfig.idade < 40 ? 1.0 :
                          athleteConfig.idade < 50 ? 0.95 : 0.90;
    calories *= ageMultiplier;
  }

  // Adjust for sex (men typically burn ~10% more)
  if (athleteConfig.sexo === 'masculino') {
    calories *= 1.1;
  }

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
    const duration = getEstimatedTimeForLevel(block, athleteConfig.level);
    const calories = calculateCalories(block, athleteConfig, duration);
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
