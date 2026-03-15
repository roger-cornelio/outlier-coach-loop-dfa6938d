import { useState, useEffect, useMemo } from 'react';
import { Target, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { calculateEvolutionTimeframe } from '@/utils/evolutionTimeframe';
import { timeToSeconds, secondsToTime } from './types';
import type { DiagnosticoMelhoria } from './types';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Props {
  finishTime: string | null;
  diagnosticos: DiagnosticoMelhoria[];
  athleteName?: string | null;
  division?: string | null;
  coachStyle?: string;
  totalGapOverride?: number;
}

const TIER_COLORS: Record<string, string> = {
  Novato: 'bg-muted text-muted-foreground',
  Intermediário: 'bg-accent text-accent-foreground',
  Avançado: 'bg-primary/20 text-primary',
  Elite: 'bg-primary text-primary-foreground',
};

function formatSecondsToHHMMSS(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function buildProjectionData(currentSeconds: number, ratePerMonth: number) {
  const points = [];
  for (let month = 0; month <= 12; month++) {
    const projected = Math.max(3600, currentSeconds - (ratePerMonth * month));
    points.push({
      month: `M${month}`,
      tempo: Math.round(projected),
    });
  }
  return points;
}

export default function EvolutionProjectionCard({ finishTime, diagnosticos, athleteName, division, coachStyle, totalGapOverride }: Props) {
  const [aiText, setAiText] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const currentSeconds = finishTime ? timeToSeconds(finishTime) : 0;
  const totalGap = totalGapOverride ?? diagnosticos.reduce((sum, d) => sum + (d.improvement_value || 0), 0);

  const evolution = useMemo(() => {
    if (currentSeconds <= 0 || totalGap <= 0) return null;
    return calculateEvolutionTimeframe(currentSeconds, totalGap);
  }, [currentSeconds, totalGap]);

  const chartData = useMemo(() => {
    if (!evolution || currentSeconds <= 0) return [];
    return buildProjectionData(currentSeconds, evolution.ratePerMonth);
  }, [currentSeconds, evolution]);

  const targetSeconds = useMemo(() => {
    if (!evolution || currentSeconds <= 0) return 0;
    return Math.max(3600, currentSeconds - totalGap);
  }, [currentSeconds, totalGap, evolution]);

  const top3Gaps = useMemo(() => {
    return [...diagnosticos]
      .filter(d => d.improvement_value > 0)
      .sort((a, b) => b.improvement_value - a.improvement_value)
      .slice(0, 3)
      .map(d => ({ movement: d.movement, gap: secondsToTime(d.improvement_value) }));
  }, [diagnosticos]);

  useEffect(() => {
    if (!evolution || aiText || loadingAi) return;

    async function generateAiProjection() {
      setLoadingAi(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-evolution-projection', {
          body: {
            athlete_name: athleteName || 'Atleta',
            finish_time: finishTime,
            division: division || 'Open',
            gap_formatted: evolution!.gapFormatted,
            months: evolution!.months,
            rate_per_month: evolution!.ratePerMonth,
            tier_label: evolution!.tierLabel,
            top3_gaps: top3Gaps,
            coach_style: coachStyle || 'PULSE',
          },
        });

        if (error) {
          console.error('[EvolutionProjection] Edge function error:', error);
          return;
        }

        if (data?.texto) {
          setAiText(data.texto);
        }
      } catch (err) {
        console.error('[EvolutionProjection] Error generating AI text:', err);
      } finally {
        setLoadingAi(false);
      }
    }

    generateAiProjection();
  }, [finishTime, totalGap, coachStyle]);

  if (!finishTime || diagnosticos.length === 0 || !evolution) return null;

  const { tierLabel, ratePerMonth, gapFormatted } = evolution;

  const projectedAt12 = Math.max(3600, currentSeconds - (ratePerMonth * 12));
  const gainIn12 = currentSeconds - projectedAt12;
  const gainFormatted = (() => {
    const m = Math.floor(gainIn12 / 60);
    const s = Math.round(gainIn12 % 60);
    return s > 0 ? `${m}min ${s}s` : `${m} minutos`;
  })();
  const resultadoEsperado = formatSecondsToHHMMSS(projectedAt12);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="border-primary/20 bg-card">
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Projeção de Evolução</h3>
            </div>
            <Badge className={TIER_COLORS[tierLabel] || 'bg-muted text-muted-foreground'}>
              {tierLabel}
            </Badge>
          </div>

          {/* Copy / AI text */}
          {loadingAi ? (
            <div className="flex items-center gap-2 py-3 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Gerando projeção personalizada...</span>
            </div>
          ) : aiText ? (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {aiText}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              🎯 Com o método OUTLIER, baseado em fisiologia aplicada, essa é a evolução esperada nos próximos 12 meses
            </p>
          )}

          {/* 12-month evolution chart */}
          {chartData.length > 0 && (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="evolutionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val: number) => formatSecondsToHHMMSS(val)}
                    domain={['dataMin - 60', 'dataMax + 60']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatSecondsToHHMMSS(value), 'Tempo']}
                    labelFormatter={(label: string) => `Mês ${label.replace('M', '')}`}
                  />
                  {targetSeconds > 0 && (
                    <ReferenceLine
                      y={targetSeconds}
                      stroke="hsl(var(--primary))"
                      strokeDasharray="4 4"
                      opacity={0.6}
                      label={{
                        value: `Meta ${formatSecondsToHHMMSS(targetSeconds)}`,
                        fill: 'hsl(var(--primary))',
                        fontSize: 10,
                        position: 'right',
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="tempo"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#evolutionGradient)"
                    dot={{ fill: 'hsl(var(--primary))', r: 2 }}
                    activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Metric boxes */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-foreground">{resultadoEsperado}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Resultado esperado</div>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-primary">{ratePerMonth}s</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Ganho/mês</div>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-foreground">{gainFormatted}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Ganho em 12m</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
