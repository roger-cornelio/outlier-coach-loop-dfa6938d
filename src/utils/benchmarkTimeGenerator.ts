import type { WorkoutBlock, WodType, AthleteLevel, TargetTimeRange, LevelTargetRanges } from '@/types/outlier';

/**
 * SISTEMA DE GERAÇÃO AUTOMÁTICA DE FAIXAS DE TEMPO DE REFERÊNCIA
 * 
 * Gera faixas de tempo para cada nível de atleta baseado em:
 * - Tipo de WOD (For Time, AMRAP, Chipper, Intervalado)
 * - Volume total estimado
 * - Modalidades envolvidas
 * - Padrões do Cross Training / HYROX
 */

// Fatores de ajuste por tipo de WOD
const WOD_TYPE_FACTORS: Record<WodType | 'default', { baseMinutes: number; variancePercent: number }> = {
  engine: { baseMinutes: 20, variancePercent: 0.15 },      // Engine tende a ser mais longo
  strength: { baseMinutes: 12, variancePercent: 0.20 },    // Força tem mais variação
  skill: { baseMinutes: 15, variancePercent: 0.15 },       // Skill é moderado
  mixed: { baseMinutes: 18, variancePercent: 0.18 },       // Misto varia bastante
  hyrox: { baseMinutes: 25, variancePercent: 0.12 },       // HYROX específico
  benchmark: { baseMinutes: 15, variancePercent: 0.15 },   // Benchmark padrão
  default: { baseMinutes: 15, variancePercent: 0.18 },
};

// Fatores de ajuste por nível de atleta (quanto maior, mais tempo leva)
const LEVEL_FACTORS: Record<AthleteLevel, number> = {
  iniciante: 1.35,       // 35% mais lento que referência
  intermediario: 1.15,   // 15% mais lento
  avancado: 1.0,         // Referência base
  hyrox_open: 0.95,      // 5% mais rápido (não usado aqui, mas mantido para compatibilidade)
  hyrox_pro: 0.85,       // 15% mais rápido
};

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
  if (movements >= 5) return 'chipper'; // Muitos movimentos = provavelmente chipper
  
  return 'for_time'; // Default
}

// Estima tempo base em segundos
function estimateBaseTimeSeconds(content: string, durationMinutes?: number): number {
  // Se já temos duração definida, usar como base
  if (durationMinutes && durationMinutes > 0) {
    return durationMinutes * 60;
  }
  
  const analysis = analyzeWorkoutContent(content);
  const format = detectWodFormat(content);
  
  let baseSeconds = 0;
  
  // Tempo por modalidade (segundos)
  if (analysis.hasRunning) baseSeconds += analysis.distanceMeters > 0 ? analysis.distanceMeters * 0.3 : 180;
  if (analysis.hasRowing) baseSeconds += 120;
  if (analysis.hasBike) baseSeconds += 90;
  if (analysis.hasSkiErg) baseSeconds += 100;
  if (analysis.hasWeightlifting) baseSeconds += 60;
  if (analysis.hasGymnastics) baseSeconds += 90;
  if (analysis.hasSled) baseSeconds += 120;
  
  // Multiplicar por rounds
  baseSeconds *= Math.max(1, analysis.roundCount);
  
  // Ajuste por formato
  switch (format) {
    case 'amrap':
      // AMRAP tem tempo fixo, estimar baseado no conteúdo
      baseSeconds = Math.max(baseSeconds, 600); // Mínimo 10 min
      break;
    case 'emom':
      // EMOM: cada minuto conta
      const emomMinMatch = content.match(/(\d+)\s*min/i);
      if (emomMinMatch) baseSeconds = parseInt(emomMinMatch[1]) * 60;
      break;
    case 'chipper':
      // Chipper tende a ser mais longo
      baseSeconds = Math.max(baseSeconds * 1.2, 720); // Mínimo 12 min
      break;
    case 'interval':
      // Intervalado: somar tempos de trabalho
      baseSeconds = Math.max(baseSeconds, 900); // Mínimo 15 min
      break;
  }
  
  // Garantir tempo mínimo de 5 minutos
  return Math.max(baseSeconds, 300);
}

/**
 * Gera faixas de tempo de referência para cada nível de atleta
 * @param block O bloco de treino
 * @returns Objeto com faixas de tempo para cada nível
 */
export function generateBenchmarkTimeRanges(block: WorkoutBlock): LevelTargetRanges {
  const wodType = block.wodType || 'default';
  const typeConfig = WOD_TYPE_FACTORS[wodType] || WOD_TYPE_FACTORS.default;
  
  // Estimar tempo base
  const baseSeconds = block.durationMinutes 
    ? block.durationMinutes * 60 
    : estimateBaseTimeSeconds(block.content, block.durationMinutes);
  
  const result: LevelTargetRanges = {};
  
  // Gerar para cada nível
  const levels: AthleteLevel[] = ['iniciante', 'intermediario', 'avancado', 'hyrox_pro'];
  
  for (const level of levels) {
    const levelFactor = LEVEL_FACTORS[level];
    const adjustedBase = baseSeconds * levelFactor;
    
    // Variação para criar a faixa (min/max)
    const variance = adjustedBase * typeConfig.variancePercent;
    
    result[level] = {
      min: Math.round(adjustedBase - variance),
      max: Math.round(adjustedBase + variance),
    };
  }
  
  return result;
}

/**
 * Formata tempo em segundos para "MM:SS"
 */
export function formatTimeRange(seconds: number): string {
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
 */
export function shouldTrackEvolution(block: WorkoutBlock): boolean {
  return block.isBenchmark === true;
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
