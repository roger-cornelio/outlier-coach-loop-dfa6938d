/**
 * hyroxOfficialWeights.ts — Pesos oficiais HYROX por estação, divisão e sexo
 */

export type HyroxDivision = 'pro' | 'open';
export type HyroxSex = 'masculino' | 'feminino';

interface HyroxWeight {
  kg: number;
  display: string;
}

// Aliases para matching flexível de nomes de estação
const STATION_ALIASES: Record<string, string> = {
  'sled push': 'sled_push',
  'sled pull': 'sled_pull',
  'farmers carry': 'farmers_carry',
  'farmer carry': 'farmers_carry',
  'farmers': 'farmers_carry',
  'farmer': 'farmers_carry',
  'sandbag lunges': 'sandbag_lunges',
  'sandbag lunge': 'sandbag_lunges',
  'sandbag': 'sandbag_lunges',
  'wall balls': 'wall_balls',
  'wall ball': 'wall_balls',
  'wallball': 'wall_balls',
  'wallballs': 'wall_balls',
};

type StationKey = 'sled_push' | 'sled_pull' | 'farmers_carry' | 'sandbag_lunges' | 'wall_balls';

const OFFICIAL_WEIGHTS: Record<StationKey, Record<HyroxDivision, Record<HyroxSex, HyroxWeight>>> = {
  sled_push: {
    pro:  { masculino: { kg: 152, display: '152kg' }, feminino: { kg: 102, display: '102kg' } },
    open: { masculino: { kg: 102, display: '102kg' }, feminino: { kg: 72, display: '72kg' } },
  },
  sled_pull: {
    pro:  { masculino: { kg: 103, display: '103kg' }, feminino: { kg: 78, display: '78kg' } },
    open: { masculino: { kg: 78, display: '78kg' },  feminino: { kg: 48, display: '48kg' } },
  },
  farmers_carry: {
    pro:  { masculino: { kg: 32, display: '2×32kg' }, feminino: { kg: 24, display: '2×24kg' } },
    open: { masculino: { kg: 24, display: '2×24kg' }, feminino: { kg: 16, display: '2×16kg' } },
  },
  sandbag_lunges: {
    pro:  { masculino: { kg: 30, display: '30kg' }, feminino: { kg: 20, display: '20kg' } },
    open: { masculino: { kg: 20, display: '20kg' }, feminino: { kg: 10, display: '10kg' } },
  },
  wall_balls: {
    pro:  { masculino: { kg: 9, display: '9kg' }, feminino: { kg: 6, display: '6kg' } },
    open: { masculino: { kg: 6, display: '6kg' }, feminino: { kg: 4, display: '4kg' } },
  },
};

/**
 * Normaliza o nome da estação para a key do dicionário
 */
function normalizeStationName(name: string): StationKey | null {
  const lower = name.toLowerCase().trim();
  const key = STATION_ALIASES[lower];
  if (key) return key as StationKey;
  // Tenta match direto
  if (lower in OFFICIAL_WEIGHTS) return lower as StationKey;
  // Tenta match parcial
  for (const [alias, stationKey] of Object.entries(STATION_ALIASES)) {
    if (lower.includes(alias)) return stationKey as StationKey;
  }
  return null;
}

/**
 * Resolve o peso oficial HYROX para uma estação + divisão + sexo.
 * Retorna null se a estação não tiver carga oficial (ex: SkiErg, Row, BBJ).
 */
export function resolveHyroxLoad(
  stationName: string,
  division: HyroxDivision,
  sex: HyroxSex
): HyroxWeight | null {
  const key = normalizeStationName(stationName);
  if (!key) return null;
  return OFFICIAL_WEIGHTS[key]?.[division]?.[sex] ?? null;
}

/**
 * Retorna label amigável: "Carga Pro Masculino: 152kg"
 */
export function hyroxLoadTooltip(
  stationName: string,
  division: HyroxDivision,
  sex: HyroxSex
): string {
  const weight = resolveHyroxLoad(stationName, division, sex);
  const divLabel = division === 'pro' ? 'Pro' : 'Open';
  const sexLabel = sex === 'masculino' ? 'Masculino' : 'Feminino';
  if (!weight) return `Carga ${divLabel} ${sexLabel}`;
  return `Carga ${divLabel} ${sexLabel}: ${weight.display}`;
}
