import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, ArrowRight, TrendingUp, Calendar, Target } from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import { useBenchmarkResults } from '@/hooks/useBenchmarkResults';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { 
  calculateProgress, 
  getProgressGradient,
  MIN_STRONG_WEEKS,
  type ProgressData 
} from '@/utils/progressSystem';
import type { AthleteLevel } from '@/types/outlier';

const LEVEL_DISPLAY: Record<AthleteLevel, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  hyrox_pro: 'HYROX PRO',
};

interface ValidationStatus {
  label: string;
  ok: boolean;
  detail: string;
}

function getValidationStatus(data: ProgressData): ValidationStatus[] {
  const { levelValidation } = data;
  
  return [
    {
      label: 'Score',
      ok: levelValidation.meetsThreshold,
      detail: levelValidation.meetsThreshold 
        ? `${data.rulerScore}/${data.currentThreshold}` 
        : `Faltam ${Math.ceil(data.currentThreshold - data.rulerScore)} pts`,
    },
    {
      label: 'Constância',
      ok: levelValidation.meetsConsistency,
      detail: levelValidation.meetsConsistency 
        ? 'Variação baixa' 
        : 'Reduza variação',
    },
    {
      label: 'Semanas STRONG+',
      ok: levelValidation.meetsWeeklyStrong,
      detail: `${levelValidation.weeksWithStrongPlus}/${MIN_STRONG_WEEKS} semanas`,
    },
  ];
}

function getNextStepRecommendation(data: ProgressData): string {
  if (data.isReadyToAdvance && data.nextLevel) {
    return `Você validou todos os critérios para ${LEVEL_DISPLAY[data.nextLevel]}!`;
  }
  
  switch (data.blockingReason) {
    case 'threshold':
      return `Eleve seu score em ${Math.ceil(data.currentThreshold - data.rulerScore)} pontos com benchmarks STRONG ou ELITE.`;
    case 'consistency':
      return 'Mantenha performance estável nos próximos benchmarks para validar constância.';
    case 'weekly_validation':
      const weeksNeeded = MIN_STRONG_WEEKS - data.levelValidation.weeksWithStrongPlus;
      return `Mantenha STRONG+ por mais ${weeksNeeded} semana${weeksNeeded > 1 ? 's' : ''} para validar o nível.`;
    default:
      return 'Continue treinando para consolidar seu progresso.';
  }
}

export function ProgressRuler() {
  const { athleteConfig } = useOutlierStore();
  const { results, loading } = useBenchmarkResults();
  const { status } = useAthleteStatus();

  const progressData = useMemo<ProgressData | null>(() => {
    if (!status) return null;
    return calculateProgress(results, status);
  }, [results, status]);

  if (loading || !progressData || !athleteConfig) {
    return null;
  }

  if (progressData.benchmarksUsed === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          Complete seu primeiro benchmark para ver seu progresso
        </p>
      </div>
    );
  }

  const validationStatus = getValidationStatus(progressData);
  const nextStep = getNextStepRecommendation(progressData);
  const nextLevelName = progressData.nextLevel ? LEVEL_DISPLAY[progressData.nextLevel] : null;

  return (
    <div className="space-y-5">
      {/* Main Progress Ruler */}
      <div className="text-center space-y-3">
        {nextLevelName && (
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Régua de progresso para {nextLevelName}
          </p>
        )}
        
        {/* Score display */}
        <div className="relative">
          <div className={`text-5xl font-display font-bold bg-gradient-to-r ${getProgressGradient(progressData.rulerScore)} bg-clip-text text-transparent`}>
            {Math.round(progressData.rulerScore)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            de {progressData.currentThreshold} para validar
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 bg-secondary/50 rounded-full overflow-hidden mx-auto max-w-xs">
          {/* Threshold marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-foreground/30 z-10"
            style={{ left: '100%' }}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progressData.progressToNextLevel, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getProgressGradient(progressData.rulerScore)} rounded-full`}
          />
        </div>
        
        {/* Ruler explanation */}
        <p className="text-xs text-muted-foreground/70">
          Cada benchmark STRONG/ELITE aumenta a régua
        </p>
      </div>

      {/* Validation Status */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide text-center">
          Validação de Nível
        </p>
        <div className="flex justify-center gap-4">
          {validationStatus.map((v) => (
            <div key={v.label} className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                {v.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
                <span className={`text-xs font-medium ${v.ok ? 'text-green-500' : 'text-amber-500'}`}>
                  {v.label}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {v.detail}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Next Step Recommendation */}
      <div className={`p-3 rounded-lg ${progressData.isReadyToAdvance 
        ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20' 
        : 'bg-secondary/30'}`}
      >
        <div className="flex items-start gap-2">
          {progressData.isReadyToAdvance ? (
            <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          ) : progressData.blockingReason === 'weekly_validation' ? (
            <Calendar className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          ) : progressData.blockingReason === 'threshold' ? (
            <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          ) : (
            <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          )}
          <p className={`text-sm ${progressData.isReadyToAdvance ? 'text-green-500 font-medium' : 'text-foreground'}`}>
            {nextStep}
          </p>
        </div>
      </div>
    </div>
  );
}
