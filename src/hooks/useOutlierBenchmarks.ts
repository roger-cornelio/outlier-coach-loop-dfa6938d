import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface OutlierBenchmark {
  id: string;
  name: string;
  description: string | null;
  category: string;
  difficulty_weight: number;
  expected_minutes: number | null;
  is_active: boolean;
}

export interface OutlierTarget {
  id: string;
  benchmark_id: string;
  sex: string;
  age_group: string;
  division: string;
  level: string;
  target_seconds: number;
}

export interface OutlierResult {
  id: string;
  benchmark_id: string;
  result_seconds: number;
  result_date: string;
  notes: string | null;
  source: string;
  created_at: string;
}

export interface OutlierProgress {
  benchmark_id: string;
  best_seconds: number | null;
  last_seconds: number | null;
  level_reached: string;
  progress_pct: number;
}

export type OutlierLevel = 'OPEN' | 'PRO' | 'ELITE';

function classifyResult(resultSec: number, targetSec: number): OutlierLevel {
  const gap = resultSec / targetSec;
  if (gap <= 1.00) return 'ELITE';
  if (gap <= 1.10) return 'PRO';
  return 'OPEN';
}

export function useOutlierBenchmarks() {
  const { user } = useAuth();
  const [benchmarks, setBenchmarks] = useState<OutlierBenchmark[]>([]);
  const [targets, setTargets] = useState<OutlierTarget[]>([]);
  const [results, setResults] = useState<OutlierResult[]>([]);
  const [progress, setProgress] = useState<OutlierProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    
    // Load benchmarks (public read)
    const { data: bData } = await supabase
      .from('benchmark_outlier_master')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (bData) setBenchmarks(bData as unknown as OutlierBenchmark[]);

    // Load targets (public read)
    const { data: tData } = await supabase
      .from('benchmark_outlier_targets')
      .select('*');

    if (tData) setTargets(tData as unknown as OutlierTarget[]);

    // Load user results + progress
    if (user?.id) {
      const [resResp, progResp] = await Promise.all([
        supabase
          .from('benchmark_outlier_results')
          .select('*')
          .eq('athlete_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('benchmark_outlier_progress')
          .select('*')
          .eq('athlete_id', user.id),
      ]);

      if (resResp.data) setResults(resResp.data as unknown as OutlierResult[]);
      if (progResp.data) setProgress(progResp.data as unknown as OutlierProgress[]);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Submit a new result
  const submitResult = useCallback(async (
    benchmarkId: string,
    resultSeconds: number,
    notes?: string,
  ) => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('benchmark_outlier_results')
      .insert({
        athlete_id: user.id,
        benchmark_id: benchmarkId,
        result_seconds: resultSeconds,
        notes: notes || null,
      } as any)
      .select()
      .single();

    if (error) { console.error(error); return null; }

    // Recalc progress for this benchmark
    await recalcProgress(benchmarkId);
    await loadAll();
    return data;
  }, [user?.id, loadAll]);

  // Recalculate progress after new result
  const recalcProgress = useCallback(async (benchmarkId: string) => {
    if (!user?.id) return;

    // Get all results for this benchmark
    const { data: allRes } = await supabase
      .from('benchmark_outlier_results')
      .select('result_seconds')
      .eq('athlete_id', user.id)
      .eq('benchmark_id', benchmarkId)
      .order('result_seconds', { ascending: true });

    if (!allRes || allRes.length === 0) return;

    const best = (allRes as any[])[0].result_seconds;
    const last = (allRes as any[])[allRes.length - 1].result_seconds;

    // Find the target for this athlete's profile to classify
    // For MVP just use the first matching target for OPEN level
    const target = targets.find(t => t.benchmark_id === benchmarkId && t.level === 'OPEN');
    const levelReached = target ? classifyResult(best, target.target_seconds) : 'OPEN';

    // Calculate progress % (0-100) relative to ELITE target
    const eliteTarget = targets.find(t => t.benchmark_id === benchmarkId && t.level === 'ELITE');
    let progressPct = 0;
    if (eliteTarget) {
      progressPct = Math.min(100, Math.round((eliteTarget.target_seconds / best) * 100));
    }

    // Upsert progress
    const { error } = await supabase
      .from('benchmark_outlier_progress')
      .upsert({
        athlete_id: user.id,
        benchmark_id: benchmarkId,
        best_seconds: best,
        last_seconds: last,
        level_reached: levelReached,
        progress_pct: progressPct,
      } as any, { onConflict: 'athlete_id,benchmark_id' });

    if (error) console.error('Progress upsert error:', error);
  }, [user?.id, targets]);

  // Get progress for a specific benchmark
  const getProgress = useCallback((benchmarkId: string) => {
    return progress.find(p => p.benchmark_id === benchmarkId);
  }, [progress]);

  // Get results for a specific benchmark
  const getResults = useCallback((benchmarkId: string) => {
    return results.filter(r => r.benchmark_id === benchmarkId);
  }, [results]);

  // Get target for a benchmark + level
  const getTarget = useCallback((benchmarkId: string, level: string, sex?: string, ageGroup?: string) => {
    return targets.find(t =>
      t.benchmark_id === benchmarkId &&
      t.level === level &&
      (!sex || t.sex === sex) &&
      (!ageGroup || t.age_group === ageGroup)
    );
  }, [targets]);

  // Summary: how many benchmarks at each level
  const levelSummary = useMemo(() => {
    const counts = { OPEN: 0, PRO: 0, ELITE: 0, total: benchmarks.length };
    progress.forEach(p => {
      if (p.level_reached === 'ELITE') counts.ELITE++;
      else if (p.level_reached === 'PRO') counts.PRO++;
      else counts.OPEN++;
    });
    return counts;
  }, [progress, benchmarks]);

  return {
    benchmarks,
    targets,
    results,
    progress,
    loading,
    submitResult,
    getProgress,
    getResults,
    getTarget,
    levelSummary,
    refresh: loadAll,
  };
}
