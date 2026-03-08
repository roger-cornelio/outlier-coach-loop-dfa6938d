import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { athlete_name, event_name, division, season_id, result_url } = body;

    // Validate required fields
    if (!athlete_name && !result_url) {
      return new Response(JSON.stringify({ error: 'athlete_name or result_url is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[proxy-roxcoach] User ${user.id} | athlete=${athlete_name} event=${event_name} division=${division} season=${season_id}`);

    // Extract idp and event from result_url
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

    // Build query parameters for the external API
    const params = new URLSearchParams();
    if (athlete_name) params.set('athlete_name', athlete_name);
    if (event_name) params.set('event_name', event_name);
    if (division) params.set('division', division);
    if (season_id) params.set('season_id', String(season_id));
    if (result_url) params.set('result_url', result_url);
    if (idp) params.set('idp', idp);
    if (eventCode) params.set('event', eventCode);

    const apiUrl = `https://api-outlier.onrender.com/diagnostico?${params.toString()}`;

    let apiRes: Response | null = null;
    const maxAttempts = 2;

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

        if (apiRes.ok) break;

        if (apiRes.status >= 500 && attempt < maxAttempts) {
          const errorText = await apiRes.text();
          console.warn(`[proxy-roxcoach] Attempt ${attempt} got ${apiRes.status}, retrying... ${errorText}`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
      } catch (fetchErr) {
        console.warn(`[proxy-roxcoach] Attempt ${attempt} failed: ${fetchErr.message}`);
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        throw new Error(`API externa indisponível após ${maxAttempts} tentativas: ${fetchErr.message}`);
      }
    }

    if (!apiRes || !apiRes.ok) {
      const status = apiRes?.status || 502;
      const errorText = apiRes ? await apiRes.text() : 'No response';
      console.error(`[proxy-roxcoach] External API error: ${status} - ${errorText}`);
      return new Response(JSON.stringify({ error: `Erro na API externa: ${status}` }), {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiData = await apiRes.json();
    console.log(`[proxy-roxcoach] External API response keys: ${Object.keys(apiData).join(', ')}`);

    return new Response(JSON.stringify(apiData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(`[proxy-roxcoach] Error:`, err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
