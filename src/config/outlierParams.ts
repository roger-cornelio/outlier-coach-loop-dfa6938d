/**
 * OUTLIER PARAMS - SINGLE SOURCE OF TRUTH
 * 
 * Todos os parâmetros numéricos e regras de ajuste do sistema
 * estão centralizados neste arquivo.
 * 
 * REGRAS:
 * - Nenhuma função do app deve ter números hardcoded
 * - Todas as funções devem importar e usar getActiveParams()
 * - Versionamento permite atualizar sem quebrar histórico
 * 
 * NOTA: Cálculo de Kcal agora usa motor de física (movement_patterns table).
 * Os METs aqui servem APENAS como fallback para estimativa de tempo por bloco.
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
  open: TargetTimeRangeConfig;
  pro: TargetTimeRangeConfig;
  elite: TargetTimeRangeConfig;
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
  bucketThresholds: {
    elitePercent: number;
    strongPercent: number;
    okPercent: number;
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
  formatMultipliers: {
    for_time: number;
    amrap: number;
    emom: number;
    chipper: number;
    interval: number;
  };
  minEstimateSeconds: number;
  maxEstimateSeconds: number;
}

/**
 * Configuração simplificada de METs por modalidade de bloco.
 * Usado APENAS para estimativa de tempo em benchmarkTimeGenerator.
 * Cálculo de Kcal real usa o motor de física (movement_patterns).
 */
export interface BlockMetConfig {
  baseKcalPerMin: number;
  description?: string;
}

export interface ExerciseMetsConfig {
  metBaseByModality: {
    aquecimento: BlockMetConfig;
    conditioning: BlockMetConfig;
    forca: BlockMetConfig;
    especifico: BlockMetConfig;
    core: BlockMetConfig;
    corrida: BlockMetConfig;
    notas: BlockMetConfig;
  };
  /** Fator de corrida: kcal = peso_kg * km * fator (usado em workoutCalculations) */
  runningKcalFactor: number;
  /** Velocidade por nível para estimativa de distância */
  levelSpeedKmh: {
    [K in AthleteLevel]: number;
  };
  /** Fallback quando modalidade não é identificada */
  fallbackKcalPerMin: number;
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
    consistencyThreshold: number;
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
  labels: LabelsConfig;
  progression: ProgressionConfig;
}

// ============================================
// CONFIGURAÇÃO PADRÃO v2
// ============================================

export const DEFAULT_PARAMS: OutlierParamsConfig = {
  version: 'v2',
  isActive: true,
  updatedAt: new Date().toISOString(),
  notes: 'v2 — Removido adaptation (usa motor obrigatório), removido METs demográficos (usa motor de física)',

  // A) BENCHMARK
  benchmark: {
    enabledOnlyForBenchmark: true,
    defaultTimeRangesByLevel: {
      open: { min: 14 * 60, max: 25 * 60 },
      pro: { min: 12 * 60, max: 18 * 60 },
      elite: { min: 10 * 60, max: 14 * 60 },
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
      elitePercent: 0,
      strongPercent: 50,
      okPercent: 100,
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
      open: 1.25,
      pro: 1.0,
      elite: 0.85,
    },
    defaultSessionCapMinutes: 60,
    formatMultipliers: {
      for_time: 1.0,
      amrap: 1.0,
      emom: 1.0,
      chipper: 1.2,
      interval: 1.0,
    },
    minEstimateSeconds: 300,
    maxEstimateSeconds: 7200,
  },

  // C) EXERCISE METS (fallback para estimativa de tempo por tipo de bloco)
  // Kcal real agora é calculada pelo motor de física (movement_patterns + energyCalculator)
  exerciseMets: {
    metBaseByModality: {
      aquecimento: { baseKcalPerMin: 6.0, description: '~360 kcal/h (MET ~5.0)' },
      conditioning: { baseKcalPerMin: 13.0, description: '~780 kcal/h (MET ~10.5)' },
      forca: { baseKcalPerMin: 9.0, description: '~540 kcal/h (MET ~6.5)' },
      especifico: { baseKcalPerMin: 15.0, description: '~900 kcal/h (MET ~12.0 HYROX)' },
      core: { baseKcalPerMin: 6.0, description: '~360 kcal/h (MET ~5.0)' },
      corrida: { baseKcalPerMin: 12.0, description: '~720 kcal/h (MET ~10.0)' },
      notas: { baseKcalPerMin: 0, description: 'Sem gasto calórico' },
    },
    runningKcalFactor: 1.0,
    levelSpeedKmh: {
      open: 9.0,
      pro: 12.0,
      elite: 14.0,
    },
    fallbackKcalPerMin: 10.0,
  },

  // D) LABELS E NÍVEIS
  labels: {
    athleteLevels: ['open', 'pro', 'elite'],
    wodTypes: ['engine', 'strength', 'skill', 'mixed', 'hyrox', 'benchmark'],
    wodFormats: ['for_time', 'amrap', 'emom', 'chipper', 'interval'],
    modalityTags: ['engine', 'strength', 'mixed', 'skill', 'hyrox'],
    performanceBuckets: ['ELITE', 'STRONG', 'OK', 'TOUGH', 'DNF'],
  },

  // E) PROGRESSION (sistema de evolução)
  progression: {
    levelThresholds: {
      open: 40,
      pro: 70,
      elite: 90,
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

export function loadParams(): OutlierParamsConfig {
  try {
    const stored = localStorage.getItem(PARAMS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return mergeWithDefaults(parsed);
    }
  } catch (error) {
    console.warn('[outlierParams] Erro ao carregar params, usando defaults:', error);
  }
  return { ...DEFAULT_PARAMS };
}

function mergeWithDefaults(saved: Partial<OutlierParamsConfig>): OutlierParamsConfig {
  // Strip removed sections from old saved data
  const { adaptation, ...cleanSaved } = saved as any;

  // Strip removed exerciseMets sub-keys
  if (cleanSaved.exerciseMets) {
    const { intensityMultipliers, weightFactorRules, ageFactorRules, sexFactorRules, ...cleanMets } = cleanSaved.exerciseMets;
    
    // Strip removed modality keys from metBaseByModality
    if (cleanMets.metBaseByModality) {
      const { running, rowing, bike, skierg, weightlifting, gymnastics, sled, ...cleanModalities } = cleanMets.metBaseByModality;
      cleanMets.metBaseByModality = { ...DEFAULT_PARAMS.exerciseMets.metBaseByModality, ...cleanModalities };
    }
    
    cleanSaved.exerciseMets = { ...DEFAULT_PARAMS.exerciseMets, ...cleanMets };
  }

  return {
    ...DEFAULT_PARAMS,
    ...cleanSaved,
    benchmark: { ...DEFAULT_PARAMS.benchmark, ...cleanSaved.benchmark },
    estimation: { ...DEFAULT_PARAMS.estimation, ...cleanSaved.estimation },
    exerciseMets: cleanSaved.exerciseMets || DEFAULT_PARAMS.exerciseMets,
    labels: { ...DEFAULT_PARAMS.labels, ...cleanSaved.labels },
    progression: { ...DEFAULT_PARAMS.progression, ...cleanSaved.progression },
  };
}

export function saveParams(params: OutlierParamsConfig): void {
  try {
    const newParams: OutlierParamsConfig = {
      ...params,
      updatedAt: new Date().toISOString(),
      isActive: true,
    };
    
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

function saveToHistory(params: OutlierParamsConfig): void {
  try {
    const history = loadHistory();
    history.push({
      ...params,
      isActive: false,
    });
    if (history.length > 10) {
      history.shift();
    }
    localStorage.setItem(PARAMS_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('[outlierParams] Erro ao salvar histórico:', error);
  }
}

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

export function getActiveParams(): OutlierParamsConfig {
  if (!activeParams) {
    activeParams = loadParams();
  }
  return activeParams;
}

export function setActiveParams(params: OutlierParamsConfig): void {
  saveParams(params);
  activeParams = params;
}

export function reloadParams(): OutlierParamsConfig {
  activeParams = loadParams();
  return activeParams;
}

export function getParamsForVersion(version: string): OutlierParamsConfig | null {
  const active = getActiveParams();
  if (active.version === version) {
    return active;
  }
  const history = loadHistory();
  const found = history.find(p => p.version === version);
  return found || null;
}

export function getParamsForWod(wod: { isBenchmark?: boolean; paramsVersionUsed?: string }): OutlierParamsConfig {
  if (wod.isBenchmark && wod.paramsVersionUsed) {
    const versionParams = getParamsForVersion(wod.paramsVersionUsed);
    if (versionParams) {
      return versionParams;
    }
    console.warn(`[outlierParams] Versão ${wod.paramsVersionUsed} não encontrada no histórico, usando params ativos`);
  }
  return getActiveParams();
}

// ============================================
// HELPERS COM FALLBACK
// ============================================

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

export function getLevelMultiplier(level: AthleteLevel): number {
  const params = getActiveParams();
  return getNumericParam(
    params.estimation.levelMultipliers[level],
    1.0,
    `levelMultiplier.${level}`
  );
}

export function getWodTypeFactor(wodType: WodType | 'default'): WodTypeEstimationConfig {
  const params = getActiveParams();
  const factor = params.estimation.wodTypeFactors[wodType] || params.estimation.wodTypeFactors.default;
  return factor || { baseMinutes: 15, variancePercent: 0.18 };
}

export function getLevelThreshold(level: AthleteLevel): number {
  const params = getActiveParams();
  return getNumericParam(
    params.progression.levelThresholds[level],
    50,
    `levelThreshold.${level}`
  );
}

export function getBucketScore(bucket: string): number {
  const params = getActiveParams();
  const bucketLower = bucket.toLowerCase() as keyof ScoringBucketConfig;
  return getNumericParam(
    params.benchmark.scoringBuckets[bucketLower],
    65,
    `bucketScore.${bucket}`
  );
}

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

export function validateParams(params: Partial<OutlierParamsConfig>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!params.version) {
    errors.push('Versão é obrigatória');
  }

  if (!params.benchmark) {
    errors.push('Seção "benchmark" é obrigatória');
  }
  if (!params.estimation) {
    errors.push('Seção "estimation" é obrigatória');
  }
  if (!params.exerciseMets) {
    errors.push('Seção "exerciseMets" é obrigatória');
  }
  if (!params.labels) {
    errors.push('Seção "labels" é obrigatória');
  }

  if (params.benchmark) {
    const b = params.benchmark;
    
    if (b.defaultTimeRangesByLevel) {
      const levels = ['open', 'pro', 'elite'] as const;
      for (const level of levels) {
        const range = b.defaultTimeRangesByLevel[level];
        if (range) {
          if (typeof range.min !== 'number' || isNaN(range.min) || range.min < 0) {
            errors.push(`benchmark.timeRangesByLevel.${level}.min inválido`);
          }
          if (typeof range.max !== 'number' || isNaN(range.max) || range.max < 0) {
            errors.push(`benchmark.timeRangesByLevel.${level}.max inválido`);
          }
          if (range.min > range.max) {
            errors.push(`benchmark.timeRangesByLevel.${level}: min deve ser <= max`);
          }
        }
      }
    }
    
    if (b.scoringBuckets) {
      if (b.scoringBuckets.elite <= b.scoringBuckets.strong) {
        errors.push('Score ELITE deve ser maior que STRONG');
      }
      if (b.scoringBuckets.strong <= b.scoringBuckets.ok) {
        errors.push('Score STRONG deve ser maior que OK');
      }
      if (b.scoringBuckets.ok <= b.scoringBuckets.tough) {
        errors.push('Score OK deve ser maior que TOUGH');
      }
      for (const [key, val] of Object.entries(b.scoringBuckets)) {
        if (typeof val !== 'number' || val < 0) {
          errors.push(`scoringBuckets.${key} deve ser número >= 0`);
        }
      }
    }
  }

  if (params.estimation) {
    const e = params.estimation;
    
    if (e.levelMultipliers) {
      for (const [level, mult] of Object.entries(e.levelMultipliers)) {
        if (typeof mult !== 'number' || isNaN(mult)) {
          errors.push(`levelMultipliers.${level} deve ser número`);
        } else if (mult <= 0) {
          errors.push(`levelMultipliers.${level} deve ser positivo`);
        } else if (mult > 3) {
          warnings.push(`levelMultipliers.${level} = ${mult} parece muito alto`);
        }
      }
    }
    
    if (e.wodTypeFactors) {
      for (const [type, factor] of Object.entries(e.wodTypeFactors)) {
        if (factor) {
          if (typeof factor.baseMinutes !== 'number' || factor.baseMinutes <= 0) {
            errors.push(`wodTypeFactors.${type}.baseMinutes deve ser positivo`);
          }
          if (typeof factor.variancePercent !== 'number' || factor.variancePercent < 0 || factor.variancePercent > 1) {
            warnings.push(`wodTypeFactors.${type}.variancePercent deve estar entre 0 e 1`);
          }
        }
      }
    }
    
    if (e.minEstimateSeconds !== undefined && e.maxEstimateSeconds !== undefined) {
      if (e.minEstimateSeconds >= e.maxEstimateSeconds) {
        errors.push('minEstimateSeconds deve ser menor que maxEstimateSeconds');
      }
    }
  }

  if (params.exerciseMets) {
    const m = params.exerciseMets;
    
    if (m.metBaseByModality) {
      for (const [mod, met] of Object.entries(m.metBaseByModality)) {
        if (met && (typeof met.baseKcalPerMin !== 'number' || met.baseKcalPerMin < 0)) {
          errors.push(`mets.${mod}.baseKcalPerMin deve ser número >= 0`);
        }
      }
    }
    
    if (m.fallbackKcalPerMin !== undefined && m.fallbackKcalPerMin < 0) {
      errors.push('fallbackKcalPerMin deve ser >= 0');
    }
  }

  if (params.progression) {
    const p = params.progression;
    if (p.levelThresholds) {
      const levels = ['open', 'pro', 'elite'] as const;
      let prevThreshold = -Infinity;
      for (const level of levels) {
        const threshold = p.levelThresholds[level];
        if (threshold !== undefined) {
          if (threshold <= prevThreshold) {
            warnings.push(`Thresholds de nível devem ser crescentes (${level}: ${threshold})`);
          }
          prevThreshold = threshold;
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
