import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkoutBlock {
  id: string;
  type: string;
  title: string;
  content: string;
  referenceTime?: {
    iniciante: number;
    intermediario: number;
    avancado: number;
    hyrox_pro: number;
  };
}

interface AthleteConfig {
  level: 'iniciante' | 'intermediario' | 'avancado' | 'hyrox_pro';
  sessionDuration: number | 'ilimitado';
  altura?: number;
  peso?: number;
  idade?: number;
  sexo?: 'masculino' | 'feminino';
}

interface AdaptationConfig {
  unavailableEquipment: string[];
  otherNotes: string;
}

interface RequestBody {
  athleteConfig: AthleteConfig;
  workout: {
    day: string;
    stimulus: string;
    blocks: WorkoutBlock[];
  };
  adaptations: AdaptationConfig;
}

// Level-based multipliers and rules
const LEVEL_CONFIG = {
  iniciante: {
    vol_mult: 0.6,
    load_mult: 0.5,
    complexity: "simplificar movimentos complexos, substituir por variações mais acessíveis",
    time_warmup: 10,
    time_strength: 15,
    time_conditioning: 15,
    time_core: 5,
  },
  intermediario: {
    vol_mult: 0.85,
    load_mult: 0.75,
    complexity: "manter estrutura, ajustar cargas moderadamente",
    time_warmup: 8,
    time_strength: 18,
    time_conditioning: 20,
    time_core: 6,
  },
  avancado: {
    vol_mult: 1.0,
    load_mult: 1.0,
    complexity: "manter estímulo original e intensidade",
    time_warmup: 6,
    time_strength: 20,
    time_conditioning: 25,
    time_core: 8,
  },
  hyrox_pro: {
    vol_mult: 1.1,
    load_mult: 1.1,
    complexity: "manter padrão competitivo HYROX, sem simplificação",
    time_warmup: 5,
    time_strength: 20,
    time_conditioning: 30,
    time_core: 10,
  },
};

const EQUIPMENT_SUBSTITUTIONS: Record<string, string> = {
  ski: "substitua por Assault Bike, Remo ou Burpees",
  remo: "substitua por Assault Bike, SKI ou Running",
  sled: "substitua por Lunges com peso, Farmer's Carry ou Bear Crawl",
  wallball: "substitua por Thrusters com dumbbells ou Kettlebell",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { athleteConfig, workout, adaptations }: RequestBody = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Check if there's a workout to adapt
    if (!workout || !workout.blocks || workout.blocks.length === 0) {
      return new Response(JSON.stringify({ 
        adaptedWorkout: null,
        message: "Nenhum treino inserido para este dia." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const levelConfig = LEVEL_CONFIG[athleteConfig.level] || LEVEL_CONFIG.intermediario;
    const timeLimit = athleteConfig.sessionDuration === 'ilimitado' ? 90 : athleteConfig.sessionDuration;

    // Build the workout content string
    const workoutContent = workout.blocks.map(block => {
      return `[${block.type.toUpperCase()}] ${block.title}\n${block.content}`;
    }).join('\n\n');

    // Build equipment substitution rules
    let equipmentRules = "";
    if (adaptations.unavailableEquipment.length > 0) {
      equipmentRules = adaptations.unavailableEquipment
        .map(eq => `- ${eq.toUpperCase()}: ${EQUIPMENT_SUBSTITUTIONS[eq] || "encontrar alternativa similar"}`)
        .join('\n');
    }

    const sexLabel = athleteConfig.sexo === 'masculino' ? 'Masculino' : athleteConfig.sexo === 'feminino' ? 'Feminino' : 'N/A';
    const levelLabel = athleteConfig.level.toUpperCase();

    const systemPrompt = `Você é o ADAPTADOR DE TREINOS do OUTLIER.

Você NÃO cria treinos novos. Você SOMENTE adapta o treino inserido pelo admin.

REGRA ABSOLUTA:
Se NÃO existir treino inserido pelo admin para o dia selecionado, responda EXATAMENTE:
"Nenhum treino inserido para este dia."
E finalize. Não sugira nada.

━━━━━━━━━━━━━━━━━━━━━━
CONFIGURAÇÕES DO ATLETA
━━━━━━━━━━━━━━━━━━━━━━
Altura: ${athleteConfig.altura || 'N/A'} cm
Peso: ${athleteConfig.peso || 'N/A'} kg
Idade: ${athleteConfig.idade || 'N/A'} anos
Sexo: ${sexLabel}
Nível do atleta: ${levelLabel}   (INICIANTE | INTERMEDIARIO | AVANCADO | HYROX_PRO)
Tempo disponível: ${timeLimit} min

━━━━━━━━━━━━━━━━━━━━━━
TREINO BASE (ADMIN)
━━━━━━━━━━━━━━━━━━━━━━
${workoutContent}

━━━━━━━━━━━━━━━━━━━━━━
OBJETIVO DA ADAPTAÇÃO
━━━━━━━━━━━━━━━━━━━━━━
1) O NÍVEL DO ATLETA define o nível do treino (volume, carga e complexidade).
2) O TEMPO escolhido define o quanto o treino deve ser condensado/expandido.
3) Ao mudar o tempo, você deve ajustar volume e estrutura para CABER no tempo, mas manter a DIFICULDADE equivalente ao nível selecionado.
   - Ex.: reduzir tempo NÃO pode "facilitar" o treino; deve condensar mantendo intensidade (menos volume, mesma exigência).
   - Ex.: aumentar tempo NÃO pode "virar passeio"; deve aumentar volume mantendo o mesmo padrão de esforço do nível.

━━━━━━━━━━━━━━━━━━━━━━
REGRAS DE ADAPTAÇÃO (OBRIGATÓRIAS)
━━━━━━━━━━━━━━━━━━━━━━
A) Preserve a ordem dos blocos sempre:
Aquecimento → Força/Técnica → Conditioning → Core/Finalização → Corrida (se existir)

B) Adaptação por NÍVEL (aplique de forma objetiva):
- INICIANTE:
  • reduzir complexidade e impacto
  • reduzir volume total
  • cargas moderadas e reps mais controladas
- INTERMEDIÁRIO:
  • manter estrutura base
  • ajustar carga/reps para esforço consistente
- AVANÇADO:
  • aumentar exigência (volume ou densidade) sem bagunçar a estrutura
- HYROX_PRO:
  • padrão competitivo: densidade alta, pouca "facilitação"
  • manter estímulo específico HYROX
  • NUNCA reduzir volume abaixo do base
  • NUNCA simplificar movimentos

C) Adaptação por TEMPO (principal regra):
- O treino final deve ter tempo total <= ${timeLimit} min.
- Se precisar cortar tempo, corte nesta ordem:
  1) Corrida opcional
  2) Core/Finalização
  3) Conditioning (reduzindo rounds/reps/distâncias mantendo intensidade)
  4) Força/Técnica (reduz séries, não remover completamente)
  5) Aquecimento (reduzir, mas nunca zerar)
- Se precisar expandir tempo (tempo maior), aumente volume mantendo o mesmo padrão do nível.

D) NÃO invente:
- Não criar exercícios que não existam no treino do admin.
- Não adicionar equipamentos novos.
- Não inventar "treino alternativo".
- Não adicionar blocos extras.
${adaptations.unavailableEquipment.length > 0 ? `
E) SUBSTITUIÇÕES DE EQUIPAMENTO (APENAS se o equipamento estiver no treino original):
${equipmentRules}` : ''}
${adaptations.otherNotes ? `
F) OBSERVAÇÕES DO ATLETA:
${adaptations.otherNotes}` : ''}

G) Saída SEM texto motivacional e SEM explicações.
Você apenas entrega o treino adaptado final.

━━━━━━━━━━━━━━━━━━━━━━
FORMATO DE SAÍDA (OBRIGATÓRIO)
━━━━━━━━━━━━━━━━━━━━━━
Responda SOMENTE com JSON válido (sem texto fora do JSON), no formato:

{
  "day": "${workout.day}",
  "level": "${levelLabel}",
  "time_limit_min": ${timeLimit},
  "total_minutes": <number <= ${timeLimit}>,
  "difficulty_note": "dificuldade equivalente ao nível ${levelLabel}",
  "blocks": [
    {
      "type": "aquecimento|forca|conditioning|core|especifico|corrida",
      "title": "<titulo>",
      "target_minutes": <number>,
      "content": "<conteúdo do bloco com quebras de linha>"
    }
  ]
}

Validação final obrigatória:
- total_minutes <= ${timeLimit}
Se não conseguir, reduza novamente o conditioning até caber.`;

    const userPrompt = `Adapte o treino acima seguindo TODAS as regras. Retorne SOMENTE JSON válido.`;

    console.log("Calling AI with prompt for level:", athleteConfig.level);

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
      return new Response(JSON.stringify({ error: "Erro ao adaptar treino" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || null;

    if (!rawContent) {
      return new Response(JSON.stringify({ error: "Resposta vazia do AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to parse JSON from the response
    let adaptedWorkoutJson = null;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = rawContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      adaptedWorkoutJson = JSON.parse(cleanedContent);
      console.log("Successfully parsed adapted workout JSON");
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      console.log("Raw content:", rawContent);
      // Return the raw content as fallback
      return new Response(JSON.stringify({ 
        adaptedWorkout: rawContent,
        adaptedWorkoutJson: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      adaptedWorkout: rawContent,
      adaptedWorkoutJson 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error adapting workout:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
