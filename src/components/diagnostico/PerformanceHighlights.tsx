import { Trophy, MapPin, Dumbbell, Timer, Flag, Medal, Zap } from 'lucide-react';
import type { DiagnosticoResumo, Split } from './types';
import { timeToSeconds, secondsToTime } from './types';

interface Props {
  resumo: DiagnosticoResumo;
  splits?: Split[];
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

/** Extract roxzone time from splits */
function getRoxzoneTime(splits: Split[]): string {
  const roxSplit = splits.find(s =>
    s.split_name.toLowerCase().includes('roxzone') || s.split_name.toLowerCase().includes('rox zone')
  );
  if (roxSplit) return extractNumeric(roxSplit.time);
  return '—';
}

export default function PerformanceHighlights({ resumo, splits = [] }: Props) {
  const roxzone = getRoxzoneTime(splits);

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
        <Trophy className="w-5 h-5 text-primary" />
        Resultado Oficial
      </h3>

      {/* Row 1: Hero metrics — Finish Time, Rank Categoria, Rank Geral */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-primary/10 border-2 border-primary rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1">
          <div className="flex items-center gap-1.5 text-primary">
            <Flag className="w-4 h-4" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Finish Time</span>
          </div>
          <p className="text-3xl font-extrabold text-primary">
            {resumo.finish_time || '—'}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Medal className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Rank Categoria</span>
          </div>
          <p className="text-3xl font-extrabold text-primary">
            {extractRank(resumo.posicao_categoria)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Rank Geral</span>
          </div>
          <p className="text-3xl font-extrabold text-primary">
            {extractRank(resumo.posicao_geral)}
          </p>
        </div>
      </div>

      {/* Row 2: Time breakdowns — Run Total, Workout Total, Roxzone */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Timer className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Run Total</span>
          </div>
          <p className="text-xl font-bold text-primary">
            {extractNumeric(resumo.run_total)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Dumbbell className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Workout Total</span>
          </div>
          <p className="text-xl font-bold text-primary">
            {extractNumeric(resumo.workout_total)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Roxzone</span>
          </div>
          <p className="text-xl font-bold text-primary">
            {roxzone}
          </p>
        </div>
      </div>
    </div>
  );
}
