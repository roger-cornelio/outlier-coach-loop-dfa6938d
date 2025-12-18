import { useEffect, useState, useCallback } from 'react';
import { useOutlierStore } from '@/store/outlierStore';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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

export interface ExternalResult {
  id: string;
  result_type: 'simulado' | 'prova_oficial';
  time_in_seconds?: number;
  event_name?: string;
  event_date?: string;
  screenshot_url?: string;
  race_category?: 'OPEN' | 'PRO';
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
  const { athleteConfig, addWorkoutResult, externalResultsRefreshKey } = useOutlierStore();
  const { user } = useAuth();
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [externalResults, setExternalResults] = useState<ExternalResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Load results from localStorage and Supabase on mount and when refresh key changes
  useEffect(() => {
    const loadResults = async () => {
      // Load local benchmark results
      const stored = loadFromStorage();
      setResults(stored);

      // Load external results (simulados/provas) from Supabase if user is logged in
      if (user?.id) {
        const { data, error } = await supabase
          .from('benchmark_results')
          .select('id, result_type, time_in_seconds, event_name, event_date, screenshot_url, race_category, created_at')
          .eq('user_id', user.id)
          .in('result_type', ['simulado', 'prova_oficial'])
          .order('created_at', { ascending: false });

        if (!error && data) {
          setExternalResults(data as ExternalResult[]);
        }
      }

      setLoading(false);
    };

    loadResults();
  }, [user?.id, externalResultsRefreshKey]);

  // Get only official competition results
  const getOfficialCompetitions = useCallback((): ExternalResult[] => {
    return externalResults.filter(r => r.result_type === 'prova_oficial');
  }, [externalResults]);

  // Get only simulado results
  const getSimulados = useCallback((): ExternalResult[] => {
    return externalResults.filter(r => r.result_type === 'simulado');
  }, [externalResults]);

  // Save a new benchmark result
  const saveBenchmarkResult = useCallback((result: Omit<BenchmarkResult, 'id' | 'created_at'>) => {
    const newResult: BenchmarkResult = {
      ...result,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      athlete_level: result.athlete_level,
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

  // Refresh external results from Supabase
  const refreshExternalResults = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('benchmark_results')
      .select('id, result_type, time_in_seconds, event_name, event_date, screenshot_url, race_category, created_at')
      .eq('user_id', user.id)
      .in('result_type', ['simulado', 'prova_oficial'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setExternalResults(data as ExternalResult[]);
    }
  }, [user?.id]);

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
    externalResults,
    loading,
    saveBenchmarkResult,
    getWeeklyResults,
    getBucketCounts,
    getAverageScore,
    getOfficialCompetitions,
    getSimulados,
    refreshExternalResults,
    totalBenchmarks: results.length,
    clearHistory,
  };
}
