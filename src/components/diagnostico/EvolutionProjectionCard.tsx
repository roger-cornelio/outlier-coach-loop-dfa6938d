import { Target, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { calculateEvolutionTimeframe } from '@/utils/evolutionTimeframe';
import { timeToSeconds } from './types';
import type { DiagnosticoMelhoria } from './types';
import { motion } from 'framer-motion';

interface Props {
  finishTime: string | null;
  diagnosticos: DiagnosticoMelhoria[];
}

const TIER_COLORS: Record<string, string> = {
  Novato: 'bg-muted text-muted-foreground',
  Intermediário: 'bg-accent text-accent-foreground',
  Avançado: 'bg-primary/20 text-primary',
  Elite: 'bg-primary text-primary-foreground',
};

export default function EvolutionProjectionCard({ finishTime, diagnosticos }: Props) {
  if (!finishTime || diagnosticos.length === 0) return null;

  const currentSeconds = timeToSeconds(finishTime);
  if (currentSeconds <= 0) return null;

  const totalGap = diagnosticos.reduce((sum, d) => sum + (d.improvement_value || 0), 0);
  if (totalGap <= 0) return null;

  const { months, tierLabel, ratePerMonth, gapFormatted } = calculateEvolutionTimeframe(currentSeconds, totalGap);

  // Progress bar: visualize how much 1 month covers of total gap (capped at 100)
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
              <h3 className="text-sm font-bold text-foreground">Projeção de Evolução</h3>
            </div>
            <Badge className={TIER_COLORS[tierLabel] || 'bg-muted text-muted-foreground'}>
              {tierLabel}
            </Badge>
          </div>

          {/* Main message */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            🎯 A ciência do esporte projeta que a eliminação deste gap de{' '}
            <strong className="text-foreground">{gapFormatted}</strong> exigirá um ciclo de
            treinamento contínuo de aproximadamente{' '}
            <strong className="text-primary">{months} {months === 1 ? 'mês' : 'meses'}</strong>.
          </p>

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
