import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkoutBlock {
  id: string;
  type: string;
  title: string;
  content: string;
}

interface AthleteConfig {
  trainingLevel: 'base' | 'progressivo' | 'performance';
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

// OUTLIER Training Level multipliers (base reference is always PRO)
const TRAINING_LEVEL_MULTIPLIERS = {
  base: {
    volume_multiplier: 0.70,
    load_multiplier: 0.80,
    density_rule: "volume reduzido, mais controle, pausas ampliadas",
  },
  progressivo: {
    volume_multiplier: 0.90,
    load_multiplier: 0.95,
    density_rule: "densidade moderada, estímulo sustentável",
  },
  performance: {
    volume_multiplier: 1.00,
    load_multiplier: 1.00,
    density_rule: "alta densidade, ritmos agressivos, estímulo máximo",
  },
};

const EQUIPMENT_SUBSTITUTIONS: Record<string, string> = {
  ski: "Assault Bike, Remo ou Burpees",
  remo: "Assault Bike, SKI ou Running",
  sled: "Lunges com peso, Farmer's Carry ou Bear Crawl",
  wallball: "Thrusters com dumbbells ou Kettlebell",
};

// ============================================
// FUNÇÕES DE SCALING DETERMINÍSTICO
// ============================================

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function roundToMultiple(n: number, multiple: number): number {
  return Math.round(n / multiple) * multiple;
}

/**
 * Escala números em uma linha (reps, metros, calorias, rounds)
 * Ex: "50 Wall Ball" -> "35 Wall Ball" (com mult 0.70)
 */
function scaleLineVolume(line: string, mult: number): string {
  // Não escala se mult é 1.0
  if (mult === 1.0) return line;
  
  // Pattern para números seguidos de unidades ou exercícios
  return line.replace(/\b(\d{1,4})\s*(m|cal|reps?|rounds?|min|x|sets?|séries?)?\b/gi, (match, numStr, unit) => {
    const num = parseInt(numStr, 10);
    if (!Number.isFinite(num) || num <= 0) return match;
    
    let scaled: number;
    
    // Metros: arredondar para 50 ou 100
    if (unit && unit.toLowerCase() === 'm') {
      scaled = roundToMultiple(num * mult, num >= 500 ? 100 : 50);
    }
    // Calorias: arredondar para 5
    else if (unit && unit.toLowerCase() === 'cal') {
      scaled = roundToMultiple(num * mult, 5);
    }
    // Minutos: manter mais precisão
    else if (unit && unit.toLowerCase() === 'min') {
      scaled = Math.round(num * mult);
    }
    // Reps/rounds: arredondar para 5 se >= 10, senão manter inteiro
    else {
      scaled = num >= 10 ? roundToMultiple(num * mult, 5) : Math.round(num * mult);
    }
    
    scaled = clampInt(scaled, 1, 9999);
    return unit ? `${scaled}${unit}` : `${scaled}`;
  });
}

/**
 * Escala cargas no formato "20/15kg", "30/20lb", "32/24kg"
 */
function scaleLineLoads(line: string, loadMult: number): string {
  if (loadMult === 1.0) return line;
  
  // Pattern: 20/15kg ou 30/20lb
  return line.replace(/(\d{1,3})\s*\/\s*(\d{1,3})\s*(kg|lb)\b/gi, (_, a, b, unit) => {
    const unitLower = unit.toLowerCase();
    const multiple = unitLower === 'kg' ? 2.5 : 5;
    
    const A = roundToMultiple(parseInt(a, 10) * loadMult, multiple);
    const B = roundToMultiple(parseInt(b, 10) * loadMult, multiple);
    
    return `${clampInt(A, 1, 999)}/${clampInt(B, 1, 999)}${unit}`;
  });
}

/**
 * Escala uma linha de número isolado seguido de @ (para séries com carga)
 * Ex: "5x5 @ 70/50kg" -> "4x4 @ 56/40kg"
 */
function scaleLineWithAt(line: string, volMult: number, loadMult: number): string {
  // Pattern: NxN @ carga
  return line.replace(/(\d+)\s*x\s*(\d+)\s*@\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*(kg|lb)/gi, 
    (_, sets, reps, loadA, loadB, unit) => {
      const unitLower = unit.toLowerCase();
      const multiple = unitLower === 'kg' ? 2.5 : 5;
      
      const newSets = volMult === 1.0 ? parseInt(sets) : clampInt(Math.round(parseInt(sets) * volMult), 1, 20);
      const newReps = volMult === 1.0 ? parseInt(reps) : clampInt(Math.round(parseInt(reps) * volMult), 1, 50);
      const newLoadA = roundToMultiple(parseInt(loadA) * loadMult, multiple);
      const newLoadB = roundToMultiple(parseInt(loadB) * loadMult, multiple);
      
      return `${newSets}x${newReps} @ ${clampInt(newLoadA, 1, 999)}/${clampInt(newLoadB, 1, 999)}${unit}`;
    }
  );
}

/**
 * Aplica scaling completo em um bloco de treino
 */
function scaleBlockContent(content: string, blockType: string, volMult: number, loadMult: number): string {
  const lines = content.split('\n');
  
  const scaledLines = lines.map(line => {
    // Não escala linhas de instrução/descrição
    if (line.trim().startsWith('//') || line.trim().startsWith('Descanso') || line.trim().startsWith('Rest')) {
      return line;
    }
    
    let scaled = line;
    
    // Primeiro: séries com @ (ex: 5x5 @ 70/50kg)
    scaled = scaleLineWithAt(scaled, volMult, loadMult);
    
    // Segundo: cargas isoladas (ex: 20/15kg)
    scaled = scaleLineLoads(scaled, loadMult);
    
    // Terceiro: volumes (números gerais)
    // Não aplica volume scaling em warmup
    if (blockType !== 'aquecimento') {
      scaled = scaleLineVolume(scaled, volMult);
    }
    
    return scaled;
  });
  
  return scaledLines.join('\n');
}

/**
 * Substitui equipamento indisponível
 */
function substituteEquipment(content: string, unavailable: string[]): { content: string; substitutions: string[] } {
  const substitutions: string[] = [];
  let modified = content;
  
  for (const eq of unavailable) {
    const eqLower = eq.toLowerCase();
    const replacement = EQUIPMENT_SUBSTITUTIONS[eqLower];
    
    if (!replacement) continue;
    
    // Regex case-insensitive para o equipamento
    const regex = new RegExp(`\\b${eq}\\b`, 'gi');
    
    if (regex.test(modified)) {
      substitutions.push(`${eq.toUpperCase()} → ${replacement.split(',')[0].trim()}`);
      modified = modified.replace(regex, replacement.split(',')[0].trim());
    }
  }
  
  return { content: modified, substitutions };
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

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
      console.error("[adapt-workout] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[adapt-workout] Authenticated user:", user.id);
    // ========== END AUTHENTICATION ==========

    const { athleteConfig, workout, adaptations }: RequestBody = await req.json();
    
    console.log("Adapt workout request:", { trainingLevel: athleteConfig.trainingLevel, day: workout.day });

    // Check if there's a workout to adapt
    if (!workout || !workout.blocks || workout.blocks.length === 0) {
      return new Response(JSON.stringify({ 
        adaptedWorkout: null,
        message: "Nenhum treino inserido para este dia." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trainingLevel = athleteConfig.trainingLevel || 'progressivo';
    const levelMultipliers = TRAINING_LEVEL_MULTIPLIERS[trainingLevel] || TRAINING_LEVEL_MULTIPLIERS.progressivo;
    const timeLimit = athleteConfig.sessionDuration === 'ilimitado' ? 90 : athleteConfig.sessionDuration;
    const levelLabel = trainingLevel.toUpperCase();

    // Ajuste por sexo (proporcional, não "mais fácil")
    const sexLoadAdjust = athleteConfig.sexo === 'feminino' ? 0.85 : 1.0;
    const volMult = levelMultipliers.volume_multiplier;
    const loadMult = levelMultipliers.load_multiplier * sexLoadAdjust;

    console.log(`OUTLIER Engine: trainingLevel=${trainingLevel}, vol=${volMult}, load=${loadMult}`);

    // Time budget by training level
    const timeBudget: Record<string, number> = {
      aquecimento: timeLimit <= 45 ? 8 : timeLimit <= 60 ? 10 : 12,
      forca: timeLimit <= 45 ? 10 : timeLimit <= 60 ? 15 : 20,
      conditioning: timeLimit <= 45 ? 24 : timeLimit <= 60 ? 30 : 50,
      core: timeLimit <= 45 ? 3 : timeLimit <= 60 ? 5 : 8,
      especifico: timeLimit <= 60 ? 0 : 10,
      corrida: 0,
      notas: 0,
    };

    // CONDENSE MODE - compressão inteligente quando tempo é curto
    let condenseMode = false;
    let condenseMult = 1.0;
    
    if (trainingLevel === 'performance' && timeLimit <= 45) {
      condenseMode = true;
      condenseMult = 0.75;
      console.log("CONDENSE MODE activated for PERFORMANCE level");
    }

    // Aplica scaling determinístico em cada bloco
    const adaptedBlocks = workout.blocks.map(block => {
      const blockType = block.type;
      
      // Multiplicador final de volume (considera condense mode)
      const finalVolMult = condenseMode && (blockType === 'conditioning' || blockType === 'core') 
        ? volMult * condenseMult 
        : volMult;
      
      // Aplica scaling
      let scaledContent = scaleBlockContent(block.content, blockType, finalVolMult, loadMult);
      
      // Substitui equipamento indisponível
      const { content: substitutedContent, substitutions } = substituteEquipment(
        scaledContent, 
        adaptations.unavailableEquipment
      );
      
      if (substitutions.length > 0) {
        console.log(`Substitutions in ${block.title}:`, substitutions);
      }

      return {
        type: blockType,
        title: block.title,
        target_minutes: timeBudget[blockType] || 0,
        content: substitutedContent,
        original_content: block.content,
      };
    });

    // Calcula tempo total
    const totalMinutes = adaptedBlocks.reduce((sum, b) => sum + (b.target_minutes || 0), 0);

    // Gera exemplos de adaptação para proof
    const examples: Array<{ from: string; to: string }> = [];
    
    for (const block of adaptedBlocks) {
      const origLines = block.original_content.split('\n').filter(l => l.trim());
      const adaptedLines = block.content.split('\n').filter(l => l.trim());
      
      for (let i = 0; i < Math.min(2, origLines.length); i++) {
        if (origLines[i] !== adaptedLines[i]) {
          examples.push({
            from: origLines[i].trim(),
            to: adaptedLines[i].trim(),
          });
        }
      }
      
      if (examples.length >= 3) break;
    }

    // Monta resposta final
    const adaptedWorkoutJson = {
      day: workout.day,
      level: levelLabel,
      time_limit_min: timeLimit,
      total_minutes: Math.min(totalMinutes, timeLimit),
      condense_mode: condenseMode,
      applied_multipliers: {
        volume_multiplier: volMult,
        load_multiplier: loadMult,
        condense_multiplier: condenseMode ? condenseMult : null,
        density_rule: levelMultipliers.density_rule,
      },
      blocks: adaptedBlocks.map(b => ({
        type: b.type,
        title: b.title,
        target_minutes: b.target_minutes,
        content: b.content,
      })),
      proof_of_level_adaptation: {
        examples: examples.slice(0, 3),
      },
    };

    console.log("Adapted workout generated successfully:", {
      level: levelLabel,
      totalMinutes: adaptedWorkoutJson.total_minutes,
      condenseMode,
      examplesCount: examples.length,
    });

    return new Response(JSON.stringify({ 
      adaptedWorkout: null,
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
