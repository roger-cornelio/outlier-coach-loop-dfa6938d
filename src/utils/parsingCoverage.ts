/**
 * parsingCoverage.ts — Relatório de Comissionamento Semântico
 * 
 * Audita a qualidade da interpretação de exercícios após o parse,
 * calculando a Taxa de Reconhecimento de métricas mensuráveis.
 * 
 * Também oferece fuzzy matching de exercícios contra o dicionário
 * global para sugerir correções de typos ao coach.
 */

import type { ParseResult } from './structuredTextParser';
import { detectUnits } from './unitDetection';
import { levenshteinDistance } from './structuredTextParser';

export type UnmatchedCategory = 'new_exercise' | 'uninterpretable';

export interface UnmatchedLine {
  text: string;
  blockTitle: string;
  dayIndex: number;
  category: UnmatchedCategory;
  suggestion?: string;
}

/**
 * Normaliza texto para comparação: lowercase, sem acentos, sem hífens.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Extrai o nome-base do exercício removendo prefixos, modificadores,
 * números, unidades e notações de tempo.
 * Ex: "Max Wall Ball 9 kg" → "wall ball"
 * Ex: "A- 5 Heavy Single Clean" → "clean"
 * Ex: "30/30" Side Plank" → "side plank"
 */
function extractBaseExerciseName(text: string): string {
  let t = text.trim();
  // Remove prefixos A-/B-/C-/D-/A1)/B2) etc.
  t = t.replace(/^[A-Z]\d?\s*[)\-–—]\s*/i, '');
  // Remove notações de tempo no início (30", 40", 30/30", 1'30")
  t = t.replace(/^\d+\s*[/]\s*\d+\s*["'']\s*/i, '');
  t = t.replace(/^\d+\s*[']\s*\d*\s*["']?\s*/i, '');
  t = t.replace(/^\d+\s*["'']\s*/i, '');
  // Remove modificadores de intensidade
  t = t.replace(/\b(max|heavy|single|strict|tempo|pause|deficit|banded)\b/gi, '');
  // Remove números e unidades
  t = t.replace(/\d+\s*(kg|lb|cal|m|km|seg|s|min|reps?|rep)?\b/gi, '');
  // Remove razões como 32/32, 30/25
  t = t.replace(/\d+\s*\/\s*\d+/g, '');
  // Remove @ e % notations
  t = t.replace(/[@%]/g, '');
  // Remove leading markers (-, •, *)
  t = t.replace(/^[-•*]\s*/, '');
  return normalizeText(t);
}

/**
 * Verifica se o nome-base extraído contém algum exercício do dicionário.
 */
function matchesDictionary(baseName: string, normalizedDict: string[]): boolean {
  if (!baseName || baseName.length < 2) return false;
  for (const dictName of normalizedDict) {
    if (!dictName) continue;
    if (baseName.includes(dictName) || dictName.includes(baseName)) {
      return true;
    }
  }
  return false;
}

/**
 * Classifica uma linha não interpretada:
 * - 'uninterpretable': exercício conhecido com formatação não reconhecida, ou notação pura
 * - 'new_exercise': parece um exercício não catalogado
 */
export function classifyUnmatchedLine(text: string, exerciseNames?: string[]): UnmatchedCategory {
  const trimmed = text.trim();

  // Rep schemes: "40,30,20,10", "21-15-9", "50 40 30 20 10" → structural, not exercise
  if (/^\d+(?:\s*[,\-–—]\s*\d+)+\s*$/.test(trimmed)) return 'uninterpretable';
  if (/^\d+(?:\s+\d+){2,}\s*$/.test(trimmed)) return 'uninterpretable';

  // Números puros com vírgulas/hífens (rep schemes: "40,30,20,10", "21-15-9")
  if (/^\d[\d,\-\s]+$/.test(trimmed)) return 'uninterpretable';

  // Notação de tempo isolada (30", 1'30", 90s, 2min)
  if (/^\d+\s*["']\s*$/.test(trimmed)) return 'uninterpretable';
  if (/^\d+\s*[']\s*\d+\s*["]\s*$/.test(trimmed)) return 'uninterpretable';
  if (/^\d+\s*(s|seg|min)\s*$/i.test(trimmed)) return 'uninterpretable';

  // Notação de razão/proporção isolada (30/30, 20/10)
  if (/^\d+\s*\/\s*\d+\s*$/.test(trimmed)) return 'uninterpretable';

  // Prefixos sem exercício reconhecível (A-, B-, A1-, etc. sozinhos)
  if (/^[A-Z]\d?\s*[-–—]\s*$/i.test(trimmed)) return 'uninterpretable';

  // Linhas muito curtas sem letras suficientes (< 3 chars de letras)
  const letterCount = (trimmed.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  if (letterCount < 3) return 'uninterpretable';

  // Se temos dicionário, verificar se o nome-base bate com exercício existente
  if (exerciseNames && exerciseNames.length > 0) {
    const baseName = extractBaseExerciseName(trimmed);
    const normalizedDict = exerciseNames.map(n => normalizeText(n));
    if (baseName.length >= 2 && matchesDictionary(baseName, normalizedDict)) {
      return 'uninterpretable'; // Exercício existe, é problema de formatação
    }
  }

  // Se chegou aqui, parece um exercício novo
  return 'new_exercise';
}

export interface CoverageReport {
  totalExercises: number;
  recognizedMetrics: number;
  unrecognized: number;
  successRate: number; // 0-100
  unmatchedLines: UnmatchedLine[];
}

// ════════════════════════════════════════════════════════════════════════════
// FUZZY MATCHING DE EXERCÍCIOS
// ════════════════════════════════════════════════════════════════════════════

export interface ExerciseTypoWarning {
  line: string;           // Texto original digitado
  suggestion: string;     // Nome correto sugerido
  blockTitle: string;     // Bloco onde foi encontrado
  dayIndex: number;
  lineNumber?: number;
}

/**
 * Normaliza texto para comparação fuzzy:
 * - lowercase
 * - remove acentos
 * - remove hífens e caracteres especiais
 * - trim
 */
function normalizeForFuzzy(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Remove plural simples de cada palavra (conservador: só "s" final em palavras 4+ chars).
 */
function stripPlural(text: string): string {
  return text
    .split(' ')
    .map(w => (w.length >= 4 && w.endsWith('s') && !w.endsWith('ss')) ? w.slice(0, -1) : w)
    .join(' ');
}

/**
 * Extrai o nome do exercício de uma linha, removendo números, unidades, etc.
 * Ex: "12 Back Squat @60kg" → "back squat"
 * Ex: "- 400m Run" → "run"
 * Ex: "backsquat 4x8" → "backsquat"
 */
function extractExerciseName(line: string): string {
  let text = line.trim();
  // Remove leading markers (-, •, *)
  text = text.replace(/^[-•*]\s*/, '');
  // Remove leading numbers + optional x/× patterns (4x8, 3×10)
  text = text.replace(/^\d+\s*[x×]\s*\d+\s*/i, '');
  // Remove leading number + unit (12, 400m, 50cal)
  text = text.replace(/^\d+\s*(m|km|cal|seg|s|min)?\s*/i, '');
  // Remove trailing SxR patterns (4x8, 3x10)
  text = text.replace(/\s+\d+\s*[x×]\s*\d+\s*$/i, '');
  // Remove load annotations (@60kg, 70%, etc.)
  text = text.replace(/\s*[@]\s*\d+\s*(kg|lb|%)?/gi, '');
  // Remove trailing distance/cal (400m, 50cal)
  text = text.replace(/\s+\d+\s*(m|km|cal)\s*$/i, '');
  return normalizeForFuzzy(text);
}

/**
 * Verifica se uma linha de texto parece um exercício (não é título, comentário, etc.)
 */
function looksLikeExercise(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Structure markers
  if (/^\*\*.*\*\*$/.test(trimmed)) return false;
  // Block titles (all caps, short)
  if (/^[A-Z\s]{3,}$/.test(trimmed) && trimmed.length < 20) return false;
  // DSL markers
  if (/^(DIA:|BLOCO:)/i.test(trimmed)) return false;
  // Separators
  if (/^[⸻─]{3,}/.test(trimmed)) return false;
  // Comments in parentheses
  if (/^\([^)]*\)$/.test(trimmed)) return false;
  // Has at least one word character
  return /[a-zA-ZÀ-ÿ]/.test(trimmed);
}

interface ExerciseDictEntry {
  name: string;
  aliases: string[];
}

/**
 * Busca fuzzy matching de uma linha contra o dicionário de exercícios.
 * Retorna a sugestão se encontrar um match com distância ≤ 2.
 */
export function fuzzyMatchExerciseName(
  exerciseName: string,
  dictionary: ExerciseDictEntry[],
): { match: boolean; suggestion: string } | null {
  if (!exerciseName || exerciseName.length < 3) return null;

  const normalized = normalizeForFuzzy(exerciseName);
  if (normalized.length < 3) return null;

  let bestDist = Infinity;
  let bestMatch = '';

  for (const entry of dictionary) {
    // Check against the main name
    const normName = normalizeForFuzzy(entry.name);
    
    // Exact match (including plural variants) → no warning needed
    if (normalized === normName) return null;
    if (stripPlural(normalized) === stripPlural(normName)) return null;
    
    const dist = levenshteinDistance(normalized, normName);
    // Threshold: max 1 for short terms (≤ 5 chars), max 2 for longer
    const maxDist = normName.length <= 5 ? 1 : 2;
    if (dist <= maxDist && dist < bestDist) {
      bestDist = dist;
      bestMatch = entry.name;
    }

    // Check against aliases
    for (const alias of entry.aliases) {
      const normAlias = normalizeForFuzzy(alias);
      if (normalized === normAlias) return null;
      if (stripPlural(normalized) === stripPlural(normAlias)) return null;
      
      const aliasDist = levenshteinDistance(normalized, normAlias);
      const aliasMaxDist = normAlias.length <= 5 ? 1 : 2;
      if (aliasDist <= aliasMaxDist && aliasDist < bestDist) {
        bestDist = aliasDist;
        bestMatch = entry.name;
      }
    }
  }

  if (bestDist <= 2 && bestMatch) {
    return { match: true, suggestion: bestMatch };
  }

  return null;
}

/**
 * Analisa as linhas brutas de um bloco e gera warnings de typos de exercícios.
 */
export function detectExerciseTypos(
  blockLines: string[],
  dictionary: ExerciseDictEntry[],
  blockTitle: string,
  dayIndex: number,
): ExerciseTypoWarning[] {
  if (!dictionary || dictionary.length === 0) return [];

  const warnings: ExerciseTypoWarning[] = [];

  for (const line of blockLines) {
    if (!looksLikeExercise(line)) continue;

    const exerciseName = extractExerciseName(line);
    if (!exerciseName || exerciseName.length < 3) continue;

    const result = fuzzyMatchExerciseName(exerciseName, dictionary);
    if (result) {
      warnings.push({
        line: line.trim(),
        suggestion: result.suggestion,
        blockTitle,
        dayIndex,
      });
    }
  }

  return warnings;
}

/**
 * Calcula a cobertura semântica do parse — quantos exercícios
 * tiveram métricas mensuráveis detectadas (TIME, DISTANCE, REPS, EFFORT).
 */
/**
 * Verifica se uma linha NOTE é uma nota legítima (entre parênteses, prefixo reconhecido, etc.)
 * Notas legítimas NÃO geram erro — o coach as colocou corretamente.
 */
function isLegitimateNote(text: string): boolean {
  const trimmed = text.trim();
  // Entre parênteses completos
  if (/^\(.*\)$/.test(trimmed)) return true;
  // Linha vazia ou separador
  if (!trimmed || /^[⸻─═\-]{3,}$/.test(trimmed)) return true;
  // Menos de 3 letras (ruído)
  const letterCount = (trimmed.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  if (letterCount < 3) return true;
  // Prefixo # (marcador de comentário DSL)
  if (trimmed.startsWith('#')) return true;
  return false;
}

/**
 * Detecta se uma linha é um typo de termo estrutural (ex: "2r ounds" → "2 Rounds").
 * Retorna a sugestão corrigida ou null.
 */
function detectStructuralTypo(text: string): string | null {
  const trimmed = text.trim();
  // Extrair parte numérica e textual
  const match = trimmed.match(/^(\d+)\s*(.*)/);
  const textPart = match ? match[2] : trimmed;
  const numPart = match ? match[1] : '';
  if (!textPart || textPart.length < 3) return null;

  const normalized = textPart.toLowerCase().replace(/\s+/g, '');
  const originalLower = textPart.toLowerCase().trim();
  const structuralMap: Record<string, string> = {
    rounds: 'Rounds', round: 'Round', series: 'Séries', serie: 'Série',
    sets: 'Sets', set: 'Set', rodadas: 'Rodadas', rodada: 'Rodada',
    emom: 'EMOM', amrap: 'AMRAP', tabata: 'Tabata', fortime: 'For Time',
  };

  for (const [term, display] of Object.entries(structuralMap)) {
    const dist = levenshteinDistance(normalized, term);
    const maxDist = term.length <= 4 ? 1 : 2;
    // Case 1: fuzzy match (typo like "roumds")
    const isFuzzyTypo = dist > 0 && dist <= maxDist;
    // Case 2: exact match after collapsing spaces but original has broken spacing ("r ounds")
    const hasBrokenSpacing = dist === 0 && originalLower !== term;
    if (isFuzzyTypo || hasBrokenSpacing) {
      return numPart ? `${numPart} ${display}` : display;
    }
  }
  return null;
}

export function calculateParsingCoverage(parseResult: ParseResult, exerciseNames?: string[]): CoverageReport {
  const unmatchedLines: UnmatchedLine[] = [];
  let totalExercises = 0;
  let recognizedMetrics = 0;

  const normalizedDict = (exerciseNames && exerciseNames.length > 0)
    ? exerciseNames.map(n => normalizeText(n))
    : [];

  for (let dayIndex = 0; dayIndex < parseResult.days.length; dayIndex++) {
    const day = parseResult.days[dayIndex];
    for (const block of day.blocks) {
      // Pular blocos de notas/comentário — não são zona de treino
      if (block.type === 'notas') continue;

      for (const line of block.lines) {
        if (line.type === 'exercise' || line.kind === 'EXERCISE') {
          totalExercises++;

          const result = detectUnits(line.text);
          if (result.hasRecognizedUnit) {
            recognizedMetrics++;
          } else {
            // Fallback: se o nome-base existe no dicionário, conta como reconhecido
            const baseName = extractBaseExerciseName(line.text);
            if (baseName.length >= 2 && normalizedDict.length > 0 && matchesDictionary(baseName, normalizedDict)) {
              recognizedMetrics++;
            } else {
              unmatchedLines.push({
                text: line.text,
                blockTitle: block.title || 'Bloco sem título',
                dayIndex,
                category: classifyUnmatchedLine(line.text, exerciseNames),
              });
            }
          }
        }
        // ═══════════════════════════════════════════════════════════════
        // REGRA: NOTEs soltas na zona de treino = erro de interpretação
        // O coach deve colocar comentários entre () ou em [COMENTÁRIO]
        // ═══════════════════════════════════════════════════════════════
        else if (line.kind === 'NOTE' && line.confidence === 'LOW' && !isLegitimateNote(line.text)) {
          totalExercises++;
          // Verificar se é typo de termo estrutural → sugestão "Você quis dizer…?"
          const structuralSuggestion = detectStructuralTypo(line.text);
          unmatchedLines.push({
            text: line.text,
            blockTitle: block.title || 'Bloco sem título',
            dayIndex,
            category: 'uninterpretable',
            suggestion: structuralSuggestion || undefined,
          });
        }
      }
    }
  }

  const unrecognized = totalExercises - recognizedMetrics;
  const successRate = totalExercises > 0
    ? Math.round((recognizedMetrics / totalExercises) * 100)
    : 100;

  // Console.table elegante no DevTools
  console.groupCollapsed(
    `%c🎯 Relatório de Comissionamento Semântico — ${successRate}%`,
    successRate >= 90
      ? 'color: #22c55e; font-weight: bold; font-size: 13px'
      : 'color: #f59e0b; font-weight: bold; font-size: 13px'
  );

  console.table({
    'Total de Exercícios': { valor: totalExercises },
    'Com Métricas Extraídas': { valor: recognizedMetrics },
    'Sem Métricas': { valor: unrecognized },
    '% de Sucesso': { valor: `${successRate}%` },
  });

  if (unmatchedLines.length > 0) {
    console.groupCollapsed(`⚠️ ${unmatchedLines.length} linha(s) sem métricas detectadas`);
    unmatchedLines.forEach((line, i) => {
      console.log(`  ${i + 1}. [${line.blockTitle}] "${line.text}"`);
    });
    console.groupEnd();
  }

  console.groupEnd();

  return {
    totalExercises,
    recognizedMetrics,
    unrecognized,
    successRate,
    unmatchedLines,
  };
}
