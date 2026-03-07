import { TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DiagnosticoMelhoria } from './types';
import { secondsToTime } from './types';

interface Props {
  diagnosticos: DiagnosticoMelhoria[];
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

export default function ImprovementTable({ diagnosticos }: Props) {
  if (diagnosticos.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Diagnóstico de Melhoria
      </h3>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground">Estação</TableHead>
              <TableHead className="text-muted-foreground">Métrica</TableHead>
              <TableHead className="text-muted-foreground text-right">Você</TableHead>
              <TableHead className="text-muted-foreground text-right">Meta OUTLIER</TableHead>
              <TableHead className="text-muted-foreground text-right">Diferença</TableHead>
              <TableHead className="text-muted-foreground text-center">Foco %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {diagnosticos.map((d) => (
              <TableRow key={d.id} className="border-border">
                <TableCell className="font-medium text-foreground text-sm">{d.movement}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{translateMetric(d.metric)}</TableCell>
                <TableCell className="text-right text-sm text-foreground">
                  {formatTime(d.your_score)}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatTime(d.top_1)}
                </TableCell>
                <TableCell className="text-right text-sm text-foreground font-semibold">
                  {formatTime(d.improvement_value)}
                </TableCell>
                <TableCell className="text-center">
                  <PercentageBadge value={d.percentage} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
