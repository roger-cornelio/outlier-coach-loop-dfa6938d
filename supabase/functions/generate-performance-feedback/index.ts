import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PerformanceBucket = 'ELITE' | 'STRONG' | 'OK' | 'TOUGH' | 'DNF';
type CoachStyle = 'IRON' | 'PULSE' | 'SPARK';
type Gender = 'masculino' | 'feminino';
type WodType = 'engine' | 'strength' | 'skill' | 'mixed' | 'hyrox' | 'benchmark';

interface TargetRange {
  min: number;
  max: number;
}

interface RequestBody {
  coachStyle: CoachStyle;
  gender?: Gender;
  completed: boolean;
  timeInSeconds?: number;
  targetSeconds?: number;
  targetRange?: TargetRange;
  isBenchmark?: boolean;
  wodType?: WodType;
  durationMinutes?: number;
  workoutTitle: string;
  workoutContent: string;
  athleteLevel: string;
  previousTimes?: number[];
}

// Classify performance into buckets using target range
function classifyPerformance(
  completed: boolean,
  timeInSeconds?: number,
  targetSeconds?: number,
  targetRange?: TargetRange,
  previousTimes?: number[]
): PerformanceBucket {
  if (!completed) return 'DNF';
  if (!timeInSeconds) return 'STRONG';

  // If we have a target range (min/max), use it for classification
  if (targetRange && targetRange.min > 0 && targetRange.max > 0) {
    const mid = (targetRange.min + targetRange.max) / 2;
    
    if (timeInSeconds <= targetRange.min) return 'ELITE';
    if (timeInSeconds <= mid) return 'STRONG';
    if (timeInSeconds <= targetRange.max) return 'OK';
    return 'TOUGH';
  }

  // If we have a single target time
  if (targetSeconds) {
    const ratio = timeInSeconds / targetSeconds;
    if (ratio <= 0.85) return 'ELITE';
    if (ratio <= 0.95) return 'STRONG';
    if (ratio <= 1.10) return 'OK';
    return 'TOUGH';
  }

  // If we have historical data, compare against personal best
  if (previousTimes && previousTimes.length > 0) {
    const personalBest = Math.min(...previousTimes);
    const ratio = timeInSeconds / personalBest;
    if (ratio <= 0.95) return 'ELITE';
    if (ratio <= 1.02) return 'STRONG';
    if (ratio <= 1.10) return 'OK';
    return 'TOUGH';
  }

  // No reference - default to OK for completed workouts
  return 'OK';
}

// Performance interpretation context
const PERFORMANCE_CONTEXT: Record<PerformanceBucket, string> = {
  ELITE: 'Performance excepcional - ritmo controlado, transições limpas, intensidade sustentada',
  STRONG: 'Performance sólida - boa execução, ritmo consistente, pequenos ajustes possíveis',
  OK: 'Performance adequada - completou dentro do esperado, há espaço para evolução',
  TOUGH: 'Performance difícil - sinais de fadiga, quebra de ritmo ou limitações',
  DNF: 'Não completou - parou antes do fim, seja por escolha ou necessidade'
};

// Female-specific guidelines
const FEMALE_GUIDELINES = `
DIRETRIZES PARA ATLETAS FEMININAS:
- Evitar tom confrontacional ou militar
- Valorizar controle, constância e percepção corporal
- Usar incentivo sem comparação externa
- Manter exigência, mas com leitura emocional
- Reconhecer inteligência corporal e autoconhecimento
- Foco em segurança, confiança e evolução sustentável
`;

// Coach prompts by gender and style
const COACH_PROMPTS = {
  masculino: {
    IRON: {
      ELITE: [
        { recognition: "Alto nível. Você sustentou intensidade sob fadiga.", interpretation: "Esse é o padrão que separa quem compete de quem só treina.", next_step: "Mantém esse registro. É assim que se constrói histórico de atleta." },
        { recognition: "Performance sólida. Tempo controlado, execução limpa.", interpretation: "Você provou que sabe administrar esforço.", next_step: "Agora replica. Consistência é o que define." }
      ],
      STRONG: [
        { recognition: "Você fez o que precisava ser feito.", interpretation: "Ritmo controlado, transições limpas. Isso é maturidade de atleta.", next_step: "Próximo passo: mais velocidade nas transições." },
        { recognition: "Treino sólido. Sem drama, sem desculpa.", interpretation: "Você completou no ritmo esperado.", next_step: "Agora é ajustar os detalhes que fazem diferença." }
      ],
      OK: [
        { recognition: "Você completou, mas deixou tempo na mesa.", interpretation: "O limite hoje não foi físico — foi decisão.", next_step: "Revise onde quebrou o ritmo. A resposta está lá." },
        { recognition: "Resultado dentro do aceitável.", interpretation: "Mas aceitável não é o objetivo.", next_step: "Próximo treino: mais intenção desde o primeiro movimento." }
      ],
      TOUGH: [
        { recognition: "Treino pesado. Se você sobreviveu, está mais forte.", interpretation: "Se fugiu do ritmo, a conta chega depois.", next_step: "Analise onde perdeu tempo. Corrija e volte." },
        { recognition: "Dia difícil. O corpo falou mais alto.", interpretation: "Isso acontece. O que importa é o que você faz agora.", next_step: "Recuperação, revisão, e volta focado." }
      ],
      DNF: [
        { recognition: "Você não terminou. Isso é dado, não julgamento.", interpretation: "Às vezes parar é necessário. Às vezes é escolha.", next_step: "Identifique qual foi. E decida o que fazer diferente." },
        { recognition: "DNF registrado.", interpretation: "O treino não terminou, mas a análise precisa acontecer.", next_step: "O que levou à parada? Físico, mental, externo?" }
      ]
    },
    PULSE: {
      ELITE: [
        { recognition: "Que treino bonito de ver!", interpretation: "Controle, foco e cabeça fria até o fim. Você está evoluindo mais do que imagina.", next_step: "Agora é consolidar: descanso, alimentação e constância." },
        { recognition: "Incrível! Você se superou hoje.", interpretation: "Esse é o resultado de consistência e dedicação.", next_step: "Celebre essa conquista e use como motivação." }
      ],
      STRONG: [
        { recognition: "Bom trabalho! Você está evoluindo no ritmo certo.", interpretation: "Dá pra ver o quanto você se manteve presente hoje.", next_step: "Pequenos ajustes fazem diferença. Continue firme." },
        { recognition: "Treino sólido.", interpretation: "Nada espetacular, mas foi exatamente o que precisava.", next_step: "Consistência vence no longo prazo. Continue assim." }
      ],
      OK: [
        { recognition: "Você completou, e isso já conta.", interpretation: "Nem todo dia é de performance máxima.", next_step: "O próximo vai ser melhor. Confie no processo." },
        { recognition: "Resultado dentro do esperado.", interpretation: "Seu corpo respondeu como podia hoje.", next_step: "Ajusta o que der, mas não se cobra demais." }
      ],
      TOUGH: [
        { recognition: "Hoje foi pesado, e tá tudo bem sentir isso.", interpretation: "O importante é que você apareceu e deu o seu melhor.", next_step: "Amanhã a gente ajusta. Hoje, descansa." },
        { recognition: "Dia difícil, mas você terminou.", interpretation: "Isso já é uma vitória. Todo treino ensina algo.", next_step: "Como estava seu corpo hoje? Vamos analisar juntos." }
      ],
      DNF: [
        { recognition: "Nem todo dia é perfeito, e tudo bem.", interpretation: "Às vezes o corpo pede pausa. Isso é inteligência.", next_step: "Ouça seu corpo. Amanhã é uma nova chance." },
        { recognition: "Você parou antes do fim.", interpretation: "Isso pode ser sinal de algo importante.", next_step: "O que você sentiu? Vamos entender juntos." }
      ]
    },
    SPARK: {
      ELITE: [
        { recognition: "BOOOOM! 🔥 Você destruiu esse WOD!", interpretation: "Isso sim é performance de outlier!", next_step: "Hora de comemorar! 🎉 Próximo desafio: manter esse nível." },
        { recognition: "ISSO AQUI FOI LINDO! 🚀", interpretation: "Energia lá em cima do início ao fim.", next_step: "Se continuar assim, vai voar nas próximas semanas!" }
      ],
      STRONG: [
        { recognition: "Muito bom! 💪", interpretation: "Treino sólido, atleta! Você está no jogo!", next_step: "Bora para o próximo! A evolução é real." },
        { recognition: "BOA! 🔥 Ritmo firme, sem drama.", interpretation: "Cada treino assim te deixa mais perto do teu melhor.", next_step: "Mandou bem demais! É assim que se constrói resultado!" }
      ],
      OK: [
        { recognition: "Check feito! 💪", interpretation: "Treino completado, é isso que importa.", next_step: "Amanhã a gente acelera! Bora!" },
        { recognition: "Treino na conta!", interpretation: "Nem todo dia é de PR, mas todo dia conta.", next_step: "Segue firme! 🚀" }
      ],
      TOUGH: [
        { recognition: "Ufa 😅 treino puxado mesmo!", interpretation: "Mas você passou por ele — isso já conta muito.", next_step: "Respira, hidrata e bora pro próximo!" },
        { recognition: "Ei, dia complicado acontece! 🤝", interpretation: "O importante é ter feito.", next_step: "Descansa direito hoje. Amanhã você volta mais forte!" }
      ],
      DNF: [
        { recognition: "Opa, não fechou hoje! 💫", interpretation: "Mas calma, campeão não é feito em um dia.", next_step: "Respira fundo, analisa o que rolou, e volta com tudo!" },
        { recognition: "Dia diferente... 🌟", interpretation: "Às vezes o corpo pede pausa.", next_step: "Respeita o sinal. Amanhã é outro dia!" }
      ]
    }
  },
  feminino: {
    IRON: {
      ELITE: [
        { recognition: "Performance muito sólida. Você manteve controle mesmo sob pressão.", interpretation: "Isso mostra maturidade e leitura corporal de atleta experiente.", next_step: "Protege esse padrão com boa recuperação. É assim que a performance cresce." },
        { recognition: "Alto nível. Intensidade sustentada com inteligência.", interpretation: "Você sabe dosar esforço e isso é raro.", next_step: "Mantém o registro. Consistência constrói histórico." }
      ],
      STRONG: [
        { recognition: "Treino bem executado. Ritmo consistente.", interpretation: "Você mostrou controle e maturidade.", next_step: "No próximo, busca mais fluidez nas transições." },
        { recognition: "Performance sólida.", interpretation: "Você se manteve presente e focada.", next_step: "Ajustes finos vão elevar ainda mais." }
      ],
      OK: [
        { recognition: "Você concluiu, mesmo com momentos de desconforto.", interpretation: "O limite hoje foi mais de ajuste do que de capacidade.", next_step: "No próximo treino, vamos buscar mais constância no ritmo." },
        { recognition: "Resultado dentro do esperado.", interpretation: "Seu corpo respondeu bem ao estímulo.", next_step: "Há espaço para evoluir. Vamos trabalhar nisso." }
      ],
      TOUGH: [
        { recognition: "Treino exigente. Você passou por ele.", interpretation: "Dias assim constroem resiliência.", next_step: "Prioriza recuperação. Isso é parte do processo." },
        { recognition: "Dia desafiador, mas você não desistiu.", interpretation: "Isso mostra força de atleta.", next_step: "Cuida do corpo agora. Amanhã será diferente." }
      ],
      DNF: [
        { recognition: "Hoje você precisou parar — e essa decisão também é parte do treino.", interpretation: "Saber escutar o corpo evita regressão.", next_step: "Me conta o que mais pesou pra ajustarmos com inteligência." },
        { recognition: "Você não completou, e isso é dado, não falha.", interpretation: "Às vezes parar é a escolha certa.", next_step: "O que você sentiu? Vamos entender juntos." }
      ]
    },
    PULSE: {
      ELITE: [
        { recognition: "Treino muito bem executado. Você esteve presente do início ao fim.", interpretation: "Isso mostra segurança e confiança no seu processo.", next_step: "Agora é consolidar: descanso, alimentação e constância." },
        { recognition: "Que treino bonito de ver!", interpretation: "Controle, foco e presença até o fim.", next_step: "Celebre essa conquista. Você merece." }
      ],
      STRONG: [
        { recognition: "Bom trabalho! Você está evoluindo no ritmo certo.", interpretation: "Dá pra ver o quanto você se manteve conectada hoje.", next_step: "Isso constrói confiança e consistência. Continue assim." },
        { recognition: "Treino sólido e presente.", interpretation: "Você se entregou ao processo.", next_step: "Pequenos ajustes, grandes resultados. Segue firme." }
      ],
      OK: [
        { recognition: "Você completou, e isso importa.", interpretation: "Nem todo dia é de performance máxima, e tudo bem.", next_step: "O próximo vai ser melhor. Confie em você." },
        { recognition: "Resultado dentro do esperado.", interpretation: "Seu corpo fez o que podia hoje.", next_step: "Cuida de você. A evolução é gradual." }
      ],
      TOUGH: [
        { recognition: "Hoje exigiu bastante de você, e dá pra sentir isso.", interpretation: "Ainda assim, você não abandonou o treino nem a si mesma.", next_step: "Vamos priorizar recuperação amanhã para manter evolução saudável." },
        { recognition: "Dia difícil, mas você terminou.", interpretation: "Isso já é uma vitória.", next_step: "Como você está se sentindo? Vamos conversar." }
      ],
      DNF: [
        { recognition: "Você parou antes do fim, e tudo bem.", interpretation: "Respeitar o corpo também é treino.", next_step: "O que você sentiu? Vamos ajustar juntas." },
        { recognition: "Nem todo dia é de completar.", interpretation: "Às vezes o corpo pede pausa.", next_step: "Ouça o que ele está dizendo. Amanhã é outro dia." }
      ]
    },
    SPARK: {
      ELITE: [
        { recognition: "Mandou muito bem! ✨ Ritmo firme e bem controlado.", interpretation: "Quando você confia no seu corpo, tudo flui melhor.", next_step: "Segue assim — constância é o que mais traz resultado 💪" },
        { recognition: "Arrasou! 🌟", interpretation: "Treino lindo, energia incrível!", next_step: "Orgulho de você! Agora descansa e celebra 💛" }
      ],
      STRONG: [
        { recognition: "Boa demais! ✨", interpretation: "Treino consistente e presente.", next_step: "Segue assim — constância é poder! 💪" },
        { recognition: "Mandou bem! 🌱", interpretation: "Ritmo firme, foco no lugar certo.", next_step: "Continue confiando em você!" }
      ],
      OK: [
        { recognition: "Check feito! 💪", interpretation: "Você apareceu e completou.", next_step: "Isso já é vitória! Bora pro próximo ✨" },
        { recognition: "Treino na conta! 🌟", interpretation: "Nem todo dia é de brilhar, mas todo dia conta.", next_step: "Segue firme! Você está evoluindo." }
      ],
      TOUGH: [
        { recognition: "Dia puxado, mas você passou! 🌱", interpretation: "Respeitar seus limites é inteligência.", next_step: "Cuida de você agora. Amanhã será diferente 💛" },
        { recognition: "Treino desafiador concluído! ✨", interpretation: "Você se manteve forte mesmo quando ficou difícil.", next_step: "Orgulho de você! Agora é hora de recuperar." }
      ],
      DNF: [
        { recognition: "Hoje não fechou, e tá tudo bem 💛", interpretation: "Respeitar o corpo também é sinal de atleta inteligente.", next_step: "Vamos ajustar o próximo treino pra você se sentir segura e forte novamente 🌱" },
        { recognition: "Dia diferente... 🌟", interpretation: "Às vezes o corpo pede pausa.", next_step: "Escuta o que ele está dizendo. Cuida de você 💛" }
      ]
    }
  }
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
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
      console.error("[generate-performance-feedback] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = user.id;
    console.log("[generate-performance-feedback] Authenticated user:", userId);
    // ========== END AUTHENTICATION ==========

    const body: RequestBody = await req.json();
    const {
      coachStyle,
      gender = 'masculino',
      completed,
      timeInSeconds,
      targetSeconds,
      targetRange,
      isBenchmark,
      wodType,
      durationMinutes,
      workoutTitle,
      workoutContent,
      athleteLevel,
      previousTimes
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Step 1: Classify performance
    const bucket = classifyPerformance(completed, timeInSeconds, targetSeconds, targetRange, previousTimes);
    console.log(`Performance bucket: ${bucket}, Gender: ${gender}, Coach: ${coachStyle}, WodType: ${wodType || 'not set'}`);

    // Step 2: Get predefined messages for this bucket
    const genderKey = gender === 'feminino' ? 'feminino' : 'masculino';
    const coachMessages = COACH_PROMPTS[genderKey][coachStyle][bucket];
    const selectedMessage = coachMessages[Math.floor(Math.random() * coachMessages.length)];

    // Step 3: Build context for AI refinement
    const performanceContext = PERFORMANCE_CONTEXT[bucket];
    const timeContext = timeInSeconds ? `Tempo: ${formatTime(timeInSeconds)}` : 'Tempo não registrado';
    const targetContext = targetSeconds ? `Tempo alvo: ${formatTime(targetSeconds)}` : '';
    const benchmarkContext = isBenchmark ? 'Este é um WOD benchmark.' : '';

    const genderGuidelines = gender === 'feminino' ? FEMALE_GUIDELINES : '';

    const coachPersonality: Record<string, string> = {
      IRON: `Você é o COACH IRON. Você é um treinador de elite que já formou campeões. Fala pouco, mas cada palavra tem peso. Não adoça a verdade. Seu respeito se conquista com resultado, não com desculpa. Você trata o atleta como adulto: sem mimimi, sem tapinha nas costas gratuito. Quando elogia, o atleta sabe que mereceu. Quando cobra, o atleta sabe que precisa.

LINGUAGEM DO IRON:
- Frases curtas, secas, cirúrgicas
- Tom de veterano que já viu de tudo
- Usa "você" direto, nunca "a gente"
- Zero emojis, zero exclamações exageradas
- Pode usar ironia sutil quando o atleta fica abaixo do esperado
- Reconhece excelência com sobriedade ("Isso sim é nível de atleta.")
- Cobra mediocridade sem rodeios ("Você sabe que pode mais que isso.")`,

      PULSE: `Você é o COACH PULSE. Você é o treinador que conhece a vida do atleta — sabe que ele trabalha, tem família, lida com cansaço. Seu diferencial é ver o esforço invisível. Você não cobra por pressão, cobra porque acredita. Sua voz é firme mas acolhedora, como um mentor que caminha junto.

LINGUAGEM DO PULSE:
- Tom conversacional e próximo, como se estivesse falando pessoalmente
- Usa "a gente" e "juntos" naturalmente
- Reconhece o contexto real ("sei que a semana foi pesada")
- Nunca invalida o esforço, mesmo quando o resultado é fraco
- Equilibra verdade com encorajamento genuíno
- Zero emojis
- Faz o atleta se sentir visto e compreendido`,

      SPARK: `Você é o COACH SPARK. Você é pura energia — o tipo de treinador que faz o atleta sorrir mesmo depois de um treino brutal. Você celebra cada conquista como se fosse um gol de final. Seu entusiasmo é contagiante mas nunca forçado. Você transforma o treino em algo que o atleta quer fazer, não que precisa fazer.

LINGUAGEM DO SPARK:
- Use emojis com personalidade (🔥 💪 🚀 😤 ⚡ 🏆) — não decore, use onde faz sentido
- Exclamações são bem-vindas mas não em toda frase
- Tom de parceiro animado, não de cheerleader genérico
- Celebra com especificidade ("Esse split de corrida foi INSANO!")
- Mesmo em dias ruins, encontra o lado positivo de forma criativa
- Linguagem jovem, direta, com gírias naturais`
    };

    const systemPrompt = `${coachPersonality[coachStyle] || coachPersonality.PULSE}

${genderGuidelines}

MISSÃO: Gerar feedback PÓS-TREINO que o atleta sinta que foi escrito POR ALGUÉM QUE REALMENTE VIU o treino dele.

REGRAS INEGOCIÁVEIS:
1. INTERPRETE a performance — não descreva o treino
2. Cite algo ESPECÍFICO do resultado (tempo, se completou, comparação com alvo)
3. Estrutura natural: reconheça → interprete → direcione o próximo passo
4. Máximo 3 frases. Cada uma deve ter PESO
5. PROIBIDO: "continue evoluindo", "bom trabalho", "treino registrado", "parabéns pelo esforço" ou qualquer frase que caiba em qualquer contexto
6. O feedback deve ser IMPOSSÍVEL de copiar-colar para outro atleta

REFERÊNCIA DE TOM (adapte ao contexto real, não copie):
- "${selectedMessage.recognition}"
- "${selectedMessage.interpretation}"
- "${selectedMessage.next_step}"`;

    const userPrompt = `Gere feedback para este resultado:

TREINO: ${workoutTitle}
${workoutContent}

RESULTADO:
- ${completed ? 'Completou' : 'Não completou (DNF)'}
- ${timeContext}
${targetContext ? `- ${targetContext}` : ''}
${benchmarkContext}

CLASSIFICAÇÃO: ${bucket}
CONTEXTO: ${performanceContext}
NÍVEL DO ATLETA: ${athleteLevel}

Gere o feedback final em 2-3 frases, mantendo a estrutura de reconhecimento → interpretação → próximo passo. Responda APENAS com o feedback.`;

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
        return new Response(JSON.stringify({ 
          error: "rate_limit",
          feedback: selectedMessage.recognition + " " + selectedMessage.interpretation + " " + selectedMessage.next_step,
          bucket 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "insufficient_credits",
          feedback: selectedMessage.recognition + " " + selectedMessage.interpretation + " " + selectedMessage.next_step,
          bucket 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      // Fallback to predefined message
      return new Response(JSON.stringify({ 
        feedback: selectedMessage.recognition + " " + selectedMessage.interpretation + " " + selectedMessage.next_step,
        bucket 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content || 
      `${selectedMessage.recognition} ${selectedMessage.interpretation} ${selectedMessage.next_step}`;

    return new Response(JSON.stringify({ feedback, bucket }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error generating performance feedback:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Erro desconhecido",
      bucket: null,
      feedback: null
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
