/**
 * computeBlockKcalFromParsed - Calcula Kcal e tempo a partir de ParsedExercises
 * 
 * Usa dados do movement_patterns (fórmulas biomecânicas) para calcular
 * gasto energético real baseado nos exercícios parseados pela IA.
 * 
 * Fórmulas:
 * - vertical_work: Kcal = (massa_movida * g * distância * reps * sets) / (eficiência * 4184)
 * - horizontal_friction: Kcal = (massa_movida * g * coef_fricção * distância * reps * sets) / (eficiência * 4184)
 * - metabolic: Kcal = MET * peso_corporal * (tempo_minutos / 60)
 */

import type { ParsedExercise, ComputedBlockMetrics } from '@/types/outlier';

const GRAVITY = 9.81; // m/s²
const JOULES_PER_KCAL = 4184;

// MET values para exercícios metabólicos/cardio
const METABOLIC_METS: Record<string, number> = {
  running: 9.8,
  distance_cardio: 8.0,
  cardio: 7.0,
  rowing: 7.0,
  ski_erg: 6.5,
  assault_bike: 8.5,
  burpees: 8.0,
  total_body_plyo: 8.0,
};

// Dados default de movement patterns (fallback quando DB não disponível)
const DEFAULT_PATTERN_DATA: Record<string, {
  formulaType: 'vertical_work' | 'horizontal_friction' | 'metabolic';
  movedMassPercentage: number;
  defaultDistanceMeters: number;
  frictionCoefficient?: number;
  humanEfficiencyRate: number;
  defaultSecondsPerRep?: number;
}> = {
  squat: { formulaType: 'vertical_work', movedMassPercentage: 0.70, defaultDistanceMeters: 0.5, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 3 },
  hinge: { formulaType: 'vertical_work', movedMassPercentage: 0.65, defaultDistanceMeters: 0.4, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 3 },
  hinge_deadlift: { formulaType: 'vertical_work', movedMassPercentage: 0.65, defaultDistanceMeters: 0.4, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 3 },
  push: { formulaType: 'vertical_work', movedMassPercentage: 0.60, defaultDistanceMeters: 0.5, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 2.5 },
  pull: { formulaType: 'vertical_work', movedMassPercentage: 0.60, defaultDistanceMeters: 0.5, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 2.5 },
  pull_vertical: { formulaType: 'vertical_work', movedMassPercentage: 0.95, defaultDistanceMeters: 0.6, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 3 },
  carry: { formulaType: 'horizontal_friction', movedMassPercentage: 1.0, defaultDistanceMeters: 25, frictionCoefficient: 0.01, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 30 },
  core: { formulaType: 'vertical_work', movedMassPercentage: 0.30, defaultDistanceMeters: 0.3, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 2 },
  lunge: { formulaType: 'vertical_work', movedMassPercentage: 0.70, defaultDistanceMeters: 0.4, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 3 },
  squat_vertical_push: { formulaType: 'vertical_work', movedMassPercentage: 0.70, defaultDistanceMeters: 0.8, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 3.5 },
  olympic_lift: { formulaType: 'vertical_work', movedMassPercentage: 0.70, defaultDistanceMeters: 1.2, humanEfficiencyRate: 0.18, defaultSecondsPerRep: 4 },
  horizontal_friction: { formulaType: 'horizontal_friction', movedMassPercentage: 1.0, defaultDistanceMeters: 25, frictionCoefficient: 0.35, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 30 },
  horizontal_sled: { formulaType: 'horizontal_friction', movedMassPercentage: 1.0, defaultDistanceMeters: 25, frictionCoefficient: 0.35, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 30 },
  total_body_plyo: { formulaType: 'vertical_work', movedMassPercentage: 0.95, defaultDistanceMeters: 0.3, humanEfficiencyRate: 0.18, defaultSecondsPerRep: 3 },
  isometric: { formulaType: 'vertical_work', movedMassPercentage: 0.30, defaultDistanceMeters: 0, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 30 },
  distance_cardio: { formulaType: 'metabolic', movedMassPercentage: 1.0, defaultDistanceMeters: 0, humanEfficiencyRate: 0.25 },
  cardio: { formulaType: 'metabolic', movedMassPercentage: 1.0, defaultDistanceMeters: 0, humanEfficiencyRate: 0.25 },
};

interface BiometricData {
  pesoKg: number;
  alturaM?: number;
  sexo?: 'masculino' | 'feminino';
  idade?: number;
}

function computeExerciseKcal(
  exercise: ParsedExercise,
  biometrics: BiometricData,
): { kcal: number; durationSec: number } {
  const patternSlug = exercise.movementPatternSlug || 'squat'; // fallback
  const pattern = DEFAULT_PATTERN_DATA[patternSlug];

  if (!pattern) {
    // Fallback: usar squat como padrão
    return computeExerciseKcal({ ...exercise, movementPatternSlug: 'squat' }, biometrics);
  }

  const sets = exercise.sets || 1;
  const reps = exercise.reps || 1;
  const loadKg = exercise.loadKg || 0;

  // Duração do exercício
  let durationSec: number;
  if (exercise.durationSeconds) {
    durationSec = exercise.durationSeconds;
  } else {
    const secPerRep = pattern.defaultSecondsPerRep || 3;
    durationSec = sets * reps * secPerRep;
    // Adicionar descanso entre sets
    const restPerSet = exercise.restSeconds || 60;
    durationSec += (sets - 1) * restPerSet;
  }

  let kcal = 0;

  if (pattern.formulaType === 'metabolic') {
    // Kcal = MET * peso * (minutos / 60)
    const met = METABOLIC_METS[patternSlug] || 7.0;
    const minutes = durationSec / 60;
    kcal = met * biometrics.pesoKg * (minutes / 60);
  } else if (pattern.formulaType === 'horizontal_friction') {
    // Kcal = (massa * g * coef_fricção * distância * reps * sets) / (eficiência * 4184)
    const massaMovida = biometrics.pesoKg * pattern.movedMassPercentage + loadKg;
    const distance = exercise.distanceMeters || pattern.defaultDistanceMeters;
    const friction = pattern.frictionCoefficient || 0.35;
    const work = massaMovida * GRAVITY * friction * distance * reps * sets;
    kcal = work / (pattern.humanEfficiencyRate * JOULES_PER_KCAL);
  } else {
    // vertical_work: Kcal = (massa * g * distância * reps * sets) / (eficiência * 4184)
    const massaMovida = biometrics.pesoKg * pattern.movedMassPercentage + loadKg;
    const distance = pattern.defaultDistanceMeters;
    const work = massaMovida * GRAVITY * distance * reps * sets;
    kcal = work / (pattern.humanEfficiencyRate * JOULES_PER_KCAL);
  }

  // Apply intensity multiplier
  if (exercise.intensityValue) {
    const intensityMultiplier = getIntensityMultiplier(exercise.intensityType, exercise.intensityValue);
    kcal *= intensityMultiplier;
  }

  // Guard contra NaN/Infinity (CENÁRIO 1)
  const safeKcal = Number.isFinite(kcal) ? Math.round(kcal) : 0;
  const safeDuration = Number.isFinite(durationSec) ? Math.round(durationSec) : 0;
  return { kcal: safeKcal, durationSec: safeDuration };
}

function getIntensityMultiplier(type?: string, value?: number): number {
  if (!type || !value) return 1.0;

  if (type === 'pse' || type === 'rpe') {
    // PSE 6=0.85, 7=0.95, 8=1.0, 9=1.10, 10=1.20
    const map: Record<number, number> = { 6: 0.85, 7: 0.95, 8: 1.0, 9: 1.10, 10: 1.20 };
    return map[value] || 1.0;
  }

  if (type === 'zone') {
    // Zone 1=0.70, 2=0.85, 3=1.0, 4=1.15, 5=1.30
    const map: Record<number, number> = { 1: 0.70, 2: 0.85, 3: 1.0, 4: 1.15, 5: 1.30 };
    return map[value] || 1.0;
  }

  return 1.0;
}

/**
 * Calcula métricas completas para um bloco a partir dos exercícios parseados
 */
export function computeBlockMetrics(
  parsedExercises: ParsedExercise[],
  biometrics: BiometricData,
): ComputedBlockMetrics {
  if (!parsedExercises || parsedExercises.length === 0) {
    return {};
  }

  let totalKcal = 0;
  let totalDurationSec = 0;
  let totalSets = 0;
  let totalReps = 0;
  let intensitySum = 0;
  let intensityCount = 0;

  for (const exercise of parsedExercises) {
    const { kcal, durationSec } = computeExerciseKcal(exercise, biometrics);
    totalKcal += kcal;
    totalDurationSec += durationSec;
    totalSets += exercise.sets || 0;
    totalReps += (exercise.sets || 1) * (exercise.reps || 0);
    
    if (exercise.intensityValue) {
      intensitySum += exercise.intensityValue;
      intensityCount++;
    }
  }

  return {
    estimatedKcal: Math.round(totalKcal),
    estimatedDurationSec: Math.round(totalDurationSec),
    totalSets,
    totalReps,
    avgIntensity: intensityCount > 0 ? Math.round((intensitySum / intensityCount) * 10) / 10 : undefined,
    computedAt: new Date().toISOString(),
  };
}
