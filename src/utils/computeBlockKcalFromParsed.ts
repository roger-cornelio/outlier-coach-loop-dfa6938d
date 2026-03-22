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
import { parseRoundGroups, parseStructureLine, type RoundGroup, type WorkoutStructure } from '@/utils/workoutStructures';

const GRAVITY = 9.81; // m/s²
const JOULES_PER_KCAL = 4184;

// ════════════════════════════════════════════════════════════════════════
// ACSM STANDARD: 1.03 kcal/kg/km para cardio distance-based
// ════════════════════════════════════════════════════════════════════════
const ACSM_KCAL_PER_KG_PER_KM = 1.03;

// Slugs que são DISTANCE-BASED cardio (usam ACSM)
const DISTANCE_BASED_CARDIO_SLUGS = new Set([
  'running', 'rowing', 'ski_erg', 'distance_cardio',
]);

// Ritmos médios por modalidade (segundos por km)
const CARDIO_PACE_SEC_PER_KM: Record<string, number> = {
  running: 360,        // 6:00/km
  rowing: 240,         // 2:00/500m → 4:00/km
  ski_erg: 280,        // 2:20/500m → 4:40/km
  distance_cardio: 360, // default = corrida
};

// Slugs que são MACHINE/CAL-BASED (mantém MET)
const MACHINE_BASED_CARDIO_SLUGS = new Set([
  'assault_bike', 'bike', 'cardio',
]);

// MET values para exercícios metabólicos que NÃO são distance-based
const METABOLIC_METS: Record<string, number> = {
  assault_bike: 8.5,
  bike: 7.0,
  cardio: 7.0,
  burpees: 8.0,
  total_body_plyo: 8.0,
  isometric: 3.0,
  carry: 6.0,
  rest: 1.0,
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
  carry: { formulaType: 'metabolic', movedMassPercentage: 1.0, defaultDistanceMeters: 25, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 30 },
  core: { formulaType: 'vertical_work', movedMassPercentage: 0.30, defaultDistanceMeters: 0.3, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 2 },
  lunge: { formulaType: 'vertical_work', movedMassPercentage: 0.70, defaultDistanceMeters: 0.4, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 3 },
  squat_vertical_push: { formulaType: 'vertical_work', movedMassPercentage: 0.70, defaultDistanceMeters: 0.8, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 3.5 },
  olympic_lift: { formulaType: 'vertical_work', movedMassPercentage: 0.70, defaultDistanceMeters: 1.2, humanEfficiencyRate: 0.18, defaultSecondsPerRep: 4 },
  horizontal_friction: { formulaType: 'horizontal_friction', movedMassPercentage: 1.0, defaultDistanceMeters: 25, frictionCoefficient: 0.35, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 30 },
  horizontal_sled: { formulaType: 'horizontal_friction', movedMassPercentage: 1.0, defaultDistanceMeters: 25, frictionCoefficient: 0.35, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 30 },
  total_body_plyo: { formulaType: 'vertical_work', movedMassPercentage: 0.95, defaultDistanceMeters: 0.45, humanEfficiencyRate: 0.15, defaultSecondsPerRep: 3 },
  isometric: { formulaType: 'metabolic', movedMassPercentage: 0.30, defaultDistanceMeters: 0, humanEfficiencyRate: 0.20, defaultSecondsPerRep: 30 },
  distance_cardio: { formulaType: 'metabolic', movedMassPercentage: 1.0, defaultDistanceMeters: 0, humanEfficiencyRate: 0.25 },
  cardio: { formulaType: 'metabolic', movedMassPercentage: 1.0, defaultDistanceMeters: 0, humanEfficiencyRate: 0.25 },
  assault_bike: { formulaType: 'metabolic', movedMassPercentage: 1.0, defaultDistanceMeters: 0, humanEfficiencyRate: 0.25 },
};

interface BiometricData {
  pesoKg: number;
  alturaM?: number;
  sexo?: 'masculino' | 'feminino';
  idade?: number;
}

/** Garante peso válido (>0) para evitar cálculos zerados */
function safePesoKg(peso: number | null | undefined): number {
  if (!peso || peso <= 0 || !Number.isFinite(peso)) return 75;
  return peso;
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
  const loadKg = exercise.loadKg || 0;

  // ════════════════════════════════════════════════════════════════════════
  // CONVERSÃO DISTÂNCIA→REPS para exercícios vertical_work
  // Se o coach escreveu "20m Lunges", a IA retorna distanceMeters=20, reps=undefined.
  // Para vertical_work, convertemos metros em reps equivalentes usando defaultDistanceMeters.
  // Ex: 20m Lunge (0.4m/stride) → 50 reps. 10m Broad Jump (0.3m/jump) → 34 reps.
  // ════════════════════════════════════════════════════════════════════════
  let reps: number;
  if (
    pattern.formulaType === 'vertical_work' &&
    !exercise.reps &&
    exercise.distanceMeters &&
    exercise.distanceMeters > 0 &&
    pattern.defaultDistanceMeters > 0
  ) {
    reps = Math.ceil(exercise.distanceMeters / pattern.defaultDistanceMeters);
  } else {
    reps = exercise.reps || 1;
  }

  // ════════════════════════════════════════════════════════════════════════
  // DURAÇÃO E KCAL — Segmentação por tipo de cardio
  // ════════════════════════════════════════════════════════════════════════
  const exerciseSlug = exercise.slug || '';
  const isDistanceBasedCardio = pattern.formulaType === 'metabolic' && 
    (DISTANCE_BASED_CARDIO_SLUGS.has(patternSlug) || DISTANCE_BASED_CARDIO_SLUGS.has(exerciseSlug));
  const isMachineBasedCardio = pattern.formulaType === 'metabolic' && 
    (MACHINE_BASED_CARDIO_SLUGS.has(patternSlug) || MACHINE_BASED_CARDIO_SLUGS.has(exerciseSlug));

  let durationSec: number;
  let kcal = 0;

  if (isDistanceBasedCardio) {
    // ═══════════════════════════════════════════════════════════════════
    // DISTANCE-BASED CARDIO: ACSM (1.03 kcal/kg/km)
    // Resolve o slug para ritmo, prioriza exerciseSlug depois patternSlug
    // ═══════════════════════════════════════════════════════════════════
    const paceSlug = CARDIO_PACE_SEC_PER_KM[exerciseSlug] ? exerciseSlug : patternSlug;
    const paceSecPerKm = CARDIO_PACE_SEC_PER_KM[paceSlug] || 360;

    let distanceKm: number;

    if (exercise.distanceMeters && exercise.distanceMeters > 0) {
      // Distância real fornecida
      distanceKm = exercise.distanceMeters / 1000;
      // Estimar duração via ritmo se não fornecida
      if (exercise.durationSeconds && exercise.durationSeconds > 0) {
        durationSec = exercise.durationSeconds;
      } else {
        durationSec = distanceKm * paceSecPerKm;
      }
    } else if (exercise.durationSeconds && exercise.durationSeconds > 0) {
      // Só tempo → estimar distância via ritmo
      durationSec = exercise.durationSeconds;
      distanceKm = durationSec / paceSecPerKm;
    } else {
      // Sem distância nem tempo → fallback conservador
      distanceKm = 0;
      durationSec = 0;
    }

    kcal = ACSM_KCAL_PER_KG_PER_KM * distanceKm * biometrics.pesoKg * sets;
    durationSec = durationSec * sets;
    // Adicionar descanso entre sets (raro para cardio, mas protege)
    if (sets > 1) {
      const restPerSet = exercise.restSeconds || 60;
      durationSec += (sets - 1) * restPerSet;
    }
  } else if (pattern.formulaType === 'metabolic') {
    // ═══════════════════════════════════════════════════════════════════
    // MACHINE/CAL-BASED ou ISOMETRIC: MET
    // ═══════════════════════════════════════════════════════════════════
    if (exercise.durationSeconds) {
      durationSec = exercise.durationSeconds * sets;
      if (sets > 1) {
        const restPerSet = exercise.restSeconds || 0;
        durationSec += (sets - 1) * restPerSet;
      }
    } else {
      const secPerRep = pattern.defaultSecondsPerRep || 3;
      durationSec = sets * reps * secPerRep;
      const restPerSet = exercise.restSeconds || 60;
      durationSec += (sets - 1) * restPerSet;
    }
    const met = METABOLIC_METS[patternSlug] || METABOLIC_METS[exerciseSlug] || 7.0;
    const minutes = durationSec / 60;
    kcal = met * biometrics.pesoKg * (minutes / 60);
  } else if (pattern.formulaType === 'horizontal_friction') {
    // Duração
    if (exercise.durationSeconds) {
      durationSec = exercise.durationSeconds * sets;
      if (sets > 1) {
        const restPerSet = exercise.restSeconds || 0;
        durationSec += (sets - 1) * restPerSet;
      }
    } else {
      const secPerRep = pattern.defaultSecondsPerRep || 3;
      durationSec = sets * reps * secPerRep;
      const restPerSet = exercise.restSeconds || 60;
      durationSec += (sets - 1) * restPerSet;
    }
    const massaMovida = biometrics.pesoKg * pattern.movedMassPercentage + loadKg;
    const distance = exercise.distanceMeters || pattern.defaultDistanceMeters;
    const friction = pattern.frictionCoefficient || 0.35;
    const work = massaMovida * GRAVITY * friction * distance * reps * sets;
    kcal = work / (pattern.humanEfficiencyRate * JOULES_PER_KCAL);
  } else {
    // vertical_work
    if (exercise.durationSeconds) {
      durationSec = exercise.durationSeconds * sets;
      if (sets > 1) {
        const restPerSet = exercise.restSeconds || 0;
        durationSec += (sets - 1) * restPerSet;
      }
    } else {
      const secPerRep = pattern.defaultSecondsPerRep || 3;
      durationSec = sets * reps * secPerRep;
      const restPerSet = exercise.restSeconds || 60;
      durationSec += (sets - 1) * restPerSet;
    }
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
 * Calcula métricas completas para um bloco a partir dos exercícios parseados.
 * 
 * Se blockContent for fornecido, usa parseRoundGroups para aplicar
 * multiplicadores de rounds por grupo (cada **N ROUNDS** multiplica
 * apenas os exercícios imediatamente abaixo dele).
 */
export function computeBlockMetrics(
  parsedExercises: ParsedExercise[],
  biometrics: BiometricData,
  blockContent?: string,
  blockTitle?: string,
): ComputedBlockMetrics {
  if (!parsedExercises || !Array.isArray(parsedExercises) || parsedExercises.length === 0) {
    return {};
  }

  const safeBiometrics = { ...biometrics, pesoKg: safePesoKg(biometrics.pesoKg) };

  // ════════════════════════════════════════════════════════════════════════════
  // FIXED_TIME DETECTION: Detectar AMRAP/EMOM no título OU conteúdo
  // ════════════════════════════════════════════════════════════════════════════
  const fixedTimeMinutes = detectFixedTimeMinutes(blockContent, blockTitle);

  const exerciseMultipliers = buildExerciseMultiplierMap(parsedExercises, blockContent);

  let totalKcal = 0;
  let totalDurationSec = 0;
  let totalSets = 0;
  let totalReps = 0;
  let intensitySum = 0;
  let intensityCount = 0;

  for (let i = 0; i < parsedExercises.length; i++) {
    const exercise = parsedExercises[i];
    const roundMultiplier = exerciseMultipliers[i] || 1;

    // ════════════════════════════════════════════════════════════════════════
    // NORMALIZAÇÃO: Se roundMultiplier > 1, forçar sets=1 para evitar
    // contagem dupla. Protege tanto dados novos (IA já envia sets=1)
    // quanto dados legados (IA antiga enviava sets multiplicados).
    // ════════════════════════════════════════════════════════════════════════
    let effectiveExercise = exercise;
    if (roundMultiplier > 1) {
      if ((exercise.sets || 1) > 1) {
        console.warn(`[computeBlockMetrics] Normalização: exercício "${exercise.name}" com sets=${exercise.sets} e roundMultiplier=${roundMultiplier} → forçando sets=1 para evitar dupla contagem`);
      }
      effectiveExercise = { ...exercise, sets: 1 };
    }

    const { kcal, durationSec } = computeExerciseKcal(effectiveExercise, safeBiometrics);
    
    totalKcal += kcal * roundMultiplier;
    totalDurationSec += durationSec * roundMultiplier;
    totalSets += (effectiveExercise.sets || 0) * roundMultiplier;
    totalReps += ((effectiveExercise.sets || 1) * (effectiveExercise.reps || 0)) * roundMultiplier;
    
    if (exercise.intensityValue) {
      intensitySum += exercise.intensityValue;
      intensityCount++;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FIXED_TIME OVERRIDE: Se AMRAP/EMOM detectado, o tempo fixo é autoridade
  // absoluta. Calcula rounds estimados e escala calorias proporcionalmente.
  // ════════════════════════════════════════════════════════════════════════════
  if (fixedTimeMinutes && fixedTimeMinutes > 0) {
    const fixedTimeSec = fixedTimeMinutes * 60;

    // Calcular tempo de 1 round completo (soma de todos exercícios com sets=1)
    const singleRoundTimeSec = totalDurationSec > 0 ? totalDurationSec : 180; // Fallback conservador de 3min

    if (singleRoundTimeSec !== totalDurationSec) {
      console.warn(`[computeBlockMetrics] Usando fallback conservador de 180s para singleRoundTimeSec (totalDurationSec era ${totalDurationSec})`);
    }

    // Estimar rounds internos
    const estimatedRounds = fixedTimeSec / singleRoundTimeSec;

    // Recalcular kcal baseado nos rounds estimados
    // totalKcal neste ponto = kcal de 1 round (sem multiplicação FIXED_TIME)
    // Precisamos escalar para o número de rounds estimados
    if (totalDurationSec > 0) {
      const scaleFactor = fixedTimeSec / totalDurationSec;
      totalKcal = Math.round(totalKcal * scaleFactor);
    }

    // Duração final é SEMPRE o tempo fixo (autoridade absoluta)
    totalDurationSec = fixedTimeSec;
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

/**
 * Detecta tempo fixo (AMRAP/EMOM) a partir do conteúdo e/ou título do bloco.
 * Prioridade: conteúdo > título (conteúdo é mais específico).
 */
function detectFixedTimeMinutes(blockContent?: string, blockTitle?: string): number | null {
  // Prioridade 1: conteúdo (mais específico)
  if (blockContent) {
    const lines = blockContent.split('\n');
    for (const line of lines) {
      const structure = parseStructureLine(line);
      if (structure && structure.type === 'FIXED_TIME' && structure.value && structure.value > 0) {
        return structure.value;
      }
    }
  }

  // Prioridade 2: título (com regex flexível para títulos compostos)
  // Aceita: "AMRAP 15'", "AMRAP 15' - Conditioning", "EMOM 20min - Upper Body"
  if (blockTitle) {
    // Primeiro tentar parseStructureLine padrão
    const structure = parseStructureLine(blockTitle);
    if (structure && structure.type === 'FIXED_TIME' && structure.value && structure.value > 0) {
      return structure.value;
    }

    // Fallback: regex flexível para títulos compostos (sem exigir fim de linha)
    const flexibleAmrap = blockTitle.match(/AMRAP\s*(\d+)\s*['\u2018\u2019\u0027\u2032]?\s*(?:min)?/i);
    if (flexibleAmrap) {
      const minutes = parseInt(flexibleAmrap[1], 10);
      if (minutes > 0) return minutes;
    }

    const flexibleEmom = blockTitle.match(/EMOM\s*(\d+)\s*['\u2018\u2019\u0027\u2032]?\s*(?:min)?/i);
    if (flexibleEmom) {
      const minutes = parseInt(flexibleEmom[1], 10);
      if (minutes > 0) return minutes;
    }

    // Padrão invertido: número ANTES do nome (ex: "15' AMRAP", "10' EMOM")
    const invertedAmrap = blockTitle.match(/(\d+)\s*['\u2018\u2019\u0027\u2032]?\s*(?:min\s*)?AMRAP/i);
    if (invertedAmrap) {
      const minutes = parseInt(invertedAmrap[1], 10);
      if (minutes > 0) return minutes;
    }

    const invertedEmom = blockTitle.match(/(\d+)\s*['\u2018\u2019\u0027\u2032]?\s*(?:min\s*)?EMOM/i);
    if (invertedEmom) {
      const minutes = parseInt(invertedEmom[1], 10);
      if (minutes > 0) return minutes;
    }
  }

  return null;
}

/**
 * Constrói um mapa de multiplicadores de rounds por índice de exercício.
 * Usa o nome do exercício para fazer match entre parsedExercises e roundGroups.
 */
function buildExerciseMultiplierMap(
  parsedExercises: ParsedExercise[],
  blockContent?: string,
): Record<number, number> {
  const map: Record<number, number> = {};

  if (!blockContent) {
    // Sem conteúdo bruto → tudo multiplica por 1
    for (let i = 0; i < parsedExercises.length; i++) map[i] = 1;
    return map;
  }

  const groups = parseRoundGroups(blockContent);
  if (groups.length === 0) {
    for (let i = 0; i < parsedExercises.length; i++) map[i] = 1;
    return map;
  }

  // Match: para cada parsed exercise, tentar achar em qual round group ele está
  // Usamos ordem sequencial — o primeiro exercício parsed casa com o primeiro grupo, etc.
  let exerciseIdx = 0;
  for (const group of groups) {
    const groupExerciseCount = group.exerciseLines.length;
    for (let g = 0; g < groupExerciseCount && exerciseIdx < parsedExercises.length; g++) {
      map[exerciseIdx] = group.multiplier;
      exerciseIdx++;
    }
  }

  // Restantes sem grupo → multiplier 1
  for (; exerciseIdx < parsedExercises.length; exerciseIdx++) {
    map[exerciseIdx] = 1;
  }

  return map;
}
