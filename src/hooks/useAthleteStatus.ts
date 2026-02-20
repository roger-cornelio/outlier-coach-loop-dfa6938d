import { useMemo, useCallback } from 'react';
import { useBenchmarkResults } from './useBenchmarkResults';
import { useOutlierStore } from '@/store/outlierStore';
import { 
  calculateAthleteStatus, 
  getEffectiveLevel,
  getAgeBracket,
  type CalculatedStatus,
  type AthleteGender,
  type HyroxAgeBracket
} from '@/utils/athleteStatusSystem';
import { 
  computeOutlierScore, 
  type ScoreResult, 
  type ScoreCategory 
} from '@/utils/outlierScoring';
import type { AthleteStatus, TrainingDifficulty } from '@/types/outlier';

const STORAGE_KEY = 'athlete-status-history';

// Load previous status from localStorage for hysteresis
function loadPreviousStatus(): AthleteStatus | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return data.status as AthleteStatus;
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

// Save current status for hysteresis
function saveStatus(status: AthleteStatus): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
      status, 
      updatedAt: new Date().toISOString() 
    }));
  } catch {
    // Ignore errors
  }
}

// Clear status from localStorage
export function clearStatusHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

// Calculate approximate birth date from current age
function getBirthDateFromAge(age: number): Date {
  const today = new Date();
  const birthYear = today.getFullYear() - age;
  // Approximate to middle of year (July 1st) since we don't have exact date
  return new Date(birthYear, 6, 1);
}

/**
 * Estimate percentile from benchmark bucket classification
 * Maps bucket to approximate percentile within population
 */
function estimatePercentileFromBucket(bucket: string | null | undefined): number {
  switch (bucket) {
    case 'ELITE': return 0.90;  // Top 10%
    case 'STRONG': return 0.70; // Top 30%
    case 'OK': return 0.50;     // Median
    case 'TOUGH': return 0.30;  // Below average
    case 'DNF': return 0.10;    // Low completion
    default: return 0.50;
  }
}

/**
 * Estimate percentile from official time (in seconds)
 * Based on HYROX population distribution
 */
function estimatePercentileFromTime(
  timeSeconds: number, 
  gender: AthleteGender,
  status: AthleteStatus
): number {
  const minutes = timeSeconds / 60;
  
  // Reference times per gender (approximate population medians)
  const medianTimes: Record<AthleteGender, number> = {
    masculino: 100, // ~1h40 median
    feminino: 110,  // ~1h50 median
  };
  
  const median = medianTimes[gender];
  
  // Estimate percentile based on time vs median
  // Faster than median = higher percentile
  if (minutes <= median * 0.70) return 0.95; // Top 5%
  if (minutes <= median * 0.80) return 0.85; // Top 15%
  if (minutes <= median * 0.90) return 0.70; // Top 30%
  if (minutes <= median) return 0.50;        // Median
  if (minutes <= median * 1.15) return 0.30; // Below median
  if (minutes <= median * 1.30) return 0.15; // Low
  return 0.05;                                // Bottom 5%
}

export function useAthleteStatus() {
  const { results, getOfficialCompetitions, getSimulados, loading } = useBenchmarkResults();
  const { athleteConfig, externalResultsRefreshKey } = useOutlierStore();
  
  // Map sexo to AthleteGender type
  const gender: AthleteGender = athleteConfig?.sexo === 'feminino' ? 'feminino' : 'masculino';
  
  // Get birth date from age if available
  const athleteBirthDate = athleteConfig?.idade 
    ? getBirthDateFromAge(athleteConfig.idade) 
    : undefined;
  
  const calculatedStatus = useMemo<CalculatedStatus>(() => {
    // Check if there are any results - if not, don't use previous status
    const hasAnyResults = results.length > 0;
    const previousStatus = hasAnyResults ? loadPreviousStatus() : undefined;
    
    const officialCompetitions = getOfficialCompetitions();
    const status = calculateAthleteStatus(
      results, 
      officialCompetitions, 
      gender, 
      previousStatus,
      athleteBirthDate
    );
    
    // Only save status if there are results
    if (hasAnyResults) {
      saveStatus(status.status);
    }
    
    return status;
  }, [results, getOfficialCompetitions, gender, athleteBirthDate, externalResultsRefreshKey]);
  
  // Compute the new Outlier Score
  const outlierScore = useMemo<ScoreResult>(() => {
    const officialCompetitions = getOfficialCompetitions();
    const simulatedResults = getSimulados();
    
    // Determine category from status
    const category: ScoreCategory = 
      calculatedStatus.status === 'elite' ? 'PRO' : calculatedStatus.status === 'pro' ? 'PRO' : 'OPEN';
    
    // Get best official result percentile
    let officialPercentile: number | null = null;
    if (calculatedStatus.validatingCompetition) {
      officialPercentile = estimatePercentileFromTime(
        calculatedStatus.validatingCompetition.open_equivalent_seconds,
        gender,
        calculatedStatus.status
      );
    }
    
    // Get best simulated result percentile
    let simulatedPercentile: number | null = null;
    if (simulatedResults.length > 0) {
      const bestSimulated = simulatedResults
        .filter(r => r.time_in_seconds && r.time_in_seconds > 0)
        .sort((a, b) => (a.time_in_seconds || Infinity) - (b.time_in_seconds || Infinity))[0];
      
      if (bestSimulated?.time_in_seconds) {
        simulatedPercentile = estimatePercentileFromTime(
          bestSimulated.time_in_seconds,
          gender,
          calculatedStatus.status
        );
      }
    }
    
    // Get average benchmark percentile
    let benchmarkPercentile: number | null = null;
    if (results.length > 0) {
      const percentiles = results.map(r => estimatePercentileFromBucket(r.bucket));
      benchmarkPercentile = percentiles.reduce((a, b) => a + b, 0) / percentiles.length;
    }
    
    return computeOutlierScore({
      category,
      official: officialPercentile !== null ? { percentile: officialPercentile } : null,
      simulated: simulatedPercentile !== null ? { percentile: simulatedPercentile } : null,
      benchmark: benchmarkPercentile !== null ? { percentile: benchmarkPercentile } : null,
    });
  }, [results, getOfficialCompetitions, getSimulados, calculatedStatus, gender]);
  
  // Get effective level for workout prescription
  const getEffectiveLevelForWorkout = useCallback((difficulty: TrainingDifficulty): AthleteStatus => {
    return getEffectiveLevel(calculatedStatus.status, difficulty);
  }, [calculatedStatus.status]);
  
  // Get current athlete age bracket (for display)
  const currentAgeBracket: HyroxAgeBracket | undefined = athleteConfig?.idade 
    ? getAgeBracket(athleteConfig.idade)
    : undefined;
  
  return {
    ...calculatedStatus,
    loading,
    getEffectiveLevelForWorkout,
    currentAgeBracket,
    athleteAge: athleteConfig?.idade,
    outlierScore,
  };
}
