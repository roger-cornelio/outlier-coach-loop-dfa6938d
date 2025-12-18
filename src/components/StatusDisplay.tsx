import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, TrendingUp, Target, Calendar, Activity } from 'lucide-react';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { LEVEL_NAMES, type AthleteStatus } from '@/types/outlier';
import { 
  CONFIDENCE_LABELS, 
  CONFIDENCE_COLORS,
  STATUS_THRESHOLDS 
} from '@/utils/athleteStatusSystem';

// Gradient colors based on status
const STATUS_GRADIENTS: Record<AthleteStatus, string> = {
  iniciante: 'from-blue-500 to-cyan-400',
  intermediario: 'from-green-500 to-emerald-400',
  avancado: 'from-orange-500 to-amber-400',
  hyrox_pro: 'from-amber-500 to-yellow-400',
};

function getPromotionBlockerMessage(blocker: 'score' | 'consistency' | 'weeks' | null, data: ReturnType<typeof useAthleteStatus>): string {
  if (!blocker) return '';
  
  switch (blocker) {
    case 'score':
      const nextThreshold = data.nextStatus ? STATUS_THRESHOLDS[data.nextStatus].min + 5 : 100;
      const pointsNeeded = Math.ceil(nextThreshold - data.rulerScore);
      return `+${pointsNeeded} pts para promoção`;
    case 'consistency':
      return 'Mantenha resultados estáveis';
    case 'weeks':
      const weeksNeeded = 2 - data.weeksWithGoodPerformance;
      return `+${weeksNeeded} semana${weeksNeeded > 1 ? 's' : ''} com STRONG+`;
    default:
      return '';
  }
}

export function StatusDisplay() {
  const statusData = useAthleteStatus();

  if (statusData.loading) {
    return (
      <div className="animate-pulse bg-secondary/50 rounded-lg h-32" />
    );
  }

  const gradient = STATUS_GRADIENTS[statusData.status];
  const hasEnoughData = statusData.benchmarksUsed > 0;

  return (
    <div className="card-elevated p-5 space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Status Calculado
          </p>
          <h2 className={`font-display text-2xl bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {LEVEL_NAMES[statusData.status]}
          </h2>
        </div>
        
        {/* Confidence Badge */}
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">Confiança</p>
          <span className={`text-sm font-medium ${CONFIDENCE_COLORS[statusData.confidence]}`}>
            {CONFIDENCE_LABELS[statusData.confidence]}
          </span>
        </div>
      </div>

      {/* Progress Ruler */}
      {hasEnoughData ? (
        <>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Score: {statusData.rulerScore}</span>
              {statusData.nextStatus && (
                <span>Próximo: {LEVEL_NAMES[statusData.nextStatus]}</span>
              )}
            </div>
            
            <div className="relative h-3 bg-secondary/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${statusData.progressToNextStatus}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${gradient} rounded-full`}
              />
              {/* Threshold marker */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/30"
                style={{ left: '100%' }}
              />
            </div>
          </div>

          {/* Validation Status */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1">
              {statusData.eligibleForPromotion ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span className={statusData.eligibleForPromotion ? 'text-green-500' : 'text-muted-foreground'}>
                {statusData.eligibleForPromotion 
                  ? 'Pronto para promoção!' 
                  : getPromotionBlockerMessage(statusData.promotionBlocker, statusData)}
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {statusData.benchmarksUsed} benchmarks
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {statusData.weeksWithGoodPerformance} sem. STRONG+
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Complete benchmarks para calcular seu status
          </p>
        </div>
      )}
    </div>
  );
}
