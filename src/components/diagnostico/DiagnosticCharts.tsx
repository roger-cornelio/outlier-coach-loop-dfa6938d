import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import type { Split, DiagnosticoMelhoria } from './types';
import { timeToSeconds, secondsToTime } from './types';

interface Props {
  splits: Split[];
  diagnosticos: DiagnosticoMelhoria[];
}

function SplitsChart({ splits }: { splits: Split[] }) {
  const data = splits.map((s) => ({
    name: s.split_name.replace('Running ', 'R').replace('Burpee Broad Jump', 'BBJ').replace('Farmers Carry', 'Farmers').replace('Sandbag Lunges', 'Sandbag').replace('Wall Balls', 'WB'),
    fullName: s.split_name,
    seconds: timeToSeconds(s.time),
    time: s.time,
  }));

  return (
    <Card className="bg-card border-border flex-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Evolução dos Tempos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-45} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => secondsToTime(v)} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-xs font-semibold text-foreground">{d.fullName}</p>
                    <p className="text-sm font-bold text-primary">{d.time}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="seconds" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={`hsl(var(--primary) / ${0.6 + (i % 2) * 0.4})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ImprovementChart({ diagnosticos }: { diagnosticos: DiagnosticoMelhoria[] }) {
  const data = diagnosticos
    .filter((d) => d.percentage > 0)
    .slice(0, 10)
    .map((d) => ({
      name: d.movement.replace('Burpee Broad Jump', 'BBJ').replace('Farmers Carry', 'Farmers').replace('Sandbag Lunges', 'Sandbag').replace('Wall Balls', 'WB'),
      fullName: d.movement,
      percentage: Number(d.percentage.toFixed(1)),
    }));

  return (
    <Card className="bg-card border-border flex-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Oportunidade de Ganho (%)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-45} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-xs font-semibold text-foreground">{d.fullName}</p>
                    <p className="text-sm font-bold text-primary">{d.percentage}%</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="percentage" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function DiagnosticCharts({ splits, diagnosticos }: Props) {
  if (splits.length === 0 && diagnosticos.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        Análise Gráfica
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {splits.length > 0 && <SplitsChart splits={splits} />}
        {diagnosticos.length > 0 && <ImprovementChart diagnosticos={diagnosticos} />}
      </div>
    </div>
  );
}
