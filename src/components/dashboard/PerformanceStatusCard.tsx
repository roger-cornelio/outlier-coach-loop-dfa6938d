/**
 * PerformanceStatusCard
 * 
 * Card premium de status de performance — substitui a linha "Última prova / Top % / Evolução".
 * 
 * Regras anti-bug:
 * - Nunca exibe percentuais negativos ou > 100
 * - Esconde campos sem dados (nunca mostra "---" no UI final)
 * - Nunca inventa dados de backend
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Timer, TrendingUp, Award, Target } from 'lucide-react';
import { formatOfficialTime } from '@/utils/athleteStatusSystem';
import type { ScoreResult } from '@/utils/outlierScoring';
import { getScoreColorClass } from '@/utils/outlierScoring';
import { cn } from '@/lib/utils';

// ─── Props ───────────────────────────────────────────────────────────────────

interface PerformanceStatusCardProps {
  /** Calculated Outlier score (0-10) + isProvisional flag */
  outlierScore: ScoreResult;
  /** Athlete status label, e.g. "HYROX PRO" */
  statusLabel: string;
  /** Category label, e.g. "HYROX PRO WOMEN" */
  athleteCategory: string;
  /** Most recent validating competition */
  validatingCompetition: {
    time_in_seconds: number;
    open_equivalent_seconds: number;
    event_date?: string | null;
    event_name?: string | null;
  } | null;
  /** Previous validating competition for delta (optional) */
  previousCompetition?: {
    time_in_seconds: number;
  } | null;
  /** Elite target time in seconds (optional) */
  eliteTargetSeconds?: number | null;
  /** Extra class name */
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a time delta in seconds to "+4m57s" or "−2m10s" */
function formatTimeDelta(deltaSec: number): { text: string; positive: boolean } {
  const abs = Math.abs(deltaSec);
  const m = Math.floor(abs / 60);
  const s = Math.round(abs % 60);
  const sign = deltaSec > 0 ? '+' : '−';
  const text = m > 0 ? `${sign}${m}m${s.toString().padStart(2, '0')}s` : `${sign}${s}s`;
  return { text, positive: deltaSec > 0 };
}

/** Safe top-percent: returns null if value is outside 1–99 */
function safeTopPercent(score: number): number | null {
  const top = Math.round(100 - score);
  if (top < 1 || top > 99) return null;
  return top;
}

// ─── Chip Row ─────────────────────────────────────────────────────────────────

function Chip({
  icon: Icon,
  label,
  value,
  valueClass,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueClass?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-muted/20 border border-border/20"
    >
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className={cn('ml-auto text-[11px] font-bold text-foreground', valueClass)}>
        {value}
      </span>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PerformanceStatusCard({
  outlierScore,
  statusLabel,
  athleteCategory,
  validatingCompetition,
  previousCompetition,
  eliteTargetSeconds,
  className,
}: PerformanceStatusCardProps) {
  const topPercent = safeTopPercent(outlierScore.score);
  const scoreColorClass = getScoreColorClass(outlierScore.score);

  const lastRaceFormatted = useMemo(() => {
    if (!validatingCompetition?.time_in_seconds) return null;
    return formatOfficialTime(validatingCompetition.time_in_seconds);
  }, [validatingCompetition]);

  /** Delta vs elite target — only show if meaningful */
  const eliteDelta = useMemo(() => {
    if (!eliteTargetSeconds || !validatingCompetition?.time_in_seconds) return null;
    const delta = validatingCompetition.time_in_seconds - eliteTargetSeconds;
    // Sanity: ignore insane deltas (> 2h or < -1h)
    if (Math.abs(delta) > 7200) return null;
    return delta;
  }, [eliteTargetSeconds, validatingCompetition]);

  const eliteTargetFormatted = useMemo(() => {
    if (!eliteTargetSeconds || eliteTargetSeconds <= 0) return null;
    return formatOfficialTime(eliteTargetSeconds);
  }, [eliteTargetSeconds]);

  /** Evolution delta vs previous race */
  const evolutionDelta = useMemo(() => {
    if (!validatingCompetition?.time_in_seconds || !previousCompetition?.time_in_seconds) return null;
    const delta = validatingCompetition.time_in_seconds - previousCompetition.time_in_seconds;
    // Negative delta = improvement (faster). Skip huge outliers.
    if (Math.abs(delta) > 3600) return null;
    return delta;
  }, [validatingCompetition, previousCompetition]);

  const chips: Array<{
    id: string;
    icon: React.ElementType;
    label: string;
    value: string;
    valueClass?: string;
  }> = [];

  // A. Status OUTLIER
  if (topPercent !== null) {
    chips.push({
      id: 'status',
      icon: Award,
      label: 'Status OUTLIER',
      value: `${statusLabel} · Top ${topPercent}%`,
      valueClass: scoreColorClass,
    });
  } else {
    chips.push({
      id: 'status',
      icon: Award,
      label: 'Status OUTLIER',
      value: statusLabel,
      valueClass: scoreColorClass,
    });
  }

  // B. Última prova
  if (lastRaceFormatted) {
    chips.push({
      id: 'lastRace',
      icon: Timer,
      label: 'Última prova',
      value: lastRaceFormatted,
    });
  }

  // C. Meta Elite (apenas se existir e delta calculável)
  if (eliteTargetFormatted && eliteDelta !== null) {
    const { text, positive } = formatTimeDelta(eliteDelta);
    chips.push({
      id: 'elite',
      icon: Target,
      label: `Meta Elite: ${eliteTargetFormatted}`,
      value: positive ? `faltam ${text}` : `${text} abaixo do corte`,
      valueClass: positive ? 'text-amber-400' : 'text-emerald-400',
    });
  }

  // D. Evolução desde a última
  if (evolutionDelta !== null) {
    const { text, positive } = formatTimeDelta(evolutionDelta);
    chips.push({
      id: 'evolution',
      icon: TrendingUp,
      label: 'Evolução',
      value: positive ? `${text} acima da última` : `${text} vs última prova`,
      valueClass: positive ? 'text-amber-400' : 'text-emerald-400',
    });
  }

  // Guard: se não há absolutamente nada a mostrar, não renderizar
  if (chips.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className={cn(
        'rounded-2xl border border-border/30 bg-gradient-to-br from-card/90 to-muted/20 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border/20">
        <Flame className="w-3.5 h-3.5 text-orange-500" fill="currentColor" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
          Status de Performance
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground/50 italic">
          Resumo para decidir o próximo passo
        </span>
      </div>

      {/* Chips Grid — 1col mobile, 2col desktop */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {chips.map((chip, i) => (
          <Chip
            key={chip.id}
            icon={chip.icon}
            label={chip.label}
            value={chip.value}
            valueClass={chip.valueClass}
            delay={0.05 * i}
          />
        ))}
      </div>
    </motion.div>
  );
}
