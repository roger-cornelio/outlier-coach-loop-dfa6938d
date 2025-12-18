// OUTLIER Scoring System
// Computes athlete score based on official, simulated, and benchmark percentiles

export type ScoreCategory = "OPEN" | "PRO";

export interface ScoreInput {
  category: ScoreCategory;
  official?: { percentile: number; dateISO?: string } | null;
  simulated?: { percentile: number } | null;
  benchmark?: { percentile: number } | null;
}

export interface ScoreBreakdown {
  officialAnchorScore: number | null;
  simulatedScore: number | null;
  benchmarkScore: number | null;
  weightedRaw: number;
  finalClamped: number;
}

export interface ScoreResult {
  score: number;            // 0..100
  ceiling: number | null;   // 0..100 if official exists
  isProvisional: boolean;
  breakdown: ScoreBreakdown;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Converts a percentile (0-1) to a category-adjusted score (0-100)
 * Different curves for OPEN vs PRO categories
 */
function percentileToCategoryScore(percentile: number, category: ScoreCategory): number {
  const p = clamp(percentile, 0, 1);
  
  // Top percentile threshold for score 100
  const p100 = category === "OPEN" ? 0.75 : 0.80;
  
  // Mid and low reference points
  const pMid = 0.50, sMid = 70;
  const pLow = 0.20, sLow = 45;
  const sMin = 20;

  if (p >= p100) return 100;
  
  if (p >= pMid) {
    const t = (p - pMid) / (p100 - pMid);
    return clamp(sMid + t * (100 - sMid), 0, 100);
  }
  
  if (p >= pLow) {
    const t = (p - pLow) / (pMid - pLow);
    return clamp(sLow + t * (sMid - sLow), 0, 100);
  }
  
  const t = p / pLow;
  return clamp(sMin + t * (sLow - sMin), 0, 100);
}

// Weight constants for anchored mode (official exists)
const W_OFFICIAL = 0.40;
const W_SIM = 0.50;
const W_BENCH = 0.10;

// Weight constants for provisional mode (no official)
const W_SIM_PROV = 0.70;
const W_BENCH_PROV = 0.30;

/**
 * Computes the OUTLIER score based on official, simulated, and benchmark percentiles
 * 
 * Rules:
 * - If official exists: weighted average capped at official ceiling
 * - If no official: provisional score from simulated + benchmark
 * - Missing data assumes same as official (if anchored) or 0 (if provisional)
 */
export function computeOutlierScore(input: ScoreInput): ScoreResult {
  const category = input.category;
  
  const officialP = input.official?.percentile ?? null;
  const simP = input.simulated?.percentile ?? null;
  const benchP = input.benchmark?.percentile ?? null;

  const officialAnchorScore =
    officialP !== null ? percentileToCategoryScore(officialP, category) : null;
  const simulatedScore =
    simP !== null ? percentileToCategoryScore(simP, category) : null;
  const benchmarkScore =
    benchP !== null ? percentileToCategoryScore(benchP, category) : null;

  let weightedRaw = 0;
  let finalClamped = 0;
  let isProvisional = false;
  let ceiling: number | null = null;

  if (officialAnchorScore !== null) {
    // Anchored mode: official result sets the ceiling
    ceiling = officialAnchorScore;
    
    // If missing data, assume "same as official" to avoid punishing empty fields
    const simUsed = simulatedScore ?? officialAnchorScore;
    const benchUsed = benchmarkScore ?? officialAnchorScore;
    
    weightedRaw =
      W_OFFICIAL * officialAnchorScore +
      W_SIM * simUsed +
      W_BENCH * benchUsed;
    
    // Hard cap: never exceed official ceiling
    finalClamped = Math.min(weightedRaw, ceiling);
  } else {
    // Provisional mode: no official anchor
    isProvisional = true;
    
    const simUsed = simulatedScore ?? 0;
    const benchUsed = benchmarkScore ?? 0;
    
    weightedRaw = W_SIM_PROV * simUsed + W_BENCH_PROV * benchUsed;
    finalClamped = weightedRaw;
  }

  return {
    score: round1(clamp(finalClamped, 0, 100)),
    ceiling: ceiling !== null ? round1(clamp(ceiling, 0, 100)) : null,
    isProvisional,
    breakdown: {
      officialAnchorScore: officialAnchorScore !== null ? round1(officialAnchorScore) : null,
      simulatedScore: simulatedScore !== null ? round1(simulatedScore) : null,
      benchmarkScore: benchmarkScore !== null ? round1(benchmarkScore) : null,
      weightedRaw: round1(clamp(weightedRaw, 0, 100)),
      finalClamped: round1(clamp(finalClamped, 0, 100)),
    },
  };
}

/**
 * Get score description based on score value
 */
export function getScoreDescription(score: number): string {
  if (score >= 95) return 'Elite';
  if (score >= 85) return 'Excelente';
  if (score >= 70) return 'Forte';
  if (score >= 55) return 'Sólido';
  if (score >= 40) return 'Em desenvolvimento';
  return 'Iniciando';
}

/**
 * Get score color class based on score value
 */
export function getScoreColorClass(score: number): string {
  if (score >= 95) return 'text-yellow-400';
  if (score >= 85) return 'text-green-400';
  if (score >= 70) return 'text-blue-400';
  if (score >= 55) return 'text-cyan-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-muted-foreground';
}
