/**
 * fenceValidation.ts - Validação determinística de delimitadores TREINO/COMENTÁRIO
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * CERCA V1 — DELIMITAR TREINO vs COMENTÁRIO — MVP0
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * REGRAS ABSOLUTAS:
 * 1) [TREINO] é obrigatório em todo bloco
 * 2) [COMENTÁRIO] é obrigatório em todo bloco
 * 3) Tudo entre [TREINO] e [COMENTÁRIO] é zona de treino
 * 4) Tudo após [COMENTÁRIO] é zona de comentário
 * 5) Se faltar delimitador, BLOQUEIA publicação com erro claro
 * 
 * VALIDAÇÃO DA ZONA DE TREINO:
 * - Pelo menos 1 linha deve bater em uma âncora válida
 * - Linhas com texto humano/explicativo são bloqueadas
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { StructureIssue, IssueSeverity } from './structuredTextParser';

// ════════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════════

export interface FenceValidationResult {
  isValid: boolean;
  errors: FenceError[];
  warnings: FenceWarning[];
  blocks: ParsedFenceBlock[];
}

export interface FenceError {
  type: 'MISSING_TREINO' | 'MISSING_COMENTARIO' | 'MISSING_ANCHOR' | 'HUMAN_TEXT_IN_TREINO';
  blockTitle?: string;
  dayName?: string;
  lineNumber?: number;
  lineText?: string;
  message: string;
}

export interface FenceWarning {
  type: string;
  blockTitle?: string;
  dayName?: string;
  lineNumber?: number;
  message: string;
}

export interface ParsedFenceBlock {
  title: string;
  dayName?: string;
  dayIndex?: number;
  trainLines: string[];
  commentLines: string[];
  hasAnchor: boolean;
  humanTextLines: HumanTextLine[];
}

export interface HumanTextLine {
  lineNumber: number;
  text: string;
  reason: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// ÂNCORAS VÁLIDAS — REGRAS OBRIGATÓRIAS
// ════════════════════════════════════════════════════════════════════════════════
// Pelo menos 1 linha em trainLines[] deve bater em uma âncora válida

const ANCHOR_PATTERNS: RegExp[] = [
  // Tempo: 90 min, 10 min, 45'
  /^\d+\s*(?:min|minutos?|')\b/i,
  // Distância: 10 km, 500 m, 5km
  /^\d+\s*(?:km|m)\b/i,
  // Rounds: 5 Rounds, 3 rounds
  /^\d+\s*Rounds?\b/i,
  // Formatos estruturados: EMOM, AMRAP, For Time
  /^(?:EMOM|AMRAP|For\s*Time|RFT|Tabata)\b/i,
  // E2MOM, E3MOM, Every X min
  /^E\d+M(?:OM)?\b/i,
  /^Every\s+\d+/i,
  // Time cap
  /^Time\s*cap\b/i,
];

/**
 * Verifica se uma linha é uma âncora válida
 */
export function isAnchorLine(line: string): boolean {
  const trimmed = line.trim();
  return ANCHOR_PATTERNS.some(pattern => pattern.test(trimmed));
}

// ════════════════════════════════════════════════════════════════════════════════
// PADRÕES PERMITIDOS NA ZONA DE TREINO
// ════════════════════════════════════════════════════════════════════════════════

const ALLOWED_TRAINING_PATTERNS: RegExp[] = [
  // Zona de esforço: Zona 1, Zona 2, Z2
  /\bZona\s*[1-5]\b/i,
  /\bZ[1-5]\b/i,
  // PSE/RPE: PSE 8, RPE 7
  /\b(?:PSE|RPE)\s*\d+/i,
  // Cargas: 30/20 lb, 32kg, 24 kg
  /\d+(?:\/\d+)?\s*(?:lb|kg)\b/i,
  // Percentuais: 70%, 80-90%
  /\d+(?:\.\d+)?\s*%/,
  // FC/HR: FC máx, HR 150
  /\b(?:FC|HR)\b/i,
  // Estrutura curta: começa com número + palavra (15 agachamentos, 10 push-ups)
  /^\d+\s+\w+/,
  // Tempo explícito: 45'', 30 seg, 2:00
  /\d+\s*(?:''|seg|sec)\b/i,
  /\d+:\d{2}/,
  // Repetições/séries: 3x10, 5 sets, 8 reps
  /\d+\s*x\s*\d+/i,
  /\d+\s*(?:reps?|sets?|séries?|rodadas?)\b/i,
  // Movimentos com carga: Front Squat, Deadlift, Wall Balls
  /\b(?:Squat|Deadlift|Press|Clean|Snatch|Jerk|Row|Pull-?Up|Push-?Up|Burpee|Wall\s*Ball|Lunge|Jump|Carry|Sled|Farmer)\b/i,
  // Distâncias: 500m, 10km, 100m
  /\d+\s*(?:m|km)\b/i,
  // Tempos: 30 min, 45', 1h
  /\d+\s*(?:min|minutos?|'|h|hora)\b/i,
  // Unbroken, Sprint, Max
  /\b(?:Unbroken|Sprint|Max)\b/i,
  // Min X: (EMOM pattern)
  /^Min\s*\d+\s*:/i,
  // Alternating, Single, Double
  /\b(?:Alternating|Single|Double)\b/i,
];

/**
 * Verifica se uma linha é permitida na zona de treino
 */
function isAllowedTrainingLine(line: string): boolean {
  const trimmed = line.trim();
  
  // Linha vazia é permitida (ignorada)
  if (!trimmed) return true;
  
  // Verificar se bate em algum padrão permitido
  return ALLOWED_TRAINING_PATTERNS.some(pattern => pattern.test(trimmed));
}

// ════════════════════════════════════════════════════════════════════════════════
// DETECÇÃO DE TEXTO HUMANO/EXPLICATIVO
// ════════════════════════════════════════════════════════════════════════════════
// Se uma linha dentro de trainLines[] contiver frase humana/explicativa, BLOQUEAR

const HUMAN_TEXT_INDICATORS = [
  // Contém ponto final "."
  { test: (line: string) => /\.\s*$/.test(line.trim()) && line.trim().length > 15, reason: 'Contém ponto final (frase explicativa)' },
  // Contém mais de 12 palavras
  { test: (line: string) => line.trim().split(/\s+/).length > 12, reason: 'Mais de 12 palavras (texto explicativo)' },
  // Verbos típicos de comentário
  { test: (line: string) => /\b(?:aproveitar|registrar|objetivo|foco\s+em|se\s+estiver\s+bem|manter|priorizar|lembrar|evitar|cuidado|atenção)\b/i.test(line), reason: 'Contém verbo de comentário' },
  // Expressões de orientação
  { test: (line: string) => /\b(?:para\s+que|a\s+fim\s+de|visando|priorizando|focando|lembrando)\b/i.test(line), reason: 'Contém expressão de orientação' },
  // Frases com vírgula + explicação
  { test: (line: string) => /,\s*(?:bem|muito|bastante|para|pra|visando|focando|com\s+foco)/i.test(line), reason: 'Vírgula seguida de explicação' },
  // Expressões subjetivas
  { test: (line: string) => /\b(?:confortável|tranquilo|relaxado|suave|leve)\b/i.test(line) && /,/.test(line), reason: 'Adjetivo subjetivo com vírgula' },
];

/**
 * Detecta se uma linha contém texto humano/explicativo
 * Retorna null se OK, ou a razão do bloqueio
 */
function detectHumanText(line: string): string | null {
  const trimmed = line.trim();
  
  // Linha vazia é OK
  if (!trimmed) return null;
  
  // Se a linha é uma âncora ou padrão de treino claramente estruturado, não bloquear
  if (isAnchorLine(trimmed)) return null;
  
  // Verificar indicadores de texto humano
  for (const indicator of HUMAN_TEXT_INDICATORS) {
    if (indicator.test(trimmed)) {
      return indicator.reason;
    }
  }
  
  return null;
}

// ════════════════════════════════════════════════════════════════════════════════
// PARSER DE BLOCOS COM CERCA
// ════════════════════════════════════════════════════════════════════════════════

const DAY_PATTERNS = [
  { pattern: /\bsegunda(?:-feira)?\b/i, name: 'SEGUNDA', index: 0 },
  { pattern: /\bter[çc]a(?:-feira)?\b/i, name: 'TERÇA', index: 1 },
  { pattern: /\bquarta(?:-feira)?\b/i, name: 'QUARTA', index: 2 },
  { pattern: /\bquinta(?:-feira)?\b/i, name: 'QUINTA', index: 3 },
  { pattern: /\bsexta(?:-feira)?\b/i, name: 'SEXTA', index: 4 },
  { pattern: /\bs[aá]bado\b/i, name: 'SÁBADO', index: 5 },
  { pattern: /\bdomingo\b/i, name: 'DOMINGO', index: 6 },
];

/**
 * Detecta o dia da semana de uma linha
 */
function detectDay(line: string): { name: string; index: number } | null {
  const trimmed = line.trim();
  for (const dayDef of DAY_PATTERNS) {
    if (dayDef.pattern.test(trimmed)) {
      return { name: dayDef.name, index: dayDef.index };
    }
  }
  return null;
}

/**
 * Detecta se uma linha é título de bloco (linha em maiúsculas, não é dia)
 */
function isBlockTitle(line: string): boolean {
  const trimmed = line.trim();
  
  // Ignorar linhas vazias
  if (!trimmed) return false;
  
  // Ignorar se é dia da semana
  if (detectDay(trimmed)) return false;
  
  // Ignorar delimitadores
  if (/^\[(?:TREINO|COMENT[ÁA]RIO)\]/i.test(trimmed)) return false;
  
  // Título de bloco: linha em maiúsculas ou capitalizada, com letras
  // E que tenha pelo menos 3 caracteres
  if (trimmed.length < 3) return false;
  
  // Verificar se é uma linha que parece título (maiúsculas ou capitalizada)
  const isUpperCase = trimmed === trimmed.toUpperCase();
  const startsWithCapital = /^[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]/.test(trimmed);
  const hasLetters = /[a-zA-ZÀ-ÿ]/.test(trimmed);
  
  // Não deve começar com número (seria exercício)
  const startsWithNumber = /^\d/.test(trimmed);
  if (startsWithNumber) return false;
  
  return hasLetters && (isUpperCase || startsWithCapital) && trimmed.length >= 3;
}

/**
 * Extrai blocos com delimitadores [TREINO] e [COMENTÁRIO]
 * PARSING DETERMINÍSTICO — sem adivinhação
 */
export function parseBlocksWithFence(text: string): ParsedFenceBlock[] {
  const lines = text.split('\n');
  const blocks: ParsedFenceBlock[] = [];
  
  let currentDay: { name: string; index: number } | null = null;
  let currentBlockTitle = '';
  let currentTrainLines: string[] = [];
  let currentCommentLines: string[] = [];
  let inTrainingSection = false;
  let inCommentSection = false;
  let blockStartLine = 0;
  
  const flushBlock = () => {
    if (currentBlockTitle) {
      // Calcular se tem âncora
      const hasAnchor = currentTrainLines.some(line => isAnchorLine(line.trim()));
      
      // Detectar linhas com texto humano
      const humanTextLines: HumanTextLine[] = [];
      currentTrainLines.forEach((line, idx) => {
        const reason = detectHumanText(line);
        if (reason) {
          humanTextLines.push({
            lineNumber: blockStartLine + idx,
            text: line.trim(),
            reason,
          });
        }
      });
      
      blocks.push({
        title: currentBlockTitle,
        dayName: currentDay?.name,
        dayIndex: currentDay?.index,
        trainLines: [...currentTrainLines],
        commentLines: [...currentCommentLines],
        hasAnchor,
        humanTextLines,
      });
    }
    
    // Reset
    currentBlockTitle = '';
    currentTrainLines = [];
    currentCommentLines = [];
    inTrainingSection = false;
    inCommentSection = false;
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Detectar mudança de dia
    const dayDetected = detectDay(trimmed);
    if (dayDetected) {
      flushBlock();
      currentDay = dayDetected;
      continue;
    }
    
    // Detectar novo bloco (título)
    if (isBlockTitle(trimmed) && !inTrainingSection && !inCommentSection) {
      flushBlock();
      currentBlockTitle = trimmed;
      blockStartLine = i + 1;
      continue;
    }
    
    // Detectar [TREINO]
    if (/^\[TREINO\]/i.test(trimmed)) {
      inTrainingSection = true;
      inCommentSection = false;
      continue;
    }
    
    // Detectar [COMENTÁRIO]
    if (/^\[COMENT[ÁA]RIO\]/i.test(trimmed)) {
      inTrainingSection = false;
      inCommentSection = true;
      continue;
    }
    
    // Acumular linhas na seção correta
    if (inTrainingSection && currentBlockTitle) {
      currentTrainLines.push(trimmed);
    } else if (inCommentSection && currentBlockTitle) {
      currentCommentLines.push(trimmed);
    }
  }
  
  // Flush último bloco
  flushBlock();
  
  return blocks;
}

// ════════════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO PRINCIPAL — CERCA V1
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Valida texto do coach com regras de cerca determinísticas
 * 
 * REGRAS:
 * 1) [TREINO] é obrigatório em todo bloco
 * 2) [COMENTÁRIO] é obrigatório em todo bloco
 * 3) Pelo menos 1 âncora válida em cada zona de treino
 * 4) Nenhum texto humano/explicativo na zona de treino
 */
export function validateFence(text: string): FenceValidationResult {
  const errors: FenceError[] = [];
  const warnings: FenceWarning[] = [];
  const lines = text.split('\n');
  
  // Parse blocks
  const blocks = parseBlocksWithFence(text);
  
  // Detectar blocos que existem mas não têm delimitadores
  let currentDay: { name: string; index: number } | null = null;
  let currentBlockTitle = '';
  let hasTreeinoTag = false;
  let hasComentarioTag = false;
  let blockStartLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    // Detectar mudança de dia
    const dayDetected = detectDay(trimmed);
    if (dayDetected) {
      // Verificar bloco anterior se existia
      if (currentBlockTitle && (!hasTreeinoTag || !hasComentarioTag)) {
        if (!hasTreeinoTag) {
          errors.push({
            type: 'MISSING_TREINO',
            blockTitle: currentBlockTitle,
            dayName: currentDay?.name,
            lineNumber: blockStartLine,
            message: `Formato inválido. Todo bloco precisa conter [TREINO] e [COMENTÁRIO].`,
          });
        }
        if (!hasComentarioTag) {
          errors.push({
            type: 'MISSING_COMENTARIO',
            blockTitle: currentBlockTitle,
            dayName: currentDay?.name,
            lineNumber: blockStartLine,
            message: `Formato inválido. Todo bloco precisa conter [TREINO] e [COMENTÁRIO].`,
          });
        }
      }
      
      currentDay = dayDetected;
      currentBlockTitle = '';
      hasTreeinoTag = false;
      hasComentarioTag = false;
      continue;
    }
    
    // Detectar início de bloco
    if (isBlockTitle(trimmed) && !hasTreeinoTag && !hasComentarioTag) {
      // Verificar bloco anterior se existia
      if (currentBlockTitle && (!hasTreeinoTag || !hasComentarioTag)) {
        if (!hasTreeinoTag) {
          errors.push({
            type: 'MISSING_TREINO',
            blockTitle: currentBlockTitle,
            dayName: currentDay?.name,
            lineNumber: blockStartLine,
            message: `Formato inválido. Todo bloco precisa conter [TREINO] e [COMENTÁRIO].`,
          });
        }
        if (!hasComentarioTag) {
          errors.push({
            type: 'MISSING_COMENTARIO',
            blockTitle: currentBlockTitle,
            dayName: currentDay?.name,
            lineNumber: blockStartLine,
            message: `Formato inválido. Todo bloco precisa conter [TREINO] e [COMENTÁRIO].`,
          });
        }
      }
      
      currentBlockTitle = trimmed;
      blockStartLine = i + 1;
      hasTreeinoTag = false;
      hasComentarioTag = false;
      continue;
    }
    
    // Detectar tags
    if (/^\[TREINO\]/i.test(trimmed)) {
      hasTreeinoTag = true;
    }
    if (/^\[COMENT[ÁA]RIO\]/i.test(trimmed)) {
      hasComentarioTag = true;
    }
  }
  
  // Verificar último bloco
  if (currentBlockTitle && (!hasTreeinoTag || !hasComentarioTag)) {
    if (!hasTreeinoTag) {
      errors.push({
        type: 'MISSING_TREINO',
        blockTitle: currentBlockTitle,
        dayName: currentDay?.name,
        lineNumber: blockStartLine,
        message: `Formato inválido. Todo bloco precisa conter [TREINO] e [COMENTÁRIO].`,
      });
    }
    if (!hasComentarioTag) {
      errors.push({
        type: 'MISSING_COMENTARIO',
        blockTitle: currentBlockTitle,
        dayName: currentDay?.name,
        lineNumber: blockStartLine,
        message: `Formato inválido. Todo bloco precisa conter [TREINO] e [COMENTÁRIO].`,
      });
    }
  }
  
  // Validar cada bloco parseado
  for (const block of blocks) {
    // C1) Regra da ÂNCORA (obrigatória)
    if (!block.hasAnchor && block.trainLines.length > 0) {
      errors.push({
        type: 'MISSING_ANCHOR',
        blockTitle: block.title,
        dayName: block.dayName,
        message: `Treino sem âncora. Inclua uma linha como: '90 min corrida', '10 km corrida', 'EMOM 30 min' ou '5 Rounds'.`,
      });
    }
    
    // C2) Linhas com texto humano dentro do TREINO
    for (const humanLine of block.humanTextLines) {
      errors.push({
        type: 'HUMAN_TEXT_IN_TREINO',
        blockTitle: block.title,
        dayName: block.dayName,
        lineNumber: humanLine.lineNumber,
        lineText: humanLine.text,
        message: `Texto de comentário detectado dentro de [TREINO]. Mova esta frase para [COMENTÁRIO].`,
      });
    }
  }
  
  const isValid = errors.length === 0;
  
  return {
    isValid,
    errors,
    warnings,
    blocks,
  };
}

/**
 * Converte FenceError para StructureIssue (para integração com sistema existente)
 */
export function fenceErrorsToStructureIssues(fenceResult: FenceValidationResult): StructureIssue[] {
  const issues: StructureIssue[] = [];
  
  for (const error of fenceResult.errors) {
    issues.push({
      dayIndex: error.dayName ? DAY_PATTERNS.findIndex(d => d.name === error.dayName) : undefined,
      blockTitle: error.blockTitle,
      lineNumber: error.lineNumber,
      lineText: error.lineText,
      message: error.message,
      severity: 'ERROR' as IssueSeverity,
    });
  }
  
  for (const warning of fenceResult.warnings) {
    issues.push({
      dayIndex: warning.dayName ? DAY_PATTERNS.findIndex(d => d.name === warning.dayName) : undefined,
      blockTitle: warning.blockTitle,
      lineNumber: warning.lineNumber,
      message: warning.message,
      severity: 'WARNING' as IssueSeverity,
    });
  }
  
  return issues;
}

/**
 * Verifica se o texto usa formato de cerca (tem [TREINO])
 */
export function textUsesFenceFormat(text: string): boolean {
  return /\[TREINO\]/i.test(text);
}

/**
 * Mensagem de erro principal para exibição
 */
export const FENCE_FORMAT_ERROR = 'Formato inválido. Todo bloco precisa conter [TREINO] e [COMENTÁRIO].';
export const FENCE_ANCHOR_ERROR = "Treino sem âncora. Inclua uma linha como: '90 min corrida', '10 km corrida', 'EMOM 30 min' ou '5 Rounds'.";
export const FENCE_HUMAN_TEXT_ERROR = 'Texto de comentário detectado dentro de [TREINO]. Mova esta frase para [COMENTÁRIO].';
