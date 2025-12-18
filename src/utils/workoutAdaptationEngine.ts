/**
 * MOTOR DE ADAPTAÇÃO POR TEMPO REAL
 * ==================================
 * Reconstrói o WOD para caber no tempo disponível mantendo
 * o mesmo estímulo fisiológico (cardiovascular + muscular).
 * 
 * Princípios:
 * 1. O tempo total é OUTPUT do WOD, nunca um valor exibido
 * 2. Conteúdo MUDA quando tempo disponível muda
 * 3. Preserva: estímulo cardiovascular, muscular dominante, densidade
 * 4. Usuário NÃO vê multiplicadores ou métricas internas
 */

import type { WorkoutBlock, DayWorkout, TrainingLevel } from '@/types/outlier';

// ============================================
// TIPOS INTERNOS (INVISÍVEIS ao usuário)
// ============================================

type SexKey = 'M' | 'F';
type MovementType = 
  | 'remo' | 'skierg' | 'bike' | 'corrida'
  | 'sled_push' | 'sled_pull' | 'farmer' | 'lunge'
  | 'wallball' | 'burpee' | 'sandbag'
  | 'core' | 'strength' | 'generic';

interface MovementConfig {
  type: MovementType;
  baseSecondsPerUnit: number; // segundos por metro/cal/rep
  unit: 'm' | 'cal' | 'reps';
  fatigueFactor: number; // multiplicador quando aparece após esforço similar
}

interface ParsedMovement {
  original: string;
  type: MovementType;
  value: number;
  unit: 'm' | 'cal' | 'reps';
  estimatedSeconds: number;
}

interface BlockPriority {
  type: string;
  priority: number; // 1 = manter, 5 = remover primeiro
  isAccessory: boolean;
}

export interface WorkoutAdaptationConfig {
  nivel: TrainingLevel;
  sexo: 'masculino' | 'feminino';
  tempoDisponivel: number; // minutos (9999 = ilimitado)
  wodBase: DayWorkout;
}

export interface AdaptedWorkoutResult {
  workout: DayWorkout;
  originalDuration: number;
  adaptedDuration: number;
  wasCondensed: boolean;
  blocksRemoved: number;
}

// ============================================
// CAMADA 1: TEMPO POR MOVIMENTO
// ============================================

/**
 * Configuração base de tempo por movimento (segundos/unidade)
 * Valores calibrados para atleta PERFORMANCE MASCULINO
 */
const MOVEMENT_CONFIG: Record<MovementType, MovementConfig> = {
  remo: { type: 'remo', baseSecondsPerUnit: 0.26, unit: 'm', fatigueFactor: 1.15 }, // 2:10/500m
  skierg: { type: 'skierg', baseSecondsPerUnit: 0.28, unit: 'm', fatigueFactor: 1.15 }, // 2:20/500m
  bike: { type: 'bike', baseSecondsPerUnit: 5, unit: 'cal', fatigueFactor: 1.20 }, // 12 cal/min
  corrida: { type: 'corrida', baseSecondsPerUnit: 0.36, unit: 'm', fatigueFactor: 1.10 }, // 6:00/km
  sled_push: { type: 'sled_push', baseSecondsPerUnit: 3.6, unit: 'm', fatigueFactor: 1.25 }, // ~17m/min
  sled_pull: { type: 'sled_pull', baseSecondsPerUnit: 3.6, unit: 'm', fatigueFactor: 1.25 },
  farmer: { type: 'farmer', baseSecondsPerUnit: 1.8, unit: 'm', fatigueFactor: 1.15 }, // ~33m/min
  lunge: { type: 'lunge', baseSecondsPerUnit: 2.7, unit: 'm', fatigueFactor: 1.20 }, // ~22m/min
  wallball: { type: 'wallball', baseSecondsPerUnit: 3.5, unit: 'reps', fatigueFactor: 1.15 }, // ~17 reps/min
  burpee: { type: 'burpee', baseSecondsPerUnit: 5, unit: 'reps', fatigueFactor: 1.25 }, // 12 reps/min
  sandbag: { type: 'sandbag', baseSecondsPerUnit: 3.0, unit: 'm', fatigueFactor: 1.20 },
  core: { type: 'core', baseSecondsPerUnit: 3, unit: 'reps', fatigueFactor: 1.05 },
  strength: { type: 'strength', baseSecondsPerUnit: 4, unit: 'reps', fatigueFactor: 1.10 },
  generic: { type: 'generic', baseSecondsPerUnit: 3, unit: 'reps', fatigueFactor: 1.10 },
};

/**
 * Ajustes de tempo por nível (multiplicador de velocidade)
 * Valores INTERNOS - nunca exibidos
 */
const LEVEL_TIME_MULT: Record<TrainingLevel, number> = {
  base: 1.35, // 35% mais lento
  progressivo: 1.15, // 15% mais lento
  performance: 1.0, // referência
};

/**
 * Ajustes de tempo por sexo (proporcional, não "mais fácil")
 */
const SEX_TIME_MULT: Record<SexKey, number> = {
  M: 1.0,
  F: 1.10, // 10% mais tempo para mesmo esforço relativo
};

/**
 * CAMADA 1: Estima tempo de um movimento específico
 * Ajustado por nível, sexo e fadiga acumulada
 */
export function estimateMovementTime(
  movement: string,
  volume: number,
  nivel: TrainingLevel,
  sexo: SexKey,
  accumulatedFatigue: boolean = false
): number {
  const type = detectMovementType(movement);
  const config = MOVEMENT_CONFIG[type];
  
  const levelMult = LEVEL_TIME_MULT[nivel];
  const sexMult = SEX_TIME_MULT[sexo];
  const fatigueMult = accumulatedFatigue ? config.fatigueFactor : 1.0;
  
  const baseSeconds = volume * config.baseSecondsPerUnit;
  const adjustedSeconds = baseSeconds * levelMult * sexMult * fatigueMult;
  
  return Math.ceil(adjustedSeconds);
}

/**
 * Detecta tipo de movimento a partir do texto
 */
function detectMovementType(text: string): MovementType {
  const lower = text.toLowerCase();
  
  if (lower.includes('remo') || lower.includes('row')) return 'remo';
  if (lower.includes('skierg') || lower.includes('ski erg') || lower.includes('ski-erg')) return 'skierg';
  if (lower.includes('bike') || lower.includes('assault') || lower.includes('echo')) return 'bike';
  if (lower.includes('corrida') || lower.includes('run') || lower.includes('trote')) return 'corrida';
  if (lower.includes('sled push') || lower.includes('push')) return 'sled_push';
  if (lower.includes('sled pull') || lower.includes('pull')) return 'sled_pull';
  if (lower.includes('farmer') || lower.includes('carry')) return 'farmer';
  if (lower.includes('lunge') || lower.includes('afundo')) return 'lunge';
  if (lower.includes('wall ball') || lower.includes('wallball')) return 'wallball';
  if (lower.includes('burpee')) return 'burpee';
  if (lower.includes('sandbag') || lower.includes('saco')) return 'sandbag';
  if (lower.includes('prancha') || lower.includes('abdominal') || lower.includes('twist') || lower.includes('core')) return 'core';
  if (lower.includes('press') || lower.includes('squat') || lower.includes('agach') || lower.includes('deadlift')) return 'strength';
  
  return 'generic';
}

// ============================================
// CAMADA 2: CÁLCULO DO TEMPO REAL DO WOD
// ============================================

const TRANSITION_TIME = 15; // segundos entre movimentos

/**
 * Parse linha para extrair movimento e volume
 */
function parseLine(line: string): ParsedMovement | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return null;
  
  // Padrões de extração
  const patterns = [
    // Metros: "1000m Remo", "Remo 500m"
    { regex: /(\d+)\s*m\s+(\w+)/i, unit: 'm' as const, valueGroup: 1 },
    { regex: /(\w+)\s+(\d+)\s*m/i, unit: 'm' as const, valueGroup: 2 },
    // Calorias: "50cal Bike", "Bike 30 cal"
    { regex: /(\d+)\s*cal\s+(\w+)/i, unit: 'cal' as const, valueGroup: 1 },
    { regex: /(\w+)\s+(\d+)\s*cal/i, unit: 'cal' as const, valueGroup: 2 },
    // Reps: "50 Wall Balls", "15 Burpees"
    { regex: /^(\d+)\s+(.+)/i, unit: 'reps' as const, valueGroup: 1 },
  ];
  
  for (const pattern of patterns) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      const value = parseInt(match[pattern.valueGroup], 10);
      if (!isNaN(value) && value > 0) {
        const type = detectMovementType(trimmed);
        return {
          original: trimmed,
          type,
          value,
          unit: pattern.unit,
          estimatedSeconds: 0, // Será calculado depois
        };
      }
    }
  }
  
  return null;
}

/**
 * CAMADA 2: Calcula duração total do WOD
 * Soma tempo de todos os movimentos + transições
 */
export function calculateWodDuration(
  blocks: WorkoutBlock[],
  nivel: TrainingLevel,
  sexo: SexKey
): number {
  let totalSeconds = 0;
  const previousTypes: MovementType[] = [];
  
  for (const block of blocks) {
    const lines = block.content.split('\n');
    let blockSeconds = 0;
    
    // Detectar rounds
    const roundsMatch = block.content.toLowerCase().match(/(\d+)\s*(rounds?|rodadas?)/);
    const rounds = roundsMatch ? parseInt(roundsMatch[1], 10) || 1 : 1;
    
    // AMRAP estima 3 rounds
    const isAmrap = block.content.toLowerCase().includes('amrap');
    const effectiveRounds = isAmrap ? 3 : rounds;
    
    for (const line of lines) {
      const parsed = parseLine(line);
      if (!parsed) continue;
      
      // Verifica fadiga: mesmo tipo de movimento apareceu antes
      const hasFatigue = previousTypes.includes(parsed.type);
      
      const seconds = estimateMovementTime(
        line,
        parsed.value,
        nivel,
        sexo,
        hasFatigue
      );
      
      blockSeconds += seconds + TRANSITION_TIME;
      previousTypes.push(parsed.type);
    }
    
    totalSeconds += blockSeconds * effectiveRounds;
  }
  
  return Math.ceil(totalSeconds);
}

// ============================================
// CAMADA 3: ADAPTAÇÃO POR TEMPO
// ============================================

/**
 * Prioridade de blocos (maior = remover primeiro)
 */
const BLOCK_PRIORITY: Record<string, BlockPriority> = {
  aquecimento: { type: 'aquecimento', priority: 2, isAccessory: false },
  conditioning: { type: 'conditioning', priority: 1, isAccessory: false }, // MANTER sempre
  forca: { type: 'forca', priority: 3, isAccessory: false },
  especifico: { type: 'especifico', priority: 4, isAccessory: true },
  core: { type: 'core', priority: 5, isAccessory: true }, // remover primeiro
  corrida: { type: 'corrida', priority: 5, isAccessory: true },
  notas: { type: 'notas', priority: 6, isAccessory: true },
};

/**
 * Remove blocos acessórios quando tempo não é suficiente
 */
function removeAccessoryBlocks(
  blocks: WorkoutBlock[],
  targetMinutes: number,
  nivel: TrainingLevel,
  sexo: SexKey
): WorkoutBlock[] {
  let currentDuration = calculateWodDuration(blocks, nivel, sexo) / 60;
  
  if (currentDuration <= targetMinutes) {
    return blocks;
  }
  
  // Ordenar por prioridade (maior prioridade = remover primeiro)
  const sortedBlocks = [...blocks].sort((a, b) => {
    const priorityA = BLOCK_PRIORITY[a.type]?.priority || 3;
    const priorityB = BLOCK_PRIORITY[b.type]?.priority || 3;
    return priorityB - priorityA;
  });
  
  const keptBlocks: WorkoutBlock[] = [];
  
  for (const block of sortedBlocks) {
    const priority = BLOCK_PRIORITY[block.type];
    
    // Sempre manter conditioning principal
    if (block.isMainWod || block.type === 'conditioning') {
      keptBlocks.push(block);
      continue;
    }
    
    // Recalcular duração atual
    currentDuration = calculateWodDuration(keptBlocks, nivel, sexo) / 60;
    
    // Se ainda tem espaço, adicionar bloco
    const blockDuration = calculateWodDuration([block], nivel, sexo) / 60;
    if (currentDuration + blockDuration <= targetMinutes) {
      keptBlocks.push(block);
    }
  }
  
  // Reordenar para ordem original
  return blocks.filter(b => keptBlocks.includes(b));
}

/**
 * Condensa volumes de um bloco para caber no tempo
 */
function condenseBlock(
  block: WorkoutBlock,
  targetRatio: number
): WorkoutBlock {
  if (targetRatio >= 1.0) return block;
  
  // Clampar ratio entre 0.5 e 1.0 (nunca reduzir mais que 50%)
  const ratio = Math.max(0.5, Math.min(1.0, targetRatio));
  
  const lines = block.content.split('\n');
  const condensedLines: string[] = [];
  
  for (const line of lines) {
    let condensed = line;
    
    // Reduzir metros
    condensed = condensed.replace(/(\d+)\s*m\b/gi, (match, p1) => {
      const value = parseInt(p1, 10);
      if (isNaN(value)) return match;
      const newValue = Math.max(50, Math.floor(value * ratio));
      return `${newValue}m`;
    });
    
    // Reduzir calorias
    condensed = condensed.replace(/(\d+)\s*cal\b/gi, (match, p1) => {
      const value = parseInt(p1, 10);
      if (isNaN(value)) return match;
      const newValue = Math.max(10, Math.floor(value * ratio));
      return `${newValue}cal`;
    });
    
    // Reduzir reps no início da linha
    condensed = condensed.replace(/^(\s*)(\d+)(\s+)([A-Za-zÀ-ÿ])/g, (match, p1, p2, p3, p4) => {
      const value = parseInt(p2, 10);
      if (isNaN(value)) return match;
      const newValue = Math.max(5, Math.floor(value * ratio));
      return `${p1}${newValue}${p3}${p4}`;
    });
    
    // Reduzir rounds/sets
    condensed = condensed.replace(/(\d+)\s*(rounds?|sets?|rodadas?)/gi, (match, p1, p2) => {
      const value = parseInt(p1, 10);
      if (isNaN(value)) return match;
      const newValue = Math.max(1, Math.floor(value * ratio));
      return `${newValue} ${p2}`;
    });
    
    // Reduzir EMOM/AMRAP minutos
    condensed = condensed.replace(/\b(EMOM|AMRAP)\s*(\d+)/gi, (match, p1, p2) => {
      const value = parseInt(p2, 10);
      if (isNaN(value)) return match;
      const newValue = Math.max(4, Math.floor(value * ratio));
      return `${p1} ${newValue}`;
    });
    
    condensedLines.push(condensed);
  }
  
  return {
    ...block,
    content: condensedLines.join('\n'),
  };
}

/**
 * CAMADA 3: Adapta WOD por tempo disponível
 * Estratégia combinada: remover acessórios + condensar principal
 */
function adaptByTime(
  blocks: WorkoutBlock[],
  targetMinutes: number,
  nivel: TrainingLevel,
  sexo: SexKey
): { blocks: WorkoutBlock[]; wasCondensed: boolean; blocksRemoved: number } {
  const originalCount = blocks.length;
  
  // Se tempo ilimitado, retorna original
  if (targetMinutes >= 9999) {
    return { blocks, wasCondensed: false, blocksRemoved: 0 };
  }
  
  // Passo 1: Remover blocos acessórios
  let adaptedBlocks = removeAccessoryBlocks(blocks, targetMinutes, nivel, sexo);
  const blocksRemoved = originalCount - adaptedBlocks.length;
  
  // Passo 2: Verificar se cabe
  let currentDuration = calculateWodDuration(adaptedBlocks, nivel, sexo) / 60;
  
  if (currentDuration <= targetMinutes) {
    return { blocks: adaptedBlocks, wasCondensed: false, blocksRemoved };
  }
  
  // Passo 3: Condensar blocos de conditioning
  const targetRatio = targetMinutes / currentDuration;
  
  adaptedBlocks = adaptedBlocks.map(block => {
    if (block.type === 'conditioning' || block.isMainWod) {
      return condenseBlock(block, targetRatio);
    }
    return block;
  });
  
  // Passo 4: Se ainda não cabe, condensar mais agressivamente
  currentDuration = calculateWodDuration(adaptedBlocks, nivel, sexo) / 60;
  
  if (currentDuration > targetMinutes) {
    const aggressiveRatio = targetMinutes / currentDuration * 0.95;
    
    adaptedBlocks = adaptedBlocks.map(block => {
      if (block.type === 'conditioning' || block.isMainWod) {
        return condenseBlock(block, aggressiveRatio);
      }
      // Condensar aquecimento também
      if (block.type === 'aquecimento') {
        return condenseBlock(block, Math.max(0.7, aggressiveRatio));
      }
      return block;
    });
  }
  
  return { blocks: adaptedBlocks, wasCondensed: true, blocksRemoved };
}

// ============================================
// CAMADA 4: ADAPTAÇÃO POR NÍVEL E SEXO
// ============================================

/**
 * Multiplicador de volume por nível
 */
const LEVEL_VOLUME_MULT: Record<TrainingLevel, number> = {
  base: 0.65,
  progressivo: 0.8,
  performance: 1.0,
};

/**
 * Multiplicador de volume por sexo
 */
const SEX_VOLUME_MULT: Record<SexKey, number> = {
  M: 1.0,
  F: 0.85,
};

/**
 * Aplica adaptação de nível/sexo no conteúdo
 */
function applyLevelSexAdaptation(
  block: WorkoutBlock,
  nivel: TrainingLevel,
  sexo: SexKey
): WorkoutBlock {
  // Performance M = referência
  if (nivel === 'performance' && sexo === 'M') {
    return block;
  }
  
  const volumeMult = LEVEL_VOLUME_MULT[nivel] * SEX_VOLUME_MULT[sexo];
  
  if (volumeMult >= 1.0) return block;
  
  const lines = block.content.split('\n');
  const adaptedLines: string[] = [];
  
  for (const line of lines) {
    let adapted = line;
    
    // Não adaptar aquecimento
    const isWarmupLine = line.toLowerCase().includes('aquecimento') || 
                          line.toLowerCase().includes('warm');
    if (isWarmupLine) {
      adaptedLines.push(line);
      continue;
    }
    
    // Adaptar metros
    adapted = adapted.replace(/(\d+)\s*m\b/gi, (match, p1) => {
      const value = parseInt(p1, 10);
      if (isNaN(value)) return match;
      const newValue = Math.max(10, Math.floor(value * volumeMult));
      return `${newValue}m`;
    });
    
    // Adaptar calorias
    adapted = adapted.replace(/(\d+)\s*cal\b/gi, (match, p1) => {
      const value = parseInt(p1, 10);
      if (isNaN(value)) return match;
      const newValue = Math.max(5, Math.floor(value * volumeMult));
      return `${newValue}cal`;
    });
    
    // Adaptar reps
    adapted = adapted.replace(/^(\s*)(\d+)(\s+)([A-Za-zÀ-ÿ])/g, (match, p1, p2, p3, p4) => {
      const value = parseInt(p2, 10);
      if (isNaN(value)) return match;
      const newValue = Math.max(3, Math.floor(value * volumeMult));
      return `${p1}${newValue}${p3}${p4}`;
    });
    
    // Adaptar rounds/sets (menos agressivo)
    adapted = adapted.replace(/(\d+)\s*(rounds?|sets?|rodadas?)/gi, (match, p1, p2) => {
      const value = parseInt(p1, 10);
      if (isNaN(value)) return match;
      // Rounds são adaptados de forma mais conservadora
      const roundsMult = Math.max(0.7, volumeMult);
      const newValue = Math.max(1, Math.floor(value * roundsMult));
      return `${newValue} ${p2}`;
    });
    
    adaptedLines.push(adapted);
  }
  
  return {
    ...block,
    content: adaptedLines.join('\n'),
  };
}

// ============================================
// FUNÇÃO PRINCIPAL: buildWorkoutByTime
// ============================================

/**
 * MOTOR PRINCIPAL: Constrói treino adaptado ao tempo disponível
 * 
 * @param config - Configuração do atleta e treino base
 * @returns Treino adaptado com duração calculada
 */
export function buildWorkoutByTime(config: WorkoutAdaptationConfig): AdaptedWorkoutResult {
  const { nivel, sexo, tempoDisponivel, wodBase } = config;
  const sexKey: SexKey = sexo === 'feminino' ? 'F' : 'M';
  
  // 1. Calcular duração original
  const originalDuration = calculateWodDuration(wodBase.blocks, nivel, sexKey);
  const originalMinutes = Math.ceil(originalDuration / 60);
  
  // 2. Aplicar adaptação por nível/sexo primeiro (CAMADA 4)
  let adaptedBlocks = wodBase.blocks.map(block => 
    applyLevelSexAdaptation(block, nivel, sexKey)
  );
  
  // 3. Calcular duração após adaptação de nível/sexo
  const afterLevelDuration = calculateWodDuration(adaptedBlocks, nivel, sexKey);
  const afterLevelMinutes = Math.ceil(afterLevelDuration / 60);
  
  // 4. Aplicar adaptação por tempo (CAMADA 3)
  const timeAdaptation = adaptByTime(
    adaptedBlocks,
    tempoDisponivel,
    nivel,
    sexKey
  );
  
  adaptedBlocks = timeAdaptation.blocks;
  
  // 5. Calcular duração final
  const finalDuration = calculateWodDuration(adaptedBlocks, nivel, sexKey);
  const finalMinutes = Math.ceil(finalDuration / 60);
  
  // 6. Debug log (dev only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🏋️ buildWorkoutByTime:', {
      nivel,
      sexo,
      tempoDisponivel,
      originalMinutes,
      afterLevelMinutes,
      finalMinutes,
      wasCondensed: timeAdaptation.wasCondensed,
      blocksRemoved: timeAdaptation.blocksRemoved,
    });
  }
  
  // 7. Retornar resultado
  return {
    workout: {
      ...wodBase,
      blocks: adaptedBlocks,
      estimatedTime: finalMinutes,
    },
    originalDuration: originalMinutes,
    adaptedDuration: finalMinutes,
    wasCondensed: timeAdaptation.wasCondensed,
    blocksRemoved: timeAdaptation.blocksRemoved,
  };
}

/**
 * Valida se adaptação está correta
 * Regra: tempo diferente DEVE resultar em WOD diferente
 */
export function validateAdaptation(
  original: DayWorkout,
  adapted: DayWorkout,
  tempoOriginal: number,
  tempoAdaptado: number
): { isValid: boolean; reason?: string } {
  // Se tempo é igual, WOD pode ser igual
  if (tempoOriginal === tempoAdaptado) {
    return { isValid: true };
  }
  
  // Se tempo é diferente, WOD DEVE ser diferente
  const originalContent = original.blocks.map(b => b.content).join('\n');
  const adaptedContent = adapted.blocks.map(b => b.content).join('\n');
  
  if (originalContent === adaptedContent) {
    return {
      isValid: false,
      reason: 'Tempo mudou mas WOD permanece igual - adaptação não aplicada',
    };
  }
  
  // Validar que tempo estimado corresponde à realidade
  const diff = Math.abs(adapted.estimatedTime - tempoAdaptado);
  if (diff > tempoAdaptado * 0.3) { // Tolerância de 30%
    return {
      isValid: false,
      reason: `Tempo estimado (${adapted.estimatedTime}min) difere muito do alvo (${tempoAdaptado}min)`,
    };
  }
  
  return { isValid: true };
}
