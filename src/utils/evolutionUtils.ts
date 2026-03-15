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

// Pesos individuais por corrida (8 corridas, peso igual = 0.50 / 8)
export const ELITE_WEIGHTS_INDIVIDUAL: Record<string, number> = {
  run_1: 0.0625, run_2: 0.0625, run_3: 0.0625, run_4: 0.0625,
  run_5: 0.0625, run_6: 0.0625, run_7: 0.0625, run_8: 0.0625,
  ski: 0.06, sled_push: 0.04, sled_pull: 0.05, bbj: 0.07,
  row: 0.06, farmers: 0.05, sandbag: 0.07, wall_balls: 0.06, roxzone: 0.04,
};

export const STATION_LABELS: Record<string, string> = {
  run_total: 'Corrida Total',
  run_1: 'Corrida 1', run_2: 'Corrida 2', run_3: 'Corrida 3', run_4: 'Corrida 4',
  run_5: 'Corrida 5', run_6: 'Corrida 6', run_7: 'Corrida 7', run_8: 'Corrida 8',
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

/** Sequência cronológica oficial HYROX: corrida → estação alternadas */
export const TARGET_SPLITS_ORDER: string[] = [
  'run_1', 'ski', 'run_2', 'sled_push', 'run_3', 'sled_pull', 'run_4', 'bbj',
  'run_5', 'row', 'run_6', 'farmers', 'run_7', 'sandbag', 'run_8', 'wall_balls', 'roxzone',
];

/** Aliases robustos: mapeiam nomes do banco para chaves internas */
export const SPLIT_ALIASES: Record<string, string[]> = {
  run_1: ['Running 1', 'Run 1', 'Corrida 1'],
  run_2: ['Running 2', 'Run 2', 'Corrida 2'],
  run_3: ['Running 3', 'Run 3', 'Corrida 3'],
  run_4: ['Running 4', 'Run 4', 'Corrida 4'],
  run_5: ['Running 5', 'Run 5', 'Corrida 5'],
  run_6: ['Running 6', 'Run 6', 'Corrida 6'],
  run_7: ['Running 7', 'Run 7', 'Corrida 7'],
  run_8: ['Running 8', 'Run 8', 'Corrida 8'],
  ski: ['Ski Erg', 'SkiErg', 'Ski'],
  sled_push: ['Sled Push', 'SledPush'],
  sled_pull: ['Sled Pull', 'SledPull'],
  bbj: ['Burpee Broad Jump', 'Burpees Broad Jump', 'BBJ', 'Burpee Broad Jumps'],
  row: ['Rowing', 'Row', 'Remo'],
  farmers: ['Farmers Carry', "Farmer's Carry", 'Farmer Carry'],
  sandbag: ['Sandbag Lunges', 'Sandbag Lunge', 'Sandbag'],
  wall_balls: ['Wall Balls', 'Wall Ball', 'Wallballs', 'WallBalls'],
  roxzone: ['Roxzone', 'Rox Zone'],
};

/** Resolve um split_name do banco para a chave interna usando aliases + fallback parcial */
export function resolveSplitKey(splitName: string): string | null {
  const normalized = splitName.trim().toLowerCase();
  for (const [key, aliases] of Object.entries(SPLIT_ALIASES)) {
    for (const alias of aliases) {
      if (alias.toLowerCase() === normalized) return key;
    }
  }
  // Fallback: partial includes
  for (const [key, aliases] of Object.entries(SPLIT_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(alias.toLowerCase()) || alias.toLowerCase().includes(normalized)) return key;
    }
  }
  return null;
}

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
