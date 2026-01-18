import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricInput {
  metric: string;
  raw_time_sec: number;
  data_source?: 'real' | 'estimated';
}

interface CalculateRequest {
  hyrox_result_id: string;
  division: string;
  gender: string;
  metrics: MetricInput[];
}

interface PercentileBand {
  metric: string;
  p10_sec: number;
  p25_sec: number;
  p50_sec: number;
  p75_sec: number;
  p90_sec: number;
}

interface CalculatedScore {
  metric: string;
  raw_time_sec: number;
  percentile_value: number;
  percentile_set_id_used: string;
  data_source: 'real' | 'estimated';
}

/**
 * Calculates percentile using linear interpolation.
 * Lower time = higher percentile (better performance).
 * 
 * Bands: p10 (slowest) → p25 → p50 → p75 → p90 (fastest)
 * Percentile output: 1-99 (clamped)
 */
function calculatePercentile(rawTimeSec: number, band: PercentileBand): number {
  const { p10_sec, p25_sec, p50_sec, p75_sec, p90_sec } = band;
  
  // Define the interpolation ranges
  // Note: Lower time = higher percentile
  // p90_sec is fastest (best), p10_sec is slowest (worst)
  const ranges = [
    { minTime: p90_sec, maxTime: p75_sec, minPercentile: 90, maxPercentile: 75 },
    { minTime: p75_sec, maxTime: p50_sec, minPercentile: 75, maxPercentile: 50 },
    { minTime: p50_sec, maxTime: p25_sec, minPercentile: 50, maxPercentile: 25 },
    { minTime: p25_sec, maxTime: p10_sec, minPercentile: 25, maxPercentile: 10 },
  ];
  
  // If faster than p90 (top tier)
  if (rawTimeSec <= p90_sec) {
    // Extrapolate above p90 (up to 99)
    const extrapolationFactor = (p90_sec - rawTimeSec) / (p90_sec - p75_sec);
    const percentile = 90 + (extrapolationFactor * 9); // Max extrapolation to 99
    return Math.min(99, Math.round(percentile));
  }
  
  // If slower than p10 (bottom tier)
  if (rawTimeSec >= p10_sec) {
    // Extrapolate below p10 (down to 1)
    const extrapolationFactor = (rawTimeSec - p10_sec) / (p25_sec - p10_sec);
    const percentile = 10 - (extrapolationFactor * 9); // Min extrapolation to 1
    return Math.max(1, Math.round(percentile));
  }
  
  // Find the appropriate range and interpolate
  for (const range of ranges) {
    if (rawTimeSec >= range.minTime && rawTimeSec <= range.maxTime) {
      // Linear interpolation
      const timeFraction = (rawTimeSec - range.minTime) / (range.maxTime - range.minTime);
      const percentile = range.minPercentile - (timeFraction * (range.minPercentile - range.maxPercentile));
      return Math.max(1, Math.min(99, Math.round(percentile)));
    }
  }
  
  // Fallback (shouldn't reach here)
  return 50;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[PERCENTILE_CALC] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[PERCENTILE_CALC] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PERCENTILE_CALC] Authenticated user:', user.id);

    // Parse request body
    const body: CalculateRequest = await req.json();
    const { hyrox_result_id, division, gender, metrics } = body;

    if (!hyrox_result_id || !division || !gender || !metrics || metrics.length === 0) {
      console.error('[PERCENTILE_CALC] Missing required fields:', { hyrox_result_id, division, gender, metricsCount: metrics?.length });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: hyrox_result_id, division, gender, metrics',
          errorCode: 'VALIDATION_ERROR'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate hyrox_result_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(hyrox_result_id)) {
      console.error('[PERCENTILE_CALC] Invalid UUID format:', hyrox_result_id);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid hyrox_result_id format',
          errorCode: 'VALIDATION_ERROR'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the benchmark_result exists and belongs to the user
    const { data: resultCheck, error: resultCheckError } = await supabase
      .from('benchmark_results')
      .select('id, user_id')
      .eq('id', hyrox_result_id)
      .single();

    if (resultCheckError || !resultCheck) {
      console.error('[PERCENTILE_CALC] Result not found:', hyrox_result_id, resultCheckError);
      return new Response(
        JSON.stringify({ 
          error: 'Benchmark result not found',
          errorCode: 'RESULT_NOT_FOUND',
          details: resultCheckError?.message
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PERCENTILE_CALC] Processing request:', {
      hyrox_result_id,
      division,
      gender,
      metricsCount: metrics.length,
      result_owner: resultCheck.user_id
    });

    // Fetch percentile bands for v1 only (MODEL A requirement)
    const metricNames = metrics.map(m => m.metric);
    const { data: bands, error: bandsError } = await supabase
      .from('percentile_bands')
      .select('metric, p10_sec, p25_sec, p50_sec, p75_sec, p90_sec')
      .eq('percentile_set_id', 'v1')
      .eq('is_active', true)
      .eq('division', division)
      .eq('gender', gender)
      .in('metric', metricNames);

    if (bandsError) {
      console.error('[PERCENTILE_CALC] Error fetching bands:', bandsError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch percentile bands', 
          errorCode: 'BANDS_NOT_FOUND',
          details: bandsError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bands || bands.length === 0) {
      console.warn('[PERCENTILE_CALC] No bands found for:', { division, gender, metrics: metricNames });
      return new Response(
        JSON.stringify({ 
          error: `No percentile bands found for division=${division}, gender=${gender}`,
          errorCode: 'BANDS_NOT_FOUND',
          missingBands: metricNames
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PERCENTILE_CALC] Fetched bands:', bands.length);

    // Create a lookup map for bands
    const bandMap = new Map<string, PercentileBand>();
    for (const band of bands) {
      bandMap.set(band.metric, band as PercentileBand);
    }

    // Calculate percentiles for each metric
    const calculatedScores: CalculatedScore[] = [];
    const missingBands: string[] = [];

    for (const input of metrics) {
      const band = bandMap.get(input.metric);
      
      if (!band) {
        missingBands.push(input.metric);
        console.warn('[PERCENTILE_CALC] Missing band for metric:', input.metric);
        continue;
      }

      const percentileValue = calculatePercentile(input.raw_time_sec, band);
      
      calculatedScores.push({
        metric: input.metric,
        raw_time_sec: input.raw_time_sec,
        percentile_value: percentileValue,
        percentile_set_id_used: 'v1',
        data_source: input.data_source || 'estimated'
      });

      console.log('[PERCENTILE_CALC] Calculated:', {
        metric: input.metric,
        raw_time_sec: input.raw_time_sec,
        percentile_value: percentileValue
      });
    }

    if (calculatedScores.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No scores could be calculated', 
          errorCode: 'BANDS_NOT_FOUND',
          missingBands 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert into hyrox_metric_scores (immutable - MODEL A)
    const insertRecords = calculatedScores.map(score => ({
      hyrox_result_id,
      metric: score.metric,
      raw_time_sec: score.raw_time_sec,
      percentile_value: score.percentile_value,
      percentile_set_id_used: score.percentile_set_id_used,
      data_source: score.data_source
    }));

    const { data: insertedScores, error: insertError } = await supabase
      .from('hyrox_metric_scores')
      .insert(insertRecords)
      .select();

    if (insertError) {
      console.error('[PERCENTILE_CALC] Insert error:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save scores', 
          errorCode: 'INSERT_FAILED',
          details: insertError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PERCENTILE_CALC] Successfully saved scores:', insertedScores?.length);

    return new Response(
      JSON.stringify({
        success: true,
        scores: calculatedScores,
        saved_count: insertedScores?.length || 0,
        missing_bands: missingBands.length > 0 ? missingBands : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PERCENTILE_CALC] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        errorCode: 'UNKNOWN_ERROR',
        details: String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
