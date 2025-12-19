/**
 * OUTLIER PARAMS - SINGLE SOURCE OF TRUTH
 * 
 * Todos os parâmetros numéricos e regras de ajuste do MVP
 * estão centralizados neste arquivo.
 * 
 * REGRAS:
 * - Nenhuma função do app deve ter números hardcoded
 * - Todas as funções devem importar e usar getActiveParams()
 * - Versionamento permite atualizar sem quebrar histórico
 */

import type { AthleteLevel, WodType } from '@/types/outlier';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface TargetTimeRangeConfig {
  min: number; // seconds
  max: number; // seconds
}

export interface LevelTimeRangesConfig {
  iniciante: TargetTimeRangeConfig;
  intermediario: TargetTimeRangeConfig;
  avancado: TargetTimeRangeConfig;
  hyrox_pro: TargetTimeRangeConfig;
}

export interface ScoringBucketConfig {
  elite: number;    // Score para ELITE
  strong: number;   // Score para STRONG
  ok: number;       // Score para OK
  tough: number;    // Score para TOUGH
  dnf: number;      // Score para DNF
}

export interface BenchmarkConfig {
  enabledOnlyForBenchmark: boolean;
  defaultTimeRangesByLevel: {
    [K in AthleteLevel]?: { min: number; max: number };
  };
  scoringBuckets: ScoringBucketConfig;
  allowCoachOverride: boolean;
  coachOverridePriority: 'coach_wins' | 'app_wins' | 'merge';
  // Limiares para classificação de bucket por nível
  bucketThresholds: {
    elitePercent: number;   // % abaixo do min = ELITE
    strongPercent: number;  // % entre min e média = STRONG
    okPercent: number;      // % entre média e max = OK
    // acima do max = TOUGH
  };
}

export interface WodTypeEstimationConfig {
  baseMinutes: number;
  variancePercent: number;
}

export interface EstimationConfig {
  enableAthleteTimeEstimate: boolean;
  wodTypeFactors: {
    [K in WodType | 'default']?: WodTypeEstimationConfig;
  };
  levelMultipliers: {
    [K in AthleteLevel]: number;
  };
  defaultSessionCapMinutes: number;
  // Multiplicadores de tempo por formato de WOD
  formatMultipliers: {
    for_time: number;
    amrap: number;
    emom: number;
    chipper: number;
    interval: number;
  };
  // Tempo mínimo e máximo de estimativa (segundos)
  minEstimateSeconds: number;
  maxEstimateSeconds: number;
}

export interface ModalityMetConfig {
  baseKcalPerMin: number;
  description?: string;
}

export interface ExerciseMetsConfig {
  metBaseByModality: {
    aquecimento: ModalityMetConfig;
    conditioning: ModalityMetConfig;
    forca: ModalityMetConfig;
    especifico: ModalityMetConfig;
    core: ModalityMetConfig;
    corrida: ModalityMetConfig;
    notas: ModalityMetConfig;
    // Modalidades específicas para análise
    running: ModalityMetConfig;
    rowing: ModalityMetConfig;
    bike: ModalityMetConfig;
    skierg: ModalityMetConfig;
    weightlifting: ModalityMetConfig;
    gymnastics: ModalityMetConfig;
    sled: ModalityMetConfig;
  };
  intensityMultipliers: {
    [pse: number]: number; // PSE 1-10 -> factor
  };
  weightFactorRules: {
    baselineKg: number;  // Peso de referência
    formula: 'linear';   // Fórmula de ajuste
  };
  ageFactorRules: {
    under30: number;
    under40: number;
    under50: number;
    over50: number;
  };
  sexFactorRules: {
    masculino: number;
    feminino: number;
  };
  runningKcalFactor: number; // kcal = peso_kg * km * fator
  levelSpeedKmh: {
    [K in AthleteLevel]: number;
  };
  fallbackKcalPerMin: number;
}

export interface AdaptationConfig {
  enableAdaptiveScaling: boolean;
  scalingOrder: ('reps' | 'distance' | 'load' | 'rest')[];
  constraints: {
    minRepsPercent: number;
    maxRepsPercent: number;
    minDistancePercent: number;
    maxDistancePercent: number;
    minLoadPercent: number;
    maxLoadPercent: number;
    minRestSeconds: number;
    maxRestSeconds: number;
  };
  preserveDifficultyRule: 'maintain_intent' | 'scale_proportional' | 'coach_defined';
}

export interface LabelsConfig {
  athleteLevels: AthleteLevel[];
  wodTypes: WodType[];
  wodFormats: string[];
  modalityTags: string[];
  performanceBuckets: string[];
}

export interface ProgressionConfig {
  levelThresholds: {
    [K in AthleteLevel]: number;
  };
  consistencyValidation: {
    minStrongWeeks: number;
    minStrongRatio: number;
    consistencyThreshold: number; // Max standard deviation
  };
  temporalDecay: {
    halfLifeDays: number;
    minWeight: number;
  };
  benchmarkTypeWeights: {
    [type: string]: number;
  };
}

export interface OutlierParamsConfig {
  version: string;
  isActive: boolean;
  updatedAt: string;
  notes?: string;
  
  benchmark: BenchmarkConfig;
  estimation: EstimationConfig;
  exerciseMets: ExerciseMetsConfig;
  adaptation: AdaptationConfig;
  labels: LabelsConfig;
  progression: ProgressionConfig;
}

// ============================================
// CONFIGURAÇÃO PADRÃO v1
// ============================================

export const DEFAULT_PARAMS: OutlierParamsConfig = {
  version: 'v1',
  isActive: true,
  updatedAt: new Date().toISOString(),
  notes: 'Configuração inicial do MVP OUTLIER',

  // A) BENCHMARK
  benchmark: {
    enabledOnlyForBenchmark: true,
    defaultTimeRangesByLevel: {
      iniciante: { min: 18 * 60, max: 25 * 60 },       // 18:00 - 25:00
      intermediario: { min: 14 * 60, max: 20 * 60 },   // 14:00 - 20:00
      avancado: { min: 12 * 60, max: 16 * 60 },        // 12:00 - 16:00
      hyrox_pro: { min: 10 * 60, max: 14 * 60 },       // 10:00 - 14:00
    },
    scoringBuckets: {
      elite: 100,
      strong: 85,
      ok: 65,
      tough: 40,
      dnf: 10,
    },
    allowCoachOverride: true,
    coachOverridePriority: 'coach_wins',
    bucketThresholds: {
      elitePercent: 0,      // <= min = ELITE
      strongPercent: 50,    // <= média = STRONG
      okPercent: 100,       // <= max = OK
    },
  },

  // B) ESTIMATION (WOD não benchmark)
  estimation: {
    enableAthleteTimeEstimate: true,
    wodTypeFactors: {
      engine: { baseMinutes: 20, variancePercent: 0.15 },
      strength: { baseMinutes: 12, variancePercent: 0.20 },
      skill: { baseMinutes: 15, variancePercent: 0.15 },
      mixed: { baseMinutes: 18, variancePercent: 0.18 },
      hyrox: { baseMinutes: 25, variancePercent: 0.12 },
      benchmark: { baseMinutes: 15, variancePercent: 0.15 },
      default: { baseMinutes: 15, variancePercent: 0.18 },
    },
    levelMultipliers: {
      iniciante: 1.35,
      intermediario: 1.15,
      avancado: 1.0,
      hyrox_open: 0.95,
      hyrox_pro: 0.85,
    },
    defaultSessionCapMinutes: 60,
    formatMultipliers: {
      for_time: 1.0,
      amrap: 1.0,
      emom: 1.0,
      chipper: 1.2,
      interval: 1.0,
    },
    minEstimateSeconds: 300,  // 5 min
    maxEstimateSeconds: 7200, // 120 min
  },

  // C) EXERCISE METS / ENERGY
  exerciseMets: {
    metBaseByModality: {
      aquecimento: { baseKcalPerMin: 6.0, description: '~360 kcal/h' },
      conditioning: { baseKcalPerMin: 12.0, description: '~720 kcal/h' },
      forca: { baseKcalPerMin: 8.0, description: '~480 kcal/h' },
      especifico: { baseKcalPerMin: 14.0, description: '~840 kcal/h (HYROX specific)' },
      core: { baseKcalPerMin: 5.0, description: '~300 kcal/h' },
      corrida: { baseKcalPerMin: 10.0, description: '~600 kcal/h (fallback)' },
      notas: { baseKcalPerMin: 0, description: 'Sem gasto calórico' },
      // Modalidades específicas (para análise de conteúdo)
      running: { baseKcalPerMin: 10.0, description: 'Corrida' },
      rowing: { baseKcalPerMin: 12.0, description: 'Remo' },
      bike: { baseKcalPerMin: 11.0, description: 'Assault Bike' },
      skierg: { baseKcalPerMin: 10.0, description: 'SkiErg' },
      weightlifting: { baseKcalPerMin: 8.0, description: 'Levantamento' },
      gymnastics: { baseKcalPerMin: 9.0, description: 'Ginástica' },
      sled: { baseKcalPerMin: 14.0, description: 'Sled Push/Pull' },
    },
    intensityMultipliers: {
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
    },
    weightFactorRules: {
      baselineKg: 70,
      formula: 'linear',
    },
    ageFactorRules: {
      under30: 1.05,
      under40: 1.0,
      under50: 0.95,
      over50: 0.90,
    },
    sexFactorRules: {
      masculino: 1.1,
      feminino: 1.0,
    },
    runningKcalFactor: 1.0, // kcal = peso_kg * km * fator
    levelSpeedKmh: {
      iniciante: 8.0,       // 7:30/km
      intermediario: 10.0,  // 6:00/km
      avancado: 12.0,       // 5:00/km
      hyrox_open: 13.0,     // 4:37/km
      hyrox_pro: 14.0,      // 4:17/km
    },
    fallbackKcalPerMin: 8.0,
  },

  // D) ADAPTATION
  adaptation: {
    enableAdaptiveScaling: false, // Ainda não implementado
    scalingOrder: ['reps', 'distance', 'load', 'rest'],
    constraints: {
      minRepsPercent: 50,
      maxRepsPercent: 150,
      minDistancePercent: 50,
      maxDistancePercent: 150,
      minLoadPercent: 60,
      maxLoadPercent: 120,
      minRestSeconds: 15,
      maxRestSeconds: 180,
    },
    preserveDifficultyRule: 'maintain_intent',
  },

  // E) LABELS E NÍVEIS
  labels: {
    athleteLevels: ['iniciante', 'intermediario', 'avancado', 'hyrox_open', 'hyrox_pro'],
    wodTypes: ['engine', 'strength', 'skill', 'mixed', 'hyrox', 'benchmark'],
    wodFormats: ['for_time', 'amrap', 'emom', 'chipper', 'interval'],
    modalityTags: ['engine', 'strength', 'mixed', 'skill', 'hyrox'],
    performanceBuckets: ['ELITE', 'STRONG', 'OK', 'TOUGH', 'DNF'],
  },

  // F) PROGRESSION (sistema de evolução)
  progression: {
    levelThresholds: {
      iniciante: 35,
      intermediario: 55,
      avancado: 75,
      hyrox_open: 90,
      hyrox_pro: 100,
    },
    consistencyValidation: {
      minStrongWeeks: 2,
      minStrongRatio: 0.7,
      consistencyThreshold: 15,
    },
    temporalDecay: {
      halfLifeDays: 30,
      minWeight: 0.1,
    },
    benchmarkTypeWeights: {
      engine: 1.2,
      chipper: 1.0,
      intervalado: 1.1,
      amrap: 1.0,
      emom: 0.9,
      fortime: 1.1,
      default: 1.0,
    },
  },
};

// ============================================
// STORAGE E VERSIONAMENTO
// ============================================

const PARAMS_STORAGE_KEY = 'outlier-params';
const PARAMS_HISTORY_KEY = 'outlier-params-history';

/**
 * Carrega os parâmetros ativos do localStorage
 * Se não existir, retorna os parâmetros padrão
 */
export function loadParams(): OutlierParamsConfig {
  try {
    const stored = localStorage.getItem(PARAMS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge com defaults para garantir que novos campos existam
      return mergeWithDefaults(parsed);
    }
  } catch (error) {
    console.warn('[outlierParams] Erro ao carregar params, usando defaults:', error);
  }
  return { ...DEFAULT_PARAMS };
}

/**
 * Merge parâmetros salvos com defaults para garantir campos novos
 */
function mergeWithDefaults(saved: Partial<OutlierParamsConfig>): OutlierParamsConfig {
  return {
    ...DEFAULT_PARAMS,
    ...saved,
    benchmark: { ...DEFAULT_PARAMS.benchmark, ...saved.benchmark },
    estimation: { ...DEFAULT_PARAMS.estimation, ...saved.estimation },
    exerciseMets: { ...DEFAULT_PARAMS.exerciseMets, ...saved.exerciseMets },
    adaptation: { ...DEFAULT_PARAMS.adaptation, ...saved.adaptation },
    labels: { ...DEFAULT_PARAMS.labels, ...saved.labels },
    progression: { ...DEFAULT_PARAMS.progression, ...saved.progression },
  };
}

/**
 * Salva os parâmetros (cria nova versão)
 */
export function saveParams(params: OutlierParamsConfig): void {
  try {
    // Atualizar timestamp e versão
    const newParams: OutlierParamsConfig = {
      ...params,
      updatedAt: new Date().toISOString(),
      isActive: true,
    };
    
    // Salvar versão anterior no histórico
    const currentParams = loadParams();
    if (currentParams.version !== newParams.version) {
      saveToHistory(currentParams);
    }
    
    localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(newParams));
    console.log(`[outlierParams] Parâmetros salvos: ${newParams.version}`);
  } catch (error) {
    console.error('[outlierParams] Erro ao salvar params:', error);
    throw error;
  }
}

/**
 * Salva uma versão no histórico
 */
function saveToHistory(params: OutlierParamsConfig): void {
  try {
    const history = loadHistory();
    history.push({
      ...params,
      isActive: false,
    });
    // Manter apenas as últimas 10 versões
    if (history.length > 10) {
      history.shift();
    }
    localStorage.setItem(PARAMS_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('[outlierParams] Erro ao salvar histórico:', error);
  }
}

/**
 * Carrega o histórico de versões
 */
export function loadHistory(): OutlierParamsConfig[] {
  try {
    const stored = localStorage.getItem(PARAMS_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('[outlierParams] Erro ao carregar histórico:', error);
  }
  return [];
}

/**
 * Restaura uma versão específica do histórico
 */
export function restoreVersion(version: string): OutlierParamsConfig | null {
  const history = loadHistory();
  const found = history.find(p => p.version === version);
  if (found) {
    const restored = {
      ...found,
      isActive: true,
      updatedAt: new Date().toISOString(),
    };
    saveParams(restored);
    return restored;
  }
  return null;
}

/**
 * Reseta para os parâmetros padrão
 */
export function resetToDefaults(): OutlierParamsConfig {
  const defaultCopy = {
    ...DEFAULT_PARAMS,
    updatedAt: new Date().toISOString(),
  };
  saveParams(defaultCopy);
  return defaultCopy;
}

// ============================================
// SINGLETON PARA ACESSO GLOBAL
// ============================================

let activeParams: OutlierParamsConfig | null = null;

/**
 * Obtém os parâmetros ativos (singleton)
 * TODAS as funções do app devem usar este método
 */
export function getActiveParams(): OutlierParamsConfig {
  if (!activeParams) {
    activeParams = loadParams();
  }
  return activeParams;
}

/**
 * Atualiza os parâmetros ativos
 */
export function setActiveParams(params: OutlierParamsConfig): void {
  saveParams(params);
  activeParams = params;
}

/**
 * Força recarga dos parâmetros
 */
export function reloadParams(): OutlierParamsConfig {
  activeParams = loadParams();
  return activeParams;
}

// ============================================
// HELPERS COM FALLBACK
// ============================================

/**
 * Obtém um valor numérico com fallback seguro
 * Nunca retorna NaN ou undefined
 */
export function getNumericParam<T extends number>(
  value: T | undefined | null,
  fallback: T,
  logKey?: string
): T {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (logKey) {
    console.warn(`[outlierParams] Usando fallback para ${logKey}: ${fallback}`);
  }
  return fallback;
}

/**
 * Obtém multiplicador de nível com fallback
 */
export function getLevelMultiplier(level: AthleteLevel): number {
  const params = getActiveParams();
  return getNumericParam(
    params.estimation.levelMultipliers[level],
    1.0,
    `levelMultiplier.${level}`
  );
}

/**
 * Obtém fator de tipo de WOD com fallback
 */
export function getWodTypeFactor(wodType: WodType | 'default'): WodTypeEstimationConfig {
  const params = getActiveParams();
  const factor = params.estimation.wodTypeFactors[wodType] || params.estimation.wodTypeFactors.default;
  return factor || { baseMinutes: 15, variancePercent: 0.18 };
}

/**
 * Obtém kcal base por modalidade com fallback
 */
export function getModalityKcal(modality: string): number {
  const params = getActiveParams();
  const met = params.exerciseMets.metBaseByModality[modality as keyof typeof params.exerciseMets.metBaseByModality];
  return met?.baseKcalPerMin ?? params.exerciseMets.fallbackKcalPerMin;
}

/**
 * Obtém fator de intensidade (PSE) com fallback
 */
export function getIntensityFactor(pse: number): number {
  const params = getActiveParams();
  const clampedPse = Math.min(10, Math.max(1, Math.round(pse)));
  return getNumericParam(
    params.exerciseMets.intensityMultipliers[clampedPse],
    1.0,
    `intensityFactor.${clampedPse}`
  );
}

/**
 * Obtém threshold de nível para progressão
 */
export function getLevelThreshold(level: AthleteLevel): number {
  const params = getActiveParams();
  return getNumericParam(
    params.progression.levelThresholds[level],
    50,
    `levelThreshold.${level}`
  );
}

/**
 * Obtém score de bucket para classificação
 */
export function getBucketScore(bucket: string): number {
  const params = getActiveParams();
  const bucketLower = bucket.toLowerCase() as keyof ScoringBucketConfig;
  return getNumericParam(
    params.benchmark.scoringBuckets[bucketLower],
    65,
    `bucketScore.${bucket}`
  );
}

/**
 * Obtém velocidade por nível para estimativa de distância
 */
export function getLevelSpeedKmh(level: AthleteLevel): number {
  const params = getActiveParams();
  return getNumericParam(
    params.exerciseMets.levelSpeedKmh[level],
    10.0,
    `levelSpeed.${level}`
  );
}

// ============================================
// VALIDAÇÃO
// ============================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida uma configuração de parâmetros
 */
export function validateParams(params: Partial<OutlierParamsConfig>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar versão
  if (!params.version) {
    errors.push('Versão é obrigatória');
  }

  // Validar benchmark
  if (params.benchmark) {
    const b = params.benchmark;
    if (b.scoringBuckets) {
      if (b.scoringBuckets.elite <= b.scoringBuckets.strong) {
        errors.push('Score ELITE deve ser maior que STRONG');
      }
      if (b.scoringBuckets.strong <= b.scoringBuckets.ok) {
        errors.push('Score STRONG deve ser maior que OK');
      }
    }
  }

  // Validar estimation
  if (params.estimation) {
    const e = params.estimation;
    if (e.levelMultipliers) {
      for (const [level, mult] of Object.entries(e.levelMultipliers)) {
        if (mult <= 0) {
          errors.push(`Multiplicador de ${level} deve ser positivo`);
        }
      }
    }
  }

  // Validar progression
  if (params.progression) {
    const p = params.progression;
    if (p.levelThresholds) {
      const thresholds = Object.values(p.levelThresholds);
      for (let i = 1; i < thresholds.length; i++) {
        if (thresholds[i] <= thresholds[i - 1]) {
          warnings.push('Thresholds de nível devem ser crescentes');
          break;
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
