export interface EvolutionTimeframe {
  months: number;
  tierLabel: string;
  ratePerMonth: number;
  gapFormatted: string;
}

export interface ProvaAlvoTarget {
  targetSeconds: number;
  projectedGainSeconds: number;
  tierLabel: string;
  ratePerMonth: number;
}

/**
 * Determina a taxa de evolução mensal (em segundos) baseada no Training Age.
 */
function getTierRate(currentFinishTimeSeconds: number): { ratePerMonth: number; tierLabel: string } {
  if (currentFinishTimeSeconds > 5400) {
    return { ratePerMonth: 90, tierLabel: 'Novato' };
  } else if (currentFinishTimeSeconds > 4500) {
    return { ratePerMonth: 40, tierLabel: 'Intermediário' };
  } else if (currentFinishTimeSeconds > 3900) {
    return { ratePerMonth: 15, tierLabel: 'Avançado' };
  } else {
    return { ratePerMonth: 4, tierLabel: 'Elite' };
  }
}

/**
 * Calcula o tempo necessário (em meses) para eliminar um gap de tempo,
 * baseado no "Training Age" do atleta (nível atual).
 */
export function calculateEvolutionTimeframe(
  currentFinishTimeSeconds: number,
  gapSecondsToImprove: number
): EvolutionTimeframe {
  const { ratePerMonth, tierLabel } = getTierRate(currentFinishTimeSeconds);

  const rawMonths = gapSecondsToImprove / ratePerMonth;
  const months = Math.ceil(rawMonths);

  // Recalcular rate ajustado para que rate × months == gap (conta de padaria fecha)
  const adjustedRate = Math.ceil(gapSecondsToImprove / months);

  const gapMinutes = Math.floor(gapSecondsToImprove / 60);
  const gapSecs = Math.round(gapSecondsToImprove % 60);
  const gapFormatted = gapSecs > 0
    ? `${gapMinutes}min ${gapSecs}s`
    : `${gapMinutes} minutos`;

  return { months, tierLabel, ratePerMonth: adjustedRate, gapFormatted };
}

/**
 * Calcula a meta proporcional para a Prova Alvo,
 * baseada no tempo atual, dias até a prova e Training Age.
 * 
 * A meta nunca é menor que 3600s (1h00m) — piso absoluto.
 */
export function calculateProvaAlvoTarget(
  currentFinishTimeSeconds: number,
  daysUntilRace: number
): ProvaAlvoTarget {
  const { ratePerMonth, tierLabel } = getTierRate(currentFinishTimeSeconds);

  const months = Math.max(0, daysUntilRace / 30);
  const projectedGainSeconds = Math.round(months * ratePerMonth);

  // Meta = tempo atual - ganho projetado, com piso de 3600s
  const targetSeconds = Math.max(3600, currentFinishTimeSeconds - projectedGainSeconds);

  return { targetSeconds, projectedGainSeconds, tierLabel, ratePerMonth };
}
