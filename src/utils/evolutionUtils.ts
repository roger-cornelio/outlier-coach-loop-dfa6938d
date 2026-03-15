/**
 * Evolution Utils — Constantes e helpers para a aba Evolução
 */

// Pesos Elite: distribuição de esforço por estação em uma prova HYROX
export const ELITE_WEIGHTS: Record<string, number> = {
  run_total: 0.50,
  ski: 0.06,
  sled_push: 0.04,
  sled_pull: 0.05,
  bbj: 0.07,
  row: 0.06,
  farmers: 0.05,
  sandbag: 0.07,
  wall_balls: 0.06,
  roxzone: 0.04,
};

export const STATION_LABELS: Record<string, string> = {
  run_total: 'Corrida Total',
  ski: 'Ski Erg',
  sled_push: 'Sled Push',
  sled_pull: 'Sled Pull',
  bbj: 'Burpee Broad Jump',
  row: 'Rowing',
  farmers: 'Farmers Carry',
  sandbag: 'Sandbag Lunges',
  wall_balls: 'Wall Balls',
  roxzone: 'Roxzone',
};

// PRs mockados por estação (em segundos)
export const MOCK_CURRENT_PRS: Record<string, number> = {
  run_total: 2400, // 40:00
  ski: 310,        // 05:10
  sled_push: 210,  // 03:30
  sled_pull: 250,  // 04:10
  bbj: 360,        // 06:00
  row: 300,        // 05:00
  farmers: 260,    // 04:20
  sandbag: 380,    // 06:20
  wall_balls: 320, // 05:20
  roxzone: 210,    // 03:30
};

// Runs mockados (8 runs em segundos)
export const MOCK_RUNS: number[] = [214, 232, 248, 265, 289, 312, 358, 427];

// Dados mockados de pódio — granularidade: evento + divisão + age_group
export const MOCK_PODIUM_TIMES: Record<string, number> = {
  'SP_PRO_30_34': 4200, // 01:10:00
  'SP_PRO_25_29': 4100,
  'SP_PRO_35_39': 4300,
};
export const MOCK_USER_AGE_GROUP = 'PRO 30-34';
export const MOCK_USER_AGE_GROUP_KEY = 'SP_PRO_30_34';
// Backward compat alias
export const MOCK_PODIUM_TIME_SEC = MOCK_PODIUM_TIMES[MOCK_USER_AGE_GROUP_KEY];
export const MOCK_CURRENT_TIME_SEC = 4797; // ~01:19:57

/** Formata segundos em MM:SS ou HH:MM:SS */
export function formatEvolutionTime(totalSec: number): string {
  const sec = Math.round(Math.abs(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Parseia "HH:MM:SS" ou "MM:SS" para segundos */
export function parseTimeInput(value: string): number | null {
  const parts = value.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}
