// ============================================
// MVP0: DETECÇÃO DE UNIDADES PROVÁVEIS
// ============================================
// Este módulo detecta unidades naturalmente usadas por coaches
// e classifica a CONFIANÇA para o motor de adaptação
// 
// PRINCÍPIO MESTRE:
// - Toda linha com unidade reconhecida é EXERCISE válido
// - Unidade NÃO define importância do exercício
// - Unidade define apenas se o MOTOR pode inferir automaticamente
// - Execução, histórico e visualização NUNCA são bloqueados
// ============================================

// ============================================
// TIPOS
// ============================================

export type UnitConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

// ============================================
// CACHE DE MEMOIZAÇÃO — evita re-execução de regex para a mesma linha
// ============================================
const _unitsCache = new Map<string, UnitDetectionResult>();

/** Limpa o cache de detecção de unidades (chamar no início de cada parse session) */
export const resetUnitsCache = () => _unitsCache.clear();

export interface UnitDetectionResult {
  hasRecognizedUnit: boolean;
  confidence: UnitConfidence;
  units: DetectedUnit[];
  rawMatches: string[];
}

export interface DetectedUnit {
  type: 'time' | 'distance' | 'reps' | 'structure' | 'effort';
  value: number | null;
  unit: string;
  raw: string;
}

// ============================================
// WHITELIST DE UNIDADES PROVÁVEIS
// ============================================
// Reconhece unidades naturalmente usadas por coaches
// SEM exigir formato rígido

// TEMPO
const TIME_PATTERNS = [
  // Segundos: aspas duplas (todas variantes Unicode) ou duas simples
  /(\d+)\s*[\u0022\u201C\u201D\u2033]/gi,
  /(\d+)\s*\u0027{2}/gi,
  /(\d+)\s*(?:seg(?:undos?)?|sec(?:onds?)?|s)\b/gi,
  // Minutos: aspas simples (todas variantes Unicode), "min", "minutos"
  /(\d+)\s*[\u0027\u2018\u2019\u2032](?![\u0027\u2018\u2019\u2032])/gi,
  /(\d+)\s*(?:min(?:utos?)?|minutes?)\b/gi,
  // Horas: "h", "hora", "horas"
  /(\d+)\s*(?:h(?:ora)?s?)\b/gi,
  // Formato mm:ss ou hh:mm:ss
  /\d{1,2}:\d{2}(?::\d{2})?\b/g,
];

// DISTÂNCIA
const DISTANCE_PATTERNS = [
  // Metros: "m"
  /(\d+)\s*m\b/gi,
  // Quilômetros: "km"
  /(\d+(?:[,.]\d+)?)\s*km\b/gi,
];

// REPETIÇÕES / ESTRUTURA
const REPS_STRUCTURE_PATTERNS = [
  // Números + movimento: "10 burpees", "12 push-ups"
  /^(\d+)\s+(?:[a-záéíóúàêâôûãõ]+)/gi,
  // Formatos: "5x5", "4x8"
  /(\d+)\s*x\s*(\d+)/gi,
  // Rounds: "3 rounds", "4 séries"
  /(\d+)\s*(?:rounds?|rodadas?|s[eé]ries?|sets?)\b/gi,
  // EMOM, AMRAP, For time, RFT, Tabata
  /\b(?:emom|e\d+mom|amrap|for\s*time|rft|tabata)\b/gi,
  // Reps explícito
  /(\d+)\s*(?:reps?|repeti[çc][õo]es?)\b/gi,
];

// ESFORÇO / INTENSIDADE
const EFFORT_PATTERNS = [
  // PSE/RPE: "PSE 6", "RPE 7"
  /\b(?:pse|rpe)\s*[:=]?\s*(\d+)/gi,
  // Zona: "Zona 2", "Zone 3"
  /\b(?:zona|zone)\s*(\d+)/gi,
  // FC/HR: "FC 140", "HR 150"
  /\b(?:fc|hr)\s*[:=]?\s*(\d+)/gi,
];

// ============================================
// DETECÇÃO PRINCIPAL
// ============================================

/**
 * Detecta unidades prováveis em uma linha de texto
 * REGRA: Qualquer linha com unidade reconhecida é EXERCISE válido
 */
export function detectUnits(line: string): UnitDetectionResult {
  // Cache hit → retorno O(1)
  const cached = _unitsCache.get(line);
  if (cached) return cached;

  const trimmed = line.trim();
  const units: DetectedUnit[] = [];
  const rawMatches: string[] = [];
  
  // 1. Detectar TEMPO
  for (const pattern of TIME_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(trimmed)) !== null) {
      const raw = match[0];
      if (!rawMatches.includes(raw)) {
        rawMatches.push(raw);
        const value = match[1] ? parseInt(match[1]) : null;
        units.push({
          type: 'time',
          value,
          unit: extractTimeUnit(raw),
          raw,
        });
      }
      if (!pattern.global) break;
      if (match[0].length === 0) pattern.lastIndex++;
    }
  }
  
  // 2. Detectar DISTÂNCIA
  for (const pattern of DISTANCE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(trimmed)) !== null) {
      const raw = match[0];
      if (!rawMatches.includes(raw)) {
        rawMatches.push(raw);
        const value = match[1] ? parseFloat(match[1].replace(',', '.')) : null;
        units.push({
          type: 'distance',
          value,
          unit: raw.toLowerCase().includes('km') ? 'km' : 'm',
          raw,
        });
      }
      if (!pattern.global) break;
      if (match[0].length === 0) pattern.lastIndex++;
    }
  }
  
  // 3. Detectar REPS/ESTRUTURA
  for (const pattern of REPS_STRUCTURE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(trimmed)) !== null) {
      const raw = match[0];
      if (!rawMatches.includes(raw)) {
        rawMatches.push(raw);
        const value = match[1] ? parseInt(match[1]) : null;
        units.push({
          type: pattern.source.includes('emom|') ? 'structure' : 'reps',
          value,
          unit: extractRepsUnit(raw),
          raw,
        });
      }
      if (!pattern.global) break;
      if (match[0].length === 0) pattern.lastIndex++;
    }
  }
  
  // 4. Detectar ESFORÇO
  for (const pattern of EFFORT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(trimmed)) !== null) {
      const raw = match[0];
      if (!rawMatches.includes(raw)) {
        rawMatches.push(raw);
        const value = match[1] ? parseInt(match[1]) : null;
        units.push({
          type: 'effort',
          value,
          unit: extractEffortUnit(raw),
          raw,
        });
      }
      if (!pattern.global) break;
      if (match[0].length === 0) pattern.lastIndex++;
    }
  }
  
  // 5. Calcular confiança
  const confidence = calculateConfidence(units, trimmed);
  
  const result: UnitDetectionResult = {
    hasRecognizedUnit: units.length > 0,
    confidence,
    units,
    rawMatches,
  };
  
  // Salvar no cache antes de retornar
  _unitsCache.set(line, result);
  
  return result;
}

// ============================================
// CLASSIFICAÇÃO DE CONFIANÇA
// ============================================

/**
 * Calcula confiança baseado nas unidades detectadas
 * 
 * ALTA CONFIANÇA:
 * - distância explícita (m / km)
 * - tempo contínuo ≥ 5 minutos
 * - sessões claras (ex: "30 min corrida", "10 km bike")
 * 
 * CONFIANÇA MÉDIA:
 * - repetições claras
 * - tempo curto (< 5 min) associado a movimento conhecido
 * 
 * BAIXA CONFIANÇA:
 * - tempo muito curto isolado
 * - exercícios altamente dependentes de contexto estrutural
 */
function calculateConfidence(units: DetectedUnit[], line: string): UnitConfidence {
  if (units.length === 0) {
    return 'LOW';
  }
  
  const lowerLine = line.toLowerCase();
  
  // Padrões de atividade conhecida (aumenta confiança)
  const hasKnownActivity = /\b(?:corrida|bike|remo|ski|caminhada|trote|run|row|swim|airbike|assault|erg|prancha|wall\s*sit|hold)\b/i.test(lowerLine);
  
  // ============================================
  // ALTA CONFIANÇA
  // ============================================
  
  // Distância explícita (m ou km) → ALTA
  const hasDistance = units.some(u => u.type === 'distance');
  if (hasDistance) {
    return 'HIGH';
  }
  
  // Tempo ≥ 5 minutos → ALTA
  const hasLongTime = units.some(u => {
    if (u.type !== 'time' || u.value === null) return false;
    // Verificar se é minutos
    const isMinutes = /min|'(?!')|minutos?/i.test(u.raw);
    return isMinutes && u.value >= 5;
  });
  if (hasLongTime) {
    return 'HIGH';
  }
  
  // Tempo qualquer + atividade conhecida → ALTA
  const hasTime = units.some(u => u.type === 'time');
  if (hasTime && hasKnownActivity) {
    return 'HIGH';
  }
  
  // Estrutura clara (EMOM, AMRAP, For Time, rounds) → ALTA
  const hasStructure = units.some(u => u.type === 'structure');
  if (hasStructure) {
    return 'HIGH';
  }
  
  // Séries claras (5x5, 4x8) → ALTA
  const hasSets = units.some(u => u.type === 'reps' && /\d+\s*x\s*\d+/i.test(u.raw));
  if (hasSets) {
    return 'HIGH';
  }
  
  // ============================================
  // CONFIANÇA MÉDIA
  // ============================================
  
  // Repetições claras → MÉDIA
  const hasReps = units.some(u => u.type === 'reps');
  if (hasReps) {
    return 'MEDIUM';
  }
  
  // Tempo curto (< 5 min) com unidade reconhecida → MÉDIA
  const hasShortTime = units.some(u => {
    if (u.type !== 'time' || u.value === null) return false;
    const isMinutes = /min|'(?!')|minutos?/i.test(u.raw);
    const isSeconds = /''|"|seg|sec|s\b/i.test(u.raw);
    return (isMinutes && u.value < 5) || isSeconds;
  });
  if (hasShortTime) {
    return 'MEDIUM';
  }
  
  // Esforço (PSE/RPE/Zona) → MÉDIA
  const hasEffort = units.some(u => u.type === 'effort');
  if (hasEffort) {
    return 'MEDIUM';
  }
  
  // ============================================
  // BAIXA CONFIANÇA (fallback)
  // ============================================
  return 'LOW';
}

// ============================================
// HELPERS
// ============================================

function extractTimeUnit(raw: string): string {
  if (/''|"/i.test(raw)) return 'sec';
  if (/seg|sec|s\b/i.test(raw)) return 'sec';
  if (/'|min/i.test(raw)) return 'min';
  if (/h/i.test(raw)) return 'h';
  if (/\d+:\d+:\d+/.test(raw)) return 'hh:mm:ss';
  if (/\d+:\d+/.test(raw)) return 'mm:ss';
  return 'time';
}

function extractRepsUnit(raw: string): string {
  if (/x/i.test(raw)) return 'sets';
  if (/rounds?|rodadas?/i.test(raw)) return 'rounds';
  if (/s[eé]ries?|sets?/i.test(raw)) return 'series';
  if (/reps?|repeti/i.test(raw)) return 'reps';
  if (/emom|amrap|for\s*time|rft|tabata/i.test(raw)) return 'format';
  return 'reps';
}

function extractEffortUnit(raw: string): string {
  if (/pse/i.test(raw)) return 'PSE';
  if (/rpe/i.test(raw)) return 'RPE';
  if (/zona|zone/i.test(raw)) return 'zone';
  if (/fc|hr/i.test(raw)) return 'HR';
  return 'effort';
}

// ============================================
// VERIFICAÇÃO RÁPIDA: É EXERCISE?
// ============================================

/**
 * Verifica se linha tem unidade reconhecida
 * REGRA: Se true → SEMPRE classificar como EXERCISE (nunca NOTE)
 */
export function hasRecognizedUnit(line: string): boolean {
  return detectUnits(line).hasRecognizedUnit;
}

/**
 * Retorna confiança para uma linha
 * Para uso no motor de adaptação
 */
export function getLineConfidence(line: string): UnitConfidence {
  return detectUnits(line).confidence;
}

// ============================================
// LABELS PARA UI
// ============================================

export const CONFIDENCE_LABELS: Record<UnitConfidence, string> = {
  HIGH: 'Alta confiança',
  MEDIUM: 'Confiança média',
  LOW: 'Baixa confiança',
};

export const CONFIDENCE_TOOLTIPS: Record<UnitConfidence, string> = {
  HIGH: 'Este exercício será usado como base para ajustes automáticos.',
  MEDIUM: 'Este exercício foi entendido corretamente, mas o OUTLIER usará com cautela para ajuste automático.',
  LOW: 'Este exercício foi entendido corretamente, mas o OUTLIER não usará este dado como base principal de ajuste automático.',
};

// ============================================
// INTEGRAÇÃO COM MOTOR DE ADAPTAÇÃO
// ============================================

/**
 * Verifica se uma linha pode ser usada para ajuste automático
 * Apenas linhas de ALTA CONFIANÇA são usadas automaticamente
 */
export function canAutoAdjust(line: string): boolean {
  const result = detectUnits(line);
  return result.hasRecognizedUnit && result.confidence === 'HIGH';
}

/**
 * Verifica se uma linha deve ser ignorada para ajuste automático
 * Linhas de MÉDIA ou BAIXA confiança são ignoradas para ajuste
 * MAS ainda são válidas e aparecem para o atleta
 */
export function shouldSkipAutoAdjust(line: string): boolean {
  const result = detectUnits(line);
  return !result.hasRecognizedUnit || result.confidence !== 'HIGH';
}
