import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import { toast } from 'sonner';

export interface BenchmarkResult {
  id?: string;
  user_id?: string;
  workout_id: string;
  block_id: string;
  benchmark_id?: string;
  completed: boolean;
  time_in_seconds?: number;
  score?: number;
  bucket?: string;
  athlete_level?: string;
  created_at?: string;
}

export function useBenchmarkResults() {
  const { user } = useAuth();
  const { athleteConfig, workoutResults, addWorkoutResult } = useOutlierStore();
  const [dbResults, setDbResults] = useState<BenchmarkResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch benchmark results from database
  const fetchResults = useCallback(async () => {
    if (!user) {
      setDbResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('benchmark_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDbResults(data || []);
    } catch (err) {
      console.error('Error fetching benchmark results:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load results on mount and when user changes
  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Save a new benchmark result
  const saveBenchmarkResult = useCallback(async (result: Omit<BenchmarkResult, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) {
      // If not logged in, just save to local store
      addWorkoutResult({
        workoutId: result.workout_id,
        blockId: result.block_id,
        completed: result.completed,
        timeInSeconds: result.time_in_seconds,
        date: new Date().toISOString(),
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('benchmark_results')
        .insert({
          user_id: user.id,
          workout_id: result.workout_id,
          block_id: result.block_id,
          benchmark_id: result.benchmark_id,
          completed: result.completed,
          time_in_seconds: result.time_in_seconds,
          score: result.score,
          bucket: result.bucket,
          athlete_level: athleteConfig?.level,
        })
        .select()
        .single();

      if (error) throw error;

      // Also save to local store for immediate UI update
      addWorkoutResult({
        workoutId: result.workout_id,
        blockId: result.block_id,
        completed: result.completed,
        timeInSeconds: result.time_in_seconds,
        date: new Date().toISOString(),
      });

      // Refresh results from DB
      await fetchResults();
      
      return data;
    } catch (err) {
      console.error('Error saving benchmark result:', err);
      toast.error('Erro ao salvar resultado');
      return null;
    }
  }, [user, athleteConfig, addWorkoutResult, fetchResults]);

  // Get all results (combined from DB and local)
  const allResults = user ? dbResults : workoutResults.map(r => ({
    workout_id: r.workoutId,
    block_id: r.blockId,
    completed: r.completed,
    time_in_seconds: r.timeInSeconds,
    created_at: r.date,
  }));

  // Get results grouped by week
  const getWeeklyResults = useCallback(() => {
    const weeklyData: Record<string, { scores: number[]; date: Date }> = {};
    
    dbResults.forEach(r => {
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
  }, [dbResults]);

  // Get performance bucket counts
  const getBucketCounts = useCallback(() => {
    const counts: Record<string, number> = {
      ELITE: 0,
      STRONG: 0,
      OK: 0,
      TOUGH: 0,
      DNF: 0,
    };

    dbResults.forEach(r => {
      if (r.bucket && counts[r.bucket] !== undefined) {
        counts[r.bucket]++;
      }
    });

    return counts;
  }, [dbResults]);

  // Get average score
  const getAverageScore = useCallback(() => {
    const scores = dbResults.filter(r => r.score !== null && r.score !== undefined);
    if (scores.length === 0) return 0;
    return scores.reduce((sum, r) => sum + Number(r.score || 0), 0) / scores.length;
  }, [dbResults]);

  return {
    results: dbResults,
    allResults,
    loading,
    saveBenchmarkResult,
    fetchResults,
    getWeeklyResults,
    getBucketCounts,
    getAverageScore,
    totalBenchmarks: dbResults.length,
  };
}
