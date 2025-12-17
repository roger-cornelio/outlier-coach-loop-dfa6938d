import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkoutBlock {
  type: string;
  title: string;
  content: string;
}

interface RequestBody {
  coachStyle: 'IRON' | 'PULSE' | 'SPARK';
  blocks: WorkoutBlock[];
  dayName: string;
}

const COACH_PROMPTS = {
  IRON: `Você é o COACH IRON - um treinador sério, direto e exigente. Seu estilo é militar, sem rodeios. Você usa poucas palavras mas cada uma tem peso. Não aceita desculpas e espera comprometimento total. Use frases curtas e impactantes.`,
  
  PULSE: `Você é o COACH PULSE - um treinador motivador, humano e consistente. Você equilibra exigência com empatia. Entende que cada pessoa tem seu ritmo mas não deixa ninguém desistir. Usa uma linguagem encorajadora mas realista.`,
  
  SPARK: `Você é o COACH SPARK - um treinador leve, entusiasta e bem-humorado. Você torna o treino divertido sem perder o foco. Usa analogias criativas, emojis ocasionais e mantém o clima positivo. Celebra cada vitória, grande ou pequena.`
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coachStyle, blocks, dayName }: RequestBody = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build workout summary for context
    const blockTypes = blocks.map(b => b.type);
    const blockTitles = blocks.map(b => b.title).join(', ');
    
    const systemPrompt = COACH_PROMPTS[coachStyle] || COACH_PROMPTS.PULSE;
    
    const userPrompt = `Baseado no treino de ${dayName} que inclui os seguintes blocos: ${blockTitles}.

Tipos de exercícios: ${[...new Set(blockTypes)].join(', ')}

Gere um feedback motivacional de 2-3 frases sobre o OBJETIVO do treino de hoje. Seja específico sobre o que o atleta vai desenvolver (força, resistência, capacidade aeróbica, etc). Mantenha seu estilo de coach consistente.

Responda APENAS com o feedback, sem introduções ou explicações adicionais.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao gerar feedback" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content || "Treino preparado para você evoluir!";

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error generating feedback:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
