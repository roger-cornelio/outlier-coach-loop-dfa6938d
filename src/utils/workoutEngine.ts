// workoutEngine.ts

export type AthleteLevel = "INICIANTE" | "INTERMEDIARIO" | "AVANCADO" | "HYROX_PRO";

export type BlockType = "warmup" | "strength" | "conditioning" | "core" | "run";

export type WorkoutBlock = {
  type: BlockType;
  title: string;
  items: string[];          // linhas do treino (texto)
  targetMinutes?: number;   // minutos planejados (definidos pelo engine)
  met?: number;             // MET usado no cálculo
  kcal?: number;            // kcal calculado
};

export type WorkoutDay = {
  dayLabel: string;         // "QUARTA-FEIRA"
  blocks: WorkoutBlock[];
  totalMinutes: number;
  totalKcal: number;
};

export type AthleteConfig = {
  weightKg: number;
  heightCm?: number;
  age?: number;
  sex?: "M" | "F";
  level: AthleteLevel;
  timeLimitMin: number; // 30/45/60/90/9999 (ilimitado)
};

/**
 * MET base por tipo de bloco (ajuste fino depois, mas isso já fica consistente)
 */
const DEFAULT_MET: Record<BlockType, number> = {
  warmup: 5.5,
  strength: 6.5,
  conditioning: 12.0, // HYROX for time é alto
  core: 5.5,
  run: 9.5, // corrida Z2/leve-moderado. Se PSE 7, pode subir p/ 10.5
};

/**
 * Fórmula padrão (determinística)
 * kcal = MET * 3.5 * peso(kg) / 200 * minutos
 */
export function kcalFromMet(met: number, weightKg: number, minutes: number): number {
  return (met * 3.5 * weightKg / 200) * minutes;
}

/**
 * Orçamento de tempo por opção (sempre soma <= timeLimit)
 * Ajuste como quiser, mas mantenha determinístico.
 */
export function getTimeBudget(timeLimitMin: number): Record<BlockType, number> {
  // "ilimitado" -> você ainda define um padrão pra não explodir
  if (timeLimitMin >= 9999) {
    return { warmup: 12, strength: 20, conditioning: 60, core: 10, run: 0 };
  }

  if (timeLimitMin <= 30) {
    return { warmup: 5, strength: 5, conditioning: 18, core: 2, run: 0 };
  }
  if (timeLimitMin <= 45) {
    return { warmup: 8, strength: 10, conditioning: 24, core: 3, run: 0 };
  }
  if (timeLimitMin <= 60) {
    return { warmup: 10, strength: 15, conditioning: 30, core: 5, run: 0 };
  }
  // 90
  return { warmup: 12, strength: 20, conditioning: 50, core: 8, run: 0 };
}

/**
 * Multiplicadores por nível — use isso para "escala" (reps/rounds/cargas)
 * -> Aqui NÃO calculamos reps automaticamente (isso é adaptação da IA),
 * mas você pode usar isso para exibir sugestões ou validar "agressividade".
 */
export function getLevelMultipliers(level: AthleteLevel) {
  switch (level) {
    case "INICIANTE": return { volume: 0.70, load: 0.75, intensity: 0.85 };
    case "INTERMEDIARIO": return { volume: 1.00, load: 1.00, intensity: 1.00 };
    case "AVANCADO": return { volume: 1.15, load: 1.05, intensity: 1.05 };
    case "HYROX_PRO": return { volume: 1.25, load: 1.10, intensity: 1.10 };
  }
}

/**
 * Mapeia o nível do app para o nível do engine
 */
export function mapAppLevelToEngine(level: string): AthleteLevel {
  switch (level) {
    case 'iniciante': return 'INICIANTE';
    case 'intermediario': return 'INTERMEDIARIO';
    case 'avancado': return 'AVANCADO';
    case 'hyrox_pro': return 'HYROX_PRO';
    default: return 'INTERMEDIARIO';
  }
}

/**
 * Mapeia o tipo de bloco do app para o tipo do engine
 */
export function mapAppBlockTypeToEngine(type: string): BlockType {
  switch (type) {
    case 'aquecimento': return 'warmup';
    case 'forca': return 'strength';
    case 'conditioning': return 'conditioning';
    case 'core': return 'core';
    case 'corrida': return 'run';
    case 'especifico': return 'conditioning';
    case 'notas': return 'core'; // fallback
    default: return 'conditioning';
  }
}

/**
 * Parser simples do texto do admin:
 * - Detecta blocos por palavras-chave
 * - Mantém as linhas como itens
 * - Não inventa nada
 */
export function parseAdminDayText(dayLabel: string, dayText: string): WorkoutBlock[] {
  const lines = dayText
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("-----"));

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
    if (upper.includes("FORÇA") || upper.includes("STRENGTH") || upper.includes("TÉCNICA") || upper.includes("SKILL")) {
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

    // linhas normais
    if (!current) {
      // Se o admin não colocou cabeçalho, jogamos no conditioning por padrão (melhor que inventar)
      current = { type: "conditioning", title: "Treino", items: [] };
    }
    current.items.push(line);
  }

  pushCurrent();
  return blocks;
}

/**
 * Aplica orçamento de tempo + MET + calcula kcal por bloco
 * e GARANTE que totalMinutes <= timeLimitMin.
 *
 * Se existir bloco "run" opcional e faltar tempo, ele zera primeiro.
 */
export function buildDayWithAccurateMetrics(
  dayLabel: string,
  blocks: WorkoutBlock[],
  athlete: AthleteConfig
): WorkoutDay {
  const budget = getTimeBudget(athlete.timeLimitMin);

  // 1) Definir minutos alvo por tipo (determinístico)
  const planned: WorkoutBlock[] = blocks.map(b => ({
    ...b,
    targetMinutes: budget[b.type] ?? 0,
    met: DEFAULT_MET[b.type] ?? 6.0,
  }));

  // 2) Se tiver corrida marcada como opcional e você quer que só entre se sobrar tempo:
  // Ex: QUARTA tem "Corrida (opcional)"
  // Se o texto contém "opcional", setamos run=0 por padrão.
  planned.forEach(b => {
    if (b.type === "run") {
      const joined = b.items.join(" ").toLowerCase();
      if (joined.includes("opcional")) b.targetMinutes = 0;
    }
  });

  // 3) Ajuste fino: se o treino não tiver algum bloco, redistribui automaticamente pro conditioning
  const presentTypes = new Set(planned.map(b => b.type));
  const missingWarmup = !presentTypes.has("warmup");
  const missingStrength = !presentTypes.has("strength");
  const missingCore = !presentTypes.has("core");

  const conditioningIdx = planned.findIndex(b => b.type === "conditioning");
  if (conditioningIdx >= 0) {
    // Se faltou blocos, joga parte do tempo pro conditioning (sem inventar)
    let extra = 0;
    if (missingWarmup) extra += budget.warmup;
    if (missingStrength) extra += budget.strength;
    if (missingCore) extra += budget.core;

    planned[conditioningIdx].targetMinutes = (planned[conditioningIdx].targetMinutes ?? 0) + extra;
  }

  // 4) Garantia: nunca estourar tempo (corte em ordem)
  // Ordem de corte: run -> core -> conditioning -> strength -> warmup
  const cutOrder: BlockType[] = ["run", "core", "conditioning", "strength", "warmup"];

  const sumMinutes = () => planned.reduce((acc, b) => acc + (b.targetMinutes ?? 0), 0);

  let total = sumMinutes();
  const limit = athlete.timeLimitMin >= 9999 ? total : athlete.timeLimitMin;

  if (total > limit) {
    let overflow = total - limit;

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

  // 5) Calcular kcal por bloco (determinístico)
  planned.forEach(b => {
    const mins = b.targetMinutes ?? 0;
    const met = b.met ?? 6.0;

    // ajuste simples por intensidade do nível (opcional e consistente)
    const { intensity } = getLevelMultipliers(athlete.level);
    const metAdjusted = met * intensity;

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
  };
}

/**
 * Extrai dias (QUARTA/QUINTA/SEXTA/SÁBADO) do texto grande do admin.
 * Você pode chamar isso no upload do admin e salvar estruturado.
 */
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
      upper.includes("📅 QUARTA") ||
      upper.includes("📅 QUINTA") ||
      upper.includes("📅 SEXTA") ||
      upper.includes("📅 SÁBADO") ||
      upper.includes("📅 SABADO") ||
      upper.includes("📅 DOMINGO") ||
      upper.includes("📅 SEGUNDA") ||
      upper.includes("📅 TERÇA") ||
      upper.includes("📅 TERCA");

    if (isDayHeader) {
      flush();
      // pega o label após o emoji
      currentDay = line.replace("📅", "").trim();
      continue;
    }

    if (currentDay) buffer.push(raw);
  }

  flush();
  return days;
}

/**
 * Calcula métricas para blocos existentes do app usando o engine
 */
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
    totalKcal: athleteConfig.peso ? result.totalKcal : 0, // Só retorna kcal se peso configurado
    blockMetrics: result.blocks.map(b => ({
      minutes: b.targetMinutes ?? 0,
      kcal: athleteConfig.peso ? (b.kcal ?? 0) : 0,
    })),
  };
}
