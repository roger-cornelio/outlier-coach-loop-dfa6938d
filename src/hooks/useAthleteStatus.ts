import { useMemo } from 'react';
import { useBenchmarkResults } from './useBenchmarkResults';
import { useOutlierStore } from '@/store/outlierStore';
import { 
  calculateAthleteStatus, 
  getEffectiveLevel,
  type CalculatedStatus,
  type AthleteGender
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

export function useAthleteStatus() {
  const { results, getOfficialCompetitions, loading } = useBenchmarkResults();
  const { athleteConfig } = useOutlierStore();
  
  // Map sexo to AthleteGender type
  const gender: AthleteGender = athleteConfig?.sexo === 'feminino' ? 'feminino' : 'masculino';
  
  const calculatedStatus = useMemo<CalculatedStatus>(() => {
    const previousStatus = loadPreviousStatus();
    const officialCompetitions = getOfficialCompetitions();
    const status = calculateAthleteStatus(results, officialCompetitions, gender, previousStatus);
    
    // Save for hysteresis on next calculation
    saveStatus(status.status);
    
    return status;
  }, [results, getOfficialCompetitions, gender]);
  
  // Get effective level for workout prescription
  const getEffectiveLevelForWorkout = (difficulty: TrainingDifficulty): AthleteStatus => {
    return getEffectiveLevel(calculatedStatus.status, difficulty);
  };
  
  return {
    ...calculatedStatus,
    loading,
    getEffectiveLevelForWorkout,
  };
}
