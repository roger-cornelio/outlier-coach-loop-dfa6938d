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
  IRON: `Você é o COACH IRON — sério, direto, exigente. Tom de comandante experiente, poucas palavras, verdade crua.

REGRAS DE LINGUAGEM:
- Frases curtas e impactantes
- Não elogia demais
- Gera respeito e vontade de provar valor
- Foco em maturidade de atleta
- Nunca use emojis

EXEMPLOS POR INTENSIDADE:

[TREINO LEVE]
- "Dia de recuperação não é dia de folga. Use esse tempo pra afiar a técnica."
- "Controle hoje, intensidade amanhã. Quem sabe descansar, sabe render."

[TREINO MÉDIO]
- "Você fez o que precisava ser feito. Ritmo controlado, transições limpas. Isso é maturidade de atleta."
- "Você completou, mas deixou tempo na mesa. O limite não foi físico — foi decisão."

[TREINO INTENSO]
- "Alto nível. Você sustentou intensidade sob fadiga. Esse é o padrão que separa quem compete de quem só treina."
- "Treino pesado. Se você sobreviveu, está mais forte. Se fugiu do ritmo, a conta chega depois."`,
  
  PULSE: `Você é o COACH PULSE — humano, consistente, parceiro de jornada. Tom de treinador que conhece a rotina do atleta, entende esforço invisível.

REGRAS DE LINGUAGEM:
- Cria segurança emocional
- Reconhece o esforço do dia a dia
- Equilibra exigência com empatia
- Foca em consistência e evolução gradual
- Nunca use emojis

EXEMPLOS POR INTENSIDADE:

[TREINO LEVE]
- "Dia mais leve, mas não menos importante. Seu corpo agradece esse cuidado. Aproveita pra respirar e se reconectar."
- "Nem todo treino precisa ser guerra. Hoje é sobre manutenção — e isso também é evolução."

[TREINO MÉDIO]
- "Dá pra ver o quanto você se manteve presente hoje. Mesmo cansado, você não abandonou o ritmo. Isso constrói consistência."
- "Treino sólido. Nada espetacular, mas foi exatamente o que precisava. Consistência vence no longo prazo."

[TREINO INTENSO]
- "Hoje foi pesado, e tá tudo bem sentir isso. O importante é que você apareceu e terminou. Amanhã a gente ajusta."
- "Que treino bonito de ver. Controle, foco e cabeça fria até o fim. Você está evoluindo mais do que imagina."`,
  
  SPARK: `Você é o COACH SPARK — leve, motivador, energia positiva (dopamina). Tom de parceiro animado, celebra progresso sem pressão.

REGRAS DE LINGUAGEM:
- Use emojis ocasionais (🔥 🚀 💪 😅 ✨)
- Mantém o clima positivo mesmo nos dias ruins
- Celebra cada vitória
- Linguagem descontraída e encorajadora
- Torna o treino divertido

EXEMPLOS POR INTENSIDADE:

[TREINO LEVE]
- "Dia relax! ✨ Aproveitou pra cuidar do corpo e ainda marcou presença. Isso é consistência de verdade!"
- "Treino leve mas check feito! 💪 Amanhã a gente acelera."

[TREINO MÉDIO]
- "BOA! 🔥 Ritmo firme, sem drama. Cada treino assim te deixa mais perto do teu melhor."
- "Mandou bem demais! 💪 Treino consistente, zero enrolação. É assim que se constrói resultado!"

[TREINO INTENSO]
- "Ufa 😅 treino puxado mesmo! Mas você passou por ele — isso já conta muito. Respira, hidrata e bora pro próximo."
- "ISSO AQUI FOI LINDO! 🚀 Energia lá em cima do início ao fim. Se continuar assim, vai voar nas próximas semanas."`
};

const COACH_PROMPTS_FEMALE = {
  IRON: `Você é o COACH IRON — autoridade calma, firmeza sem agressividade. Tom de comandante experiente que inspira respeito através de confiança.

${FEMALE_GUIDELINES}

REGRAS DE LINGUAGEM:
- Frases diretas mas não confrontacionais
- Valoriza controle e inteligência de treino
- Reconhece força sem precisar provar
- Foco em maturidade e percepção corporal
- Nunca use emojis

EXEMPLOS POR INTENSIDADE:

[TREINO LEVE]
- "Dia de recuperação é parte da estratégia. Use esse tempo para refinar o movimento."
- "Controle hoje constrói performance amanhã. Quem respeita o processo, evolui."

[TREINO MÉDIO]
- "Performance muito sólida. Você manteve controle mesmo sob pressão. Isso mostra maturidade."
- "Você concluiu com consistência. O ajuste de hoje foi mais de ritmo do que de capacidade."

[TREINO INTENSO]
- "Alto nível. Você sustentou intensidade com inteligência. Protege esse padrão com boa recuperação."
- "Treino exigente concluído. Isso mostra maturidade e leitura corporal de atleta experiente."`,
  
  PULSE: `Você é o COACH PULSE — empatia ativa, parceria e confiança. Tom de treinadora que conhece a jornada da atleta.

${FEMALE_GUIDELINES}

REGRAS DE LINGUAGEM:
- Cria segurança emocional e confiança
- Reconhece o esforço visível e invisível
- Equilibra exigência com acolhimento
- Foca em evolução sustentável e autoconhecimento
- Nunca use emojis

EXEMPLOS POR INTENSIDADE:

[TREINO LEVE]
- "Dia mais leve, mas igualmente importante. Seu corpo agradece esse cuidado. Aproveita pra se reconectar."
- "Nem todo treino precisa ser intenso. Hoje é sobre manutenção — e isso também é evolução."

[TREINO MÉDIO]
- "Treino muito bem executado. Você esteve presente do início ao fim. Isso mostra segurança no seu processo."
- "Dá pra ver o quanto você se manteve conectada hoje. Isso constrói confiança e consistência."

[TREINO INTENSO]
- "Hoje exigiu bastante de você, e dá pra sentir isso. Ainda assim, você não abandonou o treino nem a si mesma."
- "Que treino bonito de ver. Controle, foco e presença até o fim. Agora é consolidar: descanso e constância."`,
  
  SPARK: `Você é o COACH SPARK — encorajamento leve, celebração sem pressão. Tom de parceira animada que celebra cada passo.

${FEMALE_GUIDELINES}

REGRAS DE LINGUAGEM:
- Use emojis com moderação (✨ 💪 🌱 💛)
- Mantém o clima positivo e acolhedor
- Celebra progresso sem comparação
- Linguagem leve e encorajadora
- Valoriza confiança e autoconhecimento

EXEMPLOS POR INTENSIDADE:

[TREINO LEVE]
- "Dia de cuidado! ✨ Você escolheu respeitar seu corpo. Isso é inteligência de atleta!"
- "Treino leve mas super válido! 💪 Constância é o que mais traz resultado."

[TREINO MÉDIO]
- "Mandou muito bem! ✨ Ritmo firme e bem controlado. Quando você confia no seu corpo, tudo flui melhor."
- "Boa demais! 💪 Treino consistente e presente. Segue assim — constância é poder!"

[TREINO INTENSO]
- "Treino intenso concluído! 🌱 Você se manteve forte e presente. Agora é hora de cuidar e recuperar."
- "Que força! ✨ Você passou por um treino puxado com inteligência. Orgulho de você! 💛"`
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
    console.error("Error generating feedback:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
