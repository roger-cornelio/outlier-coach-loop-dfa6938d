import { useEffect, useState, useCallback } from 'react';
import { useOutlierStore } from '@/store/outlierStore';

export interface BenchmarkResult {
  id: string;
  workout_id: string;
  block_id: string;
  benchmark_id?: string;
  completed: boolean;
  time_in_seconds?: number;
  score?: number;
  bucket?: string;
  athlete_level?: string;
  created_at: string;
}

const STORAGE_KEY = 'outlier-benchmark-history';

// Load from localStorage
const loadFromStorage = (): BenchmarkResult[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save to localStorage
const saveToStorage = (results: BenchmarkResult[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  } catch (err) {
    console.error('Error saving to localStorage:', err);
  }
};

export function useBenchmarkResults() {
  const { athleteConfig, addWorkoutResult } = useOutlierStore();
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Load results from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    setResults(stored);
    setLoading(false);
  }, []);

  // Save a new benchmark result
  const saveBenchmarkResult = useCallback((result: Omit<BenchmarkResult, 'id' | 'created_at'>) => {
    const newResult: BenchmarkResult = {
      ...result,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      athlete_level: result.athlete_level, // Now passed explicitly
    };

    setResults(prev => {
      const updated = [newResult, ...prev];
      saveToStorage(updated);
      return updated;
    });

    // Also save to store for immediate UI update
    addWorkoutResult({
      workoutId: result.workout_id,
      blockId: result.block_id,
      completed: result.completed,
      timeInSeconds: result.time_in_seconds,
      date: new Date().toISOString(),
    });

    return newResult;
  }, [athleteConfig, addWorkoutResult]);

  // Get results grouped by week
  const getWeeklyResults = useCallback(() => {
    const weeklyData: Record<string, { scores: number[]; date: Date }> = {};
    
    results.forEach(r => {
      if (!r.created_at || r.score === null || r.score === undefined) return;
      
      const date = new Date(r.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { scores: [], date: weekStart };
      }
      weeklyData[weekKey].scores.push(Number(r.score));
    });

    return Object.entries(weeklyData)
      .map(([key, data]) => ({
        week: key,
        weekLabel: `${data.date.getDate()}/${data.date.getMonth() + 1}`,
        avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        benchmarks: data.scores.length,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [results]);

  // Get performance bucket counts
  const getBucketCounts = useCallback(() => {
    const counts: Record<string, number> = {
      ELITE: 0,
      STRONG: 0,
      OK: 0,
      TOUGH: 0,
      DNF: 0,
    };

    results.forEach(r => {
      if (r.bucket && counts[r.bucket] !== undefined) {
        counts[r.bucket]++;
      }
    });

    return counts;
  }, [results]);

  // Get average score
  const getAverageScore = useCallback(() => {
    const scores = results.filter(r => r.score !== null && r.score !== undefined);
    if (scores.length === 0) return 0;
    return scores.reduce((sum, r) => sum + Number(r.score || 0), 0) / scores.length;
  }, [results]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setResults([]);
    saveToStorage([]);
  }, []);

  return {
    results,
    loading,
    saveBenchmarkResult,
    getWeeklyResults,
    getBucketCounts,
    getAverageScore,
    totalBenchmarks: results.length,
    clearHistory,
  };
}
