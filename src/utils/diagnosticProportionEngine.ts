/**
 * diagnosticProportionEngine.ts
 * 
 * Motor de Proporção Diagnóstica — Fonte Única de Verdade
 * 
 * Centraliza a fórmula ponderada de priorização por estação HYROX.
 * Usado tanto no diagnóstico visual (ImprovementTable) quanto
 * no motor de adaptação de treinos (PublishToAthletesModal).
 * 
 * Fórmula: foco = 0.6 × timeWeight + 0.4 × impactWeight
 */

import type { DiagnosticoMelhoria } from '@/components/diagnostico/types';

// ════════════════════════════════════════════════════════════════
// TABELA FIXA DO ESPORTE — baseada em análise de provas HYROX
// ════════════════════════════════════════════════════════════════

export interface StationWeight {
  /** Percentual do tempo total da prova consumido por esta estação */
  timeWeight: number;
  /** Percentual de impacto real na redução do tempo final */
  impactWeight: number;
}

/**
 * Pesos fixos por estação, derivados de análise de provas HYROX.
 * Keys normalizadas em lowercase para matching flexível.
 */
export const STATION_RACE_WEIGHTS: Record<string, StationWeight> = {
  // Corridas (8 segmentos de 1km)
  'running':        { timeWeight: 0.32, impactWeight: 0.30 },
  'corrida':        { timeWeight: 0.32, impactWeight: 0.30 },
  'run':            { timeWeight: 0.32, impactWeight: 0.30 },

  // Wall Balls + BBJ (estações curtas mas de alto impacto)
  'wall balls':     { timeWeight: 0.08, impactWeight: 0.13 },
  'wall ball':      { timeWeight: 0.08, impactWeight: 0.13 },
  'wallballs':      { timeWeight: 0.08, impactWeight: 0.13 },
  'bbj':            { timeWeight: 0.06, impactWeight: 0.10 },
  'burpee broad jump': { timeWeight: 0.06, impactWeight: 0.10 },
  'burpee broad jumps': { timeWeight: 0.06, impactWeight: 0.10 },

  // Sleds (alto impacto, moderado tempo)
  'sled push':      { timeWeight: 0.09, impactWeight: 0.09 },
  'sled pull':      { timeWeight: 0.07, impactWeight: 0.07 },

  // Lunges + Farmers (moderados)
  'sandbag lunges': { timeWeight: 0.07, impactWeight: 0.06 },
  'sandbag lunge':  { timeWeight: 0.07, impactWeight: 0.06 },
  'lunges':         { timeWeight: 0.07, impactWeight: 0.06 },
  'farmers carry':  { timeWeight: 0.06, impactWeight: 0.07 },
  'farmer carry':   { timeWeight: 0.06, impactWeight: 0.07 },
  'farmers':        { timeWeight: 0.06, impactWeight: 0.07 },

  // Ergs (baixo impacto relativo)
  'skierg':         { timeWeight: 0.05, impactWeight: 0.04 },
  'ski':            { timeWeight: 0.05, impactWeight: 0.04 },
  'ski erg':        { timeWeight: 0.05, impactWeight: 0.04 },
  'rowing':         { timeWeight: 0.05, impactWeight: 0.06 },
  'row':            { timeWeight: 0.05, impactWeight: 0.06 },
  'remo':           { timeWeight: 0.05, impactWeight: 0.06 },

  // Roxzone / transições
  'roxzone':        { timeWeight: 0.05, impactWeight: 0.08 },
  'rox zone':       { timeWeight: 0.05, impactWeight: 0.08 },
  'roxzone time':   { timeWeight: 0.05, impactWeight: 0.08 },
  'transição':      { timeWeight: 0.05, impactWeight: 0.08 },
};

// Fallback para estações não mapeadas
const DEFAULT_WEIGHT: StationWeight = { timeWeight: 0.05, impactWeight: 0.05 };

/**
 * Resolve o peso de uma estação pela movimentação (nome).
 * Faz matching case-insensitive e parcial.
 */
export function resolveStationWeight(movementName: string): StationWeight {
  const lower = movementName.toLowerCase().trim();

  // Match exato
  if (STATION_RACE_WEIGHTS[lower]) return STATION_RACE_WEIGHTS[lower];

  // Match parcial
  for (const [key, weight] of Object.entries(STATION_RACE_WEIGHTS)) {
    if (lower.includes(key) || key.includes(lower)) return weight;
  }

  return DEFAULT_WEIGHT;
}

// ════════════════════════════════════════════════════════════════
// FUNÇÕES PÚBLICAS
// ════════════════════════════════════════════════════════════════

export interface WeightedFocusResult {
  movement: string;
  /** Foco ponderado (0-100), usado na coluna "Foco" do diagnóstico */
  focusPercent: number;
  /** Peso bruto ponderado (não normalizado) */
  rawWeight: number;
}

/**
 * Calcula o foco ponderado para cada estação.
 * 
 * Blend de duas perspectivas:
 *   - 60% gap individual (improvement_value normalizado)
 *   - 40% prioridade tática do esporte (0.6×timeWeight + 0.4×impactWeight)
 * 
 * Isso corrige o viés da fórmula linear pura (que superestima estações longas)
 * sem ignorar o gap real do atleta.
 */
export function computeTrainingFocus(diagnosticos: DiagnosticoMelhoria[]): WeightedFocusResult[] {
  if (diagnosticos.length === 0) return [];

  // 1. Percentual linear do gap individual
  const totalImprovement = diagnosticos.reduce((s, d) => s + Math.max(0, d.improvement_value), 0);

  // 2. Prioridade tática fixa por estação
  const sportWeights = diagnosticos.map(d => {
    const sw = resolveStationWeight(d.movement);
    return 0.6 * sw.timeWeight + 0.4 * sw.impactWeight;
  });
  const totalSportWeight = sportWeights.reduce((s, w) => s + w, 0);

  // 3. Blend: 60% gap individual + 40% prioridade tática
  const INDIVIDUAL_WEIGHT = 0.6;
  const SPORT_WEIGHT = 0.4;

  const rawResults = diagnosticos.map((d, i) => {
    const individualPct = totalImprovement > 0 
      ? (Math.max(0, d.improvement_value) / totalImprovement) 
      : 0;
    const sportPct = totalSportWeight > 0 
      ? (sportWeights[i] / totalSportWeight) 
      : 0;
    const blended = INDIVIDUAL_WEIGHT * individualPct + SPORT_WEIGHT * sportPct;
    return {
      movement: d.movement,
      rawWeight: blended,
      focusPercent: 0,
    };
  });

  const totalBlended = rawResults.reduce((s, r) => s + r.rawWeight, 0);
  if (totalBlended > 0) {
    for (const r of rawResults) {
      r.focusPercent = (r.rawWeight / totalBlended) * 100;
    }
  }

  return rawResults;
}

export interface StationEmphasis {
  movement: string;
  /** Multiplicador de volume: 0.85 a 1.15 */
  multiplier: number;
  /** Label para UI: "+15%", "-10%", etc. */
  label: string;
}

const MIN_MULTIPLIER = 0.85;
const MAX_MULTIPLIER = 1.15;

/**
 * Calcula multiplicadores de ênfase por estação (0.85x–1.15x).
 * Volume-neutro: a soma dos multiplicadores ≈ N (número de estações).
 * 
 * Usado no motor de adaptação de treinos para ajustar volume
 * sem alterar exercícios.
 */
export function computeStationEmphasis(diagnosticos: DiagnosticoMelhoria[]): StationEmphasis[] {
  const focusResults = computeTrainingFocus(diagnosticos);
  if (focusResults.length === 0) return [];

  const n = focusResults.length;
  const evenShare = 100 / n;

  // Calcula desvio de cada estação em relação à distribuição uniforme
  const rawMultipliers = focusResults.map(f => {
    const deviation = (f.focusPercent - evenShare) / evenShare;
    // Escala proporcional dentro do range permitido
    const scaled = 1 + deviation * 0.15 / Math.max(
      ...focusResults.map(ff => Math.abs((ff.focusPercent - evenShare) / evenShare) || 1)
    );
    return {
      movement: f.movement,
      rawMult: scaled,
    };
  });

  // Clamp e normalização para volume-neutro
  const clamped = rawMultipliers.map(r => ({
    ...r,
    mult: Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, r.rawMult)),
  }));

  const avgMult = clamped.reduce((s, c) => s + c.mult, 0) / n;
  const normalized = clamped.map(c => ({
    ...c,
    mult: c.mult / avgMult, // Normaliza para média = 1.0
  }));

  // Clamp final após normalização
  return normalized.map(c => {
    const finalMult = Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, c.mult));
    const pctChange = Math.round((finalMult - 1) * 100);
    return {
      movement: c.movement,
      multiplier: Math.round(finalMult * 100) / 100,
      label: pctChange > 0 ? `+${pctChange}%` : pctChange < 0 ? `${pctChange}%` : '0%',
    };
  });
}

// ════════════════════════════════════════════════════════════════
// APLICAÇÃO DE ÊNFASE NOS TREINOS (PUBLISH FLOW)
// ════════════════════════════════════════════════════════════════

/**
 * Identifica qual estação HYROX um bloco de treino representa,
 * analisando tipo do bloco e conteúdo textual.
 * Retorna o multiplicador correspondente ou 1.0 se não houver match.
 */
function resolveBlockMultiplier(
  block: { type?: string; content?: string; title?: string },
  emphasisMap: Map<string, number>
): number {
  const searchTexts = [
    block.type || '',
    block.content || '',
    block.title || '',
  ].join(' ').toLowerCase();

  // Blocos protegidos: nunca alterar aquecimento, mobilidade, notas
  const protectedTypes = ['aquecimento', 'warmup', 'mobilidade', 'notas', 'nota'];
  if (protectedTypes.some(t => searchTexts.includes(t))) return 1.0;

  // Proteger blocos de força com %1RM
  if (searchTexts.includes('%1rm') || searchTexts.includes('% 1rm')) return 1.0;

  // Tentar match com cada movimento no emphasisMap
  for (const [movement, multiplier] of emphasisMap) {
    const lower = movement.toLowerCase();
    if (searchTexts.includes(lower)) return multiplier;
  }

  return 1.0;
}

/**
 * Escala um número dentro de uma string de conteúdo de treino.
 * Arredonda de forma inteligente baseado na magnitude.
 */
function scaleNumericValue(value: number, multiplier: number): number {
  if (multiplier === 1.0) return value;
  const scaled = value * multiplier;
  // Para valores >= 100 (metros), arredondar para 10
  if (value >= 100) return Math.round(scaled / 10) * 10;
  // Para valores >= 10, arredondar para 5
  if (value >= 10) return Math.round(scaled / 5) * 5;
  // Para valores pequenos, manter inteiro
  return Math.max(1, Math.round(scaled));
}

/**
 * Aplica multiplicador de ênfase no conteúdo textual de um bloco.
 * Escala números de reps, metros, calorias sem alterar exercícios.
 */
function scaleBlockContent(content: string, multiplier: number): string {
  if (multiplier === 1.0 || !content) return content;

  return content.replace(
    /\b(\d{1,4})\s*(m|cal|reps?|rounds?|x|metros?)?\b/gi,
    (match, numStr, unit) => {
      const num = parseInt(numStr, 10);
      if (!Number.isFinite(num) || num <= 0) return match;
      // Não escalar números muito pequenos (provavelmente séries) ou muito grandes (timestamps)
      if (num < 3 || num > 5000) return match;
      const scaled = scaleNumericValue(num, multiplier);
      return unit ? `${scaled}${unit}` : `${scaled}`;
    }
  );
}

export interface AdaptedWorkoutResult {
  /** Workouts com volume ajustado */
  workouts: any[];
  /** Workouts originais para rollback */
  originalWorkouts: any[];
  /** Snapshot dos multiplicadores aplicados */
  emphasisSnapshot: StationEmphasis[];
}

/**
 * Aplica multiplicadores de ênfase por estação nos treinos.
 * 
 * - Não muta os workouts originais (deep clone)
 * - Protege blocos de aquecimento, mobilidade e %1RM
 * - Ajusta campos numéricos em parsedExercises e conteúdo textual
 * - Volume-neutro: multiplicadores somam ≈ N
 * 
 * @param workouts Array de DayWorkout originais
 * @param emphasis Array de StationEmphasis do engine
 * @returns Workouts adaptados + originais para auditoria
 */
export function applyEmphasisToWorkouts(
  workouts: any[],
  emphasis: StationEmphasis[]
): AdaptedWorkoutResult {
  // Deep clone para não mutar original
  const originalWorkouts = JSON.parse(JSON.stringify(workouts));
  const adaptedWorkouts = JSON.parse(JSON.stringify(workouts));

  // Criar mapa movement → multiplier
  const emphasisMap = new Map<string, number>();
  for (const e of emphasis) {
    emphasisMap.set(e.movement.toLowerCase(), e.multiplier);
  }

  for (const day of adaptedWorkouts) {
    if (day.isRestDay || !day.blocks) continue;

    for (const block of day.blocks) {
      const multiplier = resolveBlockMultiplier(block, emphasisMap);
      if (multiplier === 1.0) continue;

      // Escalar conteúdo textual
      if (block.content && typeof block.content === 'string') {
        block.content = scaleBlockContent(block.content, multiplier);
      }

      // Escalar rawLines se existirem
      if (Array.isArray(block.rawLines)) {
        block.rawLines = block.rawLines.map((line: string) =>
          scaleBlockContent(line, multiplier)
        );
      }

      // Escalar parsedExercises se existirem
      if (Array.isArray(block.parsedExercises)) {
        for (const ex of block.parsedExercises) {
          if (ex.reps && typeof ex.reps === 'number') {
            ex.reps = scaleNumericValue(ex.reps, multiplier);
          }
          if (ex.distanceMeters && typeof ex.distanceMeters === 'number') {
            ex.distanceMeters = scaleNumericValue(ex.distanceMeters, multiplier);
          }
          if (ex.durationSeconds && typeof ex.durationSeconds === 'number') {
            ex.durationSeconds = scaleNumericValue(ex.durationSeconds, multiplier);
          }
          // Não alterar sets (estrutura do treino) nem carga (%1RM)
        }
      }
    }
  }

  return {
    workouts: adaptedWorkouts,
    originalWorkouts,
    emphasisSnapshot: emphasis,
  };
}
