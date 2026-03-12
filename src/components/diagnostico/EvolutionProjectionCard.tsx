import { useState, useEffect, useMemo } from 'react';
import { Target, TrendingUp, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { calculateEvolutionTimeframe } from '@/utils/evolutionTimeframe';
import { timeToSeconds, secondsToTime } from './types';
import type { DiagnosticoMelhoria } from './types';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  finishTime: string | null;
  diagnosticos: DiagnosticoMelhoria[];
  athleteName?: string | null;
  division?: string | null;
  coachStyle?: string;
}

const TIER_COLORS: Record<string, string> = {
  Novato: 'bg-muted text-muted-foreground',
  Intermediário: 'bg-accent text-accent-foreground',
  Avançado: 'bg-primary/20 text-primary',
  Elite: 'bg-primary text-primary-foreground',
};

export default function EvolutionProjectionCard({ finishTime, diagnosticos, athleteName, division, coachStyle }: Props) {
  const [aiText, setAiText] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const currentSeconds = finishTime ? timeToSeconds(finishTime) : 0;
  const totalGap = diagnosticos.reduce((sum, d) => sum + (d.improvement_value || 0), 0);

  const evolution = useMemo(() => {
    if (currentSeconds <= 0 || totalGap <= 0) return null;
    return calculateEvolutionTimeframe(currentSeconds, totalGap);
  }, [currentSeconds, totalGap]);

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

  // Early returns AFTER all hooks
  if (!finishTime || diagnosticos.length === 0 || !evolution) return null;

  const { months, tierLabel, ratePerMonth, gapFormatted } = evolution;
  const oneMonthProgress = Math.min((ratePerMonth / totalGap) * 100, 100);

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

          {/* AI-generated message or loading */}
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
              🎯 A ciência do esporte projeta que a eliminação deste gap de{' '}
              <strong className="text-foreground">{gapFormatted}</strong> exigirá um ciclo de
              treinamento contínuo de aproximadamente{' '}
              <strong className="text-primary">{months} {months === 1 ? 'mês' : 'meses'}</strong>.
            </p>
          )}

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Ganho mensal: {ratePerMonth}s/mês
              </span>
              <span>~{months} {months === 1 ? 'mês' : 'meses'} para meta</span>
            </div>
            <Progress value={oneMonthProgress} className="h-2" />
            <p className="text-[11px] text-muted-foreground text-center">
              Cada mês representa ~{Math.round(oneMonthProgress)}% do gap total
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
