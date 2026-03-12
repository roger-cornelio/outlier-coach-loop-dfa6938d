const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const COACH_PERSONALITY: Record<string, string> = {
  IRON: `Tom de comandante — seco, direto, sem rodeios. Reconheça mérito com sobriedade. Sem emojis.`,
  PULSE: `Tom de parceiro técnico — humano, preciso, profissional. Equilibre exigência com empatia. Sem emojis.`,
  SPARK: `Tom motivador — energia positiva, celebre o progresso. Use 1-2 emojis com moderação (🔥 💪). Linguagem descontraída mas competente.`,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      athlete_name = 'Atleta',
      finish_time = '--:--',
      division = 'Open',
      gap_formatted = '0min',
      months = 0,
      rate_per_month = 0,
      tier_label = 'Intermediário',
      top3_gaps = [],
      coach_style = 'PULSE',
    } = body;

    const personality = COACH_PERSONALITY[coach_style] || COACH_PERSONALITY.PULSE;

    const top3Text = top3_gaps.length > 0
      ? top3_gaps.map((g: { movement: string; gap: string }, i: number) => `${i + 1}. ${g.movement}: gap de ${g.gap}`).join('\n')
      : 'Nenhum gargalo identificado.';

    const systemPrompt = `Você é um analista de performance de elite especializado em HYROX.

${personality}

Escreva uma PROJEÇÃO DE EVOLUÇÃO profissional e concisa (máximo 3 parágrafos curtos, total ~120 palavras) para o atleta abaixo.

DADOS:
- Nome: ${athlete_name}
- Tempo atual: ${finish_time}
- Divisão: ${division}
- Nível de Training Age: ${tier_label}
- Gap total para Meta OUTLIER: ${gap_formatted}
- Taxa de evolução estimada: ${rate_per_month}s/mês
- Projeção: ~${months} ${months === 1 ? 'mês' : 'meses'} para eliminar o gap
- Top 3 gargalos:
${top3Text}

DIRETRIZES:
- Fale diretamente com o atleta ("Você").
- Português do Brasil (PT-BR).
- Seja específico: cite os números exatos (gap, meses, taxa).
- Explique brevemente a lógica da projeção (Training Age → taxa de evolução).
- Termine com uma frase de direcionamento prático (o que priorizar).
- NÃO use Markdown (sem ###, sem ** negrito **). Texto puro corrido.
- NÃO repita o cabeçalho "Projeção de Evolução".`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 400,
        messages: [{ role: 'user', content: systemPrompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[generate-evolution-projection] Anthropic error ${response.status}: ${errText}`);
      return new Response(JSON.stringify({ error: `Erro na API de IA: ${response.status}` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const text = result?.content?.[0]?.text || '';

    console.log(`[generate-evolution-projection] Generated ${text.length} chars for ${athlete_name}`);

    return new Response(JSON.stringify({ texto: text }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[generate-evolution-projection] Error: ${message}`);
    return new Response(JSON.stringify({ error: message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
