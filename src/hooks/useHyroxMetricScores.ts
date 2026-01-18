import { useState, useEffect, useCallback } from 'react';
import { getHyroxMetricScores, hasExistingScores, type CalculatedScore } from '@/utils/hyroxPercentileCalculator';

interface UseHyroxMetricScoresResult {
  /**
   * Frozen scores from hyrox_metric_scores.
   * IMMUTABLE - these are snapshots, never recalculated.
   */
  scores: CalculatedScore[] | null;
  
  /**
   * Loading state for initial fetch
   */
  loading: boolean;
  
  /**
   * Error message if fetch failed
   */
  error: string | null;
  
  /**
   * Whether scores exist for this result
   */
  hasScores: boolean;
  
  /**
   * Manually refresh scores (still reads frozen data, doesn't recalculate)
   */
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch frozen HYROX metric scores for analysis display.
 * 
 * CRITICAL GUARDRAILS:
 * - NEVER triggers calculation automatically
 * - NEVER queries percentile_bands
 * - ONLY reads from hyrox_metric_scores (frozen snapshots)
 * - Safe to call on component mount without side effects
 * 
 * @param hyroxResultId - The HYROX result ID to fetch scores for
 * @returns Frozen scores and loading/error states
 */
export function useHyroxMetricScores(
  hyroxResultId: string | null | undefined
): UseHyroxMetricScoresResult {
  const [scores, setScores] = useState<CalculatedScore[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScores, setHasScores] = useState(false);
  
  const fetchScores = useCallback(async () => {
    if (!hyroxResultId) {
      console.log('[HYROX_SCORES_HOOK] No result ID, skipping fetch');
      setScores(null);
      setHasScores(false);
      setLoading(false);
      return;
    }
    
    console.log('[HYROX_SCORES_HOOK] Fetching frozen scores for:', hyroxResultId);
    setLoading(true);
    setError(null);
    
    try {
      // IMMUTABILITY: Only read from hyrox_metric_scores, never calculate
      const [fetchedScores, exists] = await Promise.all([
        getHyroxMetricScores(hyroxResultId),
        hasExistingScores(hyroxResultId)
      ]);
      
      console.log('[HYROX_SCORES_HOOK] Fetched:', {
        scoresCount: fetchedScores?.length || 0,
        exists
      });
      
      setScores(fetchedScores);
      setHasScores(exists);
    } catch (err) {
      console.error('[HYROX_SCORES_HOOK] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch scores');
      setScores(null);
      setHasScores(false);
    } finally {
      setLoading(false);
    }
  }, [hyroxResultId]);
  
  // Fetch on mount and when result ID changes
  // GUARDRAIL: This only reads frozen data, never triggers calculation
  useEffect(() => {
    fetchScores();
  }, [fetchScores]);
  
  return {
    scores,
    loading,
    error,
    hasScores,
    refresh: fetchScores
  };
}
