/**
 * AdherenceCard
 * 
 * Visual de aderência semanal com:
 * - Progresso circular (% treinos)
 * - Indicadores por dia (seg-dom)
 * - Streak counter com ícone de fogo
 * - Mensagem motivacional
 */

import { motion } from 'framer-motion';
import { Flame, CheckCircle2, Circle } from 'lucide-react';
import { useAdherenceTracking } from '@/hooks/useAdherenceTracking';
import type { DayOfWeek } from '@/types/outlier';

const dayLabels: { key: DayOfWeek; label: string }[] = [
  { key: 'seg', label: 'S' },
  { key: 'ter', label: 'T' },
  { key: 'qua', label: 'Q' },
  { key: 'qui', label: 'Q' },
  { key: 'sex', label: 'S' },
  { key: 'sab', label: 'S' },
  { key: 'dom', label: 'D' },
];

function CircularProgress({ percentage }: { percentage: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        {/* Background circle */}
        <circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth="6"
        />
        {/* Progress circle */}
        <motion.circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl tracking-wide text-foreground">{percentage}%</span>
      </div>
    </div>
  );
}

export function AdherenceCard() {
  const adherence = useAdherenceTracking();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border bg-card p-5 md:p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <p className="font-display text-xs tracking-widest text-muted-foreground uppercase">
          Aderência Semanal
        </p>

        {/* Streak badge */}
        {adherence.streakWeeks > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.5 }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20"
          >
            <Flame className="w-3.5 h-3.5 text-destructive" />
            <span className="font-display text-xs tracking-wide text-destructive">
              {adherence.streakWeeks} {adherence.streakWeeks === 1 ? 'semana' : 'semanas'}
            </span>
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Circular progress */}
        <CircularProgress percentage={adherence.adherencePct} />

        {/* Right side: day indicators + stats */}
        <div className="flex-1">
          {/* Day dots */}
          <div className="flex items-center gap-1.5 mb-3">
            {dayLabels.map((day, i) => {
              const isCompleted = adherence.completedDays.includes(day.key);
              return (
                <motion.div
                  key={day.key}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="text-[9px] text-muted-foreground/60 font-medium">
                    {day.label}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/20" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Stats line */}
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-semibold">{adherence.completedThisWeek}</span>
            <span className="text-muted-foreground/60">/{adherence.scheduledThisWeek} treinos</span>
          </p>

          {/* Motivational */}
          <p className="text-xs text-muted-foreground/70 mt-1.5 italic">
            {adherence.motivationalMessage}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
