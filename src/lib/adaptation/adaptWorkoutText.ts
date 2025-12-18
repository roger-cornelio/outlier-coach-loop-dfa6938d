export type LevelKey = "BASE" | "PROGRESSIVO" | "PERFORMANCE";

export type SexKey = "M" | "F";

export const LEVEL_MULT: Record<LevelKey, number> = {
  BASE: 0.65,
  PROGRESSIVO: 0.8,
  PERFORMANCE: 1.0,
};

export const SEX_MULT: Record<SexKey, number> = {
  M: 1.0,
  F: 0.85,
};

export function clamp01(n: number) {
  if (Number.isNaN(n)) return 1.0;
  return Math.max(0, Math.min(1, n));
}

export function computeMultiplier(level: LevelKey, sex: SexKey) {
  return clamp01((LEVEL_MULT[level] ?? 1.0) * (SEX_MULT[sex] ?? 1.0));
}

/**
 * Aplica multiplicador em:
 * - Distâncias: 2000m, 1.6km
 * - Calorias: 50cal
 * - Reps/contagens: "50 Wall Balls", "15 Agachamentos"
 * - Sets/Rounds: "3 rounds", "4 sets", "EMOM 12"
 *
 * Não altera estrutura, nomes de blocos, ordem, nem o tipo de movimento.
 * Regra: sempre floor e nunca > 100%.
 */
export function adaptWorkoutText(params: {
  text: string;
  multiplier: number;
  adaptWarmup?: boolean; // default false
}) {
  const { text, multiplier } = params;
  const adaptWarmup = params.adaptWarmup ?? false;
  const m = clamp01(multiplier);

  // Fast path
  if (m === 1.0) return text;

  const lines = text.split("\n");
  let currentBlock = ""; // infer by headings
  const out: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine;

    // Detect section headings (very permissive)
    // examples: "🔥 Aquecimento", "AQUECIMENTO", "Conditioning — FOR TIME"
    const heading = line.trim();
    const upper = heading.toUpperCase();

    const isBlockHeader =
      upper.includes("AQUECIMENTO") ||
      upper.includes("WARM") ||
      upper.includes("CONDITIONING") ||
      upper.includes("FOR TIME") ||
      upper.includes("AMRAP") ||
      upper.includes("EMOM") ||
      upper.includes("CORE") ||
      upper.includes("CORRIDA") ||
      upper.includes("FORÇA") ||
      upper.includes("ESPECÍFICO") ||
      upper.startsWith("🔥") ||
      upper.startsWith("⚡") ||
      upper.startsWith("🏃") ||
      upper.startsWith("🏋");

    if (isBlockHeader) currentBlock = upper;

    // MVP: não adaptar aquecimento (a menos que force)
    const isWarmup = currentBlock.includes("AQUECIMENTO") || currentBlock.includes("WARM");
    if (isWarmup && !adaptWarmup) {
      out.push(line);
      continue;
    }

    // Apply transformations line-by-line
    out.push(adaptLine(line, m));
  }

  return out.join("\n");
}

function floorMin1(n: number) {
  const f = Math.floor(n);
  return f < 1 ? 1 : f;
}

function adaptLine(line: string, m: number) {
  let s = line;

  // 1) Distância em metros: 2000m, 100m, 1000 m
  s = s.replace(/(\d{2,5})\s*m\b/gi, (match, p1) => {
    const base = Number(p1);
    if (!Number.isFinite(base)) return match;
    const adapted = floorMin1(base * m);
    return `${adapted}m`;
  });

  // 2) Distância em km: 1.6km, 2km (aceita vírgula)
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*km\b/gi, (match, p1) => {
    const base = Number(String(p1).replace(",", "."));
    if (!Number.isFinite(base)) return match;
    const adapted = Math.max(0.1, Math.floor(base * m * 10) / 10); // 1 casa decimal p/ km
    // Mantém ponto como separador
    return `${adapted}km`;
  });

  // 3) Calorias: 50cal / 50 cal
  s = s.replace(/(\d{2,4})\s*cal\b/gi, (match, p1) => {
    const base = Number(p1);
    if (!Number.isFinite(base)) return match;
    const adapted = floorMin1(base * m);
    return `${adapted}cal`;
  });

  // 4) Rounds/Sets: "3 rounds", "4 sets", "5 séries"
  s = s.replace(/(\d{1,2})\s*(rounds?|sets?|s[ée]ries?)\b/gi, (match, p1, p2) => {
    const base = Number(p1);
    if (!Number.isFinite(base)) return match;
    const adapted = floorMin1(base * m);
    return `${adapted} ${p2}`;
  });

  // 5) EMOM / AMRAP minutos: "EMOM 12", "AMRAP 10"
  s = s.replace(/\b(EMOM|AMRAP)\s*(\d{1,3})\b/gi, (match, p1, p2) => {
    const base = Number(p2);
    if (!Number.isFinite(base)) return match;
    const adapted = floorMin1(base * m);
    return `${p1.toUpperCase()} ${adapted}`;
  });

  // 6) Reps no começo da linha: "50 Wall Balls", "15 Push-ups"
  // (mantém cargas, nomes etc)
  s = s.replace(/^(\s*)(\d{1,4})(\s+)([A-Za-zÀ-ÿ])/g, (match, p1, p2, p3, p4) => {
    const base = Number(p2);
    if (!Number.isFinite(base)) return match;
    const adapted = floorMin1(base * m);
    return `${p1}${adapted}${p3}${p4}`;
  });

  // 7) Reps no meio: "3 rounds: 10 push-ups"
  s = s.replace(/:\s*(\d{1,4})(\s+)([A-Za-zÀ-ÿ])/g, (match, p1, p2, p3) => {
    const base = Number(p1);
    if (!Number.isFinite(base)) return match;
    const adapted = floorMin1(base * m);
    return `: ${adapted}${p2}${p3}`;
  });

  return s;
}
