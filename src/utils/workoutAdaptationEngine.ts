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

// Multiplicador de tempo por nível (intermediário = referência)
const LEVEL_TIME_MULTIPLIER: Record<TrainingLevel, number> = {
  base: 1.25, // 25% mais lento que intermediário
  progressivo: 1.0, // referência
  performance: 0.85, // 15% mais rápido que intermediário
};

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
  
  // Aplicar multiplicadores de nível e sexo
  const levelMult = LEVEL_TIME_MULTIPLIER[nivel];
  const sexMult = SEX_TIME_MULTIPLIER[sexo];
  seconds = seconds * levelMult * sexMult;
  
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
// ADAPTAÇÃO POR TEMPO
// ============================================

interface BlockPriority {
  type: string;
  priority: number; // 1 = manter, 5 = remover primeiro
  canCondense: boolean;
}

const BLOCK_PRIORITIES: Record<string, BlockPriority> = {
  conditioning: { type: 'conditioning', priority: 1, canCondense: true },
  aquecimento: { type: 'aquecimento', priority: 2, canCondense: false },
  forca: { type: 'forca', priority: 3, canCondense: true },
  especifico: { type: 'especifico', priority: 4, canCondense: true },
  core: { type: 'core', priority: 5, canCondense: true },
  corrida: { type: 'corrida', priority: 5, canCondense: true },
  notas: { type: 'notas', priority: 6, canCondense: false },
};

/**
 * Remove blocos por prioridade até caber no tempo
 */
function removeBlocksByPriority(
  blocks: WorkoutBlock[],
  targetSeconds: number,
  nivel: TrainingLevel,
  sexo: SexKey
): { blocks: WorkoutBlock[]; removed: number } {
  const sorted = [...blocks].sort((a, b) => {
    const pA = BLOCK_PRIORITIES[a.type]?.priority || 4;
    const pB = BLOCK_PRIORITIES[b.type]?.priority || 4;
    return pB - pA; // maior prioridade = remover primeiro
  });
  
  const kept: WorkoutBlock[] = [];
  let removed = 0;
  
  for (const block of sorted) {
    // Sempre manter WOD principal e conditioning
    if (block.isMainWod || block.type === 'conditioning') {
      kept.push(block);
      continue;
    }
    
    // Verificar se cabe
    const currentTime = calculateWodTime(kept, nivel, sexo).totalSeconds;
    const blockTime = calculateWodTime([block], nivel, sexo).totalSeconds;
    
    if (currentTime + blockTime <= targetSeconds) {
      kept.push(block);
    } else {
      removed++;
    }
  }
  
  // Reordenar para manter ordem original
  const orderedKept = blocks.filter(b => kept.includes(b));
  
  return { blocks: orderedKept, removed };
}

/**
 * Condensa volumes de um bloco
 */
function condenseBlockVolumes(
  block: WorkoutBlock,
  ratio: number
): WorkoutBlock {
  if (ratio >= 1.0) return block;
  
  // Clampar: nunca reduzir mais que 50%
  const effectiveRatio = Math.max(0.5, ratio);
  
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
      const roundRatio = Math.max(0.6, effectiveRatio); // mínimo 60% dos rounds
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
    // Reduzir descansos especificados
    return line.replace(/(\d+)\s*(seg|s|segundos?)\s*(descanso|rest|pausa)/gi, (match, p1) => {
      const v = parseInt(p1, 10);
      if (isNaN(v)) return match;
      const reduced = Math.max(5, Math.floor(v * 0.5));
      return `${reduced}s descanso`;
    });
  });
  
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
  // Performance M = referência, não altera
  if (nivel === 'performance' && sexo === 'M') {
    return block;
  }
  
  // Multiplicadores de volume
  const levelMult: Record<TrainingLevel, number> = {
    base: 0.65,
    progressivo: 0.85,
    performance: 1.0,
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
}

export function buildWorkoutByTime(config: WorkoutAdaptationConfig): AdaptedWorkoutResult {
  const { nivel, sexo, tempoDisponivel, wodBase } = config;
  const sexKey: SexKey = sexo === 'feminino' ? 'F' : 'M';
  
  // 1. Calcular tempo original
  const originalTime = calculateWodTime(wodBase.blocks, nivel, sexKey);
  const originalMinutes = originalTime.totalMinutes;
  
  // 2. Aplicar adaptação por nível/sexo
  let adaptedBlocks = wodBase.blocks.map(block => 
    applyLevelSexVolumes(block, nivel, sexKey)
  );
  
  // 3. Calcular tempo após adaptação de nível/sexo
  let currentTime = calculateWodTime(adaptedBlocks, nivel, sexKey);
  let currentMinutes = currentTime.totalMinutes;
  
  let wasCondensed = false;
  let blocksRemoved = 0;
  let densityIncreased = false;
  
  // 4. Se tempo ilimitado, retorna
  if (tempoDisponivel >= 9999) {
    return {
      workout: { ...wodBase, blocks: adaptedBlocks, estimatedTime: currentMinutes },
      originalDuration: originalMinutes,
      adaptedDuration: currentMinutes,
      wasCondensed: false,
      blocksRemoved: 0,
      densityIncreased: false,
    };
  }
  
  const targetSeconds = tempoDisponivel * 60;
  
  // 5. Se já cabe, retorna
  if (currentTime.totalSeconds <= targetSeconds) {
    return {
      workout: { ...wodBase, blocks: adaptedBlocks, estimatedTime: currentMinutes },
      originalDuration: originalMinutes,
      adaptedDuration: currentMinutes,
      wasCondensed: false,
      blocksRemoved: 0,
      densityIncreased: false,
    };
  }
  
  // 6. ESTRATÉGIA DE ADAPTAÇÃO
  
  // Passo A: Remover blocos acessórios
  const removeResult = removeBlocksByPriority(adaptedBlocks, targetSeconds, nivel, sexKey);
  adaptedBlocks = removeResult.blocks;
  blocksRemoved = removeResult.removed;
  
  currentTime = calculateWodTime(adaptedBlocks, nivel, sexKey);
  
  // Passo B: Se ainda não cabe, aumentar densidade
  if (currentTime.totalSeconds > targetSeconds) {
    adaptedBlocks = adaptedBlocks.map(block => {
      const priority = BLOCK_PRIORITIES[block.type];
      if (priority?.canCondense) {
        return increaseDensity(block);
      }
      return block;
    });
    densityIncreased = true;
    
    currentTime = calculateWodTime(adaptedBlocks, nivel, sexKey);
  }
  
  // Passo C: Se ainda não cabe, condensar volumes
  if (currentTime.totalSeconds > targetSeconds) {
    const ratio = targetSeconds / currentTime.totalSeconds;
    
    adaptedBlocks = adaptedBlocks.map(block => {
      const priority = BLOCK_PRIORITIES[block.type];
      if (priority?.canCondense) {
        return condenseBlockVolumes(block, ratio);
      }
      return block;
    });
    wasCondensed = true;
    
    currentTime = calculateWodTime(adaptedBlocks, nivel, sexKey);
  }
  
  // Passo D: Se ainda não cabe, condensar mais agressivamente
  if (currentTime.totalSeconds > targetSeconds * 1.1) { // tolerância de 10%
    const aggressiveRatio = (targetSeconds / currentTime.totalSeconds) * 0.9;
    
    adaptedBlocks = adaptedBlocks.map(block => {
      if (block.type === 'conditioning' || block.isMainWod) {
        return condenseBlockVolumes(block, aggressiveRatio);
      }
      if (block.type === 'aquecimento') {
        // Condensar aquecimento levemente
        return condenseBlockVolumes(block, Math.max(0.75, aggressiveRatio));
      }
      return block;
    });
  }
  
  // 7. Calcular tempo final
  const finalTime = calculateWodTime(adaptedBlocks, nivel, sexKey);
  
  // 8. Debug log
  if (process.env.NODE_ENV === 'development') {
    console.log('🏋️ buildWorkoutByTime v2:', {
      nivel,
      sexo,
      tempoDisponivel,
      originalMinutes,
      adaptedMinutes: finalTime.totalMinutes,
      wasCondensed,
      blocksRemoved,
      densityIncreased,
      breakdown: {
        movementMin: Math.ceil(finalTime.movementSeconds / 60),
        transitionMin: Math.ceil(finalTime.transitionSeconds / 60),
        pauseMin: Math.ceil(finalTime.blockPauseSeconds / 60),
      },
    });
  }
  
  return {
    workout: {
      ...wodBase,
      blocks: adaptedBlocks,
      estimatedTime: finalTime.totalMinutes,
    },
    originalDuration: originalMinutes,
    adaptedDuration: finalTime.totalMinutes,
    wasCondensed,
    blocksRemoved,
    densityIncreased,
  };
}

/**
 * Valida adaptação: tempo diferente DEVE resultar em WOD diferente
 */
export function validateAdaptation(
  original: DayWorkout,
  adapted: DayWorkout,
  tempoOriginal: number,
  tempoAdaptado: number
): { isValid: boolean; reason?: string } {
  if (tempoOriginal === tempoAdaptado) {
    return { isValid: true };
  }
  
  const originalContent = original.blocks.map(b => b.content).join('');
  const adaptedContent = adapted.blocks.map(b => b.content).join('');
  
  if (originalContent === adaptedContent && original.blocks.length === adapted.blocks.length) {
    return {
      isValid: false,
      reason: 'Tempo mudou mas WOD permanece igual',
    };
  }
  
  return { isValid: true };
}
