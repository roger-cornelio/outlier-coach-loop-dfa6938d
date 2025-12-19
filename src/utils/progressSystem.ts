import type { AthleteLevel } from '@/types/outlier';
import type { BenchmarkResult } from '@/hooks/useBenchmarkResults';
import { 
  getActiveParams, 
  getLevelThreshold, 
  getBucketScore,
  getNumericParam 
} from '@/config/outlierParams';

/**
 * SISTEMA DE PROGRESSÃO DE ATLETAS
 * 
 * Todos os parâmetros vêm do config central (outlierParams)
 */

export interface WeeklyPerformance {
  week: string;
  strongPlusCount: number;
  totalCount: number;
  ratio: number;
}

export interface ProgressData {
  // Immediate ruler score (0-100)
  rulerScore: number;
  // Validation metrics for level advancement
  levelValidation: {
    meetsThreshold: boolean;
    meetsConsistency: boolean;
    meetsWeeklyStrong: boolean;
    weeksWithStrongPlus: number;
    strongPlusRatio: number;
  };
  // Computed states
  isReadyToAdvance: boolean;
  blockingReason: 'threshold' | 'consistency' | 'weekly_validation' | null;
  // Level info
  currentLevel: AthleteLevel;
  nextLevel: AthleteLevel | null;
  currentThreshold: number;
  progressToNextLevel: number;
  // Stats
  consistencyScore: number;
  standardDeviation: number;
  recentTrend: 'improving' | 'stable' | 'declining';
  benchmarksUsed: number;
  weeklyPerformance: WeeklyPerformance[];
}

// Calculate temporal decay weight using config
function calculateTemporalWeight(createdAt: string): number {
  const params = getActiveParams();
  const decay = params.progression.temporalDecay;
  
  const halfLifeDays = getNumericParam(decay.halfLifeDays, 30, 'temporalDecay.halfLife');
  const minWeight = getNumericParam(decay.minWeight, 0.1, 'temporalDecay.minWeight');
  
  const now = new Date();
  const created = new Date(createdAt);
  const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  const weight = Math.pow(0.5, daysDiff / halfLifeDays);
  return Math.max(minWeight, weight);
}

// Get benchmark type from IDs using config
function getBenchmarkType(result: BenchmarkResult): string {
  const params = getActiveParams();
  const weights = params.progression.benchmarkTypeWeights;
  
  const id = (result.workout_id + result.block_id).toLowerCase();
  for (const type of Object.keys(weights)) {
    if (id.includes(type)) return type;
  }
  return 'default';
}

// Get benchmark type weight from config
function getBenchmarkTypeWeight(type: string): number {
  const params = getActiveParams();
  return getNumericParam(
    params.progression.benchmarkTypeWeights[type],
    1.0,
    `benchmarkTypeWeight.${type}`
  );
}

// Check if bucket is STRONG or better
function isStrongPlus(bucket: string | null | undefined): boolean {
  return bucket === 'ELITE' || bucket === 'STRONG';
}

// Calculate ruler score with immediate impact from benchmarks
function calculateRulerScore(results: BenchmarkResult[]): number {
  if (results.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const result of results) {
    const score = result.score ?? getBucketScore(result.bucket || 'OK');
    const temporalWeight = calculateTemporalWeight(result.created_at);
    const typeWeight = getBenchmarkTypeWeight(getBenchmarkType(result));
    const combinedWeight = temporalWeight * typeWeight;

    weightedSum += score * combinedWeight;
    totalWeight += combinedWeight;
  }

  const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  
  // Garantir que nunca retorne NaN
  if (isNaN(finalScore)) {
    console.warn('[progressSystem] Cálculo de rulerScore resultou em NaN');
    return 0;
  }
  
  return finalScore;
}

// Calculate weekly performance for validation
function calculateWeeklyPerformance(results: BenchmarkResult[]): WeeklyPerformance[] {
  const weekMap = new Map<string, { strong: number; total: number }>();
  
  for (const result of results) {
    const date = new Date(result.created_at);
    // Get week start (Monday)
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1);
    const weekKey = weekStart.toISOString().split('T')[0];
    
    const week = weekMap.get(weekKey) || { strong: 0, total: 0 };
    week.total++;
    if (isStrongPlus(result.bucket)) {
      week.strong++;
    }
    weekMap.set(weekKey, week);
  }

  return Array.from(weekMap.entries())
    .map(([week, data]) => ({
      week,
      strongPlusCount: data.strong,
      totalCount: data.total,
      ratio: data.total > 0 ? data.strong / data.total : 0,
    }))
    .sort((a, b) => b.week.localeCompare(a.week));
}

// Calculate standard deviation
function calculateStandardDeviation(results: BenchmarkResult[]): number {
  const scores = results
    .filter(r => r.score !== null && r.score !== undefined)
    .map(r => Number(r.score));

  if (scores.length < 2) return 0;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;

  return Math.sqrt(avgSquaredDiff);
}

// Calculate consistency score (0-100)
function calculateConsistencyScore(stdDev: number): number {
  const maxStdDev = 30;
  return Math.max(0, 100 - (stdDev / maxStdDev) * 100);
}

// Determine recent trend
function calculateTrend(results: BenchmarkResult[]): 'improving' | 'stable' | 'declining' {
  const recentResults = results
    .filter(r => r.score !== null && r.score !== undefined)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (recentResults.length < 3) return 'stable';

  const scores = recentResults.map(r => Number(r.score));
  const midpoint = Math.floor(scores.length / 2);
  const recentAvg = scores.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
  const olderAvg = scores.slice(midpoint).reduce((a, b) => a + b, 0) / (scores.length - midpoint);

  const diff = recentAvg - olderAvg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

// Get next level from config
function getNextLevel(current: AthleteLevel): AthleteLevel | null {
  const params = getActiveParams();
  const order = params.labels.athleteLevels;
  const currentIndex = order.indexOf(current);
  if (currentIndex >= order.length - 1) return null;
  return order[currentIndex + 1] as AthleteLevel;
}

// Main calculation function
export function calculateProgress(
  results: BenchmarkResult[],
  currentLevel: AthleteLevel
): ProgressData {
  const params = getActiveParams();
  const consistency = params.progression.consistencyValidation;
  
  const validResults = results.filter(r => r.completed);
  
  // Calculate immediate ruler score
  const rulerScore = calculateRulerScore(validResults);
  
  // Calculate weekly performance for validation
  const weeklyPerformance = calculateWeeklyPerformance(validResults);
  
  // Get validation constants from config
  const minStrongWeeks = getNumericParam(consistency.minStrongWeeks, 2, 'minStrongWeeks');
  const minStrongRatio = getNumericParam(consistency.minStrongRatio, 0.7, 'minStrongRatio');
  const consistencyThreshold = getNumericParam(consistency.consistencyThreshold, 15, 'consistencyThreshold');
  
  const weeksWithStrongPlus = weeklyPerformance.filter(w => w.ratio >= minStrongRatio).length;
  
  // Calculate overall STRONG+ ratio
  const totalStrong = validResults.filter(r => isStrongPlus(r.bucket)).length;
  const strongPlusRatio = validResults.length > 0 ? totalStrong / validResults.length : 0;
  
  // Consistency metrics
  const standardDeviation = calculateStandardDeviation(validResults);
  const consistencyScore = calculateConsistencyScore(standardDeviation);
  const isConsistent = standardDeviation <= consistencyThreshold;
  
  // Level info from config
  const nextLevel = getNextLevel(currentLevel);
  const currentThreshold = getLevelThreshold(currentLevel);
  
  // Validation checks
  const meetsThreshold = rulerScore >= currentThreshold;
  const meetsConsistency = isConsistent;
  const meetsWeeklyStrong = weeksWithStrongPlus >= minStrongWeeks && strongPlusRatio >= minStrongRatio;
  
  // Determine blocking reason
  let blockingReason: 'threshold' | 'consistency' | 'weekly_validation' | null = null;
  if (!meetsThreshold) blockingReason = 'threshold';
  else if (!meetsConsistency) blockingReason = 'consistency';
  else if (!meetsWeeklyStrong) blockingReason = 'weekly_validation';
  
  // Ready to advance only if ALL conditions met
  const isReadyToAdvance = meetsThreshold && meetsConsistency && meetsWeeklyStrong && nextLevel !== null;
  
  // Progress percentage (ruler position)
  const progressToNextLevel = currentThreshold > 0 
    ? Math.min(100, (rulerScore / currentThreshold) * 100)
    : 0;
  
  return {
    rulerScore: Math.round(rulerScore * 10) / 10,
    levelValidation: {
      meetsThreshold,
      meetsConsistency,
      meetsWeeklyStrong,
      weeksWithStrongPlus,
      strongPlusRatio: Math.round(strongPlusRatio * 100),
    },
    isReadyToAdvance,
    blockingReason,
    currentLevel,
    nextLevel,
    currentThreshold,
    progressToNextLevel: Math.round(progressToNextLevel * 10) / 10,
    consistencyScore: Math.round(consistencyScore * 10) / 10,
    standardDeviation: Math.round(standardDeviation * 10) / 10,
    recentTrend: calculateTrend(validResults),
    benchmarksUsed: validResults.length,
    weeklyPerformance,
  };
}

// Format score for display
export function formatScore(score: number): string {
  if (isNaN(score)) return '0.0';
  return score.toFixed(1);
}

// Get color class based on score using config bucket thresholds
export function getScoreColor(score: number): string {
  const params = getActiveParams();
  const buckets = params.benchmark.scoringBuckets;
  
  if (score >= buckets.strong) return 'text-amber-500';
  if (score >= buckets.ok) return 'text-green-500';
  if (score >= buckets.tough) return 'text-blue-500';
  if (score >= buckets.dnf) return 'text-orange-500';
  return 'text-red-500';
}

// Get progress bar gradient based on score
export function getProgressGradient(score: number): string {
  const params = getActiveParams();
  const buckets = params.benchmark.scoringBuckets;
  
  if (score >= buckets.strong) return 'from-amber-500 to-yellow-400';
  if (score >= buckets.ok) return 'from-green-500 to-emerald-400';
  if (score >= buckets.tough) return 'from-blue-500 to-cyan-400';
  if (score >= buckets.dnf) return 'from-orange-500 to-amber-400';
  return 'from-red-500 to-orange-400';
}

// Export level thresholds getter for backward compatibility
export function getLevelThresholds(): Record<AthleteLevel, number> {
  const params = getActiveParams();
  return params.progression.levelThresholds as Record<AthleteLevel, number>;
}

// Export constants for backward compatibility
export const LEVEL_THRESHOLDS = getLevelThresholds();
export const MIN_STRONG_WEEKS = getActiveParams().progression.consistencyValidation.minStrongWeeks;
export const MIN_STRONG_RATIO = getActiveParams().progression.consistencyValidation.minStrongRatio;
export const CONSISTENCY_THRESHOLD = getActiveParams().progression.consistencyValidation.consistencyThreshold;
