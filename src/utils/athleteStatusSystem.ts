import type { AthleteStatus, TrainingDifficulty } from '@/types/outlier';
import type { BenchmarkResult, ExternalResult } from '@/hooks/useBenchmarkResults';

// ============================================================
// TIPOS
// ============================================================

export type AthleteGender = 'masculino' | 'feminino';
export type RaceCategory = 'OPEN' | 'PRO';

export type HyroxAgeBracket = 
  | '16-24' | '25-29' | '30-34' | '35-39' | '40-44' 
  | '45-49' | '50-54' | '55-59' | '60-64' | '65-69' | '70+';

export type StatusConfidence = 'baixa' | 'media' | 'alta';
export type StatusSource = 'prova_oficial' | 'estimado';

// ============================================================
// TIPOS PARA THRESHOLDS DO BANCO (ADMIN)
// ============================================================

export interface EliteProBenchmark {
  sex: string;        // 'M' | 'F'
  age_min: number;
  age_max: number;
  elite_pro_seconds: number;
}

export interface DivisionFactor {
  division: string;   // 'PRO' | 'OPEN' | 'DOUBLES' | 'RELAY'
  factor: number;
}

export interface DbThresholds {
  benchmarks: EliteProBenchmark[];
  factors: DivisionFactor[];
}

// ============================================================
// CONSTANTES FALLBACK (usadas apenas se DB não carregar)
// ============================================================

const FALLBACK_ELITE_PRO_SECONDS: Record<AthleteGender, number> = {
  masculino: 3960,  // M 30-34
  feminino: 4440,   // F 30-34
};

const FALLBACK_DIVISION_FACTOR = 1.0; // PRO default

// ============================================================
// GAP THRESHOLDS (classificação por gap percentual)
// ============================================================
// gap = (athlete_time - elite_adjusted) / elite_adjusted
// ELITE: gap ≤ 0.05 (dentro de 5% do tempo referência)
// PRO:   gap ≤ 0.15 (dentro de 15%)
// OPEN:  gap > 0.15

const GAP_ELITE = 0.05;
const GAP_PRO = 0.15;

// ============================================================
// NORMALIZAÇÃO PRO → OPEN EQUIVALENTE
// ============================================================

const PRO_TO_OPEN_FACTOR: Record<AthleteGender, number> = {
  masculino: 0.94,  // PRO masculino ~6% mais difícil
  feminino: 0.95,   // PRO feminino ~5% mais difícil
};

// ============================================================
// CONFIGURAÇÕES DE BENCHMARK
// ============================================================

/**
 * Race validity for classification: only current year and previous year count.
 * E.g., in 2026 season (2025/26), races from 2024 don't count.
 * This means race year must be >= (current year - 1).
 */
function getSeasonValidityCutoff(): Date {
  const currentYear = new Date().getFullYear();
  // Races from Jan 1 of previous year onward are valid
  return new Date(currentYear - 1, 0, 1); // Jan 1 of (currentYear - 1)
}

const DECAY_HALF_LIFE_DAYS = 30;
const MIN_WEIGHT = 0.1;
const MIN_BENCHMARKS_MEDIUM_CONFIDENCE = 4;
const MIN_BENCHMARKS_HIGH_CONFIDENCE = 8;
const MIN_WEEKS_FOR_PROMOTION = 2;

// ============================================================
// INTERFACES
// ============================================================

export interface OfficialCompetitionResult {
  id: string;
  time_in_seconds: number;
  open_equivalent_seconds: number;
  race_category: RaceCategory;
  event_name?: string;
  event_date?: string;
  created_at: string;
  isExpired: boolean;
  derivedStatus: AthleteStatus;
  levelScore: number; // Score 0-100 DENTRO do nível
  ageAtRace?: number;
  ageBracket?: HyroxAgeBracket;
  cappedFromPro?: boolean;
  cappedReason?: string;
}

export interface CalculatedStatus {
  status: AthleteStatus;
  /** Score 0-100 dentro do nível atual */
  rulerScore: number;
  confidence: StatusConfidence;
  statusSource: StatusSource;
  validatingCompetition: OfficialCompetitionResult | null;
  historicalCompetitions: OfficialCompetitionResult[];
  /** Progresso dentro do status (0-100%) */
  progressInStatus: number;
  /** Progresso para o próximo status (0-100%) */
  progressToNextStatus: number;
  nextStatus: AthleteStatus | null;
  eligibleForPromotion: boolean;
  promotionBlocker: 'score' | 'consistency' | 'weeks' | 'prova_required' | null;
  benchmarksUsed: number;
  weeksWithGoodPerformance: number;
  consistencyScore: number;
  athleteAgeBracket?: HyroxAgeBracket;
}

export interface LevelClassificationResult {
  status: AthleteStatus;
  levelScore: number;
  cappedFromPro: boolean;
  cappedReason?: string;
}

// ============================================================
// FUNÇÕES DE IDADE
// ============================================================

export function calculateAgeAtDate(birthDate: Date, targetDate: Date): number {
  let age = targetDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = targetDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function getAgeBracket(age: number): HyroxAgeBracket {
  if (age < 25) return '16-24';
  if (age < 30) return '25-29';
  if (age < 35) return '30-34';
  if (age < 40) return '35-39';
  if (age < 45) return '40-44';
  if (age < 50) return '45-49';
  if (age < 55) return '50-54';
  if (age < 60) return '55-59';
  if (age < 65) return '60-64';
  if (age < 70) return '65-69';
  return '70+';
}

export function getAgeTolerance(_ageBracket: HyroxAgeBracket): number {
  // Age tolerance is now built into benchmarks_elite_pro per age range
  return 0;
}

// ============================================================
// HELPERS PARA DB THRESHOLDS
// ============================================================

/**
 * Busca o elite_pro_seconds do banco para o sexo/idade do atleta.
 * Retorna fallback se não encontrar.
 */
function getEliteProSecondsFromDb(
  dbThresholds: DbThresholds | undefined,
  gender: AthleteGender,
  age: number
): number {
  if (!dbThresholds || dbThresholds.benchmarks.length === 0) {
    return FALLBACK_ELITE_PRO_SECONDS[gender];
  }
  const sex = gender === 'feminino' ? 'F' : 'M';
  const match = dbThresholds.benchmarks.find(
    b => b.sex === sex && age >= b.age_min && age <= b.age_max
  );
  return match?.elite_pro_seconds ?? FALLBACK_ELITE_PRO_SECONDS[gender];
}

/**
 * Busca o division factor do banco.
 */
function getDivisionFactorFromDb(
  dbThresholds: DbThresholds | undefined,
  division: string
): number {
  if (!dbThresholds || dbThresholds.factors.length === 0) {
    return FALLBACK_DIVISION_FACTOR;
  }
  const match = dbThresholds.factors.find(f => f.division === division);
  return match ? Number(match.factor) : FALLBACK_DIVISION_FACTOR;
}

// ============================================================
// NORMALIZAÇÃO E AJUSTES
// ============================================================

/**
 * Converte tempo de prova para Open-equivalente.
 * PRO é mais pesado, então o tempo é multiplicado pelo fator.
 */
export function toOpenEquivalentSeconds(
  timeInSeconds: number,
  gender: AthleteGender,
  raceCategory: RaceCategory = 'OPEN'
): number {
  if (raceCategory === 'OPEN') return timeInSeconds;
  return Math.round(timeInSeconds * PRO_TO_OPEN_FACTOR[gender]);
}

/**
 * Obtém limiares de status usando DB thresholds (gap-based).
 * Retorna tempos em minutos para compatibilidade.
 */
export function getAdjustedStatusThresholds(
  gender: AthleteGender,
  ageBracket: HyroxAgeBracket,
  dbThresholds?: DbThresholds
): { elite: number; pro: number } {
  // Get age from bracket midpoint for lookup
  const ageMid = getAgeMidpoint(ageBracket);
  const eliteProSec = getEliteProSecondsFromDb(dbThresholds, gender, ageMid);
  const factor = getDivisionFactorFromDb(dbThresholds, 'PRO'); // Base PRO
  const eliteAdj = eliteProSec * factor;
  
  // elite threshold = time where gap = GAP_ELITE (5%)
  // pro threshold = time where gap = GAP_PRO (15%)
  return {
    elite: (eliteAdj * (1 + GAP_ELITE)) / 60,
    pro: (eliteAdj * (1 + GAP_PRO)) / 60,
  };
}

function getAgeMidpoint(bracket: HyroxAgeBracket): number {
  const map: Record<HyroxAgeBracket, number> = {
    '16-24': 20, '25-29': 27, '30-34': 32, '35-39': 37,
    '40-44': 42, '45-49': 47, '50-54': 52, '55-59': 57,
    '60-64': 62, '65-69': 67, '70+': 72,
  };
  return map[bracket];
}

// ============================================================
// CLASSIFICAÇÃO DE STATUS POR TEMPO (GAP-BASED)
// ============================================================

/**
 * Classifica o STATUS do atleta baseado no tempo de prova oficial.
 * Usa modelo de gap percentual com tempos do admin (DB).
 * 
 * gap = (athlete_time - elite_adjusted) / elite_adjusted
 * ELITE: gap ≤ 5%
 * PRO:   gap ≤ 15%
 * OPEN:  gap > 15%
 */
export function getStatusFromOfficialTime(
  timeInSeconds: number,
  gender: AthleteGender = 'masculino',
  raceCategory: RaceCategory = 'OPEN',
  ageAtRace?: number,
  dbThresholds?: DbThresholds
): LevelClassificationResult {
  const age = ageAtRace ?? 32; // Default 30-34 range
  const sex = gender === 'feminino' ? 'F' : 'M';
  
  // Get reference from DB
  const eliteProSec = getEliteProSecondsFromDb(dbThresholds, gender, age);
  
  // Map race category to division for factor lookup
  let division = 'OPEN';
  if (raceCategory === 'PRO') division = 'PRO';
  const divFactor = getDivisionFactorFromDb(dbThresholds, division);
  
  const eliteAdjusted = Math.round(eliteProSec * divFactor);
  const gap = (timeInSeconds - eliteAdjusted) / eliteAdjusted;
  
  // Classify by gap
  let status: AthleteStatus;
  if (gap <= GAP_ELITE) status = 'elite';
  else if (gap <= GAP_PRO) status = 'pro';
  else status = 'open';
  
  // Regra especial: 60+ não podem ser ELITE
  let cappedFromPro = false;
  let cappedReason: string | undefined;
  
  if (ageAtRace !== undefined && ageAtRace >= 60 && status === 'elite') {
    status = 'pro';
    cappedFromPro = true;
    cappedReason = `Atletas 60+ são classificados como PRO (tempo seria ELITE)`;
  }
  
  // Score within level based on gap position
  const levelScore = calculateLevelScoreFromGap(gap, status);
  
  return { status, levelScore, cappedFromPro, cappedReason };
}

/**
 * Calcula score 0-100 dentro do nível baseado no gap.
 */
function calculateLevelScoreFromGap(gap: number, status: AthleteStatus): number {
  // Define gap ranges per level
  let gapMin: number, gapMax: number;
  switch (status) {
    case 'elite':
      gapMin = -0.10; // 10% faster than reference
      gapMax = GAP_ELITE; // 5%
      break;
    case 'pro':
      gapMin = GAP_ELITE; // 5%
      gapMax = GAP_PRO; // 15%
      break;
    case 'open':
    default:
      gapMin = GAP_PRO; // 15%
      gapMax = 0.50; // 50%
      break;
  }
  
  // Clamp and invert (lower gap = higher score)
  const clampedGap = Math.max(gapMin, Math.min(gapMax, gap));
  const range = gapMax - gapMin;
  if (range <= 0) return 50;
  
  const position = (gapMax - clampedGap) / range; // 0 (worst) to 1 (best)
  return Math.round(position * 100);
}

// ============================================================
// SCORE DENTRO DO NÍVEL (0-100)
// ============================================================

/**
 * Calcula o score 0-100 DENTRO de um nível específico.
 * 
 * REGRA DE OURO:
 * - Cada status tem sua própria régua interna
 * - 95-100 = TOPO REAL do nível (pronto para subir)
 * - 0-10 = Acabou de entrar no nível
 * 
 * O score é baseado na posição do tempo entre base e topo do nível.
 */
export function calculateLevelScore(
  timeInMinutes: number,
  gender: AthleteGender,
  status: AthleteStatus,
  ageBracket: HyroxAgeBracket = '30-34'
): number {
  // Now delegates to gap-based scoring using fallback thresholds
  const timeSeconds = timeInMinutes * 60;
  const ageMid = getAgeMidpoint(ageBracket);
  const eliteProSec = getEliteProSecondsFromDb(undefined, gender, ageMid);
  const gap = (timeSeconds - eliteProSec) / eliteProSec;
  return calculateLevelScoreFromGap(gap, status);
}

/**
 * Calcula score de benchmark para posição dentro do nível.
 * Usado quando não há prova oficial.
 */
function calculateBenchmarkLevelScore(
  benchmarkScore: number,
  status: AthleteStatus
): number {
  // Benchmark scores são 0-100 globais
  // Precisamos mapear para o contexto do nível atual
  
  // Se benchmark indica performance de elite, mapeia para topo do nível
  if (benchmarkScore >= 90) return 85 + ((benchmarkScore - 90) / 10) * 15; // 85-100
  if (benchmarkScore >= 75) return 60 + ((benchmarkScore - 75) / 15) * 25; // 60-85
  if (benchmarkScore >= 50) return 30 + ((benchmarkScore - 50) / 25) * 30; // 30-60
  if (benchmarkScore >= 25) return 10 + ((benchmarkScore - 25) / 25) * 20; // 10-30
  return (benchmarkScore / 25) * 10; // 0-10
}

// ============================================================
// UTILITÁRIOS DE DATA DEFENSIVOS
// ============================================================

function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

function safeParseDate(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isValidDate(date) ? date : null;
}

// ============================================================
// PROCESSAMENTO DE PROVAS OFICIAIS
// ============================================================

function isOfficialCompetitionValid(eventDate: string | undefined, createdAt: string): boolean {
  const date = safeParseDate(eventDate) ?? safeParseDate(createdAt);
  if (!date) return false;
  const now = new Date();
  const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= OFFICIAL_COMPETITION_VALIDITY_DAYS;
}

export function processOfficialCompetitions(
  officialResults: ExternalResult[],
  gender: AthleteGender = 'masculino',
  athleteBirthDate?: Date,
  dbThresholds?: DbThresholds
): { valid: OfficialCompetitionResult | null; historical: OfficialCompetitionResult[] } {
  const processed: OfficialCompetitionResult[] = officialResults
    .filter(r => r.time_in_seconds && r.time_in_seconds > 0)
    .map(r => {
      const raceCategory: RaceCategory = r.race_category || 'OPEN';
      const openEqSec = toOpenEquivalentSeconds(r.time_in_seconds!, gender, raceCategory);
      
      let ageAtRace: number | undefined;
      let ageBracket: HyroxAgeBracket | undefined;
      
      if (athleteBirthDate && isValidDate(athleteBirthDate)) {
        const raceDate = safeParseDate(r.event_date) ?? safeParseDate(r.created_at) ?? new Date();
        ageAtRace = calculateAgeAtDate(athleteBirthDate, raceDate);
        ageBracket = getAgeBracket(ageAtRace);
      }
      
      const classification = getStatusFromOfficialTime(r.time_in_seconds!, gender, raceCategory, ageAtRace, dbThresholds);
      
      return {
        id: r.id,
        time_in_seconds: r.time_in_seconds!,
        open_equivalent_seconds: openEqSec,
        race_category: raceCategory,
        event_name: r.event_name,
        event_date: r.event_date,
        created_at: r.created_at,
        isExpired: !isOfficialCompetitionValid(r.event_date, r.created_at),
        derivedStatus: classification.status,
        levelScore: classification.levelScore,
        ageAtRace,
        ageBracket,
        cappedFromPro: classification.cappedFromPro,
        cappedReason: classification.cappedReason,
      };
    })
    .sort((a, b) => {
      const dateA = safeParseDate(a.event_date) ?? safeParseDate(a.created_at) ?? new Date(0);
      const dateB = safeParseDate(b.event_date) ?? safeParseDate(b.created_at) ?? new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

  const valid = processed.find(c => !c.isExpired) || null;
  const historical = processed.filter(c => c.isExpired);

  return { valid, historical };
}

// ============================================================
// FUNÇÕES DE BENCHMARK
// ============================================================

function calculateTemporalWeight(createdAt: string): number {
  const now = new Date();
  const created = safeParseDate(createdAt);
  if (!created) return MIN_WEIGHT;
  const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  const weight = Math.pow(0.5, daysDiff / DECAY_HALF_LIFE_DAYS);
  return Math.max(MIN_WEIGHT, weight);
}

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

function calculateWeightedBenchmarkScore(results: BenchmarkResult[]): number {
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

function calculateWeeksWithGoodPerformance(results: BenchmarkResult[]): number {
  const weekMap = new Map<string, { good: number; total: number }>();
  
  for (const result of results) {
    const date = safeParseDate(result.created_at);
    if (!date) continue; // Skip invalid dates
    
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

function calculateConsistency(results: BenchmarkResult[]): number {
  const scores = results
    .filter(r => r.score !== null && r.score !== undefined)
    .map(r => Number(r.score));

  if (scores.length < 2) return 100;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  return Math.max(0, 100 - (stdDev / 30) * 100);
}

function getConfidence(benchmarkCount: number): StatusConfidence {
  if (benchmarkCount >= MIN_BENCHMARKS_HIGH_CONFIDENCE) return 'alta';
  if (benchmarkCount >= MIN_BENCHMARKS_MEDIUM_CONFIDENCE) return 'media';
  return 'baixa';
}

// ============================================================
// FUNÇÕES DE NAVEGAÇÃO DE STATUS
// ============================================================

const STATUS_ORDER: AthleteStatus[] = ['open', 'pro', 'elite'];

function getNextStatus(current: AthleteStatus): AthleteStatus | null {
  const index = STATUS_ORDER.indexOf(current);
  return index < STATUS_ORDER.length - 1 ? STATUS_ORDER[index + 1] : null;
}

function getPrevStatus(current: AthleteStatus): AthleteStatus | null {
  const index = STATUS_ORDER.indexOf(current);
  return index > 0 ? STATUS_ORDER[index - 1] : null;
}

function getStatusFromBenchmarkScore(score: number): AthleteStatus {
  if (score >= 80) return 'elite';
  if (score >= 50) return 'pro';
  return 'open';
}

// ============================================================
// FUNÇÃO PRINCIPAL - CALCULAR STATUS DO ATLETA
// ============================================================

export function calculateAthleteStatus(
  benchmarkResults: BenchmarkResult[],
  officialResults: ExternalResult[],
  gender: AthleteGender = 'masculino',
  previousStatus?: AthleteStatus,
  athleteBirthDate?: Date,
  dbThresholds?: DbThresholds
): CalculatedStatus {
  const athleteAgeBracket = athleteBirthDate 
    ? getAgeBracket(calculateAgeAtDate(athleteBirthDate, new Date()))
    : undefined;

  const { valid: validatingCompetition, historical: historicalCompetitions } = 
    processOfficialCompetitions(officialResults, gender, athleteBirthDate, dbThresholds);

  const validBenchmarks = benchmarkResults.filter(r => r.completed);
  const benchmarksUsed = validBenchmarks.length;

  // ================================================================
  // CASO 1: Prova oficial válida define o STATUS
  // ================================================================
  if (validatingCompetition) {
    const status = validatingCompetition.derivedStatus;
    const rulerScore = validatingCompetition.levelScore;
    const nextStatus = getNextStatus(status);
    
    return {
      status,
      rulerScore: Math.round(rulerScore * 10) / 10,
      confidence: 'alta',
      statusSource: 'prova_oficial',
      validatingCompetition,
      historicalCompetitions,
      progressInStatus: Math.round(rulerScore),
      progressToNextStatus: Math.round(rulerScore),
      nextStatus,
      eligibleForPromotion: false, // Precisa de nova prova oficial
      promotionBlocker: 'prova_required',
      benchmarksUsed,
      weeksWithGoodPerformance: calculateWeeksWithGoodPerformance(validBenchmarks),
      consistencyScore: Math.round(calculateConsistency(validBenchmarks)),
      athleteAgeBracket,
    };
  }

  // ================================================================
  // CASO 2: Sem prova oficial - usar benchmarks (estimativa)
  // ================================================================
  if (benchmarksUsed === 0) {
    const status = previousStatus || 'open';
    return {
      status,
      rulerScore: 0,
      confidence: 'baixa',
      statusSource: 'estimado',
      validatingCompetition: null,
      historicalCompetitions,
      progressInStatus: 0,
      progressToNextStatus: 0,
      nextStatus: getNextStatus(status),
      eligibleForPromotion: false,
      promotionBlocker: 'score',
      benchmarksUsed: 0,
      weeksWithGoodPerformance: 0,
      consistencyScore: 0,
      athleteAgeBracket,
    };
  }

  // Calcula score médio ponderado dos benchmarks
  const benchmarkScore = calculateWeightedBenchmarkScore(validBenchmarks);
  const weeksWithGoodPerformance = calculateWeeksWithGoodPerformance(validBenchmarks);
  const consistencyScore = calculateConsistency(validBenchmarks);
  const confidence = getConfidence(benchmarksUsed);
  
  // Determina status baseado nos benchmarks (conservador)
  const estimatedStatus = getStatusFromBenchmarkScore(benchmarkScore);
  
  // Aplica hysteresis com status anterior
  let status = previousStatus || estimatedStatus;
  const nextStatus = getNextStatus(status);
  const prevStatus = getPrevStatus(status);
  
  // Verifica promoção (precisa de score alto + consistência + semanas)
  const meetsScoreForPromotion = benchmarkScore >= 80;
  const meetsWeeksForPromotion = weeksWithGoodPerformance >= MIN_WEEKS_FOR_PROMOTION;
  const meetsConsistencyForPromotion = consistencyScore >= 60;
  
  let promotionBlocker: 'score' | 'consistency' | 'weeks' | 'prova_required' | null = null;
  if (!meetsScoreForPromotion) promotionBlocker = 'score';
  else if (!meetsConsistencyForPromotion) promotionBlocker = 'consistency';
  else if (!meetsWeeksForPromotion) promotionBlocker = 'weeks';
  
  const eligibleForPromotion = meetsScoreForPromotion && meetsWeeksForPromotion && meetsConsistencyForPromotion;
  
  // Aplica promoção se elegível
  if (eligibleForPromotion && nextStatus) {
    status = nextStatus;
  }
  
  // Verifica rebaixamento (precisa de performance consistentemente baixa)
  if (prevStatus && benchmarkScore < 30 && benchmarksUsed >= MIN_BENCHMARKS_MEDIUM_CONFIDENCE) {
    status = prevStatus;
  }
  
  // Calcula ruler score dentro do nível atual
  const rulerScore = calculateBenchmarkLevelScore(benchmarkScore, status);
  
  return {
    status,
    rulerScore: Math.round(rulerScore * 10) / 10,
    confidence,
    statusSource: 'estimado',
    validatingCompetition: null,
    historicalCompetitions,
    progressInStatus: Math.round(rulerScore),
    progressToNextStatus: Math.round(rulerScore),
    nextStatus: getNextStatus(status),
    eligibleForPromotion,
    promotionBlocker,
    benchmarksUsed,
    weeksWithGoodPerformance,
    consistencyScore: Math.round(consistencyScore),
    athleteAgeBracket,
  };
}

// ============================================================
// NÍVEL EFETIVO PARA PRESCRIÇÃO DE TREINO
// ============================================================

export function getEffectiveLevel(
  status: AthleteStatus,
  trainingLevel: TrainingDifficulty
): AthleteStatus {
  // Com open/pro, não há offset - ambos usam o status atual
  // A função é mantida para compatibilidade mas não altera mais o status
  return status;
}

// ============================================================
// HELPERS DE EXIBIÇÃO
// ============================================================

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
  prova_oficial: 'Validado por Prova Oficial',
  estimado: 'Estimado por Benchmarks',
};

export function formatOfficialTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h${minutes.toString().padStart(2, '0')}m${secs.toString().padStart(2, '0')}s`;
  }
  return `${minutes}m${secs.toString().padStart(2, '0')}s`;
}

/**
 * Obtém descrição textual do score dentro do nível
 */
export function getLevelScoreDescription(score: number): string {
  if (score >= 95) return 'Topo do Nível';
  if (score >= 80) return 'Muito Forte';
  if (score >= 60) return 'Sólido';
  if (score >= 40) return 'Em Evolução';
  if (score >= 20) return 'Base do Nível';
  return 'Iniciando';
}

// Backwards compatibility - deprecated, use getAdjustedStatusThresholds
export function getAdjustedThresholds(
  gender: AthleteGender,
  ageBracket: HyroxAgeBracket
): { elite: number; pro: number } {
  return getAdjustedStatusThresholds(gender, ageBracket);
}
