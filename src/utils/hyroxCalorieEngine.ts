/**
 * OUTLIER HYROX CALORIE ENGINE (MOTOR DETERMINÍSTICO)
 * =====================================================
 * 
 * PRINCÍPIOS INVIOLÁVEIS:
 * - Tabela de fatores é a ÚNICA fonte de verdade
 * - Sem uso de MET, FC, ritmo ou heurísticas
 * - O modelo aceita erro ±10%, desde que consistente
 * - Calorias são proxy de carga e estresse, não métrica estética
 * - LPO e ginástica não existem como modalidade principal
 * 
 * FÓRMULAS:
 * - Corrida: kcal = peso_kg × distância_km × fator
 * - Estações: kcal = peso_kg × time_min × fator
 * 
 * REGRA TEMPORAL:
 * - time_min = tempo total contínuo do bloco, incluindo pausas internas
 * - Exclui transições externas
 * - Sem ajuste por densidade, eficiência ou descanso
 */

// ============================================
// TABELA HYROX (FONTE DE VERDADE)
// ============================================

/**
 * Fatores HYROX oficiais (kcal/kg/min ou kcal/kg/km para corrida)
 * SEED: valores iniciais, podem ser migrados para system_params
 */
export const HYROX_FACTORS = {
  // Corrida: fator por km (kcal/kg/km)
  RUN: 1.0,
  
  // Estações HYROX: fator por minuto (kcal/kg/min)
  SKIERG: 0.095,
  ROW: 0.095,
  BURPEE: 0.100,
  WALLBALL: 0.095,
  SITUP: 0.085,
  SLED_PUSH: 0.105,
  SLED_PULL: 0.105,
  LUNGE: 0.100,
  FARMER: 0.100,
  SANDBAG: 0.100,
} as const;

/**
 * Arquétipos de fallback (kcal/kg/min)
 * Para movimentos fora da tabela HYROX
 */
export const FALLBACK_ARCHETYPES = {
  STRENGTH_BAR: 0.095,      // bench press, supino, barbell movements
  STRENGTH_DUMB: 0.090,     // dumbbell, halter
  STRENGTH_MACHINE: 0.085,  // machine, cable, pulley
  BODYWEIGHT: 0.085,        // push-up, pull-up, burpee genérico
  CORE: 0.080,              // plank, crunch, ab
  MIXED_UNKNOWN: 0.085,     // fallback final
} as const;

export type HyroxExerciseKey = keyof typeof HYROX_FACTORS;
export type FallbackArchetypeKey = keyof typeof FALLBACK_ARCHETYPES;

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface CalorieCalculationResult {
  kcal: number;
  resolution: 'hyrox' | 'fallback' | 'error';
  keysUsed: string[];
  usedFallback: boolean;
  warnings: string[];
  error?: string;
}

export interface CalorieCalculationMeta {
  resolution: 'hyrox' | 'fallback' | 'error';
  keysUsed: string[];
  usedFallback: boolean;
  warnings: string[];
  factorSnapshot?: Record<string, number>;
}

// ============================================
// PARSER DETERMINÍSTICO
// ============================================

/**
 * Padrões de keywords para HYROX
 */
const HYROX_PATTERNS: Record<HyroxExerciseKey, RegExp[]> = {
  RUN: [/\brun\b/i, /\bcorrida\b/i, /\bcorrer\b/i, /\btrote\b/i],
  SKIERG: [/\bskierg\b/i, /\bski erg\b/i, /\bski\b/i],
  ROW: [/\brow\b/i, /\bremo\b/i, /\brower\b/i, /\berg\b.*\bremo/i],
  BURPEE: [/\bburpee\b/i, /\bburpees\b/i, /\bbbj\b/i, /\bburpee broad jump\b/i],
  WALLBALL: [/\bwall\s*ball\b/i, /\bwallball\b/i, /\bwb\b/i],
  SITUP: [/\bsit[\s-]*up\b/i, /\bsitup\b/i, /\babdominal\b/i],
  SLED_PUSH: [/\bsled\s*push\b/i, /\bpush\s*sled\b/i],
  SLED_PULL: [/\bsled\s*pull\b/i, /\bpull\s*sled\b/i],
  LUNGE: [/\blunge\b/i, /\blunges\b/i, /\bafundo\b/i],
  FARMER: [/\bfarmer\b/i, /\bfarmers?\s*carry\b/i, /\bcarry\b/i],
  SANDBAG: [/\bsandbag\b/i, /\bsand\s*bag\b/i],
};

/**
 * Padrões de keywords para fallback
 */
const FALLBACK_PATTERNS: Record<FallbackArchetypeKey, RegExp[]> = {
  STRENGTH_BAR: [/\bbench\s*press\b/i, /\bsupino\b/i, /\bbarbell\b/i, /\bdeadlift\b/i, /\bsquat\b/i, /\bback\s*squat\b/i, /\bfront\s*squat\b/i, /\bpress\b/i],
  STRENGTH_DUMB: [/\bdumbbell\b/i, /\bhalter\b/i, /\bdb\s/i, /\bdb$/i],
  STRENGTH_MACHINE: [/\bmachine\b/i, /\bcable\b/i, /\bpulley\b/i, /\bleg\s*press\b/i],
  BODYWEIGHT: [/\bpush[\s-]*up\b/i, /\bpull[\s-]*up\b/i, /\bdip\b/i, /\bair\s*squat\b/i, /\bflexão\b/i],
  CORE: [/\bplank\b/i, /\bprancha\b/i, /\bcrunch\b/i, /\bab\b/i, /\bhollow\b/i, /\brussian\s*twist\b/i],
  MIXED_UNKNOWN: [],
};

/**
 * Detecta ambiguidade proibida (+, /, and, then)
 * Se detectar, retorna erro para que o coach divida o bloco
 */
function detectAmbiguity(line: string): boolean {
  const ambiguityPatterns = [
    /\s\+\s/,           // " + "
    /\s\/\s/,           // " / "
    /\band\b/i,         // "and"
    /\bthen\b/i,        // "then"
    /\s>\s/,            // " > "
    /\binto\b/i,        // "into"
    /\bseguido\s*de\b/i // "seguido de"
  ];
  
  return ambiguityPatterns.some(pattern => pattern.test(line));
}

/**
 * Classifica exercício baseado na linha de texto
 */
function classifyExercise(line: string): {
  type: 'hyrox' | 'fallback' | 'ambiguous';
  key: HyroxExerciseKey | FallbackArchetypeKey;
  isRun?: boolean;
} {
  // Verificar ambiguidade primeiro
  if (detectAmbiguity(line)) {
    return { type: 'ambiguous', key: 'MIXED_UNKNOWN' };
  }
  
  // Verificar padrões HYROX
  for (const [key, patterns] of Object.entries(HYROX_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        return { 
          type: 'hyrox', 
          key: key as HyroxExerciseKey,
          isRun: key === 'RUN'
        };
      }
    }
  }
  
  // Verificar padrões de fallback
  for (const [key, patterns] of Object.entries(FALLBACK_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        return { type: 'fallback', key: key as FallbackArchetypeKey };
      }
    }
  }
  
  // Default: fallback genérico
  return { type: 'fallback', key: 'MIXED_UNKNOWN' };
}

/**
 * Extrai distância em km de uma linha
 */
function extractDistanceKm(content: string): number | null {
  const lower = content.toLowerCase();
  
  // Padrão: Xkm, X km
  const kmMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*km/);
  if (kmMatch) {
    return parseFloat(kmMatch[1].replace(',', '.'));
  }
  
  // Padrão: Xm (metros) -> converter para km
  const mMatch = lower.match(/(\d+)\s*m(?:\s|$|,|;)/);
  if (mMatch) {
    const meters = parseInt(mMatch[1], 10);
    if (meters >= 100) {
      return meters / 1000;
    }
  }
  
  return null;
}

/**
 * Extrai PSE do texto (apenas para fallback)
 */
function extractPSE(content: string): number | null {
  const lower = content.toLowerCase();
  
  // Padrão: PSE X, PSE: X, RPE X
  const pseMatch = lower.match(/(?:pse|rpe)[:\s]*(\d+)/);
  if (pseMatch) {
    const pse = parseInt(pseMatch[1], 10);
    if (pse >= 1 && pse <= 10) {
      return pse;
    }
  }
  
  return null;
}

/**
 * Calcula multiplicador PSE (apenas para fallback)
 * mult = clamp(0.85, 1.15, 0.70 + 0.05 * PSE)
 */
function calculatePSEMultiplier(pse: number | null): number {
  if (pse === null) return 1.0;
  
  const raw = 0.70 + 0.05 * pse;
  return Math.max(0.85, Math.min(1.15, raw));
}

// ============================================
// MOTOR PRINCIPAL
// ============================================

export interface CalculateCaloriesInput {
  /** Peso do atleta em kg (OBRIGATÓRIO) */
  weightKg: number;
  /** Tempo do bloco em segundos (OBRIGATÓRIO para estações) */
  durationSec?: number;
  /** Conteúdo do bloco (linhas de exercício) */
  content: string;
  /** Linhas parseadas (prioridade sobre content) */
  lines?: string[];
  /** PSE do bloco (apenas para fallback) */
  pse?: number;
}

/**
 * MOTOR DETERMINÍSTICO HYROX
 * Calcula calorias de um bloco usando a tabela de fatores
 */
export function calculateHyroxCalories(input: CalculateCaloriesInput): CalorieCalculationResult {
  const { weightKg, durationSec, content, lines, pse } = input;
  const warnings: string[] = [];
  const keysUsed: string[] = [];
  
  // Validação: peso obrigatório
  if (!weightKg || weightKg <= 0) {
    return {
      kcal: 0,
      resolution: 'error',
      keysUsed: [],
      usedFallback: false,
      warnings: [],
      error: 'Peso do atleta é obrigatório',
    };
  }
  
  // Usar lines se disponível, senão parsear content
  const exerciseLines = lines && lines.length > 0
    ? lines
    : content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('('));
  
  if (exerciseLines.length === 0) {
    return {
      kcal: 0,
      resolution: 'error',
      keysUsed: [],
      usedFallback: false,
      warnings: [],
      error: 'Nenhuma linha de exercício encontrada',
    };
  }
  
  let totalKcal = 0;
  let usedFallback = false;
  let hasAmbiguity = false;
  let hasHyroxExercise = false;
  
  for (const line of exerciseLines) {
    const classification = classifyExercise(line);
    
    if (classification.type === 'ambiguous') {
      hasAmbiguity = true;
      warnings.push(`Linha ambígua detectada: "${line.substring(0, 50)}..."`);
      continue;
    }
    
    keysUsed.push(classification.key);
    
    if (classification.type === 'hyrox') {
      hasHyroxExercise = true;
      
      // CORRIDA: fórmula por distância
      if (classification.isRun) {
        const distanceKm = extractDistanceKm(line);
        
        if (distanceKm && distanceKm > 0) {
          const factor = HYROX_FACTORS.RUN;
          const kcal = weightKg * distanceKm * factor;
          totalKcal += kcal;
        } else {
          warnings.push('Corrida sem distância detectável - não contabilizada');
        }
      } else {
        // ESTAÇÕES: fórmula por tempo
        const timeMin = durationSec ? durationSec / 60 : 0;
        
        if (timeMin <= 0) {
          warnings.push(`Tempo do bloco obrigatório para ${classification.key}`);
          continue;
        }
        
        const factor = HYROX_FACTORS[classification.key as HyroxExerciseKey];
        const kcal = weightKg * timeMin * factor;
        totalKcal += kcal;
      }
    } else if (classification.type === 'fallback') {
      usedFallback = true;
      
      // FALLBACK: tempo obrigatório
      const timeMin = durationSec ? durationSec / 60 : 0;
      
      if (timeMin <= 0) {
        warnings.push(`Tempo do bloco obrigatório para fallback (${classification.key})`);
        continue;
      }
      
      const baseFactor = FALLBACK_ARCHETYPES[classification.key as FallbackArchetypeKey];
      
      // Aplicar PSE apenas no fallback
      const effectivePse = pse ?? extractPSE(line);
      const pseMultiplier = calculatePSEMultiplier(effectivePse);
      
      const kcal = weightKg * timeMin * baseFactor * pseMultiplier;
      totalKcal += kcal;
    }
  }
  
  // Erro se houver ambiguidade sem exercícios válidos
  if (hasAmbiguity && totalKcal === 0) {
    return {
      kcal: 0,
      resolution: 'error',
      keysUsed,
      usedFallback: false,
      warnings,
      error: 'Bloco contém linhas ambíguas. Divida os exercícios em linhas separadas.',
    };
  }
  
  return {
    kcal: Math.round(totalKcal),
    resolution: usedFallback ? 'fallback' : (hasHyroxExercise ? 'hyrox' : 'fallback'),
    keysUsed: [...new Set(keysUsed)],
    usedFallback,
    warnings,
  };
}

/**
 * Cria metadados para rastreabilidade
 */
export function createCalorieMeta(result: CalorieCalculationResult): CalorieCalculationMeta {
  return {
    resolution: result.resolution,
    keysUsed: result.keysUsed,
    usedFallback: result.usedFallback,
    warnings: result.warnings,
    factorSnapshot: { ...HYROX_FACTORS, ...FALLBACK_ARCHETYPES },
  };
}

// ============================================
// INTEGRAÇÃO COM BLOCO DE TREINO
// ============================================

import type { WorkoutBlock, AthleteLevel } from '@/types/outlier';
import { getEffectiveDuration, getEffectivePSE } from '@/utils/benchmarkVariants';

/**
 * Calcula calorias para um WorkoutBlock usando o motor determinístico
 */
export function calculateBlockCaloriesHyrox(
  block: WorkoutBlock & { durationSec?: number },
  weightKg: number,
  level?: AthleteLevel
): CalorieCalculationResult {
  // Extrair tempo do bloco
  let durationSec = 0;
  
  // Prioridade 1: durationSec explícito
  if (block.durationSec && block.durationSec > 0) {
    durationSec = block.durationSec;
  } else {
    // Prioridade 2: durationMinutes
    const effectiveDuration = getEffectiveDuration(block, level);
    if (effectiveDuration && effectiveDuration > 0) {
      durationSec = effectiveDuration * 60;
    }
  }
  
  // Extrair PSE
  const pse = getEffectivePSE(block, level);
  
  return calculateHyroxCalories({
    weightKg,
    durationSec,
    content: block.content,
    lines: block.lines,
    pse,
  });
}
