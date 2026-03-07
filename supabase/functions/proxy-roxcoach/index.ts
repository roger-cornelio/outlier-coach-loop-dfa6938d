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

    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[proxy-roxcoach] Calling external API for user ${user.id}`);

    // Call the external diagnostic API with retry for cold-start timeouts
    const apiUrl = `https://api-outlier.onrender.com/diagnostico?url=${encodeURIComponent(url)}`;
    
    let apiRes: Response | null = null;
    const maxAttempts = 2;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout
        
        console.log(`[proxy-roxcoach] Attempt ${attempt}/${maxAttempts}`);
        apiRes = await fetch(apiUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        if (apiRes.ok) break;
        
        // If 500 on first attempt, retry once (likely cold start)
        if (apiRes.status >= 500 && attempt < maxAttempts) {
          const errorText = await apiRes.text();
          console.warn(`[proxy-roxcoach] Attempt ${attempt} got ${apiRes.status}, retrying... ${errorText}`);
          await new Promise(r => setTimeout(r, 3000)); // wait 3s before retry
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

    // Forward the full response from the external API
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
