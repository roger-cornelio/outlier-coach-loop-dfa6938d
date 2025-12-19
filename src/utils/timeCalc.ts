// src/utils/timeCalc.ts

export type TimeBlock = {
  id: string;          // ex: "warmup", "conditioning", "finisher"
  title?: string;      // opcional
  durationSec?: number; // duração já calculada do bloco (em segundos)
  // se você tiver durationMin no app, pode adaptar aqui também
};

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
