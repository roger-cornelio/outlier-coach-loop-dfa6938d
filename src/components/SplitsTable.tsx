import { useMemo } from 'react';
import { Timer, Footprints, Dumbbell } from 'lucide-react';

interface SplitRow {
  label: string;
  time_sec: number | null;
  type: 'run' | 'station' | 'roxzone';
}

interface SplitsTableProps {
  splits: {
    run_avg_sec: number | null;
    roxzone_sec: number | null;
    ski_sec: number | null;
    sled_push_sec: number | null;
    sled_pull_sec: number | null;
    bbj_sec: number | null;
    row_sec: number | null;
    farmers_sec: number | null;
    sandbag_sec: number | null;
    wallballs_sec: number | null;
  };
  totalTimeSeconds: number;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * HYROX race order: Run 1 → Ski → Run 2 → Sled Push → Run 3 → Sled Pull → 
 * Run 4 → Burpee BJ → Run 5 → Row → Run 6 → Farmers → Run 7 → Sandbag → Run 8 → Wall Balls
 */
const RACE_ORDER: { label: string; key: string; type: 'run' | 'station' | 'roxzone' }[] = [
  { label: 'Run 1', key: 'run_avg_sec', type: 'run' },
  { label: 'Ski Erg', key: 'ski_sec', type: 'station' },
  { label: 'Run 2', key: 'run_avg_sec', type: 'run' },
  { label: 'Sled Push', key: 'sled_push_sec', type: 'station' },
  { label: 'Run 3', key: 'run_avg_sec', type: 'run' },
  { label: 'Sled Pull', key: 'sled_pull_sec', type: 'station' },
  { label: 'Run 4', key: 'run_avg_sec', type: 'run' },
  { label: 'Burpee Broad Jump', key: 'bbj_sec', type: 'station' },
  { label: 'Run 5', key: 'run_avg_sec', type: 'run' },
  { label: 'Row', key: 'row_sec', type: 'station' },
  { label: 'Run 6', key: 'run_avg_sec', type: 'run' },
  { label: 'Farmers Carry', key: 'farmers_sec', type: 'station' },
  { label: 'Run 7', key: 'run_avg_sec', type: 'run' },
  { label: 'Sandbag Lunges', key: 'sandbag_sec', type: 'station' },
  { label: 'Run 8', key: 'run_avg_sec', type: 'run' },
  { label: 'Wall Balls', key: 'wallballs_sec', type: 'station' },
];

export function SplitsTable({ splits, totalTimeSeconds }: SplitsTableProps) {
  const { rows, totalRun, totalStations, totalRoxzone } = useMemo(() => {
    const rows: SplitRow[] = RACE_ORDER.map(item => ({
      label: item.label,
      time_sec: splits[item.key as keyof typeof splits] ?? null,
      type: item.type,
    }));

    const runAvg = splits.run_avg_sec ?? 0;
    const totalRun = runAvg * 8;

    const stationKeys = ['ski_sec', 'sled_push_sec', 'sled_pull_sec', 'bbj_sec', 'row_sec', 'farmers_sec', 'sandbag_sec', 'wallballs_sec'] as const;
    const totalStations = stationKeys.reduce((sum, k) => sum + (splits[k] ?? 0), 0);

    const totalRoxzone = splits.roxzone_sec ?? 0;

    return { rows, totalRun, totalStations, totalRoxzone };
  }, [splits]);

  const hasAnyData = Object.values(splits).some(v => v !== null && v > 0);

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Timer className="w-8 h-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          Tempos parciais não disponíveis para esta prova.
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Importe novamente para carregar os splits detalhados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Splits table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estação</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tempo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.label}-${i}`}
                className={`border-t border-border/50 ${
                  row.type === 'run' ? 'bg-amber-500/5' : ''
                }`}
              >
                <td className="py-2 px-3 flex items-center gap-2">
                  {row.type === 'run' ? (
                    <Footprints className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <Dumbbell className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                  <span className={`font-medium ${row.type === 'run' ? 'text-amber-500' : 'text-foreground'}`}>
                    {row.label}
                  </span>
                </td>
                <td className={`py-2 px-3 text-right font-mono font-semibold ${
                  row.type === 'run' ? 'text-amber-500' : 'text-foreground'
                }`}>
                  {row.time_sec ? formatTime(row.time_sec) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 mb-1">Corrida Total</p>
          <p className="text-lg font-bold font-mono text-amber-500">
            {totalRun > 0 ? formatTime(totalRun) : '—'}
          </p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Estações Total</p>
          <p className="text-lg font-bold font-mono text-primary">
            {totalStations > 0 ? formatTime(totalStations) : '—'}
          </p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 mb-1">Roxzone</p>
          <p className="text-lg font-bold font-mono text-purple-400">
            {totalRoxzone > 0 ? formatTime(totalRoxzone) : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
