/**
 * dslParser.ts - Parser DSL Explícito para Treinos OUTLIER
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * SINTAXE OFICIAL (ÚNICA):
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 1) DIA: SEGUNDA      → Abre um Day (SEGUNDA, TERÇA, QUARTA, QUINTA, SEXTA, SÁBADO, DOMINGO)
 * 2) BLOCO: AQUECIMENTO → Abre um Block dentro do Day atual
 * 3) - exercício       → Exercício (deve começar com "- ")
 * 4) **ESTRUTURA**     → Estrutura de bloco (ROUNDS, EMOM, AMRAP, FOR TIME)
 * 5) (comentário)      → Comentário (sempre entre parênteses)
 * 
 * VALIDAÇÃO:
 * - Nada antes do primeiro "DIA:" (exceto linhas vazias)
 * - "BLOCO:" só pode existir se "DIA:" estiver ativo
 * - Exercício "- " só pode existir se "BLOCO:" estiver ativo
 * - Estrutura "**...**" só pode existir se "BLOCO:" estiver ativo
 * - Comentário "(...)" pode existir em qualquer lugar
 */

import type { DayOfWeek } from '@/types/outlier';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface DSLValidationError {
  lineNumber: number;
  lineText: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface DSLParsedLine {
  type: 'DAY' | 'BLOCK' | 'EXERCISE' | 'STRUCTURE' | 'COMMENT' | 'SEPARATOR' | 'IGNORED';
  raw: string;
  content: string; // Conteúdo limpo (sem prefixo)
  lineNumber: number;
  dayValue?: DayOfWeek; // Para linhas de dia
  structureTag?: string; // Para linhas de estrutura (__STRUCT:...)
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES E PADRÕES
// ═══════════════════════════════════════════════════════════════════════════════

// Mapeamento DIA: → DayOfWeek
const DSL_DAY_MAP: Record<string, DayOfWeek> = {
  'SEGUNDA': 'seg',
  'SEGUNDA-FEIRA': 'seg',
  'TERÇA': 'ter',
  'TERCA': 'ter',
  'TERÇA-FEIRA': 'ter',
  'TERCA-FEIRA': 'ter',
  'QUARTA': 'qua',
  'QUARTA-FEIRA': 'qua',
  'QUINTA': 'qui',
  'QUINTA-FEIRA': 'qui',
  'SEXTA': 'sex',
  'SEXTA-FEIRA': 'sex',
  'SÁBADO': 'sab',
  'SABADO': 'sab',
  'DOMINGO': 'dom',
};

// Pattern para DIA: X (exato, case-insensitive para o nome do dia, mas DIA: deve ser exato)
const DSL_DAY_PATTERN = /^DIA:\s*(.+?)\s*$/i;

// Pattern para BLOCO: X
const DSL_BLOCK_PATTERN = /^BLOCO:\s*(.+)$/i;

// Pattern para exercício (deve começar com "- ")
const DSL_EXERCISE_PATTERN = /^-\s+(.+)$/;

// Pattern para estrutura **...**
const DSL_STRUCTURE_PATTERN = /^\*\*(.+)\*\*$/;

// Pattern para comentário puro (linha inteira entre parênteses)
const DSL_PURE_COMMENT_PATTERN = /^\(([^)]+)\)$/;

// Pattern para separador (⸻ ou múltiplos traços)
const DSL_SEPARATOR_PATTERN = /^[⸻—–\-]{3,}$/;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE DETECÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica se uma linha é um marcador DSL: DIA: X
 */
export function isDSLDayLine(line: string): boolean {
  return DSL_DAY_PATTERN.test(line.trim());
}

/**
 * Extrai o dia de uma linha DIA: X
 */
export function extractDSLDay(line: string): { dayName: string; dayValue: DayOfWeek | null } {
  const match = line.trim().match(DSL_DAY_PATTERN);
  if (!match) return { dayName: '', dayValue: null };
  
  const dayName = match[1].toUpperCase();
  const dayValue = DSL_DAY_MAP[dayName] || null;
  
  return { dayName, dayValue };
}

/**
 * Verifica se uma linha é um marcador DSL: BLOCO: X
 */
export function isDSLBlockLine(line: string): boolean {
  return DSL_BLOCK_PATTERN.test(line.trim());
}

/**
 * Extrai o nome do bloco de uma linha BLOCO: X
 */
export function extractDSLBlockName(line: string): string {
  const match = line.trim().match(DSL_BLOCK_PATTERN);
  if (!match) return '';
  return match[1].trim();
}

/**
 * Verifica se uma linha é um exercício (começa com "- ")
 */
export function isDSLExerciseLine(line: string): boolean {
  return DSL_EXERCISE_PATTERN.test(line.trim());
}

/**
 * Extrai o conteúdo do exercício (sem o "- ")
 */
export function extractDSLExercise(line: string): string {
  const match = line.trim().match(DSL_EXERCISE_PATTERN);
  if (!match) return line.trim();
  return match[1].trim();
}

/**
 * Verifica se uma linha é uma estrutura **...**
 */
export function isDSLStructureLine(line: string): boolean {
  return DSL_STRUCTURE_PATTERN.test(line.trim());
}

/**
 * Extrai o conteúdo da estrutura (sem os **)
 */
export function extractDSLStructure(line: string): string {
  const match = line.trim().match(DSL_STRUCTURE_PATTERN);
  if (!match) return '';
  return match[1].trim();
}

/**
 * Verifica se uma linha é um comentário puro (inteira entre parênteses)
 */
export function isDSLPureCommentLine(line: string): boolean {
  return DSL_PURE_COMMENT_PATTERN.test(line.trim());
}

/**
 * Extrai conteúdo de comentário entre parênteses
 */
export function extractDSLComment(line: string): string {
  const match = line.trim().match(DSL_PURE_COMMENT_PATTERN);
  if (!match) return '';
  return match[1].trim();
}

/**
 * Verifica se uma linha é um separador
 */
export function isDSLSeparatorLine(line: string): boolean {
  return DSL_SEPARATOR_PATTERN.test(line.trim());
}

/**
 * Extrai todos os comentários inline de uma linha (trechos entre parênteses)
 * Retorna o conteúdo limpo e os comentários extraídos
 */
export function extractInlineCommentsDSL(line: string): { content: string; comments: string[] } {
  const comments: string[] = [];
  const regex = /\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(line)) !== null) {
    const comment = match[1].trim();
    if (comment) comments.push(comment);
  }
  
  const content = line
    .replace(regex, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  
  return { content, comments };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO DSL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valida a estrutura DSL do texto de entrada
 * Retorna lista de erros e warnings
 */
export function validateDSLStructure(text: string): DSLValidationError[] {
  const errors: DSLValidationError[] = [];
  const lines = text.split('\n');
  
  let currentDay: DayOfWeek | null = null;
  let currentBlock: string | null = null;
  let lineNumber = 0;
  
  for (const rawLine of lines) {
    lineNumber++;
    const line = rawLine.trim();
    
    // Linhas vazias são ignoradas
    if (!line) continue;
    
    // Separadores são ignorados
    if (isDSLSeparatorLine(line)) continue;
    
    // Comentário puro ((...)) pode existir em qualquer lugar
    if (isDSLPureCommentLine(line)) continue;
    
    // DIA: X
    if (isDSLDayLine(line)) {
      const { dayName, dayValue } = extractDSLDay(line);
      if (!dayValue) {
        errors.push({
          lineNumber,
          lineText: line,
          message: `Dia inválido: "${dayName}". Use: SEGUNDA, TERÇA, QUARTA, QUINTA, SEXTA, SÁBADO, DOMINGO`,
          severity: 'ERROR',
        });
      } else {
        currentDay = dayValue;
        currentBlock = null; // Reset bloco ao mudar de dia
      }
      continue;
    }
    
    // BLOCO: X
    if (isDSLBlockLine(line)) {
      if (!currentDay) {
        errors.push({
          lineNumber,
          lineText: line,
          message: 'BLOCO: encontrado antes de DIA:. Adicione "DIA: SEGUNDA" (ou outro dia) antes.',
          severity: 'ERROR',
        });
      } else {
        currentBlock = extractDSLBlockName(line);
      }
      continue;
    }
    
    // Exercício "- "
    if (isDSLExerciseLine(line)) {
      if (!currentBlock) {
        if (!currentDay) {
          errors.push({
            lineNumber,
            lineText: line,
            message: 'Exercício encontrado sem DIA: e BLOCO:. Adicione os marcadores antes.',
            severity: 'ERROR',
          });
        } else {
          errors.push({
            lineNumber,
            lineText: line,
            message: 'Exercício encontrado sem BLOCO:. Adicione "BLOCO: NOME" antes do exercício.',
            severity: 'ERROR',
          });
        }
      }
      continue;
    }
    
    // Estrutura **...**
    if (isDSLStructureLine(line)) {
      if (!currentBlock) {
        if (!currentDay) {
          errors.push({
            lineNumber,
            lineText: line,
            message: 'Estrutura (**...**) encontrada sem DIA: e BLOCO:. Adicione os marcadores antes.',
            severity: 'ERROR',
          });
        } else {
          errors.push({
            lineNumber,
            lineText: line,
            message: 'Estrutura (**...**) encontrada sem BLOCO:. Adicione "BLOCO: NOME" antes.',
            severity: 'ERROR',
          });
        }
      }
      continue;
    }
    
    // Linha de texto livre (sem marcador DSL)
    // Verificar se está fora de contexto
    if (!currentDay && !isDSLPureCommentLine(line)) {
      // Linha antes do primeiro DIA: que não é comentário
      // Gerar alerta não-bloqueante (o sistema legado pode processar)
      errors.push({
        lineNumber,
        lineText: line,
        message: 'Texto encontrado antes de DIA:. Use o formato "DIA: SEGUNDA" para iniciar.',
        severity: 'WARNING',
      });
    }
  }
  
  return errors;
}

/**
 * Classifica uma única linha no DSL
 */
export function classifyDSLLine(line: string, lineNumber: number): DSLParsedLine {
  const trimmed = line.trim();
  
  // Linha vazia
  if (!trimmed) {
    return { type: 'IGNORED', raw: line, content: '', lineNumber };
  }
  
  // Separador
  if (isDSLSeparatorLine(trimmed)) {
    return { type: 'SEPARATOR', raw: line, content: '', lineNumber };
  }
  
  // DIA: X
  if (isDSLDayLine(trimmed)) {
    const { dayName, dayValue } = extractDSLDay(trimmed);
    return {
      type: 'DAY',
      raw: line,
      content: dayName,
      lineNumber,
      dayValue: dayValue || undefined,
    };
  }
  
  // BLOCO: X
  if (isDSLBlockLine(trimmed)) {
    return {
      type: 'BLOCK',
      raw: line,
      content: extractDSLBlockName(trimmed),
      lineNumber,
    };
  }
  
  // Estrutura **...**
  if (isDSLStructureLine(trimmed)) {
    const structContent = extractDSLStructure(trimmed);
    // Gerar tag de estrutura
    let structureTag = '';
    
    // Parse estrutura para tag
    const roundsMatch = structContent.match(/^(\d+)\s*ROUNDS?$/i);
    if (roundsMatch) {
      structureTag = `__STRUCT:ROUNDS=${roundsMatch[1]}`;
    }
    
    const emomMatch = structContent.match(/^EMOM\s+(\d+)/i);
    if (emomMatch) {
      structureTag = `__STRUCT:EMOM=${emomMatch[1]}`;
    }
    
    const amrapMatch = structContent.match(/^AMRAP\s+(\d+)/i);
    if (amrapMatch) {
      structureTag = `__STRUCT:AMRAP=${amrapMatch[1]}`;
    }
    
    if (/^FOR\s+TIME$/i.test(structContent)) {
      structureTag = '__STRUCT:FORTIME=true';
    }
    
    return {
      type: 'STRUCTURE',
      raw: line,
      content: structContent,
      lineNumber,
      structureTag: structureTag || undefined,
    };
  }
  
  // Comentário puro (...)
  if (isDSLPureCommentLine(trimmed)) {
    return {
      type: 'COMMENT',
      raw: line,
      content: extractDSLComment(trimmed),
      lineNumber,
    };
  }
  
  // Exercício "- "
  if (isDSLExerciseLine(trimmed)) {
    return {
      type: 'EXERCISE',
      raw: line,
      content: extractDSLExercise(trimmed),
      lineNumber,
    };
  }
  
  // Linha de texto livre - verificar se tem comentário inline
  const { content, comments } = extractInlineCommentsDSL(trimmed);
  
  // Se a linha inteira virou comentário, classificar como tal
  if (!content && comments.length > 0) {
    return {
      type: 'COMMENT',
      raw: line,
      content: comments.join(' '),
      lineNumber,
    };
  }
  
  // Linha não classificada pelo DSL - será processada pelo parser legado
  return {
    type: 'IGNORED',
    raw: line,
    content: trimmed,
    lineNumber,
  };
}

/**
 * Verifica se o texto usa o formato DSL (tem pelo menos um DIA: ou BLOCO:)
 */
export function usesDSLFormat(text: string): boolean {
  const multilineDayPattern = /^DIA:\s*(.+?)\s*$/im;
  const multilineBlockPattern = /^BLOCO:\s*(.+)$/im;
  return multilineDayPattern.test(text) || multilineBlockPattern.test(text);
}

/**
 * Verifica se há erros bloqueantes no DSL
 */
export function hasDSLBlockingErrors(errors: DSLValidationError[]): boolean {
  return errors.some(e => e.severity === 'ERROR');
}
