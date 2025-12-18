import type { AthleteStatus, TrainingDifficulty } from '@/types/outlier';
import type { BenchmarkResult, ExternalResult } from '@/hooks/useBenchmarkResults';

// Status score thresholds (0-100 scale)
export const STATUS_THRESHOLDS = {
  iniciante: { min: 0, max: 35 },
  intermediario: { min: 35, max: 55 },
  avancado: { min: 55, max: 75 },
  hyrox_open: { min: 75, max: 90 },
  hyrox_pro: { min: 90, max: 100 },
};

// HYROX official competition time thresholds by gender (in seconds)
// Based on ability to compete in category, not podium placement
export const HYROX_TIME_THRESHOLDS = {
  masculino: {
    // >1h50 (>6600s) = Iniciante
    // 1h35–1h50 (5700-6600s) = Intermediário
    // 1h20–1h35 (4800-5700s) = Avançado
    // 1h05–1h20 (3900-4800s) = Open
    // <1h05 (<3900s) = Pro
    hyrox_pro: { maxTime: 3900 },      // < 1h05
    hyrox_open: { maxTime: 4800 },     // 1h05-1h20
    avancado: { maxTime: 5700 },       // 1h20-1h35
    intermediario: { maxTime: 6600 },  // 1h35-1h50
    iniciante: { maxTime: Infinity },  // > 1h50
  },
  feminino: {
    // >1h55 (>6900s) = Iniciante
    // 1h40–1h55 (6000-6900s) = Intermediário
    // 1h25–1h40 (5100-6000s) = Avançado
    // 1h10–1h25 (4200-5100s) = Open
    // <1h10 (<4200s) = Pro
    hyrox_pro: { maxTime: 4200 },      // < 1h10
    hyrox_open: { maxTime: 5100 },     // 1h10-1h25
    avancado: { maxTime: 6000 },       // 1h25-1h40
    intermediario: { maxTime: 6900 },  // 1h40-1h55
    iniciante: { maxTime: Infinity },  // > 1h55
  },
};

export type AthleteGender = 'masculino' | 'feminino';

// Official competition validity period (18 months in days)
const OFFICIAL_COMPETITION_VALIDITY_DAYS = 18 * 30;

// Hysteresis margin to prevent oscillation (need to score X points above threshold to promote)
const PROMOTION_HYSTERESIS = 5;
const DEMOTION_HYSTERESIS = 8;

// Minimum benchmarks for reliable status
const MIN_BENCHMARKS_LOW_CONFIDENCE = 1;
const MIN_BENCHMARKS_MEDIUM_CONFIDENCE = 4;
const MIN_BENCHMARKS_HIGH_CONFIDENCE = 8;

// Minimum weeks with consistent performance for promotion
const MIN_WEEKS_FOR_PROMOTION = 2;

// Temporal decay
const DECAY_HALF_LIFE_DAYS = 30;
const MIN_WEIGHT = 0.1;

export type StatusConfidence = 'baixa' | 'media' | 'alta';
export type StatusSource = 'prova_oficial' | 'estimado';

export interface OfficialCompetitionResult {
  id: string;
  time_in_seconds: number;
  event_name?: string;
  event_date?: string;
  created_at: string;
  isExpired: boolean;
  derivedStatus: AthleteStatus;
}

export interface CalculatedStatus {
  // Current status (with hysteresis applied)
  status: AthleteStatus;
  // Raw score 0-100 (continuous ruler)
  rulerScore: number;
  // Confidence level
  confidence: StatusConfidence;
  // Source of status determination
  statusSource: StatusSource;
  // Official competition that defined the status (if any)
  validatingCompetition: OfficialCompetitionResult | null;
  // Historical official competitions (expired)
  historicalCompetitions: OfficialCompetitionResult[];
  // Progress within current status (0-100%)
  progressInStatus: number;
  // How close to promotion (0-100%)
  progressToNextStatus: number;
  // Next status if any
  nextStatus: AthleteStatus | null;
  // Whether athlete is eligible for promotion (score + consistency)
  eligibleForPromotion: boolean;
  // What's blocking promotion
  promotionBlocker: 'score' | 'consistency' | 'weeks' | 'prova_required' | null;
  // Stats
  benchmarksUsed: number;
  weeksWithGoodPerformance: number;
  consistencyScore: number;
}

// Get status from HYROX official competition time based on gender
export function getStatusFromOfficialTime(timeInSeconds: number, gender: AthleteGender = 'masculino'): AthleteStatus {
  const thresholds = HYROX_TIME_THRESHOLDS[gender];
  
  if (timeInSeconds <= thresholds.hyrox_pro.maxTime) return 'hyrox_pro';
  if (timeInSeconds <= thresholds.hyrox_open.maxTime) return 'hyrox_open';
  if (timeInSeconds <= thresholds.avancado.maxTime) return 'avancado';
  if (timeInSeconds <= thresholds.intermediario.maxTime) return 'intermediario';
  return 'iniciante';
}

// Check if official competition is still valid (< 18 months old)
function isOfficialCompetitionValid(eventDate: string | undefined, createdAt: string): boolean {
  const date = eventDate ? new Date(eventDate) : new Date(createdAt);
  const now = new Date();
  const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= OFFICIAL_COMPETITION_VALIDITY_DAYS;
}

// Process official competitions and find the most recent valid one
export function processOfficialCompetitions(
  officialResults: ExternalResult[],
  gender: AthleteGender = 'masculino'
): { valid: OfficialCompetitionResult | null; historical: OfficialCompetitionResult[] } {
  const processed: OfficialCompetitionResult[] = officialResults
    .filter(r => r.time_in_seconds && r.time_in_seconds > 0)
    .map(r => ({
      id: r.id,
      time_in_seconds: r.time_in_seconds!,
      event_name: r.event_name,
      event_date: r.event_date,
      created_at: r.created_at,
      isExpired: !isOfficialCompetitionValid(r.event_date, r.created_at),
      derivedStatus: getStatusFromOfficialTime(r.time_in_seconds!, gender),
    }))
    .sort((a, b) => {
      // Sort by event_date or created_at, most recent first
      const dateA = a.event_date ? new Date(a.event_date) : new Date(a.created_at);
      const dateB = b.event_date ? new Date(b.event_date) : new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    });

  const valid = processed.find(c => !c.isExpired) || null;
  const historical = processed.filter(c => c.isExpired);

  return { valid, historical };
}

// Calculate temporal weight for benchmark
function calculateTemporalWeight(createdAt: string): number {
  const now = new Date();
  const created = new Date(createdAt);
  const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  const weight = Math.pow(0.5, daysDiff / DECAY_HALF_LIFE_DAYS);
  return Math.max(MIN_WEIGHT, weight);
}

// Calculate weighted average score from benchmarks
function calculateWeightedScore(results: BenchmarkResult[]): number {
  if (results.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const result of results) {
    const score = result.score ?? getScoreFromBucket(result.bucket);
    const weight = calculateTemporalWeight(result.created_at);
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// Convert bucket to score
function getScoreFromBucket(bucket: string | null | undefined): number {
  switch (bucket) {
    case 'ELITE': return 95;
    case 'STRONG': return 80;
    case 'OK': return 60;
    case 'TOUGH': return 40;
    case 'DNF': return 15;
    default: return 50;
  }
}

// Get status from raw score (without hysteresis)
function getStatusFromScore(score: number): AthleteStatus {
  if (score >= STATUS_THRESHOLDS.hyrox_pro.min) return 'hyrox_pro';
  if (score >= STATUS_THRESHOLDS.hyrox_open.min) return 'hyrox_open';
  if (score >= STATUS_THRESHOLDS.avancado.min) return 'avancado';
  if (score >= STATUS_THRESHOLDS.intermediario.min) return 'intermediario';
  return 'iniciante';
}

// Get next status in progression
function getNextStatus(current: AthleteStatus): AthleteStatus | null {
  const order: AthleteStatus[] = ['iniciante', 'intermediario', 'avancado', 'hyrox_open', 'hyrox_pro'];
  const index = order.indexOf(current);
  return index < order.length - 1 ? order[index + 1] : null;
}

// Get previous status
function getPrevStatus(current: AthleteStatus): AthleteStatus | null {
  const order: AthleteStatus[] = ['iniciante', 'intermediario', 'avancado', 'hyrox_open', 'hyrox_pro'];
  const index = order.indexOf(current);
  return index > 0 ? order[index - 1] : null;
}

// Calculate confidence based on benchmark count
function getConfidence(benchmarkCount: number): StatusConfidence {
  if (benchmarkCount >= MIN_BENCHMARKS_HIGH_CONFIDENCE) return 'alta';
  if (benchmarkCount >= MIN_BENCHMARKS_MEDIUM_CONFIDENCE) return 'media';
  return 'baixa';
}

// Calculate weeks with good performance (STRONG+ in majority of benchmarks)
function calculateWeeksWithGoodPerformance(results: BenchmarkResult[]): number {
  const weekMap = new Map<string, { good: number; total: number }>();
  
  for (const result of results) {
    const date = new Date(result.created_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1);
    const weekKey = weekStart.toISOString().split('T')[0];
    
    const week = weekMap.get(weekKey) || { good: 0, total: 0 };
    week.total++;
    if (result.bucket === 'ELITE' || result.bucket === 'STRONG') {
      week.good++;
    }
    weekMap.set(weekKey, week);
  }

  return Array.from(weekMap.values()).filter(w => w.good / w.total >= 0.6).length;
}

// Calculate consistency (inverse of standard deviation)
function calculateConsistency(results: BenchmarkResult[]): number {
  const scores = results
    .filter(r => r.score !== null && r.score !== undefined)
    .map(r => Number(r.score));

  if (scores.length < 2) return 100;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Convert to 0-100 where lower stdDev = higher consistency
  return Math.max(0, 100 - (stdDev / 30) * 100);
}

// Convert status to ruler score (for positioning within validated level)
function statusToRulerScore(status: AthleteStatus): number {
  const thresholds = STATUS_THRESHOLDS[status];
  // Return the middle of the status range
  return (thresholds.min + thresholds.max) / 2;
}

// Main function to calculate athlete status
export function calculateAthleteStatus(
  benchmarkResults: BenchmarkResult[],
  officialResults: ExternalResult[],
  gender: AthleteGender = 'masculino',
  previousStatus?: AthleteStatus
): CalculatedStatus {
  // Process official competitions first (using gender-specific thresholds)
  const { valid: validatingCompetition, historical: historicalCompetitions } = 
    processOfficialCompetitions(officialResults, gender);

  const validBenchmarks = benchmarkResults.filter(r => r.completed);
  const benchmarksUsed = validBenchmarks.length;

  // If we have a valid official competition, it defines the status
  if (validatingCompetition) {
    const status = validatingCompetition.derivedStatus;
    const currentThresholds = STATUS_THRESHOLDS[status];
    
    // Calculate ruler score from benchmarks/simulados for progress within the level
    const rulerScore = benchmarksUsed > 0 
      ? calculateWeightedScore(validBenchmarks)
      : statusToRulerScore(status);
    
    // Clamp ruler score within the validated level
    const clampedScore = Math.max(
      currentThresholds.min,
      Math.min(currentThresholds.max, rulerScore)
    );
    
    const statusRange = currentThresholds.max - currentThresholds.min;
    const progressInStatus = Math.max(0, Math.min(100, 
      ((clampedScore - currentThresholds.min) / statusRange) * 100
    ));

    const nextStatus = getNextStatus(status);
    
    return {
      status,
      rulerScore: Math.round(clampedScore * 10) / 10,
      confidence: 'alta', // Official competition = high confidence
      statusSource: 'prova_oficial',
      validatingCompetition,
      historicalCompetitions,
      progressInStatus: Math.round(progressInStatus),
      progressToNextStatus: Math.round(progressInStatus), // Within current level
      nextStatus,
      eligibleForPromotion: false, // Need new official competition to promote
      promotionBlocker: 'prova_required',
      benchmarksUsed,
      weeksWithGoodPerformance: calculateWeeksWithGoodPerformance(validBenchmarks),
      consistencyScore: Math.round(calculateConsistency(validBenchmarks)),
    };
  }

  // No valid official competition - use benchmark-based calculation
  if (benchmarksUsed === 0) {
    return {
      status: previousStatus || 'iniciante',
      rulerScore: 0,
      confidence: 'baixa',
      statusSource: 'estimado',
      validatingCompetition: null,
      historicalCompetitions,
      progressInStatus: 0,
      progressToNextStatus: 0,
      nextStatus: 'intermediario',
      eligibleForPromotion: false,
      promotionBlocker: 'score',
      benchmarksUsed: 0,
      weeksWithGoodPerformance: 0,
      consistencyScore: 0,
    };
  }

  // Calculate raw score from benchmarks
  const rulerScore = calculateWeightedScore(validBenchmarks);
  const scoreBasedStatus = getStatusFromScore(rulerScore);
  
  // Calculate additional metrics
  const weeksWithGoodPerformance = calculateWeeksWithGoodPerformance(validBenchmarks);
  const consistencyScore = calculateConsistency(validBenchmarks);
  const confidence = getConfidence(benchmarksUsed);
  
  // Apply hysteresis for status changes
  let status = previousStatus || scoreBasedStatus;
  const nextStatus = getNextStatus(status);
  const prevStatus = getPrevStatus(status);
  
  // Check for promotion
  const promotionThreshold = nextStatus 
    ? STATUS_THRESHOLDS[nextStatus].min + PROMOTION_HYSTERESIS 
    : 100;
  const meetsScoreForPromotion = rulerScore >= promotionThreshold;
  const meetsWeeksForPromotion = weeksWithGoodPerformance >= MIN_WEEKS_FOR_PROMOTION;
  const meetsConsistencyForPromotion = consistencyScore >= 60;
  
  // Determine promotion blocker
  let promotionBlocker: 'score' | 'consistency' | 'weeks' | 'prova_required' | null = null;
  if (!meetsScoreForPromotion) {
    promotionBlocker = 'score';
  } else if (!meetsConsistencyForPromotion) {
    promotionBlocker = 'consistency';
  } else if (!meetsWeeksForPromotion) {
    promotionBlocker = 'weeks';
  }
  
  const eligibleForPromotion = meetsScoreForPromotion && meetsWeeksForPromotion && meetsConsistencyForPromotion;
  
  // Apply promotion if eligible
  if (eligibleForPromotion && nextStatus) {
    status = nextStatus;
  }
  
  // Check for demotion (needs to be significantly below threshold)
  if (prevStatus) {
    const demotionThreshold = STATUS_THRESHOLDS[status].min - DEMOTION_HYSTERESIS;
    if (rulerScore < demotionThreshold && benchmarksUsed >= MIN_BENCHMARKS_MEDIUM_CONFIDENCE) {
      status = prevStatus;
    }
  }
  
  // Calculate progress within current status
  const currentThresholds = STATUS_THRESHOLDS[status];
  const statusRange = currentThresholds.max - currentThresholds.min;
  const progressInStatus = Math.max(0, Math.min(100, 
    ((rulerScore - currentThresholds.min) / statusRange) * 100
  ));
  
  // Calculate progress to next status
  const updatedNextStatus = getNextStatus(status);
  let progressToNextStatus = 0;
  if (updatedNextStatus) {
    const nextThreshold = STATUS_THRESHOLDS[updatedNextStatus].min + PROMOTION_HYSTERESIS;
    progressToNextStatus = Math.min(100, (rulerScore / nextThreshold) * 100);
  } else {
    progressToNextStatus = 100;
  }
  
  return {
    status,
    rulerScore: Math.round(rulerScore * 10) / 10,
    confidence,
    statusSource: 'estimado',
    validatingCompetition: null,
    historicalCompetitions,
    progressInStatus: Math.round(progressInStatus),
    progressToNextStatus: Math.round(progressToNextStatus),
    nextStatus: updatedNextStatus,
    eligibleForPromotion,
    promotionBlocker,
    benchmarksUsed,
    weeksWithGoodPerformance,
    consistencyScore: Math.round(consistencyScore),
  };
}

// Get effective level for workout prescription (status + difficulty offset)
export function getEffectiveLevel(
  status: AthleteStatus,
  difficulty: TrainingDifficulty
): AthleteStatus {
  const order: AthleteStatus[] = ['iniciante', 'intermediario', 'avancado', 'hyrox_open', 'hyrox_pro'];
  const currentIndex = order.indexOf(status);
  
  let offset = 0;
  if (difficulty === 'leve') offset = -1;
  if (difficulty === 'forte') offset = 1;
  
  const newIndex = Math.max(0, Math.min(order.length - 1, currentIndex + offset));
  return order[newIndex];
}

// Display helpers
export const CONFIDENCE_LABELS: Record<StatusConfidence, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export const CONFIDENCE_COLORS: Record<StatusConfidence, string> = {
  baixa: 'text-amber-500',
  media: 'text-blue-500',
  alta: 'text-green-500',
};

export const STATUS_SOURCE_LABELS: Record<StatusSource, string> = {
  prova_oficial: 'Validado por Prova',
  estimado: 'Estimado por Benchmarks',
};

// Format time in seconds to readable format
export function formatOfficialTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h${minutes.toString().padStart(2, '0')}m${secs.toString().padStart(2, '0')}s`;
  }
  return `${minutes}m${secs.toString().padStart(2, '0')}s`;
}
