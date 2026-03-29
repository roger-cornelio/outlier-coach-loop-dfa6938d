/**
 * WORKOUT ESTIMATION - MVP
 * 
 * Calcula tempo estimado por bloco e total do dia,
 * usando dados biométricos do atleta e o treino JÁ ADAPTADO.
 * 
 * NOTA: Calorias agora são calculadas pelo Motor Físico (energyCalculator.ts).
 * Este arquivo foca APENAS em estimativa de TEMPO.
 */

import type { AthleteConfig, WorkoutBlock, DayWorkout, AthleteLevel } from '@/types/outlier';
import { getActiveParams, getLevelSpeedKmh, getNumericParam } from '@/config/outlierParams';
import { getEffectiveDuration } from '@/utils/benchmarkVariants';
import { parseRoundGroups } from '@/utils/workoutStructures';

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
  confidencePercent: number;
  items?: string[];
}

// METs por tipo de bloco (sincronizados com motor físico)
const BLOCK_TYPE_METS: Record<string, number> = {
  aquecimento: 4.0,
  forca: 5.0,
  conditioning: 8.0,
  especifico: 6.5,
  core: 3.5,
  corrida: 9.0,
  mobilidade: 2.5,
  tecnica: 3.0,
  notas: 0,
};

const CONFIDENCE_PERCENT_MAP: Record<'high' | 'medium' | 'low', number> = {
  high: 75,
  medium: 60,
  low: 45,
};

export interface WorkoutEstimation {
  blocks: BlockEstimate[];
  totals: {
    estimatedMinutesTotal: number;
    estimatedKcalTotal: number;
  };
  biometricsValid: boolean;
  missingWeight: boolean;
}

// ============================================
// HELPER: getUserBiometrics
// ============================================

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
// HELPERS DE CÁLCULO DE TEMPO
// ============================================

function extractTimeFromContent(content: string): { minutes: number; confidence: 'high' | 'medium' | 'low' } | null {
  if (!content) return null;
  const lower = content.toLowerCase();
  
  const capMatch = lower.match(/cap[:\s]*(\d+)/);
  if (capMatch) {
    return { minutes: parseInt(capMatch[1]), confidence: 'high' };
  }
  
  const amrapMatch = lower.match(/amrap\s*(\d+)/);
  if (amrapMatch) {
    return { minutes: parseInt(amrapMatch[1]), confidence: 'high' };
  }
  
  const emomMatch = lower.match(/emom\s*(\d+)/);
  if (emomMatch) {
    return { minutes: parseInt(emomMatch[1]), confidence: 'high' };
  }
  
  const minMatch = lower.match(/(\d+)\s*min/);
  if (minMatch) {
    return { minutes: parseInt(minMatch[1]), confidence: 'high' };
  }
  
  const primeMatch = lower.match(/(\d+)['′]/);
  if (primeMatch) {
    return { minutes: parseInt(primeMatch[1]), confidence: 'medium' };
  }
  
  return null;
}

function extractDistanceKm(content: string): number | null {
  const lower = content.toLowerCase();
  
  const kmMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*km/);
  if (kmMatch) {
    return parseFloat(kmMatch[1].replace(',', '.'));
  }
  
  const mMatch = lower.match(/(\d+)\s*m(?:\s|$|,|;)/);
  if (mMatch) {
    const meters = parseInt(mMatch[1], 10);
    if (meters >= 100) {
      return meters / 1000;
    }
  }
  
  return null;
}

function estimateForTimeMinutes(content: string, level: AthleteLevel): number {
  const params = getActiveParams();
  
  const levelMultiplier = getNumericParam(
    params.estimation.levelMultipliers[level],
    1.0,
    `levelMultiplier.${level}`
  );
  
  // ════════════════════════════════════════════════════════════════════════════
  // ROUND GROUPS: Cada marcador de rounds multiplica APENAS seus exercícios
  // ════════════════════════════════════════════════════════════════════════════
  const roundGroups = parseRoundGroups(content);
  
  if (roundGroups.length > 0) {
    let totalMinutes = 0;
    
    for (const group of roundGroups) {
      const groupLines = group.exerciseLines;
      let groupBaseMinutes = Math.max(2, groupLines.length * 2.5);
      
      // Checar distância dentro do grupo
      const groupContent = groupLines.join('\n');
      const distance = extractDistanceKm(groupContent);
      if (distance && distance >= 1) {
        const speedKmh = getLevelSpeedKmh(level);
        const runMinutes = (distance / speedKmh) * 60;
        groupBaseMinutes = Math.max(groupBaseMinutes, runMinutes);
      }
      
      totalMinutes += groupBaseMinutes * group.multiplier;
    }
    
    return Math.round(Math.max(8, totalMinutes) * levelMultiplier);
  }
  
  // Fallback legado (sem round groups detectados)
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const componentCount = lines.length;
  
  let baseMinutes = Math.max(8, componentCount * 2.5);
  
  const distance = extractDistanceKm(content);
  if (distance && distance >= 1) {
    const speedKmh = getLevelSpeedKmh(level);
    const runMinutes = (distance / speedKmh) * 60;
    baseMinutes = Math.max(baseMinutes, runMinutes);
  }
  
  return Math.round(baseMinutes * levelMultiplier);
}

/**
 * @deprecated PlanTier não influencia mais estimativas
 */
export function getModeIntensityMultiplier(_planTier?: string, _blockType?: string): number {
  return 1.0;
}

// ============================================
// FUNÇÃO PRINCIPAL: estimateBlock
// ============================================

export function estimateBlock(
  block: WorkoutBlock,
  biometrics: UserBiometrics,
  level: AthleteLevel
): BlockEstimate {
  // 1. Determinar duração do bloco
  let estimatedMinutes = 0;
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  
  const effectiveDuration = getEffectiveDuration(block, level);
  if (effectiveDuration && effectiveDuration > 0) {
    estimatedMinutes = effectiveDuration;
    confidence = 'high';
  } else {
    const contentTime = extractTimeFromContent(block.content || '');
    if (contentTime) {
      estimatedMinutes = contentTime.minutes;
      confidence = contentTime.confidence;
    } else {
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
          estimatedMinutes = estimateForTimeMinutes(block.content || '', level);
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
        case 'mobilidade':
          estimatedMinutes = 10;
          confidence = 'medium';
          break;
        case 'tecnica':
          estimatedMinutes = 15;
          confidence = 'medium';
          break;
        case 'acessorio':
          estimatedMinutes = 10;
          confidence = 'medium';
          break;
        case 'metcon':
          estimatedMinutes = estimateForTimeMinutes(block.content || '', level);
          confidence = 'low';
          break;
        default:
          estimatedMinutes = 10;
          confidence = 'low';
      }
    }
  }
  
  // Apply buffers
  if (block.type === 'aquecimento' && confidence !== 'high') {
    estimatedMinutes = Math.round(estimatedMinutes * 1.1);
  } else if (block.type === 'forca' && confidence !== 'high') {
    estimatedMinutes = Math.round(estimatedMinutes * 1.3);
  } else if (block.type === 'conditioning' && confidence !== 'high') {
    estimatedMinutes = Math.round(estimatedMinutes * 1.15);
  }
  
  // Fallback Kcal via MET × peso × tempo
  const weightKg = biometrics.weightKg || 75;
  const met = BLOCK_TYPE_METS[block.type] || 5.0;
  const estimatedKcal = estimatedMinutes > 0
    ? Math.round(met * weightKg * (estimatedMinutes / 60))
    : 0;

  const confidencePercent = CONFIDENCE_PERCENT_MAP[confidence];
  
  return {
    blockId: block.id,
    title: block.title,
    type: block.type,
    estimatedMinutes: Math.max(0, estimatedMinutes),
    estimatedKcal,
    confidence,
    confidencePercent,
  };
}

// ============================================
// FUNÇÃO PRINCIPAL: estimateWorkout
// ============================================

export function estimateWorkout(
  workoutDay: DayWorkout,
  athleteConfig: AthleteConfig | null,
  level: AthleteLevel = 'open'
): WorkoutEstimation {
  const biometrics = getUserBiometrics(athleteConfig);
  
  const blocks: BlockEstimate[] = workoutDay.blocks.map(block => {
    return estimateBlock(block, biometrics, level);
  });
  
  const totals = {
    estimatedMinutesTotal: blocks.reduce((sum, b) => sum + b.estimatedMinutes, 0),
    estimatedKcalTotal: blocks.reduce((sum, b) => sum + b.estimatedKcal, 0),
  };
  
  return {
    blocks,
    totals,
    biometricsValid: biometrics.isValid,
    missingWeight: biometrics.missingWeight,
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
 * Formata calorias para exibição
 */
export function formatEstimatedKcal(kcal: number): string {
  const absKcal = Math.abs(kcal);
  if (absKcal <= 0) return '--';
  return `~${absKcal} kcal`;
}
