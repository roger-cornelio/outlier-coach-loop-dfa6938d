/**
 * structuredTextParser.ts - Parser de texto livre de treino
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANÔNICO — NÃO CRIAR VARIAÇÕES — MVP0
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este é o ÚNICO parser de texto de treino da aplicação.
 * 
 * CONTRATO:
 * - Entrada: string (texto do textarea, sem modificações)
 * - Saída: ParseResult (estrutura de dias/blocos/exercícios)
 * 
 * PROIBIDO:
 * - Criar parsers paralelos
 * - Modificar o texto antes de chamar este parser
 * - Inserir cabeçalhos de dia no texto
 * - Parsing "por página" ou "por print"
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * PRINCÍPIO FUNDAMENTAL: ATLETA > COACH
 * ═══════════════════════════════════════════════════════════════════════════════
 * Em qualquer situação de ambiguidade, dúvida ou incerteza:
 * - A experiência do atleta tem prioridade absoluta
 * - Preferir BLOQUEAR o coach a gerar resultado incorreto para o atleta
 * - O sistema NUNCA tenta adivinhar intenção do coach
 * - Se não há 100% de certeza, o sistema NÃO executa
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * REGRAS DE PARSING (DETERMINÍSTICO):
 * - Linhas MAIÚSCULAS → dias ou títulos de blocos
 * - Linhas iniciadas por número → exercícios
 * - Separador ⸻ → fim explícito do bloco
 * - REGRA PRINCIPAL: Todo texto abaixo de um BLOCO pertence ao BLOCO até:
 *   - Novo BLOCO (linha maiúscula)
 *   - Novo DIA
 *   - Separador ⸻
 * - Pesos: % → relativo, PSE/RPE → esforço, 32/24kg → referência RX, kg isolado → carga fixa (gerar alerta)
 * 
 * VALIDAÇÕES BLOQUEANTES (fail-safe):
 * - Título de bloco obrigatório (não pode começar com exercício)
 * - WOD principal só via ação explícita do coach
 * - Nenhuma inferência que gere ambiguidade para o atleta
 */

import type { DayOfWeek, DayWorkout, WorkoutBlock } from '@/types/outlier';
import { detectUnits, hasRecognizedUnit, resetUnitsCache, type UnitConfidence } from './unitDetection';
import { extractInlineComments } from './blockDisplayUtils';

// ════════════════════════════════════════════════════════════════════════════
// CACHES DE MEMOIZAÇÃO — elimina redundância de regex (chamadas repetidas para mesma linha)
// ════════════════════════════════════════════════════════════════════════════
const _narrativeCache = new Map<string, boolean>();
const _measurableCache = new Map<string, boolean>();
const _trainingCache = new Map<string, boolean>();
const _prescriptionCache = new Map<string, boolean>();
const _headingCache = new Map<string, boolean>();

const resetParserCaches = () => {
  _narrativeCache.clear();
  _measurableCache.clear();
  _trainingCache.clear();
  _prescriptionCache.clear();
  _headingCache.clear();
};

// ════════════════════════════════════════════════════════════════════════════
// DEBUG FLAG — set to true to enable verbose parser logs (PERFORMANCE IMPACT!)
// ════════════════════════════════════════════════════════════════════════════
const DEBUG_PARSER = typeof import.meta !== 'undefined' && import.meta.env?.DEV && import.meta.env?.VITE_DEBUG_PARSER === 'true';
const _log = DEBUG_PARSER ? console.log.bind(console) : (() => {}) as (...args: any[]) => void;
const _debug = DEBUG_PARSER ? console.debug.bind(console) : (() => {}) as (...args: any[]) => void;
const _warn = DEBUG_PARSER ? console.warn.bind(console) : (() => {}) as (...args: any[]) => void;

// ============================================
// TIPOS
// ============================================

export interface ParsedItem {
  quantity: number;
  unit: string;
  movement: string;
  notes?: string;
  weight?: string;
  isWeightAlert?: boolean; // Alerta quando kg isolado
}

// ============================================
// MVP0: CLASSIFICAÇÃO DE ITENS — EXERCISE / REST / NOTE
// ============================================
// Cada linha é classificada com:
// - kind: EXERCISE | REST | NOTE
// - confidence: HIGH | MEDIUM | LOW
// - flags: OPTIONAL (exercício trackável mas não obrigatório)

export type ItemKind = 'EXERCISE' | 'REST' | 'NOTE';
export type ItemConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

// Flags especiais para itens
export interface ItemFlags {
  optional?: boolean; // Exercício opcional trackável (aparece pro atleta, só computa se feito)
}

// Resultado de classificação de uma linha
export interface ClassifiedItem {
  kind: ItemKind;
  confidence: ItemConfidence;
  flags?: ItemFlags;
}

// Legacy type alias para compatibilidade
export type LineType = 'exercise' | 'comment';

export interface ParsedLine {
  id: string; // ID único para reordenação
  text: string;
  type: LineType;
  // MVP0: Novos campos de classificação
  kind?: ItemKind;
  confidence?: ItemConfidence;
  flags?: ItemFlags;
}

export interface ParsedBlock {
  title: string;
  type: WorkoutBlock['type'];
  format: string;
  formatDisplay?: string; // Formato extraído para exibição (ex: "EMOM 30'")
  isMainWod: boolean;
  isBenchmark: boolean;
  optional: boolean; // Treino opcional (não exige WOD principal)
  items: ParsedItem[];
  lines: ParsedLine[]; // Linhas classificadas (exercício ou comentário)
  coachNotes: string[];
  instruction?: string;
  instructions: string[]; // Lista de instruções do bloco
  isAutoGenTitle?: boolean; // True se título foi gerado automaticamente como "BLOCO X"
  rawLines: string[]; // Texto bruto original do coach (todas as linhas que entraram neste bloco)
}

export interface ParsedDay {
  day: DayOfWeek | null; // Pode ser null se não identificado
  blocks: ParsedBlock[];
  alerts: string[]; // Alertas no nível do dia
  isRestDay?: boolean; // MVP0: Dia de descanso não exige WOD Principal (APENAS via toggle do coach)
  restSuggestion?: boolean; // MVP0: Sugestão de descanso (não aplicada automaticamente)
  restSuggestionReason?: string; // MVP0: Motivo da sugestão
}

// MVP0: Issue de estrutura com severidade (para validação pós-parse)
export type IssueSeverity = 'ERROR' | 'WARNING';

export interface StructureIssue {
  dayIndex?: number;
  blockIndex?: number;
  blockTitle?: string; // Título do bloco (para exibição no erro)
  lineIndex?: number; // Índice da linha dentro do bloco (para highlight)
  lineNumber?: number; // Número da linha no texto original (para exibição)
  lineText?: string; // Texto da linha problemática (para exibição)
  message: string;
  severity: IssueSeverity;
  // NOTA: sampleFix removido — ensino centralizado no "Modelo Recomendado"
}

// ════════════════════════════════════════════════════════════════════════════
// TypoWarning: Aviso de possível erro de digitação em título de bloco
// ════════════════════════════════════════════════════════════════════════════
export interface TypoWarning {
  line: string;         // Texto original digitado
  suggestion: string;   // Sugestão de correção
  lineNumber: number;   // Número da linha no texto original
}

export interface ParseResult {
  success: boolean;
  days: ParsedDay[];
  errors: string[];
  warnings: string[];
  alerts: string[]; // Alertas globais
  needsDaySelection?: boolean; // Indica se precisa selecionar dia manualmente
  hasDayAnchors?: boolean; // MVP0: Indica se o texto tem âncoras de dia (SEGUNDA, TERÇA, etc.)
  structureWarnings?: string[]; // MVP0: Avisos de estrutura inválida (mistura TREINO + COMENTÁRIO)
  structureIssues?: StructureIssue[]; // MVP0: Issues de estrutura com severidade (ERROR bloqueia importação)
  typoWarnings?: TypoWarning[]; // Avisos de possíveis erros de digitação em títulos
}

// ============================================
// VALIDAÇÃO DE DIAS DA SEMANA — MVP0
// ============================================
// O PACER só pode rodar se o texto tiver dias da semana explícitos
// OU se o dia veio via UI (importação por dia)

const DAY_ANCHOR_PATTERNS = [
  /\bsegunda(?:-feira)?\b/i,
  /\bter[çc]a(?:-feira)?\b/i,
  /\bquarta(?:-feira)?\b/i,
  /\bquinta(?:-feira)?\b/i,
  /\bsexta(?:-feira)?\b/i,
  /\bs[aá]bado\b/i,
  /\bdomingo\b/i,
  /\b(?:###?\s*)?seg\b/i,
  /\b(?:###?\s*)?ter\b/i,
  /\b(?:###?\s*)?qua\b/i,
  /\b(?:###?\s*)?qui\b/i,
  /\b(?:###?\s*)?sex\b/i,
  /\b(?:###?\s*)?sab\b/i,
  /\b(?:###?\s*)?dom\b/i,
];

/**
 * MVP0: Valida se o texto tem âncoras de dia da semana
 * REGRA: O PACER nunca pode rodar em texto sem dias explícitos
 * 
 * @returns { hasDays: boolean, daysFound: string[] }
 */
export function validateDayAnchors(text: string): { hasDays: boolean; daysFound: string[] } {
  const daysFound: string[] = [];
  const normalizedText = text.toLowerCase();
  
  const dayNames = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  
  for (let i = 0; i < DAY_ANCHOR_PATTERNS.length; i++) {
    const pattern = DAY_ANCHOR_PATTERNS[i];
    if (pattern.test(normalizedText)) {
      // Mapear para nome legível
      const dayIndex = i % 7;
      const dayName = dayNames[dayIndex];
      if (!daysFound.includes(dayName)) {
        daysFound.push(dayName);
      }
    }
  }
  
  return {
    hasDays: daysFound.length > 0,
    daysFound,
  };
}

// ============================================
// MAPEAMENTOS
// ============================================

const DAY_MAP: Record<string, DayOfWeek> = {
  'segunda': 'seg',
  'segunda-feira': 'seg',
  'seg': 'seg',
  'monday': 'seg',
  'mon': 'seg',
  'terça': 'ter',
  'terca': 'ter',
  'terça-feira': 'ter',
  'ter': 'ter',
  'tuesday': 'ter',
  'tue': 'ter',
  'quarta': 'qua',
  'quarta-feira': 'qua',
  'qua': 'qua',
  'wednesday': 'qua',
  'wed': 'qua',
  'quinta': 'qui',
  'quinta-feira': 'qui',
  'qui': 'qui',
  'thursday': 'qui',
  'thu': 'qui',
  'sexta': 'sex',
  'sexta-feira': 'sex',
  'sex': 'sex',
  'friday': 'sex',
  'fri': 'sex',
  'sábado': 'sab',
  'sabado': 'sab',
  'sab': 'sab',
  'saturday': 'sab',
  'sat': 'sab',
  'domingo': 'dom',
  'dom': 'dom',
  'sunday': 'dom',
  'sun': 'dom',
};

// ============================================
// MVP0 PATCH: DETECÇÃO CIRÚRGICA DE NARRATIVA
// ============================================
// SÓ BLOQUEAR quando uma mesma linha tem:
// 1) Estímulo mensurável (tempo, distância, reps)
// 2) Linguagem explicativa/narrativa (vírgula + explicação, "objetivo", "foco", "para")
// 
// NÃO BLOQUEAR linhas como:
// - "500m trote leve" (adjetivo simples, sem narrativa)
// - "Corrida contínua 45 minutos Zona 2" (estímulo puro)
// - "Ritmo confortável" (descrição sem medida)
// ============================================

// ============================================
// MVP0: CONECTIVOS NARRATIVOS — GATILHOS REAIS DE BLOQUEIO
// ============================================
// SÓ bloquear quando a linha contém estes conectivos JUNTO com métrica.
// Adjetivos simples ("leve", "moderado", "forte") NÃO bloqueiam!
// ============================================
const NARRATIVE_CONNECTIVES = [
  'bem', 'para', 'pra', 'foco', 'objetivo', 'com objetivo', 'a fim de',
  'se', 'caso', 'apenas', 'só', 'confortável', 'tranquilo', 'recuperação',
  'soltar', 'porque', 'visando', 'priorizando', 'focando',
];

// Padrões que SEMPRE indicam narrativa explicativa (bloqueiam se tiverem medida)
const NARRATIVE_PATTERNS = [
  // Vírgula seguida de conectivo narrativo
  /,\s*(?:bem|muito|super|bastante|pra|para|visando|priorizando|focando|com\s+foco)/i,
  // Expressões de objetivo/intenção
  /\bobjetivo\s*[éeː:]/i,
  /\bfoco\s+(?:em|é|:)/i,
  /\ba\s+ideia\s+é\b/i,
  /\bvisando\b/i,
  /\bpriorizando\b/i,
  /\bpra\s+(?:soltar|recuperar|trabalhar|manter|melhorar|desenvolver)/i,
  /\bpara\s+(?:soltar|recuperar|trabalhar|manter|melhorar|desenvolver)/i,
  // Frases compostas com recomendação
  /\bsem\s+for[çc]ar\b/i,
  /\bapenas\s+para\b/i,
  /\bsó\s+para\b/i,
  /\bquer\s+dizer\b/i,
  // Expressões de sensação pós-vírgula
  /,\s*(?:confort[aá]vel|tranquil[oa]|suave|relaxad[oa])/i,
  // Conectivos narrativos após vírgula
  /,\s*(?:recuperação|pra\s+recuperar|para\s+recuperar|apenas|só)\b/i,
];

// Adjetivos SIMPLES — NÃO bloqueiam sozinhos!
// "500m trote leve" é VÁLIDO
// "Corrida leve até 45 min, bem confortável" é BLOQUEADO (por ter vírgula + narrativa)
const SIMPLE_ADJECTIVES_OK = [
  'leve', 'leves', 'moderada', 'moderado', 'pesada', 'pesado',
  'tranquilo', 'tranquila', 'suave', 'solto', 'solta',
  'firme', 'forte', 'easy', 'light', 'moderate', 'heavy',
];

// ============================================
// MVP0: isNarrativeLine — LINHA CONTÉM NARRATIVA EXPLICATIVA
// ============================================
// REGRA CIRÚRGICA: Só retorna TRUE se a linha tem padrão de narrativa.
// Adjetivos simples ("leve", "tranquilo") NÃO são narrativa.
// ============================================
function isNarrativeLine(line: string): boolean {
  const cachedResult = _narrativeCache.get(line);
  if (cachedResult !== undefined) return cachedResult;
  const lower = line.toLowerCase();
  
  // Verificar padrões de narrativa explicativa
  for (const pattern of NARRATIVE_PATTERNS) {
    if (pattern.test(lower)) {
      _log('[isNarrativeLine] → TRUE (narrativa detectada):', line);
      _narrativeCache.set(line, true);
      return true;
    }
  }
  
  _narrativeCache.set(line, false);
  return false;
}

// ============================================
// MVP0: isSubjectiveLine — APENAS para compatibilidade
// ============================================
// AGORA: Só retorna TRUE se for narrativa explicativa
// NÃO bloqueia adjetivos simples isolados
// ============================================
function isSubjectiveLine(line: string): boolean {
  return isNarrativeLine(line);
}

// ============================================
// MVP0: hasMeasurableStimulus — LINHA TEM ESTÍMULO MENSURÁVEL
// ============================================
// REGRA: Só retorna TRUE se a linha contém:
// - Distância (km, m)
// - Tempo (min, ', '')
// - Reps/Rounds/Sets
// - Carga (%, kg, lb)
// - Intensidade (PSE, Zona, Pace)
// SEM texto subjetivo misturado
// ============================================
export function hasMeasurableStimulus(line: string): boolean {
  const cachedResult = _measurableCache.get(line);
  if (cachedResult !== undefined) return cachedResult;
  
  // Tempo: min, ', ''
  if (/\d+\s*(?:min|minutos?|minutes?|'(?!')|'')\b/i.test(line)) { _measurableCache.set(line, true); return true; }
  
  // Distância: km, m
  if (/\d+\s*(?:km|m)\b/i.test(line)) { _measurableCache.set(line, true); return true; }
  
  // Reps/Rounds/Sets
  if (/\d+\s*(?:reps?|rounds?|rodadas?|sets?|séries?)\b/i.test(line)) { _measurableCache.set(line, true); return true; }
  
  // Formatos conhecidos
  if (/\b(?:emom|amrap|for\s*time|tabata|rft)\b/i.test(line)) { _measurableCache.set(line, true); return true; }
  
  // Padrão sets x reps
  if (/\d+\s*x\s*\d+/i.test(line)) { _measurableCache.set(line, true); return true; }
  
  // Carga: %, kg, lb
  if (/\d+\s*(?:%|kg|lb)\b/i.test(line)) { _measurableCache.set(line, true); return true; }
  
  // Intensidade: PSE, RPE, Zona, Z1-Z5
  if (/\b(?:pse|rpe)\s*[:=]?\s*\d/i.test(line)) { _measurableCache.set(line, true); return true; }
  if (/\b(?:zona|zone|z)\s*\d/i.test(line)) { _measurableCache.set(line, true); return true; }
  
  // Pace: 5:00/km
  if (/\d+:\d{2}\s*\/?\s*km/i.test(line)) { _measurableCache.set(line, true); return true; }
  
  // Calorias
  if (/\d+\s*(?:cal|calorias?)\b/i.test(line)) { _measurableCache.set(line, true); return true; }
  
  _measurableCache.set(line, false);
  return false;
}

// ============================================
// MVP0: isPureExerciseLine — LINHA É EXERCÍCIO PURO (SEM NARRATIVA)
// ============================================
// REGRA CIRÚRGICA: Linha só é bloqueada se:
// 1) Tem estímulo mensurável
// 2) E TEM narrativa explicativa (vírgula + explicação, "objetivo", "foco em", etc.)
// 
// PERMITIDO:
// - "500m trote leve" → é exercício puro (adjetivo simples OK)
// - "Corrida contínua 45 minutos Zona 2" → é exercício puro
// 
// BLOQUEADO:
// - "Corrida leve até 45 min, bem confortável" → mistura medida + narrativa
// ============================================
function isPureExerciseLine(line: string): boolean {
  const hasMeasurable = hasMeasurableStimulus(line);
  const hasNarrative = isNarrativeLine(line);
  
  // Se tem medida MAS também tem narrativa → NÃO é exercício puro
  // Isso vai forçar a separação TREINO + COMENTÁRIO
  if (hasMeasurable && hasNarrative) {
    _log('[isPureExerciseLine] → FALSE (mistura medida + narrativa):', line);
    return false;
  }
  
  // Se tem medida SEM narrativa → é exercício puro
  // Adjetivos simples como "leve", "tranquilo" são OK!
  if (hasMeasurable) {
    return true;
  }
  
  return false;
}

// ============================================
// REGRA MESTRA: isTrainingStimulus — ESTÍMULO = TREINO
// ============================================
// Se existe estímulo mensurável, é TREINO. PONTO FINAL.
// MVP0 PATCH CIRÚRGICO: Só bloqueia se tiver narrativa explicativa!
// Adjetivos simples como "leve", "tranquilo" são OK.

function isTrainingStimulus(line: string): boolean {
  const cachedResult = _trainingCache.get(line);
  if (cachedResult !== undefined) return cachedResult;
  
  // MVP0 CIRÚRGICO: Só bloqueia se tiver narrativa explicativa
  // Adjetivos simples são OK!
  if (isNarrativeLine(line)) {
    _log('[isTrainingStimulus] → FALSE (linha com narrativa):', line);
    _trainingCache.set(line, false);
    return false;
  }
  
  // ⏱️ TEMPO: min, minutes, ', minutos, até X minutos
  if (/\d+\s*(?:min|minutos?|minutes?|')\b/i.test(line)) { _trainingCache.set(line, true); return true; }
  if (/até\s*\d+\s*(?:min|minutos?)/i.test(line)) { _trainingCache.set(line, true); return true; }
  
  // 📏 DISTÂNCIA: m, km, metros
  if (/\d+\s*(?:m|km|metros?)\b/i.test(line)) { _trainingCache.set(line, true); return true; }
  
  // 🔁 REPETIÇÃO / VOLUME: reps, rounds, EMOM, AMRAP, For Time
  if (/\d+\s*(?:reps?|rounds?|rodadas?)\b/i.test(line)) { _trainingCache.set(line, true); return true; }
  if (/\b(?:emom|amrap|for\s*time|tabata)\b/i.test(line)) { _trainingCache.set(line, true); return true; }
  
  // ❤️ ZONA / ESFORÇO: Zona, FC, PSE, RPE
  if (/\b(?:zona|zone)\s*\d/i.test(line)) { _trainingCache.set(line, true); return true; }
  if (/\b(?:fc|hr)\s*[:=]?\s*\d/i.test(line)) { _trainingCache.set(line, true); return true; }
  if (/\b(?:pse|rpe)\s*[:=]?\s*\d/i.test(line)) { _trainingCache.set(line, true); return true; }
  
  // Faixa de valores (30-40, 30–40)
  if (/\d+\s*[-–]\s*\d+\s*(?:min|'|m|km)/i.test(line)) { _trainingCache.set(line, true); return true; }
  
  _trainingCache.set(line, false);
  return false;
}

// ============================================
// MVP0: DETECÇÃO DE INTENSIDADE NO TREINO
// ============================================
// REGRA CRÍTICA: Intensidade só é válida se estiver na linha de TREINO.
// Intensidade em COMENTÁRIO é ignorada pelo motor.
// ============================================

/**
 * Detecta se a linha contém parâmetro de intensidade objetivo
 * (PSE/RPE, Zona, Pace, FC alvo)
 * 
 * IMPORTANTE: Esta função só deve ser usada em linhas de TREINO,
 * nunca em linhas de COMENTÁRIO!
 */
export function hasIntensityParameter(line: string): boolean {
  if (!line) return false;
  const lower = line.toLowerCase();
  
  // PSE/RPE: "PSE 5", "RPE 7", "pse:6", "rpe = 8"
  if (/\b(?:pse|rpe)\s*[:=]?\s*\d/i.test(lower)) return true;
  
  // Zona: "Zona 2", "Z2", "zone 3", "z4"
  if (/\b(?:zona|zone|z)\s*\d/i.test(lower)) return true;
  
  // FC alvo: "FC 150", "HR 140", "fc:160", "hr = 135"
  if (/\b(?:fc|hr)\s*[:=]?\s*\d{2,3}/i.test(lower)) return true;
  
  // Pace: "5:00/km", "pace 5'30", "6min/km", "4:45 pace"
  if (/\d+:\d{2}\s*\/?\s*km/i.test(lower)) return true;
  if (/\bpace\s*\d/i.test(lower)) return true;
  if (/\d+\s*['′]?\d*\s*\/\s*km/i.test(lower)) return true;
  
  // % do max (ex: "70% FCmax", "80% do máximo")
  if (/\d+\s*%\s*(?:fc|hr|max|m[aá]x)/i.test(lower)) return true;
  
  return false;
}

/**
 * Extrai a duração em minutos de uma linha de treino
 * Retorna null se não conseguir extrair
 */
export function extractDurationMinutes(line: string): number | null {
  if (!line) return null;
  
  // Padrão: "60 min", "90 minutos", "45'"
  const minMatch = line.match(/(\d+)\s*(?:min|minutos?|minutes?|'(?!'))\b/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }
  
  // Padrão: "1h", "1h30", "1:30h", "2 horas"
  const hourMatch = line.match(/(\d+)\s*(?:h|hora|horas|hours?)\s*(\d{1,2})?/i);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    const mins = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
    return hours * 60 + mins;
  }
  
  // Padrão: "1:30" (hora:minuto) - apenas se >= 1 hora
  const timeMatch = line.match(/\b(\d+):(\d{2})\b/);
  if (timeMatch) {
    const first = parseInt(timeMatch[1], 10);
    const second = parseInt(timeMatch[2], 10);
    // Só interpreta como hora:minuto se o primeiro for <= 3 (1-3 horas)
    if (first >= 1 && first <= 3 && second <= 59) {
      return first * 60 + second;
    }
  }
  
  return null;
}

/**
 * Detecta se o bloco é de cardio/corrida (modalidade que requer intensidade)
 */
export function isCardioBlock(blockType: string, blockTitle: string, blockContent: string): boolean {
  // Tipo explícito de corrida
  if (blockType === 'corrida') return true;
  
  const combined = `${blockTitle} ${blockContent}`.toLowerCase();
  
  // Palavras-chave de cardio
  const cardioKeywords = [
    'corrida', 'run', 'running', 'trote', 'caminhada', 'walk',
    'bike', 'airbike', 'assault', 'ciclismo', 'cycling', 'bicicleta',
    'remo', 'row', 'rowing', 'ski', 'erg',
    'swim', 'swimming', 'natação', 'nado',
    'cardio', 'aeróbico', 'aerobico',
  ];
  
  return cardioKeywords.some(kw => combined.includes(kw));
}

// ============================================
// HEURÍSTICA: isPrescriptionLine — PRESCRIÇÃO MENSURÁVEL
// ============================================
// Para dias de descanso: detecta se a linha é prescrição de treino
// REGRA: Tempo ou distância SOZINHOS já caracterizam treino!
// "45 min" ou "10km" são VÁLIDOS mesmo sem atividade explícita
// MVP0 CIRÚRGICO: Só bloqueia se tiver narrativa explicativa!

function isPrescriptionLine(line: string): boolean {
  const cachedResult = _prescriptionCache.get(line);
  if (cachedResult !== undefined) return cachedResult;
  
  // MVP0 CIRÚRGICO: Só bloqueia narrativa explicativa
  // Adjetivos simples são OK!
  if (isNarrativeLine(line)) {
    _log('[isPrescriptionLine] → FALSE (linha com narrativa):', line);
    _prescriptionCache.set(line, false);
    return false;
  }
  
  // a) Verificar medida mensurável (SUFICIENTE POR SI SÓ)
  const hasMeasurableTime = /(?:^|[^\d])(\d{1,3})\s*(?:min|minutos?|'|h|hora|horas)\b/i.test(line) ||
                            /até\s*\d+\s*(?:min|minutos?)/i.test(line) ||
                            /\d+\+?\s*(?:min|minutos)/i.test(line);
  const hasMeasurableDistance = /\d+\s*(?:m|km)\b/i.test(line);
  
  // REGRA CRÍTICA: Tempo ou distância SOZINHOS já caracterizam treino
  // "45 min" = treino válido, "10km" = treino válido
  if (hasMeasurableTime || hasMeasurableDistance) {
    _prescriptionCache.set(line, true);
    return true;
  }
  
  _prescriptionCache.set(line, false);
  return false;
}

// ============================================
// INFERIR TIPO DE PRESCRIÇÃO POR LINHA
// ============================================
function inferPrescriptionType(line: string): WorkoutBlock['type'] {
  if (/\b(?:corrida|trote|run|running|km|pace)\b/i.test(line)) return 'corrida';
  if (/\b(?:bike|airbike|assault|ciclismo|cycling)\b/i.test(line)) return 'corrida';
  if (/\b(?:remo|row|rowing|ski|erg)\b/i.test(line)) return 'corrida';
  if (/\b(?:caminhada|walk)\b/i.test(line)) return 'corrida';
  if (/\b(?:swimming|natação|swim)\b/i.test(line)) return 'corrida';
  
  // Se tem tempo/distância mas sem atividade explícita, assume cardio/conditioning
  return 'conditioning';
}

// ============================================
// INFERÊNCIA DE TIPO — TÍTULO PRIMEIRO, DEPOIS CONTEÚDO
// ============================================

// Mapeamento determinístico de tipo pelo TÍTULO (case-insensitive, match simples)
// ORDEM IMPORTA: padrões mais específicos primeiro
const TYPE_PATTERNS: { pattern: RegExp; type: WorkoutBlock['type'] }[] = [
  // Aquecimento
  { pattern: /aquec/i, type: 'aquecimento' },
  { pattern: /warm[- ]?up/i, type: 'aquecimento' },
  { pattern: /🔥/i, type: 'aquecimento' },
  
  // Força (inclui Grip)
  { pattern: /for[cç]a/i, type: 'forca' },
  { pattern: /strength/i, type: 'forca' },
  { pattern: /grip/i, type: 'forca' },
  { pattern: /💪/i, type: 'forca' },
  
  // Específico (Hyrox, etc)
  { pattern: /espec[ií]fico/i, type: 'especifico' },
  { pattern: /specific/i, type: 'especifico' },
  { pattern: /hyrox/i, type: 'especifico' },
  { pattern: /🛷/i, type: 'especifico' },
  
  // Core
  { pattern: /core/i, type: 'core' },
  { pattern: /abdominal/i, type: 'core' },
  { pattern: /🎯/i, type: 'core' },
  
  // Corrida/Cardio
  { pattern: /corrida/i, type: 'corrida' },
  { pattern: /running/i, type: 'corrida' },
  { pattern: /\brun\b/i, type: 'corrida' },
  { pattern: /bike/i, type: 'corrida' },
  { pattern: /airbike/i, type: 'corrida' },
  { pattern: /ciclismo/i, type: 'corrida' },
  { pattern: /cycling/i, type: 'corrida' },
  { pattern: /remo/i, type: 'corrida' },
  { pattern: /row/i, type: 'corrida' },
  { pattern: /ski/i, type: 'corrida' },
  { pattern: /🏃/i, type: 'corrida' },
  
  // Descanso técnico → Aquecimento
  { pattern: /descanso/i, type: 'aquecimento' },
  { pattern: /\brest\b/i, type: 'aquecimento' },
  { pattern: /recovery/i, type: 'aquecimento' },
  
  // Conditioning (WOD, AMRAP, etc) - por último como fallback
  { pattern: /conditioning/i, type: 'conditioning' },
  { pattern: /condicionamento/i, type: 'conditioning' },
  { pattern: /metcon/i, type: 'conditioning' },
  { pattern: /\bwod\b/i, type: 'conditioning' },
  { pattern: /amrap/i, type: 'conditioning' },
  { pattern: /for\s*time/i, type: 'conditioning' },
  { pattern: /emom/i, type: 'conditioning' },
  { pattern: /⚡/i, type: 'conditioning' },
];

// Mapeamento de tipo por CONTEÚDO (usado se título não definir tipo)
const CONTENT_TYPE_PATTERNS: { pattern: RegExp; type: WorkoutBlock['type'] }[] = [
  { pattern: /\b(?:corrida|run|running|km|pace)\b/i, type: 'corrida' },
  { pattern: /\b(?:bike|airbike|assault)\b/i, type: 'corrida' },
  { pattern: /\b(?:remo|row|rowing|ski|erg)\b/i, type: 'corrida' },
  { pattern: /\b(?:sled|sandbag|wall\s*ball|farmer|carry|lunges?)\b/i, type: 'especifico' },
  { pattern: /\b(?:core|plank|toes?\s*to\s*bar|sit[- ]?up|hollow)\b/i, type: 'core' },
  { pattern: /\b(?:squat|deadlift|press|clean|snatch|jerk)\b/i, type: 'forca' },
];

// ============================================
// VALIDAÇÃO DE TÍTULO MVP0
// ============================================
// A 1ª linha do bloco vira title APENAS SE não for:
// - Categoria isolada (Aquecimento, Força, Metcon, etc.)
// - Formato (AMRAP, EMOM, For Time, Rounds, Intervalos)
// - Começa com número/unidade (5 Rounds, 10km, 500m, Min 1:)

// MVP0 FIX: CATEGORY_ONLY_PATTERNS NÃO deve incluir headings válidos!
// "Aquecimento", "Força", etc. SÃO títulos válidos, não "categoria isolada".
// Esta lista é para detectar quando o coach digitou APENAS a categoria sem título real.
// Exemplo: título "EMOM" sozinho não é título válido, mas "Aquecimento" É título válido.
const CATEGORY_ONLY_PATTERNS: RegExp[] = [
  // REMOVIDO: Headings válidos que são títulos legítimos
  // /^aquecimento$/i,  // ← REMOVIDO - é título válido
  // /^for[çc]a$/i,     // ← REMOVIDO - é título válido
  // /^metcon$/i,       // ← REMOVIDO - é título válido
  // /^espec[ií]fico$/i,// ← REMOVIDO - é título válido
  // /^corrida$/i,      // ← REMOVIDO - é título válido
  // /^acess[óo]rio$/i, // ← REMOVIDO - é título válido
  // /^condicionamento$/i, // ← REMOVIDO - é título válido
  // /^core$/i,         // ← REMOVIDO - é título válido
  // /^mobilidade$/i,   // ← REMOVIDO - é título válido
  // /^wod$/i,          // ← REMOVIDO - é título válido
  // Lista vazia - nenhum heading deve ser tratado como "categoria isolada"
];

const FORMAT_ONLY_PATTERNS = [
  /^amrap$/i,
  /^emom$/i,
  /^for\s+time$/i,
  /^rounds?$/i,
  /^intervalos?$/i,
  /^tabata$/i,
  /^e\d+m(om)?$/i,  // E2MOM, E3M, etc.
];

const STARTS_WITH_NUMBER_UNIT = /^\d+\s*(rounds?|km|m|min|x|reps?|cal|calorias?)\b/i;
const MIN_PATTERN = /^min\s*\d+/i;  // Min 1:, Min 2:, etc.

function isLineACategoryOrFormat(line: string): boolean {
  const trimmed = line.trim();
  
  // Verifica se é categoria isolada
  for (const pattern of CATEGORY_ONLY_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  
  // Verifica se é formato isolado
  for (const pattern of FORMAT_ONLY_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  
  // Verifica se começa com número + unidade
  if (STARTS_WITH_NUMBER_UNIT.test(trimmed)) return true;
  
  // Verifica padrão "Min X:"
  if (MIN_PATTERN.test(trimmed)) return true;
  
  return false;
}

// Função para limpar título removendo prefixos técnicos
// REGRA: Nunca substituir nome do coach por rótulos sistêmicos
// REGRA MVP0: Retornar string VAZIA se não houver título real (fallback só na UI)
function cleanBlockTitle(title: string): string {
  // Se for categoria/formato isolado, NÃO é título → retorna vazio
  if (isLineACategoryOrFormat(title)) {
    return '';
  }
  
  // Remove prefixo "TREINO" ou "TREINO -"
  let cleaned = title.replace(/^TREINO\s*[-–—:]?\s*/i, '').trim();
  // Remove "WOD" ou "METCON" se seguido de outro texto (mantém se for o único)
  if (/^(WOD|METCON)\s*[-–—:]?\s*.{3,}/i.test(cleaned)) {
    cleaned = cleaned.replace(/^(WOD|METCON)\s*[-–—:]?\s*/i, '').trim();
  }
  
  // Após limpeza, verificar novamente se virou categoria/formato
  if (isLineACategoryOrFormat(cleaned)) {
    return '';
  }
  
  // REGRA MVP0: Se não há título válido, retorna VAZIO (fallback só na UI)
  // NUNCA retornar "Bloco X" aqui - isso é dado, não display
  if (!cleaned || cleaned.length < 2) {
    return '';
  }
  return cleaned;
}

// ============================================
// DERIVAR TÍTULO DO BLOCO (OPÇÃO A)
// ============================================
// derivedTitle = primeira linha não vazia do conteúdo textual do bloco
// NÃO criar campo novo - calculado em runtime para exibição e validação

export function getDerivedTitle(block: ParsedBlock): string {
  // 1. Se block.title existe e está preenchido (não é fallback), usar
  // MVP0: Ignorar títulos auto-gerados "Bloco X" / "BLOCO X" no dado
  if (block.title && 
      block.title.trim().length > 0 && 
      !/^Bloco \d+$/i.test(block.title) &&
      !/^BLOCO \d+$/i.test(block.title)) {
    return block.title.trim();
  }
  
  // 2. Senão, derivar da primeira linha não vazia do conteúdo
  // Prioridade: instruction > instructions[0] > items[0].movement
  if (block.instruction && block.instruction.trim().length > 0) {
    return block.instruction.trim();
  }
  
  if (block.instructions && block.instructions.length > 0) {
    const firstInstruction = block.instructions[0]?.trim();
    if (firstInstruction && firstInstruction.length > 0) {
      return firstInstruction;
    }
  }
  
  // 3. Se ainda não tem, está vazio
  return '';
}

// ============================================
// VALIDAÇÃO DE TÍTULO — REGRA ANTI-BURRO (CORRIGIDA)
// ============================================
// Um bloco só é "sem título" se:
//   - não existir block.title E derivedTitle estiver vazio
//
// Um bloco tem "título inválido por parecer exercício" se:
//   - derivedTitle (ou block.title) contiver sinais claros de prescrição

// Verifica se a linha parece prescrição/exercício (inválida para título)
// REGRA CORRIGIDA: Só rejeita se a linha CLARAMENTE for uma prescrição de exercício
// Títulos humanos livres como "Grip & Strength", "Conditioning — For Time" são VÁLIDOS
export function looksLikePrescription(line: string): boolean {
  if (!line || line.trim().length === 0) return false;
  
  const trimmed = line.trim();
  
  // 1. Começa com marcador de lista: -, •, 1), 1.
  // EXCEÇÃO: "— " (travessão) é separador válido em títulos como "Conditioning — For Time"
  if (/^[-•]\s/.test(trimmed)) return true; // Hífen seguido de espaço = lista
  if (/^\d+[).]\s/.test(trimmed)) return true; // "1) " ou "1. " = lista
  
  // 2. Linha que COMEÇA com número seguido de unidade/exercício = prescrição clara
  // Ex: "10km", "3x10 Pull-ups"
  // EXCEÇÃO: "15' AMRAP", "10' EMOM", "20' Tabata" = títulos válidos de bloco
  if (/^\d+/.test(trimmed)) {
    if (/^\d+\s*['\u2018\u2019\u0027\u2032"]\s*(AMRAP|EMOM|E\d+MOM|TABATA|FOR\s*TIME|RFT)\b/i.test(trimmed)) return false;
    if (/^\d+\s*Rounds?\s*(For\s*Time|AMRAP)?\s*$/i.test(trimmed)) return false; // "5 Rounds" is a format line, not prescription
    return true;
  }
  
  // 3. Padrões de FORMAT LINE - são CONTEÚDO de bloco, não títulos
  // Ex: "EMOM 30'", "AMRAP 15", "For Time", "E2MOM 12", "Every 2 min"
  // Mas "Conditioning — For Time" ou "Specific — AMRAP" são VÁLIDOS (contêm mais contexto antes)
  if (isFormatLine(trimmed)) return true;
  
  // 4. Contém unidades de medida que indicam prescrição clara
  // kg, lb, cal com números próximos
  if (/\d+\s*(kg|lb|cal)\b/i.test(trimmed)) return true;
  
  // 5. Padrão "Min X:" que indica EMOM
  if (/^min\s*\d+\s*:/i.test(trimmed)) return true;
  
  // TUDO MAIS É VÁLIDO como título humano
  // Ex: "Grip & Strength", "Força Específica", "Conditioning — For Time"
  return false;
}

// ============================================
// FORMAT LINE - Linhas de formato (EMOM, AMRAP, etc.)
// ============================================
// Essas linhas NUNCA abrem um novo bloco - são CONTEÚDO do bloco
// Se aparecerem como primeira linha, o bloco recebe título genérico "BLOCO {n}"

export function isFormatLine(line: string): boolean {
  if (!line || line.trim().length === 0) return false;
  
  const trimmed = line.trim();
  
  // Padrões de formato que NÃO são títulos de bloco:
  // EMOM, E2MOM, E3MOM (E\d+MOM), AMRAP, For Time, Tabata, Every X min
  const formatPatterns = [
    /^emom\b/i,                      // EMOM, EMOM 30'
    /^e\d+mom\b/i,                   // E2MOM, E3MOM, etc.
    /^amrap\b/i,                     // AMRAP, AMRAP 15
    /^for\s*time\b/i,                // For Time
    /^tabata\b/i,                    // Tabata
    /^every\s+\d+/i,                 // Every 2 min, Every 90 sec
    /^rft\b/i,                       // RFT (Rounds For Time)
    /^\d+\s*rounds?\b/i,             // 3 Rounds, 5 rounds
    /^\*\*.*\*\*$/,                  // **estruturas** entre asteriscos duplos
  ];
  
  return formatPatterns.some(pattern => pattern.test(trimmed));
}

// Extrai o formato limpo de uma linha de formato
export function extractFormatFromLine(line: string): string {
  if (!line) return '';
  return line.trim();
}

// Retorna true se o bloco tem problema de título
// - Sem título: derivedTitle vazio
// - Título inválido: derivedTitle parece prescrição
export function isInvalidBlockTitle(title: string, block?: ParsedBlock): boolean {
  // Se recebeu o bloco, usar derivedTitle
  if (block) {
    const derived = getDerivedTitle(block);
    
    // Sem título = derivedTitle vazio
    if (!derived || derived.length === 0) return true;
    
    // Título inválido = parece prescrição
    return looksLikePrescription(derived);
  }
  
  // Fallback: validar o título diretamente (para compatibilidade)
  if (!title || title.trim().length === 0) return true;
  // MVP0: "Bloco X" no dado é inválido (deve estar vazio, não preenchido com fallback)
  if (/^Bloco \d+$/i.test(title) || /^BLOCO \d+$/i.test(title)) return true;
  
  return looksLikePrescription(title);
}

// Retorna a razão legível do erro (para exibição)
export function getBlockTitleError(title: string, block?: ParsedBlock): string | null {
  // Se recebeu o bloco, usar derivedTitle
  const derived = block ? getDerivedTitle(block) : title?.trim();
  
  // Sem título
  if (!derived || derived.length === 0) {
    return 'O bloco precisa começar com o tipo de treino.\nEx: Aquecimento, Força, Condicionamento.';
  }
  
  // Título inválido (parece prescrição)
  if (looksLikePrescription(derived)) {
    return 'Ajuste o título do bloco (parece exercício).\nEx: Aquecimento, Força, Condicionamento.';
  }
  
  return null;
}

// Retorna o título para exibição (display)
// MVP0: Usa derivedTitle se válido, senão fallback "Bloco X"
export function getDisplayTitle(block: ParsedBlock, blockIndex: number): string {
  const derived = getDerivedTitle(block);
  
  // Se tem título derivado válido (não auto-gerado), usar
  if (derived && derived.length > 0) {
    // Verificar se não é auto-gerado
    const isAutoGen = /^Bloco \d+$/i.test(derived) || 
                      /^BLOCO \d+$/i.test(derived) ||
                      derived.toLowerCase() === 'treino' ||
                      derived.toLowerCase() === 'novo bloco';
    
    if (!isAutoGen) {
      return derived;
    }
  }
  
  // Se block.title existe mas é auto-gerado, ainda assim verificar outros campos
  // (para compatibilidade futura com block.name, block.headerTitle, etc.)
  
  // Fallback neutro sequencial
  return `Bloco ${blockIndex + 1}`;
}

// ============================================
// CLASSIFICAÇÃO DE LINHAS: EXERCISE vs COMMENT
// ============================================
// Lista de movimentos conhecidos para classificação
const KNOWN_MOVEMENTS = [
  'squat', 'lunge', 'burpee', 'pull-up', 'pullup', 'push-up', 'pushup',
  'row', 'bike', 'ski', 'wall ball', 'wallball', 'deadlift', 'clean',
  'snatch', 'jerk', 'press', 'thruster', 'box jump', 'jump', 'run',
  'sprint', 'sled', 'sandbag', 'farmer', 'carry', 'swing', 'kettlebell',
  'dumbbell', 'barbell', 'toes to bar', 'ttb', 'sit-up', 'situp',
  'plank', 'hollow', 'superman', 'pistol', 'step-up', 'stepup',
  'double under', 'du', 'single under', 'rope', 'muscle-up', 'muscleup',
  'handstand', 'hspu', 'dip', 'ring', 'rig', 'v-up', 'airbike',
  'assault', 'echo', 'concept', 'skierg', 'rower', 'cal row', 'cal bike'
];

// Padrões de início de comentário
const COMMENT_STARTERS = [
  /^descansar?\b/i,
  /^observa[çc][ãa]o\b/i,
  /^nota\b/i,
  /^cuidado\b/i,
  /^foco\b/i,
  /^objetivo\b/i,
  /^aten[çc][ãa]o\b/i,
  /^dica\b/i,
  /^lembre/i,
  /^📝/,
  /^💡/,
  /^⚠️/,
];

// Modalidades conhecidas para classificação de linha com duração
const MODALITY_KEYWORDS = [
  'corrida', 'bike', 'remo', 'ski', 'caminhada', 'cardio', 'erg',
  'run', 'running', 'row', 'rowing', 'walk', 'cycling', 'airbike',
  'assault', 'echo', 'concept', 'skierg', 'trote', 'swimming', 'natação'
];

// Categorias que indicam cardio/endurance (bloco pertence a essas = linha com duração é exercício)
const CARDIO_CATEGORIES = ['corrida', 'cardio', 'endurance', 'conditioning'];

// Classifica uma linha como exercise ou comment
// Opcionalmente recebe a categoria do bloco para regra de duração + categoria
// MVP0 PATCH: Linhas subjetivas são SEMPRE 'comment', NUNCA 'exercise'
export function classifyLine(line: string, blockCategory?: string): LineType {
  if (!line || line.trim().length === 0) return 'comment';
  
  const trimmed = line.trim();
  const lowerLine = trimmed.toLowerCase();
  
  // ═══════════════════════════════════════════════════════════════
  // MVP0 PATCH: VERIFICAR LINHA SUBJETIVA PRIMEIRO (PRIORIDADE 1)
  // ═══════════════════════════════════════════════════════════════
  // REGRA ANTI-BURRO: Se a linha contém texto subjetivo (adjetivos,
  // intenção, explicação), NÃO pode ser classificada como 'exercise'.
  // Deve ir para notas e NUNCA influenciar o motor.
  // ═══════════════════════════════════════════════════════════════
  if (isSubjectiveLine(trimmed)) {
    _log('[classifyLine] → comment (linha subjetiva):', trimmed);
    return 'comment';
  }
  
  // 1. Verificar padrões de comentário explícito
  if (COMMENT_STARTERS.some(pattern => pattern.test(trimmed))) {
    return 'comment';
  }
  
  // 2. REGRA: Duração + (Modalidade OU Categoria Cardio) = EXERCÍCIO
  // IMPORTANTE: Só chega aqui se NÃO for linha subjetiva!
  const hasDuration = /\d+\s*(?:min|minutos?|minutes?|'|'')\b/i.test(trimmed) ||
                      /até\s*\d+\s*(?:min|minutos?)/i.test(trimmed);
  
  if (hasDuration) {
    // Verificar se tem modalidade na linha
    const hasModality = MODALITY_KEYWORDS.some(mod => lowerLine.includes(mod));
    
    // Verificar se o bloco é de categoria cardio/endurance
    const blockIsCardio = blockCategory && 
      CARDIO_CATEGORIES.some(cat => blockCategory.toLowerCase().includes(cat));
    
    if (hasModality || blockIsCardio) {
      return 'exercise';
    }
  }
  
  // 3. Começa com número (incluindo intervalos 8-10, 8–10)
  if (/^\d+/.test(trimmed) || /^\d+\s*[-–]\s*\d+/.test(trimmed)) {
    return 'exercise';
  }
  
  // 4. Contém unidades/padrões de exercício
  const exercisePatterns = [
    /\breps?\b/i,
    /\bm\b/i, // metros
    /\bkm\b/i,
    /\bcal\b/i,
    /\bkg\b/i,
    /\blb\b/i,
    /\bmin\b/i,
    /\bsec\b/i,
    /\bseg\b/i,
    /[''"]/, // aspas de tempo
    /^min\s*\d+\s*:/i, // Min 1:, Min 2:
    /\brounds?\b/i,
    /\bsets?\b/i,
    /\bemom\b/i,
    /\be\d+mom\b/i,
    /\bamrap\b/i,
    /\bfor\s*time\b/i,
    /\btabata\b/i,
    /\brft\b/i,
  ];
  
  if (exercisePatterns.some(pattern => pattern.test(trimmed))) {
    return 'exercise';
  }
  
  // 5. Contém nome de movimento conhecido
  if (KNOWN_MOVEMENTS.some(movement => lowerLine.includes(movement))) {
    return 'exercise';
  }
  
  // 6. Se não caiu em nenhuma regra acima, é comentário
  return 'comment';
}

// ============================================
// MVP0: CLASSIFICAÇÃO DETERMINÍSTICA DE ITENS
// ============================================
// Classifica linha como EXERCISE / REST / NOTE com confidence
// Regras determinísticas sem IA

// Padrões de descanso/off
const REST_PATTERNS = [
  /\bdescanso\b/i,
  /\boff\b/i,
  /\brecovery\b/i,
  /\bfolga\b/i,
  /\bdia\s*(de\s*)?(descanso|livre|off)\b/i,
  /\bhoje\s+(é\s+)?descanso\b/i,
  /\brest\s*day\b/i,
];

// Padrões de exercício opcional
const OPTIONAL_PATTERNS = [
  /\bse\s+quiser\b/i,
  /\bcaso\s+queira\b/i,
  /\bopcional\b/i,
  /\bse\s+estiver\s+bem\b/i,
  /\bse\s+tiver\s+tempo\b/i,
  /\bse\s+conseguir\b/i,
  /\bapenas\s+se\b/i,
];

// Padrões HIGH confidence de exercício
const HIGH_CONFIDENCE_EXERCISE_PATTERNS = [
  // Tempo: 45 min, 30min, 10', mm:ss
  /\d+\s*(?:min|minutos?|minutes?|')\b/i,
  // Distância: 5km, 400m, 10 km
  /\d+\s*(?:km|m)\b/i,
  // Séries: 5x5, 4 rounds, 3 sets
  /\d+\s*x\s*\d+/i,
  /\d+\s*(?:rounds?|rodadas?|sets?)\b/i,
  // Formatos conhecidos
  /\b(?:emom|amrap|for\s*time|tabata|rft)\b/i,
  // Começa com número + movimento
  /^\d+\s+(?:burpees?|squats?|lunges?|pull-?ups?|push-?ups?|deadlifts?|cleans?|snatches?|jerks?)/i,
  // Tempo explícito mm:ss
  /\d{1,2}:\d{2}/,
];

// Padrões MEDIUM confidence de exercício
const MEDIUM_CONFIDENCE_EXERCISE_PATTERNS = [
  // Movimento + esforço: corrida PSE 6, bike RPE 7
  /\b(?:pse|rpe)\s*[:=]?\s*\d/i,
  // Zona de esforço
  /\b(?:zona|zone)\s*\d/i,
  // Frequência cardíaca
  /\b(?:fc|hr)\s*[:=]?\s*\d/i,
  // Palavras de exercício sem medida
  /\b(?:corrida|bike|remo|ski|caminhada|trote|run|row|swim)\b/i,
];

// Padrões de NOTE (comentário/observação)
const NOTE_PATTERNS = [
  /^descansar\s+o\s+necess[aá]rio\b/i,
  /\bobs(?:erva[çc][ãa]o)?\b/i,
  /\bnota\b/i,
  /\bcoment[aá]rio\b/i,
  /\bdica\b/i,
  /\baten[çc][ãa]o\b/i,
  /\bcuidado\b/i,
  /\bfoco\b/i,
  /\bobjetivo\b/i,
  /\blembre\b/i,
  /^📝/,
  /^💡/,
  /^⚠️/,
  /^ℹ️/,
];

/**
 * MVP0: Classifica uma linha com kind + confidence + flags
 * REGRAS DETERMINÍSTICAS (sem IA)
 * 
 * ═══════════════════════════════════════════════════════════════
 * PATCH MVP0: VALIDAÇÃO DE UNIDADES PROVÁVEIS
 * ═══════════════════════════════════════════════════════════════
 * PRINCÍPIO MESTRE:
 * - Toda linha com unidade reconhecida é EXERCISE válido
 * - Unidade NÃO define importância do exercício
 * - Unidade define apenas se o MOTOR pode inferir automaticamente
 * - Execução, histórico e visualização NUNCA são bloqueados
 * ═══════════════════════════════════════════════════════════════
 * 
 * Prioridade:
 * 1) UNIDADE RECONHECIDA → EXERCISE (SEMPRE, nunca NOTE)
 * 2) REST + OPTIONAL + exercício → EXERCISE OPTIONAL
 * 3) REST puro
 * 4) EXERCISE (com confidence)
 * 5) NOTE (fallback)
 */
export function classifyItemDeterministic(line: string): ClassifiedItem {
  if (!line || line.trim().length === 0) {
    return { kind: 'NOTE', confidence: 'LOW' };
  }
  
  const trimmed = line.trim();
  const lowerLine = trimmed.toLowerCase();
  
  // REGRA #: Linhas iniciadas com "#" são SEMPRE classificadas como NOTE
  if (trimmed.startsWith('#')) {
    _log('[CLASSIFY] NOTE (# prefix):', trimmed);
    return { kind: 'NOTE', confidence: 'HIGH' };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // MVP0 PATCH: VERIFICAR LINHA SUBJETIVA PRIMEIRO
  // ═══════════════════════════════════════════════════════════════
  // REGRA ANTI-BURRO: Se a linha contém texto subjetivo (adjetivos,
  // intenção, explicação), NÃO pode ser classificada como EXERCISE.
  // Deve ir para block.notes e NUNCA influenciar o motor.
  // ═══════════════════════════════════════════════════════════════
  if (isSubjectiveLine(trimmed)) {
    _log('[CLASSIFY] NOTE (linha subjetiva):', trimmed);
    return { kind: 'NOTE', confidence: 'HIGH' };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // MVP0 PATCH: VERIFICAR UNIDADE RECONHECIDA PRIMEIRO
  // ═══════════════════════════════════════════════════════════════
  // Se a linha tem QUALQUER unidade reconhecida, é EXERCISE válido
  // Confiança vem do detector de unidades
  // IMPORTANTE: Só chega aqui se NÃO for linha subjetiva!
  // ═══════════════════════════════════════════════════════════════
  const unitResult = detectUnits(trimmed);
  
  // Se tem unidade reconhecida → SEMPRE EXERCISE (nunca NOTE)
  if (unitResult.hasRecognizedUnit) {
    // Verificar se é opcional
    const isOptional = OPTIONAL_PATTERNS.some(p => p.test(lowerLine));
    
    _log('[CLASSIFY] EXERCISE (unit detected):', trimmed, '| confidence:', unitResult.confidence, '| units:', unitResult.rawMatches);
    
    return {
      kind: 'EXERCISE',
      confidence: unitResult.confidence,
      flags: isOptional ? { optional: true } : undefined,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // REGRAS ORIGINAIS (fallback quando não há unidade reconhecida)
  // ═══════════════════════════════════════════════════════════════
  
  // 1. Verificar se é REST (descanso/off/recovery/folga)
  const isRest = REST_PATTERNS.some(p => p.test(lowerLine));
  
  // 2. Verificar se tem padrão opcional
  const isOptional = OPTIONAL_PATTERNS.some(p => p.test(lowerLine));
  
  // 3. Verificar se tem padrão de exercício (HIGH ou MEDIUM) - patterns originais
  const isHighExercise = HIGH_CONFIDENCE_EXERCISE_PATTERNS.some(p => p.test(trimmed));
  const isMediumExercise = MEDIUM_CONFIDENCE_EXERCISE_PATTERNS.some(p => p.test(trimmed));
  
  // 4. Verificar se é NOTE explícita
  const isNote = NOTE_PATTERNS.some(p => p.test(trimmed));
  
  // ========================================
  // REGRAS DE CLASSIFICAÇÃO
  // ========================================
  
  // MVP0 FIX: Se tem "corrida/bike/etc" + tempo/distância, é HIGH mesmo com opcional
  const hasCardioActivity = /\b(?:corrida|bike|remo|ski|caminhada|trote|run|row|swim|airbike)\b/i.test(lowerLine);
  const hasTimeOrDistance = /\d+\s*(?:min|minutos?|'|km|m)\b/i.test(trimmed);
  const isCardioWithMeasure = hasCardioActivity && hasTimeOrDistance;
  
  // A) EXERCISE OPTIONAL com medida (prioridade máxima para rastreamento)
  // Ex: "corrida opcional 45 min", "se quiser, bike 30min"
  if (isOptional && (isHighExercise || isCardioWithMeasure)) {
    _log('[CLASSIFY] EXERCISE OPTIONAL HIGH:', trimmed);
    return {
      kind: 'EXERCISE',
      confidence: 'HIGH',
      flags: { optional: true },
    };
  }
  
  // B) REST com exercício opcional detectável
  // Ex: "Descanso. Se quiser, corrida leve 30min"
  if (isRest && isOptional && (isHighExercise || isMediumExercise || isCardioWithMeasure)) {
    _log('[CLASSIFY] REST + EXERCISE OPTIONAL:', trimmed);
    return {
      kind: 'EXERCISE',
      confidence: isHighExercise || isCardioWithMeasure ? 'HIGH' : 'MEDIUM',
      flags: { optional: true },
    };
  }
  
  // C) REST puro
  if (isRest && !isOptional && !isCardioWithMeasure) {
    return { kind: 'REST', confidence: 'HIGH' };
  }
  
  // D) EXERCISE OPTIONAL (sem REST mas marcado como opcional)
  if (isOptional && isMediumExercise) {
    return {
      kind: 'EXERCISE',
      confidence: 'MEDIUM',
      flags: { optional: true },
    };
  }
  
  // E) EXERCISE HIGH confidence
  if (isHighExercise) {
    return { kind: 'EXERCISE', confidence: 'HIGH' };
  }
  
  // F) EXERCISE MEDIUM confidence
  if (isMediumExercise) {
    return { kind: 'EXERCISE', confidence: 'MEDIUM' };
  }
  
  // G) NOTE explícita
  if (isNote) {
    return { kind: 'NOTE', confidence: 'HIGH' };
  }
  
  // H) Começa com número (provável exercício) → LOW confidence
  if (/^\d+/.test(trimmed)) {
    return { kind: 'EXERCISE', confidence: 'LOW' };
  }
  
  // I) Contém movimento conhecido → LOW confidence
  const hasMovement = KNOWN_MOVEMENTS.some(m => lowerLine.includes(m));
  if (hasMovement) {
    return { kind: 'EXERCISE', confidence: 'LOW' };
  }
  
  // J) Fallback: NOTE com LOW confidence
  return { kind: 'NOTE', confidence: 'LOW' };
}

/**
 * Converte ClassifiedItem para LineType legado
 * Para manter compatibilidade com código existente
 */
export function itemKindToLineType(kind: ItemKind): LineType {
  if (kind === 'EXERCISE') return 'exercise';
  return 'comment';
}

// ============================================
// NORMALIZAÇÃO DE TEXTO (para dedup e comparação)
// ============================================
// Normaliza texto para comparação: lowercase, trim, remove acentos, remove pontuação leve
export function normalizeText(s: string): string {
  if (!s) return '';
  
  return s
    .toLowerCase()
    .trim()
    // Normaliza Unicode e remove diacríticos (acentos)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remove pontuação leve e caracteres especiais
    .replace(/[:;,.\-—_*"'""\(\)\[\]]/g, '')
    // Substitui & por e
    .replace(/&/g, 'e')
    // Múltiplos espaços para 1
    .replace(/\s+/g, ' ')
    .trim();
}

// Gera ID único para linha
let lineIdCounter = 0;
export function generateLineId(): string {
  lineIdCounter++;
  return `line-${Date.now()}-${lineIdCounter}`;
}

// Classifica todas as linhas de um bloco
// MVP0: Usa classifyItemDeterministic para kind/confidence/flags
export function classifyBlockLines(block: ParsedBlock): ParsedLine[] {
  const lines: ParsedLine[] = [];
  const normalizedTitle = normalizeText(block.title);
  const normalizedFormat = block.formatDisplay ? normalizeText(block.formatDisplay) : '';
  
  // Helper para verificar se linha deve ser descartada (duplicata do título/formato)
  const shouldDiscard = (text: string, index: number, prevNormalized: string): boolean => {
    const normalized = normalizeText(text);
    const trimmedText = text.trim();
    
    // Linha vazia
    if (!normalized) return true;
    
    // REGRA: Estruturas entre ** ** NUNCA são descartadas (suporta múltiplos ROUNDS no mesmo bloco)
    if (/^\*\*.*\*\*$/.test(trimmedText)) return false;
    
    // REGRA: Linhas estruturais (N rounds, EMOM, AMRAP, etc.) NUNCA são descartadas como duplicatas
    if (isFormatLine(trimmedText)) return false;
    
    // Igual ao título do bloco
    if (normalized === normalizedTitle) return true;
    
    // Igual ao formato do bloco (mas NÃO estruturas repetidas — já tratado acima)
    if (normalizedFormat && normalized === normalizedFormat) return true;
    
    // Nas primeiras 3 linhas: descartar se igual à linha anterior
    if (index < 3 && normalized === prevNormalized) return true;
    
    return false;
  };
  
  // Helper para criar ParsedLine com classificação completa
  const createLine = (text: string): ParsedLine => {
    const classified = classifyItemDeterministic(text);
    return {
      id: generateLineId(),
      text: text.trim(),
      type: itemKindToLineType(classified.kind),
      kind: classified.kind,
      confidence: classified.confidence,
      flags: classified.flags,
    };
  };
  
  let prevNormalized = '';
  let lineIndex = 0;
  
  // Adicionar instruction principal
  if (block.instruction && block.instruction.trim()) {
    if (!shouldDiscard(block.instruction, lineIndex, prevNormalized)) {
      lines.push(createLine(block.instruction));
      prevNormalized = normalizeText(block.instruction);
    }
    lineIndex++;
  }
  
  // Adicionar instructions
  if (block.instructions) {
    for (const instr of block.instructions) {
      if (instr.trim() && !shouldDiscard(instr, lineIndex, prevNormalized)) {
        lines.push(createLine(instr));
        prevNormalized = normalizeText(instr);
      }
      lineIndex++;
    }
  }
  
  // Adicionar items formatados (exercícios sempre HIGH confidence)
  for (const item of block.items) {
    let text = `${item.quantity} ${item.unit} ${item.movement}`;
    if (item.weight) {
      text += ` @ ${item.weight}`;
    }
    if (item.notes) {
      text += ` (${item.notes})`;
    }
    lines.push({
      id: generateLineId(),
      text: text.trim(),
      type: 'exercise',
      kind: 'EXERCISE',
      confidence: 'HIGH',
    });
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // MVP0 FIX: TAGS SÃO FONTE DE VERDADE
  // coachNotes SEMPRE são NOTE, nunca passam por classificação de exercício
  // Isso garante que linhas dentro de [COMENTÁRIO] NUNCA viram treino
  // ════════════════════════════════════════════════════════════════════════════
  if (block.coachNotes) {
    for (const note of block.coachNotes) {
      if (note.trim() && !shouldDiscard(note, lineIndex, prevNormalized)) {
        // REGRA ABSOLUTA: Se veio de coachNotes, É NOTE. Ponto final.
        // Não rodar classificador - isso evita que "Wall Balls unbroken" vire treino
        lines.push({
          id: generateLineId(),
          text: note.trim(),
          type: 'comment',
          kind: 'NOTE',
          confidence: 'HIGH', // Alta confiança pois foi marcado explicitamente por tag
        });
        prevNormalized = normalizeText(note);
      }
      lineIndex++;
    }
  }
  
  // Log de diagnóstico
  const trainCount = lines.filter(l => l.kind === 'EXERCISE' || l.kind === 'REST').length;
  const commentCount = lines.filter(l => l.kind === 'NOTE').length;
  _log('[TAG_PARSE]', {
    title: block.title || '(sem título)',
    itemsCount: trainCount,
    commentFirst50: block.coachNotes?.[0]?.substring(0, 50) || '',
  });
  
  // ============================================
  // REORDER: Reordenar linhas baseado em rawLines para preservar intercalação
  // (ex: múltiplos "2 ROUNDS" intercalados com exercícios)
  // ============================================
  if (block.rawLines && block.rawLines.length > 0) {
    const normalizeForMatch = (t: string) => t.trim().replace(/^-\s*/, '').replace(/\*\*/g, '').toLowerCase().trim();
    const reordered: ParsedLine[] = [];
    const used = new Set<number>();
    
    for (const rawLine of block.rawLines) {
      const rawNorm = normalizeForMatch(rawLine);
      if (!rawNorm) continue;
      
      // Find first unused classified line that matches this rawLine
      for (let i = 0; i < lines.length; i++) {
        if (used.has(i)) continue;
        const lineNorm = normalizeForMatch(lines[i].text);
        if (lineNorm === rawNorm || rawNorm.includes(lineNorm) || lineNorm.includes(rawNorm)) {
          reordered.push(lines[i]);
          used.add(i);
          break;
        }
      }
    }
    
    // Add any remaining unmatched lines at the end
    for (let i = 0; i < lines.length; i++) {
      if (!used.has(i)) reordered.push(lines[i]);
    }
    
    if (reordered.length === lines.length) {
      return reordered;
    }
  }
  
  return lines;
}

// ============================================
// MVP0 PATCH: Classificação de linhas com flag OPTIONAL
// ============================================
// Esta função é igual à classifyBlockLines, mas aplica flag OPTIONAL
// a todas as linhas EXERCISE quando forceOptional=true
// ============================================
export function classifyBlockLinesWithOptional(block: ParsedBlock, forceOptional: boolean): ParsedLine[] {
  // Primeiro, usar classificação padrão
  const lines = classifyBlockLines(block);
  
  // Se forceOptional está ativo, aplicar flag OPTIONAL a todos os EXERCISE
  if (forceOptional) {
    for (const line of lines) {
      if (line.kind === 'EXERCISE') {
        line.flags = { ...line.flags, optional: true };
      }
    }
  }
  
  return lines;
}

const FORMAT_PATTERNS: { pattern: RegExp; format: string }[] = [
  { pattern: /for\s*time|fortime/i, format: 'for_time' },
  { pattern: /amrap/i, format: 'amrap' },
  { pattern: /emom/i, format: 'emom' },
  { pattern: /rounds?(\s|$)/i, format: 'rounds' },
  { pattern: /intervalos?/i, format: 'intervalos' },
  { pattern: /t[eé]cnica/i, format: 'tecnica' },
  { pattern: /tabata/i, format: 'tabata' },
];

const UNIT_MAP: Record<string, string> = {
  'reps': 'reps',
  'rep': 'reps',
  'repetições': 'reps',
  'repeticoes': 'reps',
  'm': 'm',
  'metros': 'm',
  'metro': 'm',
  'km': 'km',
  'cal': 'cal',
  'calorias': 'cal',
  'caloria': 'cal',
  'min': 'min',
  'minutos': 'min',
  'minuto': 'min',
  'sec': 'sec',
  'segundos': 'sec',
  'segundo': 'sec',
  's': 'sec',
  'rounds': 'rounds',
  'round': 'rounds',
  'rodadas': 'rounds',
  'rodada': 'rounds',
  'x': 'reps',
  "'": 'min',
  '"': 'sec',
};

// Padrões de instrução (não são notas)
const INSTRUCTION_PATTERNS = [
  /descanso/i,
  /rest/i,
  /registrar/i,
  /objetivo/i,
  /zona\s*\d/i,
  /fc\s*[:=]?\s*\d/i,
  /pse\s*[:=]?\s*\d/i,
  /rounds?/i,
  /emom/i,
  /for\s*time/i,
  /amrap/i,
];

// ============================================
// PARSER PRINCIPAL - TEXTO LIVRE
// ============================================

// Separadores de bloco explícitos (⸻ e variações de traços)
// MVP0: Suportar formato real do coach
const BLOCK_SEPARATOR_PATTERNS = [
  /⸻/,           // Traço longo Unicode
  /—{2,}/,        // 2+ em-dashes
  /–{3,}/,        // 3+ en-dashes
  /-{3,}/,        // 3+ hifens
];

// Verifica se linha é um separador de bloco
function isBlockSeparator(line: string): boolean {
  const trimmed = line.trim();
  // Linha que é APENAS separadores (sem texto)
  if (BLOCK_SEPARATOR_PATTERNS.some(p => p.test(trimmed))) {
    // Verificar se é majoritariamente separadores (>50%)
    const cleanedLength = trimmed.replace(/[⸻—–\-\s]/g, '').length;
    return cleanedLength < trimmed.length * 0.3; // Menos de 30% é texto = é separador
  }
  return false;
}

// MVP0: Títulos soltos de bloco (headings sem prefixo ##)
// Detecta linhas curtas que são títulos de bloco
const HEADING_PATTERNS = [
  /^aquecimento$/i,
  /^força\s+espec[ií]fica$/i,
  /^espec[ií]fico$/i,
  /^grip\s*[&e]\s*strength$/i,
  /^corrida\s*[—–-]\s*.+$/i,  // "Corrida — Outro Período"
  /^for[çc]a$/i,
  /^metcon$/i,
  /^wod$/i,
  /^core$/i,
  /^acess[óo]rio$/i,
  /^mobilidade$/i,
  /^t[ée]cnica$/i,
  /^conditioning$/i,
  /^condicionamento$/i,
];

// ════════════════════════════════════════════════════════════════════════════
// DETECÇÃO DE TYPOS — LEVENSHTEIN DISTANCE
// ════════════════════════════════════════════════════════════════════════════
// Termos conhecidos para fuzzy matching em títulos de blocos.
// Se o coach escreve "ANRAP" em vez de "AMRAP", detecta e avisa.
// ════════════════════════════════════════════════════════════════════════════

const KNOWN_HEADING_TERMS = [
  'aquecimento', 'warm up', 'warmup',
  'força', 'forca', 'strength', 'fortalecimento',
  'força específica', 'forca especifica',
  'específico', 'especifico',
  'conditioning', 'condicionamento',
  'metcon', 'wod',
  'core', 'grip',
  'mobilidade', 'técnica', 'tecnica',
  'acessório', 'acessorio',
  'corrida',
  'amrap', 'emom', 'tabata', 'for time', 'rft',
  'cool down', 'cooldown', 'volta à calma', 'volta a calma',
];

/**
 * Calcula a distância de Levenshtein entre duas strings.
 * Complexidade: O(m*n) onde m e n são os comprimentos das strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  
  // Otimização: se uma das strings é vazia
  if (m === 0) return n;
  if (n === 0) return m;
  
  // Usar apenas 2 linhas (otimização de memória)
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  
  for (let j = 0; j <= n; j++) prev[j] = j;
  
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  
  return prev[n];
}

/**
 * Tenta encontrar um match fuzzy para uma linha que não foi reconhecida como heading.
 * Retorna a sugestão se encontrar um match com distância ≤ 2.
 * 
 * REGRAS:
 * - Só verifica linhas curtas (1-4 palavras, ≤ 40 chars)
 * - Não verifica linhas que começam com número
 * - Distância máxima: 2 (para evitar falsos positivos)
 * - Para termos curtos (≤ 4 chars), distância máxima: 1
 */
function fuzzyMatchHeading(line: string): { match: boolean; suggestion: string } | null {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase()
    .replace(/[çc]/g, 'c')
    .replace(/[ãâá]/g, 'a')
    .replace(/[éê]/g, 'e')
    .replace(/[íî]/g, 'i')
    .replace(/[óô]/g, 'o')
    .replace(/[úû]/g, 'u');
  
  // Só verificar linhas curtas que parecem títulos
  if (trimmed.length > 40) return null;
  if (/^\d/.test(trimmed)) return null;
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount > 4) return null;
  
  // Não verificar se já é um heading reconhecido
  if (isWhitelistLine(trimmed) || HEADING_PATTERNS.some(p => p.test(trimmed))) return null;
  
  let bestMatch: string | null = null;
  let bestDist = Infinity;
  
  for (const term of KNOWN_HEADING_TERMS) {
    const normTerm = term.toLowerCase()
      .replace(/[çc]/g, 'c')
      .replace(/[ãâá]/g, 'a')
      .replace(/[éê]/g, 'e')
      .replace(/[íî]/g, 'i')
      .replace(/[óô]/g, 'o')
      .replace(/[úû]/g, 'u');
    
    const dist = levenshteinDistance(lower, normTerm);
    
    // Threshold: max 1 para termos curtos, max 2 para termos longos
    const maxDist = normTerm.length <= 4 ? 1 : 2;
    
    if (dist > 0 && dist <= maxDist && dist < bestDist) {
      bestDist = dist;
      // Capitalizar a primeira letra da sugestão
      bestMatch = term.charAt(0).toUpperCase() + term.slice(1);
    }
  }
  
  if (bestMatch) {
    return { match: true, suggestion: bestMatch };
  }
  
  return null;
}

// Exportar para uso externo (testes)
export { fuzzyMatchHeading, levenshteinDistance };

// ============================================
// MVP0: LISTAS BRANCA E NEGRA PARA TÍTULOS (DEFINIÇÃO GLOBAL)
// ============================================
// Essas listas são usadas tanto em isHeadingLine quanto em extractHeadingFromLines

const GLOBAL_TITLE_WHITELIST = [
  /^aquecimento$/i,
  /^for[çc]a$/i,
  /^for[çc]a\s+espec[ií]fica$/i,
  /^espec[ií]fico$/i,
  /^conditioning$/i,
  /^condicionamento$/i,
  /^grip$/i,
  /^grip\s*[&e]\s*strength$/i,
  /^core$/i,
  /^mobilidade$/i,
  /^corrida$/i,
  /^corrida\s*[—–-]\s*.+$/i,  // "Corrida — Outro Período", "Corrida — Longão"
  /^fortalecimento$/i,
  /^metcon$/i,
  /^wod$/i,
  /^t[ée]cnica$/i,
  /^acess[óo]rio$/i,
  /^warm[- ]?up$/i,
  /^strength$/i,
];

// ════════════════════════════════════════════════════════════════════════════
// MVP0 PATCH: BLACKLIST CORRIGIDA - NÃO pode incluir "descanso" genérico!
// A verificação de descanso intra-bloco é feita por isRestInstructionLineGlobal
// ANTES da verificação de blacklist no isHeadingLine
// ════════════════════════════════════════════════════════════════════════════
const GLOBAL_TITLE_BLACKLIST = [
  // REMOVIDO: /descanso/i - causava falso positivo, verificação é feita separadamente
  // REMOVIDO: /descansar/i - já tratado em isRestInstructionLineGlobal
  /necess[aá]rio/i,
  /vai\s+aproveitar/i,
  /objetivo/i,
  /registre/i,
  /priorizando/i,
  /opcional/i,
  /se\s+quiser/i,
  /se\s+precisar/i,
  /se\s+estiver/i,
  /caso\s+queira/i,
  /lembre/i,
  /aten[çc][ãa]o/i,
  /obs(?:erva[çc][ãa]o)?:/i,
  /nota:/i,
  /dica:/i,
  /zona\s*\d/i,  // "Zona 2" não é título
  /^\d/,  // Linhas que começam com número
  /^#/,   // Linhas que começam com #
  /^>/,   // Linhas que começam com > (marcador de comentário)
  /^=\s*COMENT[AÁ]RIO/i,  // = COMENTÁRIO nunca é título
  /^>\s*COMENT[AÁ]RIO/i,  // > COMENTÁRIO nunca é título
  /^COMENT[AÁ]RIO\s*:?$/i,  // COMENTÁRIO sozinho nunca é título
  /^\[COMENT[AÁ]RIO\]/i,  // [COMENTÁRIO] nunca é título
];

// ════════════════════════════════════════════════════════════════════════════
// MVP0 PATCH: NORMALIZAÇÃO DE QUOTES (ANTES DE QUALQUER REGEX)
// ════════════════════════════════════════════════════════════════════════════
// Normaliza aspas tipográficas para versões ASCII simples
// Isso garante que "Descanso 2'" seja reconhecido corretamente
// ════════════════════════════════════════════════════════════════════════════
function normalizeQuotes(text: string): string {
  return text
    .replace(/['']/g, "'")  // Aspas simples tipográficas → '
    .replace(/[""]/g, '"')  // Aspas duplas tipográficas → "
    .replace(/\s+/g, ' ')   // Colapsar espaços múltiplos
    .trim();
}

// Verifica se linha está na BLACKLIST (nunca pode virar título)
function isBlacklistLine(line: string): boolean {
  const trimmed = line.trim();
  return GLOBAL_TITLE_BLACKLIST.some(p => p.test(trimmed));
}

// Verifica se linha está na WHITELIST (sempre é título)
function isWhitelistLine(line: string): boolean {
  const trimmed = line.trim();
  return GLOBAL_TITLE_WHITELIST.some(p => p.test(trimmed));
}

// ════════════════════════════════════════════════════════════════════════════
// MVP0 PATCH: isRestInstructionLineGlobal - VERSÃO CANÔNICA FINAL
// ════════════════════════════════════════════════════════════════════════════
// REGRA ABSOLUTA: Linhas de descanso intra-bloco (IN_BLOCK_REST_INSTRUCTION)
// NUNCA podem:
// - Virar heading/título
// - Fechar bloco
// - Criar novo bloco  
// - Alterar day.isRestDay
// - Mudar classificação do bloco/dia
// - Impedir headings seguintes
//
// INVARIANTE: Se retorna TRUE, a linha é SEMPRE tratada como nota/metadado
// do bloco atual, nunca como estrutura.
// ════════════════════════════════════════════════════════════════════════════
function isRestInstructionLineGlobal(line: string): boolean {
  // NORMALIZAR QUOTES PRIMEIRO (crítico para detecção correta)
  const normalized = normalizeQuotes(line);
  const lower = normalized.toLowerCase();
  
  // ════════════════════════════════════════════════════════════════════════════
  // MVP0 PATCH: PRIORIDADE ABSOLUTA — isExercisePatternLine PRIMEIRO!
  // Se a linha parece exercício (tem tempo, distância, reps), NÃO é descanso.
  // Exemplos que DEVEM ser TREINO:
  //   "10' Aquecimento (PSE 3)"
  //   "8 rounds: 60m (PSE 9) com 1'30 descanso entre rounds"
  //   "90+ minutos de corrida contínua em Zona 2"
  // ════════════════════════════════════════════════════════════════════════════
  if (isExercisePatternLine(normalized)) {
    _log('[isRestInstructionLineGlobal] → FALSE (isExercisePatternLine=true, prioridade exercício):', line);
    return false;
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // REGRA 1: REST_DAY_CANDIDATE = "descanso" SOZINHO (sem tempo/unidade/número)
  // Se for apenas "Descanso" ou "Descanso total", NÃO é instrução intra-bloco
  // ════════════════════════════════════════════════════════════════════════════
  
  // Verificar se é "descanso" puro (sem tempo/número) - isso é REST_DAY_CANDIDATE
  // Padrões válidos para REST_DAY_CANDIDATE (retorna FALSE aqui):
  // - "Descanso"
  // - "Descanso total"
  // - "Descanso completo"
  // - "Descanso (com família)"
  // - "Descanso do dia"
  if (/^descanso(\s+(total|completo|do\s+dia|absoluto))?\s*(\(.*\))?\s*$/i.test(lower)) {
    // NÃO é instrução intra-bloco, é candidato a descanso de dia
    return false;
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // REGRA 2: CONTÉM DÍGITO OU UNIDADE DE TEMPO? → É INSTRUÇÃO INTRA-BLOCO
  // Se tem "descanso" + qualquer número, é SEMPRE instrução de intervalo
  // NOTA: Só chegamos aqui se isExercisePatternLine=false
  // ════════════════════════════════════════════════════════════════════════════
  
  // Verificação rápida: se a linha contém "descanso" E contém dígito → IN_BLOCK_REST
  if (/\bdescanso\b/i.test(lower) && /\d/.test(lower)) {
    _log('[isRestInstructionLineGlobal] → TRUE (descanso + dígito):', line);
    return true;
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // REGRA 3: IN_BLOCK_REST_INSTRUCTION - Padrões específicos
  // ════════════════════════════════════════════════════════════════════════════
  
  // A) "Descanso" + dígito (com ou sem espaço) - já coberto acima
  if (/^descanso\s*\d+/i.test(lower)) return true;
  
  // B) "Descanso X'" ou "Descanso X''" (tempo em minutos/segundos)
  if (/^descanso\s+\d+\s*['"`'']+/i.test(lower)) return true;
  
  // C) "Descanso X min/seg/s"
  if (/^descanso\s+\d+\s*(min|seg|s|segundos?|minutos?)\b/i.test(lower)) return true;
  
  // D) "Descanso mm:ss" (formato de tempo)
  if (/^descanso\s+\d+:\d+/i.test(lower)) return true;
  
  // E) "Descanso X'Y''" (ex: "Descanso 1'30''")
  if (/^descanso\s+\d+['"`'']+\d*['"`''"]*/i.test(lower)) return true;
  
  // F) "Descansar" (sempre é instrução, nunca estrutura)
  if (/^descansar\b/i.test(lower)) return true;
  
  // G) "Descanso:" (seguido de instruções)
  if (/^descanso\s*:/i.test(lower)) return true;
  
  // H) Frases de descanso intra-bloco (contextual)
  if (/descanso\s+(entre|between)\s+(rounds?|s[ée]ries?|sets?|exerc[ií]cios?)/i.test(lower)) return true;
  if (/descanso\s+(necess[aá]rio|livre|ativo|passivo|conforme)/i.test(lower)) return true;
  if (/descanso\s+a\s+cada/i.test(lower)) return true;
  if (/descanso\s+de\s+\d+/i.test(lower)) return true;
  
  // I) Variantes em inglês
  if (/^rest\s*\d+/i.test(lower)) return true;
  if (/rest\s+between/i.test(lower)) return true;
  if (/rest\s+as\s+needed/i.test(lower)) return true;
  if (/^rest\s+\d+\s*['"`'']+/i.test(lower)) return true;
  
  // J) "Intervalo X'" (sinônimo de descanso intra-bloco)
  if (/^intervalo\s*\d+/i.test(lower)) return true;
  if (/^intervalo\s+\d+\s*['"`'']+/i.test(lower)) return true;
  
  // K) Frases de pausa/recuperação
  if (/^pausa\s*\d+/i.test(lower)) return true;
  if (/recupera[çc][ãa]o\s+\d+/i.test(lower)) return true;
  
  return false;
}

// ════════════════════════════════════════════════════════════════════════════
// MVP0 PATCH: isOptionalMarkerLine - Detecta marcadores "Opcional"
// ════════════════════════════════════════════════════════════════════════════
// REGRA ABSOLUTA: "Opcional" NUNCA vira bloco
// Deve virar day.optionalNotes ou meta, NUNCA heading
// ════════════════════════════════════════════════════════════════════════════
function isOptionalMarkerLine(line: string): boolean {
  const normalized = normalizeQuotes(line);
  const lower = normalized.toLowerCase();
  
  // Padrões que indicam marcador opcional
  if (/^opcional\s*[:()]?\s*$/i.test(lower)) return true;
  if (/^\(?\s*opcional\s*\)?:?\s*$/i.test(lower)) return true;
  if (/^opcional\s*[-–—]/i.test(lower)) return true;
  
  return false;
}

// ════════════════════════════════════════════════════════════════════════════
// MVP0 PATCH: isRestDayCandidateLine - Detecta candidatos a dia de descanso
// ════════════════════════════════════════════════════════════════════════════
// REGRA ABSOLUTA: Só é REST_DAY_CANDIDATE se:
// 1) Linha começa com "descanso" (case-insensitive)
// 2) NÃO contém dígitos (nenhum número)
// 3) NÃO contém unidade de tempo (' '' min seg s)
// 4) NÃO é instrução intra-bloco (isRestInstructionLineGlobal retorna false)
//
// RESULTADO: Quando detectado, APENAS seta day.restSuggestion = true
// NUNCA seta day.isRestDay = true (toggle é MANUAL)
// ════════════════════════════════════════════════════════════════════════════
function isRestDayCandidateLine(line: string): boolean {
  const normalized = normalizeQuotes(line);
  const lower = normalized.toLowerCase().trim();
  
  // REGRA 1: Se contém dígito → NÃO é candidato a descanso de dia
  if (/\d/.test(normalized)) {
    _log('[isRestDayCandidateLine] → false (contém dígito):', line);
    return false;
  }
  
  // REGRA 2: Se contém aspas de tempo → NÃO é candidato
  if (/['"`''"]/.test(normalized)) {
    _log('[isRestDayCandidateLine] → false (contém aspas de tempo):', line);
    return false;
  }
  
  // REGRA 3: Se contém unidades de tempo → NÃO é candidato
  if (/\b(min|seg|s|segundos?|minutos?|sec|second)\b/i.test(lower)) {
    _log('[isRestDayCandidateLine] → false (contém unidade de tempo):', line);
    return false;
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // PADRÕES VÁLIDOS DE DIA DE DESCANSO (sem números, sem tempo)
  // ════════════════════════════════════════════════════════════════════════════
  
  // "Descanso" sozinho ou com qualificadores
  if (/^descanso$/i.test(lower)) {
    _log('[isRestDayCandidateLine] → true (descanso puro)');
    return true;
  }
  if (/^descanso\s+(total|completo|absoluto)$/i.test(lower)) {
    _log('[isRestDayCandidateLine] → true (descanso + qualificador)');
    return true;
  }
  
  // "Descanso" com parênteses/contexto (ex: "Descanso (com família)")
  if (/^descanso\s*\(.*\)\s*$/i.test(lower)) {
    _log('[isRestDayCandidateLine] → true (descanso + contexto)');
    return true;
  }
  
  // "Dia de descanso/livre/off"
  if (/^dia\s+(de\s+)?(descanso|livre|off)$/i.test(lower)) {
    _log('[isRestDayCandidateLine] → true (dia de descanso)');
    return true;
  }
  
  // Variantes em inglês
  if (/^rest\s*day$/i.test(lower)) return true;
  if (/^day\s*off$/i.test(lower)) return true;
  if (/^off\s*day$/i.test(lower)) return true;
  if (/^rest$/i.test(lower)) return true;
  
  // "Folga"
  if (/^folga$/i.test(lower)) return true;
  
  _log('[isRestDayCandidateLine] → false (nenhum padrão bateu):', line);
  return false;
}

// Verifica se linha é um heading/título de bloco (não precisa ser MAIÚSCULA)
// MVP0 FIX: Usa WHITELIST e verifica BLACKLIST
// MVP0 PATCH: DESCANSO INTRA-BLOCO NUNCA É HEADING
// MVP0 PATCH: "OPCIONAL" NUNCA É HEADING
function isHeadingLine(line: string): boolean {
  const cachedResult = _headingCache.get(line);
  if (cachedResult !== undefined) return cachedResult;
  
  const result = _isHeadingLineCore(line, false);
  _headingCache.set(line, result);
  return result;
}

/**
 * Versão otimizada para o loop principal: pula checagens de rest/optional/restCandidate
 * já feitas antes (e que deram false, pois o loop fez `continue` se true).
 */
function isHeadingLineInLoop(line: string): boolean {
  const cachedResult = _headingCache.get(line);
  if (cachedResult !== undefined) return cachedResult;
  
  const result = _isHeadingLineCore(line, true);
  _headingCache.set(line, result);
  return result;
}

function _isHeadingLineCore(line: string, skipPreChecks: boolean): boolean {
  // NORMALIZAR QUOTES PRIMEIRO
  const normalized = normalizeQuotes(line);
  const trimmed = normalized.trim();
  
  // Debug log para rastrear
  _log('[isHeadingLine] Verificando:', JSON.stringify(trimmed), 'len=', trimmed.length);
  
  // ════════════════════════════════════════════════════════════════════════════
  // REGRA ABSOLUTA 0: ESTRUTURAS ENTRE ** ** NUNCA SÃO HEADINGS
  // ════════════════════════════════════════════════════════════════════════════
  if (/^\*\*.*\*\*$/.test(trimmed)) {
    _log('[isHeadingLine] → STRUCTURE_LINE (** **), retorna false (nunca é heading)');
    return false;
  }
  
  if (!skipPreChecks) {
    // ════════════════════════════════════════════════════════════════════════════
    // REGRA ABSOLUTA 1: DESCANSO INTRA-BLOCO NUNCA PODE SER HEADING
    // ════════════════════════════════════════════════════════════════════════════
    if (isRestInstructionLineGlobal(trimmed)) {
      _log('[isHeadingLine] → REST_INSTRUCTION, retorna false (nunca é heading)');
      return false;
    }
    
    // ════════════════════════════════════════════════════════════════════════════
    // REGRA ABSOLUTA 2: "OPCIONAL" NUNCA É HEADING
    // ════════════════════════════════════════════════════════════════════════════
    if (isOptionalMarkerLine(trimmed)) {
      _log('[isHeadingLine] → OPTIONAL_MARKER, retorna false (nunca é heading)');
      return false;
    }
    
    // ════════════════════════════════════════════════════════════════════════════
    // REGRA ABSOLUTA 3: CANDIDATO A DIA DE DESCANSO NUNCA É HEADING
    // ════════════════════════════════════════════════════════════════════════════
    if (isRestDayCandidateLine(trimmed)) {
      _log('[isHeadingLine] → REST_DAY_CANDIDATE, retorna false (não é heading)');
      return false;
    }
  }
  
  // BLACKLIST: NUNCA é heading
  if (isBlacklistLine(trimmed)) {
    _log('[isHeadingLine] → BLACKLIST, retorna false');
    return false;
  }
  
  // WHITELIST: SEMPRE é heading (match exato)
  if (isWhitelistLine(trimmed)) {
    _log('[isHeadingLine] → WHITELIST match exato, retorna true');
    return true;
  }
  
  // Heading patterns conhecidos (case-insensitive)
  if (HEADING_PATTERNS.some(p => p.test(trimmed))) {
    _log('[isHeadingLine] → HEADING_PATTERNS, retorna true');
    return true;
  }
  
  // Linha curta (<=60 chars) + NÃO começa com número + contém palavra-chave de bloco
  if (trimmed.length <= 60 && !/^\d/.test(trimmed)) {
    const blockKeywords = [
      /aquecimento/i, /for[çc]a/i, /metcon/i, /espec[ií]fico/i,
      /corrida/i, /core/i, /grip/i, /acess[óo]rio/i, /mobilidade/i,
      /t[ée]cnica/i, /conditioning/i, /condicionamento/i, /fortalecimento/i
    ];
    const hasKeyword = blockKeywords.some(p => p.test(trimmed));
    // Se contém keyword E é curta E não parece exercício, é heading
    if (hasKeyword && !isExercisePatternLine(trimmed)) {
      _log('[isHeadingLine] → Keyword match + curta, retorna true');
      return true;
    }
  }
  
  _log('[isHeadingLine] → Nenhum match, retorna false');
  return false;
}

// ============================================
// MVP0 PATCH: Verifica se linha parece ser exercício
// REGRA: Se parece exercício, NÃO pode ser heading/título
// ============================================
function isExercisePatternLine(line: string): boolean {
  // NORMALIZAR QUOTES PRIMEIRO
  const normalized = normalizeQuotes(line);
  const trimmed = normalized.trim();
  
  // Debug para rastrear
  _log('[isExercisePatternLine] Verificando:', JSON.stringify(trimmed));
  
  // A) Começa com número → é exercício
  if (/^\d+/.test(trimmed)) {
    _log('[isExercisePatternLine] → Começa com número, retorna true');
    return true;
  }
  
  // B) Contém número + unidade de TEMPO → é exercício (PATCH MVP0)
  // Padrões: "45 min", "até 45 minutos", "30'", "45''", "1h", "2 horas"
  // Note: Usamos ' (aspas simples ASCII) pois já normalizamos
  if (/\d+\s*(?:min(?:uto)?s?|minutes?|'(?!')|''|"|h(?:ora)?s?|seg(?:undo)?s?|sec(?:ond)?s?)\b/i.test(trimmed)) {
    _log('[isExercisePatternLine] → Tem número + unidade de tempo, retorna true');
    return true;
  }
  
  // C) Contém "até X minutos/min" → é exercício
  if (/\baté\s+\d+\s*(?:min(?:uto)?s?|h(?:ora)?s?)/i.test(trimmed)) {
    _log('[isExercisePatternLine] → Padrão "até X minutos", retorna true');
    return true;
  }
  
  // D) Contém número + unidade de DISTÂNCIA → é exercício
  if (/\d+\s*(?:m|km|metros?|quilômetros?)\b/i.test(trimmed)) {
    _log('[isExercisePatternLine] → Tem número + distância, retorna true');
    return true;
  }
  
  // E) Contém formatos de exercício (5x5, EMOM, AMRAP, For Time, Rounds, Sets, Reps)
  if (/\d+\s*x\s*\d+/i.test(trimmed)) {
    _log('[isExercisePatternLine] → Padrão sets x reps, retorna true');
    return true;
  }
  if (/\b(?:emom|amrap|for\s*time|rft|tabata)\b/i.test(trimmed)) {
    _log('[isExercisePatternLine] → Formato de treino, retorna true');
    return true;
  }
  if (/\d+\s*(?:rounds?|rodadas?|sets?|séries?|reps?|repeti[çc][õo]es?|cal)\b/i.test(trimmed)) {
    _log('[isExercisePatternLine] → Rounds/sets/reps/cal, retorna true');
    return true;
  }
  
  _log('[isExercisePatternLine] → Nenhum padrão de exercício, retorna false');
  return false;
}

export function parseStructuredText(text: string): ParseResult {
  // ═══ RESET DE CACHES — limpa memória de sessões anteriores ═══
  resetUnitsCache();
  resetParserCaches();
  
  _log('[PARSER] === parseStructuredText INICIADO ===');
  _log('[PARSER] Texto recebido (primeiros 500 chars):', text.substring(0, 500));
  const lines = text.split('\n');
  _log('[PARSER] Total de linhas:', lines.length);
  
  // MVP0: Validar âncoras de dia antes de parsear
  const dayValidation = validateDayAnchors(text);
  _log('[PARSER] Dias detectados:', dayValidation.daysFound);
  
  const result: ParseResult = {
    success: false,
    days: [],
    errors: [],
    warnings: [],
    alerts: [],
    needsDaySelection: false,
    hasDayAnchors: dayValidation.hasDays,
    structureWarnings: [], // MVP0: Avisos de estrutura inválida
    typoWarnings: [], // Avisos de possíveis erros de digitação
  };

  let currentDay: DayOfWeek | null = null;
  let currentDayEntry: ParsedDay | null = null;
  let currentBlock: ParsedBlock | null = null;
  let lineNumber = 0;
  let hasExplicitDay = false;
  
  // MVP0 PATCH: Flag para marcar linhas seguintes como OPCIONAL
  // "Opcional:" seta esta flag = true, e todas as linhas EXERCISE seguintes
  // recebem a flag OPTIONAL até mudar de bloco/dia
  let currentOptional = false;

  // Contador de blocos para fallback de título
  let blockCounter = 0;
  
  // ════════════════════════════════════════════════════════════════════════════
  // MVP0 PATCH: FLAG ANTI-COLAPSO — BLOCO NÃO MORRE NO MEIO
  // ════════════════════════════════════════════════════════════════════════════
  // Quando true, TODAS as linhas subsequentes pertencem ao bloco atual
  // EXCETO se um NOVO heading válido for detectado
  // Nenhuma outra regra pode resetar esta flag ou encerrar o bloco
  // ════════════════════════════════════════════════════════════════════════════
  let isInsideBlock = false;
  
  /**
   * REGRA MVP0: Categoria NUNCA é inferida automaticamente.
   * O coach DEVE selecionar manualmente via UI.
   * type = '' (vazio) até o coach definir.
   */
  const createNewBlock = (rawTitle: string, isAutoGen: boolean = false): ParsedBlock => {
    blockCounter++;
    // MVP0 FIX: Se isAutoGen, título fica VAZIO (fallback só na UI)
    // NUNCA persistir "BLOCO X" como título real
    const title = isAutoGen ? '' : cleanBlockTitle(rawTitle);
    const isOptional = /\bopcional\b/i.test(rawTitle);
    return {
      title,
      type: '' as any, // MVP0: Categoria OBRIGATÓRIA - coach deve selecionar (NÃO INFERIR)
      format: detectFormat(rawTitle),
      formatDisplay: undefined,
      isMainWod: false,
      isBenchmark: false,
      optional: isOptional,
      items: [],
      lines: [],
      coachNotes: [],
      instructions: [],
      isAutoGenTitle: isAutoGen || title === '', // Marcar como auto-gen se título ficou vazio
      rawLines: rawTitle ? [rawTitle] : [], // Preservar título original como primeira rawLine
    };
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MVP0: Usa funções globais isWhitelistLine e isBlacklistLine
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * MVP0: Extrai heading das primeiras 5 linhas do bloco
   * ORDEM: 1) Lista branca → 2) Heurística (curto sem número)
   * BLOQUEIO: Lista negra nunca vira título
   */
  const extractHeadingFromLines = (lines: string[]): { heading: string; remainingLines: string[] } | null => {
    // Filtrar linhas não vazias
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);
    
    // PASSO 1: Procurar título na LISTA BRANCA (prioridade máxima)
    for (let i = 0; i < Math.min(5, nonEmptyLines.length); i++) {
      const line = nonEmptyLines[i].trim();

      // REGRA SUPREMA: linha puramente "( ... )" nunca pode virar heading/título
      const { content, comments } = extractInlineComments(line);
      if (comments.length > 0 && content.length === 0) continue;
      
      // Se está na lista negra, pular
      if (isBlacklistLine(line)) continue;
      
      // Se está na lista branca, É título!
      if (isWhitelistLine(line)) {
        _log('[PARSER] Título WHITELIST encontrado na linha', i + 1, ':', line);
        const remaining = [...nonEmptyLines];
        remaining.splice(i, 1);
        return { heading: line, remainingLines: remaining };
      }
    }
    
    // PASSO 2: Heurística - linha curta, sem número, sem lista negra
    for (let i = 0; i < Math.min(5, nonEmptyLines.length); i++) {
      const line = nonEmptyLines[i].trim();

      // REGRA SUPREMA: linha puramente "( ... )" nunca pode virar heading/título
      const { content, comments } = extractInlineComments(line);
      if (comments.length > 0 && content.length === 0) continue;
      
      // Se está na lista negra, pular
      if (isBlacklistLine(line)) continue;
      
      // Heading válido = linha curta (<=60), NÃO inicia com número
      if (line.length <= 60 && !/^\d/.test(line)) {
        // Verificar se NÃO é padrão de exercício
        const isExercisePattern = 
          /^emom\b/i.test(line) ||
          /^amrap\b/i.test(line) ||
          /^for\s*time\b/i.test(line) ||
          /^\d+\s*rounds?\b/i.test(line) ||
          /^min\s*\d+/i.test(line) ||
          /^\d+\s*x\s*\d+/i.test(line) ||
          /^\d+['']\s*/i.test(line) ||  // 45'' prancha
          /^\d+:\d+/i.test(line) ||     // mm:ss
          /^\d+\s*(m|km|cal)\b/i.test(line);
        
        if (!isExercisePattern) {
          // Verificar se tem keyword de bloco
          const hasBlockKeyword = [
            /aquecimento/i, /for[çc]a/i, /metcon/i, /espec[ií]fico/i,
            /corrida/i, /core/i, /grip/i, /acess[óo]rio/i, /mobilidade/i,
            /t[ée]cnica/i, /conditioning/i, /condicionamento/i, /strength/i,
            /warm[- ]?up/i, /wod/i, /fortalecimento/i
          ].some(p => p.test(line));
          
          // Linha curta sem números também pode ser heading
          const isShortNoNumbers = line.length <= 40 && !/\d/.test(line);
          
          if (hasBlockKeyword || isShortNoNumbers) {
            _log('[PARSER] Heading heurístico na linha', i + 1, ':', line);
            const remaining = [...nonEmptyLines];
            remaining.splice(i, 1);
            return { heading: line, remainingLines: remaining };
          }
        }
      }
    }
    
    return null;
  };

  const saveCurrentBlock = () => {
    if (currentBlock) {
      // ════════════════════════════════════════════════════════════════════════════
      // MVP0 LOG: Bloco sendo finalizado
      // ════════════════════════════════════════════════════════════════════════════
      _log('[BLOCK_END] Finalizando bloco:', currentBlock.title || '(sem título)', 'isInsideBlock was:', isInsideBlock);
      
      // MVP0: Antes de salvar, tentar extrair heading das instructions se título vazio
      if (!currentBlock.title || currentBlock.title.trim() === '') {
        const allLines = [
          currentBlock.instruction || '',
          ...currentBlock.instructions,
        ].filter(l => l.trim());
        
        const extracted = extractHeadingFromLines(allLines);
        if (extracted) {
          currentBlock.title = cleanBlockTitle(extracted.heading);
          currentBlock.isAutoGenTitle = currentBlock.title === '';
          // Atualizar instructions removendo o heading
          currentBlock.instructions = extracted.remainingLines.filter(l => l !== currentBlock!.instruction);
          if (currentBlock.instruction === extracted.heading) {
            currentBlock.instruction = undefined;
          }
          _log('[PARSER] Título extraído do conteúdo:', currentBlock.title);
        }
      }
      
      // Só salva se tiver pelo menos 1 item OU instruções OU for estímulo de treino
      const allContent = [
        currentBlock.instruction || '',
        ...currentBlock.instructions,
        ...currentBlock.items.map(i => `${i.quantity} ${i.unit} ${i.movement}`)
      ].join(' ');
      
      const hasTrainingStimulus = isTrainingStimulus(allContent);
      const hasContent = currentBlock.items.length > 0 || currentBlock.instructions.length > 0 || currentBlock.instruction;
      
      if (hasContent || hasTrainingStimulus) {
        // MVP0: NÃO refinar tipo automaticamente - coach deve selecionar
        // REMOVIDO: currentBlock.type = detectTypeByContent(currentBlock);
        
        // Detectar se é opcional pelo conteúdo
        if (/\bopcional\b/i.test(allContent)) {
          currentBlock.optional = true;
        }
        
        // MVP0 PATCH: Passar currentOptional para classificação de linhas
        // Se currentOptional está ativo, marcar o bloco como opcional
        if (currentOptional) {
          currentBlock.optional = true;
        }
        
        // ════════════════════════════════════════════════════════════════════════════
        // MVP0 LOG: TAG_SPLIT para diagnóstico
        // ════════════════════════════════════════════════════════════════════════════
        const hasTags = currentBlock.coachNotes.length > 0 || inTrainingTagMode || inCommentTagMode;
        _log('[TAG_SPLIT]', {
          title: currentBlock.title || '(sem título)',
          hasTags,
          trainChars: currentBlock.instructions.join('\n').length + currentBlock.items.length * 20,
          commentChars: currentBlock.coachNotes.join('\n').length,
        });
        
        // Classificar linhas do bloco (exercise vs comment)
        // MVP0 PATCH: Passar flag currentOptional para classificação
        currentBlock.lines = classifyBlockLinesWithOptional(currentBlock, currentOptional);
        
        // Find or create day entry (allow null day)
        if (!currentDayEntry) {
          currentDayEntry = { day: currentDay, blocks: [], alerts: [] };
          result.days.push(currentDayEntry);
        }
        currentDayEntry.blocks.push(currentBlock);
      }
    }
    currentBlock = null;
    // ════════════════════════════════════════════════════════════════════════════
    // MVP0 PATCH: Resetar flag isInsideBlock ao encerrar bloco
    // ════════════════════════════════════════════════════════════════════════════
    isInsideBlock = false;
    // MVP0 FIX: Resetar modos de tag ao encerrar bloco
    // Isso garante que tags de um bloco não afetam o próximo
    inCommentTagMode = false;
    inTrainingTagMode = false;
    // MVP0 PATCH: Resetar flag opcional ao trocar de bloco
    // NOTA: NÃO resetamos aqui para permitir que "Opcional:" afete múltiplas linhas
    // O reset só acontece ao mudar de dia
  };

  const detectDay = (line: string): DayOfWeek | null => {
    const cleanLine = line.toLowerCase().replace(/[^a-záéíóúàâêôãõç\s-]/g, '').trim();
    
    for (const [key, day] of Object.entries(DAY_MAP)) {
      if (cleanLine === key || cleanLine.startsWith(key + ' ') || cleanLine.endsWith(' ' + key)) {
        return day;
      }
    }
    
    for (const [key, day] of Object.entries(DAY_MAP)) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(line) && line.length < 50) {
        return day;
      }
    }
    
    return null;
  };

  // Detecta tipo pelo TÍTULO primeiro
  const detectBlockType = (line: string): WorkoutBlock['type'] => {
    for (const { pattern, type } of TYPE_PATTERNS) {
      if (pattern.test(line)) {
        return type;
      }
    }
    // Se título não definiu, retorna null para tentar por conteúdo depois
    return 'conditioning'; // Fallback inicial, será refinado por conteúdo
  };

  // Detecta tipo pelo CONTEÚDO (chamado após bloco completo)
  const detectTypeByContent = (block: ParsedBlock): WorkoutBlock['type'] => {
    // Se já tem tipo definido pelo título (não é conditioning genérico), mantém
    if (block.type !== 'conditioning') return block.type;
    
    // Verifica conteúdo das instruções
    const allContent = [
      block.instruction || '',
      ...block.instructions,
      ...block.items.map(i => i.movement)
    ].join(' ');
    
    for (const { pattern, type } of CONTENT_TYPE_PATTERNS) {
      if (pattern.test(allContent)) {
        return type;
      }
    }
    
    // Fallback final: Conditioning
    return 'conditioning';
  };

  const detectFormat = (line: string): string => {
    for (const { pattern, format } of FORMAT_PATTERNS) {
      if (pattern.test(line)) {
        return format;
      }
    }
    return 'outro';
  };

  const isUpperCaseLine = (line: string): boolean => {
    const letters = line.replace(/[^a-záéíóúàâêôãõçA-ZÁÉÍÓÚÀÂÊÔÃÕÇ]/g, '');
    if (letters.length < 3) return false;
    return letters === letters.toUpperCase() && letters.length > 0;
  };

  const isInstructionLine = (line: string): boolean => {
    return INSTRUCTION_PATTERNS.some(pattern => pattern.test(line));
  };

  const parseExerciseLine = (line: string): ParsedItem | null => {
    const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
    
    // Padrão: número + unidade opcional + movimento
    const match = cleanLine.match(/^(\d+(?:[.,]\d+)?)\s*(['"])?(\w+)?\s+(.+?)(?:\s*[\(@](.+)[\)@])?$/);
    
    if (match) {
      const quantity = parseFloat(match[1].replace(',', '.'));
      let rawUnit = match[3]?.toLowerCase() || match[2] || '';
      let movement = match[4].trim();
      const notes = match[5]?.trim();
      
      let unit = UNIT_MAP[rawUnit];
      if (!unit && rawUnit) {
        movement = `${rawUnit} ${movement}`;
        unit = 'reps';
      } else if (!unit) {
        unit = 'reps';
      }
      
      const weightInfo = detectWeight(cleanLine);
      
      return {
        quantity,
        unit,
        movement,
        notes,
        weight: weightInfo.weight,
        isWeightAlert: weightInfo.isAlert,
      };
    }
    
    // Padrão simplificado: "número movimento"
    const simpleMatch = cleanLine.match(/^(\d+)\s+(.+)$/);
    if (simpleMatch) {
      const weightInfo = detectWeight(cleanLine);
      return {
        quantity: parseInt(simpleMatch[1]),
        unit: 'reps',
        movement: simpleMatch[2].trim(),
        weight: weightInfo.weight,
        isWeightAlert: weightInfo.isAlert,
      };
    }
    
    return null;
  };

  const detectWeight = (line: string): { weight?: string; isAlert: boolean } => {
    const percentMatch = line.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (percentMatch) {
      return { weight: `${percentMatch[1]}%`, isAlert: false };
    }
    
    const rpeMatch = line.match(/(pse|rpe)\s*[:=]?\s*(\d+)/i);
    if (rpeMatch) {
      return { weight: `${rpeMatch[1].toUpperCase()} ${rpeMatch[2]}`, isAlert: false };
    }
    
    const rxMatch = line.match(/(\d+)\s*\/\s*(\d+)\s*(?:kg)?/);
    if (rxMatch) {
      return { weight: `${rxMatch[1]}/${rxMatch[2]}kg`, isAlert: false };
    }
    
    const kgMatch = line.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
    if (kgMatch) {
      return { weight: `${kgMatch[1]}kg`, isAlert: true };
    }
    
    // MVP0 PATCH: REMOVIDO "@autorregulado" fantasma
    // Palavras como "leve", "moderada", "pesada" NÃO geram peso inferido
    // Isso violava "não adivinhar" e poluía o entendimento do atleta
    // Se o coach quiser indicar intensidade, deve fazer explicitamente
    if (/\b(leve|moderada?|pesada?|heavy|light|moderate)\b/i.test(line)) {
      // REMOVIDO: return { weight: 'autorregulado', isAlert: false };
      // Agora retorna sem peso - intensidade fica como texto original
      return { isAlert: false };
    }
    
    return { isAlert: false };
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MVP0 PATCH: DESCANSO SÓ COM CONFIRMAÇÃO DO COACH
  // ════════════════════════════════════════════════════════════════════════════
  // PROIBIÇÃO ABSOLUTA: O sistema NUNCA pode setar isRestDay = true automaticamente
  // A detecção vira apenas "SUGESTÃO" (restSuggestion) sem efeito lógico
  // O toggle só muda por ação explícita do coach (clique)
  // ════════════════════════════════════════════════════════════════════════════
  
  // MVP0: Flag para rastrear se já vimos um heading válido no dia atual
  let hasSeenValidHeading = false;
  
  // MVP0: Flag para rastrear modo de tags [TREINO]/[COMENTÁRIO]
  // Quando dentro de [COMENTÁRIO], linhas subjetivas são aceitas sem warning
  let inCommentTagMode = false;
  let inTrainingTagMode = false;

  for (const rawLine of lines) {
    lineNumber++;
    // NORMALIZAÇÃO: Quotes tipográficas → ASCII simples
    const line = normalizeQuotes(rawLine);
    
    // Linha vazia - continua no bloco atual
    if (!line) continue;
    
    // ════════════════════════════════════════════════════════════════════════════
    // MVP0: DETECTAR TAGS [TREINO] E [COMENTÁRIO] / MARCADORES = TREINO e > COMENTÁRIO
    // ════════════════════════════════════════════════════════════════════════════
    // Tags mudam o modo de interpretação das linhas seguintes.
    // [TREINO] / = TREINO = linhas são tratadas como exercícios puros
    // [COMENTÁRIO] / > COMENTÁRIO = linhas são tratadas como notas (sem warning de mistura)
    // REGRA CIRÚRGICA: "COMENTÁRIO" NUNCA cria novo bloco - anexa ao bloco anterior
    // ════════════════════════════════════════════════════════════════════════════
    const trimmedLine = line.trim();

    // REGRA SUPREMA: qualquer linha "( ... )" é SEMPRE comentário e NUNCA vira título/bloco
    const { content: parenContent, comments: parenComments } = extractInlineComments(trimmedLine);
    if (parenComments.length > 0 && parenContent.length === 0) {
      // Anexar ao bloco atual (se existir); se não houver, ignorar (não cria bloco)
      if (currentBlock) {
        currentBlock.coachNotes.push(...parenComments);
        currentBlock.rawLines.push(trimmedLine);
      }
      continue;
    }
    
    // Detectar marcadores de TREINO: [TREINO] ou = TREINO
    if (/^\[TREINO\]$/i.test(trimmedLine) || /^=\s*TREINO\s*$/i.test(trimmedLine)) {
      _log('[TAG_MODE] → TREINO (marcador detectado):', trimmedLine);
      inTrainingTagMode = true;
      inCommentTagMode = false;
      continue;
    }
    
    // Detectar marcadores de COMENTÁRIO: [COMENTÁRIO] ou > COMENTÁRIO ou = COMENTÁRIO ou COMENTÁRIO:
    // REGRA CRÍTICA: NUNCA criar novo bloco, apenas ativar modo de comentário
    if (/^\[COMENT[AÁ]RIO\]/i.test(trimmedLine) || 
        /^>\s*COMENT[AÁ]RIO\s*$/i.test(trimmedLine) ||
        /^=\s*COMENT[AÁ]RIO\s*$/i.test(trimmedLine) ||
        /^COMENT[AÁ]RIO\s*:?\s*$/i.test(trimmedLine)) {
      _log('[TAG_MODE] → COMENTÁRIO (marcador detectado, NÃO cria bloco):', trimmedLine);
      inCommentTagMode = true;
      inTrainingTagMode = false;
      // NÃO fazer continue aqui se não tiver bloco - garantir que bloco existe
      if (!currentBlock) {
        // Se não há bloco, criar um vazio para receber os comentários
        // Isso é raro mas pode acontecer se o texto começar com "> COMENTÁRIO"
        currentBlock = createNewBlock('', true);
        isInsideBlock = true;
      }
      continue;
    }
    
    // Detectar linhas que começam com ">" (conteúdo de comentário)
    // Estas linhas vão direto para coachNotes do bloco atual
    // REGRA: ">" com ou sem espaço = comentário
    if (/^>/.test(trimmedLine)) {
      const commentContent = trimmedLine.replace(/^>\s*/, '').trim();
      if (commentContent && currentBlock) {
        _log('[COMMENT_LINE] Linha ">" vai para coachNotes:', commentContent);
        currentBlock.coachNotes.push(commentContent);
        currentBlock.rawLines.push(trimmedLine);
      } else if (commentContent && !currentBlock) {
        // Se não há bloco atual, criar um para receber o comentário
        currentBlock = createNewBlock('', true);
        isInsideBlock = true;
        currentBlock.coachNotes.push(commentContent);
        currentBlock.rawLines.push(trimmedLine);
        _log('[COMMENT_LINE] Criado bloco vazio para comentário:', commentContent);
      }
      continue;
    }
    
    // Reset de modo ao encontrar novo bloco ou dia
    // (handled below when detecting day/heading)
    
    // Separador explícito ⸻ ou variações (---, ———) → fim do bloco atual
    if (isBlockSeparator(line)) {
      _log('[PARSER] Separador de bloco detectado:', line);
      saveCurrentBlock();
      continue;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ORDEM FIXA DE CLASSIFICAÇÃO (MVP0)
    // 1. DAY_MARKER
    // 2. REST_DAY_CANDIDATE (apenas se hasSeenValidHeading === false)
    // 3. OPTIONAL_MARKER
    // 4. HEADING_CANDIDATE
    // 5. IN_BLOCK_REST_INSTRUCTION
    // 6. EXERCISE_LINE / TEXT_LINE
    // ════════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. DAY_MARKER: Detectar dia da semana
    // ─────────────────────────────────────────────────────────────────────────────
    const detectedDay = detectDay(line);
    if (detectedDay && isUpperCaseLine(line)) {
      // Salvar bloco atual antes de trocar de dia
      saveCurrentBlock();
      
      hasExplicitDay = true;
      currentDay = detectedDay;
      currentOptional = false;
      isInsideBlock = false;
      hasSeenValidHeading = false; // RESET: Novo dia, nenhum heading visto ainda
      // MVP0 FIX: Reset modos de tag ao mudar de dia
      inCommentTagMode = false;
      inTrainingTagMode = false;
      
      // Criar nova entrada de dia
      currentDayEntry = result.days.find(d => d.day === detectedDay) || null;
      if (!currentDayEntry) {
        currentDayEntry = { day: detectedDay, blocks: [], alerts: [] };
        result.days.push(currentDayEntry);
      }
      currentBlock = null;
      _log('[PARSER] DAY_MARKER:', line, '→', detectedDay);
      continue;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // PRIORIDADE 1: IN_BLOCK_REST_INSTRUCTION — Descanso técnico (NUNCA afeta estrutura)
    // ─────────────────────────────────────────────────────────────────────────────
    // REGRA ABSOLUTA: Se a linha contém "Descanso" + tempo/número, é SEMPRE
    // instrução de intervalo, NUNCA afeta dia/bloco. Verificado PRIMEIRO!
    // ─────────────────────────────────────────────────────────────────────────────
    if (isRestInstructionLineGlobal(line)) {
      _log('[IN_BLOCK_REST] "' + line + '" → nota/metadado do bloco');
      _log('[IN_BLOCK_REST]   CONTEXT = "inside_block"');
      _log('[IN_BLOCK_REST]   EFFECT = "badge_or_note_only"');
      _log('[IN_BLOCK_REST]   day.isRestDay stays = false');
      _log('[IN_BLOCK_REST]   block.type unchanged');
      _log('[IN_BLOCK_REST]   hasSeenValidHeading =', hasSeenValidHeading);
      
      // Tratar como conteúdo do bloco atual
      if (currentBlock) {
        currentBlock.instructions.push(line);
        currentBlock.rawLines.push(line);
      } else {
        // Criar bloco vazio se necessário
        currentBlock = createNewBlock('', true);
        currentBlock.instructions.push(line);
        currentBlock.rawLines.push(line);
        isInsideBlock = true;
      }
      // NÃO fechar bloco, NÃO criar novo bloco, NÃO alterar estado do dia
      continue;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // PRIORIDADE 2: REST_DAY_CANDIDATE — "Descanso" puro (só se nenhum bloco ainda)
    // ─────────────────────────────────────────────────────────────────────────────
    // REGRA: Só sugere descanso se:
    // - Linha é "Descanso" puro (sem tempo/número)
    // - hasSeenValidHeading === false
    // - Nenhum bloco foi criado ainda
    // RESULTADO: day.restSuggestion = true (NUNCA day.isRestDay = true)
    // ─────────────────────────────────────────────────────────────────────────────
    if (isRestDayCandidateLine(line) && !hasSeenValidHeading && !currentBlock) {
      _log('[REST_DAY_CANDIDATE] "' + line + '" → sugestão apenas');
      _log('[REST_DAY_CANDIDATE]   hasSeenValidHeading =', hasSeenValidHeading);
      _log('[REST_DAY_CANDIDATE]   autoApplied = false');
      
      // Garantir que temos entrada de dia
      if (!currentDayEntry && currentDay) {
        currentDayEntry = { day: currentDay, blocks: [], alerts: [] };
        result.days.push(currentDayEntry);
      }
      
      // Marcar SUGESTÃO (NUNCA isRestDay automaticamente!)
      if (currentDayEntry) {
        currentDayEntry.restSuggestion = true;
        currentDayEntry.restSuggestionReason = 'Encontrado "Descanso" no início do dia (sem blocos)';
      }
      
      // NÃO criar bloco para "Descanso" puro - continuar processando
      // Próximas linhas podem ter "Opcional:" etc.
      continue;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // PRIORIDADE 3: OPTIONAL_MARKER — "Opcional:" nunca vira bloco
    // ─────────────────────────────────────────────────────────────────────────────
    // REGRA ABSOLUTA: "Opcional" é apenas marcador, NUNCA cria bloco
    // As linhas seguintes serão marcadas com flag OPTIONAL
    // ─────────────────────────────────────────────────────────────────────────────
    if (isOptionalMarkerLine(line)) {
      _log('[OPTIONAL_MARKER] "' + line + '" → currentOptional=true (nunca vira bloco)');
      currentOptional = true;
      // NÃO criar bloco - "Opcional" é apenas marcador
      continue;
    }

    // REGRA: FORMAT LINES (EMOM, AMRAP, etc.) NUNCA abrem novo bloco
    if (isFormatLine(line)) {
      if (!currentBlock) {
        currentBlock = createNewBlock('', true);
        currentBlock.formatDisplay = extractFormatFromLine(line);
        currentBlock.type = 'conditioning';
        currentBlock.format = detectFormat(line);
        isInsideBlock = true;
      }
      currentBlock.instructions.push(line);
      currentBlock.rawLines.push(line);
      continue;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // MVP0 PATCH: DETECTAR MISTURA TREINO + COMENTÁRIO (ESTRUTURA INVÁLIDA)
    // ════════════════════════════════════════════════════════════════════════════
    // Moved here AFTER all structural early-exits (separator, day, rest, optional, format)
    // to avoid running ~30 regex on lines already classified
    // ════════════════════════════════════════════════════════════════════════════
    if (!inCommentTagMode && !inTrainingTagMode) {
      const hasMeasure = hasMeasurableStimulus(line);
      const hasSubjective = isSubjectiveLine(line);
      if (hasMeasure && hasSubjective) {
        const warningMsg = `Linha ${lineNumber}: "${line.substring(0, 50)}${line.length > 50 ? '...' : ''}" - Mistura treino + comentário. Separe em TREINO: e COMENTÁRIO:`;
        _log('[STRUCTURE_WARNING]', warningMsg);
        result.structureWarnings?.push(warningMsg);
        if (currentDayEntry) {
          currentDayEntry.alerts.push('Estrutura inválida: mistura de treino + comentário detectada');
        }
      }
    }

    // MVP0 PATCH D: Lazy evaluation — isHeading only computed here, isExercise not needed (inline regex used below)
    const isHeading = isHeadingLineInLoop(line);
    _log('[PARSER DEBUG]', {
      linhaOriginal: line,
      isHeadingLine: isHeading,
      currentOptional,
      isInsideBlock,
      hasSeenValidHeading,
      blockTitleAtual: currentBlock?.title || '(sem bloco)',
    });
    
    // ─────────────────────────────────────────────────────────────────────────────
    // 4. HEADING_CANDIDATE: ÚNICA forma de transição de bloco
    // ─────────────────────────────────────────────────────────────────────────────
    if (isHeading) {
      _log('[HEADING] "' + line + '" createdBlock=true');
      _log('[BLOCK_START] Novo bloco iniciado por heading:', line);
      saveCurrentBlock();
      currentBlock = createNewBlock(line);
      isInsideBlock = true;
      hasSeenValidHeading = true; // MARCAR: Já vimos um heading neste dia
      continue;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // FUZZY MATCH: Detectar typos em títulos de bloco (ex: "ANRAP" → "AMRAP")
    // Se fuzzy match encontra um match, TRATA como heading (separa bloco)
    // mas também gera um warning para o coach corrigir
    // ════════════════════════════════════════════════════════════════════════════
    if (!isInsideBlock || (line.length <= 40 && !/^\d/.test(line.trim()) && line.split(/\s+/).length <= 4)) {
      const fuzzyResult = fuzzyMatchHeading(line);
      if (fuzzyResult) {
        _log('[FUZZY_HEADING] "' + line + '" → sugestão: "' + fuzzyResult.suggestion + '"');
        result.typoWarnings = result.typoWarnings || [];
        result.typoWarnings.push({
          line: line.trim(),
          suggestion: fuzzyResult.suggestion,
          lineNumber: lineNumber,
        });
        // Tratar como heading para separar blocos
        saveCurrentBlock();
        currentBlock = createNewBlock(line);
        isInsideBlock = true;
        hasSeenValidHeading = true;
        continue;
      }
    }

    // Detectar título de bloco (linha em maiúsculas que não é dia E não é format_line E não é estrutura **)
    // MVP0: Também é uma transição válida de bloco
    // MVP0 FIX: Estruturas entre ** ** NUNCA são títulos de bloco
    if (isUpperCaseLine(line) && line.length > 3 && !isFormatLine(line) && !/^\*\*.*\*\*$/.test(line.trim())) {
      _log('[PARSER] Título MAIÚSCULO detectado:', line);
      _log('[BLOCK_START] Novo bloco iniciado por título maiúsculo:', line);
      saveCurrentBlock();
      currentBlock = createNewBlock(line);
      isInsideBlock = true;
      hasSeenValidHeading = true; // MARCAR: Título maiúsculo também conta como heading
      continue;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // MVP0 PROTEÇÃO ANTI-COLAPSO: SE ESTAMOS DENTRO DE UM BLOCO, TUDO É CONTEÚDO
    // ════════════════════════════════════════════════════════════════════════════
    // Se isInsideBlock === true:
    // - TODAS as linhas subsequentes pertencem ao bloco atual
    // - NÃO criar novos blocos
    // - NÃO resetar estado
    // EXCETO se um NOVO heading válido for detectado (tratado acima)
    // ════════════════════════════════════════════════════════════════════════════
    
    if (isInsideBlock && currentBlock) {
      // ════════════════════════════════════════════════════════════════════════════
      // PRESERVAR TEXTO BRUTO: Toda linha que entra no bloco é registrada em rawLines
      // ════════════════════════════════════════════════════════════════════════════
      currentBlock.rawLines.push(line);
      
      // ════════════════════════════════════════════════════════════════════════════
      // MVP0 FIX: TAGS SÃO FONTE DE VERDADE
      // Se inCommentTagMode=true, TODA linha vai para coachNotes (NUNCA treino)
      // ════════════════════════════════════════════════════════════════════════════
      if (inCommentTagMode) {
        _log('[TAG_SPLIT] Linha vai para COMENTÁRIO (inCommentTagMode):', line.substring(0, 50));
        currentBlock.coachNotes.push(line);
        continue;
      }
      
      // Linha de exercício (começa com número ou marcador)
      if (/^[-•*]?\s*\d/.test(line)) {
        const item = parseExerciseLine(line);
        if (item) {
          currentBlock.items.push(item);
          if (item.isWeightAlert && currentDayEntry) {
            const alertMsg = `Carga "${item.weight}" detectada - será autorregulada pelo sistema`;
            if (!currentDayEntry.alerts.includes(alertMsg)) {
              currentDayEntry.alerts.push(alertMsg);
            }
          } else if (item.isWeightAlert) {
            result.alerts.push(`Carga "${item.weight}" detectada - será autorregulada pelo sistema`);
          }
          continue;
        }
      }
      
      // ════════════════════════════════════════════════════════════════════════════
      // DETECÇÃO: "Nx" sozinho (rounds não estruturados)
      // Preserva como conteúdo, mas avisa o coach para usar **N ROUNDS**
      // ════════════════════════════════════════════════════════════════════════════
      const standaloneRoundsMatch = line.trim().match(/^(\d+)\s*x\s*$/i);
      if (standaloneRoundsMatch) {
        const n = standaloneRoundsMatch[1];
        result.typoWarnings = result.typoWarnings || [];
        result.typoWarnings.push({
          line: line.trim(),
          suggestion: `**${n} ROUNDS**`,
          lineNumber: lineNumber,
        });
      }

      // Todo o resto é conteúdo do bloco
      if (isTrainingStimulus(line) || isPrescriptionLine(line)) {
        currentBlock.instructions.push(line);
        if (/\bopcional\b/i.test(line)) {
          currentBlock.optional = true;
        }
        if (currentBlock.type === 'conditioning' && isPrescriptionLine(line)) {
          currentBlock.type = inferPrescriptionType(line);
        }
      } else if (isInstructionLine(line)) {
        currentBlock.instructions.push(line);
      } else if (!currentBlock.instruction && line.length < 80 && !/\d/.test(line)) {
        currentBlock.instruction = line;
      } else {
        currentBlock.instructions.push(line);
      }
      continue;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // FALLBACK: NÃO ESTAMOS DENTRO DE UM BLOCO — CRIAR NOVO BLOCO
    // ════════════════════════════════════════════════════════════════════════════
    // Detectar linha de exercício (começa com número ou marcador)
    if (/^[-•*]?\s*\d/.test(line)) {
      const item = parseExerciseLine(line);
      
      if (item) {
        if (!currentBlock) {
          currentBlock = createNewBlock('', true);
          isInsideBlock = true;
          _log('[BLOCK_START] Novo bloco iniciado por exercício (sem heading)');
        }
        
        currentBlock.items.push(item);
        currentBlock.rawLines.push(line);
        
        if (item.isWeightAlert && currentDayEntry) {
          const alertMsg = `Carga "${item.weight}" detectada - será autorregulada pelo sistema`;
          if (!currentDayEntry.alerts.includes(alertMsg)) {
            currentDayEntry.alerts.push(alertMsg);
          }
        } else if (item.isWeightAlert) {
          result.alerts.push(`Carga "${item.weight}" detectada - será autorregulada pelo sistema`);
        }
        
        continue;
      }
    }

    // REGRA PRINCIPAL: Todo texto abaixo de um BLOCO pertence ao BLOCO
    if (currentBlock) {
      currentBlock.rawLines.push(line);
      
      // ════════════════════════════════════════════════════════════════════════════
      // MVP0 FIX: TAGS SÃO FONTE DE VERDADE (fallback)
      // Se inCommentTagMode=true, TODA linha vai para coachNotes (NUNCA treino)
      // ════════════════════════════════════════════════════════════════════════════
      if (inCommentTagMode) {
        _log('[TAG_SPLIT] Linha vai para COMENTÁRIO (fallback, inCommentTagMode):', line.substring(0, 50));
        currentBlock.coachNotes.push(line);
        continue;
      }
      
      if (isTrainingStimulus(line) || isPrescriptionLine(line)) {
        currentBlock.instructions.push(line);
        if (/\bopcional\b/i.test(line)) {
          currentBlock.optional = true;
        }
        if (currentBlock.type === 'conditioning' && isPrescriptionLine(line)) {
          currentBlock.type = inferPrescriptionType(line);
        }
      } else if (isInstructionLine(line)) {
        currentBlock.instructions.push(line);
      } else if (!currentBlock.instruction && line.length < 80 && !/\d/.test(line)) {
        currentBlock.instruction = line;
      } else {
        currentBlock.instructions.push(line);
      }
    } else {
      if (isTrainingStimulus(line) || isPrescriptionLine(line)) {
        const isOptional = /\bopcional\b/i.test(line);
        const inferredType = inferPrescriptionType(line);
        
        const blockTitle = isOptional ? 'Opcional' : '';
        currentBlock = createNewBlock(blockTitle);
        currentBlock.type = inferredType;
        currentBlock.instructions.push(line);
        currentBlock.rawLines.push(line);
        currentBlock.optional = isOptional;
        isInsideBlock = true;
        _log('[BLOCK_START] Novo bloco iniciado por estímulo/prescrição');
      } else {
        currentBlock = createNewBlock('');
        currentBlock.rawLines.push(line);
        if (isInstructionLine(line)) {
          currentBlock.instructions.push(line);
        } else {
          currentBlock.instruction = line;
        }
        isInsideBlock = true;
        _log('[BLOCK_START] Novo bloco iniciado por conteúdo genérico');
      }
    }
  }

  // Salvar último bloco pendente
  saveCurrentBlock();

  // Validações finais
  if (result.days.length === 0) {
    result.errors.push('Nenhum treino válido encontrado');
  }

  let totalBlocks = 0;
  let hasDayNull = false;
  const headingsList: string[] = [];
  
  // ════════════════════════════════════════════════════════════════════════════
  // MVP0 AUDITORIA: LOGS DETALHADOS DE DESCANSO
  // ════════════════════════════════════════════════════════════════════════════
  _log('\n[AUDIT] ═══════════════════════════════════════════════════════════════');
  _log('[AUDIT] AUDITORIA DE DESCANSO — INÍCIO');
  _log('[AUDIT] ═══════════════════════════════════════════════════════════════\n');
  
  for (const day of result.days) {
    totalBlocks += day.blocks.length;
    // Coletar títulos dos headings para log
    day.blocks.forEach(b => {
      if (b.title) headingsList.push(b.title);
    });
    if (day.day === null) {
      hasDayNull = true;
    }
    
    // ════════════════════════════════════════════════════════════════════════════
    // MVP0 AUDITORIA: Log detalhado por DIA
    // ════════════════════════════════════════════════════════════════════════════
    const dayLabel = day.day || 'DIA_DESCONHECIDO';
    _log('[AUDIT] ─────────────────────────────────────────────────────────────');
    _log('[AUDIT] DIA:', dayLabel.toUpperCase());
    _log('[AUDIT]   • day.isRestDay =', day.isRestDay ?? false);
    _log('[AUDIT]   • day.restSuggestion =', day.restSuggestion ?? false);
    _log('[AUDIT]   • day.restSuggestionReason =', day.restSuggestionReason ?? '(nenhum)');
    _log('[AUDIT]   • blocksCount =', day.blocks.length);
    _log('[AUDIT]   • blockTitles =', JSON.stringify(day.blocks.map(b => b.title || '(sem título)')));
    
    // ════════════════════════════════════════════════════════════════════════════
    // MVP0 AUDITORIA: Log detalhado por BLOCO
    // ════════════════════════════════════════════════════════════════════════════
    for (let blockIdx = 0; blockIdx < day.blocks.length; blockIdx++) {
      const block = day.blocks[blockIdx];
      
      // Detectar linhas de descanso dentro do bloco
      const restLinesInBlock: string[] = [];
      const allBlockContent = [
        block.instruction || '',
        ...block.instructions,
        ...block.coachNotes,
        ...block.items.map(i => `${i.quantity} ${i.unit} ${i.movement}`)
      ];
      
      for (const contentLine of allBlockContent) {
        const lower = contentLine.toLowerCase().trim();
        // Padrões de descanso dentro de bloco
        if (/descanso\s+\d+/i.test(lower) || 
            /descansar/i.test(lower) ||
            /^rest\s+\d+/i.test(lower) ||
            /descanso\s*['"'']+/i.test(lower)) {
          restLinesInBlock.push(contentLine);
        }
      }
      
      _log('[AUDIT]   └─ BLOCO', blockIdx + 1, ':');
      _log('[AUDIT]       • blockTitle =', block.title || '(sem título)');
      _log('[AUDIT]       • blockType =', block.type || '(sem tipo)');
      _log('[AUDIT]       • restLinesDetected =', JSON.stringify(restLinesInBlock));
      _log('[AUDIT]       • restLinesDestination =', restLinesInBlock.length > 0 ? 'instructions (nota/metadado)' : '(nenhuma)');
      _log('[AUDIT]       • didRestLineAffectHeadingDetection = false');
      
      // ASSERT: Se encontrou linhas de descanso intra-bloco, logar EFFECT
      for (const restLine of restLinesInBlock) {
        _log('[AUDIT]       ▶ REST_LINE_FOUND:', JSON.stringify(restLine));
        _log('[AUDIT]         CONTEXT = "inside_block"');
        _log('[AUDIT]         EFFECT = "badge_or_note_only"');
        _log('[AUDIT]         day.isRestDay stays =', day.isRestDay ?? false, '(blocos existem)');
        _log('[AUDIT]         block.type unchanged =', block.type || '(sem tipo)');
      }
    }
    
    // ════════════════════════════════════════════════════════════════════════════
    // MVP0: REGRA SOBERANA — Dias de descanso NÃO geram warnings/erros
    // ════════════════════════════════════════════════════════════════════════════
    if (day.isRestDay) {
      _log('[AUDIT]   ✓ Dia é DESCANSO - ignorando validações de WOD/categoria');
      // Dia de descanso válido, sem exigências
      continue;
    }
    
    if (day.blocks.length === 0 && day.day !== null) {
      result.warnings.push(`${getDayName(day.day as DayOfWeek)} sem blocos de treino`);
    }
    
    // Verificar se tem WOD principal definido - alerta no nível do dia
    // REGRA: Se TODOS os blocos são opcionais, não exige WOD principal
    const allBlocksOptional = day.blocks.every(b => b.optional);
    const hasMainWodInDay = day.blocks.some(b => b.isMainWod);
    
    if (!hasMainWodInDay && day.blocks.length > 0 && !allBlocksOptional) {
      day.alerts.push('Nenhum WOD principal definido');
    }
  }
  
  _log('\n[AUDIT] ═══════════════════════════════════════════════════════════════');
  _log('[AUDIT] AUDITORIA DE DESCANSO — FIM');
  _log('[AUDIT] ═══════════════════════════════════════════════════════════════\n');

  if (totalBlocks === 0) {
    result.errors.push('Nenhum bloco de treino identificado');
  }

  // Marcar se precisa selecionar dia
  if (hasDayNull || !hasExplicitDay) {
    result.needsDaySelection = true;
  }

  result.success = result.errors.length === 0;
  
  // MVP0: Log final para debug do pipeline
  _log('[PARSER] === parseStructuredText FINALIZADO ===');
  _log('[PARSER] Resultado:', {
    success: result.success,
    totalDays: result.days.length,
    days: result.days.map(d => ({
      day: d.day,
      blocksCount: d.blocks.length,
      blocks: d.blocks.map((b, i) => ({
        index: i,
        title: b.title || `(vazio → fallback UI "Bloco ${i+1}")`,
        type: b.type || '(categoria não definida)',
        isMainWod: b.isMainWod,
        linesCount: b.lines?.length || 0,
        itemsCount: b.items?.length || 0,
      })),
    })),
    errors: result.errors,
    warnings: result.warnings,
  });
  
  // ════════════════════════════════════════════════════════════════════════════
  // PÓS-PROCESSAMENTO: TABATA DEFAULTS INTELIGENTES
  // ════════════════════════════════════════════════════════════════════════════
  // Se um bloco tem format === 'tabata' e NÃO tem duração definida pelo coach,
  // injeta o default clássico: 8 rounds × (20s work + 10s rest) = 4 min por exercício.
  // Se o coach definiu tempos explícitos, NÃO sobrescreve.
  // ════════════════════════════════════════════════════════════════════════════
  for (const day of result.days) {
    for (const block of day.blocks) {
      if (block.format === 'tabata') {
        // Verificar se o coach definiu tempos explícitos no conteúdo do bloco
        const blockText = (block.rawLines || []).join(' ').toLowerCase();
        const hasExplicitTime = /\d+\s*(?:min|minutos?|'|"|seg|segundos?|s\b)/i.test(blockText)
          && !/\btabata\b/i.test(blockText.replace(/\btabata\b/gi, '')); // Ignorar a própria palavra "tabata"
        
        // Verificar se coach especificou work/rest customizado (ex: "30/15", "30s/15s")
        const hasCustomWorkRest = /\d+\s*\/\s*\d+/.test(blockText);
        
        if (!hasExplicitTime && !hasCustomWorkRest) {
          // Sem tempos explícitos → aplicar default clássico
          if (!block.formatDisplay) {
            block.formatDisplay = 'Tabata (8x 20s/10s)';
          }
          _log('[PARSER] Tabata default aplicado ao bloco:', block.title);
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MVP0: LOG FINAL DE VALIDAÇÃO (blocksCount e headingsList por dia)
  // ════════════════════════════════════════════════════════════════════════════
  for (const day of result.days) {
    const dayLabel = day.day || 'DESCONHECIDO';
    const dayHeadings = day.blocks.map(b => b.title).filter(Boolean);
    _log(`[PARSER] day=${dayLabel.toUpperCase()} blocksCount=${day.blocks.length} headingsList=${JSON.stringify(dayHeadings)}`);
  }
  
  return result;
}

// ============================================
// CONVERSÃO PARA DayWorkout[]
// ============================================

export function parsedToDayWorkouts(parsed: ParseResult, selectedDay?: DayOfWeek): DayWorkout[] {
  return parsed.days.map(day => ({
    // Use selected day if the parsed day is null
    day: (day.day || selectedDay || 'seg') as DayOfWeek,
    stimulus: '',
    estimatedTime: 60,
    blocks: day.blocks.map((block, idx) => {
      const workoutBlock = {
        id: `${day.day || selectedDay || 'new'}-${idx}-${Date.now()}`,
        type: block.type,
        title: block.title,
        content: formatBlockContent(block),
        isMainWod: block.isMainWod || undefined,
        isBenchmark: block.isBenchmark || undefined,
        // MVP0 CORREÇÃO: Passar coachNotes como campo separado (fonte única)
        coachNotes: block.coachNotes && block.coachNotes.length > 0 ? block.coachNotes : undefined,
        // PRESERVAR TEXTO BRUTO: rawLines → WorkoutBlock.lines para exibição fiel
        lines: block.rawLines && block.rawLines.length > 0 ? block.rawLines : undefined,
      };
      
      // LOG de verificação
      _log('[CONVERT_BLOCK] parsedToDayWorkouts:', {
        title: workoutBlock.title?.substring(0, 30),
        contentHasComentarioTag: workoutBlock.content.includes('[COMENTÁRIO]'),
        coachNotesLength: workoutBlock.coachNotes?.length || 0,
      });
      
      return workoutBlock;
    }),
    isRestDay: day.isRestDay || false, // MVP0: Preservar flag de descanso
  }));
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MVP0: formatBlockContent — APENAS TREINO (coachNotes é fonte separada)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * REGRA ABSOLUTA (CORREÇÃO DEFINITIVA):
 * - block.content = APENAS treino executável
 * - block.coachNotes = APENAS comentários (fonte única, NÃO serializar aqui)
 * - NUNCA injetar [COMENTÁRIO] no content
 * - UI deve ler coachNotes diretamente, não extrair do content
 */
function formatBlockContent(block: ParsedBlock): string {
  // ════════════════════════════════════════════════════════════════════════════
  // CORREÇÃO: Usar rawLines para preservar a intercalação original do coach
  // (ex: "2 ROUNDS" → exercícios → "2 ROUNDS" → exercícios)
  // Antes: concatenava instructions + items separadamente, perdendo a ordem
  // ════════════════════════════════════════════════════════════════════════════
  
  // Se temos rawLines, usá-las como fonte de verdade para a ordem
  if (block.rawLines && block.rawLines.length > 0) {
    // Filtrar linhas vazias e comentários (coachNotes são fonte separada)
    const contentLines = block.rawLines.filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      // Não incluir comentários (começam com ">") — eles vão para coachNotes
      if (trimmed.startsWith('>')) return false;
      // Não incluir o título do bloco (já está em block.title)
      // O título é tipicamente a primeira rawLine e corresponde ao block.title
      return true;
    });
    
    // Remover a primeira linha se ela corresponder ao título do bloco
    if (contentLines.length > 0 && block.title) {
      const firstNorm = contentLines[0].replace(/\*\*/g, '').trim().toLowerCase();
      const titleNorm = block.title.replace(/\*\*/g, '').trim().toLowerCase();
      if (firstNorm === titleNorm) {
        contentLines.shift();
      }
    }
    
    const trainContent = contentLines.join('\n').trim();
    if (trainContent) {
      _log('[SAVE_BLOCK] formatBlockContent (rawLines path):', {
        title: block.title?.substring(0, 30),
        rawLinesCount: block.rawLines.length,
        contentLinesCount: contentLines.length,
      });
      return trainContent;
    }
  }
  
  // Fallback: construir a partir de instructions + items (dados antigos sem rawLines)
  const trainParts: string[] = [];
  
  if (block.instruction) {
    trainParts.push(block.instruction);
  }
  
  if (block.instructions && block.instructions.length > 0) {
    trainParts.push(block.instructions.join('\n'));
  }
  
  const itemsText = block.items
    .map(item => {
      let base = `${item.quantity} ${item.unit} ${item.movement}`;
      if (item.weight) {
        base += ` @ ${item.weight}`;
      }
      return item.notes ? `${base} (${item.notes})` : base;
    })
    .join('\n');
  
  if (itemsText) {
    trainParts.push(itemsText);
  }
  
  const trainContent = trainParts.filter(p => p.trim()).join('\n').trim();

  // ════════════════════════════════════════════════════════════════════════════
  // MVP0 CORREÇÃO DEFINITIVA: NÃO INJETAR coachNotes NO content
  // coachNotes é fonte única separada, UI lê direto do campo coachNotes
  // ════════════════════════════════════════════════════════════════════════════
  // LOG de verificação (temporário)
  const hasCoachNotes = block.coachNotes && block.coachNotes.length > 0;
  _log('[SAVE_BLOCK] formatBlockContent:', {
    title: block.title?.substring(0, 30),
    contentHasComentarioTag: trainContent.includes('[COMENTÁRIO]'),
    coachNotesLength: block.coachNotes?.length || 0,
    hasCoachNotes,
  });
  
  // Retornar APENAS treino (sem tags [COMENTÁRIO])
  return trainContent;
}

// ============================================
// UTILITÁRIOS
// ============================================

export function getDayName(day: DayOfWeek): string {
  const names: Record<DayOfWeek, string> = {
    seg: 'Segunda',
    ter: 'Terça',
    qua: 'Quarta',
    qui: 'Quinta',
    sex: 'Sexta',
    sab: 'Sábado',
    dom: 'Domingo',
  };
  return names[day];
}

export function getFormatLabel(format: string): string {
  const labels: Record<string, string> = {
    for_time: 'For Time',
    amrap: 'AMRAP',
    emom: 'EMOM',
    rounds: 'Rounds',
    intervalos: 'Intervalos',
    tecnica: 'Técnica',
    tabata: 'Tabata',
    outro: 'Outro',
  };
  return labels[format] || format;
}

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    aquecimento: 'Aquecimento',
    forca: 'Força',
    conditioning: 'Conditioning',
    especifico: 'Específico',
    core: 'Core',
    corrida: 'Corrida',
    notas: 'Notas',
  };
  return labels[type] || type;
}

// ============================================
// MVP0: VALIDAÇÃO DE INPUT DO COACH — TRAVA ANTI-BURRO
// ============================================
// Valida se o texto do coach está estruturado corretamente.
// CERCA V1: Delimitação obrigatória [TREINO] / [COMENTÁRIO]
// ============================================

import {
  textUsesFenceFormat,
  validateFence,
  fenceErrorsToStructureIssues,
  FENCE_FORMAT_ERROR,
} from './fenceValidation';

export interface CoachInputValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiresTags: boolean; // Indica se o contexto exige tags [TREINO]/[COMENTÁRIO]
  issues: StructureIssue[]; // MVP0: Issues com severidade para mostrar no preview
  fenceErrors?: boolean; // CERCA V1: Indica se há erros de delimitador
}

/**
 * Detecta se uma linha contém tags [TREINO] ou [COMENTÁRIO]
 */
function hasTrainingTags(line: string): boolean {
  return /\[TREINO\]|\[COMENTÁRIO\]|\[COMENTARIO\]/i.test(line);
}

/**
 * Detecta se o texto completo usa formato de tags
 */
function textUsesTagFormat(text: string): boolean {
  return /\[TREINO\]/i.test(text);
}

/**
 * MVP0 CIRÚRGICO: Detecta se o contexto exige tags obrigatórias
 * SOMENTE quando há NARRATIVA detectada junto com medida.
 * 
 * NÃO exige tags para:
 * - "500m trote leve" (adjetivo simples, sem narrativa)
 * - "Corrida 45 min Zona 2" (estímulo puro)
 */
function contextRequiresTags(text: string): boolean {
  const lines = text.split('\n');
  
  // Só exige tags se houver pelo menos uma linha com narrativa + medida
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Se a linha tem tag, ignora
    if (hasTrainingTags(trimmed)) continue;
    
    // Só exige tags se tiver NARRATIVA + MEDIDA na mesma linha
    if (hasMeasurableStimulus(trimmed) && isNarrativeLine(trimmed)) {
      return true;
    }
  }
  
  return false;
}

/**
 * CERCA V1: Valida o input do coach com delimitadores obrigatórios.
 * 
 * REGRAS CERCA V1:
 * 1) [TREINO] é obrigatório em todo bloco
 * 2) [COMENTÁRIO] é obrigatório em todo bloco
 * 3) Se faltar delimitador, bloqueia publicação (não draft)
 * 4) Pelo menos 1 âncora válida em cada zona de treino
 * 5) Nenhum texto humano/explicativo na zona de treino
 * 
 * PERMITIDO:
 * - "500m trote leve" (adjetivo simples OK)
 * - "Corrida contínua 45 min Zona 2" (estímulo puro)
 * 
 * BLOQUEADO (em [TREINO]):
 * - Texto de comentário/explicação
 * - Linhas sem âncora estruturada
 */
/**
 * Opções para validateCoachInput
 */
export interface ValidateCoachInputOptions {
  /** 
   * Se true, pula validação de fence (tags [TREINO]/[COMENTÁRIO]).
   * Usar para modo estruturado (UI) onde blocos não passam por texto.
   */
  isStructured?: boolean;
}

export function validateCoachInput(text: string, options?: ValidateCoachInputOptions): CoachInputValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const issues: StructureIssue[] = [];
  const lines = text.split('\n');
  
  const isStructured = options?.isStructured ?? false;
  
  // ════════════════════════════════════════════════════════════════════════════
  // GUARD: MODO STRUCTURED NUNCA PASSA POR FENCE
  // ════════════════════════════════════════════════════════════════════════════
  // Fence ([TREINO]/[COMENTÁRIO]) é EXCLUSIVA do modo IMPORT.
  // Modo STRUCTURED nunca passa por fence nem valida tags.
  // ════════════════════════════════════════════════════════════════════════════
  
  if (isStructured) {
    _log('[FENCE_GUARD] mode=edit | structured=true → fence IGNORADA');
    // Retorna validação vazia - blocos estruturados são validados pela UI
    return {
      isValid: true,
      errors: [],
      warnings: [],
      issues: [],
      requiresTags: false,
      fenceErrors: false,
    };
  }
  
  const usesTagFormat = textUsesTagFormat(text);
  let fenceErrors = false;
  
  _log('[FENCE_GUARD] mode=import | structured=false → fence ATIVA');
  
  // ════════════════════════════════════════════════════════════════════════════
  // CERCA V1: VALIDAÇÃO DETERMINÍSTICA COM DELIMITADORES
  // ════════════════════════════════════════════════════════════════════════════
  // Se o texto usa formato de cerca [TREINO]/[COMENTÁRIO], aplicar validação
  // completa. Se não usa, exigir que use (para publicação).
  // ════════════════════════════════════════════════════════════════════════════
  
  if (usesTagFormat) {
    // Validar com as regras da cerca
    const fenceResult = validateFence(text);
    
    if (!fenceResult.isValid) {
      fenceErrors = true;
      
      // Converter erros de cerca para issues
      const fenceIssues = fenceErrorsToStructureIssues(fenceResult);
      issues.push(...fenceIssues);
      
      // Adicionar erros legíveis
      for (const err of fenceResult.errors) {
        const dayPart = err.dayName ? ` (${err.dayName})` : '';
        const blockPart = err.blockTitle ? ` "${err.blockTitle}"` : '';
        errors.push(`${err.message}${blockPart}${dayPart}`);
      }
    }
    
    // Adicionar warnings da cerca
    for (const warn of fenceResult.warnings) {
      warnings.push(warn.message);
    }
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // VALIDAÇÃO LEGACY (quando não usa formato de cerca)
  // ════════════════════════════════════════════════════════════════════════════
  
  let hybridLineCount = 0;
  let inCommentSection = false;
  
  // MVP0: Rastrear qual dia estamos para incluir dayIndex no issue
  let currentDayIndex = -1;
  const dayPatterns = [
    /\bsegunda(?:-feira)?\b/i,
    /\bter[çc]a(?:-feira)?\b/i,
    /\bquarta(?:-feira)?\b/i,
    /\bquinta(?:-feira)?\b/i,
    /\bsexta(?:-feira)?\b/i,
    /\bs[aá]bado\b/i,
    /\bdomingo\b/i,
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // MVP0: Detectar mudança de dia para rastrear dayIndex
    for (let d = 0; d < dayPatterns.length; d++) {
      if (dayPatterns[d].test(line)) {
        currentDayIndex = d;
        break;
      }
    }
    
    // Se está em seção de comentário [COMENTÁRIO], não valida
    if (/^\[COMENT[ÁA]RIO\]/i.test(line)) {
      inCommentSection = true;
      continue;
    }
    if (/^\[TREINO\]/i.test(line)) {
      inCommentSection = false;
      continue;
    }
    if (inCommentSection) continue;
    
    // Se já usa tags, não precisa validar híbridos
    if (hasTrainingTags(line)) continue;
    
    // Detectar linha híbrida (mensurável + NARRATIVA)
    // NOTA: Adjetivos simples como "leve", "tranquilo" NÃO são narrativa!
    const hasMeasure = hasMeasurableStimulus(line);
    const hasNarrative = isNarrativeLine(line);
    
    if (hasMeasure && hasNarrative) {
      hybridLineCount++;
      const truncated = line.length > 60 ? line.substring(0, 60) + '...' : line;
      errors.push(`Linha ${i + 1}: "${truncated}" — Mistura treino + comentário.`);
      
      // MVP0: Adicionar issue com severidade ERROR para bloquear importação
      // Inclui dayIndex para navegação + lineText para exibição
      const cleanMeasure = line.split(',')[0]?.trim() || line;
      const commentPart = line.split(',').slice(1).join(',').trim() || 'Descreva a intenção aqui';
      
      // MVP0: Mapear dayIndex para nome do dia
      const dayNames = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];
      const dayName = currentDayIndex >= 0 ? dayNames[currentDayIndex] : undefined;
      
      // MVP0: Issues semânticos são WARNINGS (não bloqueiam draft, só publicação)
      issues.push({
        dayIndex: currentDayIndex >= 0 ? currentDayIndex : undefined,
        lineNumber: i + 1,
        lineText: line,
        message: dayName ? `Mistura treino + comentário — ${dayName}` : 'Mistura treino + comentário',
        severity: 'WARNING', // Alterado de ERROR para WARNING - permite salvar draft
      });
    }
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // MVP0: VALIDAÇÃO DE INTENSIDADE EM CARDIO LONGO (>= 60 min)
  // ════════════════════════════════════════════════════════════════════════════
  // REGRA: Se modalidade é cardio/corrida e duração >= 60 min,
  // intensidade DEVE estar no TREINO (não em comentário/notas).
  // Se não tiver, gera WARNING (não bloqueia publicação).
  // ════════════════════════════════════════════════════════════════════════════
  
  let inTrainingSection = !usesTagFormat; // Se não usa tags, assume tudo é treino
  let currentBlockTitle = '';
  let currentBlockContent: string[] = [];
  let currentBlockStartLine = 0;
  let lastDayIndex = -1;
  
  // Detectar blocos de cardio sem intensidade
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Detectar mudança de dia
    for (let d = 0; d < dayPatterns.length; d++) {
      if (dayPatterns[d].test(line)) {
        lastDayIndex = d;
        break;
      }
    }
    
    // Detectar seção de treino/comentário
    if (/^\[TREINO\]/i.test(line)) {
      inTrainingSection = true;
      continue;
    }
    if (/^\[COMENT[ÁA]RIO\]/i.test(line)) {
      inTrainingSection = false;
      continue;
    }
    
    // Detectar início de bloco (linha maiúscula que parece título)
    const isBlockTitle = line === line.toUpperCase() && 
                         line.length > 2 && 
                         /^[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]/.test(line) &&
                         !dayPatterns.some(p => p.test(line));
    
    if (isBlockTitle) {
      // Analisar bloco anterior antes de resetar
      if (currentBlockTitle && currentBlockContent.length > 0 && inTrainingSection) {
        validateCardioBlockIntensity(
          currentBlockTitle, 
          currentBlockContent, 
          currentBlockStartLine,
          lastDayIndex,
          warnings,
          issues
        );
      }
      
      // Iniciar novo bloco
      currentBlockTitle = line;
      currentBlockContent = [];
      currentBlockStartLine = i + 1;
    } else if (inTrainingSection && currentBlockTitle) {
      // Acumular conteúdo do bloco atual (apenas linhas de treino)
      currentBlockContent.push(line);
    }
  }
  
  // Validar último bloco
  if (currentBlockTitle && currentBlockContent.length > 0 && inTrainingSection) {
    validateCardioBlockIntensity(
      currentBlockTitle, 
      currentBlockContent, 
      currentBlockStartLine,
      lastDayIndex,
      warnings,
      issues
    );
  }
  
  // Contexto de descanso SEM estrutura clara
  const hasRestContext = /\b(?:descanso|opcional|day\s*off|rest\s*day|folga)\b/i.test(text.toLowerCase());
  const hasExecutableStimulus = lines.some(line => hasMeasurableStimulus(line.trim()));
  
  if (hasRestContext && hasExecutableStimulus && !usesTagFormat && errors.length === 0) {
    // Só avisa se houver narrativa detectada
    const hasNarrativeAnywhere = lines.some(line => isNarrativeLine(line.trim()));
    if (hasNarrativeAnywhere) {
      warnings.push('Este treino contém "Descanso/Opcional" com estímulo. Considere usar [TREINO] e [COMENTÁRIO] para separar.');
      issues.push({
        message: 'Contexto de descanso/opcional com estímulo sem separação clara',
        severity: 'WARNING',
      });
    }
  }
  
  const requiresTags = contextRequiresTags(text);
  const isValid = errors.length === 0;
  
  return {
    isValid,
    errors,
    warnings,
    requiresTags: requiresTags && !usesTagFormat,
    issues,
    fenceErrors, // CERCA V1: Indica se há erros de delimitador
  };
}

/**
 * MVP0: Valida se um bloco de cardio longo tem intensidade no TREINO
 * Gera WARNING se >= 60 min sem intensidade objetiva
 */
function validateCardioBlockIntensity(
  blockTitle: string,
  blockContent: string[],
  blockStartLine: number,
  dayIndex: number,
  warnings: string[],
  issues: StructureIssue[]
): void {
  const fullContent = blockContent.join(' ');
  const fullText = `${blockTitle} ${fullContent}`;
  
  // Verificar se é bloco de cardio
  if (!isCardioBlock('', blockTitle, fullContent)) {
    return;
  }
  
  // Calcular duração total do bloco
  let totalMinutes = 0;
  for (const line of blockContent) {
    const mins = extractDurationMinutes(line);
    if (mins !== null) {
      totalMinutes += mins;
    }
  }
  
  // Se duração < 60 min, não precisa de intensidade obrigatória
  if (totalMinutes < 60) {
    return;
  }
  
  // Verificar se tem intensidade nas linhas de TREINO
  let hasIntensity = false;
  for (const line of blockContent) {
    if (hasIntensityParameter(line)) {
      hasIntensity = true;
      break;
    }
  }
  
  // Verificar também no título
  if (hasIntensityParameter(blockTitle)) {
    hasIntensity = true;
  }
  
  // Se não tem intensidade, gerar WARNING
  if (!hasIntensity) {
    const dayNames = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];
    const dayName = dayIndex >= 0 ? dayNames[dayIndex] : undefined;
    
    const warningMsg = `Cardio longo (${totalMinutes} min) sem intensidade no TREINO${dayName ? ` — ${dayName}` : ''}: "${blockTitle}"`;
    warnings.push(warningMsg);
    
    issues.push({
      dayIndex: dayIndex >= 0 ? dayIndex : undefined,
      blockTitle: blockTitle,
      lineNumber: blockStartLine,
      message: '⚠️ Intensidade não informada no TREINO',
      severity: 'WARNING',
    });
  }
}

// ============================================
// TEMPLATE DE EXEMPLO (para referência interna)
// ============================================

export const TEMPLATE_EXAMPLE = `SEGUNDA

AQUECIMENTO

= TREINO
- 500 m Run Z2
- 2x10 Air Squats
- 10 Arm Circles

> COMENTÁRIO
> Foco em mobilidade


WOD

= TREINO
- AMRAP 20 min
- 5 Pull-ups
- 10 Push-ups
- 15 Air Squats

> COMENTÁRIO
> Manter ritmo constante


TERÇA

FORÇA

= TREINO
- 5x5 Back Squat @75%
- Rest 2:00 entre séries

> COMENTÁRIO
> Subir carga se PSE < 7`;

// ============================================
// MVP0: MODELO RECOMENDADO COM MARCADORES DETERMINÍSTICOS
// ============================================

export const RECOMMENDED_TEMPLATE = `= TREINO
- <modalidade> <duração/volume> <intensidade>
- <exercício> <séries x reps> <carga>

> COMENTÁRIO
> <observação/intenção>`;
