import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EXTERNAL_API_BASE = 'https://api-outlier.onrender.com/diagnostico';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeAthleteName(name?: string): string {
  const raw = name?.trim() ?? '';
  if (!raw || !raw.includes(',')) return raw;

  const [lastName, firstName] = raw.split(',').map((part) => part.trim());
  const normalized = [firstName, lastName].filter(Boolean).join(' ');
  return normalized || raw;
}

function stripDiacritics(name?: string): string {
  const raw = name?.trim() ?? '';
  if (!raw) return '';
  return raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buildExternalUrl(paramsInput: {
  athleteName?: string;
  eventName?: string;
  division?: string;
  seasonId?: string | number;
  resultUrl?: string;
  idp?: string;
  eventCode?: string;
}): string {
  const params = new URLSearchParams();

  if (paramsInput.athleteName) params.set('athlete_name', paramsInput.athleteName);
  if (paramsInput.eventName) params.set('event_name', paramsInput.eventName);
  if (paramsInput.division) params.set('division', paramsInput.division);
  if (paramsInput.seasonId !== undefined && paramsInput.seasonId !== null && paramsInput.seasonId !== '') {
    params.set('season_id', String(paramsInput.seasonId));
  }

  if (paramsInput.resultUrl) {
    params.set('url', paramsInput.resultUrl);
    params.set('result_url', paramsInput.resultUrl);
  }

  if (paramsInput.idp) params.set('idp', paramsInput.idp);
  if (paramsInput.eventCode) params.set('event', paramsInput.eventCode);

  return `${EXTERNAL_API_BASE}?${params.toString()}`;
}

/**
 * Check if we have cached diagnostic data in the DB for this source_url.
 * Returns { resumo, diagnosticos, splits } or null.
 */
async function checkDbCache(supabase: any, sourceUrl: string) {
  try {
    const { data: resumo } = await supabase
      .from('diagnostico_resumo')
      .select('id, nome_atleta, evento, divisao, finish_time, posicao_categoria, posicao_geral, run_total, workout_total, texto_ia, source_url, temporada')
      .eq('source_url', sourceUrl)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!resumo?.id) return null;

    const [diagResult, splitsResult] = await Promise.all([
      supabase
        .from('diagnostico_melhoria')
        .select('movement, metric, value, your_score, top_1, improvement_value, percentage, total_improvement')
        .eq('resumo_id', resumo.id),
      supabase
        .from('tempos_splits')
        .select('split_name, time')
        .eq('resumo_id', resumo.id),
    ]);

    const diagnosticos = diagResult.data || [];
    const splits = splitsResult.data || [];

    if (diagnosticos.length === 0 && splits.length === 0) return null;

    console.log(`[proxy-roxcoach] DB cache HIT for ${sourceUrl} — ${diagnosticos.length} diagnostics, ${splits.length} splits`);

    return {
      resumo: {
        nome_atleta: resumo.nome_atleta,
        temporada: resumo.temporada,
        evento: resumo.evento,
        divisao: resumo.divisao,
        finish_time: resumo.finish_time,
        posicao_categoria: resumo.posicao_categoria,
        posicao_geral: resumo.posicao_geral,
        run_total: resumo.run_total,
        workout_total: resumo.workout_total,
        texto_ia: resumo.texto_ia,
        source_url: resumo.source_url,
      },
      diagnostico_melhoria: diagnosticos.map((d: any) => ({
        movement: d.movement,
        metric: d.metric,
        value: d.value,
        your_score: d.your_score,
        top_1: d.top_1,
        improvement_value: d.improvement_value,
        percentage: d.percentage,
        total_improvement: d.total_improvement,
      })),
      tempos_splits: splits.map((s: any) => ({
        split_name: s.split_name,
        time: s.time,
      })),
      _source: 'db_cache',
    };
  } catch (err) {
    console.warn('[proxy-roxcoach] DB cache check failed:', getErrorMessage(err));
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth is OPTIONAL — allow anonymous calls for public diagnostic
    const authHeader = req.headers.get('Authorization');
    let userId = 'anonymous';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (authHeader) {
      try {
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch (authErr) {
        console.warn('[proxy-roxcoach] Auth validation failed, proceeding as anonymous:', getErrorMessage(authErr));
      }
    }

    const body = await req.json();
    const athlete_name = body?.athlete_name as string | undefined;
    const event_name = body?.event_name as string | undefined;
    const division = body?.division as string | undefined;
    const season_id = body?.season_id as string | number | undefined;
    const result_url = (body?.result_url || body?.url || '') as string;

    if (!athlete_name && !result_url) {
      return new Response(JSON.stringify({ error: 'athlete_name or result_url is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[proxy-roxcoach] User ${userId} | athlete=${athlete_name} event=${event_name} division=${division} season=${season_id}`);

    // 1. Check DB cache first (instant response if available)
    if (result_url) {
      const cached = await checkDbCache(supabaseAdmin, result_url);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 2. No cache — call external API
    let idp = '';
    let eventCode = '';
    if (result_url) {
      try {
        const urlObj = new URL(result_url);
        idp = urlObj.searchParams.get('idp') || '';
        eventCode = urlObj.searchParams.get('event') || '';
      } catch {
        const idpMatch = result_url.match(/idp=([^&]+)/);
        const eventMatch = result_url.match(/event=([^&]+)/);
        idp = idpMatch ? idpMatch[1] : '';
        eventCode = eventMatch ? eventMatch[1] : '';
      }
    }

    const athleteNameCandidates = Array.from(
      new Set([
        normalizeAthleteName(athlete_name),
        athlete_name?.trim() || '',
      ].filter(Boolean)),
    );

    if (athleteNameCandidates.length === 0) athleteNameCandidates.push('');

    let apiRes: Response | null = null;
    let lastStatus = 502;
    let lastErrorText = 'No response';

    const maxAttempts = 2;

    for (const athleteCandidate of athleteNameCandidates) {
      const apiUrl = buildExternalUrl({
        athleteName: athleteCandidate,
        eventName: event_name,
        division,
        seasonId: season_id,
        resultUrl: result_url,
        idp,
        eventCode,
      });

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 55000);

          console.log(`[proxy-roxcoach] Attempt ${attempt}/${maxAttempts} → ${apiUrl}`);
          apiRes = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (apiRes.ok) {
            const apiData = await apiRes.json();
            console.log(`[proxy-roxcoach] External API response keys: ${Object.keys(apiData).join(', ')}`);

            return new Response(JSON.stringify(apiData), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const errorText = await apiRes.text();
          lastStatus = apiRes.status;
          lastErrorText = errorText;

          if (apiRes.status >= 500 && attempt < maxAttempts) {
            console.warn(`[proxy-roxcoach] Attempt ${attempt} got ${apiRes.status}, retrying... ${errorText}`);
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }

          break;
        } catch (fetchErr) {
          const errMessage = getErrorMessage(fetchErr);
          lastErrorText = errMessage;
          console.warn(`[proxy-roxcoach] Attempt ${attempt} failed: ${errMessage}`);

          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }
        }
      }
    }

    console.error(`[proxy-roxcoach] External API error: ${lastStatus} - ${lastErrorText}`);
    return new Response(JSON.stringify({
      ok: false,
      upstream_status: lastStatus,
      upstream_error_detail: lastErrorText,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = getErrorMessage(err);
    console.error(`[proxy-roxcoach] Error:`, message);
    return new Response(JSON.stringify({ error: message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
