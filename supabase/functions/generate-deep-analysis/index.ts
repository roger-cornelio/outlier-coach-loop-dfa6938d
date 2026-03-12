const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
      finish_time = '--:--',
      division = 'Open',
      diagnosticos = [],
      splits = [],
    } = body;

    const splitsJson = JSON.stringify({ diagnosticos, splits }, null, 2);

    const systemPrompt = `Você é um Head Coach de Elite focado na biomecânica e estratégia da HYROX.
Sua missão é fazer uma dissecagem profunda (Raio-X) da corrida do atleta (ou dupla).

DADOS DO ATLETA:
- Nome: ${athlete_name} | Tempo: ${finish_time} | Divisão: ${division}

DADOS DOS SPLITS:
${splitsJson}

DIRETRIZES:
- Escreva em PT-BR usando formatação Markdown (use ### para os títulos).
- Seja denso e analítico: fale sobre pacing (ritmo), fadiga acumulada, gestão de energia e tempo de transição (Roxzone).
- Use os dados matemáticos do JSON para comprovar suas teses.

ESTRUTURA OBRIGATÓRIA DA RESPOSTA:

### 🔬 ANÁLISE BIOMECÂNICA E RITMO
(Faça uma análise geral de como o atleta lidou com o volume da prova. O ritmo de corrida foi consistente? A Roxzone sugere muita quebra de ritmo ou transição lenta?)

### 📉 ONDE A PROVA FOI DECIDIDA (Gargalos Críticos)
(Aprofunde-se nas estações com maior % de defasagem em relação ao Top 1%. Não apenas cite os números, mas explique o provável motivo físico/técnico: falta de força nas pernas, pegada fraca, etc.)

### 📈 ONDE VOCÊ MOSTROU FORÇA (Destaques)
(Identifique e elogie as estações onde o atleta bateu a meta, chegou perto ou teve a melhor performance relativa).

### 📋 PROTOCOLO DE CHOQUE (Próximas 4 semanas)
(Prescreva um bloco de 3 diretrizes técnicas e físicas pesadas para corrigir os gargalos identificados e transformar as fraquezas em força).`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

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
          { role: 'user', content: 'Gere o Raio-X Tático completo com base nos dados fornecidos.' },
        ],
        max_tokens: 1500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[generate-deep-analysis] Gateway error ${response.status}: ${errText}`);
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
    const text = result?.choices?.[0]?.message?.content || '';

    console.log(`[generate-deep-analysis] Generated ${text.length} chars for ${athlete_name}`);

    return new Response(JSON.stringify({ texto: text }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[generate-deep-analysis] Error: ${message}`);
    return new Response(JSON.stringify({ error: message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
