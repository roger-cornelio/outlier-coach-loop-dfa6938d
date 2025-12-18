export type CoachStyle = 'IRON' | 'PULSE' | 'SPARK';

// Status is now calculated from benchmarks, not user-defined
export type AthleteStatus = 'iniciante' | 'intermediario' | 'avancado' | 'hyrox_pro';

// User preference for workout difficulty (offset applied to calculated status)
export type TrainingDifficulty = 'leve' | 'padrao' | 'forte';

// Legacy type alias for compatibility
export type AthleteLevel = AthleteStatus;

export type SessionDuration = 30 | 45 | 60 | 90 | 'ilimitado';

export type DayOfWeek = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export interface Equipment {
  id: string;
  name: string;
  emoji: string;
}

export interface AthleteConfig {
  // User preference - NOT the actual status
  trainingDifficulty: TrainingDifficulty;
  sessionDuration: SessionDuration;
  equipment: string[];
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
  isMainWod?: boolean;
  isBenchmark?: boolean;
  wodType?: WodType;
  durationMinutes?: number;
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
}

// Performance classification buckets
export type PerformanceBucket = 'ELITE' | 'STRONG' | 'OK' | 'TOUGH' | 'DNF';

export interface DayWorkout {
  day: DayOfWeek;
  stimulus: string;
  estimatedTime: number;
  blocks: WorkoutBlock[];
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
  hyrox_pro: 'HYROX PRO',
};

export const DIFFICULTY_NAMES: Record<TrainingDifficulty, string> = {
  leve: 'Leve',
  padrao: 'Padrão',
  forte: 'Forte',
};

export const STATUS_ORDER: AthleteStatus[] = ['iniciante', 'intermediario', 'avancado', 'hyrox_pro'];
