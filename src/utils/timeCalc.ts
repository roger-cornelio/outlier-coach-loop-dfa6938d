// src/utils/timeCalc.ts
// ============================================
// REGRA ÚNICA DETERMINÍSTICA PARA TEMPO
// ============================================
// PRIORIDADE INVIOLÁVEL:
// 1. durationSec > 0 → usar durationSec
// 2. durationMinutes > 0 → usar durationMinutes * 60
// 3. senão → retornar 0
// ============================================
// EXPLICITAMENTE PROIBIDO para cálculo de tempo:
// - extractTimeFromContent
// - parsing de texto em content/lines
// - defaults por tipo de bloco
// - heurísticas baseadas em regex
// ============================================

export type TimeBlock = {
  id: string;          // ex: "warmup", "conditioning", "finisher"
  title?: string;      // opcional
  durationSec?: number; // duração já calculada do bloco (em segundos)
};

/**
 * Tipo mínimo para leitura de tempo de um bloco de treino.
 * Contém apenas os campos necessários para a regra determinística.
 */
export interface BlockDurationSource {
  durationSec?: number;
  durationMinutes?: number;
}

/**
 * REGRA ÚNICA DETERMINÍSTICA para obter duração de um bloco em segundos.
 * 
 * Esta função é a ÚNICA fonte de verdade para leitura de tempo de blocos.
 * Não usa heurísticas, parsing de texto, ou defaults por tipo.
 * 
 * @param block - Objeto contendo durationSec e/ou durationMinutes
 * @returns Duração em segundos (0 se não disponível)
 * 
 * PRIORIDADE:
 * 1. durationSec > 0 → usar durationSec
 * 2. durationMinutes > 0 → usar durationMinutes * 60
 * 3. senão → retornar 0
 */
export function getBlockEffectiveDurationSec(block: BlockDurationSource): number {
  // Prioridade 1: durationSec explícito
  if (typeof block.durationSec === 'number' && block.durationSec > 0) {
    return Math.round(block.durationSec);
  }
  
  // Prioridade 2: durationMinutes * 60
  if (typeof block.durationMinutes === 'number' && block.durationMinutes > 0) {
    return Math.round(block.durationMinutes * 60);
  }
  
  // Fallback: sem duração definida
  return 0;
}

export function sumBlocksDurationSec(blocks: TimeBlock[]): {
  totalSec: number;
  byBlockSec: Record<string, number>;
} {
  const byBlockSec: Record<string, number> = {};
  let totalSec = 0;

  for (const b of blocks) {
    const sec = Number.isFinite(b.durationSec) ? (b.durationSec as number) : 0;
    const safeSec = sec > 0 ? Math.round(sec) : 0;
    byBlockSec[b.id] = safeSec;
    totalSec += safeSec;
  }

  return { totalSec, byBlockSec };
}

/**
 * Segurança: se o "tempo exibido" não bater com a soma real,
 * retorna a soma e sinaliza no console.
 */
export function resolveDisplayedTotalSec(args: {
  blocks: TimeBlock[];
  displayedTotalSec?: number; // o que a UI estava mostrando (se existir)
  toleranceSec?: number; // tolerância aceitável, default 60s
}): { finalTotalSec: number; isMismatch: boolean; realTotalSec: number } {
  const { blocks, displayedTotalSec, toleranceSec = 60 } = args;
  const { totalSec: realTotalSec } = sumBlocksDurationSec(blocks);

  const shown = Number.isFinite(displayedTotalSec) ? (displayedTotalSec as number) : realTotalSec;
  const diff = Math.abs(realTotalSec - shown);
  const isMismatch = diff > toleranceSec;

  if (isMismatch) {
    // fallback: nunca mostrar total errado
    console.warn(
      `[time] mismatch: shown=${shown}s real=${realTotalSec}s diff=${diff}s. Using real total.`
    );
    return { finalTotalSec: realTotalSec, isMismatch: true, realTotalSec };
  }

  return { finalTotalSec: shown, isMismatch: false, realTotalSec };
}
