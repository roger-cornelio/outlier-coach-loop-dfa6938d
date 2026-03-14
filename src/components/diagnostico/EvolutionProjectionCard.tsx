import { useState, useEffect, useMemo } from 'react';
import { Target, TrendingUp, Loader2, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  totalGapOverride?: number;
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

          {/* Metric boxes */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-foreground">{gapFormatted}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Gap total</div>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-primary">{ratePerMonth}s</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Ganho/mês</div>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-foreground flex items-center justify-center gap-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {months}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{months === 1 ? 'mês' : 'meses'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
