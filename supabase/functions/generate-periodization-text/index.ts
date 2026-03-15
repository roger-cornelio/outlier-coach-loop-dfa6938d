import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gaps } = await req.json();

    if (!gaps || !Array.isArray(gaps) || gaps.length === 0) {
      return new Response(
        JSON.stringify({ texto: "Foco em consolidação: desenvolvimento equilibrado de todas as valências físicas." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const gapsDescription = gaps.map((g: any, i: number) => 
      `${i + 1}. Movimento: ${g.movement || g.metric}, Métrica: ${g.metric}, Gap de melhoria: ${g.improvement_value}s`
    ).join("\n");

    const systemPrompt = `Você é um preparador físico especialista em HYROX e periodização esportiva. Gere EXATAMENTE 1-2 frases curtas sobre o foco de treino da próxima semana.

REGRAS ABSOLUTAS:
- Use linguagem de periodização esportiva: valências físicas (resistência aeróbica, potência, força, capacidade anaeróbica, estabilidade de core, eficiência neuromuscular)
- NUNCA cite nomes de estações HYROX (Ski Erg, Sled Push, Wall Balls, etc.)
- NUNCA cite nomes de exercícios específicos
- NUNCA use emojis
- NUNCA use "próxima semana" — use "próximos treinos" ou "próximo ciclo"
- Tom técnico mas acessível — como um treinador explicando para o atleta
- Máximo 2 frases
- Conecte os gaps com capacidades físicas reais
- Termine com uma frase que mostre impacto no tempo final

EXEMPLO BOM:
"Os próximos treinos priorizarão o desenvolvimento de resistência aeróbica sob fadiga acumulada e potência de membros inferiores em regime de alta repetição — as capacidades com maior impacto direto no seu tempo final."

EXEMPLO RUIM:
"Os treinos terão foco em Ski Erg e Sandbag Lunges."`;

    const userPrompt = `Baseado nos maiores gargalos de performance deste atleta HYROX:\n\n${gapsDescription}\n\nGere o texto de periodização (1-2 frases). Responda APENAS com o texto, sem introduções.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits insufficient" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const texto = data.choices?.[0]?.message?.content?.trim() || 
      "Foco em consolidação: desenvolvimento equilibrado de todas as valências físicas.";

    console.log(`[generate-periodization-text] Generated: ${texto}`);

    return new Response(JSON.stringify({ texto }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error generating periodization text:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
