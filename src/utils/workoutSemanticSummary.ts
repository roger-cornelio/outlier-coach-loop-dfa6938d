/**
 * workoutSemanticSummary.ts
 * 
 * Gera resumos semânticos estruturados dos blocos de treino
 * para enviar à IA com contexto preciso de cada exercício.
 * 
 * Usa extractLineSemantics para decompor cada linha em:
 * movimento, carga, duração, reps, intensidade, distância, cadência
 */

import { extractLineSemantics, type SemanticSegment } from './lineSemanticExtractor';
import { getBlockDisplayDataFromParsed, getBlockDisplayTitle } from './blockDisplayUtils';

interface WorkoutBlock {
  type: string;
  content: string;
  isMainWod?: boolean;
  parsed?: unknown;
  rawLines?: string[];
  durationMinutes?: number;
  [key: string]: unknown;
}

function formatSegments(segments: SemanticSegment[]): string {
  const parts: string[] = [];
  const movement = segments.filter(s => s.type === 'movement').map(s => s.text.trim()).join(' ').trim();
  if (movement) parts.push(movement);

  for (const seg of segments) {
    if (seg.type === 'movement') continue;
    const label = {
      reps: 'reps',
      load: 'carga',
      duration: 'tempo',
      distance: 'dist',
      intensity: 'intensidade',
      cadence: 'cadência',
      parenthetical: 'nota',
    }[seg.type] || seg.type;
    parts.push(`${label}: ${seg.text.trim()}`);
  }

  return parts.join(' | ');
}

/**
 * Gera resumo semântico estruturado de blocos de treino.
 * Formato otimizado para contexto de IA.
 */
export function buildSemanticSummary(blocks: WorkoutBlock[]): string {
  if (!blocks || blocks.length === 0) return 'Sem treino programado.';

  const blockSummaries: string[] = [];
  const allLoads: string[] = [];
  const allDurations: string[] = [];
  const allIntensities: string[] = [];
  const allDistances: string[] = [];

  for (const block of blocks) {
    if (block.type === 'notas') continue;

    const title = getBlockDisplayTitle(block as any, 0);
    const data = getBlockDisplayDataFromParsed(block as any);
    const lines = data.exerciseLines || [];
    const wodTag = block.isMainWod ? ' (WOD Principal)' : '';

    const semanticLines: string[] = [];

    for (const line of lines) {
      const segments = extractLineSemantics(line);
      if (segments.length === 0) continue;

      // Collect aggregates
      for (const seg of segments) {
        if (seg.type === 'load') allLoads.push(seg.text.trim());
        if (seg.type === 'duration') allDurations.push(seg.text.trim());
        if (seg.type === 'intensity') allIntensities.push(seg.text.trim());
        if (seg.type === 'distance') allDistances.push(seg.text.trim());
      }

      semanticLines.push(`  - ${formatSegments(segments)}`);
    }

    if (semanticLines.length > 0) {
      blockSummaries.push(`[${block.type.toUpperCase()}] ${title}${wodTag}:\n${semanticLines.join('\n')}`);
    } else {
      // Fallback: use raw content
      const snippet = block.content?.slice(0, 120) || '';
      blockSummaries.push(`[${block.type.toUpperCase()}] ${title}${wodTag}: ${snippet}`);
    }
  }

  // Build aggregate footer
  const aggregates: string[] = [];
  if (allLoads.length > 0) aggregates.push(`Cargas: ${[...new Set(allLoads)].join(', ')}`);
  if (allDurations.length > 0) aggregates.push(`Durações: ${[...new Set(allDurations)].join(', ')}`);
  if (allDistances.length > 0) aggregates.push(`Distâncias: ${[...new Set(allDistances)].join(', ')}`);
  if (allIntensities.length > 0) aggregates.push(`Intensidade: ${[...new Set(allIntensities)].join(', ')}`);

  let result = blockSummaries.join('\n\n');
  if (aggregates.length > 0) {
    result += '\n\n' + aggregates.join('\n');
  }

  return result;
}
