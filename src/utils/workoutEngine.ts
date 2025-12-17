// workoutEngine.ts
// ✅ Parse do treino do admin (texto -> blocos)
// ✅ Adaptação por NÍVEL (multiplicadores numéricos em reps/metros/cal + cargas kg/lb)
// ✅ CONDENSE MODE (HYROX_PRO + pouco tempo = mesma dificuldade em menos tempo)
// ✅ Orçamento de tempo por bloco (depende do tempo escolhido + nível)
// ✅ Corte para CABER no tempo escolhido (sempre <= timeLimitMin)
// ✅ Cálculo determinístico de kcal (MET x peso x minutos)

export type AthleteLevel = "INICIANTE" | "INTERMEDIARIO" | "AVANCADO" | "HYROX_PRO";
export type BlockType = "warmup" | "strength" | "conditioning" | "core" | "run";

export type WorkoutBlock = {
  type: BlockType;
  title: string;
  items: string[];
  targetMinutes?: number;
  met?: number;
  kcal?: number;
};

export type WorkoutDay = {
  dayLabel: string;
  blocks: WorkoutBlock[];
  totalMinutes: number;
  totalKcal: number;
  flags?: {
    condenseMode?: boolean;
  };
};

export type AthleteConfig = {
  weightKg: number;
  heightCm?: number;
  age?: number;
  sex?: "M" | "F";
  level: AthleteLevel;
  timeLimitMin: number; // 30/45/60/90/9999 (ilimitado)
};

/** MET base por bloco (determinístico) */
const DEFAULT_MET: Record<BlockType, number> = {
  warmup: 5.5,
  strength: 6.5,
  conditioning: 12.0,
  core: 5.5,
  run: 9.5,
};

/** Fórmula padrão: kcal = MET * 3.5 * peso(kg) / 200 * minutos */
export function kcalFromMet(met: number, weightKg: number, minutes: number): number {
  return (met * 3.5 * weightKg / 200) * minutes;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// ===========================
// ESTIMATIVA DE TEMPO (ADMIN)
// ===========================

function extractFirstNumber(line: string): number | null {
  const m = line.match(/(\d{1,4})/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function estimateLineMinutes(line: string): number {
  const s = line.toLowerCase();

  // Corrida / trote
  // 1000m trote ~ 6-7min leve
  if (s.includes("trote") && s.includes("m")) {
    const n = extractFirstNumber(s);
    if (!n) return 3;
    return (n / 1000) * 6.5;
  }

  // Row / Remo (erg)
  // 1000m ~ 4.5min / 2000m ~ 9min
  if (s.includes("remo") && s.includes("m")) {
    const n = extractFirstNumber(s);
    if (!n) return 4;
    return (n / 1000) * 4.5;
  }

  // SkiErg
  // 1000m ~ 4.5min / 2000m ~ 9min
  if (s.includes("skierg") && s.includes("m")) {
    const n = extractFirstNumber(s);
    if (!n) return 4;
    return (n / 1000) * 4.5;
  }

  // Air Bike calories
  // 50 cal ~ 2.5-4 min (depende muito)
  if (s.includes("air bike") && s.includes("cal")) {
    const n = extractFirstNumber(s);
    if (!n) return 3;
    return (n / 50) * 3.2;
  }

  // Wall balls
  // 50 WB ~ 2.5-4 min
  if (s.includes("wall ball")) {
    const n = extractFirstNumber(s);
    if (!n) return 3;
    return (n / 50) * 3.2;
  }

  // Farmer carry (metros)
  // 100m ~ 1.5-2.5min
  if (s.includes("farmer") && s.includes("m")) {
    const n = extractFirstNumber(s);
    if (!n) return 2;
    return (n / 100) * 2.0;
  }

  // Lunges (metros)
  // 100m sandbag lunge ~ 4-6min
  if (s.includes("lunge") && s.includes("m")) {
    const n = extractFirstNumber(s);
    if (!n) return 5;
    return (n / 100) * 5.0;
  }

  // Burpee broad jump (metros)
  // 80m ~ 5-7min
  if (s.includes("burpee") && s.includes("m")) {
    const n = extractFirstNumber(s);
    if (!n) return 6;
    return (n / 80) * 6.0;
  }

  // Sled push/pull (metros)
  // 15-40m ~ 1.5-5min dependendo de carga
  if ((s.includes("sled push") || s.includes("sled pull")) && s.includes("m")) {
    const n = extractFirstNumber(s);
    if (!n) return 4;
    return (n / 40) * 4.5;
  }

  // Core / acessórios (heurística)
  // "50 abdominal..." ~ 2-4min
  if (s.includes("abdominal") || s.includes("prancha") || s.includes("russian twist")) {
    return 3;
  }

  // Linhas genéricas de reps (push-ups, squats etc.)
  // assume ~1-2min por linha
  if (s.match(/\b(push|agach|squat|swing|press|superman|calf|panturr|plank|prancha)\b/)) {
    return 1.5;
  }

  // Default conservador
  return 1.5;
}

function estimateBlockMinutesFromItems(block: WorkoutBlock): number {
  const itemsText = block.items.join("\n").toLowerCase();

  // Detectar "3 rounds", "4 rounds", "5 rounds"
  const roundsMatch = itemsText.match(/(\d+)\s*(round|rounds)/);
  const rounds = roundsMatch ? Number(roundsMatch[1]) : 1;

  let sum = 0;
  for (const line of block.items) sum += estimateLineMinutes(line);

  // Se for bloco com rounds, multiplica (mas não exagera)
  if (rounds > 1) sum = sum * clamp(rounds, 1, 10);

  // Conditioning costuma ter transições -> +10%
  if (block.type === "conditioning") sum *= 1.10;

  return Math.max(1, Math.round(sum));
}

function estimateAdminMinutes(blocks: WorkoutBlock[]): number {
  return blocks.reduce((acc, b) => acc + estimateBlockMinutesFromItems(b), 0);
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

/** Multiplicadores por nível (objetivo) */
export function getLevelMultipliers(level: AthleteLevel) {
  switch (level) {
    case "INICIANTE":
      return { volume: 0.70, load: 0.80, intensity: 0.92, densityRule: "mais controle/menos densidade", canReduce: true, canSimplify: true };
    case "INTERMEDIARIO":
      return { volume: 1.00, load: 1.00, intensity: 1.00, densityRule: "densidade padrão", canReduce: true, canSimplify: false };
    case "AVANCADO":
      return { volume: 1.15, load: 1.05, intensity: 1.05, densityRule: "mais densidade/menos descanso", canReduce: true, canSimplify: false };
    case "HYROX_PRO":
      return { volume: 1.25, load: 1.10, intensity: 1.08, densityRule: "padrão competitivo (densidade alta)", canReduce: false, canSimplify: false };
  }
}

/** Orçamento base por tempo escolhido (sempre soma <= timeLimit) */
export function getTimeBudget(timeLimitMin: number): Record<BlockType, number> {
  if (timeLimitMin >= 9999) return { warmup: 12, strength: 20, conditioning: 60, core: 10, run: 0 };
  if (timeLimitMin <= 30) return { warmup: 5, strength: 5, conditioning: 18, core: 2, run: 0 };
  if (timeLimitMin <= 45) return { warmup: 8, strength: 10, conditioning: 24, core: 3, run: 0 };
  if (timeLimitMin <= 60) return { warmup: 10, strength: 15, conditioning: 30, core: 5, run: 0 };
  return { warmup: 12, strength: 20, conditioning: 50, core: 8, run: 0 };
}

/** Ajusta o orçamento conforme nível (HYROX_PRO puxa mais conditioning; iniciante puxa mais técnica) */
export function getTimeBudgetByLevel(timeLimitMin: number, level: AthleteLevel): Record<BlockType, number> {
  const base = getTimeBudget(timeLimitMin);

  if (level === "HYROX_PRO") {
    const shift = Math.min(8, Math.floor(base.strength * 0.4));
    return {
      ...base,
      strength: Math.max(0, base.strength - shift),
      conditioning: base.conditioning + shift,
    };
  }

  if (level === "INICIANTE") {
    const shift = Math.min(6, Math.floor(base.conditioning * 0.2));
    return {
      ...base,
      warmup: base.warmup + 2,
      strength: base.strength + Math.max(0, shift - 2),
      conditioning: Math.max(0, base.conditioning - shift),
    };
  }

  if (level === "AVANCADO") {
    const shift = Math.min(4, Math.floor(base.core * 0.5));
    return {
      ...base,
      core: Math.max(0, base.core - shift),
      conditioning: base.conditioning + shift,
    };
  }

  return base; // intermediário
}

/** Escala um token numérico isolado */
function scaleNumberToken(token: string, mult: number) {
  const n = Number(token);
  if (!Number.isFinite(n)) return token;
  const scaled = Math.round(n * mult);
  return String(clampInt(scaled, 1, 9999));
}

/** Escala números em uma linha: reps/meters/cal/etc (MVP robusto) */
function scaleLineNumbers(line: string, mult: number) {
  return line.replace(/\b(\d{1,4})\b/g, (_, n) => scaleNumberToken(n, mult));
}

/** Escala cargas no formato "202/152kg", "30/20lb", "32/24kg" */
function scaleLoads(line: string, loadMult: number) {
  return line.replace(/(\d{1,3})\s*\/\s*(\d{1,3})\s*(kg|lb)\b/gi, (_, a, b, unit) => {
    const A = clampInt(Math.round(Number(a) * loadMult), 1, 999);
    const B = clampInt(Math.round(Number(b) * loadMult), 1, 999);
    return `${A}/${B}${unit}`;
  });
}

/** Aplica scaling por nível (volume/carga) em todo o treino (sem inventar exercícios) */
export function applyLevelScaling(blocks: WorkoutBlock[], level: AthleteLevel) {
  const { volume, load } = getLevelMultipliers(level);

  return blocks.map((b) => {
    const volumeMult =
      b.type === "warmup" ? 1.0 :
      b.type === "strength" ? Math.max(0.80, volume) :
      volume;

    const loadMult =
      (b.type === "strength" || b.type === "conditioning") ? load : 1.0;

    const scaledItems = b.items.map((line) => {
      let out = line;
      out = scaleLoads(out, loadMult);
      out = scaleLineNumbers(out, volumeMult);
      return out;
    });

    return { ...b, items: scaledItems };
  });
}

/**
 * CONDENSE MODE:
 * HYROX_PRO + treino não cabe no tempo -> reduzir volume, manter/elevar carga e aumentar densidade (MET)
 */
function applyCondenseMode(
  blocks: WorkoutBlock[],
  opts: { level: AthleteLevel; preCutTotalMin: number; timeLimitMin: number }
) {
  const { level, preCutTotalMin, timeLimitMin } = opts;

  if (level !== "HYROX_PRO") return { blocks, condense: false, metDensityMult: 1 };

  if (preCutTotalMin <= timeLimitMin) return { blocks, condense: false, metDensityMult: 1 };

  const ratioRaw = timeLimitMin / Math.max(1, preCutTotalMin);

  // Volume alvo: 50%–80%
  const volumeRatio = clamp(ratioRaw, 0.50, 0.80);

  // Load: mantém e pode subir até +10%
  const loadBoost = clamp(1 + (1 - ratioRaw) * 0.20, 1.00, 1.10);

  // Densidade (MET): sobe até +15%
  const metDensityMult = clamp(1 + (1 - ratioRaw) * 0.35, 1.00, 1.15);

  const condensed = blocks.map((b) => {
    const shouldScaleVolume = b.type === "conditioning" || b.type === "core" || b.type === "run";
    const shouldBoostLoad = b.type === "conditioning" || b.type === "strength";

    const scaledItems = b.items.map((line) => {
      let out = line;
      if (shouldBoostLoad) out = scaleLoads(out, loadBoost);
      if (shouldScaleVolume) out = scaleLineNumbers(out, volumeRatio);
      return out;
    });

    return { ...b, items: scaledItems };
  });

  return { blocks: condensed, condense: true, metDensityMult };
}

/** Parser simples do dia (texto do admin -> blocos) */
export function parseAdminDayText(dayLabel: string, dayText: string): WorkoutBlock[] {
  const lines = dayText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("-----"));

  const blocks: WorkoutBlock[] = [];
  let current: WorkoutBlock | null = null;

  const pushCurrent = () => {
    if (current && current.items.length > 0) blocks.push(current);
    current = null;
  };

  const startBlock = (type: BlockType, title: string) => {
    pushCurrent();
    current = { type, title, items: [] };
  };

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (upper.includes("AQUECIMENTO")) {
      startBlock("warmup", "Aquecimento");
      continue;
    }
    if (upper.includes("FORÇA") || upper.includes("FORCA") || upper.includes("STRENGTH") || upper.includes("TÉCNICA") || upper.includes("TECNICA") || upper.includes("SKILL")) {
      startBlock("strength", "Força / Técnica");
      continue;
    }
    if (upper.includes("CONDITIONING") || upper.includes("FOR TIME") || upper.includes("WOD")) {
      startBlock("conditioning", "Conditioning");
      continue;
    }
    if (upper.includes("CORE")) {
      startBlock("core", "Core");
      continue;
    }
    if (upper.includes("CORRIDA")) {
      startBlock("run", "Corrida");
      continue;
    }

    if (!current) current = { type: "conditioning", title: "Treino", items: [] };
    current.items.push(line);
  }

  pushCurrent();
  return blocks;
}

/** Extrai dias do texto grande do admin (📅 QUARTA/QUINTA/...) */
export function splitDaysFromAdminText(text: string): Record<string, string> {
  const lines = text.split("\n");
  const days: Record<string, string> = {};
  let currentDay: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (currentDay) days[currentDay] = buffer.join("\n").trim();
    buffer = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const upper = line.toUpperCase();

    const isDayHeader =
      upper.includes("📅 SEGUNDA") ||
      upper.includes("📅 TERÇA") || upper.includes("📅 TERCA") ||
      upper.includes("📅 QUARTA") ||
      upper.includes("📅 QUINTA") ||
      upper.includes("📅 SEXTA") ||
      upper.includes("📅 SÁBADO") || upper.includes("📅 SABADO") ||
      upper.includes("📅 DOMINGO");

    if (isDayHeader) {
      flush();
      currentDay = line.replace("📅", "").trim();
      continue;
    }

    if (currentDay) buffer.push(raw);
  }

  flush();
  return days;
}

/**
 * Motor final do dia:
 * - Aplica scaling por nível
 * - Se HYROX_PRO e treino "quer" durar mais que o limite -> CONDENSE MODE
 * - Define targetMinutes por bloco (budget por nível + tempo)
 * - Corta para caber
 * - Calcula kcal determinístico
 */
export function buildDayWithAccurateMetrics(
  dayLabel: string,
  blocks: WorkoutBlock[],
  athlete: AthleteConfig
): WorkoutDay {
  // 1) Scaling por nível
  const levelScaled = applyLevelScaling(blocks, athlete.level);

  // 2) Estimar tempo baseado no CONTEÚDO real (antes do condense)
  const preCutTotalMin = estimateAdminMinutes(levelScaled);

  // 3) Condense mode (somente HYROX_PRO + falta de tempo)
  const condenseResult = applyCondenseMode(levelScaled, {
    level: athlete.level,
    preCutTotalMin,
    timeLimitMin: athlete.timeLimitMin,
  });

  const scaledBlocks = condenseResult.blocks;
  const metDensityMult = condenseResult.metDensityMult;
  const condenseMode = condenseResult.condense;

  // 4) Minutos por bloco baseados no CONTEÚDO (não budget fixo)
  const planned: WorkoutBlock[] = scaledBlocks.map((b) => ({
    ...b,
    targetMinutes: estimateBlockMinutesFromItems(b),
    met: DEFAULT_MET[b.type] ?? 6.0,
  }));

  // 5) Corrida opcional: se texto mencionar "opcional", zera por padrão
  planned.forEach((b) => {
    if (b.type === "run") {
      const joined = b.items.join(" ").toLowerCase();
      if (joined.includes("opcional")) b.targetMinutes = 0;
    }
  });

  // 6) Não precisa mais redistribuir budget - tempo é baseado no conteúdo real

  // 7) Garantia: nunca estourar o tempo escolhido
  const sumMinutes = () => planned.reduce((acc, b) => acc + (b.targetMinutes ?? 0), 0);

  let total = sumMinutes();
  const limit = athlete.timeLimitMin >= 9999 ? total : athlete.timeLimitMin;

  if (total > limit) {
    let overflow = total - limit;

    // Ordem de corte (para caber):
    // run -> core -> conditioning -> strength -> warmup
    const cutOrder: BlockType[] = ["run", "core", "conditioning", "strength", "warmup"];

    for (const t of cutOrder) {
      if (overflow <= 0) break;
      for (const b of planned) {
        if (b.type !== t) continue;
        const cur = b.targetMinutes ?? 0;
        if (cur <= 0) continue;
        const cut = Math.min(cur, overflow);
        b.targetMinutes = cur - cut;
        overflow -= cut;
        if (overflow <= 0) break;
      }
    }
  }

  // 8) Calcular kcal por bloco (determinístico) + ajuste por nível + densidade do condense
  planned.forEach((b) => {
    const mins = b.targetMinutes ?? 0;
    const baseMet = b.met ?? 6.0;

    const { intensity } = getLevelMultipliers(athlete.level);

    // Condense mode aumenta densidade/intensidade (mesma pancada em menos tempo)
    const metAdjusted = baseMet * intensity * metDensityMult;

    b.met = metAdjusted;
    b.kcal = Math.round(kcalFromMet(metAdjusted, athlete.weightKg, mins));
  });

  const totalMinutes = planned.reduce((acc, b) => acc + (b.targetMinutes ?? 0), 0);
  const totalKcal = planned.reduce((acc, b) => acc + (b.kcal ?? 0), 0);

  return {
    dayLabel,
    blocks: planned,
    totalMinutes,
    totalKcal,
    flags: { condenseMode },
  };
}

/** Helper: normaliza tempo vindo do UI (string/number) */
export function normalizeTimeLimit(input: any): number {
  if (typeof input === "number") return input;
  if (typeof input === "string") {
    const n = Number(input.replace(/[^\d]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 60;
  }
  return 60;
}

/** Mapeia o nível do app para o nível do engine */
export function mapAppLevelToEngine(level: string): AthleteLevel {
  switch (level) {
    case 'iniciante': return 'INICIANTE';
    case 'intermediario': return 'INTERMEDIARIO';
    case 'avancado': return 'AVANCADO';
    case 'hyrox_pro': return 'HYROX_PRO';
    default: return 'INTERMEDIARIO';
  }
}

/** Mapeia o tipo de bloco do app para o tipo do engine */
export function mapAppBlockTypeToEngine(type: string): BlockType {
  switch (type) {
    case 'aquecimento': return 'warmup';
    case 'forca': return 'strength';
    case 'conditioning': return 'conditioning';
    case 'core': return 'core';
    case 'corrida': return 'run';
    case 'especifico': return 'conditioning';
    case 'notas': return 'core';
    default: return 'conditioning';
  }
}

/** Calcula métricas para blocos existentes do app usando o engine */
export function calculateBlockMetricsWithEngine(
  blocks: Array<{ type: string; content: string }>,
  athleteConfig: {
    level: string;
    sessionDuration: number | 'ilimitado';
    peso?: number;
    idade?: number;
    sexo?: 'masculino' | 'feminino';
  }
): { totalMinutes: number; totalKcal: number; blockMetrics: Array<{ minutes: number; kcal: number }> } {
  const engineLevel = mapAppLevelToEngine(athleteConfig.level);
  const timeLimitMin = athleteConfig.sessionDuration === 'ilimitado' ? 9999 : athleteConfig.sessionDuration;
  const weightKg = athleteConfig.peso || 70;
  
  const engineBlocks: WorkoutBlock[] = blocks.map(b => ({
    type: mapAppBlockTypeToEngine(b.type),
    title: '',
    items: b.content.split('\n'),
  }));

  const engineAthlete: AthleteConfig = {
    weightKg,
    age: athleteConfig.idade,
    sex: athleteConfig.sexo === 'masculino' ? 'M' : athleteConfig.sexo === 'feminino' ? 'F' : undefined,
    level: engineLevel,
    timeLimitMin,
  };

  const result = buildDayWithAccurateMetrics('', engineBlocks, engineAthlete);

  return {
    totalMinutes: result.totalMinutes,
    totalKcal: athleteConfig.peso ? result.totalKcal : 0,
    blockMetrics: result.blocks.map(b => ({
      minutes: b.targetMinutes ?? 0,
      kcal: athleteConfig.peso ? (b.kcal ?? 0) : 0,
    })),
  };
}

/** Exemplo de uso: montar um dia a partir do texto grande do admin */
export function buildDayFromAdminText(params: {
  adminFullText: string;
  dayKey: string;
  athlete: AthleteConfig;
}): WorkoutDay | "Nenhum treino inserido para este dia." {
  const { adminFullText, dayKey, athlete } = params;

  const daysMap = splitDaysFromAdminText(adminFullText);
  const dayText = daysMap[dayKey];

  if (!dayText || dayText.trim().length === 0) return "Nenhum treino inserido para este dia.";

  const blocks = parseAdminDayText(dayKey, dayText);
  return buildDayWithAccurateMetrics(dayKey, blocks, athlete);
}
