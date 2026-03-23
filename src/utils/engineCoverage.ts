/**
 * engineCoverage.ts — Diagnóstico de Precisão do Motor de Cálculo
 * 
 * Avalia quantos blocos tiveram tempo e calorias calculados com sucesso
 * pelo motor, e identifica o motivo de falha para cada bloco que retornou 0.
 * 
 * Visível APENAS para o coach — o atleta vê o treino limpo.
 */

export type EngineFailReason =
  | 'bypassed'        // Coach usou bypass no parse
  | 'parse_failed'    // Parse da IA falhou
  | 'no_exercises'    // Bloco sem exercícios parseados
  | 'no_duration'     // Motor não detectou padrão de tempo
  | 'no_kcal'         // Tempo ok mas kcal retornou 0
  | 'notes_block';    // Bloco de notas (esperado, não é falha)

export interface EngineBlockStatus {
  title: string;
  kcal: number;
  durationSec: number;
  success: boolean;
  reason?: EngineFailReason;
  reasonLabel?: string;   // Texto amigável pro coach
  confidencePercent: number; // 90 = motor, 75/60/45 = fallback
}

export interface EngineCoverageReport {
  totalBlocks: number;      // Blocos de treino (exclui notas e vazios)
  calculatedBlocks: number; // Blocos com tempo E kcal > 0
  successRate: number;      // 0-100
  blocks: EngineBlockStatus[];
}

const REASON_LABELS: Record<EngineFailReason, string> = {
  bypassed: 'Parse ignorado (bypass)',
  parse_failed: 'Falha na interpretação da IA',
  no_exercises: 'Sem exercícios identificados',
  no_duration: 'Padrão de tempo não reconhecido',
  no_kcal: 'Calorias não estimadas',
  notes_block: 'Bloco de notas',
};

/**
 * Calcula a cobertura do motor de cálculo baseado nos blocos já computados.
 * 
 * @param perBlock - Array com { kcal, durationSec, visible, showStats } já calculado
 * @param blocks - Blocos do DayWorkout para extrair metadata (título, parseStatus, etc.)
 */
export function calculateEngineCoverage(
  perBlock: Array<{ kcal: number; durationSec: number; visible: boolean; showStats: boolean }>,
  blocks: Array<{
    title?: string;
    type?: string;
    parseStatus?: string;
    parsedExercises?: any[];
    content?: string;
  }>,
): EngineCoverageReport {
  const result: EngineBlockStatus[] = [];
  let totalBlocks = 0;
  let calculatedBlocks = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const metrics = perBlock[i];
    
    if (!metrics || !metrics.visible) continue;
    
    const title = block.title || `Bloco ${i + 1}`;
    
    // Skip notas blocks
    if (block.type === 'notas') continue;

    totalBlocks++;

    const kcal = metrics.kcal || 0;
    const dur = metrics.durationSec || 0;
    const success = dur > 0 && kcal > 0;

    if (success) {
      calculatedBlocks++;
      result.push({ title, kcal, durationSec: dur, success: true, confidencePercent: 90 });
      continue;
    }

    // Determine failure reason
    let reason: EngineFailReason;
    if (block.parseStatus === 'bypassed') {
      reason = 'bypassed';
    } else if (block.parseStatus === 'failed') {
      reason = 'parse_failed';
    } else if (!block.parsedExercises || block.parsedExercises.length === 0) {
      reason = 'no_exercises';
    } else if (dur === 0) {
      reason = 'no_duration';
    } else {
      reason = 'no_kcal';
    }

    // Determine fallback confidence based on reason
    const fallbackConfidence = reason === 'bypassed' || reason === 'parse_failed' 
      ? 45 
      : reason === 'no_kcal' ? 60 : 50;

    result.push({
      title,
      kcal,
      durationSec: dur,
      success: false,
      reason,
      reasonLabel: REASON_LABELS[reason],
      confidencePercent: fallbackConfidence,
    });
  }

  const successRate = totalBlocks > 0
    ? Math.round((calculatedBlocks / totalBlocks) * 100)
    : 100;

  return {
    totalBlocks,
    calculatedBlocks,
    successRate,
    blocks: result,
  };
}

/**
 * Agrega cobertura de múltiplos dias num único relatório.
 */
export function aggregateEngineCoverage(reports: EngineCoverageReport[]): EngineCoverageReport {
  const allBlocks: EngineBlockStatus[] = [];
  let totalBlocks = 0;
  let calculatedBlocks = 0;

  for (const r of reports) {
    totalBlocks += r.totalBlocks;
    calculatedBlocks += r.calculatedBlocks;
    allBlocks.push(...r.blocks);
  }

  const successRate = totalBlocks > 0
    ? Math.round((calculatedBlocks / totalBlocks) * 100)
    : 100;

  return { totalBlocks, calculatedBlocks, successRate, blocks: allBlocks };
}
