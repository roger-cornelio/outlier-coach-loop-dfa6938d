/**
 * OUTLIER PHYSICS-BASED ENERGY CALCULATOR
 * =========================================
 * 
 * Deterministic calorie estimation based on mechanical work (Joules → Kcal).
 * Replaces arbitrary factor tables with physics formulas.
 * 
 * FORMULAS:
 * 
 * 1. VERTICAL WORK (Squat, Push, Pull, Hinge, Plyometric):
 *    total_mass = externalWeightKg + (userWeightKg × moved_mass_percentage)
 *    joules = total_mass × 9.81 × strictDistance × totalReps
 *    kcal = (joules / 4184) / human_efficiency_rate
 *    CRITICAL: strictDistance ALWAYS comes from pattern.default_distance_meters,
 *    never from parsed text (e.g. "10m" in Broad Jumps).
 * 
 * 2. HORIZONTAL FRICTION (Sled Push/Pull):
 *    joules = externalWeightKg × 9.81 × friction_coefficient × totalMeters
 *    kcal = (joules / 4184) / human_efficiency_rate
 * 
 * 3. METABOLIC:
 *    a) Distance Cardio (Running, Rowing): kcal = 1.03 × (meters/1000) × userWeightKg
 *    b) Isometric (Planks): kcal = MET(3.0) × userWeightKg × (seconds/3600)
 * 
 * CONSTANTS:
 *   g = 9.81 m/s²
 *   1 kcal = 4184 J
 *   Human mechanical efficiency ≈ 20% (default)
 * 
 * PARSING CONTRACT:
 *   - vertical_work → repsOrDistance = number of REPS
 *   - horizontal_friction → repsOrDistance = METERS
 *   - metabolic (cardio) → repsOrDistance = METERS
 *   - metabolic (isometric) → repsOrDistance = SECONDS
 */

// ============================================
// TYPES
// ============================================

export type FormulaType = 'vertical_work' | 'horizontal_friction' | 'metabolic';

export interface MovementPattern {
  id: string;
  name: string;
  formula_type: FormulaType;
  moved_mass_percentage: number;
  default_distance_meters: number;
  friction_coefficient: number | null;
  human_efficiency_rate: number;
  default_seconds_per_rep?: number | null;
}

export interface ExerciseKcalInput {
  userWeightKg: number;
  externalWeightKg?: number;
  /**
   * Unified input:
   * - For vertical_work: number of REPS
   * - For horizontal_friction: METERS of sled travel
   * - For metabolic/cardio: METERS of distance
   * - For metabolic/isometric: SECONDS of hold
   */
  repsOrDistance?: number;
  sets?: number;
  /** @deprecated Use repsOrDistance instead. Kept for backward compat. */
  reps?: number;
  /** @deprecated Use repsOrDistance instead. Kept for backward compat. */
  distanceMeters?: number;
  durationMinutes?: number;
  movementPattern: MovementPattern;
  /** Athlete gender for default weight fallback */
  athleteGender?: 'M' | 'F' | string | null;
  /** Default weights from global_exercises table */
  defaultMaleWeightKg?: number | null;
  defaultFemaleWeightKg?: number | null;
}

/**
 * Resolve external weight using priority chain:
 * 1st: Explicit coach override (externalWeightKg)
 * 2nd: Gender-based default from global_exercises
 * 3rd: 0 (bodyweight)
 */
export function resolveExternalWeight(input: {
  externalWeightKg?: number;
  athleteGender?: 'M' | 'F' | string | null;
  defaultMaleWeightKg?: number | null;
  defaultFemaleWeightKg?: number | null;
}): number {
  // 1st: Explicit coach value
  if (input.externalWeightKg != null && input.externalWeightKg > 0) {
    return input.externalWeightKg;
  }
  // 2nd: Gender-based default
  const gender = input.athleteGender?.toUpperCase();
  if (gender === 'M' && input.defaultMaleWeightKg != null) {
    return input.defaultMaleWeightKg;
  }
  if (gender === 'F' && input.defaultFemaleWeightKg != null) {
    return input.defaultFemaleWeightKg;
  }
  // 3rd: bodyweight
  return 0;
}

export interface ExerciseKcalResult {
  kcal: number;
  joules: number;
  formulaUsed: FormulaType;
  totalMassKg: number;
  distanceUsed: number;
  warnings: string[];
}

// ============================================
// CONSTANTS
// ============================================

const GRAVITY = 9.81; // m/s²
const JOULES_PER_KCAL = 4184;
/** Running energy cost: ~1.03 kcal/kg/km (ACSM standard) */
const CARDIO_KCAL_PER_KG_PER_KM = 1.03;
/** Approximate MET value for isometric holds (planks, wall sits) */
const ISOMETRIC_MET = 3.0;

// ============================================
// MAIN ENGINE
// ============================================

/**
 * Calculate exercise energy expenditure using physics formulas.
 * Returns estimated kcal based on mechanical work.
 */
export function calculateExerciseKcal(input: ExerciseKcalInput): ExerciseKcalResult {
  const {
    userWeightKg,
    durationMinutes,
    movementPattern,
    sets = 1,
  } = input;

  // Resolve repsOrDistance from new or legacy fields
  let repsOrDistance = input.repsOrDistance 
    ?? input.reps 
    ?? input.distanceMeters 
    ?? 1;

  // ════════════════════════════════════════════════════════════════════════
  // CONVERSÃO DISTÂNCIA→REPS para exercícios vertical_work
  // Se distanceMeters foi fornecido mas reps não, converter metros em reps
  // equivalentes usando defaultDistanceMeters do pattern.
  // Ex: 20m Lunge (0.4m/stride) → 50 reps
  // ════════════════════════════════════════════════════════════════════════
  if (
    movementPattern.formula_type === 'vertical_work' &&
    !input.reps &&
    !input.repsOrDistance &&
    input.distanceMeters &&
    input.distanceMeters > 0 &&
    movementPattern.default_distance_meters > 0
  ) {
    repsOrDistance = Math.ceil(input.distanceMeters / movementPattern.default_distance_meters);
  }

  // Resolve weight via priority chain
  const externalWeightKg = resolveExternalWeight({
    externalWeightKg: input.externalWeightKg,
    athleteGender: input.athleteGender,
    defaultMaleWeightKg: input.defaultMaleWeightKg,
    defaultFemaleWeightKg: input.defaultFemaleWeightKg,
  });

  const warnings: string[] = [];

  // Validate user weight
  if (!userWeightKg || userWeightKg <= 0) {
    return {
      kcal: 0,
      joules: 0,
      formulaUsed: movementPattern.formula_type,
      totalMassKg: 0,
      distanceUsed: 0,
      warnings: ['Peso do atleta é obrigatório para cálculo de calorias'],
    };
  }

  const eff = movementPattern.human_efficiency_rate || 0.20;
  const totalRepsOrMeters = repsOrDistance * sets;

  switch (movementPattern.formula_type) {
    // ─── VERTICAL WORK ──────────────────────────────
    // CRITICAL: NEVER trust user text for vertical distance.
    // Always force the biological distance from the pattern.
    case 'vertical_work': {
      const strictDistance = movementPattern.default_distance_meters || 0.6;
      const totalMass = externalWeightKg + (userWeightKg * (movementPattern.moved_mass_percentage || 0));
      const joules = totalMass * GRAVITY * strictDistance * totalRepsOrMeters;
      const kcal = (joules / JOULES_PER_KCAL) / eff;

      return {
        kcal: Math.floor(kcal),
        joules: Math.round(joules),
        formulaUsed: 'vertical_work',
        totalMassKg: Math.round(totalMass * 10) / 10,
        distanceUsed: strictDistance,
        warnings,
      };
    }

    // ─── HORIZONTAL FRICTION ────────────────────────
    // totalRepsOrMeters = distance in meters for sled exercises
    case 'horizontal_friction': {
      const friction = movementPattern.friction_coefficient ?? 0.45;
      const joules = externalWeightKg * GRAVITY * friction * totalRepsOrMeters;
      const kcal = (joules / JOULES_PER_KCAL) / eff;

      if (externalWeightKg <= 0) {
        warnings.push('Carga externa obrigatória para exercícios de fricção (sled)');
      }

      return {
        kcal: Math.floor(kcal),
        joules: Math.round(joules),
        formulaUsed: 'horizontal_friction',
        totalMassKg: externalWeightKg,
        distanceUsed: totalRepsOrMeters,
        warnings,
      };
    }

    // ─── METABOLIC ──────────────────────────────────
    case 'metabolic': {
      let kcal: number;
      let joules: number;

      const isDistanceCardio = movementPattern.name === 'Distance Cardio' 
        || movementPattern.default_distance_meters === 1.0;

      if (isDistanceCardio) {
        // Running/Rowing/Bike: 1.03 kcal per kg per km
        let distanceKm = totalRepsOrMeters / 1000;

        // Fallback: estimate from duration if no distance
        if (distanceKm <= 0 && durationMinutes && durationMinutes > 0) {
          distanceKm = durationMinutes * 0.167; // ~10 km/h
          warnings.push('Distância estimada a partir da duração (ritmo médio ~10 km/h)');
        }

        kcal = CARDIO_KCAL_PER_KG_PER_KM * distanceKm * userWeightKg;
        joules = kcal * JOULES_PER_KCAL;
      } else {
        // Isometric (Planks, Wall Sits): totalRepsOrMeters = seconds
        const hours = totalRepsOrMeters / 3600;
        kcal = ISOMETRIC_MET * userWeightKg * hours;
        joules = kcal * JOULES_PER_KCAL;
      }

      return {
        kcal: Math.floor(kcal),
        joules: Math.round(joules),
        formulaUsed: 'metabolic',
        totalMassKg: userWeightKg,
        distanceUsed: totalRepsOrMeters,
        warnings,
      };
    }

    default: {
      return {
        kcal: 0,
        joules: 0,
        formulaUsed: movementPattern.formula_type,
        totalMassKg: 0,
        distanceUsed: 0,
        warnings: [`Tipo de fórmula desconhecido: ${movementPattern.formula_type}`],
      };
    }
  }
}

// ============================================
// BATCH CALCULATOR (for full workout blocks)
// ============================================

export interface BlockExercise {
  name: string;
  reps?: number;
  externalWeightKg?: number;
  distanceMeters?: number;
  movementPattern: MovementPattern;
}

export interface BlockKcalResult {
  totalKcal: number;
  exerciseBreakdown: Array<{
    name: string;
    kcal: number;
    formulaUsed: FormulaType;
  }>;
  warnings: string[];
}

/**
 * Calculate total kcal for a list of exercises in a workout block.
 */
export function calculateBlockKcal(
  exercises: BlockExercise[],
  userWeightKg: number,
  durationMinutes?: number,
): BlockKcalResult {
  const breakdown: BlockKcalResult['exerciseBreakdown'] = [];
  const allWarnings: string[] = [];
  let totalKcal = 0;

  for (const exercise of exercises) {
    const result = calculateExerciseKcal({
      userWeightKg,
      externalWeightKg: exercise.externalWeightKg,
      reps: exercise.reps,
      distanceMeters: exercise.distanceMeters,
      durationMinutes,
      movementPattern: exercise.movementPattern,
    });

    totalKcal += result.kcal;
    breakdown.push({
      name: exercise.name,
      kcal: result.kcal,
      formulaUsed: result.formulaUsed,
    });
    allWarnings.push(...result.warnings);
  }

  return {
    totalKcal: Math.round(totalKcal),
    exerciseBreakdown: breakdown,
    warnings: [...new Set(allWarnings)],
  };
}
