import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// MOTOR DE ADAPTAÇÃO OBRIGATÓRIO - OUTLIER
// ============================================
// REGRAS FUNDAMENTAIS:
// 1. Nenhum treino é entregue sem passar por este motor
// 2. A planilha do coach define INTENÇÃO, não volume final
// 3. O atleta DEVE informar: nível, gênero, tempo, equipamentos
// 4. Ordem de cálculo: tipo → nível → gênero → tempo → equipamentos
// ============================================

type AthleteLevel = 'iniciante' | 'intermediario' | 'avancado' | 'pro';
type Gender = 'masculino' | 'feminino';
type BlockType = 'conditioning' | 'forca' | 'corrida' | 'aquecimento' | 'core' | 'especifico' | 'notas';

interface MandatoryAthleteParams {
  level: AthleteLevel;
  gender: Gender;
  availableTimeMinutes: number;
  availableEquipment: string[];
}

interface WorkoutBlockInput {
  id: string;
  type: BlockType;
  title: string;
  content: string;
  estimatedMinutes?: number;
  isBenchmark?: boolean;
  benchmarkId?: string;
}

interface RequestBody {
  athleteParams: MandatoryAthleteParams;
  blocks: WorkoutBlockInput[];
  dayLabel?: string;
}

// ============================================
// MULTIPLICADORES OBRIGATÓRIOS (NÃO ALTERAR)
// ============================================
// A planilha do coach representa o nível PRO (100%)
// Nenhum nível pode gerar volume ACIMA da planilha base
// O sistema apenas escala para BAIXO a partir da base
// ============================================
const LEVEL_MULTIPLIERS: Record<AthleteLevel, number> = {
  iniciante: 0.65,      // 60-65% da planilha base
  intermediario: 0.80,  // 75-80% da planilha base
  avancado: 0.90,       // 90% da planilha base
  pro: 1.00,            // 100% da planilha base (TETO MÁXIMO)
};

const GENDER_MULTIPLIERS: Record<Gender, number> = {
  masculino: 1.00,
  feminino: 0.85,
};

const EQUIPMENT_SUBSTITUTIONS: Record<string, string> = {
  'remo': 'Assault Bike ou Burpees',
  'rower': 'Assault Bike ou Burpees',
  'skierg': 'Assault Bike ou Mountain Climbers',
  'ski': 'Assault Bike ou Mountain Climbers',
  'assault bike': 'Remo ou Running',
  'bike': 'Remo ou Running',
  'sled': 'Lunges com peso ou Bear Crawl',
  'sled push': 'Lunges com peso',
  'sled pull': 'Farmer Carry ou Bear Crawl',
  'wallball': 'Thrusters com dumbbell',
  'wall ball': 'Thrusters com dumbbell',
  'sandbag': 'Dumbbell ou Kettlebell',
  'kettlebell': 'Dumbbell',
  'barbell': 'Dumbbells',
  'barra': 'Dumbbells',
  'pullup bar': 'Ring rows ou Bent over rows',
  'barra fixa': 'Ring rows ou Remada',
  'rings': 'TRX ou Floor exercises',
  'argolas': 'TRX ou exercícios de solo',
  'box': 'Step-ups ou Lunges',
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function roundToMultiple(n: number, multiple: number): number {
  return Math.round(n / multiple) * multiple;
}

function scaleVolumeNumbers(line: string, multiplier: number): string {
  if (multiplier === 1.0) return line;
  
  return line.replace(/\b(\d{1,4})\s*(m|cal|reps?|rounds?|x)?\b/gi, (match, numStr, unit) => {
    const num = parseInt(numStr, 10);
    if (!Number.isFinite(num) || num <= 0) return match;
    
    let scaled: number;
    const unitLower = unit?.toLowerCase() || '';
    
    if (unitLower === 'm') {
      scaled = roundToMultiple(num * multiplier, num >= 500 ? 100 : 50);
    } else if (unitLower === 'cal') {
      scaled = roundToMultiple(num * multiplier, 5);
    } else if (unitLower === 'rounds' || unitLower === 'round') {
      scaled = Math.max(1, Math.round(num * multiplier));
    } else {
      scaled = num >= 10 ? roundToMultiple(num * multiplier, 5) : Math.round(num * multiplier);
    }
    
    scaled = clampInt(scaled, 1, 9999);
    return unit ? `${scaled}${unit}` : `${scaled}`;
  });
}

function scaleDistance(line: string, multiplier: number): string {
  if (multiplier === 1.0) return line;
  
  return line.replace(/\b(\d{1,5})\s*(m|km|metros?|quilômetros?)\b/gi, (match, numStr, unit) => {
    const num = parseInt(numStr, 10);
    if (!Number.isFinite(num) || num <= 0) return match;
    
    const unitLower = unit.toLowerCase();
    let scaled: number;
    
    if (unitLower === 'km' || unitLower.includes('quilômetro')) {
      scaled = Math.round(num * multiplier * 10) / 10;
    } else {
      scaled = roundToMultiple(num * multiplier, num >= 500 ? 100 : 50);
    }
    
    return `${scaled}${unit}`;
  });
}

function scaleStrengthSets(line: string, genderMultiplier: number): string {
  if (genderMultiplier === 1.0) return line;
  
  return line.replace(/(\d+)\s*x\s*(\d+)/gi, (match, sets, reps) => {
    const scaledSets = Math.max(1, Math.round(parseInt(sets) * genderMultiplier));
    return `${scaledSets}x${reps}`;
  });
}

function estimateBlockMinutes(content: string, type: BlockType): number {
  const lines = content.split('\n').filter(l => l.trim());
  let totalMinutes = 0;
  
  const roundsMatch = content.toLowerCase().match(/(\d+)\s*(round|rounds)/);
  const rounds = roundsMatch ? parseInt(roundsMatch[1]) : 1;
  
  for (const line of lines) {
    const s = line.toLowerCase();
    
    if (s.includes('m') && (s.includes('run') || s.includes('corrida') || s.includes('trote'))) {
      const match = s.match(/(\d+)\s*m/);
      if (match) totalMinutes += (parseInt(match[1]) / 1000) * 6;
    } else if (s.includes('remo') && s.includes('m')) {
      const match = s.match(/(\d+)\s*m/);
      if (match) totalMinutes += (parseInt(match[1]) / 1000) * 4.5;
    } else if (s.includes('cal')) {
      const match = s.match(/(\d+)\s*cal/);
      if (match) totalMinutes += (parseInt(match[1]) / 50) * 3;
    } else {
      totalMinutes += 1.5;
    }
  }
  
  totalMinutes *= rounds;
  
  if (type === 'conditioning') {
    totalMinutes *= 1.1;
  }
  
  return Math.max(1, Math.round(totalMinutes));
}

function substituteEquipment(content: string, unavailable: string[]): { content: string; substitutions: string[] } {
  const substitutions: string[] = [];
  let modified = content;
  const unavailableSet = new Set(unavailable.map(e => e.toLowerCase()));
  
  for (const [equipment, substitute] of Object.entries(EQUIPMENT_SUBSTITUTIONS)) {
    if (!unavailableSet.has(equipment.toLowerCase())) continue;
    
    const regex = new RegExp(`\\b${equipment}\\b`, 'gi');
    
    if (regex.test(modified)) {
      const primarySubstitute = substitute.split(' ou ')[0].trim();
      substitutions.push(`${equipment.toUpperCase()} → ${primarySubstitute}`);
      modified = modified.replace(regex, primarySubstitute);
    }
  }
  
  return { content: modified, substitutions };
}

function validateParams(params: MandatoryAthleteParams): string[] {
  const errors: string[] = [];
  
  if (!params.level || !['iniciante', 'intermediario', 'avancado', 'pro'].includes(params.level)) {
    errors.push('Nível do atleta é obrigatório (iniciante, intermediario, avancado, pro)');
  }
  
  if (!params.gender || !['masculino', 'feminino'].includes(params.gender)) {
    errors.push('Gênero é obrigatório (masculino ou feminino)');
  }
  
  if (params.availableTimeMinutes === undefined || params.availableTimeMinutes < 15) {
    errors.push('Tempo disponível é obrigatório (mínimo 15 minutos)');
  }
  
  if (!params.availableEquipment) {
    errors.push('Lista de equipamentos disponíveis é obrigatória');
  }
  
  return errors;
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { athleteParams, blocks, dayLabel }: RequestBody = await req.json();
    
    console.log("=== MOTOR DE ADAPTAÇÃO OBRIGATÓRIO ===");
    console.log("Parâmetros recebidos:", {
      level: athleteParams?.level,
      gender: athleteParams?.gender,
      time: athleteParams?.availableTimeMinutes,
      equipmentCount: athleteParams?.availableEquipment?.length,
      blocksCount: blocks?.length,
    });

    // 1. VALIDAÇÃO OBRIGATÓRIA
    const validationErrors = validateParams(athleteParams);
    if (validationErrors.length > 0) {
      console.error("Validação falhou:", validationErrors);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Parâmetros obrigatórios não informados",
        validationErrors,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!blocks || blocks.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "Nenhum bloco de treino fornecido",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. OBTER MULTIPLICADORES
    const levelMult = LEVEL_MULTIPLIERS[athleteParams.level];
    const genderMult = GENDER_MULTIPLIERS[athleteParams.gender];
    
    console.log(`Multiplicadores: level=${levelMult}, gender=${genderMult}`);

    // 3. CALCULAR TEMPO TOTAL ORIGINAL
    let totalOriginalMinutes = 0;
    for (const block of blocks) {
      totalOriginalMinutes += block.estimatedMinutes || estimateBlockMinutes(block.content, block.type);
    }

    // 4. CALCULAR AJUSTE POR TEMPO
    const timeAdjustment = totalOriginalMinutes <= athleteParams.availableTimeMinutes
      ? 1.0
      : Math.max(0.50, athleteParams.availableTimeMinutes / totalOriginalMinutes);
    
    const timeWasLimiting = timeAdjustment < 1.0;
    console.log(`Tempo: original=${totalOriginalMinutes}min, disponível=${athleteParams.availableTimeMinutes}min, ajuste=${timeAdjustment}`);

    // 5. DETERMINAR EQUIPAMENTOS INDISPONÍVEIS
    const allEquipment = Object.keys(EQUIPMENT_SUBSTITUTIONS);
    const unavailableEquipment = allEquipment.filter(
      eq => !athleteParams.availableEquipment.some(
        avail => avail.toLowerCase().includes(eq.toLowerCase()) || eq.toLowerCase().includes(avail.toLowerCase())
      )
    );

    // 6. ADAPTAR CADA BLOCO
    const adaptedBlocks = [];
    let totalEquipmentSubstitutions = 0;

    for (const block of blocks) {
      let adaptedContent: string;
      
      // ORDEM: tipo → nível → gênero → tempo
      switch (block.type) {
        case 'conditioning':
          adaptedContent = scaleVolumeNumbers(block.content, levelMult * genderMult * timeAdjustment);
          break;
          
        case 'forca':
          adaptedContent = scaleStrengthSets(block.content, genderMult);
          break;
          
        case 'corrida':
          adaptedContent = scaleDistance(block.content, genderMult * timeAdjustment);
          break;
          
        case 'aquecimento':
          adaptedContent = timeWasLimiting
            ? scaleVolumeNumbers(block.content, timeAdjustment)
            : block.content;
          break;
          
        case 'core':
          adaptedContent = scaleVolumeNumbers(block.content, levelMult * genderMult * timeAdjustment);
          break;
          
        default:
          adaptedContent = block.content;
      }

      // 7. SUBSTITUIÇÃO DE EQUIPAMENTOS (APÓS adaptação de volume)
      const { content: finalContent, substitutions } = substituteEquipment(adaptedContent, unavailableEquipment);
      totalEquipmentSubstitutions += substitutions.length;

      const originalMinutes = block.estimatedMinutes || estimateBlockMinutes(block.content, block.type);
      const finalMinutes = Math.round(originalMinutes * timeAdjustment);

      adaptedBlocks.push({
        id: block.id,
        type: block.type,
        title: block.title,
        content: finalContent,
        originalContent: block.content,
        estimatedMinutes: finalMinutes,
        isBenchmark: block.isBenchmark,
        benchmarkId: block.benchmarkId,
        adaptationApplied: {
          levelMultiplier: levelMult,
          genderMultiplier: genderMult,
          timeAdjustment,
          equipmentSubstitutions: substitutions,
        },
      });
    }

    const totalAdaptedMinutes = adaptedBlocks.reduce((sum, b) => sum + (b.estimatedMinutes || 0), 0);

    console.log("=== ADAPTAÇÃO COMPLETA ===");
    console.log(`Original: ${totalOriginalMinutes}min → Adaptado: ${totalAdaptedMinutes}min`);
    console.log(`Substituições de equipamento: ${totalEquipmentSubstitutions}`);

    return new Response(JSON.stringify({
      success: true,
      dayLabel,
      adaptedBlocks,
      summary: {
        totalOriginalMinutes,
        totalAdaptedMinutes,
        appliedMultipliers: {
          level: levelMult,
          gender: genderMult,
          finalVolume: levelMult * genderMult * timeAdjustment,
        },
        timeWasLimiting,
        equipmentSubstitutionsCount: totalEquipmentSubstitutions,
      },
      engineInfo: {
        name: 'OUTLIER_MANDATORY_ADAPTATION',
        version: '1.0.0',
        calculationOrder: [
          '1. Tipo de bloco',
          '2. Nível do atleta',
          '3. Gênero',
          '4. Tempo disponível',
          '5. Equipamentos',
        ],
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Erro no motor de adaptação:", e);
    return new Response(JSON.stringify({ 
      success: false,
      error: e instanceof Error ? e.message : "Erro desconhecido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
