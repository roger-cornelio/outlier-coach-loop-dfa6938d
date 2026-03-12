import { Trophy, MapPin, Dumbbell, Timer, Flag, Medal } from 'lucide-react';
import type { DiagnosticoResumo } from './types';

interface Props {
  resumo: DiagnosticoResumo;
}

/** Extract only the numeric/time portion from a string (e.g. "01:02:33" → "01:02:33") */
function extractNumeric(val: string | null | undefined): string {
  if (!val) return '—';
  const match = val.match(/^[\d:]+/);
  return match ? match[0] : val.replace(/[^\d:.,]/g, '') || '—';
}

/** Extract rank as plain integer, stripping thousand separators (e.g. "1,305th" → "1305") */
function extractRank(val: string | null | undefined): string {
  if (!val) return '—';
  const cleaned = val.replace(/[.,]/g, '');
  const match = cleaned.match(/\d+/);
  return match ? match[0] : '—';
}

const stats = [
  { key: 'posicao_categoria', label: 'Rank Categoria', icon: Medal, isRank: true },
  { key: 'posicao_geral', label: 'Rank Geral', icon: MapPin, isRank: true },
  { key: 'run_total', label: 'Run Total', icon: Timer, isRank: false },
  { key: 'workout_total', label: 'Workout Total', icon: Dumbbell, isRank: false },
] as const;

export default function PerformanceHighlights({ resumo }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        Resultado Oficial
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Finish Time — hero card */}
        <div className="col-span-2 lg:col-span-1 bg-primary/10 border-2 border-primary rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1">
          <div className="flex items-center gap-1.5 text-primary">
            <Flag className="w-4 h-4" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Finish Time</span>
          </div>
          <p className="text-2xl font-extrabold text-primary">
            {resumo.finish_time || '—'}
          </p>
        </div>

        {stats.map(({ key, label, icon: Icon, isRank }) => {
          const raw = resumo[key as keyof DiagnosticoResumo] as string | null;
          const display = isRank ? extractRank(raw) : extractNumeric(raw);
          return (
            <div
              key={key}
              className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1"
            >
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-2xl font-extrabold text-primary">
                {display}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
