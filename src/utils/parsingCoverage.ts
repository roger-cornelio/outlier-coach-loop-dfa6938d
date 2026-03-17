/**
 * parsingCoverage.ts — Relatório de Comissionamento Semântico
 * 
 * Audita a qualidade da interpretação de exercícios após o parse,
 * calculando a Taxa de Reconhecimento de métricas mensuráveis.
 */

import type { ParseResult } from './structuredTextParser';
import { detectUnits } from './unitDetection';

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
