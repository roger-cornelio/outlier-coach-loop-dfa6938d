import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, TrendingUp, Target, Calendar, Activity, Trophy, Clock, User, ChevronDown, Info } from 'lucide-react';
import { useState } from 'react';
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
import { getScoreDescription, getScoreColorClass } from '@/utils/outlierScoring';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StatusExplainerModal } from '@/components/StatusExplainerModal';

// Gradient colors based on status
const STATUS_GRADIENTS: Record<AthleteStatus, string> = {
  open: 'from-purple-500 to-violet-400',
  pro: 'from-amber-500 to-yellow-400',
  elite: 'from-yellow-300 to-amber-300',
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
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (statusData.loading) {
    return (
      <div className="animate-pulse bg-secondary/50 rounded-lg h-32" />
    );
  }

  const gradient = STATUS_GRADIENTS[statusData.status];
  const hasEnoughData = statusData.benchmarksUsed > 0 || statusData.validatingCompetition;
  const isValidatedByCompetition = statusData.statusSource === 'prova_oficial';
  const { outlierScore } = statusData;

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
          <div className="flex items-center gap-2">
            <h2 className={`font-display text-2xl bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
              {LEVEL_NAMES[statusData.status]}
            </h2>
            <StatusExplainerModal />
          </div>
        </div>
        
        {/* Outlier Score Display */}
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-0.5">
            {outlierScore.isProvisional ? 'Score Provisório' : 'Score OUTLIER'}
          </p>
          <div className="flex items-baseline gap-1 justify-end">
            <span className={`text-3xl font-bold ${getScoreColorClass(outlierScore.score)}`}>
              {outlierScore.score}
            </span>
            <span className="text-muted-foreground text-sm">/100</span>
          </div>
          <p className={`text-xs ${getScoreColorClass(outlierScore.score)}`}>
            {getScoreDescription(outlierScore.score)}
          </p>
        </div>
      </div>

      {/* Score Ceiling Indicator (if official exists) */}
      {outlierScore.ceiling !== null && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-200">
            Teto definido por prova oficial: <span className="font-semibold">{outlierScore.ceiling}</span>
          </p>
        </div>
      )}

      {/* Age Bracket & Confidence Row */}
      <div className="flex items-center justify-between text-xs">
        {statusData.currentAgeBracket && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <User className="w-3 h-3" />
            <span>Faixa: {statusData.currentAgeBracket}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Confiança:</span>
          <span className={`font-medium ${CONFIDENCE_COLORS[statusData.confidence]}`}>
            {CONFIDENCE_LABELS[statusData.confidence]}
          </span>
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

      {/* Score Breakdown (Collapsible) */}
      {hasEnoughData && (
        <Collapsible open={showBreakdown} onOpenChange={setShowBreakdown}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1">
            <Info className="w-3 h-3" />
            <span>Ver detalhes do score</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-secondary/30 rounded-lg p-3 mt-2 space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Composição do Score</p>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-background/50 rounded p-2">
                  <p className="text-[10px] text-muted-foreground uppercase">Oficial</p>
                  <p className={`text-sm font-semibold ${
                    outlierScore.breakdown.officialAnchorScore !== null 
                      ? getScoreColorClass(outlierScore.breakdown.officialAnchorScore) 
                      : 'text-muted-foreground/50'
                  }`}>
                    {outlierScore.breakdown.officialAnchorScore ?? '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">40%</p>
                </div>
                
                <div className="bg-background/50 rounded p-2">
                  <p className="text-[10px] text-muted-foreground uppercase">Simulado</p>
                  <p className={`text-sm font-semibold ${
                    outlierScore.breakdown.simulatedScore !== null 
                      ? getScoreColorClass(outlierScore.breakdown.simulatedScore) 
                      : 'text-muted-foreground/50'
                  }`}>
                    {outlierScore.breakdown.simulatedScore ?? '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {outlierScore.isProvisional ? '70%' : '50%'}
                  </p>
                </div>
                
                <div className="bg-background/50 rounded p-2">
                  <p className="text-[10px] text-muted-foreground uppercase">Benchmarks</p>
                  <p className={`text-sm font-semibold ${
                    outlierScore.breakdown.benchmarkScore !== null 
                      ? getScoreColorClass(outlierScore.breakdown.benchmarkScore) 
                      : 'text-muted-foreground/50'
                  }`}>
                    {outlierScore.breakdown.benchmarkScore ?? '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {outlierScore.isProvisional ? '30%' : '10%'}
                  </p>
                </div>
              </div>
              
              {outlierScore.isProvisional && (
                <p className="text-[10px] text-amber-400 text-center mt-2">
                  ⚠️ Score provisório — registre uma prova oficial para fixar seu teto
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Level Classification Explanation */}
      <div className="text-xs text-muted-foreground/80 bg-secondary/30 rounded-lg px-3 py-2">
        <p>
          <strong>Status</strong> = onde você compete hoje. <strong>Score</strong> = quão perto do topo desse nível.
        </p>
      </div>

      {/* Progress Ruler */}
      {hasEnoughData ? (
        <>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso no nível</span>
              {statusData.nextStatus && !isValidatedByCompetition && (
                <span>Próximo: {LEVEL_NAMES[statusData.nextStatus]}</span>
              )}
            </div>
            
            <div className="relative h-3 bg-secondary/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${outlierScore.score}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${gradient} rounded-full`}
              />
              {/* Ceiling marker if exists */}
              {outlierScore.ceiling !== null && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-500"
                  style={{ left: `${outlierScore.ceiling}%` }}
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
