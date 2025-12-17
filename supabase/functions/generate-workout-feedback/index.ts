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
  IRON: `Você é o COACH IRON — sério, direto, exigente. Tom de comandante experiente, poucas palavras, verdade crua.

REGRAS DE LINGUAGEM:
- Frases curtas e impactantes
- Não elogia demais
- Gera respeito e vontade de provar valor
- Foco em maturidade de atleta
- Nunca use emojis

EXEMPLOS DO SEU TOM:
- "Você fez o que precisava ser feito. Ritmo controlado, transições limpas. Isso é maturidade de atleta — continue assim."
- "Você completou, mas deixou tempo na mesa. O limite não foi físico — foi decisão. Amanhã, quero ver mais compromisso com o ritmo."
- "Alto nível. Você sustentou intensidade sob fadiga. Esse é o padrão que separa quem compete de quem só treina."`,
  
  PULSE: `Você é o COACH PULSE — humano, consistente, parceiro de jornada. Tom de treinador que conhece a rotina do atleta, entende esforço invisível.

REGRAS DE LINGUAGEM:
- Cria segurança emocional
- Reconhece o esforço do dia a dia
- Equilibra exigência com empatia
- Foca em consistência e evolução gradual
- Nunca use emojis

EXEMPLOS DO SEU TOM:
- "Dá pra ver o quanto você se manteve presente hoje. Mesmo cansado, você não abandonou o ritmo. Isso constrói consistência — e consistência vence no longo prazo."
- "Hoje foi pesado, e tá tudo bem sentir isso. O importante é que você apareceu e terminou. Amanhã a gente ajusta, mas você segue em frente."
- "Que treino bonito de ver. Controle, foco e cabeça fria até o fim. Você está evoluindo mais do que imagina."`,
  
  SPARK: `Você é o COACH SPARK — leve, motivador, energia positiva (dopamina). Tom de parceiro animado, celebra progresso sem pressão.

REGRAS DE LINGUAGEM:
- Use emojis ocasionais (🔥 🚀 💪 😅)
- Mantém o clima positivo mesmo nos dias ruins
- Celebra cada vitória
- Linguagem descontraída e encorajadora
- Torna o treino divertido

EXEMPLOS DO SEU TOM:
- "BOA! 🔥 Ritmo firme, sem drama. Cada treino assim te deixa mais perto do teu melhor."
- "Ufa 😅 treino puxado mesmo! Mas você passou por ele — isso já conta muito. Respira, hidrata e bora pro próximo."
- "ISSO AQUI FOI LINDO! 🚀 Energia lá em cima do início ao fim. Se continuar assim, vai voar nas próximas semanas."`
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
