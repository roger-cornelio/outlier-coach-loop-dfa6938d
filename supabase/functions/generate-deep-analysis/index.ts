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

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
- NUNCA utilize segundos brutos no texto final (ex: "328s", "2515 segundos"). Todos os tempos devem estar no formato humano MM:SS (ex: "05:28") ou HH:MM:SS quando aplicável.
- NUNCA exiba fórmulas matemáticas, conversões de segundos, frações ou o passo a passo de cálculos no texto. Oculte totalmente o raciocínio matemático. Entregue APENAS o resultado final formatado de forma elegante e direta.
- Escreva em PT-BR usando formatação Markdown (use ### para os títulos).
- Seja denso e analítico: fale sobre pacing (ritmo), fadiga acumulada, gestão de energia e tempo de transição (Roxzone).
- Use os dados matemáticos do JSON para embasar suas teses, mas NUNCA mostre as contas.

REGRA ANTI-METALINGUAGEM (OBRIGATÓRIA):
- NUNCA explique a metodologia de comparação ao atleta. Não diga frases como "em vez de comparar com o Top 1%, vamos usar..." ou "ao invés da Elite, usaremos...".
- Não mencione "Top 1%", "Elite" ou qualquer benchmark que não seja o Próximo Nível Competitivo do atleta.
- Trate o percentil alvo (percentil imediatamente acima do atleta) como o ÚNICO referencial existente. Fale sobre ele de forma absoluta e direta, como se fosse o único benchmark do mundo.

BENCHMARKING:
- Compare o atleta com o Próximo Nível Competitivo (percentil imediatamente acima dele). Este é o ÚNICO benchmark válido.
- Os tempos de referência devem ser críveis e calculados com base na média competitiva real da divisão dele.

CONCISÃO E FOCO:
- Seja cirúrgico, objetivo e evite prolixidade. Na seção de Gargalos Críticos, foque a análise profunda APENAS nos 2 ou 3 maiores gargalos do atleta. Para as demais estações, seja extremamente breve ou omita se a defasagem for insignificante. O texto deve ser dinâmico e denso em dados, não em volume de palavras.

ESTRUTURA OBRIGATÓRIA DA RESPOSTA:

### 🔬 ANÁLISE BIOMECÂNICA E RITMO
(Faça uma análise geral de como o atleta lidou com o volume da prova. O ritmo de corrida foi consistente? A Roxzone sugere muita quebra de ritmo ou transição lenta?)

### 📉 ONDE A PROVA FOI DECIDIDA (Gargalos Críticos)
(Aprofunde-se nas 2-3 estações com maior defasagem em relação ao percentil alvo. Não apenas cite os números, mas explique o provável motivo físico/técnico: falta de força nas pernas, pegada fraca, etc.)

### 📈 ONDE VOCÊ MOSTROU FORÇA (Destaques)
(Identifique e elogie as estações onde o atleta bateu a meta, chegou perto ou teve a melhor performance relativa).

### 🏃 ANÁLISE DE PACE
(O volume total de corrida na HYROX é 8km. Apresente:
1. **Pace Médio Realizado**: Resultado direto em min/km.
2. **Pace Alvo**: O pace constante necessário para atingir o tempo de corrida do próximo nível.
3. **Variação de Splits**: Critique construtivamente a diferença entre o split de corrida mais rápido e o mais lento. Instrua sobre o benefício de uma Estratégia de Pace Constante.)

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
          { role: 'user', content: 'Gere o Raio-X Tático completo com base nos dados fornecidos. Lembre-se: todos os tempos em MM:SS, sem mostrar cálculos, e análise de pace obrigatória.' },
        ],
        max_tokens: 4000,
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
