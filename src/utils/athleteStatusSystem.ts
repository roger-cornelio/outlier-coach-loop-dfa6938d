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
// CONSTANTES - CLASSIFICAÇÃO DE STATUS (MINUTOS, BASE 30-34)
// ============================================================

/**
 * Limiares para CLASSIFICAÇÃO de status baseado em tempo de prova oficial.
 * Estes definem "onde o atleta compete hoje".
 * Base: faixa 30-34 anos.
 */
const STATUS_TIME_THRESHOLDS: Record<AthleteGender, {
  pro: number;      // < pro = HYROX PRO
  open: number;     // < open = HYROX OPEN
  avancado: number; // < avancado = AVANÇADO
  inter: number;    // < inter = INTERMEDIÁRIO
  // >= inter = INICIANTE
}> = {
  masculino: { pro: 80, open: 95, avancado: 110, inter: 125 },
  feminino: { pro: 85, open: 100, avancado: 115, inter: 130 },
};

/**
 * Limiares de TOPO do nível (em minutos) - quando o atleta está no 95-100 do score.
 * Representa "pronto para subir de nível" ou "topo real daquele nível".
 * Base: faixa 30-34 anos.
 */
const LEVEL_TOP_THRESHOLDS: Record<AthleteGender, Record<AthleteStatus, number>> = {
  masculino: {
    iniciante: 95,      // ≤1h35 = topo iniciante (pronto para inter)
    intermediario: 80,  // ≤1h20 = topo inter (pronto para avançado)
    avancado: 70,       // ≤1h10 = topo avançado (pronto para OPEN)
    hyrox_open: 66,     // ≤1h06 = topo OPEN (top nacional)
    hyrox_pro: 66,      // ≤1h06 = pódio nacional (usa régua PRO separada)
  },
  feminino: {
    iniciante: 100,     // ≤1h40 = topo iniciante
    intermediario: 85,  // ≤1h25 = topo inter
    avancado: 75,       // ≤1h15 = topo avançado
    hyrox_open: 70,     // ≤1h10 = topo OPEN
    hyrox_pro: 70,      // ≤1h10 = pódio nacional
  },
};

/**
 * Limiares de BASE do nível (em minutos) - quando o atleta está no score ~0-10 do nível.
 * Representa "acabou de entrar no nível".
 */
const LEVEL_BASE_THRESHOLDS: Record<AthleteGender, Record<AthleteStatus, number>> = {
  masculino: {
    iniciante: 150,     // >2h30 = base iniciante
    intermediario: 125, // ~2h05 = base inter
    avancado: 110,      // ~1h50 = base avançado
    hyrox_open: 95,     // ~1h35 = base OPEN
    hyrox_pro: 85,      // ~1h25 = base PRO (entry level)
  },
  feminino: {
    iniciante: 155,     // >2h35 = base iniciante
    intermediario: 130, // ~2h10 = base inter
    avancado: 115,      // ~1h55 = base avançado
    hyrox_open: 100,    // ~1h40 = base OPEN
    hyrox_pro: 92,      // ~1h32 = base PRO
  },
};

// ============================================================
// TOLERÂNCIA POR IDADE (MINUTOS ADICIONAIS)
// ============================================================

const AGE_TOLERANCE_MINUTES: Record<HyroxAgeBracket, number> = {
  '16-24': 0,
  '25-29': 0,
  '30-34': 0,  // Base de referência
  '35-39': 2,
  '40-44': 4,
  '45-49': 6,
  '50-54': 8,
  '55-59': 10,
  '60-64': 13,
  '65-69': 16,
  '70+': 20,
};

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

const OFFICIAL_COMPETITION_VALIDITY_DAYS = 18 * 30; // 18 meses
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

export function getAgeTolerance(ageBracket: HyroxAgeBracket): number {
  return AGE_TOLERANCE_MINUTES[ageBracket];
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
 * Obtém limiares de status ajustados por idade.
 */
export function getAdjustedStatusThresholds(
  gender: AthleteGender,
  ageBracket: HyroxAgeBracket
): { pro: number; open: number; avancado: number; inter: number } {
  const base = STATUS_TIME_THRESHOLDS[gender];
  const tolerance = AGE_TOLERANCE_MINUTES[ageBracket];
  
  return {
    pro: base.pro + tolerance,
    open: base.open + tolerance,
    avancado: base.avancado + tolerance,
    inter: base.inter + tolerance,
  };
}

/**
 * Obtém limiares de topo/base do nível ajustados por idade.
 */
function getAdjustedLevelThresholds(
  gender: AthleteGender,
  status: AthleteStatus,
  ageBracket: HyroxAgeBracket
): { top: number; base: number } {
  const tolerance = AGE_TOLERANCE_MINUTES[ageBracket];
  return {
    top: LEVEL_TOP_THRESHOLDS[gender][status] + tolerance,
    base: LEVEL_BASE_THRESHOLDS[gender][status] + tolerance,
  };
}

// ============================================================
// CLASSIFICAÇÃO DE STATUS POR TEMPO
// ============================================================

/**
 * Classifica o STATUS do atleta baseado no tempo de prova oficial.
 * O status define "onde o atleta compete hoje".
 * 
 * REGRAS:
 * - Usa tempo Open-equivalente (PRO normalizado)
 * - Ajusta limiares por idade
 * - Atletas 60+ NÃO podem ser PRO (capped em OPEN)
 */
export function getStatusFromOfficialTime(
  timeInSeconds: number,
  gender: AthleteGender = 'masculino',
  raceCategory: RaceCategory = 'OPEN',
  ageAtRace?: number
): LevelClassificationResult {
  const openEqSec = toOpenEquivalentSeconds(timeInSeconds, gender, raceCategory);
  const openEqMin = openEqSec / 60;
  
  const ageBracket = ageAtRace !== undefined ? getAgeBracket(ageAtRace) : '30-34';
  const t = getAdjustedStatusThresholds(gender, ageBracket);
  
  // Determina status pelo tempo
  let status: AthleteStatus;
  if (openEqMin < t.pro) status = 'hyrox_pro';
  else if (openEqMin < t.open) status = 'hyrox_open';
  else if (openEqMin < t.avancado) status = 'avancado';
  else if (openEqMin < t.inter) status = 'intermediario';
  else status = 'iniciante';
  
  // Regra especial: 60+ não podem ser PRO
  let cappedFromPro = false;
  let cappedReason: string | undefined;
  
  if (ageAtRace !== undefined && ageAtRace >= 60 && status === 'hyrox_pro') {
    status = 'hyrox_open';
    cappedFromPro = true;
    cappedReason = `Atletas 60+ são classificados como HYROX OPEN (tempo seria PRO)`;
  }
  
  // Calcula o score DENTRO do nível
  const levelScore = calculateLevelScore(openEqMin, gender, status, ageBracket);
  
  return { status, levelScore, cappedFromPro, cappedReason };
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
  const { top, base } = getAdjustedLevelThresholds(gender, status, ageBracket);
  
  // Se tempo <= top, está no topo (95-100)
  if (timeInMinutes <= top) {
    // Linear de 95 a 100 para tempos ainda melhores que o top
    const bestPossible = top - 10; // ~10 min melhor que top = 100
    if (timeInMinutes <= bestPossible) return 100;
    const ratio = (top - timeInMinutes) / (top - bestPossible);
    return 95 + (ratio * 5);
  }
  
  // Se tempo >= base, está na base (0-10)
  if (timeInMinutes >= base) {
    // Linear de 10 a 0 para tempos ainda piores que base
    const worstInLevel = base + 15; // ~15 min pior que base = 0
    if (timeInMinutes >= worstInLevel) return 0;
    const ratio = (worstInLevel - timeInMinutes) / (worstInLevel - base);
    return ratio * 10;
  }
  
  // Entre base e top: interpolação linear (10-95)
  const range = base - top;
  const position = base - timeInMinutes;
  const ratio = position / range;
  
  return 10 + (ratio * 85); // 10 a 95
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
  athleteBirthDate?: Date
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
      
      const classification = getStatusFromOfficialTime(r.time_in_seconds!, gender, raceCategory, ageAtRace);
      
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

const STATUS_ORDER: AthleteStatus[] = ['iniciante', 'intermediario', 'avancado', 'hyrox_open', 'hyrox_pro'];

function getNextStatus(current: AthleteStatus): AthleteStatus | null {
  const index = STATUS_ORDER.indexOf(current);
  return index < STATUS_ORDER.length - 1 ? STATUS_ORDER[index + 1] : null;
}

function getPrevStatus(current: AthleteStatus): AthleteStatus | null {
  const index = STATUS_ORDER.indexOf(current);
  return index > 0 ? STATUS_ORDER[index - 1] : null;
}

function getStatusFromBenchmarkScore(score: number): AthleteStatus {
  // Benchmarks estimam status com limiares conservadores
  if (score >= 90) return 'hyrox_pro';
  if (score >= 75) return 'hyrox_open';
  if (score >= 55) return 'avancado';
  if (score >= 35) return 'intermediario';
  return 'iniciante';
}

// ============================================================
// FUNÇÃO PRINCIPAL - CALCULAR STATUS DO ATLETA
// ============================================================

export function calculateAthleteStatus(
  benchmarkResults: BenchmarkResult[],
  officialResults: ExternalResult[],
  gender: AthleteGender = 'masculino',
  previousStatus?: AthleteStatus,
  athleteBirthDate?: Date
): CalculatedStatus {
  const athleteAgeBracket = athleteBirthDate 
    ? getAgeBracket(calculateAgeAtDate(athleteBirthDate, new Date()))
    : undefined;

  const { valid: validatingCompetition, historical: historicalCompetitions } = 
    processOfficialCompetitions(officialResults, gender, athleteBirthDate);

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
    const status = previousStatus || 'iniciante';
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
  const currentIndex = STATUS_ORDER.indexOf(status);
  
  // Mapeia os novos níveis de treino para offsets
  let offset = 0;
  if (trainingLevel === 'base') offset = -1;
  if (trainingLevel === 'performance') offset = 1;
  // 'progressivo' = 0 (mantém o status atual)
  
  const newIndex = Math.max(0, Math.min(STATUS_ORDER.length - 1, currentIndex + offset));
  return STATUS_ORDER[newIndex];
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
): { pro: number; open: number; adv: number; inter: number } {
  const t = getAdjustedStatusThresholds(gender, ageBracket);
  return { pro: t.pro, open: t.open, adv: t.avancado, inter: t.inter };
}
