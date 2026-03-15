/**
 * FatigueIndexCard — "Resistência sob Fadiga"
 * Gráfico de linha das 8 runs + Gauge semicircular SVG
 * Conectado aos dados reais de tempos_splits
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { formatEvolutionTime } from '@/utils/evolutionUtils';
import { type Split, timeToSeconds } from '@/components/diagnostico/types';
import { Activity, Lock, Info, Zap } from 'lucide-react';
import { CardDescription } from '@/components/ui/card';

interface FatigueIndexCardProps {
  splits?: Split[];
}

function getFatigueColor(pct: number): { stroke: string; label: string; textClass: string } {
  if (pct <= 5) return { stroke: 'hsl(142, 71%, 45%)', label: 'Elite', textClass: 'text-emerald-500' };
  if (pct <= 12) return { stroke: 'hsl(38, 92%, 50%)', label: 'Moderada', textClass: 'text-amber-500' };
  return { stroke: 'hsl(0, 72%, 51%)', label: 'Crítica', textClass: 'text-red-500' };
}

function GaugeSVG({ percentage }: { percentage: number }) {
  // Gauge proporcional de 0 a 100
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const normalized = clampedPct / 100;
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

    const allRuns: { name: string; pace: number; label: string }[] = [];
    for (let i = 1; i <= 8; i++) {
      const split = splits.find(s => s.split_name === `Running ${i}`);
      if (split) {
        const sec = timeToSeconds(split.time);
        if (sec > 0) {
          allRuns.push({
            name: `Run ${i}`,
            pace: sec,
            label: formatEvolutionTime(sec),
          });
        }
      }
    }

    if (allRuns.length < 8) return null;

    // Runs 2-7: média de pace (exclui Run 1 = adrenalina, Run 8 = sprint final)
    const coreRuns = allRuns.filter(d =>
      ['Run 2', 'Run 3', 'Run 4', 'Run 5', 'Run 6', 'Run 7'].includes(d.name)
    );

    if (coreRuns.length < 6) return null;

    const bestPace = Math.min(...coreRuns.map(r => r.pace));
    const worstPace = Math.max(...coreRuns.map(r => r.pace));

    let variation = 0;
    if (bestPace > 0) {
      variation = ((worstPace - bestPace) / bestPace) * 100;
    }
    variation = Math.max(0, Number(variation.toFixed(1)));

    return { chartData: coreRuns, variation };
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
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-base">Resistência sob Fadiga</CardTitle>
          <Popover>
            <PopoverTrigger>
              <Info className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
            </PopoverTrigger>
            <PopoverContent className="w-80 text-sm border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" side="top">
              <p>
                O Índice de Quebra mede a <strong>variação entre o melhor e o pior pace</strong> nas <strong>Corridas 2 a 7</strong>.
              </p>
              <p className="mt-2 text-muted-foreground text-xs">
                *Excluímos a Corrida 1 (distorcida pela adrenalina da largada e diferenças de percurso) e a Corrida 8 (sprint final) para revelar a sua resistência real ao longo do "miolo" da prova.
              </p>
            </PopoverContent>
          </Popover>
        </div>
        <CardDescription>
          Degradação de pace nas corridas 2 a 7
        </CardDescription>
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
            Seu pace degrada <span className={`font-bold ${textClass}`}>{variation.toFixed(1)}%</span> entre 
            o melhor e o pior split nas Corridas 2 a 7. {variation > 12 
              ? 'Foco recomendado em resistência muscular e gestão de ritmo.' 
              : variation > 5 
                ? 'Fadiga moderada — há espaço para melhoria na consistência de pace.'
                : 'Excelente consistência de pace. Nível elite de gestão de fadiga.'}
          </p>
        </div>

        {/* Destaque educacional */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <p className="text-xs text-primary font-semibold leading-relaxed text-center">
            ⚡ Quanto menor o Índice de Quebra, mais consistente você é — e melhor será seu resultado final.
          </p>
        </div>

        {/* Bloco de Insight Outlier */}
        <div className="mt-2 bg-muted/30 border border-border/50 rounded-lg p-4 flex items-start gap-3">
          <div className="bg-primary/10 p-2 rounded-full shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">
              Filosofia de Elite
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Na HYROX, a consistência vence a velocidade cega. Este índice não julga o quão rápido você corre, mas o quão inabalável você se mantém sob fadiga extrema. Atletas de alta performance não têm picos de velocidade — eles têm a ausência de quebras.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
