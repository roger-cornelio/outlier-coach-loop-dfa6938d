/**
 * FatigueIndexCard — "Resistência sob Fadiga"
 * Gráfico de linha das 8 runs + Gauge semicircular SVG
 * Conectado aos dados reais de tempos_splits
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatEvolutionTime } from '@/utils/evolutionUtils';
import { type Split, timeToSeconds } from '@/components/diagnostico/types';
import { Activity, Lock } from 'lucide-react';

interface FatigueIndexCardProps {
  splits?: Split[];
}

function getFatigueColor(pct: number): { stroke: string; label: string; textClass: string } {
  if (pct <= 5) return { stroke: 'hsl(142, 71%, 45%)', label: 'Elite', textClass: 'text-emerald-500' };
  if (pct <= 12) return { stroke: 'hsl(38, 92%, 50%)', label: 'Moderada', textClass: 'text-amber-500' };
  return { stroke: 'hsl(0, 72%, 51%)', label: 'Crítica', textClass: 'text-red-500' };
}

function GaugeSVG({ percentage }: { percentage: number }) {
  const clampedPct = Math.min(Math.max(percentage, 0), 30);
  const normalized = clampedPct / 30;
  const { stroke, label, textClass } = getFatigueColor(percentage);
  
  const radius = 60;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - normalized);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="160" height="95" viewBox="0 0 160 95">
        <path
          d="M 15 85 A 65 65 0 0 1 145 85"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.2"
        />
        <path
          d="M 15 85 A 65 65 0 0 1 145 85"
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000 ease-out"
        />
        <text x="80" y="70" textAnchor="middle" className="fill-foreground text-2xl font-bold" fontSize="24">
          {percentage.toFixed(1)}%
        </text>
        <text x="80" y="88" textAnchor="middle" className="fill-muted-foreground text-xs" fontSize="11">
          Índice de Quebra
        </text>
      </svg>
      <span className={`text-xs font-semibold ${textClass}`}>Fadiga {label}</span>
    </div>
  );
}

export function FatigueIndexCard({ splits }: FatigueIndexCardProps) {
  const runAnalysis = useMemo(() => {
    if (!splits || splits.length === 0) return null;

    const chartData: { name: string; pace: number; label: string }[] = [];
    for (let i = 1; i <= 8; i++) {
      const split = splits.find(s => s.split_name === `Running ${i}`);
      if (split) {
        const sec = timeToSeconds(split.time);
        if (sec > 0) {
          chartData.push({
            name: `Run ${i}`,
            pace: sec,
            label: formatEvolutionTime(sec),
          });
        }
      }
    }

    if (chartData.length < 8) return null;

    const run1 = chartData[0].pace;
    const middleRuns = chartData.slice(1, 7);
    const avgMiddle = middleRuns.reduce((a, b) => a + b.pace, 0) / middleRuns.length;
    const variation = Math.max(0, Number((((avgMiddle - run1) / run1) * 100).toFixed(1)));

    return { chartData, variation };
  }, [splits]);

  if (!runAnalysis) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/20">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Lock className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Aguardando dados de corrida completos. Conclua uma prova com todos os splits de corrida para gerar a análise de fadiga.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { chartData, variation } = runAnalysis;
  const { textClass } = getFatigueColor(variation);

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="w-5 h-5 text-amber-500" />
          Resistência sob Fadiga
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Análise da degradação de pace ao longo das 8 corridas
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <GaugeSVG percentage={variation} />
          <div className="flex-1 w-full h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fatigueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.15} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(v) => formatEvolutionTime(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [formatEvolutionTime(value), 'Pace']}
                />
                <Area
                  type="monotone"
                  dataKey="pace"
                  stroke="hsl(38, 92%, 50%)"
                  strokeWidth={2.5}
                  fill="url(#fatigueGradient)"
                  dot={{ r: 3, fill: 'hsl(38, 92%, 50%)', stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-muted/10 border border-border/10 rounded-lg p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Sua corrida quebra <span className={`font-bold ${textClass}`}>{variation.toFixed(1)}%</span> após 
            as estações de força. {variation > 12 
              ? 'Foco recomendado em resistência muscular e gestão de ritmo.' 
              : variation > 5 
                ? 'Fadiga moderada — há espaço para melhoria na consistência de pace.'
                : 'Excelente consistência de pace. Nível elite de gestão de fadiga.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
