/**
 * WORKOUT STRUCTURES - MVP0
 * 
 * Sistema de estruturas tipadas para blocos de treino.
 * Reconhece **N ROUNDS**, **EMOM X**, **AMRAP X**, **FOR TIME**
 * e aplica regras de tempo/multiplicação no motor.
 * 
 * TIPOS DE ESTRUTURA:
 * - MULTIPLIER: **N ROUNDS** - multiplica exercícios por N
 * - FIXED_TIME: **EMOM X** / **AMRAP X** - tempo fixo em X minutos
 * - DERIVED_TIME: **FOR TIME** - tempo = soma dos exercícios
 * 
 * REGRAS DE VALIDAÇÃO:
 * - Máximo 1 modo de tempo por bloco (FIXED_TIME ou DERIVED_TIME)
 * - PROIBIDO combinar FIXED_TIME + MULTIPLIER
 * - Permitido: MULTIPLIER + DERIVED_TIME
 */

// ============================================
// TIPOS
// ============================================

export type StructureType = 'MULTIPLIER' | 'FIXED_TIME' | 'DERIVED_TIME';

export interface WorkoutStructure {
  type: StructureType;
  value: number | null; // Rounds, minutos, ou null para FOR TIME
  rawLine: string;
  tag: string; // Ex: "__STRUCT:ROUNDS=3", "__STRUCT:EMOM=30"
}

export interface StructureParseResult {
  structures: WorkoutStructure[];
  errors: StructureValidationError[];
  cleanedLines: string[]; // Linhas sem as estruturas
  tags: string[]; // Tags reservadas para armazenamento
}

export interface StructureValidationError {
  type: 'CONFLICT_FIXED_MULTIPLIER' | 'CONFLICT_MULTIPLE_TIME_MODES' | 'INVALID_STRUCTURE';
  message: string;
  line?: string;
}

// ============================================
// PADRÕES DE DETECÇÃO (com e sem ** ** wrapper)
// ============================================

/**
 * Padrão para N ROUNDS dentro de ** **
 * Exemplos: **3 ROUNDS**, **5 rounds**, **10 Rounds**
 */
const ROUNDS_PATTERN = /^\*\*\s*(\d+)\s*Rounds?\s*\*\*$/i;

/**
 * Padrão para EMOM dentro de ** **
 * Exemplos: **EMOM 30**, **EMOM 20'**, **EMOM 10 min**
 */
const EMOM_PATTERN = /^\*\*\s*EMOM\s+(\d+)\s*['′]?\s*(?:min)?\s*\*\*$/i;

/**
 * Padrão para AMRAP dentro de ** **
 * Exemplos: **AMRAP 15**, **AMRAP 20'**, **AMRAP 12 min**
 */
const AMRAP_PATTERN = /^\*\*\s*AMRAP\s+(\d+)\s*['′]?\s*(?:min)?\s*\*\*$/i;

/**
 * Padrão para FOR TIME dentro de ** **
 * Exemplos: **FOR TIME**, **For Time**
 */
const FOR_TIME_PATTERN = /^\*\*\s*For\s+Time\s*\*\*$/i;

/**
 * Padrão genérico para qualquer estrutura entre ** **
 */
const STRUCTURE_WRAPPER_PATTERN = /^\*\*.*\*\*$/;

// ────────────────────────────────────────────────────────────
// Padrões PLAIN TEXT (sem ** **) — aceita coaches sem markdown
// ────────────────────────────────────────────────────────────
const PLAIN_ROUNDS_PATTERN = /^(\d+)\s+Rounds?\s*$/i;
const PLAIN_EMOM_PATTERN = /^EMOM\s+(\d+)\s*['′]?\s*(?:min)?\s*$/i;
const PLAIN_AMRAP_PATTERN = /^AMRAP\s+(\d+)\s*['′]?\s*(?:min)?\s*$/i;
const PLAIN_FOR_TIME_PATTERN = /^For\s+Time\s*$/i;

// ============================================
// FUNÇÕES DE DETECÇÃO
// ============================================

/**
 * Verifica se uma linha é uma estrutura de bloco (entre ** **)
 */
export function isWrappedStructure(line: string): boolean {
  const trimmed = (line ?? '').trim();
  return STRUCTURE_WRAPPER_PATTERN.test(trimmed);
}

/**
 * Parseia uma linha e retorna a estrutura detectada (ou null).
 * Aceita tanto formato **wrapped** quanto plain text.
 */
export function parseStructureLine(line: string): WorkoutStructure | null {
  const trimmed = (line ?? '').trim();
  
  // ── Primeiro: tentar formato wrapped (**...**) ──
  if (isWrappedStructure(trimmed)) {
    return parseWrappedStructureLine(trimmed);
  }

  // ── Segundo: tentar formato plain text ──
  return parsePlainStructureLine(trimmed);
}

/**
 * Parseia linhas com ** ** wrapper (formato original)
 */
function parseWrappedStructureLine(trimmed: string): WorkoutStructure | null {
  
  // ROUNDS
  const roundsMatch = trimmed.match(ROUNDS_PATTERN);
  if (roundsMatch) {
    const rounds = parseInt(roundsMatch[1], 10);
    return {
      type: 'MULTIPLIER',
      value: rounds,
      rawLine: trimmed,
      tag: `__STRUCT:ROUNDS=${rounds}`,
    };
  }
  
  // EMOM
  const emomMatch = trimmed.match(EMOM_PATTERN);
  if (emomMatch) {
    const minutes = parseInt(emomMatch[1], 10);
    return {
      type: 'FIXED_TIME',
      value: minutes,
      rawLine: trimmed,
      tag: `__STRUCT:EMOM=${minutes}`,
    };
  }
  
  // AMRAP
  const amrapMatch = trimmed.match(AMRAP_PATTERN);
  if (amrapMatch) {
    const minutes = parseInt(amrapMatch[1], 10);
    return {
      type: 'FIXED_TIME',
      value: minutes,
      rawLine: trimmed,
      tag: `__STRUCT:AMRAP=${minutes}`,
    };
  }
  
  // FOR TIME
  if (FOR_TIME_PATTERN.test(trimmed)) {
    return {
      type: 'DERIVED_TIME',
      value: null,
      rawLine: trimmed,
      tag: '__STRUCT:FORTIME=true',
    };
  }
  
  // Estrutura não reconhecida entre ** **
  return null;
}

/**
 * Parseia linhas SEM ** ** wrapper (plain text).
 * Aceita: "2 ROUNDS", "EMOM 20", "AMRAP 15", "For Time"
 */
function parsePlainStructureLine(trimmed: string): WorkoutStructure | null {
  // ROUNDS
  const roundsMatch = trimmed.match(PLAIN_ROUNDS_PATTERN);
  if (roundsMatch) {
    const rounds = parseInt(roundsMatch[1], 10);
    return {
      type: 'MULTIPLIER',
      value: rounds,
      rawLine: trimmed,
      tag: `__STRUCT:ROUNDS=${rounds}`,
    };
  }

  // EMOM
  const emomMatch = trimmed.match(PLAIN_EMOM_PATTERN);
  if (emomMatch) {
    const minutes = parseInt(emomMatch[1], 10);
    return {
      type: 'FIXED_TIME',
      value: minutes,
      rawLine: trimmed,
      tag: `__STRUCT:EMOM=${minutes}`,
    };
  }

  // AMRAP
  const amrapMatch = trimmed.match(PLAIN_AMRAP_PATTERN);
  if (amrapMatch) {
    const minutes = parseInt(amrapMatch[1], 10);
    return {
      type: 'FIXED_TIME',
      value: minutes,
      rawLine: trimmed,
      tag: `__STRUCT:AMRAP=${minutes}`,
    };
  }

  // FOR TIME
  if (PLAIN_FOR_TIME_PATTERN.test(trimmed)) {
    return {
      type: 'DERIVED_TIME',
      value: null,
      rawLine: trimmed,
      tag: '__STRUCT:FORTIME=true',
    };
  }

  return null;
}

// ============================================
// VALIDAÇÃO DE CONFLITOS
// ============================================

/**
 * Valida as estruturas de um bloco e retorna erros de conflito
 */
export function validateStructures(structures: WorkoutStructure[]): StructureValidationError[] {
  const errors: StructureValidationError[] = [];
  
  const hasMultiplier = structures.some(s => s.type === 'MULTIPLIER');
  const hasFixedTime = structures.some(s => s.type === 'FIXED_TIME');
  const hasDerivedTime = structures.some(s => s.type === 'DERIVED_TIME');
  
  // Regra 1: PROIBIDO combinar FIXED_TIME + MULTIPLIER
  if (hasFixedTime && hasMultiplier) {
    errors.push({
      type: 'CONFLICT_FIXED_MULTIPLIER',
      message: 'Não é permitido combinar EMOM/AMRAP com ROUNDS no mesmo bloco. Use apenas um modo.',
    });
  }
  
  // Regra 2: Máximo 1 modo de tempo (FIXED_TIME ou DERIVED_TIME)
  if (hasFixedTime && hasDerivedTime) {
    errors.push({
      type: 'CONFLICT_MULTIPLE_TIME_MODES',
      message: 'Não é permitido combinar EMOM/AMRAP com FOR TIME no mesmo bloco.',
    });
  }
  
  // Regra 3: Múltiplos FIXED_TIME
  const fixedTimeCount = structures.filter(s => s.type === 'FIXED_TIME').length;
  if (fixedTimeCount > 1) {
    errors.push({
      type: 'CONFLICT_MULTIPLE_TIME_MODES',
      message: 'Apenas um EMOM ou AMRAP é permitido por bloco.',
    });
  }
  
  return errors;
}

// ============================================
// FUNÇÃO PRINCIPAL: parseBlockStructures
// ============================================

/**
 * Parseia o conteúdo de um bloco e extrai estruturas
 * Retorna estruturas, erros de validação e linhas limpas
 */
export function parseBlockStructures(content: string): StructureParseResult {
  if (!content) {
    return {
      structures: [],
      errors: [],
      cleanedLines: [],
      tags: [],
    };
  }
  
  const lines = content.split('\n');
  const structures: WorkoutStructure[] = [];
  const cleanedLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Tentar parsear como estrutura
    const structure = parseStructureLine(trimmed);
    
    if (structure) {
      structures.push(structure);
      // Estruturas NÃO vão para cleanedLines (não são exercícios)
    } else {
      // Linha normal - manter
      cleanedLines.push(line);
    }
  }
  
  // Validar estruturas
  const errors = validateStructures(structures);
  
  // Gerar tags
  const tags = structures.map(s => s.tag);
  
  return {
    structures,
    errors,
    cleanedLines,
    tags,
  };
}

// ============================================
// FUNÇÕES DE CÁLCULO PARA O MOTOR
// ============================================

/**
 * Extrai o multiplicador de rounds das estruturas
 * Retorna 1 se não houver ROUNDS
 */
export function getRoundsMultiplier(structures: WorkoutStructure[]): number {
  const rounds = structures.find(s => s.type === 'MULTIPLIER');
  return rounds?.value ?? 1;
}

/**
 * Extrai o tempo fixo (EMOM/AMRAP) das estruturas
 * Retorna null se não houver tempo fixo
 */
export function getFixedTimeMinutes(structures: WorkoutStructure[]): number | null {
  const fixedTime = structures.find(s => s.type === 'FIXED_TIME');
  return fixedTime?.value ?? null;
}

/**
 * Verifica se o bloco é FOR TIME (tempo derivado dos exercícios)
 */
export function isForTime(structures: WorkoutStructure[]): boolean {
  return structures.some(s => s.type === 'DERIVED_TIME');
}

/**
 * Calcula o tempo do bloco baseado nas estruturas
 * @param structures - Estruturas parseadas do bloco
 * @param exerciseEstimatedMinutes - Tempo estimado dos exercícios (soma)
 * @returns Tempo em minutos
 */
export function calculateBlockTimeFromStructures(
  structures: WorkoutStructure[],
  exerciseEstimatedMinutes: number
): number {
  const fixedTime = getFixedTimeMinutes(structures);
  
  // FIXED_TIME: tempo fixo (EMOM/AMRAP)
  if (fixedTime !== null) {
    return fixedTime;
  }
  
  const multiplier = getRoundsMultiplier(structures);
  
  // DERIVED_TIME ou sem estrutura: tempo = exercícios × rounds
  return exerciseEstimatedMinutes * multiplier;
}

/**
 * Gera descrição legível das estruturas para exibição
 */
export function getStructureDescription(structures: WorkoutStructure[]): string | null {
  if (structures.length === 0) return null;
  
  const parts: string[] = [];
  
  for (const struct of structures) {
    switch (struct.type) {
      case 'MULTIPLIER':
        parts.push(`${struct.value} Rounds`);
        break;
      case 'FIXED_TIME':
        if (struct.tag.includes('EMOM')) {
          parts.push(`EMOM ${struct.value}'`);
        } else if (struct.tag.includes('AMRAP')) {
          parts.push(`AMRAP ${struct.value}'`);
        }
        break;
      case 'DERIVED_TIME':
        parts.push('For Time');
        break;
    }
  }
  
  return parts.length > 0 ? parts.join(' + ') : null;
}

// ============================================
// ROUND GROUPS - Semântica de múltiplos rounds
// ============================================

/**
 * Um grupo de exercícios com seu multiplicador de rounds.
 * Cada marcador de rounds "pertence" aos exercícios imediatamente abaixo,
 * até o próximo marcador ou o fim do bloco.
 */
export interface RoundGroup {
  multiplier: number; // 1 se não houver marcador
  exerciseLines: string[];
}

/**
 * Divide o conteúdo de um bloco em grupos de rounds.
 * 
 * Regra: cada **N ROUNDS** se aplica apenas aos exercícios
 * que vêm logo abaixo dele, até o próximo marcador ou fim do bloco.
 * Exercícios antes do primeiro marcador ficam com multiplicador 1.
 * 
 * @param content - Texto bruto do bloco (com \n)
 * @returns Lista de RoundGroup
 */
export function parseRoundGroups(content: string): RoundGroup[] {
  if (!content) return [];

  const lines = content.split('\n');
  const groups: RoundGroup[] = [];
  let currentMultiplier = 1;
  let currentExercises: string[] = [];
  let hasSeenMultiplier = false;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Tentar parsear como estrutura
    const structure = parseStructureLine(trimmed);

    if (structure && structure.type === 'MULTIPLIER' && structure.value) {
      // Flush exercícios acumulados do grupo anterior
      if (currentExercises.length > 0) {
        groups.push({ multiplier: currentMultiplier, exerciseLines: currentExercises });
        currentExercises = [];
      }
      currentMultiplier = structure.value;
      hasSeenMultiplier = true;
      continue;
    }

    // Ignorar FIXED_TIME / DERIVED_TIME structures para agrupamento
    if (structure) continue;

    // Linhas de exercício (com ou sem hífen)
    const isExercise = trimmed.startsWith('- ') || trimmed.startsWith('-') ||
      /^\d/.test(trimmed) || (!trimmed.startsWith('(') && !trimmed.startsWith('>'));

    // Ignorar linhas DSL, separadores, comentários puros
    if (/^(DIA:|BLOCO:)/i.test(trimmed)) continue;
    if (/^[⸻─]{3,}/.test(trimmed)) continue;
    if (/^\([^)]*\)$/.test(trimmed)) continue;
    if (/^>?\s*COMENT[ÁA]RIO$/i.test(trimmed)) continue;

    if (isExercise) {
      currentExercises.push(trimmed);
    }
  }

  // Flush último grupo
  if (currentExercises.length > 0) {
    groups.push({ multiplier: currentMultiplier, exerciseLines: currentExercises });
  }

  return groups;
}

/**
 * Retorna o multiplicador total efetivo de rounds para um bloco.
 * Para blocos com múltiplos grupos, retorna a média ponderada
 * (para compatibilidade com código legado que espera um único número).
 * 
 * Para cálculos precisos, use parseRoundGroups() diretamente.
 */
export function getEffectiveRoundsMultiplier(content: string): number {
  const groups = parseRoundGroups(content);
  if (groups.length === 0) return 1;
  if (groups.length === 1) return groups[0].multiplier;

  // Múltiplos grupos: retornar média ponderada por número de exercícios
  const totalLines = groups.reduce((sum, g) => sum + g.exerciseLines.length, 0);
  if (totalLines === 0) return 1;

  const weightedSum = groups.reduce((sum, g) => sum + g.multiplier * g.exerciseLines.length, 0);
  return Math.round(weightedSum / totalLines);
}

// ============================================
// HELPER: Parsear tags armazenadas
// ============================================

/**
 * Parseia tags armazenadas e reconstrói estruturas
 * Útil para ler de blocos já salvos
 */
export function parseStoredTags(tags: string[]): WorkoutStructure[] {
  const structures: WorkoutStructure[] = [];
  
  for (const tag of tags) {
    if (tag.startsWith('__STRUCT:ROUNDS=')) {
      const value = parseInt(tag.split('=')[1], 10);
      structures.push({
        type: 'MULTIPLIER',
        value,
        rawLine: `**${value} Rounds**`,
        tag,
      });
    } else if (tag.startsWith('__STRUCT:EMOM=')) {
      const value = parseInt(tag.split('=')[1], 10);
      structures.push({
        type: 'FIXED_TIME',
        value,
        rawLine: `**EMOM ${value}**`,
        tag,
      });
    } else if (tag.startsWith('__STRUCT:AMRAP=')) {
      const value = parseInt(tag.split('=')[1], 10);
      structures.push({
        type: 'FIXED_TIME',
        value,
        rawLine: `**AMRAP ${value}**`,
        tag,
      });
    } else if (tag === '__STRUCT:FORTIME=true') {
      structures.push({
        type: 'DERIVED_TIME',
        value: null,
        rawLine: '**For Time**',
        tag,
      });
    }
  }
  
  return structures;
}
