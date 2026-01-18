import { supabase } from "@/integrations/supabase/client";

/**
 * Metric input for percentile calculation
 */
export interface MetricInput {
  metric: string;
  raw_time_sec: number;
}

/**
 * Calculated score result
 */
export interface CalculatedScore {
  metric: string;
  raw_time_sec: number;
  percentile_value: number;
  percentile_set_id_used: string;
}

/**
 * Result of the percentile calculation
 */
export interface PercentileCalculationResult {
  success: boolean;
  scores?: CalculatedScore[];
  saved_count?: number;
  missing_bands?: string[];
  error?: string;
}

/**
 * Valid HYROX metrics for percentile calculation
 */
export const HYROX_METRICS = [
  'run_avg',
  'roxzone',
  'ski',
  'sled_push',
  'sled_pull',
  'bbj',
  'row',
  'farmers',
  'sandbag',
  'wallballs'
] as const;

export type HyroxMetric = typeof HYROX_METRICS[number];

/**
 * Valid HYROX divisions
 */
export const HYROX_DIVISIONS = [
  'HYROX',
  'HYROX PRO',
  'HYROX DOUBLES',
  'HYROX RELAY'
] as const;

export type HyroxDivision = typeof HYROX_DIVISIONS[number];

/**
 * Calculates and persists HYROX percentiles for a result.
 * 
 * CRITICAL: This function should ONLY be called on explicit user action
 * (e.g., "Analisar Resultado" button). Never call automatically.
 * 
 * The calculation is immutable (MODEL A):
 * - Uses percentile_bands v1 + is_active=true
 * - Saves to hyrox_metric_scores (no updates, no deletes)
 * - Lower time = higher percentile
 * - Percentiles clamped to 1-99
 * 
 * @param hyroxResultId - The ID of the HYROX result to analyze
 * @param division - The competition division (e.g., 'HYROX', 'HYROX PRO')
 * @param gender - The athlete's gender ('M' or 'F')
 * @param metrics - Array of metric measurements to calculate percentiles for
 * @returns Promise with calculation results
 */
export async function calculateAndSaveHyroxPercentiles(
  hyroxResultId: string,
  division: string,
  gender: 'M' | 'F',
  metrics: MetricInput[]
): Promise<PercentileCalculationResult> {
  console.log('[HYROX_PERCENTILE] Starting calculation:', {
    hyroxResultId,
    division,
    gender,
    metricsCount: metrics.length
  });

  // Validate inputs
  if (!hyroxResultId) {
    return { success: false, error: 'Missing hyrox_result_id' };
  }

  if (!division) {
    return { success: false, error: 'Missing division' };
  }

  if (!gender || !['M', 'F'].includes(gender)) {
    return { success: false, error: 'Invalid gender (must be M or F)' };
  }

  if (!metrics || metrics.length === 0) {
    return { success: false, error: 'No metrics provided' };
  }

  // Validate each metric
  for (const metric of metrics) {
    if (!metric.metric || typeof metric.raw_time_sec !== 'number') {
      return { success: false, error: `Invalid metric data: ${JSON.stringify(metric)}` };
    }
    if (metric.raw_time_sec < 0) {
      return { success: false, error: `Invalid time for ${metric.metric}: ${metric.raw_time_sec}` };
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke('calculate-hyrox-percentiles', {
      body: {
        hyrox_result_id: hyroxResultId,
        division,
        gender,
        metrics
      }
    });

    if (error) {
      console.error('[HYROX_PERCENTILE] Edge function error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to calculate percentiles' 
      };
    }

    if (!data.success) {
      console.error('[HYROX_PERCENTILE] Calculation failed:', data.error);
      return { 
        success: false, 
        error: data.error,
        missing_bands: data.missing_bands
      };
    }

    console.log('[HYROX_PERCENTILE] Calculation successful:', {
      scoresCount: data.scores?.length,
      savedCount: data.saved_count
    });

    return {
      success: true,
      scores: data.scores,
      saved_count: data.saved_count,
      missing_bands: data.missing_bands
    };

  } catch (err) {
    console.error('[HYROX_PERCENTILE] Unexpected error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Fetches previously calculated scores for a HYROX result.
 * 
 * These scores are immutable - they represent the percentile
 * at the time of analysis, never recalculated.
 * 
 * @param hyroxResultId - The ID of the HYROX result
 * @returns Promise with the stored scores
 */
export async function getHyroxMetricScores(
  hyroxResultId: string
): Promise<CalculatedScore[] | null> {
  console.log('[HYROX_PERCENTILE] Fetching scores for:', hyroxResultId);

  const { data, error } = await supabase
    .from('hyrox_metric_scores')
    .select('metric, raw_time_sec, percentile_value, percentile_set_id_used')
    .eq('hyrox_result_id', hyroxResultId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[HYROX_PERCENTILE] Fetch error:', error);
    return null;
  }

  return data as CalculatedScore[];
}

/**
 * Checks if a HYROX result already has calculated scores.
 * 
 * Use this to prevent duplicate calculations (immutability guard).
 * 
 * @param hyroxResultId - The ID of the HYROX result
 * @returns Promise<boolean> - true if scores exist
 */
export async function hasExistingScores(hyroxResultId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('hyrox_metric_scores')
    .select('id', { count: 'exact', head: true })
    .eq('hyrox_result_id', hyroxResultId);

  if (error) {
    console.error('[HYROX_PERCENTILE] Check error:', error);
    return false;
  }

  return (count ?? 0) > 0;
}
