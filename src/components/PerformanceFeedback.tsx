import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import type { PerformanceBucket, CoachStyle } from '@/types/outlier';
import { Flame, CheckCircle, AlertTriangle, XCircle, ArrowLeft, Home, Settings, Crown, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const bucketConfig: Record<PerformanceBucket, { icon: React.ReactNode; label: string; colorClass: string }> = {
  ELITE: {
    icon: <Crown className="w-12 h-12" />,
    label: 'ELITE',
    colorClass: 'text-status-excellent',
  },
  STRONG: {
    icon: <Flame className="w-12 h-12" />,
    label: 'STRONG',
    colorClass: 'text-status-good',
  },
  OK: {
    icon: <CheckCircle className="w-12 h-12" />,
    label: 'OK',
    colorClass: 'text-primary',
  },
  TOUGH: {
    icon: <AlertTriangle className="w-12 h-12" />,
    label: 'TOUGH',
    colorClass: 'text-status-attention',
  },
  DNF: {
    icon: <XCircle className="w-12 h-12" />,
    label: 'DNF',
    colorClass: 'text-status-below',
  },
};

// Fallback messages when AI is unavailable
const fallbackMessages: Record<CoachStyle, Record<PerformanceBucket, string>> = {
  IRON: {
    ELITE: 'Performance sólida. Você provou que está no caminho certo. Não relaxe.',
    STRONG: 'Você fez o que precisava ser feito. Agora é hora de superar.',
    OK: 'Aceitável. Mas aceitável não é o objetivo.',
    TOUGH: 'Treino pesado. Se você sobreviveu, está mais forte.',
    DNF: 'Você não terminou. Identifique onde perdeu e corrija.',
  },
  PULSE: {
    ELITE: 'Incrível! Você se superou hoje. Esse é o resultado de consistência e dedicação.',
    STRONG: 'Bom trabalho! Você está evoluindo no ritmo certo. Continue firme.',
    OK: 'Você completou, e isso já conta. O próximo vai ser melhor.',
    TOUGH: 'Dia difícil, mas você terminou. Isso já é uma vitória.',
    DNF: 'Nem todo dia é perfeito, e tudo bem. O importante é não desistir.',
  },
  SPARK: {
    ELITE: '🔥 BOOOOM! Você destruiu esse WOD! Isso sim é performance de outlier!',
    STRONG: 'Muito bom! 💪 Treino sólido, atleta! Você está no jogo!',
    OK: 'Check feito! 💪 Treino completado, é isso que importa.',
    TOUGH: 'Ufa 😅 treino puxado! Mas você passou por ele!',
    DNF: 'Dia complicado! Mas calma, campeão não é feito em um dia. 💫',
  },
};

export function PerformanceFeedback() {
  const { selectedWorkout, workoutResults, athleteConfig, setCurrentView } = useOutlierStore();
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiBucket, setAiBucket] = useState<PerformanceBucket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resultData = useMemo(() => {
    if (!selectedWorkout || !athleteConfig) return null;

    const mainWod = selectedWorkout.blocks.find((b) => b.isMainWod);
    if (!mainWod) return null;

    const latestResult = workoutResults
      .filter((r) => r.blockId === mainWod.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!latestResult) return null;

    // Get previous times for this workout (for historical comparison)
    const previousTimes = workoutResults
      .filter((r) => r.blockId === mainWod.id && r.timeInSeconds && r.completed)
      .map((r) => r.timeInSeconds!)
      .slice(0, 10);

    // Get effective target range based on athlete level
    const levelTargetRanges = mainWod.levelTargetRanges;
    const effectiveTargetRange = levelTargetRanges?.[athleteConfig.level] || mainWod.targetRange;

    return {
      mainWod,
      result: latestResult,
      previousTimes,
      isBenchmark: mainWod.isBenchmark,
      targetSeconds: mainWod.targetSeconds,
      targetRange: effectiveTargetRange,
      levelTargetRanges,
      wodType: mainWod.wodType,
      durationMinutes: mainWod.durationMinutes,
      referenceTime: mainWod.referenceTime?.[athleteConfig.level],
    };
  }, [selectedWorkout, workoutResults, athleteConfig]);

  // Fetch AI-generated feedback
  useEffect(() => {
    if (!resultData || !athleteConfig) {
      setIsLoading(false);
      return;
    }

    const fetchFeedback = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-performance-feedback', {
          body: {
            coachStyle: athleteConfig.coachStyle,
            gender: athleteConfig.sexo,
            completed: resultData.result.completed,
            timeInSeconds: resultData.result.timeInSeconds,
            targetSeconds: resultData.targetSeconds || resultData.referenceTime,
            targetRange: resultData.targetRange,
            isBenchmark: resultData.isBenchmark,
            wodType: resultData.wodType,
            durationMinutes: resultData.durationMinutes,
            workoutTitle: resultData.mainWod.title,
            workoutContent: resultData.mainWod.content,
            athleteLevel: athleteConfig.level,
            previousTimes: resultData.previousTimes,
          },
        });

        if (error) {
          console.error('Error fetching feedback:', error);
          // Use fallback
          setAiBucket(classifyPerformanceLocal(resultData));
          setAiFeedback(null);
        } else {
          setAiFeedback(data.feedback);
          setAiBucket(data.bucket as PerformanceBucket);
        }
      } catch (err) {
        console.error('Error:', err);
        setAiBucket(classifyPerformanceLocal(resultData));
        setAiFeedback(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedback();
  }, [resultData, athleteConfig]);

  // Local classification fallback
  function classifyPerformanceLocal(data: typeof resultData): PerformanceBucket {
    if (!data) return 'OK';
    if (!data.result.completed) return 'DNF';
    if (!data.result.timeInSeconds) return 'OK';

    // If we have a target range, use it
    if (data.targetRange && data.targetRange.min > 0 && data.targetRange.max > 0) {
      const mid = (data.targetRange.min + data.targetRange.max) / 2;
      if (data.result.timeInSeconds <= data.targetRange.min) return 'ELITE';
      if (data.result.timeInSeconds <= mid) return 'STRONG';
      if (data.result.timeInSeconds <= data.targetRange.max) return 'OK';
      return 'TOUGH';
    }

    // Fallback to single target
    const target = data.targetSeconds || data.referenceTime;
    if (target) {
      const ratio = data.result.timeInSeconds / target;
      if (ratio <= 0.85) return 'ELITE';
      if (ratio <= 0.95) return 'STRONG';
      if (ratio <= 1.10) return 'OK';
      return 'TOUGH';
    }

    return 'OK';
  }

  if (!resultData || !athleteConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Nenhum resultado para exibir</p>
      </div>
    );
  }

  const bucket = aiBucket || classifyPerformanceLocal(resultData);
  const config = bucketConfig[bucket];
  const feedbackMessage = aiFeedback || fallbackMessages[athleteConfig.coachStyle][bucket];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const targetTime = resultData.targetSeconds || resultData.referenceTime;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-2xl">FEEDBACK</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Analisando performance...</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center"
          >
            {/* Bucket Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className={`inline-flex p-6 rounded-full bg-secondary mb-6 ${config.colorClass}`}
            >
              {config.icon}
            </motion.div>

            {/* Bucket Label */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`font-display text-4xl mb-2 ${config.colorClass}`}
            >
              {config.label}
            </motion.h2>

            {/* Benchmark badge */}
            {resultData.isBenchmark && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mb-4"
              >
                <span className="px-3 py-1 text-xs font-bold bg-status-excellent/20 text-status-excellent rounded-full">
                  BENCHMARK WOD
                </span>
              </motion.div>
            )}

            {/* Time Comparison */}
            {resultData.result.timeInSeconds && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-6"
              >
                <p className="text-3xl font-display mb-1">{formatTime(resultData.result.timeInSeconds)}</p>
                {targetTime && (
                  <p className="text-muted-foreground text-sm">
                    {resultData.targetSeconds ? 'Tempo alvo' : 'Referência'}: {formatTime(targetTime)}
                    {resultData.result.timeInSeconds < targetTime && (
                      <span className="ml-2 text-status-good">
                        ({formatTime(targetTime - resultData.result.timeInSeconds)} mais rápido)
                      </span>
                    )}
                    {resultData.result.timeInSeconds > targetTime && (
                      <span className="ml-2 text-status-attention">
                        ({formatTime(resultData.result.timeInSeconds - targetTime)} mais lento)
                      </span>
                    )}
                  </p>
                )}
              </motion.div>
            )}

            {/* DNF indicator */}
            {!resultData.result.completed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-6"
              >
                <p className="text-lg text-status-below font-display">NÃO COMPLETOU</p>
              </motion.div>
            )}

            {/* Coach Feedback */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card-elevated p-6 mb-6 text-left"
            >
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {feedbackMessage}
              </p>
            </motion.div>

            {/* Coach Badge */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-muted-foreground mb-8 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Coach {athleteConfig.coachStyle}
            </motion.p>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex gap-4"
            >
              <button
                onClick={() => setCurrentView('dashboard')}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-primary text-primary-foreground font-display text-lg hover:opacity-90 transition-opacity"
              >
                <Home className="w-5 h-5" />
                DASHBOARD
              </button>
              <button
                onClick={() => setCurrentView('config')}
                className="px-6 py-4 rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
