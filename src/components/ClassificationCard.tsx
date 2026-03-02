/**
 * ClassificationCard — Shows OUTLIER level classification on athlete dashboard.
 * 
 * Displays: Level badge, gap %, time vs elite reference, action buttons.
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Flame, ChevronRight, Trophy, Target, TrendingUp } from 'lucide-react';
import { useOutlierClassification } from '@/hooks/useOutlierClassification';
import { formatGapPct, formatTimeDiff, getLevelColor, getLevelBgColor } from '@/utils/outlierClassification';
import { formatOfficialTime } from '@/utils/athleteStatusSystem';
import { Skeleton } from '@/components/ui/skeleton';

export function ClassificationCard() {
  const { classification, loading } = useOutlierClassification();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="rounded-xl bg-card/60 border border-border/30 p-4 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  if (!classification) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-primary/10 border border-primary/20 p-4 cursor-pointer hover:bg-primary/15 transition-colors"
        onClick={() => navigate('/importar-prova')}
      >
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Descubra seu nível OUTLIER</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Importe uma prova oficial para classificação automática
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-primary shrink-0" />
        </div>
      </motion.div>
    );
  }

  const { level, gap_pct, elite_adjusted_seconds } = classification;
  const levelColor = getLevelColor(level);
  const levelBg = getLevelBgColor(level);
  const isElite = level === 'ELITE';

  // Calculate athlete time from gap
  const athleteTime = Math.round(elite_adjusted_seconds * (1 + gap_pct));
  const timeDiff = formatTimeDiff(athleteTime, elite_adjusted_seconds);

  // Next target
  const nextTarget = level === 'OPEN' ? 'PRO' : level === 'PRO' ? 'ELITE' : null;
  const nextThresholdPct = level === 'OPEN' ? 15 : level === 'PRO' ? 5 : 0;
  const nextTargetTime = nextTarget
    ? Math.round(elite_adjusted_seconds * (1 + nextThresholdPct / 100))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${levelBg}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Flame className={`w-5 h-5 ${levelColor}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Seu nível OUTLIER
        </span>
      </div>

      {/* Level Badge */}
      <div className="flex items-baseline gap-3 mb-3">
        <span className={`font-display text-3xl font-black tracking-tight ${levelColor}`}>
          {level}
        </span>
        {!isElite && (
          <span className="text-sm text-muted-foreground">
            Gap: <span className="font-mono font-semibold text-foreground">{formatGapPct(gap_pct)}</span>
          </span>
        )}
      </div>

      {/* Time comparison */}
      <div className="flex items-center gap-4 mb-3 text-sm">
        <div>
          <span className="text-[10px] text-muted-foreground uppercase block">Seu tempo</span>
          <span className="font-mono font-bold text-foreground">{formatOfficialTime(athleteTime)}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground uppercase block">Elite categoria</span>
          <span className="font-mono font-bold text-foreground">{formatOfficialTime(elite_adjusted_seconds)}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground uppercase block">Diferença</span>
          <span className={`font-mono font-semibold ${gap_pct <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {timeDiff}
          </span>
        </div>
      </div>

      {/* Next target */}
      {nextTarget && nextTargetTime && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Target className="w-3.5 h-3.5" />
          <span>
            Próximo alvo: <span className="font-semibold text-foreground">{nextTarget}</span> — {formatOfficialTime(nextTargetTime)}
          </span>
        </div>
      )}

      {isElite && (
        <p className="text-xs text-yellow-400/80 mb-3 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" />
          Você está entre os atletas de elite da modalidade 🏆
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => navigate('/importar-prova')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium transition-colors"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Importar nova prova
        </button>
      </div>
    </motion.div>
  );
}
