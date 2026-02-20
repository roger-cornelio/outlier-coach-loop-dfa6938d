/**
 * WORKOUT ESTIMATION - MVP
 * 
 * Calcula tempo estimado e calorias por bloco e total do dia,
 * usando dados biométricos do atleta e o treino JÁ ADAPTADO.
 * 
 * REGRA: Este arquivo é a fonte única para estimativas de tempo/calorias.
 * 
 * MOTOR DETERMINÍSTICO HYROX (v2):
 * - Usa tabela de fatores como única fonte de verdade
 * - Sem MET, FC, ritmo ou heurísticas
 * - Corrida: kcal = peso_kg × distância_km × fator
 * - Estações: kcal = peso_kg × time_min × fator
 */

import type { AthleteConfig, WorkoutBlock, DayWorkout, AthleteLevel } from '@/types/outlier';
import { getActiveParams, getLevelSpeedKmh, getNumericParam } from '@/config/outlierParams';
import { getEffectiveDuration, getEffectivePSE } from '@/utils/benchmarkVariants';
import { 
  calculateBlockCaloriesHyrox, 
  type CalorieCalculationMeta,
  createCalorieMeta,
  calculateWorkoutKcalWarnings,
} from '@/utils/hyroxCalorieEngine';

// ============================================
// NOTA: MOTOR DETERMINÍSTICO HYROX
// - Tabela de fatores = única fonte de verdade
// - Removido: ageFactor, sexFactor, weightFactor, PSE principal
// - PSE aplica apenas no fallback (movimentos fora da tabela HYROX)
// ============================================

/**
 * @deprecated PlanTier não influencia mais estimativas
 * Mantido para compatibilidade, sempre retorna 1.0
 */
export function getModeIntensityMultiplier(_planTier?: string, _blockType?: string): number {
  return 1.0;
}

// ============================================
// TIPOS
// ============================================

export interface UserBiometrics {
  weightKg: number | null;
  sex: 'masculino' | 'feminino';
  age: number | null;
  heightCm: number | null;
  isValid: boolean;
  missingWeight: boolean;
}

export interface BlockEstimate {
  blockId: string;
  title: string;
  type: string;
  estimatedMinutes: number;
  estimatedKcal: number;
  confidence: 'high' | 'medium' | 'low';
  items?: string[];
  /** Metadados do motor de calorias (rastreabilidade) */
  kcalMeta?: CalorieCalculationMeta;
}

export interface WorkoutEstimation {
  blocks: BlockEstimate[];
  totals: {
    estimatedMinutesTotal: number;
    estimatedKcalTotal: number;
  };
  biometricsValid: boolean;
  missingWeight: boolean;
  /** Warnings no nível do treino (e.g., HIGH_FALLBACK_USAGE) */
  kcalWarnings?: string[];
}

// ============================================
// HELPER: getUserBiometrics
// ============================================

/**
 * Extrai dados biométricos do athleteConfig com defaults seguros.
 * Peso é obrigatório para cálculo de calorias.
 */
export function getUserBiometrics(athleteConfig: AthleteConfig | null): UserBiometrics {
  if (!athleteConfig) {
    return {
      weightKg: null,
      sex: 'masculino',
      age: null,
      heightCm: null,
      isValid: false,
      missingWeight: true,
    };
  }

  const weightKg = athleteConfig.peso && athleteConfig.peso > 0 ? athleteConfig.peso : null;
  
  return {
    weightKg,
    sex: athleteConfig.sexo || 'masculino',
    age: athleteConfig.idade && athleteConfig.idade > 0 ? athleteConfig.idade : null,
    heightCm: athleteConfig.altura && athleteConfig.altura > 0 ? athleteConfig.altura : null,
    isValid: weightKg !== null,
    missingWeight: weightKg === null,
  };
}

// ============================================
// HELPERS DE CÁLCULO
// ============================================

// REMOVIDO: calculateKcalFromMET - substituído pelo motor determinístico HYROX
// REMOVIDO: detectMETFromContent - substituído pelo parser do motor HYROX

/**
 * Extrai tempo do conteúdo (AMRAP X min, EMOM X, CAP X, etc.)
 */
function extractTimeFromContent(content: string): { minutes: number; confidence: 'high' | 'medium' | 'low' } | null {
  const lower = content.toLowerCase();
  
  // CAP explícito
  const capMatch = lower.match(/cap[:\s]*(\d+)/);
  if (capMatch) {
    return { minutes: parseInt(capMatch[1]), confidence: 'high' };
  }
  
  // AMRAP X min
  const amrapMatch = lower.match(/amrap\s*(\d+)/);
  if (amrapMatch) {
    return { minutes: parseInt(amrapMatch[1]), confidence: 'high' };
  }
  
  // EMOM X
  const emomMatch = lower.match(/emom\s*(\d+)/);
  if (emomMatch) {
    return { minutes: parseInt(emomMatch[1]), confidence: 'high' };
  }
  
  // X min ou X minutos
  const minMatch = lower.match(/(\d+)\s*min/);
  if (minMatch) {
    return { minutes: parseInt(minMatch[1]), confidence: 'high' };
  }
  
  // X' (minutos com apóstrofe)
  const primeMatch = lower.match(/(\d+)['′]/);
  if (primeMatch) {
    return { minutes: parseInt(primeMatch[1]), confidence: 'medium' };
  }
  
  return null;
}

/**
 * Estima distância de corrida do conteúdo
 */
function extractDistanceKm(content: string): number | null {
  const lower = content.toLowerCase();
  
  // Xkm, X km
  const kmMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*km/);
  if (kmMatch) {
    return parseFloat(kmMatch[1].replace(',', '.'));
  }
  
  // Xm (metros)
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
 * Estima tempo para For Time baseado no conteúdo
 */
function estimateForTimeMinutes(content: string, level: AthleteLevel): number {
  const params = getActiveParams();
  
  // Multiplier por nível
  const levelMultiplier = getNumericParam(
    params.estimation.levelMultipliers[level],
    1.0,
    `levelMultiplier.${level}`
  );
  
  // Conta componentes para estimar complexidade
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const componentCount = lines.length;
  
  // Base: 3 min por componente + buffer
  let baseMinutes = Math.max(8, componentCount * 2.5);
  
  // Detecta rounds
  const roundsMatch = content.toLowerCase().match(/(\d+)\s*(rounds?|rondas?)/);
  if (roundsMatch) {
    const rounds = parseInt(roundsMatch[1]);
    baseMinutes = Math.max(baseMinutes, rounds * 2);
  }
  
  // Detecta distância significativa
  const distance = extractDistanceKm(content);
  if (distance && distance >= 1) {
    // Estima tempo por corrida baseado no nível
    const speedKmh = getLevelSpeedKmh(level);
    const runMinutes = (distance / speedKmh) * 60;
    baseMinutes = Math.max(baseMinutes, runMinutes);
  }
  
  return Math.round(baseMinutes * levelMultiplier);
}

// ============================================
// FUNÇÃO PRINCIPAL: estimateBlock
// ============================================

/**
 * Estima tempo e calorias para um bloco específico
 */
export function estimateBlock(
  block: WorkoutBlock,
  biometrics: UserBiometrics,
  level: AthleteLevel
): BlockEstimate {
  const params = getActiveParams();
  
  // 1. Determinar duração do bloco
  let estimatedMinutes = 0;
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  
  // Prioridade 1: durationMinutes explícito (do coach ou adaptação)
  const effectiveDuration = getEffectiveDuration(block, level);
  if (effectiveDuration && effectiveDuration > 0) {
    estimatedMinutes = effectiveDuration;
    confidence = 'high';
  } else {
    // Prioridade 2: Extrair do conteúdo
    const contentTime = extractTimeFromContent(block.content);
    if (contentTime) {
      estimatedMinutes = contentTime.minutes;
      confidence = contentTime.confidence;
    } else {
      // Prioridade 3: Estimar por tipo de bloco
      switch (block.type) {
        case 'aquecimento':
          estimatedMinutes = 10;
          confidence = 'medium';
          break;
        case 'forca':
          estimatedMinutes = 20;
          confidence = 'medium';
          break;
        case 'conditioning':
          estimatedMinutes = estimateForTimeMinutes(block.content, level);
          confidence = 'low';
          break;
        case 'especifico':
          estimatedMinutes = 25;
          confidence = 'medium';
          break;
        case 'core':
          estimatedMinutes = 10;
          confidence = 'medium';
          break;
        case 'corrida':
          const distance = extractDistanceKm(block.content);
          if (distance) {
            const speedKmh = getLevelSpeedKmh(level);
            estimatedMinutes = Math.round((distance / speedKmh) * 60);
            confidence = 'high';
          } else {
            estimatedMinutes = 15;
            confidence = 'low';
          }
          break;
        case 'notas':
          estimatedMinutes = 0;
          confidence = 'high';
          break;
        default:
          estimatedMinutes = 10;
          confidence = 'low';
      }
    }
  }
  
  // Aplicar buffers por tipo
  if (block.type === 'aquecimento' && confidence !== 'high') {
    estimatedMinutes = Math.round(estimatedMinutes * 1.1);
  } else if (block.type === 'forca' && confidence !== 'high') {
    // Força: adicionar tempo de descanso estimado
    estimatedMinutes = Math.round(estimatedMinutes * 1.3);
  } else if (block.type === 'conditioning' && confidence !== 'high') {
    estimatedMinutes = Math.round(estimatedMinutes * 1.15);
  }
  
  // 2. Calcular calorias usando Motor Determinístico HYROX
  let estimatedKcal = 0;
  let kcalMeta: CalorieCalculationMeta | undefined;
  
  if (biometrics.isValid && biometrics.weightKg && estimatedMinutes > 0 && block.type !== 'notas') {
    // Usar motor determinístico HYROX
    const durationSec = estimatedMinutes * 60;
    const blockWithDuration = { ...block, durationSec };
    
    const calorieResult = calculateBlockCaloriesHyrox(
      blockWithDuration,
      biometrics.weightKg,
      level
    );
    
    if (calorieResult.resolution !== 'error') {
      estimatedKcal = calorieResult.kcal;
      kcalMeta = createCalorieMeta(calorieResult);
    } else {
      // Log do erro mas não falha (calorias ficam 0)
      console.warn('[estimateBlock] Erro no motor HYROX:', calorieResult.error);
    }
  }
  
  // GARANTIA: calorias nunca podem ser negativas
  estimatedKcal = Math.max(0, estimatedKcal);
  
  return {
    blockId: block.id,
    title: block.title,
    type: block.type,
    estimatedMinutes: Math.max(0, estimatedMinutes),
    estimatedKcal,
    confidence,
    kcalMeta,
  };
}

// ============================================
// FUNÇÃO PRINCIPAL: estimateWorkout
// ============================================

/**
 * Calcula tempo e calorias para um DayWorkout completo.
 * Recebe o treino JÁ ADAPTADO.
 * NOTA: PlanTier (OPEN/PRO) NÃO influencia mais esta função.
 */
export function estimateWorkout(
  workoutDay: DayWorkout,
  athleteConfig: AthleteConfig | null,
  level: AthleteLevel = 'open'
): WorkoutEstimation {
  const biometrics = getUserBiometrics(athleteConfig);
  
  // PlanTier não influencia mais - multiplicador fixo
  const blocks: BlockEstimate[] = workoutDay.blocks.map(block => {
    return estimateBlock(block, biometrics, level);
  });
  
  const totals = {
    estimatedMinutesTotal: blocks.reduce((sum, b) => sum + b.estimatedMinutes, 0),
    estimatedKcalTotal: Math.max(0, blocks.reduce((sum, b) => sum + b.estimatedKcal, 0)),
  };
  
  // Calcular warnings no nível do treino
  const blocksMeta = blocks
    .map(b => b.kcalMeta)
    .filter((meta): meta is CalorieCalculationMeta => meta !== undefined);
  
  const kcalWarnings = calculateWorkoutKcalWarnings(blocksMeta);
  
  return {
    blocks,
    totals,
    biometricsValid: biometrics.isValid,
    missingWeight: biometrics.missingWeight,
    kcalWarnings: kcalWarnings.length > 0 ? kcalWarnings : undefined,
  };
}

/**
 * Formata tempo em minutos para exibição
 */
export function formatEstimatedTime(minutes: number): string {
  if (minutes <= 0) return '--';
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${minutes} min`;
}

/**
 * Formata calorias para exibição (sempre valor absoluto)
 */
export function formatEstimatedKcal(kcal: number): string {
  const absKcal = Math.abs(kcal);
  if (absKcal <= 0) return '--';
  return `~${absKcal} kcal`;
}
