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

const LEVEL_NAMES: Record<string, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  hyrox_pro: 'HYROX PRO',
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

    // Build the workout content string
    const workoutContent = workout.blocks.map(block => {
      return `[${block.type.toUpperCase()}] ${block.title}\n${block.content}`;
    }).join('\n\n');

    // Build unavailable equipment string
    const unavailableEquipmentStr = adaptations.unavailableEquipment.length > 0
      ? `\nEquipamentos indisponíveis: ${adaptations.unavailableEquipment.join(', ')}`
      : '';
    
    const otherNotesStr = adaptations.otherNotes
      ? `\nObservações adicionais: ${adaptations.otherNotes}`
      : '';

    const tempoDisponivel = athleteConfig.sessionDuration === 'ilimitado' 
      ? 'Ilimitado' 
      : `${athleteConfig.sessionDuration}`;

    const systemPrompt = `Você é o motor de adaptação de treinos do OUTLIER.

Sua função NÃO é criar novos treinos.
Sua função é ADAPTAR fielmente o treino que foi inserido pelo admin,
respeitando rigorosamente as configurações do atleta abaixo.

⚠️ REGRA ABSOLUTA:
Se NÃO existir treino inserido pelo admin para o dia selecionado,
responda EXATAMENTE:
"Nenhum treino inserido para este dia."
E finalize. Não sugira, não crie, não adapte nada.

━━━━━━━━━━━━━━━━━━━━━━
REGRAS DE ADAPTAÇÃO
━━━━━━━━━━━━━━━━━━━━━━

1️⃣ NÍVEL DO ATLETA
- Iniciante → reduzir volume, carga e complexidade
- Intermediário → manter estrutura, ajustar cargas
- Avançado → manter estímulo e intensidade
- HYROX PRO → manter padrão competitivo, sem simplificação

2️⃣ TEMPO DISPONÍVEL
- O tempo total do treino (aquecimento + blocos + conditioning)
NÃO pode ultrapassar o tempo disponível.
- Se necessário, reduza rounds, reps ou distância.
- Nunca elimine o bloco principal do treino.

3️⃣ PESO, ALTURA E SEXO
- Ajuste cargas, reps e impacto conforme o peso corporal.
- Em movimentos cíclicos (corrida, remo, ski), ajuste pacing esperado.
- Em exercícios de força, use cargas relativas (percentual, dumbbells, kettlebells).

4️⃣ EQUIPAMENTOS INDISPONÍVEIS
- Substitua equipamentos indisponíveis por alternativas viáveis.
- SKI → substitua por Assault Bike, Remo ou Burpees
- REMO → substitua por Assault Bike, SKI ou Running
- SLED → substitua por Lunges com peso, Farmer's Carry ou Bear Crawl
- WALL BALL → substitua por Thrusters com dumbbells ou KB

5️⃣ ESTRUTURA
- Preserve a ordem dos blocos:
  Aquecimento → Força/Técnica → Conditioning → Finalização/Core (se houver)
- Nunca reordene blocos.
- Nunca crie blocos extras.

━━━━━━━━━━━━━━━━━━━━━━
FORMATO DA RESPOSTA
━━━━━━━━━━━━━━━━━━━━━━

- Título do dia
- Objetivo do treino (1 frase)
- Blocos organizados e claros com tipo entre colchetes [AQUECIMENTO], [FORÇA], [CONDITIONING], etc
- Tempo estimado por bloco
- Observações de intensidade ou pacing (quando aplicável)

⚠️ NÃO explique decisões.
⚠️ NÃO faça comentários motivacionais.
⚠️ NÃO traga sugestões extras.
⚠️ Apenas entregue o treino adaptado final.`;

    const userPrompt = `━━━━━━━━━━━━━━━━━━━━━━
CONFIGURAÇÕES DO ATLETA
━━━━━━━━━━━━━━━━━━━━━━
Altura: ${athleteConfig.altura || 'Não informada'} cm  
Peso: ${athleteConfig.peso || 'Não informado'} kg  
Idade: ${athleteConfig.idade || 'Não informada'} anos  
Sexo: ${athleteConfig.sexo || 'Não informado'}  
Nível do atleta: ${LEVEL_NAMES[athleteConfig.level]}  
Tempo disponível: ${tempoDisponivel} minutos  
${unavailableEquipmentStr}
${otherNotesStr}

━━━━━━━━━━━━━━━━━━━━━━
TREINO BASE (ADMIN) - ${workout.day}
${workout.stimulus ? `Estímulo: ${workout.stimulus}` : ''}
━━━━━━━━━━━━━━━━━━━━━━

${workoutContent}

Adapte este treino conforme as configurações do atleta.`;

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
    const adaptedWorkout = data.choices?.[0]?.message?.content || null;

    return new Response(JSON.stringify({ adaptedWorkout }), {
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
