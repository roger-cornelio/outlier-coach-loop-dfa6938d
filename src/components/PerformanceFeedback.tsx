import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import type { CoachStyle } from '@/types/outlier';
import { ArrowLeft, Home, Zap, Loader2, TrendingUp, TrendingDown, Minus, Send, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCoachLine } from '@/config/coachCopy';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useSaveSessionFeedback } from '@/hooks/useAthleteFeedbacks';
import { useAuth } from '@/hooks/useAuth';

function formatSecondsToMinSec(seconds: number): string {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function SessionSummary({ sessionBlockResults }: { sessionBlockResults: any[] }) {
  if (sessionBlockResults.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="card-elevated p-4 space-y-3"
    >
      <p className="font-display text-sm tracking-wide text-muted-foreground">RESUMO DA SESSÃO</p>
      <div className="space-y-1">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-border/50">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 flex-1">Bloco</span>
          <div className="flex items-center gap-2 sm:gap-4 text-[10px] uppercase tracking-wider text-muted-foreground/60">
            <span className="w-12 sm:w-14 text-right">Feito</span>
            <span className="w-12 sm:w-14 text-right">Esper.</span>
            <span className="w-14 sm:w-16 text-right">Diff</span>
          </div>
        </div>

        {sessionBlockResults.map((result, idx) => (
          <BlockRow key={result.blockId || idx} result={result} />
        ))}
      </div>
    </motion.div>
  );
}

function BlockRow({ result }: { result: any }) {
  const { blockTitle, format, timeInSeconds, estimatedTimeSeconds, reps, estimatedRounds, completed } = result;

  // AMRAP with rounds
  if (format === 'amrap' && reps != null && estimatedRounds != null && estimatedRounds > 0) {
    const diff = reps - estimatedRounds;
    const isPositive = diff > 0;
    const isNeutral = diff === 0;
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
        <p className="text-sm font-medium text-foreground truncate flex-1 min-w-0">{blockTitle}</p>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-xs text-foreground w-12 sm:w-14 text-right">{reps}r</span>
          <span className="text-xs text-muted-foreground w-12 sm:w-14 text-right">~{estimatedRounds}r</span>
          {isNeutral ? (
            <span className="text-xs text-muted-foreground w-14 sm:w-16 text-right">🎯</span>
          ) : (
            <span className={`text-xs font-semibold w-14 sm:w-16 text-right ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{diff}r
            </span>
          )}
        </div>
      </div>
    );
  }

  // Blocks with time recorded (FOR TIME, EMOM, strength, etc.)
  if (timeInSeconds && timeInSeconds > 0) {
    if (estimatedTimeSeconds && estimatedTimeSeconds > 0) {
      const diff = timeInSeconds - estimatedTimeSeconds;
      const isPositive = diff < -10; // faster = good
      const isNegative = diff > 10;
      return (
        <div className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
          <p className="text-sm font-medium text-foreground truncate flex-1 min-w-0">{blockTitle}</p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-foreground w-14 text-right">{formatSecondsToMinSec(timeInSeconds)}</span>
            <span className="text-xs text-muted-foreground w-14 text-right">{formatSecondsToMinSec(estimatedTimeSeconds)}</span>
            {!isPositive && !isNegative ? (
              <span className="text-xs text-muted-foreground w-16 text-right">—</span>
            ) : (
              <span className={`text-xs font-semibold w-16 text-right ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {diff < 0 ? '-' : '+'}{formatSecondsToMinSec(Math.abs(diff))}
              </span>
            )}
          </div>
        </div>
      );
    }
    // Time but no estimate
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
        <p className="text-sm font-medium text-foreground truncate flex-1 min-w-0">{blockTitle}</p>
        <div className="flex items-center gap-4">
          <span className="text-xs text-foreground w-14 text-right">{formatSecondsToMinSec(timeInSeconds)}</span>
          <span className="text-xs text-muted-foreground w-14 text-right">—</span>
          <span className="text-xs text-muted-foreground w-16 text-right">—</span>
        </div>
      </div>
    );
  }

  // EMOM / other — just "Concluído"
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
      <p className="text-sm font-medium text-foreground truncate flex-1 min-w-0">{blockTitle}</p>
      <span className="text-xs text-muted-foreground">Concluído ✓</span>
    </div>
  );
}

export function PerformanceFeedback() {
  const { selectedWorkout, athleteConfig, setCurrentView, sessionBlockResults, clearSessionBlockResults, sessionTotalSeconds, sessionEstimatedMinutes } = useOutlierStore();
  const { profile } = useAuth();
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [athleteComment, setAthleteComment] = useState('');
  const [commentSent, setCommentSent] = useState(false);
  const { saveFeedback, isSaving } = useSaveSessionFeedback();

  // Fetch AI-generated session feedback
  useEffect(() => {
    if (!selectedWorkout || !athleteConfig) {
      setIsLoading(false);
      return;
    }

    const fetchFeedback = async () => {
      setIsLoading(true);
      try {
        const blockSummaries = sessionBlockResults.map(r => ({
          title: r.blockTitle,
          type: r.blockType,
          format: r.format,
          completed: r.completed,
          timeInSeconds: r.timeInSeconds,
          estimatedTimeSeconds: r.estimatedTimeSeconds,
          reps: r.reps,
          estimatedRounds: r.estimatedRounds,
          structureDescription: r.structureDescription,
        }));

        const { data, error } = await supabase.functions.invoke('generate-performance-feedback', {
          body: {
            coachStyle: athleteConfig.coachStyle,
            gender: athleteConfig.sexo,
            sessionBlocks: blockSummaries,
            workoutDay: selectedWorkout.day,
            workoutStimulus: selectedWorkout.stimulus,
            totalBlocks: selectedWorkout.blocks.length,
            completedBlocks: sessionBlockResults.filter(r => r.completed).length,
            completed: true,
            workoutTitle: selectedWorkout.stimulus || selectedWorkout.day,
            workoutContent: '',
            athleteLevel: athleteConfig.planTier || 'open',
            sessionTotalSeconds: sessionTotalSeconds || undefined,
            sessionEstimatedMinutes: sessionEstimatedMinutes || undefined,
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

  const handleSendComment = async () => {
    if (!selectedWorkout) return;

    const blockResultsForDB = sessionBlockResults.map(r => ({
      blockTitle: r.blockTitle,
      blockType: r.blockType,
      format: r.format,
      completed: r.completed,
      timeInSeconds: r.timeInSeconds,
      estimatedTimeSeconds: r.estimatedTimeSeconds,
      reps: r.reps,
      estimatedRounds: r.estimatedRounds,
    }));

    const success = await saveFeedback({
      workoutDay: selectedWorkout.day,
      workoutStimulus: selectedWorkout.stimulus,
      blockResults: blockResultsForDB,
      athleteComment: athleteComment.trim() || undefined,
      aiFeedback: aiFeedback || undefined,
      coachProfileId: profile?.coach_id || null,
    });

    if (success) {
      setCommentSent(true);
    }
  };

  if (!selectedWorkout || !athleteConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Nenhum resultado para exibir</p>
      </div>
    );
  }

  const fallbackMessage = getCoachLine(athleteConfig.coachStyle, 'great');
  const feedbackMessage = aiFeedback || fallbackMessage;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoToDashboard}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-xl sm:text-2xl">FEEDBACK</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-3 sm:px-6 py-4 sm:py-8">
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
              {/* Session Total Time */}
              {sessionTotalSeconds != null && sessionTotalSeconds > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card-elevated p-5 text-center space-y-2"
                >
                  <p className="font-display text-xs tracking-[0.2em] text-muted-foreground">TEMPO TOTAL DA SESSÃO</p>
                  <p className="font-mono text-4xl font-bold text-foreground tabular-nums">
                    {(() => {
                      const h = Math.floor(sessionTotalSeconds / 3600);
                      const m = Math.floor((sessionTotalSeconds % 3600) / 60);
                      const s = sessionTotalSeconds % 60;
                      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                    })()}
                  </p>
                  {sessionEstimatedMinutes != null && sessionEstimatedMinutes > 0 && (() => {
                    const realMin = Math.round(sessionTotalSeconds / 60);
                    const diff = realMin - sessionEstimatedMinutes;
                    const absDiff = Math.abs(diff);
                    return (
                      <p className="text-sm text-muted-foreground">
                        Estimado: {sessionEstimatedMinutes}min
                        {absDiff >= 2 && (
                          <span className={`ml-2 font-semibold ${diff < 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ({diff > 0 ? '+' : '-'}{absDiff}min)
                          </span>
                        )}
                      </p>
                    );
                  })()}
                </motion.div>
              )}

              {/* Session Summary */}
              <SessionSummary sessionBlockResults={sessionBlockResults} />

              {/* Coach Feedback */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card-elevated p-4 sm:p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-primary" />
                  <p className="text-sm font-display text-muted-foreground">COACH {athleteConfig.coachStyle}</p>
                </div>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {feedbackMessage}
                </p>
              </motion.div>

              {/* Athlete comment box */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="card-elevated p-4 space-y-3"
              >
                <p className="text-sm font-display text-muted-foreground">RECADO PRO COACH</p>
                {commentSent ? (
                  <div className="flex items-center gap-2 py-4 justify-center text-green-500">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">Feedback enviado!</span>
                  </div>
                ) : (
                  <>
                    <Textarea
                      placeholder="Como foi o treino? Deixe um recado pro seu coach..."
                      value={athleteComment}
                      onChange={(e) => setAthleteComment(e.target.value)}
                      className="min-h-[80px] bg-background/50 resize-none"
                      maxLength={500}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleSendComment}
                        disabled={isSaving}
                        className="flex items-center gap-1.5"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Enviar
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex gap-4"
              >
                <button
                  onClick={handleGoToDashboard}
                  className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-lg bg-primary text-primary-foreground font-display text-base sm:text-lg hover:opacity-90 transition-opacity"
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
