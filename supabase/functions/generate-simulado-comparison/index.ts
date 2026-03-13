import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { simulado_a, simulado_b } = await req.json();

    if (!simulado_a) {
      return new Response(
        JSON.stringify({ error: "Simulado A é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isComparison = !!simulado_b;

    const systemPrompt = `Você é o 'Coach Outlier', um Treinador de Elite de HYROX.
Sua missão é analisar os tempos de treino (simulados) do atleta. Você receberá os dados de UM ou DOIS simulados. Se houver dois, seu foco ABSOLUTO deve ser na EVOLUÇÃO (o que melhorou e o que piorou).

DIRETRIZES:
- Tom incisivo, técnico e focado em alta performance.
- Formatação em Markdown (use ### para subtítulos e negrito para destacar os tempos/deltas).
- Nunca use as siglas "IA" ou "AI" no texto.

${isComparison ? `ESTRUTURA PARA COMPARAÇÃO DE DOIS SIMULADOS:
### 📊 VEREDITO DA EVOLUÇÃO
(Resumo agressivo sobre se o treino das últimas semanas deu resultado geral ou não).
### 📈 ONDE O TREINO PAGOU DIVIDENDOS (Melhorias)
(Aponte onde o tempo caiu drasticamente. Elogie a adaptação mecânica ou de cardio nessa estação).
### ⚠️ SINAIS DE ALERTA (Pioras ou Estagnação)
(Aponte onde o tempo subiu ou travou. Explique fisiologicamente o que pode ter causado essa piora: fadiga acumulada, pacing errado, falta de força).
### 🎯 DIRETRIZ PARA O PRÓXIMO BLOCO
(Prescreva 1 ou 2 ajustes táticos imediatos baseados na comparação).` : `ESTRUTURA PARA ANÁLISE INDIVIDUAL:
### 📊 PANORAMA GERAL
(Resumo do desempenho geral do atleta neste simulado).
### 💪 PONTOS FORTES
(Quais estações e runs mostraram os melhores tempos relativos).
### ⚠️ PONTOS DE ATENÇÃO
(Onde o atleta perdeu mais tempo e por quê fisiologicamente).
### 🎯 RECOMENDAÇÕES TÁTICAS
(Prescreva 2-3 ajustes imediatos para o próximo ciclo de treino).`}`;

    const userContent = isComparison
      ? `Analise a EVOLUÇÃO entre estes dois simulados:\n\nSIMULADO BASE (A) - ${simulado_a.division} - ${simulado_a.date}:\nTempo Total: ${simulado_a.total_time}s\nRoxzone: ${simulado_a.roxzone_time}s\nSplits: ${JSON.stringify(simulado_a.splits)}\n\nSIMULADO COMPARATIVO (B) - ${simulado_b.division} - ${simulado_b.date}:\nTempo Total: ${simulado_b.total_time}s\nRoxzone: ${simulado_b.roxzone_time}s\nSplits: ${JSON.stringify(simulado_b.splits)}`
      : `Analise este simulado individual:\n\nSIMULADO - ${simulado_a.division} - ${simulado_a.date}:\nTempo Total: ${simulado_a.total_time}s\nRoxzone: ${simulado_a.roxzone_time}s\nSplits: ${JSON.stringify(simulado_a.splits)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde um momento e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar diagnóstico. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "Não foi possível gerar o diagnóstico.";

    return new Response(
      JSON.stringify({ analysis: text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-simulado-comparison error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
