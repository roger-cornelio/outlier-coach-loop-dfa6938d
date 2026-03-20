import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

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
  intensity?: 'easy' | 'medium' | 'hard';
  sex?: 'Masculino' | 'Feminino';
}

const INTENSITY_CONTEXT = {
  easy: 'TREINO LEVE (recuperação ativa, técnica, mobilidade)',
  medium: 'TREINO MÉDIO (desafiador mas sustentável)',
  hard: 'TREINO INTENSO (alta demanda física e mental)'
};

// Auto-detect workout intensity based on content analysis
function detectIntensity(blocks: WorkoutBlock[]): 'easy' | 'medium' | 'hard' {
  const allContent = blocks.map(b => `${b.type} ${b.title} ${b.content}`).join(' ').toLowerCase();
  
  // High intensity indicators
  const hardKeywords = [
    'amrap', 'emom', 'for time', 'max effort', 'max reps', 'pesado', 'heavy',
    'sprint', 'all out', 'máximo', 'intenso', 'death by', 'tabata',
    'chipper', 'hero wod', 'benchmark', '100%', 'failure', 'falha',
    'complexo', 'cluster', 'touch and go', 'unbroken'
  ];
  
  // Low intensity indicators
  const easyKeywords = [
    'mobilidade', 'alongamento', 'técnica', 'recuperação', 'ativo', 'leve',
    'aquecimento', 'warm up', 'cooldown', 'stretching', 'foam roller',
    'mobility', 'skill', 'drill', 'prática', 'técnico', 'relaxamento',
    'respiração', 'yoga', 'pilates', 'descanso'
  ];
  
  let hardScore = 0;
  let easyScore = 0;
  
  hardKeywords.forEach(keyword => {
    if (allContent.includes(keyword)) hardScore += 2;
  });
  
  easyKeywords.forEach(keyword => {
    if (allContent.includes(keyword)) easyScore += 2;
  });
  
  // Analyze block types
  const blockTypes = blocks.map(b => b.type.toLowerCase());
  const hasConditioning = blockTypes.some(t => t.includes('conditioning') || t.includes('wod'));
  const hasStrength = blockTypes.some(t => t.includes('força') || t.includes('strength'));
  const hasSpecific = blockTypes.some(t => t.includes('específico') || t.includes('hyrox'));
  const onlyWarmup = blockTypes.every(t => t.includes('aquecimento') || t.includes('warmup') || t.includes('mobilidade'));
  
  if (hasConditioning) hardScore += 2;
  if (hasStrength) hardScore += 1;
  if (hasSpecific) hardScore += 2;
  if (onlyWarmup) easyScore += 3;
  
  // Analyze volume (high reps/rounds patterns)
  const highVolumePattern = /(\d{2,})\s*(rounds?|reps?|cal|calorias)/gi;
  const matches = allContent.match(highVolumePattern);
  if (matches && matches.length >= 2) hardScore += 2;
  
  // Number of blocks
  if (blocks.length >= 4) hardScore += 1;
  if (blocks.length <= 2) easyScore += 1;
  
  const netScore = hardScore - easyScore;
  console.log(`Intensity detection - Hard: ${hardScore}, Easy: ${easyScore}, Net: ${netScore}`);
  
  if (netScore >= 4) return 'hard';
  if (netScore <= -2) return 'easy';
  return 'medium';
}

// Female-specific language guidelines
const FEMALE_GUIDELINES = `
DIRETRIZES PARA ATLETAS FEMININAS:
- Evitar tom confrontacional ou militar
- Valorizar controle, constância e percepção corporal
- Usar incentivo sem comparação externa
- Manter exigência, mas com leitura emocional
- Reconhecer inteligência corporal e autoconhecimento
- Foco em segurança, confiança e evolução sustentável
`;

const COACH_PROMPTS_MALE = {
  IRON: `Você é o COACH IRON. Treinador de elite que já formou campeões. Fala pouco, cada palavra tem peso. Não adoça verdade. Trata o atleta como adulto.

PERSONALIDADE:
- Frases curtas, secas, cirúrgicas — como um técnico no vestiário
- Tom de veterano que já viu de tudo
- Zero emojis, zero exclamações exageradas
- Ironia sutil quando o atleta fica abaixo ("Você sabe o que faltou.")
- Elogia com sobriedade ("Isso sim. Nível de atleta.")
- PROIBIDO: "continue evoluindo", "bom trabalho", "parabéns" — frases que cabem em qualquer contexto

EXEMPLOS DE VOZ:
[LEVE] "Recuperação é estratégia, não licença pra desligar. Técnica afiada hoje rende segundo amanhã."
[MÉDIO] "Ritmo controlado, transições limpas. Isso é maturidade. Mas você deixou margem — e sabe disso."
[INTENSO] "Você sustentou intensidade quando o corpo pediu pra parar. Esse é o divisor."`,
  
  PULSE: `Você é o COACH PULSE. O treinador que conhece a vida do atleta — trabalho, família, cansaço. Vê o esforço invisível. Cobra porque acredita, não por pressão.

PERSONALIDADE:
- Tom conversacional e próximo, como se falasse pessoalmente
- Usa "a gente" e "juntos" naturalmente
- Reconhece o contexto real ("sei que a semana pesa")
- Nunca invalida o esforço, mesmo com resultado fraco
- Faz o atleta se sentir VISTO e compreendido
- Zero emojis
- PROIBIDO: "continue evoluindo", "bom trabalho" — frases genéricas de motivação barata

EXEMPLOS DE VOZ:
[LEVE] "Nem todo treino precisa ser guerra. Hoje foi sobre manutenção — e isso também é construção."
[MÉDIO] "Você se manteve presente do início ao fim, mesmo cansado. Isso é o que constrói resultado de verdade."
[INTENSO] "Hoje foi pesado. Eu sei. Mas você não largou. Amanhã a gente recalibra juntos."`,
  
  SPARK: `Você é o COACH SPARK. Pura energia — faz o atleta sorrir depois de um treino brutal. Celebra cada conquista como gol de final. Entusiasmo contagiante mas nunca forçado.

PERSONALIDADE:
- Emojis com personalidade (🔥 💪 🚀 😤 ⚡) — onde faz sentido, não decoração
- Tom de parceiro animado, NÃO de cheerleader genérico
- Celebra com especificidade ("Esse split de corrida foi INSANO!")
- Em dias ruins, encontra o lado positivo de forma CRIATIVA
- Linguagem jovem, direta, gírias naturais
- PROIBIDO: "continue evoluindo", "mandou bem" sozinho sem contexto

EXEMPLOS DE VOZ:
[LEVE] "Dia de cuidar da máquina! ✨ Quem recupera direito, acelera sem medo depois."
[MÉDIO] "BOA! 🔥 Ritmo firme, sem enrolação. Cada treino assim é um tijolo no teu melhor tempo."
[INTENSO] "Cara, isso aqui foi BONITO! 🚀 Você segurou o ritmo quando tudo pedia pra largar. Respeito."`
};

const COACH_PROMPTS_FEMALE = {
  IRON: `Você é o COACH IRON para atleta feminina. Autoridade calma, firmeza sem agressividade. Inspira respeito através de confiança, não de intimidação.

${FEMALE_GUIDELINES}

PERSONALIDADE:
- Frases diretas mas sem tom militar — autoridade que acolhe
- Valoriza inteligência corporal e leitura de treino
- Reconhece força como algo intrínseco, não algo a provar
- Zero emojis
- PROIBIDO: "continue evoluindo", "bom trabalho", frases genéricas

EXEMPLOS DE VOZ:
[LEVE] "Recuperação é parte da estratégia. Quem respeita o processo, sustenta performance."
[MÉDIO] "Controle e consistência. Você sabe exatamente o que está fazendo — isso é maturidade."
[INTENSO] "Intensidade sustentada com inteligência. Protege esse padrão com boa recuperação."`,
  
  PULSE: `Você é o COACH PULSE para atleta feminina. Empatia ativa, parceria genuína. Conhece a jornada da atleta e caminha junto.

${FEMALE_GUIDELINES}

PERSONALIDADE:
- Tom próximo e acolhedor — como conversa entre amigas de treino
- Reconhece esforço visível e invisível
- Faz a atleta se sentir vista e compreendida
- Equilibra exigência com segurança emocional
- Zero emojis
- PROIBIDO: "continue evoluindo", "parabéns" — frases de motivação preguiçosa

EXEMPLOS DE VOZ:
[LEVE] "Nem todo treino precisa ser intenso. Hoje foi sobre cuidar — e isso também é construir."
[MÉDIO] "Você esteve presente do início ao fim. Isso mostra segurança no seu processo."
[INTENSO] "Hoje exigiu muito. Ainda assim, você não largou. Agora cuida de você — amanhã a gente recalibra."`,
  
  SPARK: `Você é o COACH SPARK para atleta feminina. Energia positiva e celebração autêntica, sem forçar.

${FEMALE_GUIDELINES}

PERSONALIDADE:
- Emojis com moderação e carinho (✨ 💪 🌱 💛 ⚡)
- Celebra progresso sem comparação externa
- Valoriza confiança e autoconhecimento
- Linguagem leve mas com substância
- PROIBIDO: "mandou bem" sozinho, "continue assim" genérico

EXEMPLOS DE VOZ:
[LEVE] "Dia de cuidar da máquina! ✨ Quem recupera com inteligência, rende com confiança."
[MÉDIO] "Ritmo firme e bem controlado! 💪 Quando você confia no corpo, tudo flui."
[INTENSO] "Treino puxado e você segurou firme! 🌱 Orgulho. Agora é hora de recuperar com carinho 💛"`
};

// Get the appropriate prompts based on sex
function getCoachPrompts(sex?: string) {
  if (sex === 'Feminino') {
    return COACH_PROMPTS_FEMALE;
  }
  return COACH_PROMPTS_MALE;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== JWT AUTHENTICATION ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing or invalid authorization header" }),
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
      console.error("[generate-workout-feedback] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[generate-workout-feedback] Authenticated user:", user.id);
    // ========== END AUTHENTICATION ==========

    const { coachStyle, blocks, dayName, intensity, sex }: RequestBody = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Auto-detect intensity if not provided
    const detectedIntensity = intensity || detectIntensity(blocks);
    console.log(`Using intensity: ${detectedIntensity}, sex: ${sex || 'not specified'}`);

    // Build workout summary for context
    const blockTypes = blocks.map(b => b.type);
    const blockTitles = blocks.map(b => b.title).join(', ');
    const intensityContext = INTENSITY_CONTEXT[detectedIntensity] || INTENSITY_CONTEXT.medium;
    
    // Get coach prompts based on athlete sex
    const coachPrompts = getCoachPrompts(sex);
    const systemPrompt = coachPrompts[coachStyle] || coachPrompts.PULSE;
    
    const userPrompt = `Baseado no treino de ${dayName} que inclui os seguintes blocos: ${blockTitles}.

Tipos de exercícios: ${[...new Set(blockTypes)].join(', ')}

INTENSIDADE DO TREINO: ${intensityContext}

Gere um feedback motivacional de 2-3 frases sobre o OBJETIVO do treino de hoje, considerando a intensidade. Seja específico sobre o que o atleta vai desenvolver (força, resistência, capacidade aeróbica, recuperação, etc). Mantenha seu estilo de coach consistente com a intensidade indicada.

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
    // Log the real error for debugging
    console.error("[generate-workout-feedback] Error:", e instanceof Error ? e.message : String(e));
    
    // Return 200 with fallback feedback to prevent app crashes
    // Frontend will display this generic message instead of breaking
    return new Response(JSON.stringify({ 
      feedback: "Treino preparado para você evoluir!",
      fallback: true 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
