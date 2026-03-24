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

interface PercentileBand {
  metric: string;
  p10_sec: number;
  p25_sec: number;
  p50_sec: number;
  p75_sec: number;
  p90_sec: number;
}

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
    return Math.min(99, Math.round(90 + extrapolationFactor * 9));
  }

  if (rawTimeSec >= p90_sec) {
    const timeBeyondP90 = rawTimeSec - p90_sec;
    const rangeSize = p90_sec - p75_sec;
    const extrapolationFactor = rangeSize > 0 ? timeBeyondP90 / rangeSize : 0;
    return Math.max(1, Math.round(10 - extrapolationFactor * 9));
  }

  for (const range of ranges) {
    if (rawTimeSec >= range.minTime && rawTimeSec <= range.maxTime) {
      const timeRange = range.maxTime - range.minTime;
      const percentileRange = range.maxPercentile - range.minPercentile;
      if (timeRange === 0) return Math.round((range.maxPercentile + range.minPercentile) / 2);
      const timeFraction = (rawTimeSec - range.minTime) / timeRange;
      return Math.max(1, Math.min(99, Math.round(range.maxPercentile - timeFraction * percentileRange)));
    }
  }

  return 50;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { division, gender, metrics } = await req.json() as {
      division: string;
      gender: string;
      metrics: MetricInput[];
    };

    if (!division || !gender || !metrics || metrics.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: division, gender, metrics' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const metricNames = metrics.map(m => m.metric);
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

    const bandMap = new Map(bands.map(b => [b.metric, b]));

    const scores = metrics
      .filter(m => bandMap.has(m.metric) && m.raw_time_sec > 0)
      .map(m => {
        const band = bandMap.get(m.metric)!;
        return {
          metric: m.metric,
          raw_time_sec: m.raw_time_sec,
          percentile_value: calculatePercentile(m.raw_time_sec, band),
          p10_sec: band.p10_sec,
          data_source: m.data_source || 'real',
        };
      });

    return new Response(
      JSON.stringify({ scores }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[PUBLIC_PERCENTILES] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
