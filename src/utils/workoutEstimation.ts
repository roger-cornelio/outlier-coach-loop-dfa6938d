/**
 * WORKOUT ESTIMATION - MVP
 * 
 * Calcula tempo estimado e calorias por bloco e total do dia,
 * usando dados biométricos do atleta e o treino JÁ ADAPTADO.
 * 
 * REGRA: Este arquivo é a fonte única para estimativas de tempo/calorias.
 */

import type { AthleteConfig, WorkoutBlock, DayWorkout, AthleteLevel, TrainingLevel } from '@/types/outlier';
import { getActiveParams, getModalityKcal, getIntensityFactor, getLevelSpeedKmh, getNumericParam } from '@/config/outlierParams';
import { getEffectiveDuration, getEffectivePSE } from '@/utils/benchmarkVariants';

// ============================================
// MULTIPLICADORES DE INTENSIDADE POR MODO
// Aplicar apenas em blocos metabolicamente dominantes
// ============================================

const INTENSITY_MULTIPLIERS: Record<TrainingLevel, number> = {
  open: 1.12,  // Intensidade máxima
  pro: 1.12,   // Intensidade máxima
};

// Blocos que recebem multiplicador de intensidade
const METABOLIC_BLOCK_TYPES = ['conditioning', 'especifico', 'corrida', 'hyrox'];

/**
 * Retorna o multiplicador de intensidade baseado no modo de treino
 * Aplica apenas em blocos metabolicamente dominantes
 */
export function getModeIntensityMultiplier(trainingLevel: TrainingLevel | undefined, blockType?: string): number {
  // Se não for bloco metabólico, não aplica multiplicador
  if (blockType && !METABOLIC_BLOCK_TYPES.includes(blockType)) {
    return 1.0;
  }
  return INTENSITY_MULTIPLIERS[trainingLevel || 'progressivo'] || 1.0;
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
}

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
// MAPEAMENTO MET POR TIPO DE EXERCÍCIO
// ============================================

// ============================================
// MAPEAMENTO MET CORRIGIDO - Valores mais realistas
// Baseado em literatura científica + contexto CrossFit/HYROX
// ============================================

const MET_VALUES = {
  // Aeróbio/erg (valores corrigidos para WOD intensity)
  run: 10.0,       // Corrida em WOD (ritmo forte)
  row: 10.0,       // Remo em WOD (intenso)
  ski: 10.0,       // SkiErg em WOD
  bike: 10.0,      // Assault Bike (intervalado/forte)
  
  // Movimentos funcionais (corrigidos para contexto conditioning)
  burpee: 10.0,           // Burpee comum em WOD
  burpee_broad_jump: 11.0, // Burpee Broad Jump (mais intenso)
  thruster: 10.5,
  wallball: 9.5,
  kettlebell: 9.5,
  boxjump: 10.0,
  
  // Carry/Sled (mantidos, já estavam bons)
  farmer: 10.0,
  sled: 11.0,
  sandbag: 10.0,
  lunge: 9.5,
  
  // Força (levemente ajustados)
  strength: 6.5,
  deadlift: 6.5,
  squat: 6.5,
  press: 6.0,
  
  // Tipos de bloco
  conditioning: 10.5,  // Conditioning geral (era 8.0)
  especifico: 12.0,    // HYROX específico (era 9.0)
  aquecimento: 5.0,    // Mantido
  core: 5.0,           // Mantido
  
  // Default
  default: 8.0,
};

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

/**
 * Fórmula MET para calorias:
 * kcal = MET × 3.5 × weight_kg / 200 × minutes
 */
function calculateKcalFromMET(met: number, weightKg: number, minutes: number): number {
  return Math.round((met * 3.5 * weightKg / 200) * minutes);
}

/**
 * Detecta o MET predominante do conteúdo do bloco
 * CORRIGIDO: Prioriza padrões específicos e usa valores atualizados
 */
function detectMETFromContent(content: string, blockType: string): number {
  const lower = content.toLowerCase();
  
  // PRIORIDADE 1: Burpee Broad Jump (deve vir ANTES de burpee comum)
  if (
    lower.includes('burpee broad jump') || 
    lower.includes('burpee broad-jump') || 
    lower.includes('broad jump burpee') ||
    lower.includes('bbj') ||
    lower.includes('burpee + broad jump')
  ) {
    return MET_VALUES.burpee_broad_jump; // 11.0
  }
  
  // PRIORIDADE 2: Padrões específicos de exercício
  if (lower.includes('run') || lower.includes('corr')) return MET_VALUES.run;
  if (lower.includes('row') || lower.includes('remo')) return MET_VALUES.row;
  if (lower.includes('ski')) return MET_VALUES.ski;
  if (lower.includes('bike') || lower.includes('assault')) return MET_VALUES.bike;
  if (lower.includes('burpee')) return MET_VALUES.burpee; // Burpee comum
  if (lower.includes('thruster')) return MET_VALUES.thruster;
  if (lower.includes('wall ball') || lower.includes('wallball')) return MET_VALUES.wallball;
  if (lower.includes('kettlebell') || lower.includes('kb ') || lower.includes('swing')) return MET_VALUES.kettlebell;
  if (lower.includes('box jump')) return MET_VALUES.boxjump;
  if (lower.includes('farmer') || lower.includes('carry')) return MET_VALUES.farmer;
  if (lower.includes('sled') || lower.includes('push') || lower.includes('pull')) return MET_VALUES.sled;
  if (lower.includes('sandbag')) return MET_VALUES.sandbag;
  if (lower.includes('lunge') || lower.includes('afundo')) return MET_VALUES.lunge;
  if (lower.includes('deadlift') || lower.includes('levantamento')) return MET_VALUES.deadlift;
  if (lower.includes('squat') || lower.includes('agachamento')) return MET_VALUES.squat;
  if (lower.includes('press') || lower.includes('supino')) return MET_VALUES.press;
  
  // PRIORIDADE 3: Por tipo de bloco (valores corrigidos)
  if (blockType === 'corrida') return MET_VALUES.run;           // 10.0
  if (blockType === 'forca') return MET_VALUES.strength;        // 6.5
  if (blockType === 'conditioning') return MET_VALUES.conditioning; // 10.5
  if (blockType === 'especifico') return MET_VALUES.especifico; // 12.0
  if (blockType === 'aquecimento') return MET_VALUES.aquecimento; // 5.0
  if (blockType === 'core') return MET_VALUES.core;             // 5.0
  
  return MET_VALUES.default; // 8.0
}

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
  
  // 2. Calcular calorias
  let estimatedKcal = 0;
  
  if (biometrics.isValid && biometrics.weightKg && estimatedMinutes > 0 && block.type !== 'notas') {
    // Caso especial: corrida com distância
    if (block.type === 'corrida') {
      const distance = extractDistanceKm(block.content);
      if (distance && distance > 0) {
        // Fórmula simples: peso × km × fator
        const factor = getNumericParam(params.exerciseMets.runningKcalFactor, 1.0, 'runningKcalFactor');
        estimatedKcal = Math.round(biometrics.weightKg * distance * factor);
      } else {
        // Estimar distância pelo tempo
        const speedKmh = getLevelSpeedKmh(level);
        const estimatedKm = (estimatedMinutes / 60) * speedKmh;
        const factor = getNumericParam(params.exerciseMets.runningKcalFactor, 1.0, 'runningKcalFactor');
        estimatedKcal = Math.round(biometrics.weightKg * estimatedKm * factor);
      }
    } else {
      // Fórmula MET padrão
      const met = detectMETFromContent(block.content, block.type);
      
      // Ajustar MET por PSE se disponível
      const pse = getEffectivePSE(block, level) || 5;
      const pseFactor = getIntensityFactor(pse);
      const adjustedMet = met * pseFactor;
      
      // Ajustar por idade
      let ageFactor = 1.0;
      if (biometrics.age) {
        if (biometrics.age < 30) ageFactor = 1.05;
        else if (biometrics.age < 40) ageFactor = 1.0;
        else if (biometrics.age < 50) ageFactor = 0.95;
        else ageFactor = 0.90;
      }
      
      // Ajustar por sexo
      const sexFactor = biometrics.sex === 'masculino' ? 1.1 : 1.0;
      
      estimatedKcal = calculateKcalFromMET(adjustedMet, biometrics.weightKg, estimatedMinutes);
      estimatedKcal = Math.round(estimatedKcal * ageFactor * sexFactor);
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
  };
}

// ============================================
// FUNÇÃO PRINCIPAL: estimateWorkout
// ============================================

/**
 * Calcula tempo e calorias para um DayWorkout completo.
 * Recebe o treino JÁ ADAPTADO.
 * Aplica multiplicador de intensidade baseado no modo (BASE/PROGRESSIVO/PERFORMANCE).
 */
export function estimateWorkout(
  workoutDay: DayWorkout,
  athleteConfig: AthleteConfig | null,
  level: AthleteLevel = 'intermediario'
): WorkoutEstimation {
  const biometrics = getUserBiometrics(athleteConfig);
  
  // Multiplicador de intensidade por modo de treino
  const intensityMultiplier = getModeIntensityMultiplier(athleteConfig?.trainingLevel);
  
  const blocks: BlockEstimate[] = workoutDay.blocks.map(block => {
    const estimate = estimateBlock(block, biometrics, level);
    
    // Aplicar multiplicador de intensidade nas calorias
    const adjustedKcal = Math.max(0, Math.round(estimate.estimatedKcal * intensityMultiplier));
    
    return {
      ...estimate,
      estimatedKcal: adjustedKcal,
    };
  });
  
  const totals = {
    estimatedMinutesTotal: blocks.reduce((sum, b) => sum + b.estimatedMinutes, 0),
    estimatedKcalTotal: Math.max(0, blocks.reduce((sum, b) => sum + b.estimatedKcal, 0)),
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
 * Formata calorias para exibição (sempre valor absoluto)
 */
export function formatEstimatedKcal(kcal: number): string {
  const absKcal = Math.abs(kcal);
  if (absKcal <= 0) return '--';
  return `~${absKcal} kcal`;
}
