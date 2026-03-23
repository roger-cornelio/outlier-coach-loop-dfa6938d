import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CoachStyle = 'IRON' | 'PULSE' | 'SPARK';

interface SessionBlock {
  title: string;
  type: string;
  format: 'for_time' | 'amrap' | 'emom' | 'strength' | 'other';
  completed: boolean;
  timeInSeconds?: number;
  estimatedTimeSeconds?: number;
  reps?: number;
  structureDescription?: string | null;
}

interface RequestBody {
  coachStyle: CoachStyle;
  gender?: string;
  // New multi-block payload
  sessionBlocks?: SessionBlock[];
  workoutDay?: string;
  workoutStimulus?: string;
  totalBlocks?: number;
  completedBlocks?: number;
  // Legacy single-block fields
  completed: boolean;
  timeInSeconds?: number;
  targetSeconds?: number;
  targetRange?: { min: number; max: number };
  isBenchmark?: boolean;
  wodType?: string;
  durationMinutes?: number;
  workoutTitle: string;
  workoutContent: string;
  athleteLevel: string;
  previousTimes?: number[];
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Female-specific guidelines
const FEMALE_GUIDELINES = `
DIRETRIZES PARA ATLETAS FEMININAS:
- Evitar tom confrontacional ou militar
- Valorizar controle, constância e percepção corporal
- Usar incentivo sem comparação externa
- Manter exigência, mas com leitura emocional
- Reconhecer inteligência corporal e autoconhecimento
`;

const COACH_PERSONALITY: Record<string, string> = {
  IRON: `Você É uma pessoa chamada IRON. Treinador bruto, de poucas palavras, que fala olhando nos olhos. Está ali no box, suado, vendo o atleta treinar.

COMO VOCÊ FALA:
- Como um treinador de verdade no vestiário depois do treino
- "Você fez X. Foi Y. Agora faz Z." — simples assim
- Frases curtas, sem enfeite, sem palavra difícil
- Se foi bom, reconhece com poucas palavras
- Se foi ruim, fala na cara
- Nunca usa: "performance", "consistência", "evolução", "sistema central", "transições"
- Fala como gente: "treino", "tempo", "ritmo", "cansaço", "força"
- Zero emojis`,

  PULSE: `Você É uma pessoa chamada PULSE. Aquele treinador que o atleta confia pra contar que dormiu mal, que tá sem motivação. Você entende o ser humano por trás do atleta. Você é um amigo que treina junto.

COMO VOCÊ FALA:
- Como um amigo treinador no fim do treino, tomando água juntos
- Tom de conversa, não de análise
- Reconhece o esforço real, não o número
- Se foi ruim, acolhe sem mentir
- Nunca usa: "performance", "métricas", "transições", "estímulo"
- Fala como gente: "treino", "tempo", "dia pesado", "você veio", "tá junto"
- Zero emojis`,

  SPARK: `Você É uma pessoa chamada SPARK. O cara mais animado do box. Quando o atleta termina o treino, você é o primeiro a bater palma e gritar. Genuíno, não forçado.

COMO VOCÊ FALA:
- Como aquele amigo que te anima antes e depois de qualquer treino
- Energia real, não de motivational speaker
- Usa emojis como gente usa no WhatsApp — natural (🔥 💪 😤)
- Se foi ruim, encontra algo bom de verdade
- Nunca usa: "performance", "estímulo", "valência", "sistema"
- Fala como gente: "treino", "tempo", "pegou pesado", "arrasou", "bora"`
};

function buildSessionContext(blocks: SessionBlock[]): string {
  if (!blocks || blocks.length === 0) return 'Nenhum bloco registrado.';
  
  return blocks.map(b => {
    let line = `- ${b.title} (${b.format})`;
    if (b.format === 'for_time' && b.timeInSeconds) {
      line += `: fez em ${formatTime(b.timeInSeconds)}`;
      if (b.estimatedTimeSeconds && b.estimatedTimeSeconds > 0) {
        const diff = b.timeInSeconds - b.estimatedTimeSeconds;
        if (diff < -10) line += ` (${formatTime(Math.abs(diff))} mais rápido que o estimado de ${formatTime(b.estimatedTimeSeconds)})`;
        else if (diff > 10) line += ` (${formatTime(diff)} mais lento que o estimado de ${formatTime(b.estimatedTimeSeconds)})`;
        else line += ` (dentro do estimado de ${formatTime(b.estimatedTimeSeconds)})`;
      }
    } else if (b.format === 'amrap' && b.reps) {
      line += `: ${b.reps} rounds/reps`;
      if (b.structureDescription) line += ` em ${b.structureDescription}`;
    } else if (b.format === 'emom') {
      line += ': concluiu';
    } else if (b.completed) {
      line += ': concluiu';
    }
    return line;
  }).join('\n');
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
    console.log("[generate-performance-feedback] User:", user.id);
    // ========== END AUTHENTICATION ==========

    const body: RequestBody = await req.json();
    const { coachStyle, gender, sessionBlocks, workoutDay, workoutStimulus, totalBlocks, completedBlocks: completedCount } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const genderGuidelines = gender === 'Feminino' ? FEMALE_GUIDELINES : '';
    const personality = COACH_PERSONALITY[coachStyle] || COACH_PERSONALITY.PULSE;

    // Determine if this is the new multi-block flow or legacy single-block
    const isMultiBlock = sessionBlocks && sessionBlocks.length > 0;
    
    let userPrompt: string;
    
    if (isMultiBlock) {
      const sessionContext = buildSessionContext(sessionBlocks);
      const hasTimeBlocks = sessionBlocks.some(b => b.timeInSeconds && b.estimatedTimeSeconds);
      
      userPrompt = `O atleta acabou de terminar o treino de ${workoutDay || 'hoje'}${workoutStimulus ? ` (${workoutStimulus})` : ''}.

RESULTADO POR BLOCO:
${sessionContext}

${totalBlocks ? `Total de blocos: ${totalBlocks}, registrados: ${completedCount || sessionBlocks.length}` : ''}

Fale com o atleta sobre a sessão COMO UM TODO. Comente sobre o que ele fez nos blocos, compare tempos quando tiver dados. Se ele foi mais rápido que o estimado, reconheça. Se foi mais lento, comente sem ser cruel.

3-4 frases no máximo. Só o texto, sem aspas, sem introdução. Fale como se tivesse mandando uma mensagem de WhatsApp pro atleta.`;
    } else {
      // Legacy single-block flow
      const { completed, timeInSeconds, targetSeconds, workoutTitle, workoutContent } = body;
      userPrompt = `O atleta acabou de fazer este treino:
TREINO: ${workoutTitle}
${workoutContent}

O QUE ACONTECEU:
- ${completed ? 'Ele completou' : 'Ele NÃO completou'}
- ${timeInSeconds ? `Tempo: ${formatTime(timeInSeconds)}` : 'Não registrou tempo'}
${targetSeconds ? `- Tempo alvo era: ${formatTime(targetSeconds)}` : ''}

Fale com ele agora. 2-3 frases no máximo. Só o texto, sem aspas, sem introdução.`;
    }

    const systemPrompt = `${personality}

${genderGuidelines}

VOCÊ ESTÁ FALANDO DIRETAMENTE COM O ATLETA. Imagine que ele acabou de terminar o treino e está na sua frente.

O QUE VOCÊ FAZ:
1. Comenta sobre o que ele FEZ (blocos, tempos, se completou)
2. Dá sua opinião HONESTA
3. Diz o que ele deve fazer agora

REGRAS:
- Fale como PESSOA, não como sistema
- PROIBIDO usar: "performance", "evolução", "consistência", "transições", "sistema central", "estímulo", "métricas", "valência"
- PROIBIDO frases genéricas: "continue evoluindo", "bom trabalho", "treino registrado", "parabéns pelo esforço"
- Use palavras simples: "treino", "tempo", "ritmo", "força", "cansaço", "fôlego"
- O feedback deve soar como uma MENSAGEM DE WHATSAPP de um treinador`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ 
        feedback: null,
        bucket: null 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content || null;

    return new Response(JSON.stringify({ feedback, bucket: 'OK' }), {
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
