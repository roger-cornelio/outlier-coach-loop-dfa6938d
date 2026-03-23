/**
 * WeeklySummaryCard
 * 
 * Card de resumo semanal exibido no dashboard toda segunda-feira.
 * Mostra treinos completados, tempo total e tendência de evolução.
 */

import { motion } from 'framer-motion';
import { X, CheckCircle2, Clock, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { useWeeklySummary } from '@/hooks/useWeeklySummary';

const trendConfig = {
  improving: {
    icon: TrendingUp,
    label: 'Em evolução',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  stable: {
    icon: Minus,
    label: 'Estável',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  declining: {
    icon: TrendingDown,
    label: 'Atenção',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
};

export function WeeklySummaryCard() {
  const { summary, showSummary, dismiss } = useWeeklySummary();

  if (!showSummary || !summary) return null;

  const trend = trendConfig[summary.evolutionTrend];
  const TrendIcon = trend.icon;
  const completionPct = Math.round((summary.completedCount / summary.totalDays) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative rounded-2xl border border-primary/20 bg-card p-5 md:p-6 shadow-lg shadow-primary/5 overflow-hidden"
    >
      {/* Background accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Dismiss button */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/80 transition-colors"
        aria-label="Fechar resumo"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-primary/10">
          <Calendar className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-display text-xs tracking-widest text-muted-foreground uppercase">Resumo Semanal</p>
          <p className="text-[10px] text-muted-foreground/60">{summary.weekLabel}</p>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Treinos completados */}
        <div className="flex flex-col items-center p-3 rounded-xl bg-secondary/50 border border-border/30">
          <CheckCircle2 className="w-5 h-5 text-primary mb-1.5" />
          <span className="font-display text-2xl tracking-wide text-foreground">
            {summary.completedCount}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            treinos
          </span>
          {/* Mini progress bar */}
          <div className="w-full h-1 rounded-full bg-secondary mt-2">
            <div
              className="h-1 rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(completionPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Tempo total */}
        <div className="flex flex-col items-center p-3 rounded-xl bg-secondary/50 border border-border/30">
          <Clock className="w-5 h-5 text-primary mb-1.5" />
          <span className="font-display text-2xl tracking-wide text-foreground">
            {summary.totalMinutes > 0 ? summary.totalMinutes : '—'}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            minutos
          </span>
        </div>

        {/* Tendência */}
        <div className="flex flex-col items-center p-3 rounded-xl bg-secondary/50 border border-border/30">
          <div className={`p-1 rounded-lg ${trend.bg} mb-0.5`}>
            <TrendIcon className={`w-4 h-4 ${trend.color}`} />
          </div>
          <span className={`font-display text-xs tracking-wide ${trend.color} mt-1`}>
            {trend.label}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            evolução
          </span>
        </div>
      </div>

      {/* Motivational footer */}
      <p className="text-xs text-muted-foreground/70 text-center mt-4 italic">
        {summary.completedCount >= 5
          ? 'Semana forte. Consistência gera resultado.'
          : summary.completedCount >= 3
          ? 'Boa semana. Continue evoluindo.'
          : summary.completedCount > 0
          ? 'Cada treino conta. Mantenha o ritmo.'
          : 'Nova semana, nova oportunidade. Bora treinar.'}
      </p>
    </motion.div>
  );
}
