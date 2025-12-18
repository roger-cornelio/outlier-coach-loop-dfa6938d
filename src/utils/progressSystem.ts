import type { AthleteLevel } from '@/types/outlier';
import type { BenchmarkResult } from '@/hooks/useBenchmarkResults';

// Level thresholds for progression (score required to advance)
export const LEVEL_THRESHOLDS: Record<AthleteLevel, number> = {
  iniciante: 70,
  intermediario: 78,
  avancado: 85,
  hyrox_pro: 100,
};

// Consistency validation constants
export const MIN_STRONG_WEEKS = 2; // Minimum weeks with STRONG+ performance
export const MIN_STRONG_RATIO = 0.7; // 70% of benchmarks must be STRONG+
export const CONSISTENCY_THRESHOLD = 15; // Max standard deviation

// Temporal decay constants
const DECAY_HALF_LIFE_DAYS = 30;
const MIN_WEIGHT = 0.1;

// Benchmark type weights
const BENCHMARK_TYPE_WEIGHTS: Record<string, number> = {
  engine: 1.2,
  chipper: 1.0,
  intervalado: 1.1,
  amrap: 1.0,
  emom: 0.9,
  fortime: 1.1,
  default: 1.0,
};

// Score impacts for buckets
const BUCKET_SCORES: Record<string, number> = {
  ELITE: 100,
  STRONG: 85,
  OK: 65,
  TOUGH: 40,
  DNF: 10,
};

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

// Calculate temporal decay weight
function calculateTemporalWeight(createdAt: string): number {
  const now = new Date();
  const created = new Date(createdAt);
  const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  const weight = Math.pow(0.5, daysDiff / DECAY_HALF_LIFE_DAYS);
  return Math.max(MIN_WEIGHT, weight);
}

// Get benchmark type from IDs
function getBenchmarkType(result: BenchmarkResult): string {
  const id = (result.workout_id + result.block_id).toLowerCase();
  for (const type of Object.keys(BENCHMARK_TYPE_WEIGHTS)) {
    if (id.includes(type)) return type;
  }
  return 'default';
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
    const score = result.score ?? BUCKET_SCORES[result.bucket || 'OK'] ?? 65;
    const temporalWeight = calculateTemporalWeight(result.created_at);
    const typeWeight = BENCHMARK_TYPE_WEIGHTS[getBenchmarkType(result)] || 1.0;
    const combinedWeight = temporalWeight * typeWeight;

    weightedSum += score * combinedWeight;
    totalWeight += combinedWeight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
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

// Get next level
function getNextLevel(current: AthleteLevel): AthleteLevel | null {
  const order: AthleteLevel[] = ['iniciante', 'intermediario', 'avancado', 'hyrox_pro'];
  const currentIndex = order.indexOf(current);
  if (currentIndex >= order.length - 1) return null;
  return order[currentIndex + 1];
}

// Main calculation function
export function calculateProgress(
  results: BenchmarkResult[],
  currentLevel: AthleteLevel
): ProgressData {
  const validResults = results.filter(r => r.completed);
  
  // Calculate immediate ruler score
  const rulerScore = calculateRulerScore(validResults);
  
  // Calculate weekly performance for validation
  const weeklyPerformance = calculateWeeklyPerformance(validResults);
  const weeksWithStrongPlus = weeklyPerformance.filter(w => w.ratio >= MIN_STRONG_RATIO).length;
  
  // Calculate overall STRONG+ ratio
  const totalStrong = validResults.filter(r => isStrongPlus(r.bucket)).length;
  const strongPlusRatio = validResults.length > 0 ? totalStrong / validResults.length : 0;
  
  // Consistency metrics
  const standardDeviation = calculateStandardDeviation(validResults);
  const consistencyScore = calculateConsistencyScore(standardDeviation);
  const isConsistent = standardDeviation <= CONSISTENCY_THRESHOLD;
  
  // Level info
  const nextLevel = getNextLevel(currentLevel);
  const currentThreshold = LEVEL_THRESHOLDS[currentLevel];
  
  // Validation checks
  const meetsThreshold = rulerScore >= currentThreshold;
  const meetsConsistency = isConsistent;
  const meetsWeeklyStrong = weeksWithStrongPlus >= MIN_STRONG_WEEKS && strongPlusRatio >= MIN_STRONG_RATIO;
  
  // Determine blocking reason
  let blockingReason: 'threshold' | 'consistency' | 'weekly_validation' | null = null;
  if (!meetsThreshold) blockingReason = 'threshold';
  else if (!meetsConsistency) blockingReason = 'consistency';
  else if (!meetsWeeklyStrong) blockingReason = 'weekly_validation';
  
  // Ready to advance only if ALL conditions met
  const isReadyToAdvance = meetsThreshold && meetsConsistency && meetsWeeklyStrong && nextLevel !== null;
  
  // Progress percentage (ruler position)
  const progressToNextLevel = Math.min(100, (rulerScore / currentThreshold) * 100);
  
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
  return score.toFixed(1);
}

// Get color class based on score
export function getScoreColor(score: number): string {
  if (score >= 85) return 'text-amber-500';
  if (score >= 70) return 'text-green-500';
  if (score >= 50) return 'text-blue-500';
  if (score >= 30) return 'text-orange-500';
  return 'text-red-500';
}

// Get progress bar gradient based on score
export function getProgressGradient(score: number): string {
  if (score >= 85) return 'from-amber-500 to-yellow-400';
  if (score >= 70) return 'from-green-500 to-emerald-400';
  if (score >= 50) return 'from-blue-500 to-cyan-400';
  if (score >= 30) return 'from-orange-500 to-amber-400';
  return 'from-red-500 to-orange-400';
}
