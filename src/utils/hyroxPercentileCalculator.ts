import { supabase } from "@/integrations/supabase/client";

/**
 * Metric input for percentile calculation
 */
export interface MetricInput {
  metric: string;
  raw_time_sec: number;
  /** Source of the data: 'real' (athlete-provided) or 'estimated' (system-inferred) */
  data_source?: 'real' | 'estimated';
}

/**
 * Calculated score result
 */
export interface CalculatedScore {
  metric: string;
  raw_time_sec: number;
  percentile_value: number;
  percentile_set_id_used: string;
  /** Source of the data: 'real' (athlete-provided) or 'estimated' (system-inferred) */
  data_source: 'real' | 'estimated';
}

/**
 * Result of the percentile calculation
 */
/**
 * Error codes for structured error handling
 */
export type PercentileErrorCode = 
  | 'RESULT_NOT_FOUND'
  | 'BANDS_NOT_FOUND'
  | 'INSERT_FAILED'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Result of the percentile calculation
 */
export interface PercentileCalculationResult {
  success: boolean;
  scores?: CalculatedScore[];
  saved_count?: number;
  missing_bands?: string[];
  error?: string;
  errorCode?: PercentileErrorCode;
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
    console.log('[HYROX_PERCENTILE] Invoking edge function...');
    
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
      
      // Parse error type
      let errorCode: PercentileErrorCode = 'UNKNOWN_ERROR';
      const errorMsg = error.message || String(error);
      
      if (errorMsg.includes('401') || errorMsg.includes('token') || errorMsg.includes('authorization')) {
        errorCode = 'AUTH_ERROR';
      }
      
      return { 
        success: false, 
        error: errorMsg,
        errorCode
      };
    }

    // Check for explicit error in response
    if (data?.error) {
      console.error('[HYROX_PERCENTILE] Calculation failed:', data.error, data);
      
      // Determine error code from response
      let errorCode: PercentileErrorCode = 'UNKNOWN_ERROR';
      
      if (data.error.includes('No percentile bands')) {
        errorCode = 'BANDS_NOT_FOUND';
      } else if (data.error.includes('Failed to save')) {
        errorCode = 'INSERT_FAILED';
      } else if (data.error.includes('Missing required')) {
        errorCode = 'VALIDATION_ERROR';
      }
      
      return { 
        success: false, 
        error: data.error,
        errorCode,
        missing_bands: data.missing_bands || data.missingBands
      };
    }

    // Check for success flag
    if (!data?.success) {
      console.error('[HYROX_PERCENTILE] No success flag in response:', data);
      return { 
        success: false, 
        error: 'Invalid response from calculation service',
        errorCode: 'UNKNOWN_ERROR'
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
      error: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'UNKNOWN_ERROR'
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
  console.log('[HYROX_PERCENTILE] Reading from TABLE: hyrox_metric_scores');

  const { data, error } = await supabase
    .from('hyrox_metric_scores')
    .select('metric, raw_time_sec, percentile_value, percentile_set_id_used, data_source')
    .eq('hyrox_result_id', hyroxResultId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[HYROX_PERCENTILE] Fetch error:', error);
    return null;
  }

  // Log what we found
  console.log('[HYROX_PERCENTILE] Scores loaded from hyrox_metric_scores:', {
    count: data?.length || 0,
    metrics: data?.map(d => ({
      metric: d.metric,
      data_source: d.data_source,
      percentile: d.percentile_value
    }))
  });

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
