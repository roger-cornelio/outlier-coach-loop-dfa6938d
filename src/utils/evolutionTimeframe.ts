export interface EvolutionTimeframe {
  months: number;
  tierLabel: string;
  ratePerMonth: number;
  gapFormatted: string;
}

/**
 * Calcula o tempo necessário (em meses) para eliminar um gap de tempo,
 * baseado no "Training Age" do atleta (nível atual).
 */
export function calculateEvolutionTimeframe(
  currentFinishTimeSeconds: number,
  gapSecondsToImprove: number
): EvolutionTimeframe {
  let ratePerMonth: number;
  let tierLabel: string;

  if (currentFinishTimeSeconds > 5400) {
    ratePerMonth = 90;
    tierLabel = 'Novato';
  } else if (currentFinishTimeSeconds > 4500) {
    ratePerMonth = 40;
    tierLabel = 'Intermediário';
  } else if (currentFinishTimeSeconds > 3900) {
    ratePerMonth = 15;
    tierLabel = 'Avançado';
  } else {
    ratePerMonth = 4;
    tierLabel = 'Elite';
  }

  const rawMonths = gapSecondsToImprove / ratePerMonth;
  const months = Math.ceil(rawMonths);

  const gapMinutes = Math.floor(gapSecondsToImprove / 60);
  const gapSecs = Math.round(gapSecondsToImprove % 60);
  const gapFormatted = gapSecs > 0
    ? `${gapMinutes}min ${gapSecs}s`
    : `${gapMinutes} minutos`;

  return { months, tierLabel, ratePerMonth, gapFormatted };
}
