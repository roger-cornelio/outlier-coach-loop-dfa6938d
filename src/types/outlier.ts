export type CoachStyle = 'IRON' | 'PULSE' | 'SPARK';

// Status is now calculated internally (INVISIBLE to user) from benchmarks
// 3 levels: open (entry), pro (competitive), elite (top)
export type AthleteStatus = 'open' | 'pro' | 'elite';

// ═══════════════════════════════════════════════════════════════════════════
// PlanTier: Plano CONTRATADO pelo atleta com o coach (OPEN / PRO)
// NÃO influencia o motor de treino, estimativas ou adaptações.
// É apenas um atributo de assinatura/plano, não de estímulo diário.
// ═══════════════════════════════════════════════════════════════════════════
export type PlanTier = 'open' | 'pro';

// Legacy alias for compatibility (deprecated - use PlanTier)
export type TrainingLevel = PlanTier;
export type TrainingDifficulty = PlanTier;

// AthleteLevel is used for workout scaling (based on status/benchmarks)
export type AthleteLevel = AthleteStatus;

export type SessionDuration = 30 | 45 | 60 | 90 | 'ilimitado';

export type DayOfWeek = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export interface Equipment {
  id: string;
  name: string;
  emoji: string;
}

export interface AthleteConfig {
  // Plano contratado (OPEN/PRO) - NÃO influencia o treino do dia
  // Apenas define o nível de assinatura com o coach
  planTier?: PlanTier;
  // Legacy alias for compatibility (deprecated)
  trainingLevel?: PlanTier;
  sessionDuration: SessionDuration;
  equipment?: string[]; // Legacy: Equipamentos disponíveis (opcional)
  unavailableEquipment?: string[]; // Equipamentos que o atleta NÃO possui
  equipmentNotes?: string; // Notas adicionais sobre equipamentos
  coachStyle: CoachStyle;
  altura?: number;
  peso?: number;
  idade?: number;
  sexo?: 'masculino' | 'feminino';
}

export type WodType = 'engine' | 'strength' | 'skill' | 'mixed' | 'hyrox' | 'benchmark';

// Benchmark metric types
export type BenchmarkMetric = 'time_seconds' | 'reps' | 'distance_meters' | 'load_kg' | 'rounds';
export type BenchmarkDirection = 'lower_is_better' | 'higher_is_better';

export interface TargetTimeRange {
  min: number; // seconds
  max: number; // seconds
}

// Variant data for each athlete level
export interface LevelVariant {
  content: string; // Workout description specific to this level
  notes?: string; // e.g., "ritmo confortável, foco em constância"
  targetRange?: TargetTimeRange;
  durationMinutes?: number;
  pse?: number; // Perceived Subjective Exertion (1-10)
  referencePaceMinutes?: number; // Reference pace per km/500m
}

export interface LevelVariants {
  open?: LevelVariant;
  pro?: LevelVariant;
  elite?: LevelVariant;
}

// Legacy support for target ranges only
export interface LevelTargetRanges {
  open?: TargetTimeRange;
  pro?: TargetTimeRange;
  elite?: TargetTimeRange;
}

export interface WorkoutBlock {
  id: string;
  type: 'aquecimento' | 'conditioning' | 'forca' | 'especifico' | 'core' | 'corrida' | 'notas' | 'mobilidade' | 'tecnica' | 'acessorio' | 'metcon';
  title: string;
  content: string; // Base content (used when no level variants)
  // MVP0: Linhas de treino e comentários parseados
  lines?: string[];
  coachNotes?: string[];
  isMainWod?: boolean;
  isBenchmark?: boolean;
  wodType?: WodType;
  /** 
   * Input humano: duração do bloco em minutos (entrada do coach)
   * Mantido para compatibilidade com dados antigos
   */
  durationMinutes?: number;
  /**
   * FONTE DE VERDADE AUDITÁVEL: duração do bloco em segundos
   * Persistido explicitamente no JSON para rastreabilidade histórica
   * Prioridade na leitura: durationSec > durationMinutes * 60
   */
  durationSec?: number;
  targetSeconds?: number;
  targetRange?: TargetTimeRange;
  levelTargetRanges?: LevelTargetRanges; // Legacy: target times per level
  levelVariants?: LevelVariants; // Full variants per level (content + targets)
  // Intensity guidance
  pse?: number; // Perceived Subjective Exertion (1-10 scale)
  referencePaceMinutes?: number; // Reference pace per km/500m
  // Benchmark configuration
  benchmarkId?: string; // Unique identifier for benchmark tracking
  benchmarkMetric?: BenchmarkMetric; // What metric is measured
  benchmarkDirection?: BenchmarkDirection; // lower_is_better or higher_is_better
  benchmarkWeight?: number; // Weight for composite scoring (default 1.0)
  referenceTime?: {
    open: number;
    pro: number;
    elite: number;
  };
  // Versioning for params preservation
  paramsVersionUsed?: string; // Version of outlierParams when benchmark was created
  createdAt?: string; // ISO timestamp of when benchmark was created
  updatedAt?: string; // ISO timestamp of last update
  // Coach override for benchmark times (takes priority over generated ranges)
  benchmarkTimeOverride?: LevelTargetRanges;
  // ═══════════════════════════════════════════════════════════════════════════
  // Parser IA: Dados estruturados extraídos pela Edge Function parse-workout-blocks
  // ═══════════════════════════════════════════════════════════════════════════
  parsedExercises?: ParsedExercise[];
  computedMetrics?: ComputedBlockMetrics;
  parseStatus?: 'completed' | 'failed' | 'bypassed';
  parsedAt?: string; // ISO timestamp
}

// ═══════════════════════════════════════════════════════════════════════════
// ParsedExercise: Exercício estruturado extraído pela IA
// ═══════════════════════════════════════════════════════════════════════════
export interface ParsedExercise {
  slug: string; // Identificador único do exercício (ex: 'front_squat')
  name: string; // Nome legível (ex: 'Front Squat')
  movementPatternSlug?: string; // Padrão biomecânico (ex: 'squat')
  sets?: number;
  reps?: number;
  durationSeconds?: number; // Para exercícios baseados em tempo
  distanceMeters?: number; // Para corrida, remo, etc.
  loadKg?: number; // Carga em kg
  loadDisplay?: string; // Texto livre de carga (ex: 'RPE 8', 'Moderado')
  intensityType?: 'pse' | 'zone' | 'percentage' | 'rpe';
  intensityValue?: number;
  restSeconds?: number;
  notes?: string; // Notas adicionais do exercício
}

// ═══════════════════════════════════════════════════════════════════════════
// ComputedBlockMetrics: Métricas calculadas a partir dos ParsedExercises
// ═══════════════════════════════════════════════════════════════════════════
export interface ComputedBlockMetrics {
  estimatedKcal?: number;
  estimatedDurationSec?: number;
  totalSets?: number;
  totalReps?: number;
  avgIntensity?: number;
  computedAt?: string; // ISO timestamp
}

// Performance classification buckets
export type PerformanceBucket = 'ELITE' | 'STRONG' | 'OK' | 'TOUGH' | 'DNF';

export interface DayWorkout {
  day: DayOfWeek;
  stimulus: string;
  estimatedTime: number;
  blocks: WorkoutBlock[];
  isRestDay?: boolean; // MVP0: Dia de descanso não exige WOD Principal
  session?: number; // 1 ou 2 — para dias com duas sessões (default: 1)
  sessionLabel?: string; // Label opcional do coach (ex: "Manhã", "18:00")
}

export interface WorkoutResult {
  workoutId: string;
  blockId: string;
  completed: boolean;
  timeInSeconds?: number;
  date: string;
}

export type PerformanceRating = 'excellent' | 'good' | 'attention' | 'below';

export interface PerformanceFeedback {
  rating: PerformanceRating;
  bucket?: PerformanceBucket;
  message: string;
  suggestions: string[];
}

// Equipamentos opcionais (ajustes secundários) - apenas os 4 específicos
export const OPTIONAL_EQUIPMENT_LIST: Equipment[] = [
  { id: 'skierg', name: 'SkiErg', emoji: '⛷️' },
  { id: 'rower', name: 'Remo Ergômetro', emoji: '🚣' },
  { id: 'bike', name: 'Assault Bike', emoji: '🚴' },
  { id: 'sled', name: 'Sled (Push/Pull)', emoji: '🛷' },
];

// Legacy: lista completa de equipamentos (para compatibilidade)
export const EQUIPMENT_LIST: Equipment[] = [
  { id: 'rower', name: 'Remo Ergômetro', emoji: '🚣' },
  { id: 'skierg', name: 'SkiErg', emoji: '⛷️' },
  { id: 'bike', name: 'Assault Bike', emoji: '🚴' },
  { id: 'barbell', name: 'Barra Olímpica', emoji: '🏋️' },
  { id: 'dumbbells', name: 'Halteres', emoji: '💪' },
  { id: 'kettlebell', name: 'Kettlebell', emoji: '🔔' },
  { id: 'sled', name: 'Sled Push/Pull', emoji: '🛷' },
  { id: 'sandbag', name: 'Sandbag', emoji: '🎒' },
  { id: 'wallball', name: 'Wall Ball', emoji: '🏐' },
  { id: 'box', name: 'Box Jump', emoji: '📦' },
  { id: 'pullupbar', name: 'Barra Fixa', emoji: '🔩' },
  { id: 'rings', name: 'Argolas', emoji: '⭕' },
];

export const DAY_NAMES: Record<DayOfWeek, string> = {
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
  dom: 'Domingo',
};

export const LEVEL_NAMES: Record<AthleteStatus, string> = {
  open: 'OPEN OUTLIER',
  pro: 'PRO OUTLIER',
  elite: 'ELITE OUTLIER',
};

// Nomes dos níveis de treino (escolha do usuário)
export const TRAINING_LEVEL_NAMES: Record<TrainingLevel, string> = {
  open: 'OPEN',
  pro: 'PRO',
};

// Legacy alias
export const DIFFICULTY_NAMES = TRAINING_LEVEL_NAMES;

export const STATUS_ORDER: AthleteStatus[] = ['open', 'pro', 'elite'];

