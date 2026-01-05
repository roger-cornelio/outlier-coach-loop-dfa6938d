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
  /** True if at least one block is missing [TREINO] or [COMENTÁRIO] */
  hasMissingDelimiters: boolean;
  /** True if [COMENTÁRIO] appears before [TREINO] in any block */
  hasInvertedOrder: boolean;
  /** True if any block has multiple occurrences of the same delimiter */
  hasMultipleDelimiters: boolean;
}

export type FenceErrorType = 
  | 'MISSING_TREINO' 
  | 'MISSING_COMENTARIO' 
  | 'MISSING_BOTH'
  | 'INVERTED_ORDER'
  | 'MULTIPLE_TREINO'
  | 'MULTIPLE_COMENTARIO'
  | 'MISSING_ANCHOR' 
  | 'HUMAN_TEXT_IN_TREINO';

export interface FenceError {
  type: FenceErrorType;
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
  /** Number of [TREINO] tags found in this block */
  treinoTagCount: number;
  /** Number of [COMENTÁRIO] tags found in this block */
  comentarioTagCount: number;
  /** True if [COMENTÁRIO] appears before [TREINO] */
  hasInvertedOrder: boolean;
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
  /\b(?:Squat|Deadlift|Press|Clean|Snatch|Jerk|Row|Pull-?Up|Push-?Up|Burpee|Wall\s*Ball|Lunge|Jump|Carry|Sled|Farmer|Aquecimento|Run|Corrida|Trote)\b/i,
  // Distâncias: 500m, 10km, 100m
  /\d+\s*(?:m|km)\b/i,
  // Tempos: 30 min, 45', 1h, 90+ min
  /\d+\+?\s*(?:min|minutos?|'|h|hora)\b/i,
  // Unbroken, Sprint, Max
  /\b(?:Unbroken|Sprint|Max)\b/i,
  // Min X: (EMOM pattern)
  /^Min\s*\d+\s*:/i,
  // Alternating, Single, Double
  /\b(?:Alternating|Single|Double)\b/i,
  // MVP0 PATCH: Rounds com estrutura (8 rounds: ..., 5 rounds com descanso)
  /\d+\s*rounds?\s*:/i,
  /\d+\s*rounds?\s+com\b/i,
  // MVP0 PATCH: Descanso intra-bloco (1'30 descanso, 2' descanso entre)
  /\d+['']?\d*\s*(?:descanso|rest)/i,
  /descanso\s+entre\s+(?:rounds?|s[ée]ries?|sets?)/i,
  // MVP0 PATCH: Corrida contínua, zona 2, pace
  /\bcorr(?:ida|er)\s+cont[ií]nu/i,
  /\bpace\b/i,
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
  
  // ════════════════════════════════════════════════════════════════════════════════
  // MVP0 PATCH: PRIORIDADE ABSOLUTA — Padrões de treino têm precedência!
  // Se a linha contém tempo, distância, reps, PSE, Zona, etc., é EXERCÍCIO.
  // Exemplos que NÃO podem ser bloqueados:
  //   "10' Aquecimento (PSE 3)"
  //   "8 rounds: 60m (PSE 9) com 1'30 descanso entre rounds"
  //   "90+ minutos de corrida contínua em Zona 2"
  // ════════════════════════════════════════════════════════════════════════════════
  
  // Se a linha é uma âncora, não bloquear
  if (isAnchorLine(trimmed)) return null;
  
  // Se a linha contém padrões permitidos de treino, NÃO bloquear
  if (isAllowedTrainingLine(trimmed)) {
    console.log('[detectHumanText] → null (padrão de treino permitido):', trimmed);
    return null;
  }
  
  // Verificar indicadores de texto humano
  for (const indicator of HUMAN_TEXT_INDICATORS) {
    if (indicator.test(trimmed)) {
      console.log('[detectHumanText] → BLOQUEADO (texto humano):', trimmed, '|', indicator.reason);
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
 * Remove tags [TREINO]/[COMENTÁRIO] duplicadas DENTRO do mesmo bloco.
 * - Mantém a primeira ocorrência de cada tag
 * - Reseta a contagem ao iniciar novo bloco ou dia
 */
function dedupeFenceTagsPerBlock(text: string): string {
  const lines = text.split("\n");
  let seenTreino = false;
  let seenComentario = false;

  const out: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Reset ao trocar de dia
    if (detectDay(trimmed)) {
      seenTreino = false;
      seenComentario = false;
      out.push(rawLine);
      continue;
    }

    // Reset ao iniciar novo bloco
    if (isBlockTitle(trimmed)) {
      seenTreino = false;
      seenComentario = false;
      out.push(rawLine);
      continue;
    }

    if (/^\[TREINO\]\s*$/i.test(trimmed)) {
      if (seenTreino) continue;
      seenTreino = true;
      out.push(rawLine);
      continue;
    }

    if (/^\[COMENT[ÁA]RIO\]\s*$/i.test(trimmed)) {
      if (seenComentario) continue;
      seenComentario = true;
      out.push(rawLine);
      continue;
    }

    out.push(rawLine);
  }

  return out.join("\n");
}

/**
 * Extrai blocos com delimitadores [TREINO] e [COMENTÁRIO]
 * PARSING DETERMINÍSTICO — sem adivinhação
 *
 * CERCA HARD V1:
 * - Cada bloco DEVE ter exatamente 1 [TREINO] e 1 [COMENTÁRIO]
 * - [TREINO] DEVE vir antes de [COMENTÁRIO]
 * - Sem isso: BLOQUEIA publicação
 */
export function parseBlocksWithFence(text: string): ParsedFenceBlock[] {
  console.log("[FENCE_IN_TAG_COUNTS]", {
    treino: (text.match(/\[TREINO\]/gi) || []).length,
    comentario: (text.match(/\[COMENT[ÁA]RIO\]/gi) || []).length,
  });

  const fenceOutText = dedupeFenceTagsPerBlock(text);

  console.log("[FENCE_OUT_TAG_COUNTS]", {
    treino: (fenceOutText.match(/\[TREINO\]/gi) || []).length,
    comentario: (fenceOutText.match(/\[COMENT[ÁA]RIO\]/gi) || []).length,
  });

  const lines = fenceOutText.split("\n");
  const blocks: ParsedFenceBlock[] = [];

  let currentDay: { name: string; index: number } | null = null;
  let currentBlockTitle = '';
  let currentTrainLines: string[] = [];
  let currentCommentLines: string[] = [];
  let inTrainingSection = false;
  let inCommentSection = false;
  let blockStartLine = 0;

  // CERCA HARD V1: Rastrear contagem e ordem de tags
  let treinoTagCount = 0;
  let comentarioTagCount = 0;
  let treinoTagLineIdx = -1;
  let comentarioTagLineIdx = -1;

  const flushBlock = () => {
    if (currentBlockTitle) {
      // Calcular se tem âncora
      const hasAnchor = currentTrainLines.some((line) => isAnchorLine(line.trim()));

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

      // CERCA HARD V1: Verificar ordem invertida
      const hasInvertedOrder =
        treinoTagLineIdx > -1 && comentarioTagLineIdx > -1 && comentarioTagLineIdx < treinoTagLineIdx;

      // BLOCK_TAG_AUDIT (por bloco)
      console.log("[BLOCK_TAG_AUDIT]", {
        blockTitle: currentBlockTitle,
        treinoCount: treinoTagCount,
        comentarioCount: comentarioTagCount,
      });

      blocks.push({
        title: currentBlockTitle,
        dayName: currentDay?.name,
        dayIndex: currentDay?.index,
        trainLines: [...currentTrainLines],
        commentLines: [...currentCommentLines],
        hasAnchor,
        humanTextLines,
        treinoTagCount,
        comentarioTagCount,
        hasInvertedOrder,
      });
    }

    // Reset
    currentBlockTitle = '';
    currentTrainLines = [];
    currentCommentLines = [];
    inTrainingSection = false;
    inCommentSection = false;
    treinoTagCount = 0;
    comentarioTagCount = 0;
    treinoTagLineIdx = -1;
    comentarioTagLineIdx = -1;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detectar mudança de dia
    const dayDetected = detectDay(trimmed);
    if (dayDetected) {
      flushBlock();
      currentDay = dayDetected;
      console.log('[parseBlocksWithFence] Dia detectado:', dayDetected.name, '→ estado resetado');
      continue;
    }

    // FIX CIRÚRGICO: Detectar novo bloco INDEPENDENTE do estado das seções
    // Antes: condição (!inTrainingSection && !inCommentSection) impedia detecção
    // de novos blocos após o primeiro, causando vazamento de estado.
    // Agora: qualquer título de bloco válido dispara flush + novo bloco.
    if (isBlockTitle(trimmed)) {
      // Se já existe um bloco em progresso, flush antes de iniciar novo
      if (currentBlockTitle) {
        flushBlock();
      }
      currentBlockTitle = trimmed;
      blockStartLine = i + 1;
      // RESET EXPLÍCITO POR BLOCO (garantia anti-vazamento)
      inTrainingSection = false;
      inCommentSection = false;
      treinoTagCount = 0;
      comentarioTagCount = 0;
      treinoTagLineIdx = -1;
      comentarioTagLineIdx = -1;
      currentTrainLines = [];
      currentCommentLines = [];
      console.log('[parseBlocksWithFence] [BLOCK_START]', trimmed, '→ tagMode resetado');
      continue;
    }

    // Detectar [TREINO]
    if (/^\[TREINO\]/i.test(trimmed)) {
      treinoTagCount++;
      treinoTagLineIdx = i;
      inTrainingSection = true;
      inCommentSection = false;
      console.log('[parseBlocksWithFence] [TAG] TREINO no bloco', currentBlockTitle, '→ count=', treinoTagCount);
      continue;
    }

    // Detectar [COMENTÁRIO]
    if (/^\[COMENT[ÁA]RIO\]/i.test(trimmed)) {
      comentarioTagCount++;
      comentarioTagLineIdx = i;
      inTrainingSection = false;
      inCommentSection = true;
      console.log('[parseBlocksWithFence] [TAG] COMENTÁRIO no bloco', currentBlockTitle, '→ count=', comentarioTagCount);
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
// VALIDAÇÃO PRINCIPAL — CERCA HARD V1
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Valida texto do coach com regras de cerca determinísticas
 *
 * REGRAS ABSOLUTAS (CERCA HARD V1):
 * 1) [TREINO] é obrigatório em todo bloco — exatamente 1 ocorrência
 * 2) [COMENTÁRIO] é obrigatório em todo bloco — exatamente 1 ocorrência
 * 3) A posição deve obedecer: index([TREINO]) < index([COMENTÁRIO])
 * 4) A zona TREINO = linhas entre os dois delimitadores
 * 5) A zona COMENTÁRIO = linhas após [COMENTÁRIO]
 *
 * PROIBIDO:
 * - 0 delimitadores
 * - apenas um delimitador
 * - ordem invertida
 * - múltiplas ocorrências do mesmo delimitador
 */
export function validateFence(text: string): FenceValidationResult {
  const errors: FenceError[] = [];
  const warnings: FenceWarning[] = [];

  const fenceOutText = dedupeFenceTagsPerBlock(text);
  const lines = fenceOutText.split('\n');

  // Parse blocks com contagem de tags
  const blocks = parseBlocksWithFence(text);

  // CERCA HARD V1: Flags de validação
  let hasMissingDelimiters = false;
  let hasInvertedOrder = false;
  let hasMultipleDelimiters = false;
  
  // Detectar blocos que existem mas não têm delimitadores
  let currentDay: { name: string; index: number } | null = null;
  let currentBlockTitle = '';
  let treinoTagCount = 0;
  let comentarioTagCount = 0;
  let treinoTagLineIdx = -1;
  let comentarioTagLineIdx = -1;
  let blockStartLine = 0;
  
  const checkAndFlushBlock = () => {
    if (!currentBlockTitle) return;
    
    const hasTreino = treinoTagCount > 0;
    const hasComentario = comentarioTagCount > 0;
    const hasMultipleTreino = treinoTagCount > 1;
    const hasMultipleComentario = comentarioTagCount > 1;
    const isInverted = hasTreino && hasComentario && comentarioTagLineIdx < treinoTagLineIdx;
    
    // CERCA HARD V1: Verificar cada condição separadamente
    
    // Caso 1: Faltam ambos delimitadores
    if (!hasTreino && !hasComentario) {
      hasMissingDelimiters = true;
      errors.push({
        type: 'MISSING_BOTH',
        blockTitle: currentBlockTitle,
        dayName: currentDay?.name,
        lineNumber: blockStartLine,
        message: `Bloco '${currentBlockTitle}': faltou [TREINO] e [COMENTÁRIO]`,
      });
    }
    // Caso 2: Faltou só [TREINO]
    else if (!hasTreino) {
      hasMissingDelimiters = true;
      errors.push({
        type: 'MISSING_TREINO',
        blockTitle: currentBlockTitle,
        dayName: currentDay?.name,
        lineNumber: blockStartLine,
        message: `Bloco '${currentBlockTitle}': faltou [TREINO]`,
      });
    }
    // Caso 3: Faltou só [COMENTÁRIO]
    else if (!hasComentario) {
      hasMissingDelimiters = true;
      errors.push({
        type: 'MISSING_COMENTARIO',
        blockTitle: currentBlockTitle,
        dayName: currentDay?.name,
        lineNumber: blockStartLine,
        message: `Bloco '${currentBlockTitle}': faltou [COMENTÁRIO]`,
      });
    }
    
    // Caso 4: Ordem invertida
    if (isInverted) {
      hasInvertedOrder = true;
      errors.push({
        type: 'INVERTED_ORDER',
        blockTitle: currentBlockTitle,
        dayName: currentDay?.name,
        lineNumber: comentarioTagLineIdx + 1,
        message: `Bloco '${currentBlockTitle}': ordem inválida — [COMENTÁRIO] precisa vir após [TREINO]`,
      });
    }
    
    // Caso 5: Múltiplos [TREINO]
    if (hasMultipleTreino) {
      hasMultipleDelimiters = true;
      errors.push({
        type: 'MULTIPLE_TREINO',
        blockTitle: currentBlockTitle,
        dayName: currentDay?.name,
        lineNumber: blockStartLine,
        message: `Bloco '${currentBlockTitle}': múltiplos delimitadores — mantenha apenas 1 [TREINO] e 1 [COMENTÁRIO]`,
      });
    }
    
    // Caso 6: Múltiplos [COMENTÁRIO]
    if (hasMultipleComentario) {
      hasMultipleDelimiters = true;
      errors.push({
        type: 'MULTIPLE_COMENTARIO',
        blockTitle: currentBlockTitle,
        dayName: currentDay?.name,
        lineNumber: blockStartLine,
        message: `Bloco '${currentBlockTitle}': múltiplos delimitadores — mantenha apenas 1 [TREINO] e 1 [COMENTÁRIO]`,
      });
    }
    
    // Reset
    currentBlockTitle = '';
    treinoTagCount = 0;
    comentarioTagCount = 0;
    treinoTagLineIdx = -1;
    comentarioTagLineIdx = -1;
  };
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    // Detectar mudança de dia
    const dayDetected = detectDay(trimmed);
    if (dayDetected) {
      checkAndFlushBlock();
      currentDay = dayDetected;
      console.log('[validateFence] Dia detectado:', dayDetected.name, '→ estado resetado');
      continue;
    }
    
    // FIX CIRÚRGICO: Detectar início de bloco INDEPENDENTE do estado das tags
    // Antes: condição (treinoTagCount === 0 && comentarioTagCount === 0) impedia detecção
    // de novos blocos após o primeiro, causando vazamento de estado entre blocos.
    // Agora: qualquer título de bloco válido dispara flush + reset.
    if (isBlockTitle(trimmed)) {
      // Se já existe um bloco em progresso, flush antes de iniciar novo
      if (currentBlockTitle) {
        checkAndFlushBlock();
      }
      currentBlockTitle = trimmed;
      blockStartLine = i + 1;
      // RESET EXPLÍCITO POR BLOCO (garantia anti-vazamento)
      treinoTagCount = 0;
      comentarioTagCount = 0;
      treinoTagLineIdx = -1;
      comentarioTagLineIdx = -1;
      console.log('[validateFence] [BLOCK_START]', trimmed, '→ tagMode resetado');
      continue;
    }
    
    // Detectar tags (contagem POR BLOCO)
    if (/^\[TREINO\]/i.test(trimmed)) {
      treinoTagCount++;
      treinoTagLineIdx = i;
      console.log('[validateFence] [TAG] TREINO detectado no bloco', currentBlockTitle, '→ count=', treinoTagCount);
    }
    if (/^\[COMENT[ÁA]RIO\]/i.test(trimmed)) {
      comentarioTagCount++;
      comentarioTagLineIdx = i;
      console.log('[validateFence] [TAG] COMENTÁRIO detectado no bloco', currentBlockTitle, '→ count=', comentarioTagCount);
    }
  }
  
  // Verificar último bloco
  checkAndFlushBlock();
  
  // Validar cada bloco parseado (âncora + texto humano)
  for (const block of blocks) {
    // Só validar âncora se o bloco tem tags corretas
    if (block.treinoTagCount === 1 && block.comentarioTagCount === 1 && !block.hasInvertedOrder) {
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
  }
  
  const isValid = errors.length === 0;
  
  return {
    isValid,
    errors,
    warnings,
    blocks,
    hasMissingDelimiters,
    hasInvertedOrder,
    hasMultipleDelimiters,
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
