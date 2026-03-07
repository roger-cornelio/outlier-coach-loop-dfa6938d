export interface DiagnosticoResumo {
  id: string;
  posicao_categoria: string | null;
  posicao_geral: string | null;
  run_total: string | null;
  workout_total: string | null;
  texto_ia: string | null;
  source_url: string | null;
}

export interface Split {
  id: string;
  split_name: string;
  time: string;
}

export interface DiagnosticoMelhoria {
  id: string;
  movement: string;
  metric: string;
  value: number;
  your_score: number;
  top_1: number;
  improvement_value: number;
  percentage: number;
  total_improvement: number;
}

export interface DiagnosticoData {
  resumo: DiagnosticoResumo | null;
  splits: Split[];
  diagnosticos: DiagnosticoMelhoria[];
}

/** Convert "MM:SS" or "HH:MM:SS" to total seconds */
export function timeToSeconds(t: string): number {
  if (!t || typeof t !== 'string') return 0;
  const parts = t.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

/** Format seconds back to MM:SS */
export function secondsToTime(sec: number): string {
  if (!sec || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
