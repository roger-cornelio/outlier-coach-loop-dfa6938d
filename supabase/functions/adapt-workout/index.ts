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

    const systemPrompt = `Você é um adaptador de treino. NÃO crie treinos novos.

TASK:
Adapte o treino do admin para caber no time_limit_min e seguir o nível do atleta.
- Preserve a ordem dos blocos.
- Ajuste rounds/reps/distâncias e cargas usando os multiplicadores.
- Se faltar tempo: corte primeiro acessórios/core, depois conditioning (reduzindo rounds/reps), e por último strength/skill.
- NÃO invente blocos novos, NÃO sugira alternativas fora das substituições de equipamento, NÃO adicione equipamentos novos.
${adaptations.unavailableEquipment.length > 0 ? `
SUBSTITUIÇÕES DE EQUIPAMENTO OBRIGATÓRIAS:
${equipmentRules}` : ''}
${adaptations.otherNotes ? `
OBSERVAÇÕES ADICIONAIS DO ATLETA:
${adaptations.otherNotes}` : ''}

OUTPUT:
Responda SOMENTE com JSON válido, sem texto fora do JSON, no formato:

{
  "day": "...",
  "total_minutes": <number <= time_limit_min>,
  "blocks": [
    {
      "type": "aquecimento|forca|conditioning|core|especifico|corrida",
      "title": "...",
      "target_minutes": <number>,
      "content": "conteúdo do bloco formatado com quebras de linha"
    }
  ]
}`;

    const userPrompt = `INPUT:
- Athlete:
  height_cm: ${athleteConfig.altura || 'N/A'}
  weight_kg: ${athleteConfig.peso || 'N/A'}
  age: ${athleteConfig.idade || 'N/A'}
  sex: ${athleteConfig.sexo || 'N/A'}
  level: ${athleteConfig.level}
  time_limit_min: ${timeLimit}

- Time budget per block (min):
  warmup: ${levelConfig.time_warmup}
  strength_or_skill: ${levelConfig.time_strength}
  conditioning: ${levelConfig.time_conditioning}
  accessory_or_core: ${levelConfig.time_core}

- Level rules:
  volume_multiplier: ${levelConfig.vol_mult}
  load_multiplier: ${levelConfig.load_mult}
  complexity: "${levelConfig.complexity}"

- Admin workout (${workout.day}):
${workoutContent}

Adapte o treino acima seguindo as regras. Retorne SOMENTE JSON válido.`;

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
