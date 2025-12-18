import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import { useBenchmarkResults } from '@/hooks/useBenchmarkResults';
import { 
  calculateProgress, 
  LEVEL_THRESHOLDS, 
  formatScore, 
  getScoreColor, 
  getProgressGradient,
  type ProgressData 
} from '@/utils/progressSystem';
import type { AthleteLevel } from '@/types/outlier';

const LEVEL_DISPLAY: Record<AthleteLevel, { name: string; color: string }> = {
  iniciante: { name: 'Iniciante', color: 'text-emerald-500' },
  intermediario: { name: 'Intermediário', color: 'text-blue-500' },
  avancado: { name: 'Avançado', color: 'text-purple-500' },
  hyrox_pro: { name: 'HYROX PRO', color: 'text-amber-500' },
};

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
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span className="text-sm">Complete benchmarks para ver sua régua de progresso</span>
        </div>
      </div>
    );
  }

  const TrendIcon = progressData.recentTrend === 'improving' 
    ? TrendingUp 
    : progressData.recentTrend === 'declining' 
      ? TrendingDown 
      : Minus;

  const trendColor = progressData.recentTrend === 'improving'
    ? 'text-green-500'
    : progressData.recentTrend === 'declining'
      ? 'text-red-500'
      : 'text-muted-foreground';

  const currentLevelInfo = LEVEL_DISPLAY[progressData.currentLevel];
  const nextLevelInfo = progressData.nextLevel ? LEVEL_DISPLAY[progressData.nextLevel] : null;

  // Calculate marker positions on the ruler
  const thresholdMarkers = Object.entries(LEVEL_THRESHOLDS)
    .filter(([_, threshold]) => threshold < 100)
    .map(([level, threshold]) => ({
      level: level as AthleteLevel,
      threshold,
      position: threshold,
    }));

  return (
    <div className="card-elevated p-5 space-y-4">
      {/* Header with score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-display font-bold ${getScoreColor(progressData.globalScore)}`}>
            {formatScore(progressData.globalScore)}
          </div>
          <div className="text-xs text-muted-foreground">
            <div>Score Global</div>
            <div className="flex items-center gap-1">
              <TrendIcon className={`w-3 h-3 ${trendColor}`} />
              <span className={trendColor}>
                {progressData.recentTrend === 'improving' ? 'Subindo' : 
                 progressData.recentTrend === 'declining' ? 'Caindo' : 'Estável'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-sm font-medium ${currentLevelInfo.color}`}>
            {currentLevelInfo.name}
          </div>
          {nextLevelInfo && (
            <div className="text-xs text-muted-foreground">
              → {nextLevelInfo.name}
            </div>
          )}
        </div>
      </div>

      {/* Main Progress Ruler */}
      <div className="relative pt-6 pb-2">
        {/* Threshold markers */}
        {thresholdMarkers.map(({ level, threshold, position }) => (
          <div
            key={level}
            className="absolute top-0 transform -translate-x-1/2"
            style={{ left: `${position}%` }}
          >
            <div className="text-[10px] text-muted-foreground text-center whitespace-nowrap">
              {threshold}
            </div>
            <div className="w-px h-2 bg-border mx-auto" />
          </div>
        ))}

        {/* Ruler track */}
        <div className="relative h-4 bg-secondary/50 rounded-full overflow-visible">
          {/* Threshold lines on track */}
          {thresholdMarkers.map(({ level, threshold, position }) => (
            <div
              key={level}
              className="absolute top-0 bottom-0 w-px bg-border/50"
              style={{ left: `${position}%` }}
            />
          ))}
          
          {/* Progress fill */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progressData.globalScore)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getProgressGradient(progressData.globalScore)} rounded-full`}
          />

          {/* Current score marker */}
          <motion.div
            initial={{ left: 0 }}
            animate={{ left: `${Math.min(100, progressData.globalScore)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${getProgressGradient(progressData.globalScore)} border-2 border-background shadow-lg`} />
          </motion.div>
        </div>

        {/* Scale labels */}
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      {/* Progress to next level */}
      {progressData.nextLevel && (
        <div className="p-3 rounded-lg bg-secondary/30 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Para {LEVEL_DISPLAY[progressData.nextLevel].name}:</span>
            <span className="font-medium">
              {progressData.globalScore >= progressData.currentThreshold ? (
                <span className="text-green-500">Meta atingida!</span>
              ) : (
                <span>
                  Faltam <span className={getScoreColor(progressData.globalScore)}>
                    {formatScore(progressData.currentThreshold - progressData.globalScore)}
                  </span> pontos
                </span>
              )}
            </span>
          </div>
          
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressData.progressToNextLevel}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full"
            />
          </div>
        </div>
      )}

      {/* Consistency indicator */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
        <div className="flex items-center gap-2">
          {progressData.isConsistent ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          )}
          <span className="text-sm">Consistência</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">
            {formatScore(progressData.consistencyScore)}%
          </div>
          <div className="text-xs text-muted-foreground">
            (σ = {progressData.standardDeviation}%)
          </div>
        </div>
      </div>

      {/* Ready to advance banner */}
      {progressData.readyToAdvance && progressData.nextLevel && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-500" />
            <div>
              <span className="text-sm font-medium text-amber-500">
                Pronto para evoluir para {LEVEL_DISPLAY[progressData.nextLevel].name}!
              </span>
              <p className="text-xs text-muted-foreground">
                Score e consistência atingidos
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
        <span>{progressData.benchmarksUsed} benchmarks analisados</span>
        <span>Threshold atual: {progressData.currentThreshold}</span>
      </div>
    </div>
  );
}
