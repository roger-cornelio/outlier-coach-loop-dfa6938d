const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const COACH_PERSONALITY: Record<string, string> = {
  IRON: `PERSONALIDADE DO TREINADOR: IRON (Comandante)
- Seja seco, direto e exigente. Sem rodeios ou elogios excessivos.
- Use frases curtas e impactantes. Tom de comandante experiente que não tolera desculpas.
- Reconheça mérito com sobriedade, nunca com entusiasmo. "Bom trabalho" é o máximo.
- Aponte falhas sem suavizar. O atleta precisa ouvir a verdade crua.
- Nunca use emojis. Nunca seja "fofinho".`,

  PULSE: `PERSONALIDADE DO TREINADOR: PULSE (Parceiro Técnico)
- Seja humano, técnico e consistente. Tom de treinador que conhece o atleta há anos.
- Equilibre exigência com empatia. Reconheça o esforço antes de apontar melhorias.
- Use linguagem precisa e objetiva, sem ser frio.
- Construa confiança através de análise competente e orientação clara.
- Nunca use emojis. Mantenha tom profissional e acolhedor.`,

  SPARK: `PERSONALIDADE DO TREINADOR: SPARK (Motivador)
- Energia positiva e motivadora. Celebre as conquistas antes de tudo.
- Use emojis com moderação (🔥 💪 🚀) para dar energia ao texto.
- Linguagem descontraída mas competente. O atleta deve sentir que é capaz de tudo.
- Aponte melhorias como oportunidades empolgantes, não como falhas.
- Faça o atleta terminar a leitura querendo treinar imediatamente.`,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      console.error('[generate-diagnostic-ai] ANTHROPIC_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'API key não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      athlete_name = 'Atleta',
      event_name = 'HYROX',
      division = 'Open',
      finish_time = '--:--',
      splits_data = [],
      diagnostic_data = [],
      coach_style = 'PULSE',
    } = body;

    const jsonPayload = JSON.stringify({ splits_data, diagnostic_data }, null, 2);
    const personality = COACH_PERSONALITY[coach_style] || COACH_PERSONALITY.PULSE;

    const systemPrompt = `Você é um Treinador de Elite de alta performance especializado em competições HYROX. 
Sua missão é analisar os dados de uma corrida de um atleta (ou dupla), ser direto, altamente técnico, encorajador e focado em resultados.

${personality}

DADOS DA CORRIDA:
- Nome(s): ${athlete_name}
- Evento: ${event_name}
- Divisão: ${division}
- Tempo Final: ${finish_time}

TABELA DE SPLITS E DIAGNÓSTICO VS TOP 1%:
${jsonPayload}

DIRETRIZES DE COMPORTAMENTO:
- Fale diretamente com o(s) atleta(s) usando "Você" ou "Vocês".
- Seja cirúrgico: use os números exatos do JSON para embasar seus argumentos.
- Escreva em Português do Brasil (PT-BR).
- Use formatação Markdown (### para os 3 títulos principais e **negrito** para destacar os tempos/métricas).

ESTRUTURA OBRIGATÓRIA DA RESPOSTA EM MARKDOWN:

### 1. LEITURA DA MÁQUINA
Dê os parabéns pelo tempo total. Identifique imediatamente a estação ou corrida onde a performance foi mais dominante (mais próxima do Top 1% ou com o melhor tempo). Faça-os sentirem que têm potencial de pódio.

### 2. O GARGALO TÁTICO
Olhe os dados e aponte sem rodeios a estação, corrida ou Roxzone (transição) que mais prejudicou o tempo final. Ex: "Seu Sled Push sugou 2 minutos a mais do que o aceitável...". Explique o impacto disso.

### 3. PRESCRIÇÃO DE TREINO
Com base no gargalo identificado acima, forneça 2 diretrizes práticas e extremamente específicas de treinamento para a próxima semana.`;

    console.log(`[generate-diagnostic-ai] Coach style: ${coach_style}, athlete: ${athlete_name}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [
          { role: 'user', content: systemPrompt },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[generate-diagnostic-ai] Anthropic error ${response.status}: ${errText}`);
      return new Response(JSON.stringify({ error: `Erro na API de IA: ${response.status}` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const text = result?.content?.[0]?.text || '';

    console.log(`[generate-diagnostic-ai] Generated ${text.length} chars for ${athlete_name}`);

    return new Response(JSON.stringify({ texto_ia: text }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[generate-diagnostic-ai] Error: ${message}`);
    return new Response(JSON.stringify({ error: message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
