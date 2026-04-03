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
 * Calcula o foco ponderado para cada estação usando a fórmula:
 *   foco = 0.6 × timeWeight + 0.4 × impactWeight
 * 
 * Cruza a tabela fixa com o gap individual (improvement_value).
 * Retorna percentuais normalizados que somam ~100%.
 */
export function computeTrainingFocus(diagnosticos: DiagnosticoMelhoria[]): WeightedFocusResult[] {
  if (diagnosticos.length === 0) return [];

  const rawResults = diagnosticos.map(d => {
    const stationW = resolveStationWeight(d.movement);
    const baseWeight = 0.6 * stationW.timeWeight + 0.4 * stationW.impactWeight;
    // Multiplica pelo gap individual para personalizar
    const individualWeight = baseWeight * Math.max(0, d.improvement_value);
    return {
      movement: d.movement,
      rawWeight: individualWeight,
      focusPercent: 0,
    };
  });

  const totalRaw = rawResults.reduce((sum, r) => sum + r.rawWeight, 0);

  if (totalRaw > 0) {
    for (const r of rawResults) {
      r.focusPercent = (r.rawWeight / totalRaw) * 100;
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
