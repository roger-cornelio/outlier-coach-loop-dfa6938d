import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, TrendingUp, Target, Calendar, Activity, Trophy, Clock, User } from 'lucide-react';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { LEVEL_NAMES, type AthleteStatus } from '@/types/outlier';
import { 
  CONFIDENCE_LABELS, 
  CONFIDENCE_COLORS,
  STATUS_SOURCE_LABELS,
  formatOfficialTime,
  getLevelScoreDescription,
  type StatusSource
} from '@/utils/athleteStatusSystem';

// Gradient colors based on status
const STATUS_GRADIENTS: Record<AthleteStatus, string> = {
  iniciante: 'from-blue-500 to-cyan-400',
  intermediario: 'from-green-500 to-emerald-400',
  avancado: 'from-orange-500 to-amber-400',
  hyrox_open: 'from-purple-500 to-pink-400',
  hyrox_pro: 'from-amber-500 to-yellow-400',
};

function getPromotionBlockerMessage(
  blocker: 'score' | 'consistency' | 'weeks' | 'prova_required' | null, 
  data: ReturnType<typeof useAthleteStatus>
): string {
  if (!blocker) return '';
  
  switch (blocker) {
    case 'score':
      // Score now is 0-100 within level, need ~80+ for promotion consideration
      const pointsNeeded = Math.max(0, Math.ceil(80 - data.rulerScore));
      return pointsNeeded > 0 ? `+${pointsNeeded} pts para promoção` : 'Mantenha a performance';
    case 'consistency':
      return 'Mantenha resultados estáveis';
    case 'weeks':
      const weeksNeeded = 2 - data.weeksWithGoodPerformance;
      return `+${weeksNeeded} semana${weeksNeeded > 1 ? 's' : ''} com STRONG+`;
    case 'prova_required':
      return 'Nova prova oficial para subir de nível';
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
  const hasEnoughData = statusData.benchmarksUsed > 0 || statusData.validatingCompetition;
  const isValidatedByCompetition = statusData.statusSource === 'prova_oficial';

  return (
    <div className="card-elevated p-5 space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {isValidatedByCompetition ? 'Status Validado' : 'Status Estimado'}
            </p>
            {isValidatedByCompetition && (
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
            )}
          </div>
          <h2 className={`font-display text-2xl bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {LEVEL_NAMES[statusData.status]}
          </h2>
        </div>
        
        {/* Age Bracket & Confidence */}
        <div className="text-right space-y-1">
          {statusData.currentAgeBracket && (
            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              <span>Faixa: {statusData.currentAgeBracket}</span>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Confiança</p>
            <span className={`text-sm font-medium ${CONFIDENCE_COLORS[statusData.confidence]}`}>
              {CONFIDENCE_LABELS[statusData.confidence]}
            </span>
          </div>
        </div>
      </div>

      {/* Validation Source Badge */}
      {isValidatedByCompetition && statusData.validatingCompetition && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-500 text-sm font-medium mb-1">
            <Trophy className="w-4 h-4" />
            <span>Prova Oficial</span>
            {statusData.validatingCompetition.race_category && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                statusData.validatingCompetition.race_category === 'PRO' 
                  ? 'bg-amber-500/20 text-amber-400' 
                  : 'bg-purple-500/20 text-purple-400'
              }`}>
                {statusData.validatingCompetition.race_category}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            {statusData.validatingCompetition.event_name && (
              <p>{statusData.validatingCompetition.event_name}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatOfficialTime(statusData.validatingCompetition.time_in_seconds)}
              </span>
              {statusData.validatingCompetition.race_category === 'PRO' && (
                <span className="text-amber-500/80">
                  (≈ {formatOfficialTime(statusData.validatingCompetition.open_equivalent_seconds)} Open-eq)
                </span>
              )}
              {statusData.validatingCompetition.event_date && (
                <span>
                  {new Date(statusData.validatingCompetition.event_date).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
            {/* Age at race info */}
            {statusData.validatingCompetition.ageAtRace && statusData.validatingCompetition.ageBracket && (
              <div className="flex items-center gap-1 mt-1">
                <User className="w-3 h-3" />
                <span>
                  Idade na prova: {statusData.validatingCompetition.ageAtRace} anos 
                  (Faixa {statusData.validatingCompetition.ageBracket})
                </span>
              </div>
            )}
            {/* Capped from PRO notice */}
            {statusData.validatingCompetition.cappedFromPro && statusData.validatingCompetition.cappedReason && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1 mt-2">
                <span className="text-blue-400 text-xs">
                  ℹ️ {statusData.validatingCompetition.cappedReason}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Level Classification Explanation */}
      <div className="text-xs text-muted-foreground/80 bg-secondary/30 rounded-lg px-3 py-2">
        <p>O nível indica a categoria em que você compete hoje, não sua colocação final.</p>
      </div>

      {/* Progress Ruler */}
      {hasEnoughData ? (
        <>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {isValidatedByCompetition ? 'Progresso no nível' : `Score: ${statusData.rulerScore}`}
              </span>
              {statusData.nextStatus && !isValidatedByCompetition && (
                <span>Próximo: {LEVEL_NAMES[statusData.nextStatus]}</span>
              )}
            </div>
            
            <div className="relative h-3 bg-secondary/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${isValidatedByCompetition ? statusData.progressInStatus : statusData.progressToNextStatus}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${gradient} rounded-full`}
              />
              {/* Threshold marker */}
              {!isValidatedByCompetition && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-foreground/30"
                  style={{ left: '100%' }}
                />
              )}
            </div>
          </div>

          {/* Validation Status */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1">
              {isValidatedByCompetition ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-500">
                    Nível validado por prova oficial
                  </span>
                </>
              ) : statusData.eligibleForPromotion ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-500">
                    Pronto para promoção!
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-muted-foreground">
                    {getPromotionBlockerMessage(statusData.promotionBlocker, statusData)}
                  </span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {statusData.benchmarksUsed} benchmarks
              </span>
              {!isValidatedByCompetition && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {statusData.weeksWithGoodPerformance} sem. STRONG+
                </span>
              )}
            </div>
          </div>

          {/* Historical Competitions Notice */}
          {statusData.historicalCompetitions.length > 0 && !isValidatedByCompetition && (
            <div className="bg-secondary/30 rounded-lg p-2 text-xs text-muted-foreground">
              <p>
                📜 {statusData.historicalCompetitions.length} prova(s) histórica(s) 
                ({'>'}18 meses) - apenas referência
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-4">
          <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Complete benchmarks ou registre uma prova oficial
          </p>
        </div>
      )}
    </div>
  );
}
