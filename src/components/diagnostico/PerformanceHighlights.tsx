import { Trophy, MapPin, Dumbbell, Timer } from 'lucide-react';
import type { DiagnosticoResumo } from './types';

interface Props {
  resumo: DiagnosticoResumo;
}

const stats = [
  { key: 'run_total', label: 'Run Total', icon: Timer, color: 'text-primary' },
  { key: 'workout_total', label: 'Workout Total', icon: Dumbbell, color: 'text-primary' },
  { key: 'posicao_categoria', label: 'Rank Categoria', icon: Trophy, color: 'text-primary' },
  { key: 'posicao_geral', label: 'Rank Geral', icon: MapPin, color: 'text-primary' },
] as const;

export default function PerformanceHighlights({ resumo }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        Performance Highlights
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
