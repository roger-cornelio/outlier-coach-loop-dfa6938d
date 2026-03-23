import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import type { CoachStyle } from '@/types/outlier';
import { ArrowLeft, Home, Settings, Zap, Loader2, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCoachLine } from '@/config/coachCopy';

export function PerformanceFeedback() {
  const { selectedWorkout, athleteConfig, setCurrentView, sessionBlockResults, clearSessionBlockResults } = useOutlierStore();
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch AI-generated session feedback
  useEffect(() => {
    if (!selectedWorkout || !athleteConfig) {
      setIsLoading(false);
      return;
    }

    const fetchFeedback = async () => {
      setIsLoading(true);
      try {
        // Build block summaries for the AI
        const blockSummaries = sessionBlockResults.map(r => ({
          title: r.blockTitle,
          type: r.blockType,
          format: r.format,
          completed: r.completed,
          timeInSeconds: r.timeInSeconds,
          estimatedTimeSeconds: r.estimatedTimeSeconds,
          reps: r.reps,
          structureDescription: r.structureDescription,
        }));

        const { data, error } = await supabase.functions.invoke('generate-performance-feedback', {
          body: {
            coachStyle: athleteConfig.coachStyle,
            gender: athleteConfig.sexo,
            // New multi-block payload
            sessionBlocks: blockSummaries,
            workoutDay: selectedWorkout.day,
            workoutStimulus: selectedWorkout.stimulus,
            totalBlocks: selectedWorkout.blocks.length,
            completedBlocks: sessionBlockResults.filter(r => r.completed).length,
            // Legacy fields for backward compatibility
            completed: true,
            workoutTitle: selectedWorkout.stimulus || selectedWorkout.day,
            workoutContent: '',
            athleteLevel: athleteConfig.planTier || 'open',
          },
        });

        if (error) {
          console.error('Error fetching feedback:', error);
          setAiFeedback(null);
        } else {
          setAiFeedback(data.feedback);
        }
      } catch (err) {
        console.error('Error:', err);
        setAiFeedback(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedback();
  }, [selectedWorkout, athleteConfig, sessionBlockResults]);

  const handleGoToDashboard = () => {
    clearSessionBlockResults();
    setCurrentView('dashboard');
  };

  if (!selectedWorkout || !athleteConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Nenhum resultado para exibir</p>
      </div>
    );
  }

  const fallbackMessage = getCoachLine(athleteConfig.coachStyle, 'completion');
  const feedbackMessage = aiFeedback || fallbackMessage;

  // Compute per-block summary display
  const blocksWithTime = sessionBlockResults.filter(r => r.timeInSeconds && r.estimatedTimeSeconds);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoToDashboard}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-2xl">FEEDBACK</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-md mx-auto">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-20"
            >
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Analisando sua sessão...</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Session Summary */}
              {sessionBlockResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="card-elevated p-4 space-y-3"
                >
                  <p className="font-display text-sm tracking-wide text-muted-foreground">RESUMO DA SESSÃO</p>
                  <div className="space-y-2">
                    {sessionBlockResults.map((result, idx) => (
                      <div key={result.blockId} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{result.blockTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {result.format === 'amrap' && result.reps && `${result.reps} rounds/reps`}
                            {result.format === 'for_time' && result.timeInSeconds && formatSecondsToMinSec(result.timeInSeconds)}
                            {result.format === 'emom' && 'Concluído'}
                            {result.format === 'strength' && 'Concluído'}
                            {!result.timeInSeconds && !result.reps && result.format !== 'emom' && result.format !== 'strength' && 'Concluído'}
                          </p>
                        </div>
                        {result.timeInSeconds && result.estimatedTimeSeconds && result.estimatedTimeSeconds > 0 && (
                          <div className="flex items-center gap-1.5 ml-3">
                            {result.timeInSeconds < result.estimatedTimeSeconds - 10 ? (
                              <>
                                <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-xs font-medium text-emerald-500">
                                  -{formatSecondsToMinSec(result.estimatedTimeSeconds - result.timeInSeconds)}
                                </span>
                              </>
                            ) : result.timeInSeconds > result.estimatedTimeSeconds + 10 ? (
                              <>
                                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs font-medium text-amber-500">
                                  +{formatSecondsToMinSec(result.timeInSeconds - result.estimatedTimeSeconds)}
                                </span>
                              </>
                            ) : (
                              <>
                                <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">no tempo</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Coach Feedback */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card-elevated p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-primary" />
                  <p className="text-sm font-display text-muted-foreground">COACH {athleteConfig.coachStyle}</p>
                </div>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {feedbackMessage}
                </p>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex gap-4"
              >
                <button
                  onClick={handleGoToDashboard}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-primary text-primary-foreground font-display text-lg hover:opacity-90 transition-opacity"
                >
                  <Home className="w-5 h-5" />
                  DASHBOARD
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

function formatSecondsToMinSec(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
