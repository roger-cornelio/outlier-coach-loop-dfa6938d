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

export interface UnmatchedLine {
  text: string;
  blockTitle: string;
  dayIndex: number;
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
    
    // Exact match → no warning needed
    if (normalized === normName) return null;
    
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
      if (normalized === normAlias) return null; // exact alias match
      
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
export function calculateParsingCoverage(parseResult: ParseResult): CoverageReport {
  const unmatchedLines: UnmatchedLine[] = [];
  let totalExercises = 0;
  let recognizedMetrics = 0;

  for (let dayIndex = 0; dayIndex < parseResult.days.length; dayIndex++) {
    const day = parseResult.days[dayIndex];
    for (const block of day.blocks) {
      for (const line of block.lines) {
        // Filtrar apenas linhas classificadas como exercício
        if (line.type === 'exercise' || line.kind === 'EXERCISE') {
          totalExercises++;

          const result = detectUnits(line.text);
          if (result.hasRecognizedUnit) {
            recognizedMetrics++;
          } else {
            unmatchedLines.push({
              text: line.text,
              blockTitle: block.title || 'Bloco sem título',
              dayIndex,
            });
          }
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
