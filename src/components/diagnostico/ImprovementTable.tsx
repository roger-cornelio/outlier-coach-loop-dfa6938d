import { TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DiagnosticoMelhoria, Split } from './types';
import { secondsToTime, timeToSeconds } from './types';

interface Props {
  diagnosticos: DiagnosticoMelhoria[];
  splits?: Split[];
}

function PercentageBadge({ value }: { value: number }) {
  const abs = Math.abs(value);
  if (abs < 5) {
    return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">{value.toFixed(1)}%</Badge>;
  }
  if (abs < 15) {
    return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30">{value.toFixed(1)}%</Badge>;
  }
  return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">{value.toFixed(1)}%</Badge>;
}

function translateMetric(metric: string): string {
  if (!metric) return '-';
  const map: Record<string, string> = {
    'potential improvement': 'Melhoria Potencial',
    'time': 'Tempo',
  };
  return map[metric.toLowerCase()] || metric;
}

function formatTime(seconds: number): string {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '00:00';
  return secondsToTime(Math.max(0, seconds));
}

/** Check if diagnosticos already has a roxzone-like row */
function hasRoxzone(diagnosticos: DiagnosticoMelhoria[]): boolean {
  return diagnosticos.some(d =>
    d.movement.toLowerCase().includes('roxzone') || d.movement.toLowerCase().includes('rox zone')
  );
}

/** Extract roxzone time from splits data */
function getRoxzoneFromSplits(splits: Split[]): number {
  const roxSplit = splits.find(s =>
    s.split_name.toLowerCase().includes('roxzone') || s.split_name.toLowerCase().includes('rox zone')
  );
  if (roxSplit) return timeToSeconds(roxSplit.time);
  return 0;
}

export default function ImprovementTable({ diagnosticos, splits = [], metricScores = [] }: Props) {
  // Fetch p10_sec from percentile_bands as the single source of truth for "Meta OUTLIER"
  const [p10Map, setP10Map] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchP10() {
      const { data } = await supabase
        .from('percentile_bands')
        .select('metric, p10_sec')
        .eq('percentile_set_id', 'v1')
        .eq('is_active', true);
      if (data) {
        const map: Record<string, number> = {};
        for (const b of data) {
          map[b.metric] = b.p10_sec;
        }
        setP10Map(map);
      }
    }
    if (diagnosticos.length > 0) fetchP10();
  }, [diagnosticos.length]);

  if (diagnosticos.length === 0) return null;

  // Build rows, overriding top_1 with p10_sec when available
  let rows = diagnosticos.map(d => {
    const p10 = p10Map[d.metric];
    if (p10 && p10 > 0) {
      const newTop1 = p10;
      const newImprovement = Math.max(0, d.your_score - newTop1);
      return { ...d, top_1: newTop1, improvement_value: newImprovement };
    }
    return { ...d };
  });

  // Inject Roxzone from splits if missing
  if (!hasRoxzone(diagnosticos) && splits.length > 0) {
    const roxzoneSec = getRoxzoneFromSplits(splits);
    if (roxzoneSec > 0) {
      const roxzoneP10 = p10Map['roxzone'] || 0;
      const roxzoneRef = roxzoneP10 > 0 ? roxzoneP10 : 0;
      const improvementVal = roxzoneRef > 0 ? Math.max(0, roxzoneSec - roxzoneRef) : 0;

      rows.push({
        id: 'roxzone-computed',
        movement: 'Roxzone Time',
        metric: 'roxzone',
        value: 0,
        your_score: roxzoneSec,
        top_1: roxzoneRef,
        improvement_value: improvementVal,
        percentage: 0,
        total_improvement: 0,
      });
    }
  }

  // Recalculate percentages for all rows based on total improvement
  const totalImprovement = rows.reduce((sum, d) => sum + d.improvement_value, 0);
  if (totalImprovement > 0) {
    rows = rows.map(d => ({
      ...d,
      percentage: d.improvement_value > 0 ? (d.improvement_value / totalImprovement) * 100 : 0,
    }));
  }

  const totalYou = rows.reduce((sum, d) => sum + d.your_score, 0);
  const totalMeta = rows.reduce((sum, d) => sum + d.top_1, 0);
  const totalDiff = rows.reduce((sum, d) => sum + d.improvement_value, 0);
  const totalPct = rows.reduce((sum, d) => sum + d.percentage, 0);

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Diagnóstico de Melhoria
      </h3>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-muted/30">
              <TableHead className="text-muted-foreground text-center text-xs uppercase tracking-wider">Estação</TableHead>
              <TableHead className="text-muted-foreground text-center text-xs uppercase tracking-wider">Você</TableHead>
              <TableHead className="text-center text-xs uppercase tracking-wider text-primary font-bold">Meta OUTLIER</TableHead>
              <TableHead className="text-muted-foreground text-center text-xs uppercase tracking-wider">Potencial de Evolução</TableHead>
              <TableHead className="text-muted-foreground text-center text-xs uppercase tracking-wider">Foco</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d, i) => (
              <TableRow key={d.id} className={`border-border transition-colors hover:bg-muted/20 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                <TableCell className="font-semibold text-foreground text-sm text-center">{d.movement}</TableCell>
                <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                  {formatTime(d.your_score)}
                </TableCell>
                <TableCell className="text-center text-sm text-primary font-bold tabular-nums">
                  {d.top_1 > 0 ? formatTime(d.top_1) : '—'}
                </TableCell>
                <TableCell className="text-center text-sm font-semibold tabular-nums">
                  {d.improvement_value > 0
                    ? <span className="text-emerald-400">−{formatTime(d.improvement_value)}</span>
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-center">
                  {d.percentage > 0 ? <PercentageBadge value={d.percentage} /> : <span className="text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
            {/* Totals row */}
            <TableRow className="border-t-2 border-primary/40 bg-primary/[0.08]">
              <TableCell className="font-extrabold text-primary text-sm text-center tracking-wide">PROVA TOTAL</TableCell>
              <TableCell className="text-center text-sm text-foreground font-bold tabular-nums">
                {formatTime(totalYou)}
              </TableCell>
              <TableCell className="text-center font-extrabold text-primary tabular-nums text-base">
                {totalMeta > 0 ? formatTime(totalMeta) : '—'}
              </TableCell>
              <TableCell className="text-center font-extrabold tabular-nums text-base">
                {totalDiff > 0
                  ? <span className="text-emerald-400">−{formatTime(totalDiff)}</span>
                  : '—'}
              </TableCell>
              <TableCell className="text-center">
                <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 font-bold">
                  {totalPct.toFixed(1)}%
                </Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
