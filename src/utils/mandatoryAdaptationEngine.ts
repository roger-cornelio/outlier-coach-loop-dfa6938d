// ============================================
// MOTOR DE ADAPTAÇÃO OBRIGATÓRIO - OUTLIER
// ============================================
// REGRAS FUNDAMENTAIS:
// 1. Nenhum treino é entregue sem passar por este motor
// 2. A planilha do coach define INTENÇÃO, não volume final
// 3. O atleta DEVE informar: nível, gênero, tempo, equipamentos
// 4. Ordem de cálculo: tipo → nível → gênero → tempo → equipamentos
// ============================================

export type AthleteLevel = 'iniciante' | 'intermediario' | 'avancado' | 'pro';
export type Gender = 'masculino' | 'feminino';
export type BlockType = 'conditioning' | 'forca' | 'corrida' | 'aquecimento' | 'core' | 'especifico' | 'notas';

// ============================================
// PARÂMETROS OBRIGATÓRIOS DO USUÁRIO
// ============================================
export interface MandatoryAthleteParams {
  level: AthleteLevel;
  gender: Gender;
  availableTimeMinutes: number;
  availableEquipment: string[];
}

// ============================================
// ESTRUTURA DO BLOCO DE TREINO
// ============================================
export interface WorkoutBlockInput {
  id: string;
  type: BlockType;
  title: string;
  content: string;
  estimatedMinutes?: number;
  isBenchmark?: boolean;
  benchmarkId?: string;
}

export interface AdaptedWorkoutBlock extends WorkoutBlockInput {
  adaptedContent: string;
  originalContent: string;
  adaptationApplied: {
    levelMultiplier: number;
    genderMultiplier: number;
    timeAdjustment: number;
    equipmentSubstitutions: string[];
  };
  finalEstimatedMinutes: number;
}

export interface AdaptationResult {
  success: boolean;
  blocks: AdaptedWorkoutBlock[];
  summary: {
    totalOriginalMinutes: number;
    totalAdaptedMinutes: number;
    appliedMultipliers: {
      level: number;
      gender: number;
      finalVolume: number;
    };
    timeWasLimiting: boolean;
    equipmentSubstitutionsCount: number;
  };
  validationErrors: string[];
}

// ============================================
// MULTIPLICADORES OBRIGATÓRIOS (NÃO ALTERAR)
// ============================================
const LEVEL_MULTIPLIERS: Record<AthleteLevel, number> = {
  iniciante: 0.65,
  intermediario: 0.80,
  avancado: 1.00,
  pro: 1.10,
};

const GENDER_MULTIPLIERS: Record<Gender, number> = {
  masculino: 1.00,
  feminino: 0.85,
};

// ============================================
// SUBSTITUIÇÃO DE EQUIPAMENTOS
// ============================================
const EQUIPMENT_SUBSTITUTIONS: Record<string, { substitute: string; maintainsPattern: boolean }> = {
  // Cardio machines
  'remo': { substitute: 'Assault Bike ou Burpees', maintainsPattern: true },
  'rower': { substitute: 'Assault Bike ou Burpees', maintainsPattern: true },
  'skierg': { substitute: 'Assault Bike ou Mountain Climbers', maintainsPattern: true },
  'ski': { substitute: 'Assault Bike ou Mountain Climbers', maintainsPattern: true },
  'assault bike': { substitute: 'Remo ou Running', maintainsPattern: true },
  'bike': { substitute: 'Remo ou Running', maintainsPattern: true },
  
  // Weighted implements
  'sled': { substitute: 'Lunges com peso ou Bear Crawl', maintainsPattern: true },
  'sled push': { substitute: 'Lunges com peso', maintainsPattern: true },
  'sled pull': { substitute: 'Farmer Carry ou Bear Crawl', maintainsPattern: true },
  'wallball': { substitute: 'Thrusters com dumbbell', maintainsPattern: true },
  'wall ball': { substitute: 'Thrusters com dumbbell', maintainsPattern: true },
  'sandbag': { substitute: 'Dumbbell ou Kettlebell', maintainsPattern: true },
  'kettlebell': { substitute: 'Dumbbell', maintainsPattern: true },
  'barbell': { substitute: 'Dumbbells', maintainsPattern: true },
  'barra': { substitute: 'Dumbbells', maintainsPattern: true },
  
  // Gymnastics
  'pullup bar': { substitute: 'Ring rows ou Bent over rows', maintainsPattern: true },
  'barra fixa': { substitute: 'Ring rows ou Remada', maintainsPattern: true },
  'rings': { substitute: 'TRX ou Floor exercises', maintainsPattern: true },
  'argolas': { substitute: 'TRX ou exercícios de solo', maintainsPattern: true },
  'box': { substitute: 'Step-ups ou Lunges', maintainsPattern: true },
};

// ============================================
// FUNÇÕES AUXILIARES DE SCALING
// ============================================

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function roundToMultiple(n: number, multiple: number): number {
  return Math.round(n / multiple) * multiple;
}

/**
 * Escala números de volume (reps, metros, calorias, rounds)
 * NUNCA escala a intenção, apenas o volume
 */
function scaleVolumeNumbers(line: string, multiplier: number): string {
  if (multiplier === 1.0) return line;
  
  return line.replace(/\b(\d{1,4})\s*(m|cal|reps?|rounds?|x)?\b/gi, (match, numStr, unit) => {
    const num = parseInt(numStr, 10);
    if (!Number.isFinite(num) || num <= 0) return match;
    
    let scaled: number;
    const unitLower = unit?.toLowerCase() || '';
    
    // Metros: arredondar para 50 ou 100
    if (unitLower === 'm') {
      scaled = roundToMultiple(num * multiplier, num >= 500 ? 100 : 50);
    }
    // Calorias: arredondar para 5
    else if (unitLower === 'cal') {
      scaled = roundToMultiple(num * multiplier, 5);
    }
    // Rounds: arredondar para inteiro
    else if (unitLower === 'rounds' || unitLower === 'round') {
      scaled = Math.max(1, Math.round(num * multiplier));
    }
    // Reps: arredondar para 5 se >= 10
    else {
      scaled = num >= 10 ? roundToMultiple(num * multiplier, 5) : Math.round(num * multiplier);
    }
    
    scaled = clampInt(scaled, 1, 9999);
    return unit ? `${scaled}${unit}` : `${scaled}`;
  });
}

/**
 * Escala distâncias (usado para corrida/monoestrutural)
 */
function scaleDistance(line: string, multiplier: number): string {
  if (multiplier === 1.0) return line;
  
  return line.replace(/\b(\d{1,5})\s*(m|km|metros?|quilômetros?)\b/gi, (match, numStr, unit) => {
    const num = parseInt(numStr, 10);
    if (!Number.isFinite(num) || num <= 0) return match;
    
    const unitLower = unit.toLowerCase();
    let scaled: number;
    
    if (unitLower === 'km' || unitLower.includes('quilômetro')) {
      // Quilômetros: manter uma casa decimal
      scaled = Math.round(num * multiplier * 10) / 10;
    } else {
      // Metros: arredondar para 50 ou 100
      scaled = roundToMultiple(num * multiplier, num >= 500 ? 100 : 50);
    }
    
    return `${scaled}${unit}`;
  });
}

/**
 * Escala séries para blocos de força
 * Reps permanecem iguais, séries ajustam por gênero
 */
function scaleStrengthSets(line: string, genderMultiplier: number): string {
  if (genderMultiplier === 1.0) return line;
  
  // Pattern: 5x5, 4x8, 3x10 etc.
  return line.replace(/(\d+)\s*x\s*(\d+)/gi, (match, sets, reps) => {
    const scaledSets = Math.max(1, Math.round(parseInt(sets) * genderMultiplier));
    return `${scaledSets}x${reps}`;
  });
}

/**
 * Escala cargas (mantém proporção M/F)
 * Formato: 70/50kg, 30/20lb
 */
function scaleLoads(line: string): string {
  // Cargas já vêm no formato M/F, não precisam de ajuste adicional
  // O multiplicador de gênero já está embutido na planilha do coach
  return line;
}

// ============================================
// VALIDAÇÃO DE PARÂMETROS OBRIGATÓRIOS
// ============================================

export function validateMandatoryParams(params: Partial<MandatoryAthleteParams>): string[] {
  const errors: string[] = [];
  
  if (!params.level) {
    errors.push('Nível do atleta é obrigatório (iniciante, intermediario, avancado, pro)');
  } else if (!['iniciante', 'intermediario', 'avancado', 'pro'].includes(params.level)) {
    errors.push('Nível inválido. Use: iniciante, intermediario, avancado ou pro');
  }
  
  if (!params.gender) {
    errors.push('Gênero é obrigatório (masculino ou feminino)');
  } else if (!['masculino', 'feminino'].includes(params.gender)) {
    errors.push('Gênero inválido. Use: masculino ou feminino');
  }
  
  if (params.availableTimeMinutes === undefined || params.availableTimeMinutes === null) {
    errors.push('Tempo disponível é obrigatório');
  } else if (params.availableTimeMinutes < 15) {
    errors.push('Tempo mínimo é 15 minutos');
  }
  
  if (!params.availableEquipment) {
    errors.push('Lista de equipamentos disponíveis é obrigatória');
  }
  
  return errors;
}

// ============================================
// SUBSTITUIÇÃO DE EQUIPAMENTOS
// ============================================

function substituteEquipmentInContent(
  content: string, 
  unavailableEquipment: string[]
): { content: string; substitutions: string[] } {
  const substitutions: string[] = [];
  let modified = content;
  
  // Determinar equipamentos indisponíveis
  const unavailableSet = new Set(unavailableEquipment.map(e => e.toLowerCase()));
  
  for (const [equipment, { substitute }] of Object.entries(EQUIPMENT_SUBSTITUTIONS)) {
    // Verificar se o equipamento está indisponível
    const equipLower = equipment.toLowerCase();
    if (!unavailableSet.has(equipLower)) continue;
    
    // Regex case-insensitive para o equipamento
    const regex = new RegExp(`\\b${equipment}\\b`, 'gi');
    
    if (regex.test(modified)) {
      const primarySubstitute = substitute.split(' ou ')[0].trim();
      substitutions.push(`${equipment.toUpperCase()} → ${primarySubstitute}`);
      modified = modified.replace(regex, primarySubstitute);
    }
  }
  
  return { content: modified, substitutions };
}

// ============================================
// ADAPTAÇÃO POR TIPO DE BLOCO
// ============================================

function adaptConditioningBlock(
  content: string,
  levelMult: number,
  genderMult: number,
  timeAdjustment: number
): string {
  // volume_final = volume_base × multiplicador_nível × multiplicador_gênero × ajuste_por_tempo
  const finalMultiplier = levelMult * genderMult * timeAdjustment;
  
  let adapted = content;
  
  // Escalar volumes (reps, rounds, distâncias)
  adapted = scaleVolumeNumbers(adapted, finalMultiplier);
  
  return adapted;
}

function adaptStrengthBlock(
  content: string,
  genderMult: number
): string {
  let adapted = content;
  
  // Mantém porcentagem de carga (%1RM ou intensidade relativa)
  // Ajusta número de séries conforme multiplicador de gênero
  // Reps permanecem as mesmas
  adapted = scaleStrengthSets(adapted, genderMult);
  
  // Cargas já estão no formato M/F na planilha
  adapted = scaleLoads(adapted);
  
  return adapted;
}

function adaptRunningBlock(
  content: string,
  genderMult: number,
  timeAdjustment: number
): string {
  // Ajustar distância conforme multiplicador de gênero e tempo
  // Manter pace relativo e estímulo cardiorrespiratório
  const finalMultiplier = genderMult * timeAdjustment;
  
  let adapted = content;
  adapted = scaleDistance(adapted, finalMultiplier);
  
  return adapted;
}

// ============================================
// CÁLCULO DE AJUSTE POR TEMPO
// ============================================

function calculateTimeAdjustment(
  originalMinutes: number,
  availableMinutes: number
): number {
  if (originalMinutes <= availableMinutes) {
    return 1.0; // Sem ajuste necessário
  }
  
  // Reduzir volume proporcionalmente
  // Mínimo de 50% do volume original para manter estímulo
  const ratio = availableMinutes / originalMinutes;
  return Math.max(0.50, ratio);
}

function estimateBlockMinutes(content: string, type: BlockType): number {
  const lines = content.split('\n').filter(l => l.trim());
  let totalMinutes = 0;
  
  // Detectar rounds
  const roundsMatch = content.toLowerCase().match(/(\d+)\s*(round|rounds)/);
  const rounds = roundsMatch ? parseInt(roundsMatch[1]) : 1;
  
  for (const line of lines) {
    const s = line.toLowerCase();
    
    // Corrida/trote
    if (s.includes('m') && (s.includes('run') || s.includes('corrida') || s.includes('trote'))) {
      const match = s.match(/(\d+)\s*m/);
      if (match) totalMinutes += (parseInt(match[1]) / 1000) * 6;
    }
    // Remo
    else if (s.includes('remo') && s.includes('m')) {
      const match = s.match(/(\d+)\s*m/);
      if (match) totalMinutes += (parseInt(match[1]) / 1000) * 4.5;
    }
    // Cal (cardio machine)
    else if (s.includes('cal')) {
      const match = s.match(/(\d+)\s*cal/);
      if (match) totalMinutes += (parseInt(match[1]) / 50) * 3;
    }
    // Default por linha
    else {
      totalMinutes += 1.5;
    }
  }
  
  // Multiplicar por rounds
  totalMinutes *= rounds;
  
  // Adicionar transições para conditioning
  if (type === 'conditioning') {
    totalMinutes *= 1.1;
  }
  
  return Math.max(1, Math.round(totalMinutes));
}

// ============================================
// MOTOR PRINCIPAL DE ADAPTAÇÃO
// ============================================

export function adaptWorkout(
  blocks: WorkoutBlockInput[],
  athleteParams: MandatoryAthleteParams
): AdaptationResult {
  // 1. VALIDAÇÃO OBRIGATÓRIA
  const validationErrors = validateMandatoryParams(athleteParams);
  if (validationErrors.length > 0) {
    return {
      success: false,
      blocks: [],
      summary: {
        totalOriginalMinutes: 0,
        totalAdaptedMinutes: 0,
        appliedMultipliers: { level: 0, gender: 0, finalVolume: 0 },
        timeWasLimiting: false,
        equipmentSubstitutionsCount: 0,
      },
      validationErrors,
    };
  }
  
  // 2. OBTER MULTIPLICADORES
  const levelMult = LEVEL_MULTIPLIERS[athleteParams.level];
  const genderMult = GENDER_MULTIPLIERS[athleteParams.gender];
  
  // 3. CALCULAR TEMPO TOTAL ORIGINAL
  let totalOriginalMinutes = 0;
  for (const block of blocks) {
    const minutes = block.estimatedMinutes || estimateBlockMinutes(block.content, block.type);
    totalOriginalMinutes += minutes;
  }
  
  // 4. CALCULAR AJUSTE POR TEMPO
  const timeAdjustment = calculateTimeAdjustment(totalOriginalMinutes, athleteParams.availableTimeMinutes);
  const timeWasLimiting = timeAdjustment < 1.0;
  
  // 5. DETERMINAR EQUIPAMENTOS INDISPONÍVEIS
  const allEquipment = Object.keys(EQUIPMENT_SUBSTITUTIONS);
  const unavailableEquipment = allEquipment.filter(
    eq => !athleteParams.availableEquipment.some(
      avail => avail.toLowerCase().includes(eq.toLowerCase()) || eq.toLowerCase().includes(avail.toLowerCase())
    )
  );
  
  // 6. ADAPTAR CADA BLOCO (ORDEM: tipo → nível → gênero → tempo → equipamentos)
  const adaptedBlocks: AdaptedWorkoutBlock[] = [];
  let totalEquipmentSubstitutions = 0;
  
  for (const block of blocks) {
    let adaptedContent: string;
    
    // ORDEM DE CÁLCULO:
    // 1. Tipo de bloco (determina regras)
    // 2. Nível do atleta
    // 3. Gênero
    // 4. Tempo disponível
    
    switch (block.type) {
      case 'conditioning':
        adaptedContent = adaptConditioningBlock(
          block.content,
          levelMult,
          genderMult,
          timeAdjustment
        );
        break;
        
      case 'forca':
        adaptedContent = adaptStrengthBlock(
          block.content,
          genderMult
        );
        break;
        
      case 'corrida':
        adaptedContent = adaptRunningBlock(
          block.content,
          genderMult,
          timeAdjustment
        );
        break;
        
      case 'aquecimento':
        // Aquecimento: aplicar apenas ajuste de tempo se necessário
        adaptedContent = timeWasLimiting
          ? scaleVolumeNumbers(block.content, timeAdjustment)
          : block.content;
        break;
        
      case 'core':
        // Core: aplicar multiplicadores de nível e gênero
        adaptedContent = scaleVolumeNumbers(
          block.content,
          levelMult * genderMult * timeAdjustment
        );
        break;
        
      default:
        // Outros tipos: manter original
        adaptedContent = block.content;
    }
    
    // 5. SUBSTITUIÇÃO DE EQUIPAMENTOS (APÓS adaptação de volume)
    const { content: finalContent, substitutions } = substituteEquipmentInContent(
      adaptedContent,
      unavailableEquipment
    );
    totalEquipmentSubstitutions += substitutions.length;
    
    // Estimar tempo final do bloco
    const originalMinutes = block.estimatedMinutes || estimateBlockMinutes(block.content, block.type);
    const finalMinutes = Math.round(originalMinutes * timeAdjustment);
    
    adaptedBlocks.push({
      ...block,
      adaptedContent: finalContent,
      originalContent: block.content,
      adaptationApplied: {
        levelMultiplier: levelMult,
        genderMultiplier: genderMult,
        timeAdjustment,
        equipmentSubstitutions: substitutions,
      },
      finalEstimatedMinutes: finalMinutes,
    });
  }
  
  // 7. CALCULAR TOTAIS
  const totalAdaptedMinutes = adaptedBlocks.reduce((sum, b) => sum + b.finalEstimatedMinutes, 0);
  
  return {
    success: true,
    blocks: adaptedBlocks,
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
    validationErrors: [],
  };
}

// ============================================
// ADAPTAÇÃO DE BENCHMARKS
// ============================================

export interface BenchmarkTargets {
  level: AthleteLevel;
  gender: Gender;
  targetTimeSeconds?: number;
  targetReps?: number;
  targetDistance?: number;
}

export function adaptBenchmark(
  originalTarget: number,
  athleteParams: Pick<MandatoryAthleteParams, 'level' | 'gender'>,
  metric: 'time' | 'reps' | 'distance'
): number {
  const levelMult = LEVEL_MULTIPLIERS[athleteParams.level];
  const genderMult = GENDER_MULTIPLIERS[athleteParams.gender];
  
  if (metric === 'time') {
    // Para tempo: iniciante tem MAIS tempo, pro tem MENOS tempo
    // Invertemos o multiplicador
    return Math.round(originalTarget / (levelMult * genderMult));
  } else {
    // Para reps/distância: aplicar multiplicadores normalmente
    return Math.round(originalTarget * levelMult * genderMult);
  }
}

// ============================================
// EXPORTAÇÃO PARA USO EXTERNO
// ============================================

export const ENGINE_VERSION = '1.0.0';
export const ENGINE_NAME = 'OUTLIER_MANDATORY_ADAPTATION';

export function getEngineInfo() {
  return {
    name: ENGINE_NAME,
    version: ENGINE_VERSION,
    multipliers: {
      level: LEVEL_MULTIPLIERS,
      gender: GENDER_MULTIPLIERS,
    },
    calculationOrder: [
      '1. Tipo de bloco',
      '2. Nível do atleta',
      '3. Gênero',
      '4. Tempo disponível',
      '5. Equipamentos',
    ],
  };
}
