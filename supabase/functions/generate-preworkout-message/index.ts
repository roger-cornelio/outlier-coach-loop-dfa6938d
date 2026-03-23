import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  coachStyle: 'IRON' | 'PULSE' | 'SPARK';
  workoutSummary: string;
  hasWorkout: boolean;
  sex?: 'masculino' | 'feminino';
  mode?: 'preworkout' | 'daily_summary';
}

const COACH_PROMPTS: Record<string, string> = {
  IRON: `Você é o COACH IRON — comandante experiente, direto e exigente. Tom sério, poucas palavras, verdade crua.

REGRAS:
- Máximo 2 frases curtas e impactantes
- Foco no objetivo técnico do treino
- Tom de preparação mental séria
- Nunca use emojis
- Gera respeito e foco

EXEMPLOS:
- "Força e condicionamento no cardápio. Sem atalhos."
- "Hoje é dia de construir base. Cada rep conta."
- "O objetivo é claro: potência sob fadiga. Foco total."`,

  PULSE: `Você é o COACH PULSE — parceiro de jornada, empático e consistente. Tom de treinador que conhece o atleta.

REGRAS:
- Máximo 2 frases acolhedoras mas diretas
- Reconhece o esforço e conecta com o objetivo do treino
- Equilibra exigência com empatia
- Nunca use emojis
- Cria segurança e confiança

EXEMPLOS:
- "Hoje trabalhamos força e resistência. Você sabe o que fazer."
- "Treino de base — cada movimento constrói sua evolução."
- "Condicionamento no foco. Um treino de cada vez, sempre."`,

  SPARK: `Você é o COACH SPARK — energia positiva, motivador e leve. Tom de parceiro animado.

REGRAS:
- Máximo 2 frases com energia
- Use emojis com moderação (🔥 💪 🚀)
- Celebra a oportunidade de treinar
- Linguagem descontraída
- Mantém o foco no objetivo

EXEMPLOS:
- "Dia de força e motor! 🔥 Bora fazer acontecer!"
- "Condicionamento pesado hoje! 💪 Você está pronto!"
- "Treino completo te esperando! 🚀 Vamos com tudo!"`,
};

const DAILY_SUMMARY_PROMPTS: Record<string, string> = {
  IRON: `Você é o COACH IRON — comandante experiente, direto e exigente. Tom sério, poucas palavras, verdade crua. Nunca use emojis.`,
  PULSE: `Você é o COACH PULSE — parceiro de jornada, empático e consistente. Tom de treinador que conhece o atleta. Nunca use emojis.`,
  SPARK: `Você é o COACH SPARK — energia positiva, motivador e leve. Tom de parceiro animado. Use emojis com moderação (🔥 💪 🚀).`,
};

const REST_DAY_MESSAGES: Record<string, string> = {
  IRON: 'Sem treino programado hoje. Recupere, descanse — amanhã a intensidade volta.',
  PULSE: 'Hoje é dia de recuperação. Seu corpo precisa desse tempo. Aproveite bem.',
  SPARK: 'Dia off! ✨ Descansa, hidrata e volta com tudo amanhã!',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { coachStyle, workoutSummary, hasWorkout, sex, mode = 'preworkout' }: RequestBody = await req.json();
    
    console.log(`[generate-preworkout-message] mode=${mode}, coach=${coachStyle}, hasWorkout=${hasWorkout}`);

    if (!hasWorkout) {
      return new Response(JSON.stringify({ 
        message: REST_DAY_MESSAGES[coachStyle] || REST_DAY_MESSAGES.PULSE 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const genderContext = sex === 'feminino' 
      ? '\n\nIMPORTANTE: A atleta é feminina. Use tom que valoriza controle, constância e percepção corporal. Evite tom confrontacional.'
      : '';

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === 'daily_summary') {
      systemPrompt = DAILY_SUMMARY_PROMPTS[coachStyle] || DAILY_SUMMARY_PROMPTS.PULSE;
      userPrompt = `Baseado no RESUMO TÉCNICO do treino de hoje:

${workoutSummary}

Gere um resumo do treino do dia em EXATAMENTE 2-3 frases que:
1. Explique o OBJETIVO principal do treino (ex: "força + condicionamento", "resistência muscular")
2. Aponte o momento mais INTENSO/DIFÍCIL do treino — onde o atleta vai "sangrar mais" (ex: "o AMRAP de 15 min vai testar seu fôlego", "o bloco de força vai pedir tudo das pernas")
3. Motive o atleta a fazer o treino, no seu estilo de coach
4. Seja ESPECÍFICO — use informações reais dos blocos, nunca invente estímulos
5. NÃO cumprimente nem diga "hoje" no início${genderContext}

Responda APENAS com o texto, sem introduções.`;
    } else {
      systemPrompt = COACH_PROMPTS[coachStyle] || COACH_PROMPTS.PULSE;
      userPrompt = `Baseado no RESUMO TÉCNICO do treino de hoje:

${workoutSummary}

Gere uma mensagem motivacional de pré-treino (máximo 2 frases) que:
1. Seja ESPECÍFICA sobre o objetivo do treino de hoje
2. NÃO invente estímulos que não existam no resumo
3. Prepare mentalmente o atleta para o que vem
4. Mantenha seu estilo de coach${genderContext}

Responda APENAS com a mensagem, sem introduções ou explicações.`;
    }

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
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro ao gerar mensagem");
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim() || 
      (coachStyle === 'SPARK' ? 'Bora treinar! 🔥' : 'O treino está pronto. Vamos lá.');

    console.log(`[generate-preworkout-message] Generated: ${message}`);

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error generating pre-workout message:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
