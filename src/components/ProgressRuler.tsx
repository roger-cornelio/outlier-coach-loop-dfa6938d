import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, ArrowRight, TrendingUp } from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import { useBenchmarkResults } from '@/hooks/useBenchmarkResults';
import { 
  calculateProgress, 
  formatScore, 
  getProgressGradient,
  type ProgressData 
} from '@/utils/progressSystem';
import type { AthleteLevel } from '@/types/outlier';

const LEVEL_DISPLAY: Record<AthleteLevel, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  hyrox_pro: 'HYROX PRO',
};

interface CriteriaStatus {
  label: string;
  ok: boolean;
  hint?: string;
}

function getCriteria(data: ProgressData): CriteriaStatus[] {
  return [
    {
      label: 'Performance',
      ok: data.globalScore >= data.currentThreshold * 0.85,
      hint: data.globalScore < data.currentThreshold * 0.85 
        ? 'Melhore seus tempos nos benchmarks' 
        : undefined,
    },
    {
      label: 'Constância',
      ok: data.isConsistent,
      hint: !data.isConsistent 
        ? 'Reduza a variação entre benchmarks' 
        : undefined,
    },
    {
      label: 'Volume',
      ok: data.benchmarksUsed >= 3,
      hint: data.benchmarksUsed < 3 
        ? 'Complete mais benchmarks' 
        : undefined,
    },
  ];
}

function getNextStepRecommendation(data: ProgressData): string {
  if (data.readyToAdvance) {
    return `Parabéns! Você está pronto para ${LEVEL_DISPLAY[data.nextLevel!]}.`;
  }
  
  if (data.benchmarksUsed < 3) {
    return `Complete ${3 - data.benchmarksUsed} benchmark${3 - data.benchmarksUsed > 1 ? 's' : ''} para validar seu progresso.`;
  }
  
  if (!data.isConsistent) {
    return 'Foque em manter performance consistente nos próximos treinos.';
  }
  
  const pointsNeeded = Math.ceil(data.currentThreshold - data.globalScore);
  if (pointsNeeded > 0) {
    return `Melhore ${pointsNeeded} pontos no score para atingir o threshold.`;
  }
  
  return 'Continue treinando para consolidar seu nível.';
}

export function ProgressRuler() {
  const { athleteConfig } = useOutlierStore();
  const { results, loading } = useBenchmarkResults();

  const progressData = useMemo<ProgressData | null>(() => {
    if (!athleteConfig?.level) return null;
    return calculateProgress(results, athleteConfig.level);
  }, [results, athleteConfig]);

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

  const criteria = getCriteria(progressData);
  const nextStep = getNextStepRecommendation(progressData);
  const nextLevelName = progressData.nextLevel ? LEVEL_DISPLAY[progressData.nextLevel] : null;

  return (
    <div className="space-y-5">
      {/* Main Progress Indicator */}
      <div className="text-center space-y-3">
        {nextLevelName && (
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Progresso para {nextLevelName}
          </p>
        )}
        
        <div className="relative">
          {/* Large percentage */}
          <div className={`text-5xl font-display font-bold bg-gradient-to-r ${getProgressGradient(progressData.globalScore)} bg-clip-text text-transparent`}>
            {Math.round(progressData.progressToNextLevel)}%
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 bg-secondary/50 rounded-full overflow-hidden mx-auto max-w-xs">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressData.progressToNextLevel}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getProgressGradient(progressData.globalScore)} rounded-full`}
          />
        </div>
      </div>

      {/* Criteria Status - Simple visual indicators */}
      <div className="flex justify-center gap-4">
        {criteria.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            {c.ok ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
            <span className={`text-xs ${c.ok ? 'text-muted-foreground' : 'text-amber-500'}`}>
              {c.label}
            </span>
          </div>
        ))}
      </div>

      {/* Next Step Recommendation */}
      <div className={`p-3 rounded-lg ${progressData.readyToAdvance 
        ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20' 
        : 'bg-secondary/30'}`}
      >
        <div className="flex items-start gap-2">
          {progressData.readyToAdvance ? (
            <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          ) : (
            <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          )}
          <p className={`text-sm ${progressData.readyToAdvance ? 'text-green-500 font-medium' : 'text-foreground'}`}>
            {nextStep}
          </p>
        </div>
      </div>
    </div>
  );
}
