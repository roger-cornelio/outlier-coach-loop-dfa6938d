import type { AthleteLevel } from '@/types/outlier';
import type { BenchmarkResult } from '@/hooks/useBenchmarkResults';

// Level thresholds for progression (score required to advance)
export const LEVEL_THRESHOLDS: Record<AthleteLevel, number> = {
  iniciante: 70,        // Need 70 to advance from iniciante
  intermediario: 78,    // Need 78 to advance from intermediario
  avancado: 85,         // Need 85 to advance from avancado
  hyrox_pro: 100,       // Max level
};

// Minimum consistency required (max allowed standard deviation)
export const CONSISTENCY_THRESHOLD = 15; // Max 15% standard deviation

// Temporal decay constants
const DECAY_HALF_LIFE_DAYS = 30; // Score loses half weight after 30 days
const MIN_WEIGHT = 0.1; // Minimum weight for old benchmarks

// Benchmark type weights for weighted average
const BENCHMARK_TYPE_WEIGHTS: Record<string, number> = {
  engine: 1.2,      // Higher weight for conditioning
  chipper: 1.0,     // Standard weight
  intervalado: 1.1, // Slightly higher for intervals
  amrap: 1.0,
  emom: 0.9,
  fortime: 1.1,
  default: 1.0,
};

export interface ProgressData {
  globalScore: number;           // 0-100 continuous score
  consistencyScore: number;      // 0-100 (100 = very consistent)
  standardDeviation: number;     // Raw std dev
  isConsistent: boolean;         // Meets consistency threshold
  currentLevel: AthleteLevel;
  nextLevel: AthleteLevel | null;
  currentThreshold: number;
  nextThreshold: number | null;
  progressToNextLevel: number;   // 0-100 percentage
  readyToAdvance: boolean;       // Meets both score and consistency
  recentTrend: 'improving' | 'stable' | 'declining';
  benchmarksUsed: number;
  weightedScores: { score: number; weight: number; date: string }[];
}

// Calculate temporal decay weight based on age of benchmark
function calculateTemporalWeight(createdAt: string): number {
  const now = new Date();
  const created = new Date(createdAt);
  const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  
  // Exponential decay: weight = 0.5^(days/halfLife)
  const weight = Math.pow(0.5, daysDiff / DECAY_HALF_LIFE_DAYS);
  return Math.max(MIN_WEIGHT, weight);
}

// Get benchmark type from workout_id or block_id
function getBenchmarkType(result: BenchmarkResult): string {
  const id = (result.workout_id + result.block_id).toLowerCase();
  for (const type of Object.keys(BENCHMARK_TYPE_WEIGHTS)) {
    if (id.includes(type)) return type;
  }
  return 'default';
}

// Calculate weighted average score
function calculateWeightedScore(results: BenchmarkResult[]): { 
  score: number; 
  weights: { score: number; weight: number; date: string }[] 
} {
  if (results.length === 0) return { score: 0, weights: [] };

  const weights: { score: number; weight: number; date: string }[] = [];
  let totalWeight = 0;
  let weightedSum = 0;

  for (const result of results) {
    if (result.score === null || result.score === undefined) continue;

    const temporalWeight = calculateTemporalWeight(result.created_at);
    const typeWeight = BENCHMARK_TYPE_WEIGHTS[getBenchmarkType(result)] || 1.0;
    const combinedWeight = temporalWeight * typeWeight;

    weights.push({
      score: Number(result.score),
      weight: combinedWeight,
      date: result.created_at,
    });

    weightedSum += Number(result.score) * combinedWeight;
    totalWeight += combinedWeight;
  }

  return {
    score: totalWeight > 0 ? weightedSum / totalWeight : 0,
    weights,
  };
}

// Calculate standard deviation of scores
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

// Calculate consistency score (0-100, higher = more consistent)
function calculateConsistencyScore(stdDev: number): number {
  // Convert std dev to a 0-100 score where lower std dev = higher score
  // stdDev of 0 = 100, stdDev of 30+ = 0
  const maxStdDev = 30;
  const consistencyScore = Math.max(0, 100 - (stdDev / maxStdDev) * 100);
  return consistencyScore;
}

// Determine recent trend from last benchmarks
function calculateTrend(results: BenchmarkResult[]): 'improving' | 'stable' | 'declining' {
  const recentResults = results
    .filter(r => r.score !== null && r.score !== undefined)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (recentResults.length < 3) return 'stable';

  const scores = recentResults.map(r => Number(r.score));
  
  // Compare first half to second half
  const midpoint = Math.floor(scores.length / 2);
  const recentAvg = scores.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
  const olderAvg = scores.slice(midpoint).reduce((a, b) => a + b, 0) / (scores.length - midpoint);

  const diff = recentAvg - olderAvg;
  
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

// Get next level in progression
function getNextLevel(current: AthleteLevel): AthleteLevel | null {
  const order: AthleteLevel[] = ['iniciante', 'intermediario', 'avancado', 'hyrox_pro'];
  const currentIndex = order.indexOf(current);
  if (currentIndex >= order.length - 1) return null;
  return order[currentIndex + 1];
}

// Main function to calculate all progress data
export function calculateProgress(
  results: BenchmarkResult[],
  currentLevel: AthleteLevel
): ProgressData {
  const validResults = results.filter(r => r.score !== null && r.score !== undefined);
  
  const { score: globalScore, weights: weightedScores } = calculateWeightedScore(validResults);
  const standardDeviation = calculateStandardDeviation(validResults);
  const consistencyScore = calculateConsistencyScore(standardDeviation);
  const isConsistent = standardDeviation <= CONSISTENCY_THRESHOLD;
  const recentTrend = calculateTrend(validResults);
  
  const nextLevel = getNextLevel(currentLevel);
  const currentThreshold = LEVEL_THRESHOLDS[currentLevel];
  const nextThreshold = nextLevel ? LEVEL_THRESHOLDS[nextLevel] : null;
  
  // Calculate progress to next level
  // Progress is based on how close the score is to the threshold
  let progressToNextLevel = 0;
  if (nextLevel && currentThreshold < 100) {
    // Progress from 0 to threshold mapped to 0-100%
    progressToNextLevel = Math.min(100, (globalScore / currentThreshold) * 100);
  } else {
    progressToNextLevel = 100; // Max level
  }

  // Ready to advance if score meets threshold AND consistent
  const readyToAdvance = globalScore >= currentThreshold && isConsistent && validResults.length >= 3;

  return {
    globalScore: Math.round(globalScore * 10) / 10,
    consistencyScore: Math.round(consistencyScore * 10) / 10,
    standardDeviation: Math.round(standardDeviation * 10) / 10,
    isConsistent,
    currentLevel,
    nextLevel,
    currentThreshold,
    nextThreshold,
    progressToNextLevel: Math.round(progressToNextLevel * 10) / 10,
    readyToAdvance,
    recentTrend,
    benchmarksUsed: validResults.length,
    weightedScores,
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
