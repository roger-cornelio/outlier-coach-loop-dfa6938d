/**
 * OUTLIER PARAMS - CACHE LAYER FOR SYSTEM PARAMS
 * 
 * This file provides synchronous access to system parameters
 * that are stored in the database (system_params table).
 * 
 * ARCHITECTURE:
 * - Source of truth: system_params table (DB)
 * - This file: localStorage cache + fallback defaults
 * - Sync: useParamsSync hook fetches DB → writes to cache on app load
 * 
 * DOMÍNIOS:
 * - Benchmark: Scoring buckets, faixas de tempo por nível
 * - Estimation: Multiplicadores de nível, fatores por tipo de WOD
 * - Progression: Thresholds de evolução, temporal decay
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
  elite: number;
  strong: number;
  ok: number;
  tough: number;
  dnf: number;
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
  levelSpeedKmh: {
    [K in AthleteLevel]: number;
  };
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
  labels: LabelsConfig;
  progression: ProgressionConfig;
}

// ============================================
// DEFAULTS (fallback when DB is unreachable)
// ============================================

export const DEFAULT_PARAMS: OutlierParamsConfig = {
  version: 'v3-db',
  isActive: true,
  updatedAt: new Date().toISOString(),
  notes: 'Fallback defaults — real values come from database',

  benchmark: {
    enabledOnlyForBenchmark: true,
    defaultTimeRangesByLevel: {
      open: { min: 14 * 60, max: 25 * 60 },
      pro: { min: 12 * 60, max: 18 * 60 },
      elite: { min: 10 * 60, max: 14 * 60 },
    },
    scoringBuckets: { elite: 100, strong: 85, ok: 65, tough: 40, dnf: 10 },
    allowCoachOverride: true,
    coachOverridePriority: 'coach_wins',
    bucketThresholds: { elitePercent: 0, strongPercent: 50, okPercent: 100 },
  },

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
    levelMultipliers: { open: 1.25, pro: 1.0, elite: 0.85 },
    defaultSessionCapMinutes: 60,
    formatMultipliers: { for_time: 1.0, amrap: 1.0, emom: 1.0, chipper: 1.2, interval: 1.0 },
    minEstimateSeconds: 300,
    maxEstimateSeconds: 7200,
    levelSpeedKmh: { open: 9.0, pro: 12.0, elite: 14.0 },
  },

  labels: {
    athleteLevels: ['open', 'pro', 'elite'],
    wodTypes: ['engine', 'strength', 'skill', 'mixed', 'hyrox', 'benchmark'],
    wodFormats: ['for_time', 'amrap', 'emom', 'chipper', 'interval'],
    modalityTags: ['engine', 'strength', 'mixed', 'skill', 'hyrox'],
    performanceBuckets: ['ELITE', 'STRONG', 'OK', 'TOUGH', 'DNF'],
  },

  progression: {
    levelThresholds: { open: 40, pro: 70, elite: 90 },
    consistencyValidation: { minStrongWeeks: 2, minStrongRatio: 0.7, consistencyThreshold: 15 },
    temporalDecay: { halfLifeDays: 30, minWeight: 0.1 },
    benchmarkTypeWeights: {
      engine: 1.2, chipper: 1.0, intervalado: 1.1,
      amrap: 1.0, emom: 0.9, fortime: 1.1, default: 1.0,
    },
  },
};

// ============================================
// CACHE (localStorage-backed)
// ============================================

const PARAMS_CACHE_KEY = 'outlier-params-db-cache';

/**
 * Write DB params to local cache. Called by useParamsSync.
 */
export function writeParamsCache(dbParams: Record<string, any>): OutlierParamsConfig {
  const config = buildConfigFromDbParams(dbParams);
  try {
    localStorage.setItem(PARAMS_CACHE_KEY, JSON.stringify(config));
    activeParams = config;
    console.log('[outlierParams] Cache updated from DB');
  } catch (e) {
    console.warn('[outlierParams] Failed to write cache:', e);
  }
  return config;
}

/**
 * Build full config from flat DB key-value map.
 * DB keys are like "benchmark.scoringBuckets" → value is the JSON object.
 */
function buildConfigFromDbParams(dbParams: Record<string, any>): OutlierParamsConfig {
  const get = (key: string, fallback: any) => dbParams[key] ?? fallback;

  return {
    version: 'db-live',
    isActive: true,
    updatedAt: new Date().toISOString(),

    benchmark: {
      enabledOnlyForBenchmark: get('benchmark.enabledOnlyForBenchmark', DEFAULT_PARAMS.benchmark.enabledOnlyForBenchmark),
      defaultTimeRangesByLevel: get('benchmark.defaultTimeRangesByLevel', DEFAULT_PARAMS.benchmark.defaultTimeRangesByLevel),
      scoringBuckets: get('benchmark.scoringBuckets', DEFAULT_PARAMS.benchmark.scoringBuckets),
      allowCoachOverride: get('benchmark.allowCoachOverride', DEFAULT_PARAMS.benchmark.allowCoachOverride),
      coachOverridePriority: get('benchmark.coachOverridePriority', DEFAULT_PARAMS.benchmark.coachOverridePriority),
      bucketThresholds: get('benchmark.bucketThresholds', DEFAULT_PARAMS.benchmark.bucketThresholds),
    },

    estimation: {
      enableAthleteTimeEstimate: get('estimation.enableAthleteTimeEstimate', DEFAULT_PARAMS.estimation.enableAthleteTimeEstimate),
      wodTypeFactors: get('estimation.wodTypeFactors', DEFAULT_PARAMS.estimation.wodTypeFactors),
      levelMultipliers: get('estimation.levelMultipliers', DEFAULT_PARAMS.estimation.levelMultipliers),
      defaultSessionCapMinutes: get('estimation.defaultSessionCapMinutes', DEFAULT_PARAMS.estimation.defaultSessionCapMinutes),
      formatMultipliers: get('estimation.formatMultipliers', DEFAULT_PARAMS.estimation.formatMultipliers),
      minEstimateSeconds: get('estimation.minEstimateSeconds', DEFAULT_PARAMS.estimation.minEstimateSeconds),
      maxEstimateSeconds: get('estimation.maxEstimateSeconds', DEFAULT_PARAMS.estimation.maxEstimateSeconds),
      levelSpeedKmh: get('estimation.levelSpeedKmh', DEFAULT_PARAMS.estimation.levelSpeedKmh),
    },

    labels: DEFAULT_PARAMS.labels, // Labels are static, no need for DB

    progression: {
      levelThresholds: get('progression.levelThresholds', DEFAULT_PARAMS.progression.levelThresholds),
      consistencyValidation: get('progression.consistencyValidation', DEFAULT_PARAMS.progression.consistencyValidation),
      temporalDecay: get('progression.temporalDecay', DEFAULT_PARAMS.progression.temporalDecay),
      benchmarkTypeWeights: get('progression.benchmarkTypeWeights', DEFAULT_PARAMS.progression.benchmarkTypeWeights),
    },
  };
}

function loadFromCache(): OutlierParamsConfig {
  try {
    const cached = localStorage.getItem(PARAMS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Ensure all sections exist
      return {
        ...DEFAULT_PARAMS,
        ...parsed,
        benchmark: { ...DEFAULT_PARAMS.benchmark, ...parsed.benchmark },
        estimation: { ...DEFAULT_PARAMS.estimation, ...parsed.estimation },
        labels: DEFAULT_PARAMS.labels,
        progression: { ...DEFAULT_PARAMS.progression, ...parsed.progression },
      };
    }
  } catch (e) {
    console.warn('[outlierParams] Failed to read cache:', e);
  }
  // Also try legacy key
  try {
    const legacy = localStorage.getItem('outlier-params');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const { adaptation, exerciseMets, ...clean } = parsed as any;
      return {
        ...DEFAULT_PARAMS,
        ...clean,
        benchmark: { ...DEFAULT_PARAMS.benchmark, ...clean.benchmark },
        estimation: { ...DEFAULT_PARAMS.estimation, ...clean.estimation },
        labels: DEFAULT_PARAMS.labels,
        progression: { ...DEFAULT_PARAMS.progression, ...clean.progression },
      };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_PARAMS };
}

// ============================================
// SINGLETON
// ============================================

let activeParams: OutlierParamsConfig | null = null;

export function getActiveParams(): OutlierParamsConfig {
  if (!activeParams) {
    activeParams = loadFromCache();
  }
  return activeParams;
}

export function reloadParams(): OutlierParamsConfig {
  activeParams = loadFromCache();
  return activeParams;
}

// Legacy compatibility
export function setActiveParams(params: OutlierParamsConfig): void {
  activeParams = params;
  try {
    localStorage.setItem(PARAMS_CACHE_KEY, JSON.stringify(params));
  } catch {
    // ignore
  }
}

export function loadParams(): OutlierParamsConfig {
  return getActiveParams();
}

export function saveParams(params: OutlierParamsConfig): void {
  setActiveParams(params);
}

export function getParamsForVersion(_version: string): OutlierParamsConfig | null {
  // With DB-backed params, versioning is handled by the DB audit trail
  return getActiveParams();
}

export function getParamsForWod(_wod: { isBenchmark?: boolean; paramsVersionUsed?: string }): OutlierParamsConfig {
  return getActiveParams();
}

export function loadHistory(): OutlierParamsConfig[] {
  return []; // History now lives in DB audit (updated_at, updated_by)
}

export function resetToDefaults(): OutlierParamsConfig {
  setActiveParams({ ...DEFAULT_PARAMS, updatedAt: new Date().toISOString() });
  return getActiveParams();
}

// ============================================
// VALIDATION
// ============================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateParams(params: Partial<OutlierParamsConfig>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (params.benchmark?.scoringBuckets) {
    const b = params.benchmark.scoringBuckets;
    if (b.elite <= b.strong) errors.push('Score ELITE deve ser maior que STRONG');
    if (b.strong <= b.ok) errors.push('Score STRONG deve ser maior que OK');
    if (b.ok <= b.tough) errors.push('Score OK deve ser maior que TOUGH');
  }

  if (params.estimation?.levelMultipliers) {
    for (const [level, mult] of Object.entries(params.estimation.levelMultipliers)) {
      if (typeof mult !== 'number' || mult <= 0) errors.push(`levelMultipliers.${level} deve ser positivo`);
      if (typeof mult === 'number' && mult > 3) warnings.push(`levelMultipliers.${level} = ${mult} parece muito alto`);
    }
  }

  if (params.estimation?.minEstimateSeconds !== undefined && params.estimation?.maxEstimateSeconds !== undefined) {
    if (params.estimation.minEstimateSeconds >= params.estimation.maxEstimateSeconds) {
      errors.push('minEstimateSeconds deve ser menor que maxEstimateSeconds');
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// ============================================
// HELPERS (used by utils that can't use hooks)
// ============================================

export function getNumericParam<T extends number>(
  value: T | undefined | null,
  fallback: T,
  _logKey?: string
): T {
  if (typeof value === 'number' && !isNaN(value)) return value;
  return fallback;
}

export function getLevelMultiplier(level: AthleteLevel): number {
  const params = getActiveParams();
  return getNumericParam(params.estimation.levelMultipliers[level], 1.0);
}

export function getWodTypeFactor(wodType: WodType | 'default'): WodTypeEstimationConfig {
  const params = getActiveParams();
  return params.estimation.wodTypeFactors[wodType] || params.estimation.wodTypeFactors.default || { baseMinutes: 15, variancePercent: 0.18 };
}

export function getLevelThreshold(level: AthleteLevel): number {
  const params = getActiveParams();
  return getNumericParam(params.progression.levelThresholds[level], 50);
}

export function getBucketScore(bucket: string): number {
  const params = getActiveParams();
  const bucketLower = bucket.toLowerCase() as keyof ScoringBucketConfig;
  return getNumericParam(params.benchmark.scoringBuckets[bucketLower], 65);
}

export function getLevelSpeedKmh(level: AthleteLevel): number {
  const params = getActiveParams();
  return getNumericParam(params.estimation.levelSpeedKmh[level], 10.0);
}
