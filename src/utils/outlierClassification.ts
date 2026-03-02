/**
 * outlierClassification — Classifies athlete level based on race time,
 * age, sex, and division using benchmarks_elite_pro + division_factors.
 *
 * Rules:
 * 1. Fetch elite_pro_seconds by sex & age
 * 2. Fetch division factor
 * 3. elite_adjusted = elite_pro_seconds * factor
 * 4. gap_pct = (athlete_time - elite_adjusted) / elite_adjusted
 * 5. gap ≤ 0.05 → ELITE, gap ≤ 0.15 → PRO, else OPEN
 */

export type OutlierLevel = 'ELITE' | 'PRO' | 'OPEN';

export interface ClassificationInput {
  athlete_time_seconds: number;
  sex: 'M' | 'F';
  age: number;
  division: string; // PRO, OPEN, DOUBLES, RELAY
}

export interface ClassificationResult {
  level: OutlierLevel;
  gap_pct: number;
  elite_reference_seconds: number;
  elite_adjusted_seconds: number;
  calculated_at: string;
}

export function classifyAthlete(
  athleteTime: number,
  eliteProSeconds: number,
  divisionFactor: number
): ClassificationResult {
  const elite_adjusted = Math.round(eliteProSeconds * divisionFactor);
  const gap_pct = (athleteTime - elite_adjusted) / elite_adjusted;

  let level: OutlierLevel;
  if (gap_pct <= 0.05) {
    level = 'ELITE';
  } else if (gap_pct <= 0.15) {
    level = 'PRO';
  } else {
    level = 'OPEN';
  }

  return {
    level,
    gap_pct: Math.round(gap_pct * 1000) / 1000, // 3 decimal places
    elite_reference_seconds: eliteProSeconds,
    elite_adjusted_seconds: elite_adjusted,
    calculated_at: new Date().toISOString(),
  };
}

/**
 * Get human-readable gap description
 */
export function formatGapPct(gap: number): string {
  const pct = Math.round(gap * 100);
  if (pct <= 0) return `${pct}%`;
  return `+${pct}%`;
}

/**
 * Get time difference string (e.g. "+6m30s")
 */
export function formatTimeDiff(athleteTime: number, referenceTime: number): string {
  const diff = athleteTime - referenceTime;
  const sign = diff >= 0 ? '+' : '-';
  const absDiff = Math.abs(diff);
  const m = Math.floor(absDiff / 60);
  const s = absDiff % 60;
  if (m === 0) return `${sign}${s}s`;
  return `${sign}${m}m${s > 0 ? s.toString().padStart(2, '0') + 's' : ''}`;
}

/**
 * Level color mappings
 */
export function getLevelColor(level: OutlierLevel): string {
  switch (level) {
    case 'ELITE': return 'text-yellow-400';
    case 'PRO': return 'text-blue-400';
    case 'OPEN': return 'text-emerald-400';
  }
}

export function getLevelBgColor(level: OutlierLevel): string {
  switch (level) {
    case 'ELITE': return 'bg-yellow-500/15 border-yellow-500/30';
    case 'PRO': return 'bg-blue-500/15 border-blue-500/30';
    case 'OPEN': return 'bg-emerald-500/15 border-emerald-500/30';
  }
}
