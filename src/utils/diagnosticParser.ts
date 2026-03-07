/**
 * Shared parsing utilities for RoxCoach diagnostic data.
 * Used by both ImportarProva (parallel import) and RoxCoachDashboard (display).
 */

const SPLIT_NOISE = ['splits', 'total', 'average', 'station', 'movement', 'time', 'split', ''];

/** Parse a numeric value from potentially formatted strings like "87.5%" */
function toNum(val: any): number {
  if (val == null || val === '') return 0;
  const cleaned = String(val).replace(/[^0-9.\-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Find value from an object using multiple possible keys (case-insensitive) */
function findValue(obj: any, ...aliases: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const alias of aliases) {
    const lower = alias.toLowerCase();
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase() === lower) return obj[key];
    }
  }
  return undefined;
}

/** Convert "mm:ss" or "hh:mm:ss" string to total seconds */
function timeToSec(t: string): number {
  if (!t || typeof t !== 'string') return 0;
  const parts = t.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

/** Parse a score value: if it contains ":", treat as time and convert to seconds; otherwise use toNum */
function parseScoreValue(val: any): number {
  if (val == null || val === '') return 0;
  const s = String(val).trim();
  if (s.includes(':')) return timeToSec(s);
  return toNum(s);
}

export interface ParsedDiagnostic {
  resumoRow: {
    atleta_id: string;
    nome_atleta: string | null;
    temporada: string | null;
    evento: string | null;
    divisao: string | null;
    finish_time: string | null;
    posicao_categoria: string | null;
    posicao_geral: string | null;
    run_total: string | null;
    workout_total: string | null;
    texto_ia: string | null;
    source_url: string | null;
  };
  splitRows: Array<{ atleta_id: string; split_name: string; time: string }>;
  diagRows: Array<{
    atleta_id: string;
    movement: string;
    metric: string;
    value: number;
    your_score: number;
    top_1: number;
    improvement_value: number;
    percentage: number;
    total_improvement: number;
  }>;
}

/**
 * Parse the full diagnostic API response into rows ready for DB insert.
 */
export function parseDiagnosticResponse(
  apiData: any,
  userId: string,
  sourceUrl: string
): ParsedDiagnostic {
  // 1. Parse resumo_performance
  const rawResumo = apiData.resumo_performance || apiData.resumo || {};
  const resumoRow = {
    atleta_id: userId,
    nome_atleta: rawResumo.nome_atleta || null,
    temporada: rawResumo.temporada || null,
    evento: rawResumo.evento || null,
    divisao: rawResumo.divisao || null,
    finish_time: rawResumo.finish_time || null,
    posicao_categoria: rawResumo.posicao_categoria || null,
    posicao_geral: rawResumo.posicao_geral || null,
    run_total: rawResumo.run_total || null,
    workout_total: rawResumo.workout_total || null,
    texto_ia: apiData.texto_ia || null,
    source_url: sourceUrl,
  };

  // 2. Parse tempos_splits
  const rawSplits = apiData.tempos_splits || apiData.splits || [];
  const splitRows: ParsedDiagnostic['splitRows'] = [];
  if (Array.isArray(rawSplits)) {
    for (const item of rawSplits) {
      let splitName = findValue(item, 'Split', 'split_name', 'Movement', 'Station', 'name', 'Splits') || '';
      let time = String(findValue(item, 'Time', 'time', 'Tempo') || '');
      if (!splitName && item['0'] !== undefined) {
        splitName = String(item['0'] || '');
        time = String(item['1'] || '');
      }
      splitName = splitName.trim();
      time = time.trim();
      if (!splitName || SPLIT_NOISE.includes(splitName.toLowerCase())) continue;
      if (!time) continue;
      splitRows.push({ atleta_id: userId, split_name: splitName, time });
    }
  }

  // 3. Parse diagnostico_melhoria
  const rawDiag = apiData.diagnostico_melhoria || apiData.diagnostico || [];
  const diagRows: ParsedDiagnostic['diagRows'] = [];
  if (Array.isArray(rawDiag)) {
    for (const item of rawDiag) {
      const movement = findValue(item, 'Splits', 'Movement', 'movement', 'Station', 'split_name') || '';
      const focusDuringTraining = findValue(item, 'Focus During Training', 'focus_during_training', '%', 'percentage', 'Percentage') || '';
      const percentage = toNum(focusDuringTraining);
      const rawYourScore = findValue(item, 'your_score', 'You', 'you', 'Your Score');
      const rawTop1 = findValue(item, 'top_1', 'Top 1%', 'Top1');
      const rawImprovement = findValue(item, 'improvement_value', 'Potential Improvement', 'potential_improvement', 'Gap', 'gap', 'Improvement');
      const yourScore = parseScoreValue(rawYourScore);
      const top1 = parseScoreValue(rawTop1);
      const improvementValue = parseScoreValue(rawImprovement);
      const metric = findValue(item, 'Metric', 'metric') || 'time';
      if (!movement || SPLIT_NOISE.includes(movement.toLowerCase().trim())) continue;
      diagRows.push({
        atleta_id: userId,
        movement,
        metric,
        value: toNum(findValue(item, 'Value', 'value')),
        your_score: yourScore,
        top_1: top1,
        improvement_value: improvementValue,
        percentage,
        total_improvement: toNum(findValue(item, 'Total', 'total_improvement', 'Total Improvement')),
      });
    }
  }

  return { resumoRow, splitRows, diagRows };
}

/**
 * Check if parsed diagnostic has any meaningful data.
 */
export function hasDiagnosticData(parsed: ParsedDiagnostic): boolean {
  return parsed.diagRows.length > 0 || parsed.splitRows.length > 0 || !!parsed.resumoRow.texto_ia;
}
