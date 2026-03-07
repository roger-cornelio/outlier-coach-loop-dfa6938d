import { Trophy, MapPin, Dumbbell, Timer, Flag, Medal } from 'lucide-react';
import type { DiagnosticoResumo } from './types';

interface Props {
  resumo: DiagnosticoResumo;
}

/** Extract only the numeric/time portion from a string (e.g. "21st in Age Group" → "21") */
function extractNumeric(val: string | null | undefined): string {
  if (!val) return '—';
  // Match leading number (with optional : for times)
  const match = val.match(/^[\d:]+/);
  return match ? match[0] : val.replace(/[^\d:.,]/g, '') || '—';
}

const stats = [
  { key: 'posicao_categoria', label: 'Rank Categoria', icon: Medal },
  { key: 'posicao_geral', label: 'Rank Geral', icon: MapPin },
  { key: 'run_total', label: 'Run Total', icon: Timer },
  { key: 'workout_total', label: 'Workout Total', icon: Dumbbell },
] as const;

export default function PerformanceHighlights({ resumo }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        Performance Highlights
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Finish Time — hero card */}
        <div className="col-span-2 lg:col-span-1 bg-primary/10 border-2 border-primary rounded-xl p-5 space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Flag className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Finish Time</span>
          </div>
          <p className="text-2xl lg:text-3xl font-extrabold text-primary truncate">
            {resumo.finish_time || '—'}
          </p>
        </div>

        {stats.map(({ key, label, icon: Icon }) => {
          const raw = resumo[key as keyof DiagnosticoResumo] as string | null;
          const display = extractNumeric(raw);
          return (
            <div
              key={key}
              className="bg-card border border-border rounded-xl p-4 space-y-1"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-xl font-bold text-primary truncate">
                {display}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        Performance Highlights
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Finish Time — hero card */}
        <div className="col-span-2 lg:col-span-1 bg-primary/10 border-2 border-primary rounded-xl p-5 space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Flag className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Finish Time</span>
          </div>
          <p className="text-3xl lg:text-4xl font-extrabold text-primary truncate">
            {resumo.finish_time || '—'}
          </p>
        </div>

        {stats.map(({ key, label, icon: Icon }) => {
          const value = resumo[key as keyof DiagnosticoResumo];
          return (
            <div
              key={key}
              className="bg-card border border-border rounded-xl p-4 space-y-1"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-2xl font-bold text-primary truncate">
                {value || '—'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
