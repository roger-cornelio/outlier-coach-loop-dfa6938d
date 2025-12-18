export type CoachStyle = 'IRON' | 'PULSE' | 'SPARK';

export type AthleteLevel = 'iniciante' | 'intermediario' | 'avancado' | 'hyrox_pro';

export type SessionDuration = 30 | 45 | 60 | 90 | 'ilimitado';

export type DayOfWeek = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export interface Equipment {
  id: string;
  name: string;
  emoji: string;
}

export interface AthleteConfig {
  level: AthleteLevel;
  sessionDuration: SessionDuration;
  equipment: string[];
  coachStyle: CoachStyle;
  altura?: number;
  peso?: number;
  idade?: number;
  sexo?: 'masculino' | 'feminino';
}

export type WodType = 'engine' | 'strength' | 'skill' | 'mixed' | 'hyrox' | 'benchmark';

export interface TargetTimeRange {
  min: number; // seconds
  max: number; // seconds
}

export interface WorkoutBlock {
  id: string;
  type: 'aquecimento' | 'conditioning' | 'forca' | 'especifico' | 'core' | 'corrida' | 'notas';
  title: string;
  content: string;
  isMainWod?: boolean;
  isBenchmark?: boolean;
  wodType?: WodType;
  durationMinutes?: number;
  targetSeconds?: number;
  targetRange?: TargetTimeRange;
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

export const LEVEL_NAMES: Record<AthleteLevel, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  hyrox_pro: 'HYROX PRO',
};
