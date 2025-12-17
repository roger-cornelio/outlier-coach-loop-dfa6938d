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

// Level-based multipliers (mandatory application)
const LEVEL_MULTIPLIERS = {
  iniciante: {
    volume_multiplier: 0.70,
    load_multiplier: 0.80,
    density_rule: "mais descanso/menos densidade",
  },
  intermediario: {
    volume_multiplier: 1.00,
    load_multiplier: 1.00,
    density_rule: "densidade padrão",
  },
  avancado: {
    volume_multiplier: 1.15,
    load_multiplier: 1.05,
    density_rule: "menos descanso/mais densidade",
  },
  hyrox_pro: {
    volume_multiplier: 0.75, // 65-80% do volume original
    load_multiplier: 1.05,   // 100-110% da intensidade
    density_rule: "densidade máxima (↑↑) - menos descanso, ritmo competitivo",
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

    const levelMultipliers = LEVEL_MULTIPLIERS[athleteConfig.level] || LEVEL_MULTIPLIERS.intermediario;
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
Você NÃO cria treino novo. Você adapta APENAS o treino do admin.

REGRA ABSOLUTA:
Se NÃO existir treino do admin para o dia, responda EXATAMENTE:
"Nenhum treino inserido para este dia."
E finalize.

━━━━━━━━━━━━━━━━━━━━━━
CONFIG DO ATLETA
━━━━━━━━━━━━━━━━━━━━━━
Altura: ${athleteConfig.altura || 'N/A'} cm
Peso: ${athleteConfig.peso || 'N/A'} kg
Idade: ${athleteConfig.idade || 'N/A'} anos
Sexo: ${sexLabel}
Nível: ${levelLabel}  (INICIANTE | INTERMEDIARIO | AVANCADO | HYROX_PRO)
Tempo disponível: ${timeLimit} min

TREINO ADMIN:
${workoutContent}

━━━━━━━━━━━━━━━━━━━━━━
REGRA CENTRAL (OBRIGATÓRIA)
━━━━━━━━━━━━━━━━━━━━━━
Você DEVE alterar o treino com base no NÍVEL, aplicando multiplicadores numéricos.
Se você não alterar rounds/reps/distâncias/cargas, sua resposta é considerada inválida.

Multiplicadores para o nível ${levelLabel}:
- volume_multiplier = ${levelMultipliers.volume_multiplier}
- load_multiplier   = ${levelMultipliers.load_multiplier}
- density_rule      = "${levelMultipliers.density_rule}"

Como aplicar:
- Reps/rounds/calorias/metros/tempo -> multiplique por volume_multiplier e arredonde:
  • reps: arredondar para múltiplos de 5 quando aplicável
  • metros: arredondar para 50m/100m
  • calorias: arredondar para 5 cal
- Cargas (kg/lb e formatos 20/15kg, 30/20lb, 32/24kg):
  -> multiplique por load_multiplier e arredonde para:
     • kg: múltiplos de 2.5kg
     • lb: múltiplos de 5lb
- NÃO mude exercícios nem equipamentos (não invente nada).
- NÃO adicione blocos novos.
${adaptations.unavailableEquipment.length > 0 ? `
SUBSTITUIÇÕES DE EQUIPAMENTO (APENAS se o equipamento estiver no treino original):
${equipmentRules}` : ''}
${adaptations.otherNotes ? `
OBSERVAÇÕES DO ATLETA:
${adaptations.otherNotes}` : ''}

━━━━━━━━━━━━━━━━━━━━━━
REGRA DE TEMPO (OBRIGATÓRIA)
━━━━━━━━━━━━━━━━━━━━━━
O treino final deve CABER no tempo: total_minutes_estimated <= ${timeLimit}.

Se precisar cortar tempo, corte nessa ordem:
1) corrida opcional
2) core/finalização
3) conditioning (reduzindo volume, mantendo intensidade do nível)
4) força/técnica (reduz séries, mas não zera)
5) aquecimento (reduz, mas nunca zera)

Se tempo for maior, você pode aumentar volume, mas mantendo o MESMO nível de dificuldade.

━━━━━━━━━━━━━━━━━━━━━━
SAÍDA (OBRIGATÓRIA)
━━━━━━━━━━━━━━━━━━━━━━
Responda SOMENTE em JSON válido (sem texto fora do JSON):

{
  "day": "${workout.day}",
  "level": "${levelLabel}",
  "time_limit_min": ${timeLimit},
  "total_minutes": <number <= ${timeLimit}>,
  "applied_multipliers": {
    "volume_multiplier": ${levelMultipliers.volume_multiplier},
    "load_multiplier": ${levelMultipliers.load_multiplier},
    "density_rule": "${levelMultipliers.density_rule}"
  },
  "blocks": [
    {
      "type": "aquecimento|forca|conditioning|core|especifico|corrida",
      "title": "<titulo>",
      "target_minutes": <number>,
      "content": "<conteúdo do bloco com números já escalados>"
    }
  ],
  "proof_of_level_adaptation": {
    "examples": [
      { "from": "<exemplo original do admin>", "to": "<como ficou adaptado>" },
      { "from": "<outro exemplo original>", "to": "<como ficou adaptado>" }
    ]
  }
}

Validação final: se proof_of_level_adaptation estiver vazio ou não houver mudança numérica, gere novamente corrigindo.`;

    const userPrompt = `Adapte o treino acima aplicando os multiplicadores do nível ${levelLabel}. Retorne SOMENTE JSON válido.`;

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
