const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const COACH_PERSONALITY: Record<string, string> = {
  IRON: `Tom IRON (Comandante): Seco, direto, exigente. Sem rodeios. Frases curtas e impactantes. Zero emojis.`,
  PULSE: `Tom PULSE (Parceiro Técnico): Humano, técnico, consistente. Equilibre exigência com empatia. Zero emojis.`,
  SPARK: `Tom SPARK (Motivador): Energia positiva. Use 1-2 emojis (🔥💪). Aponte melhorias como oportunidades empolgantes.`,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      athlete_name = 'Atleta',
      main_limiter_name = 'Estação',
      main_limiter_percentile = 0,
      splits = [],
      coach_style = 'PULSE',
    } = body;

    const personality = COACH_PERSONALITY[coach_style] || COACH_PERSONALITY.PULSE;
    const splitsJson = JSON.stringify(splits, null, 2);

    const systemPrompt = `Você é um Head Coach de Elite de HYROX.
Sua missão é escrever a 'copy' (textos curtos e agressivos) para o dashboard do atleta. O sistema já calculou qual é a pior estação dele, você só precisa dar o 'esporro tático' e a visão de ganho.

${personality}

DADOS:
- Atleta: ${athlete_name}
- Pior Estação (Limitador Principal): ${main_limiter_name} (percentil ${main_limiter_percentile}%)
- Splits da Prova: ${splitsJson}

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
- NUNCA utilize segundos brutos no texto final (ex: "328s", "2515 segundos"). Converta TODOS os tempos absolutos e diferenças (gaps) para o formato humano MM:SS (ex: "05:28").
- Para converter: divida os segundos por 60 para obter minutos e use o resto como segundos.

BENCHMARKING REALISTA:
- NÃO compare o atleta com o "Top 1%" — isso é irrealista. Compare-o com o PERCENTIL IMEDIATAMENTE ACIMA dele (ex: se ele é Top 40%, o alvo é o Top 20%). Foque na evolução gradual e tangível.

DIRETRIZES:
- Use tom técnico, direto e focado em alta performance. Sem frescura.
- O JSON de saída NÃO pode ter marcação markdown, apenas o objeto puro.
- Textos curtos e densos (máximo 2 frases cada campo).

SAÍDA OBRIGATÓRIA (Formato JSON exato):
{
  "limitador_descricao": "Texto curto do impacto real com tempos em MM:SS. Ex: Sugou 02:00 a mais do que devia e quebrou seu ritmo de corrida.",
  "ganho_acao": "Ação direta. Ex: Destravar a técnica do Sled Pull →",
  "ganho_descricao": "O que ele ganha com tempos em MM:SS. Ex: Te coloca no Top 20% e preserva a lombar para o restante da prova.",
  "proximos_passos": ["Foco brutal em força de tração", "Recuperação ativa na transição"]
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Gere os insights do coach com base nos dados fornecidos. Retorne APENAS o JSON puro, sem markdown. Todos os tempos devem estar em MM:SS.' },
        ],
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[generate-coach-insights] Gateway error ${response.status}: ${errText}`);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit excedido, tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes para IA.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: `Erro na API de IA: ${response.status}` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const rawText = result?.choices?.[0]?.message?.content || '';

    console.log(`[generate-coach-insights] Raw response for ${athlete_name}: ${rawText.substring(0, 200)}`);

    // Parse JSON from response (strip markdown fences if present)
    let insights;
    try {
      const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      insights = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error(`[generate-coach-insights] JSON parse error: ${parseErr}`);
      return new Response(JSON.stringify({ error: 'Falha ao interpretar resposta da IA' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ insights }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[generate-coach-insights] Error: ${message}`);
    return new Response(JSON.stringify({ error: message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
