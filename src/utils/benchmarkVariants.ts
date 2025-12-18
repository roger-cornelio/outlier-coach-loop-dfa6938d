import type { WorkoutBlock, AthleteLevel, LevelVariant, TargetTimeRange } from '@/types/outlier';

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

// Example benchmark templates
export const BENCHMARK_EXAMPLES = {
  engine: {
    title: 'ENGINE CONDITIONING',
    wodType: 'engine' as const,
    variants: {
      iniciante: {
        content: `3 Rounds For Time:
400m Run
15 Cal Row
12 Wall Ball (6kg)
Rest 1:30 between rounds`,
        notes: 'Ritmo confortável, foco em constância',
        targetRange: { min: 18 * 60, max: 22 * 60 }, // 18:00 - 22:00
        durationMinutes: 22,
      },
      intermediario: {
        content: `4 Rounds For Time:
400m Run
20 Cal Row
15 Wall Ball (9kg)
Rest 1:00 between rounds`,
        targetRange: { min: 20 * 60, max: 24 * 60 }, // 20:00 - 24:00
        durationMinutes: 24,
      },
      avancado: {
        content: `5 Rounds For Time:
400m Run
25 Cal Row
20 Wall Ball (9kg)
Rest 0:45 between rounds`,
        targetRange: { min: 22 * 60, max: 26 * 60 }, // 22:00 - 26:00
        durationMinutes: 26,
      },
      hyrox_pro: {
        content: `5 Rounds For Time:
500m Run
30 Cal Row
25 Wall Ball (9kg)
No rest between rounds`,
        notes: 'Ritmo de competição, transições rápidas',
        targetRange: { min: 24 * 60, max: 28 * 60 }, // 24:00 - 28:00
        durationMinutes: 28,
      },
    },
  },
  chipper: {
    title: 'CHIPPER BENCHMARK',
    wodType: 'mixed' as const,
    variants: {
      iniciante: {
        content: `For Time:
30 Cal Bike
20 Box Step-ups (50cm)
15 DB Thrusters (10kg)
10 Burpees
200m Farmer Carry (12kg cada)`,
        notes: 'Divida as séries se necessário',
        targetRange: { min: 12 * 60, max: 16 * 60 }, // 12:00 - 16:00
        durationMinutes: 16,
      },
      intermediario: {
        content: `For Time:
40 Cal Bike
30 Box Jumps (50cm)
20 DB Thrusters (15kg)
15 Burpees
300m Farmer Carry (20kg cada)`,
        targetRange: { min: 14 * 60, max: 18 * 60 }, // 14:00 - 18:00
        durationMinutes: 18,
      },
      avancado: {
        content: `For Time:
50 Cal Bike
40 Box Jumps (60cm)
30 DB Thrusters (20kg)
20 Burpee Box Jump Overs
400m Farmer Carry (24kg cada)`,
        targetRange: { min: 16 * 60, max: 20 * 60 }, // 16:00 - 20:00
        durationMinutes: 20,
      },
      hyrox_pro: {
        content: `For Time:
60 Cal Bike
50 Box Jumps (60cm)
40 DB Thrusters (22.5kg)
30 Burpee Box Jump Overs
500m Farmer Carry (32kg cada)`,
        notes: 'Sem pausas, ritmo máximo sustentável',
        targetRange: { min: 18 * 60, max: 22 * 60 }, // 18:00 - 22:00
        durationMinutes: 22,
      },
    },
  },
  intervalado: {
    title: 'INTERVAL BENCHMARK',
    wodType: 'hyrox' as const,
    variants: {
      iniciante: {
        content: `EMOM 16min (4 rounds):
Min 1: 200m Row
Min 2: 8 Wall Ball (6kg)
Min 3: 6 Burpees
Min 4: Rest

Score = tempo total de trabalho`,
        notes: 'Objetivo: terminar cada minuto com 10-15s de descanso',
        targetRange: { min: 10 * 60, max: 12 * 60 }, // 10:00 - 12:00 work time
        durationMinutes: 16,
      },
      intermediario: {
        content: `EMOM 20min (5 rounds):
Min 1: 250m Row
Min 2: 12 Wall Ball (9kg)
Min 3: 8 Burpees
Min 4: Rest

Score = tempo total de trabalho`,
        targetRange: { min: 12 * 60, max: 15 * 60 }, // 12:00 - 15:00 work time
        durationMinutes: 20,
      },
      avancado: {
        content: `EMOM 24min (6 rounds):
Min 1: 300m Row
Min 2: 15 Wall Ball (9kg)
Min 3: 10 Burpees
Min 4: Rest

Score = tempo total de trabalho`,
        targetRange: { min: 14 * 60, max: 17 * 60 }, // 14:00 - 17:00 work time
        durationMinutes: 24,
      },
      hyrox_pro: {
        content: `EMOM 24min (6 rounds):
Min 1: 350m Row
Min 2: 18 Wall Ball (9kg)
Min 3: 12 Burpees
Min 4: 100m Sled Push

Score = tempo total de trabalho`,
        notes: 'Sem descanso, ritmo de prova',
        targetRange: { min: 16 * 60, max: 19 * 60 }, // 16:00 - 19:00 work time
        durationMinutes: 24,
      },
    },
  },
};
