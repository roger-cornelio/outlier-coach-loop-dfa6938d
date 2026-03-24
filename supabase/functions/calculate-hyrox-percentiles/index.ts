import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MetricInput {
  metric: string;
  raw_time_sec: number;
  data_source?: 'real' | 'estimated';
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
  p10_sec: number;
}

/**
 * Mapping from metric names to benchmark_results column names
 */
const METRIC_TO_COLUMN: Record<string, string> = {
  run_avg: 'run_avg_sec',
  roxzone: 'roxzone_sec',
  ski: 'ski_sec',
  sled_push: 'sled_push_sec',
  sled_pull: 'sled_pull_sec',
  bbj: 'bbj_sec',
  row: 'row_sec',
  farmers: 'farmers_sec',
  sandbag: 'sandbag_sec',
  wallballs: 'wallballs_sec'
};

/**
 * Calculates percentile using linear interpolation.
 * Lower time = higher percentile (better performance).
 */
function calculatePercentile(rawTimeSec: number, band: PercentileBand): number {
  const { p10_sec, p25_sec, p50_sec, p75_sec, p90_sec } = band;
  
  const ranges = [
    { minTime: p10_sec, maxTime: p25_sec, maxPercentile: 90, minPercentile: 75 },
    { minTime: p25_sec, maxTime: p50_sec, maxPercentile: 75, minPercentile: 50 },
    { minTime: p50_sec, maxTime: p75_sec, maxPercentile: 50, minPercentile: 25 },
    { minTime: p75_sec, maxTime: p90_sec, maxPercentile: 25, minPercentile: 10 },
  ];
  
  if (rawTimeSec <= p10_sec) {
    const timeBeyondP10 = p10_sec - rawTimeSec;
    const rangeSize = p25_sec - p10_sec;
    const extrapolationFactor = rangeSize > 0 ? timeBeyondP10 / rangeSize : 0;
    const percentile = 90 + (extrapolationFactor * 9);
    return Math.min(99, Math.round(percentile));
  }
  
  if (rawTimeSec >= p90_sec) {
    const timeBeyondP90 = rawTimeSec - p90_sec;
    const rangeSize = p90_sec - p75_sec;
    const extrapolationFactor = rangeSize > 0 ? timeBeyondP90 / rangeSize : 0;
    const percentile = 10 - (extrapolationFactor * 9);
    return Math.max(1, Math.round(percentile));
  }
  
  for (const range of ranges) {
    if (rawTimeSec >= range.minTime && rawTimeSec <= range.maxTime) {
      const timeRange = range.maxTime - range.minTime;
      const percentileRange = range.maxPercentile - range.minPercentile;
      
      if (timeRange === 0) {
        return Math.round((range.maxPercentile + range.minPercentile) / 2);
      }
      
      const timeFraction = (rawTimeSec - range.minTime) / timeRange;
      const percentile = range.maxPercentile - (timeFraction * percentileRange);
      
      return Math.max(1, Math.min(99, Math.round(percentile)));
    }
  }
  
  console.warn('[PERCENTILE_CALC] Time fell outside all ranges:', { rawTimeSec, band });
  return 50;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { division, gender, metrics, dry_run } = body;

    // ═══ DRY RUN MODE ═══
    // Public access, no JWT, no DB persistence, returns scores + p10_sec
    if (dry_run === true) {
      console.log('[PERCENTILE_CALC] DRY RUN mode — public, no persistence');

      if (!division || !gender || !metrics || metrics.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: division, gender, metrics' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const metricNames = metrics.map((m: MetricInput) => m.metric);
      const { data: bands, error: bandsError } = await supabase
        .from('percentile_bands')
        .select('metric, p10_sec, p25_sec, p50_sec, p75_sec, p90_sec')
        .eq('percentile_set_id', 'v1')
        .eq('is_active', true)
        .eq('division', division)
        .eq('gender', gender)
        .in('metric', metricNames);

      if (bandsError || !bands || bands.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No percentile bands found', scores: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const bandMap = new Map(bands.map((b: any) => [b.metric, b]));

      const scores = metrics
        .filter((m: MetricInput) => bandMap.has(m.metric) && m.raw_time_sec > 0)
        .map((m: MetricInput) => {
          const band = bandMap.get(m.metric)!;
          return {
            metric: m.metric,
            raw_time_sec: m.raw_time_sec,
            percentile_value: calculatePercentile(m.raw_time_sec, band as PercentileBand),
            percentile_set_id_used: 'v1',
            p10_sec: (band as any).p10_sec,
            data_source: m.data_source || 'real',
          };
        });

      return new Response(
        JSON.stringify({ scores }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══ NORMAL MODE (authenticated, persisted) ═══
    const { hyrox_result_id } = body;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', errorCode: 'AUTH_ERROR' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token', errorCode: 'AUTH_ERROR' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PERCENTILE_CALC] Authenticated user:', user.id);

    if (!hyrox_result_id || !division || !gender || !metrics || metrics.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: hyrox_result_id, division, gender, metrics',
          errorCode: 'VALIDATION_ERROR'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(hyrox_result_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid hyrox_result_id format', errorCode: 'VALIDATION_ERROR' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: resultData, error: resultCheckError } = await supabase
      .from('benchmark_results')
      .select('id, user_id, time_in_seconds, run_avg_sec, roxzone_sec, ski_sec, sled_push_sec, sled_pull_sec, bbj_sec, row_sec, farmers_sec, sandbag_sec, wallballs_sec')
      .eq('id', hyrox_result_id)
      .single();

    if (resultCheckError || !resultData) {
      return new Response(
        JSON.stringify({ error: 'Benchmark result not found', errorCode: 'RESULT_NOT_FOUND', details: resultCheckError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PRIORITY: REAL > ESTIMATED
    const finalMetrics: MetricInput[] = [];
    for (const inputMetric of metrics) {
      const columnName = METRIC_TO_COLUMN[inputMetric.metric];
      const realTimeFromDb = columnName ? (resultData as any)[columnName] : null;
      
      if (realTimeFromDb !== null && realTimeFromDb !== undefined && realTimeFromDb > 0) {
        finalMetrics.push({ metric: inputMetric.metric, raw_time_sec: realTimeFromDb, data_source: 'real' });
      } else {
        finalMetrics.push({ metric: inputMetric.metric, raw_time_sec: inputMetric.raw_time_sec, data_source: 'estimated' });
      }
    }

    const metricNames = finalMetrics.map(m => m.metric);
    const { data: bands, error: bandsError } = await supabase
      .from('percentile_bands')
      .select('metric, p10_sec, p25_sec, p50_sec, p75_sec, p90_sec')
      .eq('percentile_set_id', 'v1')
      .eq('is_active', true)
      .eq('division', division)
      .eq('gender', gender)
      .in('metric', metricNames);

    if (bandsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch percentile bands', errorCode: 'BANDS_NOT_FOUND', details: bandsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bands || bands.length === 0) {
      return new Response(
        JSON.stringify({ error: `No percentile bands found for division=${division}, gender=${gender}`, errorCode: 'BANDS_NOT_FOUND', missingBands: metricNames }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bandMap = new Map<string, PercentileBand>();
    for (const band of bands) {
      bandMap.set(band.metric, band as PercentileBand);
    }

    const calculatedScores: CalculatedScore[] = [];
    const missingBands: string[] = [];

    for (const input of finalMetrics) {
      const band = bandMap.get(input.metric);
      if (!band) { missingBands.push(input.metric); continue; }

      calculatedScores.push({
        metric: input.metric,
        raw_time_sec: input.raw_time_sec,
        percentile_value: calculatePercentile(input.raw_time_sec, band),
        percentile_set_id_used: 'v1',
        data_source: input.data_source || 'estimated',
        p10_sec: band.p10_sec,
      });
    }

    if (calculatedScores.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No scores could be calculated', errorCode: 'BANDS_NOT_FOUND', missingBands }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      return new Response(
        JSON.stringify({ error: 'Failed to save scores', errorCode: 'INSERT_FAILED', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        scores: calculatedScores,
        saved_count: insertedScores?.length || 0,
        missing_bands: missingBands.length > 0 ? missingBands : undefined,
        real_count: calculatedScores.filter(s => s.data_source === 'real').length,
        estimated_count: calculatedScores.filter(s => s.data_source === 'estimated').length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PERCENTILE_CALC] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', errorCode: 'UNKNOWN_ERROR', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
