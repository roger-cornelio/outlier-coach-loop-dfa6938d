/**
 * PerformanceStatusCard
 * 
 * Card premium de status de performance — substitui a linha "Última prova / Top % / Evolução".
 * 
 * Regras anti-bug:
 * - Nunca exibe percentuais negativos ou > 100
 * - Esconde campos sem dados (nunca mostra "---" no UI final)
 * - Nunca inventa dados de backend
 * - Evolução: só exibe se diff >= 30s; caso contrário mostra CTA
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Timer, TrendingUp, Award, Target, ChevronRight } from 'lucide-react';
import { formatOfficialTime } from '@/utils/athleteStatusSystem';
import type { ScoreResult } from '@/utils/outlierScoring';
import { getScoreColorClass } from '@/utils/outlierScoring';
import { cn } from '@/lib/utils';
import type { AthleteStatus } from '@/types/outlier';
import type { AthleteGender } from '@/utils/athleteStatusSystem';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Formata segundos como "XmYs" (sem horas visíveis, ex: 72m15s) */
export function formatSecondsToXmYs(seconds: number): string {
  const abs = Math.abs(Math.round(seconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  if (m === 0) return `${s}s`;
  return `${m}m${s.toString().padStart(2, '0')}s`;
}

/** Parse de tempo (string "HH:MM:SS" ou "MM:SS" ou number) → segundos | null */
export function parseTimeToSeconds(input: string | number): number | null {
  if (typeof input === 'number') return Number.isFinite(input) && input > 0 ? input : null;
  if (typeof input !== 'string') return null;
  const parts = input.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

/**
 * Retorna o tempo alvo em segundos para o próximo nível acima do status atual.
 * Usa LEVEL_TOP_THRESHOLDS de athleteStatusSystem (em minutos).
 * Sem chamadas de rede.
 */
export function getEliteTargetSeconds(
  status: AthleteStatus | string,
  gender: AthleteGender | string
): { targetSeconds: number; targetLabel: string } | null {
  // Mapa status → próximo nível e threshold (minutos)
  const NEXT_LEVEL: Record<string, { label: string; minutesMasc: number; minutesFem: number }> = {
    open:  { label: 'PRO',   minutesMasc: 70,  minutesFem: 75  },
    pro:   { label: 'ELITE', minutesMasc: 66,  minutesFem: 70  },
    elite: { label: 'ELITE', minutesMasc: 66,  minutesFem: 70  },
  };

  const entry = NEXT_LEVEL[status as string];
  if (!entry) return null;

  const minutes = gender === 'feminino' ? entry.minutesFem : entry.minutesMasc;
  return { targetSeconds: minutes * 60, targetLabel: entry.label };
}

/** Safe top-percent: returns null if value is outside 1–99 */
function safeTopPercent(score: number): number | null {
  const top = Math.round(100 - score);
  if (top < 1 || top > 99) return null;
  return top;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface PerformanceStatusCardProps {
  outlierScore: ScoreResult;
  statusLabel: string;
  athleteCategory: string;
  validatingCompetition: {
    time_in_seconds: number;
    open_equivalent_seconds: number;
    event_date?: string | null;
    event_name?: string | null;
  } | null;
  previousCompetition?: { time_in_seconds: number } | null;
  eliteTargetSeconds?: number | null;
  eliteTargetLabel?: string | null;
  raceCount?: number;
  className?: string;
  hideStatusChip?: boolean;
  onImportRace?: () => void;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

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

// ─── CTA Chip ────────────────────────────────────────────────────────────────

function CtaChip({
  label,
  ctaText,
  delay = 0,
  onClick,
}: {
  label: string;
  ctaText: string;
  delay?: number;
  onClick?: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      onClick={onClick}
      className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-muted/10 border border-border/20 w-full text-left hover:bg-muted/30 transition-colors group"
    >
      <TrendingUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground shrink-0 leading-tight">{label}</span>
      <span className="ml-auto text-[11px] font-semibold text-primary flex items-center gap-0.5 group-hover:gap-1 transition-all whitespace-nowrap">
        {ctaText}
        <ChevronRight className="w-3 h-3" />
      </span>
    </motion.button>
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
  eliteTargetLabel,
  raceCount = 0,
  className,
  hideStatusChip = false,
  onImportRace,
}: PerformanceStatusCardProps) {
  const topPercent = safeTopPercent(outlierScore.score);
  const scoreColorClass = getScoreColorClass(outlierScore.score);

  const lastRaceFormatted = useMemo(() => {
    if (!validatingCompetition?.time_in_seconds) return null;
    return formatOfficialTime(validatingCompetition.time_in_seconds);
  }, [validatingCompetition]);

  /** Delta vs elite target */
  const eliteDelta = useMemo(() => {
    if (!eliteTargetSeconds || !validatingCompetition?.time_in_seconds) return null;
    const delta = validatingCompetition.time_in_seconds - eliteTargetSeconds;
    if (!Number.isFinite(delta) || Math.abs(delta) > 7200) return null;
    return delta;
  }, [eliteTargetSeconds, validatingCompetition]);

  const eliteTargetFormatted = useMemo(() => {
    if (!eliteTargetSeconds || eliteTargetSeconds <= 0) return null;
    return formatOfficialTime(eliteTargetSeconds);
  }, [eliteTargetSeconds]);

  /** Evolution delta vs previous race — only if |diff| >= 30s */
  const evolutionDelta = useMemo(() => {
    if (!validatingCompetition?.time_in_seconds || !previousCompetition?.time_in_seconds) return null;
    const delta = validatingCompetition.time_in_seconds - previousCompetition.time_in_seconds;
    if (!Number.isFinite(delta) || Math.abs(delta) > 3600) return null;
    if (Math.abs(delta) < 30) return null; // Diferença insignificante — não exibir
    return delta;
  }, [validatingCompetition, previousCompetition]);

  /** Decide if we should show the CTA instead */
  const showEvolutionCta = useMemo(() => {
    if (!validatingCompetition?.time_in_seconds) return false;
    if (previousCompetition?.time_in_seconds) return false; // Temos histórico
    return true; // Sem prova anterior → mostrar CTA
  }, [validatingCompetition, previousCompetition]);

  // ─── Build chips list ──────────────────────────────────────────────────────

  type ChipDef =
    | { kind: 'chip'; id: string; icon: React.ElementType; label: string; value: string; valueClass?: string }
    | { kind: 'cta'; id: string; label: string; ctaText: string };

  const items = useMemo<ChipDef[]>(() => {
    const list: ChipDef[] = [];

    // A. Status OUTLIER
    if (!hideStatusChip) {
      list.push({
        kind: 'chip',
        id: 'status',
        icon: Award,
        label: 'Status OUTLIER',
        value: topPercent !== null ? `${statusLabel} · Top ${topPercent}%` : statusLabel,
        valueClass: scoreColorClass,
      });
    }

    // B. Última prova
    if (lastRaceFormatted) {
      list.push({ kind: 'chip', id: 'lastRace', icon: Timer, label: 'Última prova', value: lastRaceFormatted });
    }

    // C. Meta Elite (só se calculável)
    if (eliteTargetFormatted && eliteDelta !== null) {
      const nextLabel = eliteTargetLabel || 'ELITE';
      if (eliteDelta <= 0) {
        list.push({
          kind: 'chip',
          id: 'elite',
          icon: Target,
          label: `Meta ${nextLabel}`,
          value: `Meta ${nextLabel} atingida ✔`,
          valueClass: 'text-emerald-400',
        });
      } else {
        const remaining = formatSecondsToXmYs(eliteDelta);
        list.push({
          kind: 'chip',
          id: 'elite',
          icon: Target,
          label: `Meta ${nextLabel}: ${eliteTargetFormatted}`,
          value: `Faltam ${remaining}`,
          valueClass: 'text-amber-400',
        });
      }
    }

    // D. Evolução (com regra de 30s)
    if (evolutionDelta !== null) {
      const improved = evolutionDelta < 0; // delta negativo = ficou mais rápido
      const absFormatted = formatSecondsToXmYs(Math.abs(evolutionDelta));
      list.push({
        kind: 'chip',
        id: 'evolution',
        icon: TrendingUp,
        label: 'Evolução',
        value: improved ? `↓ ${absFormatted} vs última prova` : `↑ ${absFormatted} vs última prova`,
        valueClass: improved ? 'text-emerald-400' : 'text-amber-400',
      });
    } else if (showEvolutionCta) {
      // E. CTA — sem histórico de provas
      const ctaLabel =
        raceCount <= 1
          ? 'Evolução disponível após próxima prova'
          : 'Compare sua evolução';
      list.push({
        kind: 'cta',
        id: 'evolution-cta',
        label: ctaLabel,
        ctaText: 'Importar prova anterior',
      });
    }

    return list;
  }, [
    hideStatusChip, topPercent, statusLabel, scoreColorClass,
    lastRaceFormatted, eliteTargetFormatted, eliteDelta, eliteTargetLabel,
    evolutionDelta, showEvolutionCta, raceCount,
  ]);

  if (items.length === 0) return null;

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
        {items.map((item, i) => {
          if (item.kind === 'cta') {
            return (
              <CtaChip
                key={item.id}
                label={item.label}
                ctaText={item.ctaText}
                delay={0.05 * i}
                onClick={onImportRace}
              />
            );
          }
          return (
            <Chip
              key={item.id}
              icon={item.icon}
              label={item.label}
              value={item.value}
              valueClass={item.valueClass}
              delay={0.05 * i}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
