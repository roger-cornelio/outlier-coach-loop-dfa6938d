/**
 * MOTOR DE ADAPTAÇÃO POR TEMPO REAL v2
 * =====================================
 * Tabela de referência: atleta INTERMEDIÁRIO HYROX
 * Unidades padrão: 100m, 10 reps, 10 cal
 * 
 * Princípios:
 * 1. Tempo total é OUTPUT calculado, nunca valor fixo
 * 2. Treinos curtos = mais densos, menos blocos
 * 3. Treinos longos = mais volume, mais variação
 * 4. Dificuldade percebida EQUIVALENTE independente do tempo
 * 5. Usuário NÃO vê métricas internas
 */

import type { WorkoutBlock, DayWorkout, TrainingLevel } from '@/types/outlier';
import { identifyMainBlock } from '@/utils/mainBlockIdentifier';
import { 
  adaptWorkoutForTime, 
  validateTimeAdaptation,
  calculateTotalTime,
  classifyBlocksWithPriority,
  TimeAdaptationResult,
  INTELLIGENT_ADAPTATION_INFO,
} from '@/utils/intelligentTimeAdaptation';

// ============================================
// TIPOS INTERNOS (INVISÍVEIS ao usuário)
// ============================================

type SexKey = 'M' | 'F';
type MovementCategory = 'cardio_machine' | 'cardio_run' | 'sled' | 'carry' | 'gym' | 'core' | 'strength' | 'unknown';

interface MovementTimeRef {
  name: string;
  category: MovementCategory;
  unit: 'm' | 'cal' | 'reps';
  baseUnit: number; // unidade padrão (100m, 10 reps, 10 cal)
  baseSeconds: number; // tempo para unidade padrão (atleta intermediário)
  patterns: string[]; // padrões de texto para identificar
  requiresLoadAdjust?: boolean; // precisa ajustar carga?
}

// ============================================
// TABELA DE REFERÊNCIA - ATLETA INTERMEDIÁRIO HYROX
// ============================================
// Valores calibrados para atleta intermediário masculino
// Unidades padrão conforme especificação

const MOVEMENT_TIME_TABLE: MovementTimeRef[] = [
  // === CARDIO / MONOESTRUTURAL ===
  {
    name: 'Remo',
    category: 'cardio_machine',
    unit: 'm',
    baseUnit: 100,
    baseSeconds: 25, // 100m = 25s
    patterns: ['remo', 'row', 'rower', 'ergometer'],
  },
  {
    name: 'SkiErg',
    category: 'cardio_machine',
    unit: 'm',
    baseUnit: 100,
    baseSeconds: 27, // 100m = 27s
    patterns: ['skierg', 'ski erg', 'ski-erg', 'ski'],
  },
  {
    name: 'Assault Bike',
    category: 'cardio_machine',
    unit: 'cal',
    baseUnit: 10,
    baseSeconds: 22, // 10 cal = 22s
    patterns: ['assault bike', 'assault'],
  },
  {
    name: 'Air Bike',
    category: 'cardio_machine',
    unit: 'cal',
    baseUnit: 10,
    baseSeconds: 24, // 10 cal = 24s
    patterns: ['air bike', 'airbike', 'echo', 'echo bike', 'bike'],
  },
  {
    name: 'Corrida',
    category: 'cardio_run',
    unit: 'm',
    baseUnit: 100,
    baseSeconds: 30, // 100m = 30s
    patterns: ['corrida', 'run', 'running', 'sprint'],
  },
  {
    name: 'Trote',
    category: 'cardio_run',
    unit: 'm',
    baseUnit: 100,
    baseSeconds: 36, // ritmo leve ~6:00/km
    patterns: ['trote', 'jog', 'jogging'],
  },
  
  // === CARGA / DESLOCAMENTO (HYROX) ===
  {
    name: 'Sled Push',
    category: 'sled',
    unit: 'm',
    baseUnit: 10,
    baseSeconds: 18, // 10m = 18s (pesado)
    patterns: ['sled push', 'push sled'],
    requiresLoadAdjust: true,
  },
  {
    name: 'Sled Pull',
    category: 'sled',
    unit: 'm',
    baseUnit: 10,
    baseSeconds: 20, // 10m = 20s (pesado)
    patterns: ['sled pull', 'pull sled'],
    requiresLoadAdjust: true,
  },
  {
    name: 'Sandbag Lunge',
    category: 'carry',
    unit: 'm',
    baseUnit: 10,
    baseSeconds: 22, // 10m = 22s
    patterns: ['sandbag lunge', 'lunge sandbag', 'walking lunge sandbag'],
    requiresLoadAdjust: true,
  },
  {
    name: 'Farmer Carry',
    category: 'carry',
    unit: 'm',
    baseUnit: 50,
    baseSeconds: 20, // 50m = 20s
    patterns: ['farmer', 'farmer carry', 'farmers walk', 'carry'],
    requiresLoadAdjust: true,
  },
  {
    name: 'Dumbbell Lunge',
    category: 'carry',
    unit: 'm',
    baseUnit: 10,
    baseSeconds: 20, // 10m = 20s
    patterns: ['dumbbell lunge', 'db lunge', 'lunge'],
    requiresLoadAdjust: true,
  },
  {
    name: 'Kettlebell Carry',
    category: 'carry',
    unit: 'm',
    baseUnit: 50,
    baseSeconds: 22, // 50m = 22s
    patterns: ['kettlebell carry', 'kb carry'],
    requiresLoadAdjust: true,
  },
  {
    name: 'Sandbag Carry',
    category: 'carry',
    unit: 'm',
    baseUnit: 50,
    baseSeconds: 25, // estimativa
    patterns: ['sandbag carry', 'sandbag', 'saco'],
    requiresLoadAdjust: true,
  },
  
  // === GINÁSTICOS ===
  {
    name: 'Wall Ball',
    category: 'gym',
    unit: 'reps',
    baseUnit: 10,
    baseSeconds: 18, // 10 reps = 18s
    patterns: ['wall ball', 'wallball', 'wb'],
    requiresLoadAdjust: true,
  },
  {
    name: 'Burpee',
    category: 'gym',
    unit: 'reps',
    baseUnit: 10,
    baseSeconds: 30, // 10 reps = 30s
    patterns: ['burpee', 'burpees', 'bar facing burpee'],
  },
  {
    name: 'Burpee Broad Jump',
    category: 'gym',
    unit: 'm',
    baseUnit: 10,
    baseSeconds: 30, // 10m = 30s
    patterns: ['burpee broad jump', 'broad jump'],
  },
  {
    name: 'Push-up',
    category: 'gym',
    unit: 'reps',
    baseUnit: 10,
    baseSeconds: 20, // 10 reps = 20s
    patterns: ['push-up', 'pushup', 'push up', 'flexão', 'flexao'],
  },
  {
    name: 'Pull-up',
    category: 'gym',
    unit: 'reps',
    baseUnit: 10,
    baseSeconds: 35, // 10 reps = 35s
    patterns: ['pull-up', 'pullup', 'pull up', 'barra'],
  },
  {
    name: 'Toes to Bar',
    category: 'gym',
    unit: 'reps',
    baseUnit: 10,
    baseSeconds: 28, // 10 reps = 28s
    patterns: ['toes to bar', 't2b', 'ttb'],
  },
  {
    name: 'Box Jump',
    category: 'gym',
    unit: 'reps',
    baseUnit: 10,
    baseSeconds: 25,
    patterns: ['box jump', 'box step'],
  },
  {
    name: 'Kettlebell Swing',
    category: 'gym',
    unit: 'reps',
    baseUnit: 10,
    baseSeconds: 20,
    patterns: ['swing', 'kb swing', 'kettlebell swing'],
    requiresLoadAdjust: true,
  },
  {
    name: 'Thruster',
    category: 'gym',
    unit: 'reps',
    baseUnit: 10,
    baseSeconds: 35,
    patterns: ['thruster'],
    requiresLoadAdjust: true,
  },
  {
    name: 'Squat',
    category: 'gym',
    unit: 'reps',
    baseUnit: 10,
    baseSeconds: 18,
    patterns: ['squat', 'agachamento', 'air squat'],
  },
  
  // === STRENGTH ===
  {
    name: 'Deadlift',
    category: 'strength',
    unit: 'reps',
    baseUnit: 10,
    baseSeconds: 40,
    patterns: ['deadlift', 'levantamento terra', 'dl'],
    requiresLoadAdjust: true,
  },
  {
    name: 'Clean',
    category: 'strength',
    unit: 'reps',
    baseUnit: 10,
    baseSeconds: 45,
    patterns: ['clean', 'power clean', 'hang clean'],
    requiresLoadAdjust: true,
  },
  {
    name: 'Snatch',
    category: 'strength',
    unit: 'reps',
    baseUnit: 10,
    baseSeconds: 50,
    patterns: ['snatch', 'power snatch'],
    requiresLoadAdjust: true,
  },
  {
    name: 'Press',
    category: 'strength',
    unit: 'reps',
    baseUnit: 10,
    baseSeconds: 35,
    patterns: ['press', 'shoulder press', 'overhead'],
    requiresLoadAdjust: true,
  },
  
  // === CORE / ACESSÓRIOS ===
  {
    name: 'Sit-up',
    category: 'core',
    unit: 'reps',
    baseUnit: 20,
    baseSeconds: 25, // 20 reps = 25s
    patterns: ['sit-up', 'situp', 'abdominal', 'abmat', 'crunch'],
  },
  {
    name: 'Russian Twist',
    category: 'core',
    unit: 'reps',
    baseUnit: 20,
    baseSeconds: 30, // 20 reps = 30s
    patterns: ['russian twist', 'twist'],
  },
  {
    name: 'Plank',
    category: 'core',
    unit: 'reps', // segundos tratados como unidade
    baseUnit: 30,
    baseSeconds: 30, // 30s = 30s (1:1)
    patterns: ['plank', 'prancha'],
  },
  {
    name: 'Hollow Hold',
    category: 'core',
    unit: 'reps', // segundos tratados como unidade
    baseUnit: 30,
    baseSeconds: 30, // 30s = 30s (1:1)
    patterns: ['hollow hold', 'hollow'],
  },
];

// ============================================
// TEMPOS DE TRANSIÇÃO (segundos)
// ============================================

const TRANSITION_TIMES = {
  stationChange: 15, // troca de estação
  loadAdjust: 20, // ajuste de carga
  blockPause: 10, // pausa natural entre blocos
  roundRest: 8, // descanso entre rounds (se não especificado)
};

// ============================================
// AJUSTES POR NÍVEL E SEXO
// ============================================
// NOTA: PlanTier (OPEN/PRO) NÃO influencia mais o motor de adaptação.
// Multiplicadores são fixos e baseados apenas no conteúdo e biometria.
// ============================================

// Multiplicador de tempo FIXO (PlanTier desacoplado)
const FIXED_TIME_MULTIPLIER = 1.0;

// Multiplicador de tempo por sexo
const SEX_TIME_MULTIPLIER: Record<SexKey, number> = {
  M: 1.0,
  F: 1.12, // 12% mais tempo para mesmo esforço relativo
};

// Fator conservador para exercícios desconhecidos
const UNKNOWN_EXERCISE_FACTOR = 1.15; // +15%

// ============================================
// MOTOR DE DETECÇÃO DE MOVIMENTO
// ============================================

function findMovementRef(text: string): MovementTimeRef | null {
  const lower = text.toLowerCase();
  
  for (const ref of MOVEMENT_TIME_TABLE) {
    for (const pattern of ref.patterns) {
      if (lower.includes(pattern)) {
        return ref;
      }
    }
  }
  
  return null;
}

/**
 * Classifica movimento desconhecido por padrão
 */
function classifyUnknownMovement(text: string): { category: MovementCategory; baseSecondsPerUnit: number; unit: 'm' | 'cal' | 'reps' } {
  const lower = text.toLowerCase();
  
  // Detectar unidade para inferir categoria
  if (lower.includes('m ') || lower.match(/\d+m\b/)) {
    // Movimento com metros
    if (lower.includes('sled') || lower.includes('push') || lower.includes('pull')) {
      return { category: 'sled', baseSecondsPerUnit: 3.6, unit: 'm' };
    }
    if (lower.includes('carry') || lower.includes('walk')) {
      return { category: 'carry', baseSecondsPerUnit: 2.0, unit: 'm' };
    }
    return { category: 'cardio_run', baseSecondsPerUnit: 0.40, unit: 'm' }; // conservador
  }
  
  if (lower.includes('cal')) {
    return { category: 'cardio_machine', baseSecondsPerUnit: 5.5, unit: 'cal' }; // conservador
  }
  
  // Default: reps
  if (lower.includes('core') || lower.includes('ab') || lower.includes('prancha')) {
    return { category: 'core', baseSecondsPerUnit: 2.5, unit: 'reps' };
  }
  
  // Detectar se é strength pelo contexto
  if (lower.includes('kg') || lower.includes('lb') || lower.includes('carga')) {
    return { category: 'strength', baseSecondsPerUnit: 5.0, unit: 'reps' };
  }
  
  // Genérico com fator conservador
  return { category: 'gym', baseSecondsPerUnit: 4.0, unit: 'reps' };
}

// ============================================
// EXTRAÇÃO DE VOLUME DO TEXTO
// ============================================

interface ExtractedVolume {
  value: number;
  unit: 'm' | 'cal' | 'reps';
  original: string;
}

function extractVolume(line: string): ExtractedVolume | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 2) return null;
  
  // Padrão metros: "1000m", "500 m"
  const metersMatch = trimmed.match(/(\d+)\s*m\b/i);
  if (metersMatch) {
    return { value: parseInt(metersMatch[1], 10), unit: 'm', original: trimmed };
  }
  
  // Padrão calorias: "50cal", "30 cal"
  const calMatch = trimmed.match(/(\d+)\s*cal\b/i);
  if (calMatch) {
    return { value: parseInt(calMatch[1], 10), unit: 'cal', original: trimmed };
  }
  
  // Padrão reps no início: "50 Wall Balls"
  const repsMatch = trimmed.match(/^(\d+)\s+[A-Za-zÀ-ÿ]/);
  if (repsMatch) {
    return { value: parseInt(repsMatch[1], 10), unit: 'reps', original: trimmed };
  }
  
  // Padrão reps após ":" : "3 rounds: 15 push-ups"
  const repsAfterColon = trimmed.match(/:\s*(\d+)\s+[A-Za-zÀ-ÿ]/);
  if (repsAfterColon) {
    return { value: parseInt(repsAfterColon[1], 10), unit: 'reps', original: trimmed };
  }
  
  return null;
}

// ============================================
// CÁLCULO DE TEMPO POR LINHA
// ============================================

interface LineTimeResult {
  line: string;
  seconds: number;
  transitionSeconds: number;
  movementName: string;
  isUnknown: boolean;
}

function calculateLineTime(
  line: string,
  nivel: TrainingLevel,
  sexo: SexKey,
  previousCategory: MovementCategory | null
): LineTimeResult {
  const volume = extractVolume(line);
  
  if (!volume) {
    // Linha sem volume detectável (título, nota, etc)
    return {
      line,
      seconds: 0,
      transitionSeconds: 0,
      movementName: 'nota',
      isUnknown: false,
    };
  }
  
  const ref = findMovementRef(line);
  let seconds: number;
  let movementName: string;
  let isUnknown: boolean;
  let category: MovementCategory;
  let requiresLoadAdjust = false;
  
  if (ref) {
    // Movimento conhecido
    const unitsCount = volume.value / ref.baseUnit;
    seconds = unitsCount * ref.baseSeconds;
    movementName = ref.name;
    isUnknown = false;
    category = ref.category;
    requiresLoadAdjust = ref.requiresLoadAdjust || false;
  } else {
    // Movimento desconhecido - classificar por padrão
    const classified = classifyUnknownMovement(line);
    const baseSecondsPerUnit = classified.baseSecondsPerUnit;
    
    seconds = volume.value * baseSecondsPerUnit * UNKNOWN_EXERCISE_FACTOR;
    movementName = 'desconhecido';
    isUnknown = true;
    category = classified.category;
  }
  
  // Aplicar apenas multiplicador de sexo (PlanTier desacoplado)
  const sexMult = SEX_TIME_MULTIPLIER[sexo];
  seconds = seconds * FIXED_TIME_MULTIPLIER * sexMult;
  
  // Calcular transição
  let transitionSeconds = TRANSITION_TIMES.stationChange;
  
  // Adicionar tempo de ajuste de carga se necessário
  if (requiresLoadAdjust) {
    transitionSeconds += TRANSITION_TIMES.loadAdjust;
  }
  
  // Reduzir transição se mesmo tipo de movimento
  if (previousCategory && previousCategory === category) {
    transitionSeconds = Math.floor(transitionSeconds * 0.5);
  }
  
  return {
    line,
    seconds: Math.ceil(seconds),
    transitionSeconds,
    movementName,
    isUnknown,
  };
}

// ============================================
// CÁLCULO DE TEMPO DO BLOCO
// ============================================

interface BlockTimeResult {
  block: WorkoutBlock;
  totalSeconds: number;
  movementSeconds: number;
  transitionSeconds: number;
  rounds: number;
  linesAnalyzed: LineTimeResult[];
}

function calculateBlockTime(
  block: WorkoutBlock,
  nivel: TrainingLevel,
  sexo: SexKey
): BlockTimeResult {
  const lines = block.content.split('\n').filter(l => l.trim());
  const linesAnalyzed: LineTimeResult[] = [];
  
  let previousCategory: MovementCategory | null = null;
  let movementSeconds = 0;
  let transitionSeconds = 0;
  
  // Detectar rounds
  const roundsMatch = block.content.toLowerCase().match(/(\d+)\s*(rounds?|rodadas?)/);
  let rounds = roundsMatch ? parseInt(roundsMatch[1], 10) || 1 : 1;
  
  // AMRAP estima rounds baseado no tempo (se especificado)
  const isAmrap = block.content.toLowerCase().includes('amrap');
  if (isAmrap) {
    const amrapMinutes = block.content.match(/amrap\s*(\d+)/i);
    if (amrapMinutes) {
      // Estimar rounds baseado no tempo do AMRAP
      rounds = Math.ceil(parseInt(amrapMinutes[1], 10) / 4); // ~4min por round
    } else {
      rounds = 3; // default para AMRAP
    }
  }
  
  // EMOM trata cada minuto como um "round"
  const isEmom = block.content.toLowerCase().includes('emom');
  if (isEmom) {
    const emomMinutes = block.content.match(/emom\s*(\d+)/i);
    if (emomMinutes) {
      // EMOM: tempo total = minutos especificados
      return {
        block,
        totalSeconds: parseInt(emomMinutes[1], 10) * 60,
        movementSeconds: parseInt(emomMinutes[1], 10) * 60,
        transitionSeconds: 0,
        rounds: 1,
        linesAnalyzed: [],
      };
    }
  }
  
  for (const line of lines) {
    const ref = findMovementRef(line);
    const currentCategory = ref?.category || classifyUnknownMovement(line).category;
    
    const result = calculateLineTime(line, nivel, sexo, previousCategory);
    linesAnalyzed.push(result);
    
    movementSeconds += result.seconds;
    transitionSeconds += result.transitionSeconds;
    
    if (result.seconds > 0) {
      previousCategory = currentCategory;
    }
  }
  
  // Aplicar rounds
  const baseTotal = movementSeconds + transitionSeconds;
  const totalWithRounds = baseTotal * rounds;
  
  // Adicionar descanso entre rounds (se mais de 1 round)
  const restBetweenRounds = rounds > 1 ? (rounds - 1) * TRANSITION_TIMES.roundRest : 0;
  
  return {
    block,
    totalSeconds: Math.ceil(totalWithRounds + restBetweenRounds),
    movementSeconds: Math.ceil(movementSeconds * rounds),
    transitionSeconds: Math.ceil(transitionSeconds * rounds + restBetweenRounds),
    rounds,
    linesAnalyzed,
  };
}

// ============================================
// CÁLCULO DE TEMPO DO WOD COMPLETO
// ============================================

export interface WodTimeResult {
  totalSeconds: number;
  totalMinutes: number;
  movementSeconds: number;
  transitionSeconds: number;
  blockPauseSeconds: number;
  blocksAnalyzed: BlockTimeResult[];
}

export function calculateWodTime(
  blocks: WorkoutBlock[],
  nivel: TrainingLevel,
  sexo: SexKey
): WodTimeResult {
  const blocksAnalyzed: BlockTimeResult[] = [];
  let movementSeconds = 0;
  let transitionSeconds = 0;
  
  for (const block of blocks) {
    const result = calculateBlockTime(block, nivel, sexo);
    blocksAnalyzed.push(result);
    movementSeconds += result.movementSeconds;
    transitionSeconds += result.transitionSeconds;
  }
  
  // Pausas entre blocos
  const blockPauseSeconds = Math.max(0, blocks.length - 1) * TRANSITION_TIMES.blockPause;
  
  const totalSeconds = movementSeconds + transitionSeconds + blockPauseSeconds;
  
  return {
    totalSeconds,
    totalMinutes: Math.ceil(totalSeconds / 60),
    movementSeconds,
    transitionSeconds,
    blockPauseSeconds,
    blocksAnalyzed,
  };
}

// ============================================
// REGRA-MÃE DE ADAPTAÇÃO
// ============================================
// Relação de tempo = tempo disponível / tempo base
// ≥80%: estrutura completa, ajuste proporcional
// 50-79%: remover acessórios/skills, manter WOD principal
// <50%: apenas WOD principal, máxima densidade

// TIER NAMING conforme especificação:
// 'full' = estrutura completa (≥80%)
// 'reduced' = reduzido (50-79%)
// 'condensed' = condensado/máxima densidade (<50%)
type TimeRelationTier = 'full' | 'reduced' | 'condensed';

function calculateTimeRelation(tempoDisponivel: number, tempoBase: number): { ratio: number; tier: TimeRelationTier } {
  if (tempoDisponivel >= 9999 || tempoBase <= 0) {
    return { ratio: 1.0, tier: 'full' };
  }
  
  const ratio = tempoDisponivel / tempoBase;
  
  if (ratio >= 0.80) {
    return { ratio, tier: 'full' };
  } else if (ratio >= 0.50) {
    return { ratio, tier: 'reduced' };
  } else {
    return { ratio, tier: 'condensed' };
  }
}

// ============================================
// PRIORIDADES DE BLOCOS
// ============================================

interface BlockPriority {
  type: string;
  priority: number; // 1 = manter, 5 = remover primeiro
  canCondense: boolean;
  isAccessory: boolean; // blocos acessórios removidos em reduced/minimal
  isWarmup: boolean;
}

const BLOCK_PRIORITIES: Record<string, BlockPriority> = {
  conditioning: { type: 'conditioning', priority: 1, canCondense: true, isAccessory: false, isWarmup: false },
  forca: { type: 'forca', priority: 2, canCondense: true, isAccessory: false, isWarmup: false },
  aquecimento: { type: 'aquecimento', priority: 3, canCondense: true, isAccessory: false, isWarmup: true },
  especifico: { type: 'especifico', priority: 4, canCondense: true, isAccessory: true, isWarmup: false },
  core: { type: 'core', priority: 5, canCondense: true, isAccessory: true, isWarmup: false },
  corrida: { type: 'corrida', priority: 5, canCondense: true, isAccessory: true, isWarmup: false },
  notas: { type: 'notas', priority: 6, canCondense: false, isAccessory: true, isWarmup: false },
};

// ============================================
// ESTRATÉGIAS POR TIER
// ============================================

/**
 * TIER FULL (≥80%): Manter estrutura completa, ajustar volumes proporcionalmente
 */
function applyFullTierStrategy(
  blocks: WorkoutBlock[],
  ratio: number,
  _nivel: TrainingLevel,
  _sexo: SexKey
): WorkoutBlock[] {
  if (ratio >= 1.0) return blocks;
  
  // Ajuste proporcional suave
  return blocks.map(block => {
    const priority = BLOCK_PRIORITIES[block.type];
    if (priority?.canCondense) {
      return condenseBlockVolumes(block, ratio);
    }
    return block;
  });
}

/**
 * TIER REDUCED (50-79%): Remover acessórios/skills, manter aquecimento reduzido
 */
function applyReducedTierStrategy(
  blocks: WorkoutBlock[],
  ratio: number,
  nivel: TrainingLevel,
  sexo: SexKey,
  targetSeconds: number
): { blocks: WorkoutBlock[]; removed: number } {
  let removed = 0;
  
  // 1. Remover blocos acessórios
  let filtered = blocks.filter(block => {
    const priority = BLOCK_PRIORITIES[block.type];
    if (priority?.isAccessory && block.type !== 'corrida') {
      removed++;
      return false;
    }
    return true;
  });
  
  // 2. Reduzir aquecimento (50% do volume)
  filtered = filtered.map(block => {
    const priority = BLOCK_PRIORITIES[block.type];
    if (priority?.isWarmup) {
      return condenseBlockVolumes(block, 0.5);
    }
    return block;
  });
  
  // 3. Verificar se cabe
  let currentTime = calculateWodTime(filtered, nivel, sexo);
  
  // 4. Se ainda não cabe, condensar WOD principal proporcionalmente
  if (currentTime.totalSeconds > targetSeconds) {
    const adjustRatio = Math.max(0.6, targetSeconds / currentTime.totalSeconds);
    filtered = filtered.map(block => {
      if (block.type === 'conditioning' || block.type === 'metcon' || block.type === 'corrida' || block.type === 'forca') {
        return condenseBlockVolumes(block, adjustRatio);
      }
      return block;
    });
  }
  
  return { blocks: filtered, removed };
}

/**
 * TIER MINIMAL (<50%): APENAS WOD principal, máxima densidade
 * Remove: aquecimento, acessórios, exercícios secundários
 * Mantém: WOD principal condensado com alta densidade
 */
function applyMinimalTierStrategy(
  blocks: WorkoutBlock[],
  ratio: number,
  nivel: TrainingLevel,
  sexo: SexKey,
  targetSeconds: number
): { blocks: WorkoutBlock[]; removed: number } {
  let removed = 0;
  
  // 1. Manter APENAS conditioning, corrida e metcon
  let kept = blocks.filter(block => {
    if (block.type === 'conditioning' || block.type === 'corrida' || block.type === 'metcon') {
      return true;
    }
    // Manter força se não houver conditioning
    if (block.type === 'forca' && !blocks.some(b => b.type === 'conditioning')) {
      return true;
    }
    removed++;
    return false;
  });
  
  // 2. Se não sobrou nada, manter o primeiro bloco
  if (kept.length === 0 && blocks.length > 0) {
    kept = [blocks[0]];
    removed = blocks.length - 1;
  }
  
  // 3. Aumentar densidade: remover descansos
  kept = kept.map(block => increaseDensity(block));
  
  // 4. Condensar agressivamente para For Time / AMRAP curto
  let currentTime = calculateWodTime(kept, nivel, sexo);
  
  if (currentTime.totalSeconds > targetSeconds) {
    // Ratio para condensação: garantir que cabe
    const condenseRatio = Math.max(0.4, targetSeconds / currentTime.totalSeconds);
    
    kept = kept.map(block => {
      const condensed = condenseBlockVolumes(block, condenseRatio);
      // Converter para formato mais intenso se necessário
      return convertToIntenseFormat(condensed, ratio);
    });
  }
  
  // 5. Validação final: garantir ±5% do tempo alvo
  currentTime = calculateWodTime(kept, nivel, sexo);
  const tolerance = targetSeconds * 0.05; // 5%
  
  if (Math.abs(currentTime.totalSeconds - targetSeconds) > tolerance) {
    // Ajuste fino final
    const finalRatio = targetSeconds / currentTime.totalSeconds;
    kept = kept.map(block => condenseBlockVolumes(block, finalRatio));
  }
  
  return { blocks: kept, removed };
}

/**
 * Converte bloco para formato mais intenso (For Time, AMRAP curto)
 */
function convertToIntenseFormat(block: WorkoutBlock, ratio: number): WorkoutBlock {
  const content = block.content;
  const lower = content.toLowerCase();
  
  // Se já é For Time ou AMRAP curto, manter
  if (lower.includes('for time') || lower.includes('amrap')) {
    // Reduzir tempo do AMRAP se muito longo
    const modified = content.replace(/\b(AMRAP)\s*(\d+)/gi, (match, p1, p2) => {
      const mins = parseInt(p2, 10);
      if (mins > 8 && ratio < 0.5) {
        return `${p1} ${Math.max(6, Math.floor(mins * ratio * 1.5))}`; // AMRAP mais curto mas intenso
      }
      return match;
    });
    return { ...block, content: modified };
  }
  
  // Converter rounds longos para AMRAP
  const roundsMatch = content.match(/(\d+)\s*(rounds?|rodadas?)/i);
  if (roundsMatch && parseInt(roundsMatch[1], 10) > 4) {
    // Muitos rounds → converter para AMRAP intenso
    const amrapMinutes = Math.max(6, Math.floor(8 * ratio));
    const modified = content.replace(/(\d+)\s*(rounds?|rodadas?)/i, `AMRAP ${amrapMinutes}min - máxima intensidade`);
    return { ...block, content: modified };
  }
  
  return block;
}

/**
 * Condensa volumes de um bloco
 */
function condenseBlockVolumes(
  block: WorkoutBlock,
  ratio: number
): WorkoutBlock {
  if (ratio >= 1.0) return block;
  
  // Clampar: nunca reduzir mais que 40% (manter mínimo 40%)
  const effectiveRatio = Math.max(0.4, ratio);
  
  const lines = block.content.split('\n');
  const condensed = lines.map(line => {
    let result = line;
    
    // Reduzir metros
    result = result.replace(/(\d+)\s*m\b/gi, (match, p1) => {
      const v = parseInt(p1, 10);
      if (isNaN(v)) return match;
      return `${Math.max(25, Math.floor(v * effectiveRatio))}m`;
    });
    
    // Reduzir calorias
    result = result.replace(/(\d+)\s*cal\b/gi, (match, p1) => {
      const v = parseInt(p1, 10);
      if (isNaN(v)) return match;
      return `${Math.max(5, Math.floor(v * effectiveRatio))}cal`;
    });
    
    // Reduzir reps no início
    result = result.replace(/^(\s*)(\d+)(\s+)([A-Za-zÀ-ÿ])/g, (match, p1, p2, p3, p4) => {
      const v = parseInt(p2, 10);
      if (isNaN(v)) return match;
      return `${p1}${Math.max(3, Math.floor(v * effectiveRatio))}${p3}${p4}`;
    });
    
    // Reduzir rounds (mais conservador)
    result = result.replace(/(\d+)\s*(rounds?|sets?|rodadas?)/gi, (match, p1, p2) => {
      const v = parseInt(p1, 10);
      if (isNaN(v)) return match;
      const roundRatio = Math.max(0.5, effectiveRatio); // mínimo 50% dos rounds
      return `${Math.max(1, Math.floor(v * roundRatio))} ${p2}`;
    });
    
    // Reduzir AMRAP/EMOM minutos
    result = result.replace(/\b(AMRAP|EMOM)\s*(\d+)/gi, (match, p1, p2) => {
      const v = parseInt(p2, 10);
      if (isNaN(v)) return match;
      return `${p1} ${Math.max(4, Math.floor(v * effectiveRatio))}`;
    });
    
    return result;
  });
  
  return { ...block, content: condensed.join('\n') };
}

/**
 * Aumenta densidade removendo descansos
 */
function increaseDensity(block: WorkoutBlock): WorkoutBlock {
  const lines = block.content.split('\n');
  const densified = lines.filter(line => {
    const lower = line.toLowerCase();
    // Remover linhas de descanso
    return !lower.includes('descanso') && 
           !lower.includes('rest') && 
           !lower.includes('pausa');
  }).map(line => {
    // Reduzir descansos especificados (50% ou eliminar)
    return line.replace(/(\d+)\s*(seg|s|segundos?)\s*(descanso|rest|pausa)/gi, (match, p1) => {
      const v = parseInt(p1, 10);
      if (isNaN(v) || v <= 10) return ''; // eliminar descansos curtos
      const reduced = Math.max(5, Math.floor(v * 0.3)); // 30% do original
      return `${reduced}s descanso`;
    });
  }).filter(line => line.trim()); // remover linhas vazias
  
  return { ...block, content: densified.join('\n') };
}

// ============================================
// ADAPTAÇÃO POR NÍVEL E SEXO
// ============================================

function applyLevelSexVolumes(
  block: WorkoutBlock,
  nivel: TrainingLevel,
  sexo: SexKey
): WorkoutBlock {
  // open/pro M = referência, não altera
  if ((nivel === 'open' || nivel === 'pro') && sexo === 'M') {
    return block;
  }
  
  // Multiplicadores de volume
  const levelMult: Record<TrainingLevel, number> = {
    open: 1.0,  // Volume integral
    pro: 1.0,   // Volume integral
  };
  
  const sexMult: Record<SexKey, number> = {
    M: 1.0,
    F: 0.85,
  };
  
  const volumeRatio = levelMult[nivel] * sexMult[sexo];
  
  if (volumeRatio >= 1.0) return block;
  
  // Não adaptar aquecimento
  if (block.type === 'aquecimento') return block;
  
  return condenseBlockVolumes(block, volumeRatio);
}

// ============================================
// PRÉ-PROCESSAMENTO: GARANTIR BLOCO PRINCIPAL MARCADO
// ============================================

/**
 * Garante que exatamente um bloco esteja marcado como principal.
 * Se nenhum estiver marcado, usa identificação automática.
 */
function ensureMainBlockMarked(blocks: WorkoutBlock[]): WorkoutBlock[] {
  // Verificar se já existe bloco marcado manualmente
  const hasManualMain = blocks.some(b => b.isMainWod === true);
  if (hasManualMain) {
    return blocks;
  }
  
  // Usar identificação automática
  const mainResult = identifyMainBlock(blocks);
  if (mainResult.blockIndex < 0) {
    return blocks;
  }
  
  // Marcar o bloco identificado
  return blocks.map((block, index) => ({
    ...block,
    isMainWod: index === mainResult.blockIndex ? true : undefined,
  }));
}

// ============================================
// FUNÇÃO PRINCIPAL: buildWorkoutByTime
// ============================================

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
  densityIncreased: boolean;
  timeRelationTier: TimeRelationTier;
  timeRelationRatio: number;
  // Novo: informações detalhadas da adaptação inteligente
  adaptationDetails?: {
    removedBlocks: WorkoutBlock[];
    mainBlockReduced: boolean;
    mainBlockMinReached: boolean;
    warnings: string[];
    suggestAlternative: boolean;
    alternativeMessage?: string;
  };
}

export function buildWorkoutByTime(config: WorkoutAdaptationConfig): AdaptedWorkoutResult {
  const { nivel, sexo, tempoDisponivel, wodBase } = config;
  const sexKey: SexKey = sexo === 'feminino' ? 'F' : 'M';
  
  // PRÉ-PROCESSAMENTO: Garantir que o bloco principal esteja marcado
  // Usa identificação automática se nenhum bloco estiver marcado manualmente
  const preprocessedBlocks = ensureMainBlockMarked(wodBase.blocks);
  const preprocessedWod = { ...wodBase, blocks: preprocessedBlocks };
  
  // 1. Calcular tempo original do WOD base
  const originalTime = calculateWodTime(preprocessedWod.blocks, nivel, sexKey);
  const originalMinutes = originalTime.totalMinutes;
  
  // 2. Aplicar adaptação por nível/sexo (primeiro passo sempre)
  let adaptedBlocks = preprocessedWod.blocks.map(block => 
    applyLevelSexVolumes(block, nivel, sexKey)
  );
  
  // 3. Recalcular tempo após adaptação de nível/sexo
  const afterLevelTime = calculateWodTime(adaptedBlocks, nivel, sexKey);
  const tempoBase = afterLevelTime.totalMinutes;
  
  // 4. Calcular relação de tempo (REGRA-MÃE)
  const { ratio, tier } = calculateTimeRelation(tempoDisponivel, tempoBase);
  
  let wasCondensed = false;
  let blocksRemoved = 0;
  let densityIncreased = false;
  let adaptationDetails: AdaptedWorkoutResult['adaptationDetails'] | undefined;
  
  // 5. Se tempo ilimitado, retorna após adaptação de nível/sexo
  if (tempoDisponivel >= 9999) {
    return {
      workout: { ...wodBase, blocks: adaptedBlocks, estimatedTime: tempoBase },
      originalDuration: originalMinutes,
      adaptedDuration: tempoBase,
      wasCondensed: false,
      blocksRemoved: 0,
      densityIncreased: false,
      timeRelationTier: 'full',
      timeRelationRatio: 1.0,
    };
  }
  
  // 6. Verificar se já cabe (tempo suficiente)
  if (afterLevelTime.totalSeconds <= tempoDisponivel * 60) {
    return {
      workout: { ...wodBase, blocks: adaptedBlocks, estimatedTime: tempoBase },
      originalDuration: originalMinutes,
      adaptedDuration: tempoBase,
      wasCondensed: false,
      blocksRemoved: 0,
      densityIncreased: false,
      timeRelationTier: tier,
      timeRelationRatio: ratio,
    };
  }
  
  // 7. USAR MOTOR DE ADAPTAÇÃO INTELIGENTE POR TEMPO
  // Este motor remove blocos secundários primeiro, depois reduz o bloco principal
  const timeAdaptationResult = adaptWorkoutForTime({
    blocks: adaptedBlocks,
    tempoDisponivel,
    nivel,
    sexo,
  });
  
  // 8. Processar resultado da adaptação inteligente
  if (timeAdaptationResult.success) {
    adaptedBlocks = timeAdaptationResult.blocks;
    blocksRemoved = timeAdaptationResult.removedBlocks.length;
    wasCondensed = timeAdaptationResult.mainBlockReduced || blocksRemoved > 0;
    densityIncreased = timeAdaptationResult.mainBlockReduced;
    
    adaptationDetails = {
      removedBlocks: timeAdaptationResult.removedBlocks,
      mainBlockReduced: timeAdaptationResult.mainBlockReduced,
      mainBlockMinReached: timeAdaptationResult.mainBlockMinReached,
      warnings: timeAdaptationResult.warnings,
      suggestAlternative: timeAdaptationResult.suggestAlternative,
      alternativeMessage: timeAdaptationResult.alternativeMessage,
    };
    
    // Log warnings para debug
    if (timeAdaptationResult.warnings.length > 0) {
      console.warn('⚠️ Adaptação inteligente warnings:', timeAdaptationResult.warnings);
    }
  } else {
    // Fallback para estratégias anteriores se adaptação inteligente falhar
    console.warn('⚠️ Adaptação inteligente falhou, usando fallback');
    
    const targetSeconds = tempoDisponivel * 60;
    
    if (tier === 'full') {
      adaptedBlocks = applyFullTierStrategy(adaptedBlocks, ratio, nivel, sexKey);
      wasCondensed = ratio < 1.0;
    } else if (tier === 'reduced') {
      const result = applyReducedTierStrategy(adaptedBlocks, ratio, nivel, sexKey, targetSeconds);
      adaptedBlocks = result.blocks;
      blocksRemoved = result.removed;
      wasCondensed = true;
    } else {
      const result = applyMinimalTierStrategy(adaptedBlocks, ratio, nivel, sexKey, targetSeconds);
      adaptedBlocks = result.blocks;
      blocksRemoved = result.removed;
      wasCondensed = true;
      densityIncreased = true;
    }
    
    adaptationDetails = {
      removedBlocks: [],
      mainBlockReduced: false,
      mainBlockMinReached: false,
      warnings: ['Usado fallback para estratégia anterior'],
      suggestAlternative: false,
    };
  }
  
  // 9. Calcular tempo final
  const finalTime = calculateWodTime(adaptedBlocks, nivel, sexKey);
  
  // 10. VALIDAÇÃO FINAL usando o novo sistema
  const validation = validateTimeAdaptation(tempoDisponivel, finalTime.totalMinutes, adaptedBlocks);
  
  if (!validation.isValid) {
    console.error('❌ Validação de adaptação falhou:', validation.errors);
    
    // Tentar ajuste fino se validação falhar
    const tolerance = tempoDisponivel * 60 * 0.05;
    if (finalTime.totalSeconds > tempoDisponivel * 60 + tolerance) {
      const finalRatio = tempoDisponivel * 60 / finalTime.totalSeconds;
      adaptedBlocks = adaptedBlocks.map(block => {
        const priority = BLOCK_PRIORITIES[block.type];
        if (priority?.canCondense) {
          return condenseBlockVolumes(block, finalRatio);
        }
        return block;
      });
    }
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Warnings de validação:', validation.warnings);
  }
  
  const validatedTime = calculateWodTime(adaptedBlocks, nivel, sexKey);
  
  // 11. Debug log
  if (import.meta.env.DEV) {
    console.log('🏋️ buildWorkoutByTime v4 (Adaptação Inteligente):', {
      nivel,
      sexo,
      tempoDisponivel,
      tempoBase,
      tier,
      ratio: Math.round(ratio * 100) + '%',
      originalMinutes,
      adaptedMinutes: validatedTime.totalMinutes,
      wasCondensed,
      blocksRemoved,
      densityIncreased,
      mainBlockReduced: adaptationDetails?.mainBlockReduced,
      removedBlockNames: adaptationDetails?.removedBlocks.map(b => b.title),
      breakdown: {
        movementMin: Math.ceil(validatedTime.movementSeconds / 60),
        transitionMin: Math.ceil(validatedTime.transitionSeconds / 60),
        pauseMin: Math.ceil(validatedTime.blockPauseSeconds / 60),
      },
    });
  }
  
  return {
    workout: {
      ...wodBase,
      blocks: adaptedBlocks,
      estimatedTime: validatedTime.totalMinutes,
    },
    originalDuration: originalMinutes,
    adaptedDuration: validatedTime.totalMinutes,
    wasCondensed,
    blocksRemoved,
    densityIncreased,
    timeRelationTier: tier,
    timeRelationRatio: ratio,
    adaptationDetails,
  };
}

/**
 * VALIDAÇÃO AUTOMÁTICA DO MOTOR DE ADAPTAÇÃO
 * ============================================
 * Regras invioláveis:
 * 1. Tempo diferente = WOD diferente
 * 2. Treino mais curto = não pode conter acessórios
 * 3. Treino condensado (<50%) = apenas 1 bloco principal
 * 4. Percepção de esforço equivalente em qualquer duração
 */
export function validateAdaptation(
  original: DayWorkout,
  adapted: DayWorkout,
  tempoOriginal: number,
  tempoAdaptado: number,
  tier?: TimeRelationTier
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // REGRA 1: Tempo diferente = WOD diferente
  if (tempoOriginal !== tempoAdaptado) {
    const originalContent = original.blocks.map(b => b.content).join('');
    const adaptedContent = adapted.blocks.map(b => b.content).join('');
    
    if (originalContent === adaptedContent && original.blocks.length === adapted.blocks.length) {
      errors.push('ERRO: Tempo mudou mas WOD permanece idêntico. Treino deveria ser diferente.');
    }
  }
  
  // REGRA 2: Treino mais curto não pode conter acessórios (se tier != full)
  if (tier && tier !== 'full' && tempoAdaptado < tempoOriginal) {
    const hasAccessories = adapted.blocks.some(block => {
      const priority = BLOCK_PRIORITIES[block.type];
      return priority?.isAccessory && !block.isMainWod;
    });
    
    if (hasAccessories) {
      errors.push('ERRO: Treino reduzido/condensado ainda contém blocos acessórios.');
    }
  }
  
  // REGRA 3: Treino condensado deve ter apenas 1 bloco principal
  if (tier === 'condensed') {
    const mainBlocks = adapted.blocks.filter(block => 
      block.isMainWod || block.type === 'conditioning' || block.type === 'forca'
    );
    
    if (mainBlocks.length > 1) {
      errors.push('AVISO: Treino condensado tem mais de 1 bloco principal. Verificar densidade.');
    }
    
    // Condensado não pode ter aquecimento
    const hasWarmup = adapted.blocks.some(block => block.type === 'aquecimento');
    if (hasWarmup) {
      errors.push('ERRO: Treino condensado não deve conter aquecimento.');
    }
  }
  
  // REGRA 4: Treino mais curto deve ser mais denso (menos blocos ou volumes condensados)
  if (tempoAdaptado < tempoOriginal * 0.8) {
    if (adapted.blocks.length >= original.blocks.length) {
      // Mesmo número de blocos em tempo menor = suspeito (a menos que volumes condensados)
      const adaptedTotalChars = adapted.blocks.reduce((sum, b) => sum + b.content.length, 0);
      const originalTotalChars = original.blocks.reduce((sum, b) => sum + b.content.length, 0);
      
      if (adaptedTotalChars >= originalTotalChars) {
        errors.push('AVISO: Treino mais curto com mesma ou maior quantidade de conteúdo.');
      }
    }
  }
  
  return {
    isValid: errors.filter(e => e.startsWith('ERRO')).length === 0,
    errors,
  };
}

/**
 * Exporta informações do motor para debug/documentação
 */
export const ENGINE_VERSION = {
  version: '4.0.0',
  name: 'Motor de Adaptação Inteligente por Tempo',
  frozen: false, // Atualizado para incluir adaptação inteligente
  lastUpdate: '2025-01-21',
  rules: {
    tiers: ['full (≥80%)', 'reduced (50-79%)', 'condensed (<50%)'],
    transitions: {
      stationChange: '15s',
      loadAdjust: '20s',
      blockPause: '10s',
    },
    tolerance: '±5%',
    unknownMovementFactor: '+15%',
    mainBlockMinDuration: '8min',
  },
  principles: [
    'Tempo diferente = WOD diferente',
    'Tempo menor = treino mais denso, não mais fácil',
    'Percepção de esforço equivalente em qualquer duração',
    'Nunca subestimar tempo de execução',
  ],
  intelligentAdaptation: {
    description: 'Integra identificação de bloco principal com adaptação por tempo',
    phases: [
      '1. Remover blocos secundários em ordem de prioridade',
      '2. Reduzir bloco principal (respeitando mínimo)',
      '3. Sugerir alternativo se tempo insuficiente',
    ],
    removalOrder: [
      'Notas → Core → Específico → Corrida → Força → Conditioning → Aquecimento',
    ],
    mainBlockRules: [
      'Override manual do coach tem prioridade máxima',
      'Lógica automática identifica bloco principal se não marcado',
      'Bloco principal nunca é removido, apenas reduzido',
      'Mínimo de 8 minutos para bloco principal',
    ],
  },
};

// Re-exportar funções do motor de adaptação inteligente para uso externo
export { 
  adaptWorkoutForTime,
  validateTimeAdaptation,
  calculateTotalTime,
  classifyBlocksWithPriority,
  INTELLIGENT_ADAPTATION_INFO,
} from '@/utils/intelligentTimeAdaptation';
