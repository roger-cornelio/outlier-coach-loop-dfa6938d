import { useMemo } from 'react';
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

// Calculate approximate birth date from current age
function getBirthDateFromAge(age: number): Date {
  const today = new Date();
  const birthYear = today.getFullYear() - age;
  // Approximate to middle of year (July 1st) since we don't have exact date
  return new Date(birthYear, 6, 1);
}

export function useAthleteStatus() {
  const { results, getOfficialCompetitions, loading } = useBenchmarkResults();
  const { athleteConfig } = useOutlierStore();
  
  // Map sexo to AthleteGender type
  const gender: AthleteGender = athleteConfig?.sexo === 'feminino' ? 'feminino' : 'masculino';
  
  // Get birth date from age if available
  const athleteBirthDate = athleteConfig?.idade 
    ? getBirthDateFromAge(athleteConfig.idade) 
    : undefined;
  
  const calculatedStatus = useMemo<CalculatedStatus>(() => {
    const previousStatus = loadPreviousStatus();
    const officialCompetitions = getOfficialCompetitions();
    const status = calculateAthleteStatus(
      results, 
      officialCompetitions, 
      gender, 
      previousStatus,
      athleteBirthDate
    );
    
    // Save for hysteresis on next calculation
    saveStatus(status.status);
    
    return status;
  }, [results, getOfficialCompetitions, gender, athleteBirthDate]);
  
  // Get effective level for workout prescription
  const getEffectiveLevelForWorkout = (difficulty: TrainingDifficulty): AthleteStatus => {
    return getEffectiveLevel(calculatedStatus.status, difficulty);
  };
  
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
