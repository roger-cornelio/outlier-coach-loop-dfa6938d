export type PhaseType = 'run' | 'station';

export interface SimulatorPhase {
  index: number;
  label: string;
  type: PhaseType;
  icon: 'run' | 'ski' | 'sled_push' | 'sled_pull' | 'burpee' | 'row' | 'farmers' | 'sandbag' | 'wallballs';
}

export const HYROX_PHASES: SimulatorPhase[] = [
  { index: 0, label: 'Run 1km', type: 'run', icon: 'run' },
  { index: 1, label: 'SkiErg 1000m', type: 'station', icon: 'ski' },
  { index: 2, label: 'Run 1km', type: 'run', icon: 'run' },
  { index: 3, label: 'Sled Push 50m', type: 'station', icon: 'sled_push' },
  { index: 4, label: 'Run 1km', type: 'run', icon: 'run' },
  { index: 5, label: 'Sled Pull 50m', type: 'station', icon: 'sled_pull' },
  { index: 6, label: 'Run 1km', type: 'run', icon: 'run' },
  { index: 7, label: 'Burpee Broad Jump 80m', type: 'station', icon: 'burpee' },
  { index: 8, label: 'Run 1km', type: 'run', icon: 'run' },
  { index: 9, label: 'Rowing 1000m', type: 'station', icon: 'row' },
  { index: 10, label: 'Run 1km', type: 'run', icon: 'run' },
  { index: 11, label: 'Farmers Carry 200m', type: 'station', icon: 'farmers' },
  { index: 12, label: 'Run 1km', type: 'run', icon: 'run' },
  { index: 13, label: 'Sandbag Lunges 100m', type: 'station', icon: 'sandbag' },
  { index: 14, label: 'Run 1km', type: 'run', icon: 'run' },
  { index: 15, label: 'Wall Balls 100 reps', type: 'station', icon: 'wallballs' },
];

export const DIVISION_OPTIONS = [
  'HYROX Open Men',
  'HYROX Open Women',
  'HYROX PRO Men',
  'HYROX PRO Women',
  'HYROX Doubles Men',
  'HYROX Doubles Women',
  'HYROX Doubles Mixed',
  'HYROX Relay',
] as const;

export function formatTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatTimeMs(totalMs: number): string {
  const totalSec = totalMs / 1000;
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  const cs = Math.floor((totalMs % 1000) / 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
