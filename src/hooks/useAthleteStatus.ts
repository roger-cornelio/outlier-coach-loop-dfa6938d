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

export function useAthleteStatus() {
  const { results, getOfficialCompetitions, loading } = useBenchmarkResults();
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
  };
}
