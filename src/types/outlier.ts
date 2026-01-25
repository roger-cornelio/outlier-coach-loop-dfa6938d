export type CoachStyle = 'IRON' | 'PULSE' | 'SPARK';

// Status is now calculated internally (INVISIBLE to user) from benchmarks
export type AthleteStatus = 'iniciante' | 'intermediario' | 'avancado' | 'hyrox_open' | 'hyrox_pro';

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
  iniciante?: LevelVariant;
  intermediario?: LevelVariant;
  avancado?: LevelVariant;
  hyrox_pro?: LevelVariant;
}

// Legacy support for target ranges only
export interface LevelTargetRanges {
  iniciante?: TargetTimeRange;
  intermediario?: TargetTimeRange;
  avancado?: TargetTimeRange;
  hyrox_pro?: TargetTimeRange;
}

export interface WorkoutBlock {
  id: string;
  type: 'aquecimento' | 'conditioning' | 'forca' | 'especifico' | 'core' | 'corrida' | 'notas';
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
    iniciante: number;
    intermediario: number;
    avancado: number;
    hyrox_pro: number;
  };
  // Versioning for params preservation
  paramsVersionUsed?: string; // Version of outlierParams when benchmark was created
  createdAt?: string; // ISO timestamp of when benchmark was created
  updatedAt?: string; // ISO timestamp of last update
  // Coach override for benchmark times (takes priority over generated ranges)
  benchmarkTimeOverride?: LevelTargetRanges;
}

// Performance classification buckets
export type PerformanceBucket = 'ELITE' | 'STRONG' | 'OK' | 'TOUGH' | 'DNF';

export interface DayWorkout {
  day: DayOfWeek;
  stimulus: string;
  estimatedTime: number;
  blocks: WorkoutBlock[];
  isRestDay?: boolean; // MVP0: Dia de descanso não exige WOD Principal
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
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  hyrox_open: 'HYROX OPEN',
  hyrox_pro: 'HYROX PRO',
};

// Nomes dos níveis de treino (escolha do usuário)
export const TRAINING_LEVEL_NAMES: Record<TrainingLevel, string> = {
  open: 'OPEN',
  pro: 'PRO',
};

// Legacy alias
export const DIFFICULTY_NAMES = TRAINING_LEVEL_NAMES;

export const STATUS_ORDER: AthleteStatus[] = ['iniciante', 'intermediario', 'avancado', 'hyrox_open', 'hyrox_pro'];
