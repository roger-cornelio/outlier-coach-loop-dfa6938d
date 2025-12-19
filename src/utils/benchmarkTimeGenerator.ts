import type { WorkoutBlock, WodType, AthleteLevel, TargetTimeRange, LevelTargetRanges } from '@/types/outlier';
import { 
  getActiveParams, 
  getParamsForWod,
  getWodTypeFactor, 
  getLevelMultiplier,
  getNumericParam,
  OutlierParamsConfig
} from '@/config/outlierParams';

/**
 * SISTEMA DE GERAÇÃO AUTOMÁTICA DE FAIXAS DE TEMPO DE REFERÊNCIA
 * 
 * Gera faixas de tempo para cada nível de atleta baseado em:
 * - Tipo de WOD (For Time, AMRAP, Chipper, Intervalado)
 * - Volume total estimado
 * - Modalidades envolvidas
 * - Padrões do Cross Training / HYROX
 * 
 * TODOS os parâmetros vêm do config central (outlierParams)
 */

// Detecta modalidades no conteúdo do treino
interface ModalityAnalysis {
  hasRunning: boolean;
  hasRowing: boolean;
  hasBike: boolean;
  hasSkiErg: boolean;
  hasWeightlifting: boolean;
  hasGymnastics: boolean;
  hasSled: boolean;
  roundCount: number;
  repCount: number;
  distanceMeters: number;
}

function analyzeWorkoutContent(content: string): ModalityAnalysis {
  const lowerContent = content.toLowerCase();
  
  // Detecta rounds/séries
  const roundMatch = content.match(/(\d+)\s*(rounds?|séries?|x\s*:|vezes)/i);
  const roundCount = roundMatch ? parseInt(roundMatch[1]) : 1;
  
  // Detecta reps totais aproximadas
  const repMatches: string[] = content.match(/(\d+)\s*(reps?|repetições?|x\b)/gi) || [];
  const repCount = repMatches.reduce((sum: number, match: string) => {
    const num = parseInt(match);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);
  
  // Detecta distância
  const distMatch: string[] = content.match(/(\d+)\s*m\b/gi) || [];
  const distanceMeters = distMatch.reduce((sum: number, match: string) => {
    const num = parseInt(match);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  return {
    hasRunning: /run|corrida|correr|\d+\s*m\s*(run)?/i.test(lowerContent),
    hasRowing: /row|remo|ergômetro|\d+\s*cal\s*row/i.test(lowerContent),
    hasBike: /bike|assault|air\s*bike|\d+\s*cal\s*bike/i.test(lowerContent),
    hasSkiErg: /ski|skierg/i.test(lowerContent),
    hasWeightlifting: /deadlift|clean|snatch|press|thruster|squat|levantamento|agachamento|supino|kb|kettlebell|dumbbell|halter/i.test(lowerContent),
    hasGymnastics: /pull[- ]?up|push[- ]?up|burpee|muscle[- ]?up|toes[- ]?to[- ]?bar|handstand|rope\s*climb|flexão|barra/i.test(lowerContent),
    hasSled: /sled|push|pull|arrasto/i.test(lowerContent),
    roundCount,
    repCount,
    distanceMeters,
  };
}

// Detecta tipo de WOD pelo conteúdo
function detectWodFormat(content: string): 'for_time' | 'amrap' | 'emom' | 'chipper' | 'interval' | 'unknown' {
  const lowerContent = content.toLowerCase();
  
  if (/for\s*time|por\s*tempo|ft\b/i.test(lowerContent)) return 'for_time';
  if (/amrap/i.test(lowerContent)) return 'amrap';
  if (/emom|every\s*min/i.test(lowerContent)) return 'emom';
  if (/chipper/i.test(lowerContent)) return 'chipper';
  if (/interval|intervalado|tabata|on[\/\s]off/i.test(lowerContent)) return 'interval';
  
  // Heurísticas adicionais
  const movements = (lowerContent.match(/\d+\s+[a-z]/gi) || []).length;
  if (movements >= 5) return 'chipper';
  
  return 'for_time';
}

// Estima tempo base em segundos usando config
function estimateBaseTimeSeconds(content: string, durationMinutes?: number): number {
  const params = getActiveParams();
  
  // Se já temos duração definida, usar como base
  if (durationMinutes && durationMinutes > 0) {
    return durationMinutes * 60;
  }
  
  const analysis = analyzeWorkoutContent(content);
  const format = detectWodFormat(content);
  
  // Tempos base por modalidade (do config)
  const mets = params.exerciseMets.metBaseByModality;
  let baseSeconds = 0;
  
  // Tempo estimado por modalidade (segundos)
  // Usando uma heurística: baseKcalPerMin maior = mais intenso = menos tempo por unidade
  if (analysis.hasRunning) {
    baseSeconds += analysis.distanceMeters > 0 ? analysis.distanceMeters * 0.3 : 180;
  }
  if (analysis.hasRowing) baseSeconds += 120;
  if (analysis.hasBike) baseSeconds += 90;
  if (analysis.hasSkiErg) baseSeconds += 100;
  if (analysis.hasWeightlifting) baseSeconds += 60;
  if (analysis.hasGymnastics) baseSeconds += 90;
  if (analysis.hasSled) baseSeconds += 120;
  
  // Multiplicar por rounds
  baseSeconds *= Math.max(1, analysis.roundCount);
  
  // Ajuste por formato (do config)
  const formatMultiplier = getNumericParam(
    params.estimation.formatMultipliers[format as keyof typeof params.estimation.formatMultipliers],
    1.0,
    `formatMultiplier.${format}`
  );
  
  // Ajuste por formato
  switch (format) {
    case 'amrap':
      baseSeconds = Math.max(baseSeconds, 600); // Mínimo 10 min
      break;
    case 'emom':
      const emomMinMatch = content.match(/(\d+)\s*min/i);
      if (emomMinMatch) baseSeconds = parseInt(emomMinMatch[1]) * 60;
      break;
    case 'chipper':
      baseSeconds = Math.max(baseSeconds * formatMultiplier, 720);
      break;
    case 'interval':
      baseSeconds = Math.max(baseSeconds, 900);
      break;
  }
  
  // Limites do config
  const minSeconds = getNumericParam(params.estimation.minEstimateSeconds, 300, 'minEstimate');
  const maxSeconds = getNumericParam(params.estimation.maxEstimateSeconds, 7200, 'maxEstimate');
  
  return Math.max(minSeconds, Math.min(maxSeconds, baseSeconds));
}

/**
 * Gera faixas de tempo de referência para cada nível de atleta
 * APENAS para WODs marcados como BENCHMARK
 * 
 * Usa parâmetros da versão salva no WOD (paramsVersionUsed) se existir,
 * garantindo que benchmarks antigos não mudem quando params são atualizados.
 * 
 * @param block O bloco de treino
 * @param overrideParams Parâmetros opcionais para sobrescrever (usado em migração)
 * @returns Objeto com faixas de tempo para cada nível
 */
export function generateBenchmarkTimeRanges(block: WorkoutBlock, overrideParams?: OutlierParamsConfig): LevelTargetRanges {
  // Usa parâmetros da versão do WOD ou params ativos
  const params = overrideParams || getParamsForWod(block);
  const wodType = block.wodType || 'default';
  
  // Buscar fatores do wodType dos params
  const typeConfig = params.estimation.wodTypeFactors[wodType as WodType | 'default'] 
    || params.estimation.wodTypeFactors.default 
    || { baseMinutes: 15, variancePercent: 0.18 };
  
  // Estimar tempo base
  const baseSeconds = block.durationMinutes 
    ? block.durationMinutes * 60 
    : estimateBaseTimeSeconds(block.content, block.durationMinutes);
  
  const result: LevelTargetRanges = {};
  
  // Gerar para cada nível (do config)
  const levels = params.labels.athleteLevels.filter(l => l !== 'hyrox_open') as AthleteLevel[];
  
  for (const level of levels) {
    // Buscar multiplicador de nível dos params
    const levelFactor = params.estimation.levelMultipliers[level] || 1.0;
    const adjustedBase = baseSeconds * levelFactor;
    
    // Variação para criar a faixa (min/max)
    const variance = adjustedBase * (typeConfig.variancePercent || 0.15);
    
    result[level] = {
      min: Math.round(adjustedBase - variance),
      max: Math.round(adjustedBase + variance),
    };
  }
  
  return result;
}

/**
 * Obtém os parâmetros de benchmark para um WOD
 * Retorna os params da versão salva no WOD ou os ativos
 */
export function getBenchmarkParams(block: WorkoutBlock): OutlierParamsConfig {
  return getParamsForWod(block);
}

/**
 * Formata tempo em segundos para "MM:SS"
 */
export function formatTimeRange(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Descreve a faixa de tempo em texto legível
 */
export function describeTimeRange(range: TargetTimeRange): string {
  return `${formatTimeRange(range.min)} – ${formatTimeRange(range.max)}`;
}

/**
 * Verifica se um WOD deve ser usado para métricas de evolução
 * Baseado na regra do config da versão do WOD
 */
export function shouldTrackEvolution(block: WorkoutBlock): boolean {
  const params = getParamsForWod(block);
  if (params.benchmark.enabledOnlyForBenchmark) {
    return block.isBenchmark === true;
  }
  return true; // Se não for only benchmark, todos são rastreados
}

/**
 * Obtém a descrição do tipo de WOD
 */
export function getWodTypeLabel(wodType?: WodType): string {
  const labels: Record<WodType, string> = {
    engine: 'Engine / Conditioning',
    strength: 'Força',
    skill: 'Skill / Técnico',
    mixed: 'Misto',
    hyrox: 'HYROX Específico',
    benchmark: 'Benchmark',
  };
  return wodType ? labels[wodType] : 'Não definido';
}

/**
 * Calcula intensidade média esperada do WOD
 */
export function estimateIntensity(block: WorkoutBlock): 'baixa' | 'moderada' | 'alta' | 'muito_alta' {
  const content = block.content.toLowerCase();
  const analysis = analyzeWorkoutContent(content);
  
  let score = 0;
  
  // Pontos por modalidade de alta intensidade
  if (analysis.hasRunning) score += 2;
  if (analysis.hasRowing) score += 2;
  if (analysis.hasBike) score += 3;
  if (analysis.hasWeightlifting) score += 2;
  if (analysis.hasGymnastics) score += 2;
  if (analysis.hasSled) score += 3;
  
  // Multiplicador por rounds
  if (analysis.roundCount >= 5) score += 2;
  else if (analysis.roundCount >= 3) score += 1;
  
  // Keywords de intensidade
  if (/max|máximo|sprint|all[- ]?out|pace/i.test(content)) score += 2;
  if (/rest|descanso|recover/i.test(content)) score -= 1;
  
  if (score >= 8) return 'muito_alta';
  if (score >= 5) return 'alta';
  if (score >= 3) return 'moderada';
  return 'baixa';
}

/**
 * Verifica se deve usar override do coach
 * Retorna true se coach override está habilitado E existe override no bloco
 */
export function shouldUseCoachOverride(block: WorkoutBlock): boolean {
  const params = getActiveParams();
  
  if (!params.benchmark.allowCoachOverride) return false;
  if (params.benchmark.coachOverridePriority !== 'coach_wins') return false;
  
  // Verifica se o bloco tem override do coach
  return !!(block.levelTargetRanges && Object.keys(block.levelTargetRanges).length > 0);
}

/**
 * Obtém a faixa de tempo efetiva para um nível
 * Considera: override do coach > default do config
 */
export function getEffectiveTimeRange(
  block: WorkoutBlock, 
  level: AthleteLevel
): TargetTimeRange | null {
  const params = getActiveParams();
  
  // Se benchmark não está habilitado para este bloco
  if (params.benchmark.enabledOnlyForBenchmark && !block.isBenchmark) {
    return null;
  }
  
  // Prioridade 1: Override do coach (se coach_wins)
  if (shouldUseCoachOverride(block)) {
    const coachRange = block.levelTargetRanges?.[level];
    if (coachRange && coachRange.min > 0 && coachRange.max > 0) {
      return coachRange;
    }
  }
  
  // Prioridade 2: Range gerado automaticamente
  const generated = generateBenchmarkTimeRanges(block);
  return generated[level] || null;
}
