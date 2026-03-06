/**
 * OUTLIER PHYSICS-BASED ENERGY CALCULATOR
 * =========================================
 * 
 * Deterministic calorie estimation based on mechanical work (Joules → Kcal).
 * Replaces arbitrary factor tables with physics formulas.
 * 
 * FORMULAS:
 * 
 * 1. VERTICAL WORK (Squat, Push, Pull, Hinge, Lunge, Core, Olympic):
 *    total_mass = externalWeightKg + (userWeightKg × moved_mass_percentage)
 *    joules = total_mass × 9.81 × distanceMeters × reps
 *    kcal = (joules / 4184) / human_efficiency_rate
 * 
 * 2. HORIZONTAL FRICTION (Sled Push/Pull):
 *    joules = externalWeightKg × 9.81 × friction_coefficient × distanceMeters
 *    kcal = (joules / 4184) / human_efficiency_rate
 * 
 * 3. METABOLIC (Cardio – Running, Rowing, Bike, SkiErg):
 *    Uses simplified kcal ≈ userWeightKg × distanceKm × 1.0 (legacy HYROX factor)
 *    This is a reasonable proxy; true metabolic cost requires VO2 data.
 * 
 * CONSTANTS:
 *   g = 9.81 m/s²
 *   1 kcal = 4184 J
 *   Human mechanical efficiency ≈ 20% (default)
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
}

export interface ExerciseKcalInput {
  userWeightKg: number;
  externalWeightKg?: number;
  reps?: number;
  distanceMeters?: number;
  durationMinutes?: number;
  movementPattern: MovementPattern;
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
const DEFAULT_METABOLIC_FACTOR = 1.0; // kcal/kg/km (legacy HYROX)

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
    externalWeightKg = 0,
    reps = 1,
    distanceMeters,
    durationMinutes,
    movementPattern,
  } = input;

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

  const effectiveDistance = distanceMeters ?? movementPattern.default_distance_meters;
  const efficiency = movementPattern.human_efficiency_rate || 0.20;

  switch (movementPattern.formula_type) {
    case 'vertical_work': {
      const totalMass = externalWeightKg + (userWeightKg * movementPattern.moved_mass_percentage);
      const joules = totalMass * GRAVITY * effectiveDistance * reps;
      const kcal = (joules / JOULES_PER_KCAL) / efficiency;

      return {
        kcal: Math.round(kcal),
        joules: Math.round(joules),
        formulaUsed: 'vertical_work',
        totalMassKg: Math.round(totalMass * 10) / 10,
        distanceUsed: effectiveDistance,
        warnings,
      };
    }

    case 'horizontal_friction': {
      const friction = movementPattern.friction_coefficient ?? 0.45;
      const joules = externalWeightKg * GRAVITY * friction * effectiveDistance;
      const kcal = (joules / JOULES_PER_KCAL) / efficiency;

      if (externalWeightKg <= 0) {
        warnings.push('Carga externa obrigatória para exercícios de fricção (sled)');
      }

      return {
        kcal: Math.round(kcal),
        joules: Math.round(joules),
        formulaUsed: 'horizontal_friction',
        totalMassKg: externalWeightKg,
        distanceUsed: effectiveDistance,
        warnings,
      };
    }

    case 'metabolic': {
      // For cardio, use distance in km if available, otherwise estimate from duration
      let distanceKm = effectiveDistance / 1000;

      if (durationMinutes && durationMinutes > 0 && !distanceMeters) {
        // Rough estimate: ~10 km/h average pace → ~0.167 km/min
        distanceKm = durationMinutes * 0.167;
        warnings.push('Distância estimada a partir da duração (ritmo médio ~10 km/h)');
      }

      const kcal = userWeightKg * distanceKm * DEFAULT_METABOLIC_FACTOR;
      const joules = kcal * JOULES_PER_KCAL; // reverse for display

      return {
        kcal: Math.round(kcal),
        joules: Math.round(joules),
        formulaUsed: 'metabolic',
        totalMassKg: userWeightKg,
        distanceUsed: distanceKm * 1000,
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
