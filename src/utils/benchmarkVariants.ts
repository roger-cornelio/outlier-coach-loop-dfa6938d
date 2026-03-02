import type { WorkoutBlock, AthleteLevel, LevelVariant, TargetTimeRange, BenchmarkDirection, BenchmarkMetric, PerformanceBucket } from '@/types/outlier';

/**
 * Get the effective workout content for an athlete's level
 * Priority: levelVariants > base content
 */
export function getEffectiveContent(block: WorkoutBlock, level?: AthleteLevel): string {
  if (!level) return block.content;
  
  const variant = block.levelVariants?.[level];
  return variant?.content || block.content;
}

/**
 * Get the effective target range for an athlete's level
 * Priority: levelVariants > levelTargetRanges > base targetRange
 */
export function getEffectiveTargetRange(block: WorkoutBlock, level?: AthleteLevel): TargetTimeRange | undefined {
  if (!level) return block.targetRange;
  
  // First check full variants
  const variant = block.levelVariants?.[level];
  if (variant?.targetRange) return variant.targetRange;
  
  // Then check legacy target ranges
  const legacyRange = block.levelTargetRanges?.[level];
  if (legacyRange) return legacyRange;
  
  // Fall back to base target range
  return block.targetRange;
}

/**
 * Get the effective duration for an athlete's level
 */
export function getEffectiveDuration(block: WorkoutBlock, level?: AthleteLevel): number | undefined {
  if (!level) return block.durationMinutes;
  
  const variant = block.levelVariants?.[level];
  return variant?.durationMinutes || block.durationMinutes;
}

/**
 * Get the effective notes for an athlete's level
 */
export function getEffectiveNotes(block: WorkoutBlock, level?: AthleteLevel): string | undefined {
  if (!level) return undefined;
  return block.levelVariants?.[level]?.notes;
}

/**
 * Get the effective PSE (Perceived Subjective Exertion) for an athlete's level
 */
export function getEffectivePSE(block: WorkoutBlock, level?: AthleteLevel): number | undefined {
  if (!level) return block.pse;
  
  const variant = block.levelVariants?.[level];
  return variant?.pse || block.pse;
}

/**
 * Get the effective reference pace for an athlete's level
 */
export function getEffectiveReferencePace(block: WorkoutBlock, level?: AthleteLevel): number | undefined {
  if (!level) return block.referencePaceMinutes;
  
  const variant = block.levelVariants?.[level];
  return variant?.referencePaceMinutes || block.referencePaceMinutes;
}

/**
 * Check if a block has level-specific variants
 */
export function hasLevelVariants(block: WorkoutBlock): boolean {
  return !!block.levelVariants && Object.keys(block.levelVariants).length > 0;
}

/**
 * Get the complete effective variant for an athlete's level
 */
export function getEffectiveVariant(block: WorkoutBlock, level?: AthleteLevel): {
  content: string;
  targetRange?: TargetTimeRange;
  durationMinutes?: number;
  notes?: string;
  pse?: number;
  referencePaceMinutes?: number;
} {
  return {
    content: getEffectiveContent(block, level),
    targetRange: getEffectiveTargetRange(block, level),
    durationMinutes: getEffectiveDuration(block, level),
    notes: getEffectiveNotes(block, level),
    pse: getEffectivePSE(block, level),
    referencePaceMinutes: getEffectiveReferencePace(block, level),
  };
}

/**
 * Get PSE label and color
 */
export function getPSEInfo(pse: number): { label: string; colorClass: string } {
  if (pse <= 3) return { label: 'Leve', colorClass: 'text-green-500' };
  if (pse <= 5) return { label: 'Moderado', colorClass: 'text-yellow-500' };
  if (pse <= 7) return { label: 'Intenso', colorClass: 'text-orange-500' };
  if (pse <= 9) return { label: 'Muito Intenso', colorClass: 'text-red-500' };
  return { label: 'Máximo', colorClass: 'text-red-600' };
}

/**
 * Format reference pace
 */
export function formatPace(paceMinutes: number): string {
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')}/km`;
}

// =============================================================================
// BENCHMARK SCORING SYSTEM
// =============================================================================

/**
 * Get benchmark metric info (label and unit)
 */
export function getBenchmarkMetricInfo(metric: BenchmarkMetric): { label: string; unit: string; format: (value: number) => string } {
  switch (metric) {
    case 'time_seconds':
      return {
        label: 'Tempo',
        unit: '',
        format: (v) => {
          const mins = Math.floor(v / 60);
          const secs = v % 60;
          return `${mins}:${String(secs).padStart(2, '0')}`;
        }
      };
    case 'reps':
      return { label: 'Reps', unit: 'reps', format: (v) => `${v} reps` };
    case 'distance_meters':
      return { label: 'Distância', unit: 'm', format: (v) => `${v}m` };
    case 'load_kg':
      return { label: 'Carga', unit: 'kg', format: (v) => `${v}kg` };
    case 'rounds':
      return { label: 'Rounds', unit: 'rounds', format: (v) => `${v} rounds` };
    default:
      return { label: 'Valor', unit: '', format: (v) => `${v}` };
  }
}

/**
 * Classify performance into bucket based on metric direction
 * For lower_is_better: value <= min is ELITE, value > max is TOUGH
 * For higher_is_better: value >= max is ELITE, value < min is TOUGH
 */
export function classifyBenchmarkPerformance(
  value: number,
  targetRange: TargetTimeRange,
  direction: BenchmarkDirection = 'lower_is_better'
): PerformanceBucket {
  const { min, max } = targetRange;
  const mid = (min + max) / 2;

  if (direction === 'lower_is_better') {
    // Time-based: lower is better
    if (value <= min) return 'ELITE';
    if (value <= mid) return 'STRONG';
    if (value <= max) return 'OK';
    return 'TOUGH';
  } else {
    // Reps/distance/load: higher is better
    if (value >= max) return 'ELITE';
    if (value >= mid) return 'STRONG';
    if (value >= min) return 'OK';
    return 'TOUGH';
  }
}

/**
 * Calculate performance score (0-100) based on result and targets
 */
export function calculateBenchmarkScore(
  value: number,
  targetRange: TargetTimeRange,
  direction: BenchmarkDirection = 'lower_is_better',
  weight: number = 1.0
): number {
  const { min, max } = targetRange;
  
  let score: number;
  
  if (direction === 'lower_is_better') {
    // Score = 100 when value <= min (ELITE), 0 when value >= 2*max
    if (value <= min) {
      score = 100;
    } else if (value >= max * 2) {
      score = 0;
    } else {
      // Linear interpolation
      score = 100 - ((value - min) / (max * 2 - min)) * 100;
    }
  } else {
    // Score = 100 when value >= max (ELITE), 0 when value <= 0
    if (value >= max) {
      score = 100;
    } else if (value <= 0) {
      score = 0;
    } else {
      score = (value / max) * 100;
    }
  }
  
  return Math.round(Math.max(0, Math.min(100, score)) * weight);
}

/**
 * Get default direction based on metric type
 */
export function getDefaultDirection(metric: BenchmarkMetric): BenchmarkDirection {
  switch (metric) {
    case 'time_seconds':
      return 'lower_is_better';
    case 'reps':
    case 'distance_meters':
    case 'load_kg':
    case 'rounds':
      return 'higher_is_better';
    default:
      return 'lower_is_better';
  }
}

/**
 * Format benchmark result based on metric
 */
export function formatBenchmarkResult(value: number, metric: BenchmarkMetric): string {
  return getBenchmarkMetricInfo(metric).format(value);
}


// Example benchmark templates
export const BENCHMARK_EXAMPLES = {
  engine: {
    title: 'ENGINE CONDITIONING',
    wodType: 'engine' as const,
    variants: {
      open: {
        content: `3 Rounds For Time:
400m Run
15 Cal Row
12 Wall Ball (6kg)
Rest 1:30 between rounds`,
        notes: 'Ritmo confortável, foco em constância',
        targetRange: { min: 18 * 60, max: 22 * 60 },
        durationMinutes: 22,
      },
      pro: {
        content: `4 Rounds For Time:
400m Run
20 Cal Row
15 Wall Ball (9kg)
Rest 1:00 between rounds`,
        targetRange: { min: 20 * 60, max: 24 * 60 },
        durationMinutes: 24,
      },
      elite: {
        content: `5 Rounds For Time:
500m Run
30 Cal Row
25 Wall Ball (9kg)
No rest between rounds`,
        notes: 'Ritmo de competição, transições rápidas',
        targetRange: { min: 24 * 60, max: 28 * 60 },
        durationMinutes: 28,
      },
    },
  },
  chipper: {
    title: 'CHIPPER BENCHMARK',
    wodType: 'mixed' as const,
    variants: {
      open: {
        content: `For Time:
30 Cal Bike
20 Box Step-ups (50cm)
15 DB Thrusters (10kg)
10 Burpees
200m Farmer Carry (12kg cada)`,
        notes: 'Divida as séries se necessário',
        targetRange: { min: 12 * 60, max: 16 * 60 },
        durationMinutes: 16,
      },
      pro: {
        content: `For Time:
40 Cal Bike
30 Box Jumps (50cm)
20 DB Thrusters (15kg)
15 Burpees
300m Farmer Carry (20kg cada)`,
        targetRange: { min: 14 * 60, max: 18 * 60 },
        durationMinutes: 18,
      },
      elite: {
        content: `For Time:
60 Cal Bike
50 Box Jumps (60cm)
40 DB Thrusters (22.5kg)
30 Burpee Box Jump Overs
500m Farmer Carry (32kg cada)`,
        notes: 'Sem pausas, ritmo máximo sustentável',
        targetRange: { min: 18 * 60, max: 22 * 60 },
        durationMinutes: 22,
      },
    },
  },
  intervalado: {
    title: 'INTERVAL BENCHMARK',
    wodType: 'hyrox' as const,
    variants: {
      open: {
        content: `EMOM 16min (4 rounds):
Min 1: 200m Row
Min 2: 8 Wall Ball (6kg)
Min 3: 6 Burpees
Min 4: Rest

Score = tempo total de trabalho`,
        notes: 'Objetivo: terminar cada minuto com 10-15s de descanso',
        targetRange: { min: 10 * 60, max: 12 * 60 },
        durationMinutes: 16,
      },
      pro: {
        content: `EMOM 20min (5 rounds):
Min 1: 250m Row
Min 2: 12 Wall Ball (9kg)
Min 3: 8 Burpees
Min 4: Rest

Score = tempo total de trabalho`,
        targetRange: { min: 12 * 60, max: 15 * 60 },
        durationMinutes: 20,
      },
      elite: {
        content: `EMOM 24min (6 rounds):
Min 1: 350m Row
Min 2: 18 Wall Ball (9kg)
Min 3: 12 Burpees
Min 4: 100m Sled Push

Score = tempo total de trabalho`,
        notes: 'Sem descanso, ritmo de prova',
        targetRange: { min: 16 * 60, max: 19 * 60 },
        durationMinutes: 24,
      },
    },
  },
};
