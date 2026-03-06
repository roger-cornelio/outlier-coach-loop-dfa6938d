/**
 * TIME ESTIMATOR - TUT (Time Under Tension) Based
 * =================================================
 * 
 * Estimates workout duration for UX scheduling purposes ONLY.
 * This is completely separate from the physics-based Kcal engine.
 * 
 * Formula:
 *   Active Work per Set = repsOrDistance × patternDefaultSeconds
 *   Total Active = Active Work per Set × sets
 *   Total Rest = (sets - 1) × restSeconds
 *   Total = Active + Rest
 */

export interface TimeEstimateInput {
  sets: number;
  repsOrDistance: number;
  /** From movement_patterns.default_seconds_per_rep */
  patternDefaultSeconds: number;
  /** True for distance-based movements (Sled, Cardio) */
  isDistance: boolean;
  /** Coach-defined rest between sets (defaults to 60s) */
  customRestSeconds?: number;
}

export interface TimeEstimateResult {
  totalSeconds: number;
  activeSeconds: number;
  restSeconds: number;
  totalMinutes: number;
}

const DEFAULT_REST_SECONDS = 60;

/**
 * Calculate estimated duration of an exercise using TUT approach.
 * Returns total estimated time in seconds (integer).
 */
export function calculateEstimatedTimeSeconds(input: TimeEstimateInput): TimeEstimateResult {
  const {
    sets,
    repsOrDistance,
    patternDefaultSeconds,
    customRestSeconds,
  } = input;

  if (sets <= 0 || repsOrDistance <= 0 || patternDefaultSeconds <= 0) {
    return { totalSeconds: 0, activeSeconds: 0, restSeconds: 0, totalMinutes: 0 };
  }

  const activePerSet = repsOrDistance * patternDefaultSeconds;
  const totalActive = activePerSet * sets;
  const restPerInterval = customRestSeconds ?? DEFAULT_REST_SECONDS;
  const totalRest = Math.max(0, (sets - 1)) * restPerInterval;
  const totalSeconds = Math.round(totalActive + totalRest);

  return {
    totalSeconds,
    activeSeconds: Math.round(totalActive),
    restSeconds: Math.round(totalRest),
    totalMinutes: Math.ceil(totalSeconds / 60),
  };
}

/**
 * Sum estimated times for multiple exercises in a block.
 */
export function calculateBlockEstimatedTime(
  exercises: TimeEstimateInput[]
): TimeEstimateResult {
  let totalActive = 0;
  let totalRest = 0;

  for (const ex of exercises) {
    const result = calculateEstimatedTimeSeconds(ex);
    totalActive += result.activeSeconds;
    totalRest += result.restSeconds;
  }

  const totalSeconds = Math.round(totalActive + totalRest);

  return {
    totalSeconds,
    activeSeconds: Math.round(totalActive),
    restSeconds: Math.round(totalRest),
    totalMinutes: Math.ceil(totalSeconds / 60),
  };
}
