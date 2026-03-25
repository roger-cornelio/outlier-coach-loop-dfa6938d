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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[generate-diagnostic-ai] LOVABLE_API_KEY not configured');
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

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
- NUNCA utilize segundos brutos no texto final (ex: "328s", "2515 segundos"). Todos os tempos devem estar no formato humano MM:SS (ex: "05:28") ou HH:MM:SS quando aplicável.
- NUNCA exiba fórmulas matemáticas, conversões de segundos, frações ou o passo a passo de cálculos no texto. Oculte totalmente o raciocínio matemático. Entregue APENAS o resultado final formatado de forma elegante e direta.

REGRA ANTI-METALINGUAGEM (OBRIGATÓRIA):
- NUNCA explique a metodologia de comparação ao atleta. Não diga frases como "em vez de comparar com o Top 1%, vamos usar..." ou "ao invés da Elite, usaremos...".
- Não mencione "Top 1%", "Elite" ou qualquer benchmark que não seja o Próximo Nível Competitivo do atleta.
- Trate o percentil alvo (percentil imediatamente acima do atleta) como o ÚNICO referencial existente. Fale sobre ele de forma absoluta e direta.

BENCHMARKING:
- Compare o atleta com o Próximo Nível Competitivo (percentil imediatamente acima dele). Este é o ÚNICO benchmark válido. Os tempos de referência devem ser críveis e calculados com base na média competitiva real da divisão dele.

DIRETRIZES DE COMPORTAMENTO:
- Fale diretamente com o(s) atleta(s) usando "Você" ou "Vocês".
- Seja cirúrgico: use os números exatos do JSON para embasar seus argumentos, mas nunca mostre as contas.
- Escreva em Português do Brasil (PT-BR).
- Use formatação Markdown (### para os 3 títulos principais e **negrito** para destacar os tempos/métricas).

ESTRUTURA OBRIGATÓRIA DA RESPOSTA EM MARKDOWN:

### 1. LEITURA DA MÁQUINA
Dê os parabéns pelo tempo total. Identifique imediatamente a estação ou corrida onde a performance foi mais dominante (mais próxima do percentil alvo ou com o melhor tempo relativo). Faça-os sentirem que têm potencial de evolução clara.

### 2. O GARGALO TÁTICO
Olhe os dados e aponte sem rodeios a estação, corrida ou Roxzone (transição) que mais prejudicou o tempo final. Explique o impacto disso usando tempos em MM:SS.
Inclua uma análise de PACE: sabendo que o total de corrida na HYROX é 8km, apresente o Pace Médio (resultado direto em min/km). Critique a variação entre o split de corrida mais rápido e o mais lento, e instrua sobre o benefício de uma Estratégia de Pace Constante.

### 3. PRESCRIÇÃO DE TREINO
Com base no gargalo identificado acima, forneça 2-3 diretrizes práticas e extremamente específicas de treinamento. Uma delas deve incluir o Pace Alvo (min/km) que o atleta precisa sustentar para atingir o tempo de corrida do próximo nível.`;

    const userContent = `DADOS DA CORRIDA:
- Nome(s): ${athlete_name}
- Evento: ${event_name}
- Divisão: ${division}
- Tempo Final: ${finish_time}

TABELA DE SPLITS E DIAGNÓSTICO:
${jsonPayload}

Analise esses dados e gere o parecer completo seguindo a estrutura obrigatória.`;

    console.log(`[generate-diagnostic-ai] Coach style: ${coach_style}, athlete: ${athlete_name}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[generate-diagnostic-ai] AI gateway error ${response.status}: ${errText}`);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Muitas requisições. Aguarde um momento e tente novamente.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Entre em contato com o suporte.' }), {
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
