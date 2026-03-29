/**
 * WeeklyTrainingView - Página dedicada para visualização do treino semanal
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { DAY_NAMES, type DayOfWeek } from '@/types/outlier';
import { Clock, Zap, ChevronRight, Flame, History, ArrowLeft, CheckCircle2, RefreshCw, MessageSquareText, Activity } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useAthletePlan } from '@/hooks/useAthletePlan';
import { WeekNavigator } from './WeekNavigator';
import { getBlockDisplayTitle, getBlockDisplayDataFromParsed } from '@/utils/blockDisplayUtils';
import { CategoryChip, StructureBadge, CommentSubBlock, ExerciseLine, IntensityBadge } from './DSLBlockRenderer';
import { estimateBlock, formatEstimatedTime, formatEstimatedKcal, getUserBiometrics } from '@/utils/workoutEstimation';
import { buildSemanticSummary } from '@/utils/workoutSemanticSummary';
import { computeBlockMetrics } from '@/utils/computeBlockKcalFromParsed';
import { identifyMainBlock } from '@/utils/mainBlockIdentifier';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';
import { UserHeader } from './UserHeader';
import { useWeekWorkoutCompletions } from '@/hooks/useWeekWorkoutCompletions';


const dayTabs: DayOfWeek[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

const blockTypeColors: Record<string, string> = {
  aquecimento: 'border-l-amber-500',
  conditioning: 'border-l-primary',
  forca: 'border-l-red-500',
  especifico: 'border-l-purple-500',
  core: 'border-l-blue-500',
  corrida: 'border-l-green-500',
  mobilidade: 'border-l-cyan-500',
  tecnica: 'border-l-indigo-500',
  notas: 'border-l-muted-foreground',
};

function formatRegisteredTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getPrecisionTier(pct: number) {
  if (pct >= 70) return { color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'Preciso', tip: 'Cálculo biomecânico com dados do exercício. Precisão superior a relógios esportivos.' };
  if (pct >= 50) return { color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30', label: 'Estimado', tip: 'Tempo detectado, calorias estimadas por METs. Para maior precisão, use formatos como AMRAP, FOR TIME ou EMOM.' };
  return { color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', label: 'Genérico', tip: 'Estimativa por heurística. Use formatos estruturados (AMRAP, FOR TIME) e defina duração no bloco para melhorar.' };
}

function PrecisionBadge({ confidencePercent }: { confidencePercent: number }) {
  if (confidencePercent <= 0) return null;
  const tier = getPrecisionTier(confidencePercent);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`ml-auto flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium transition-colors ${tier.bg} ${tier.color}`}>
          <Activity className="w-3 h-3" />
          {tier.label}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 text-xs">
        <p className="font-medium mb-1">{tier.label} ({confidencePercent}%)</p>
        <p className="text-muted-foreground">{tier.tip}</p>
      </PopoverContent>
    </Popover>
  );
}


export function WeeklyTrainingView() {
  const {
    setCurrentView,
    setSelectedWorkout,
    baseWorkouts,
    adaptedWorkouts,
    athleteConfig,
  } = useOutlierStore();
  
  const { user, profile } = useAuth();
  const { 
    workouts: planWorkouts,
    loading: loadingPlan,
    currentWeek,
    canNavigateToPast,
    canNavigateToFuture,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    isViewingHistory,
    refetch,
  } = useAthletePlan();

  const completions = useWeekWorkoutCompletions(currentWeek.start);

  const [activeDay, setActiveDay] = useState<DayOfWeek>(() => {
    const days: DayOfWeek[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const today = new Date().getDay();
    return days[today] || 'seg';
  });

  // Dados de conclusão do dia ativo
  const dayCompletion = completions.get(activeDay);
  const dayIsCompleted = !!dayCompletion?.completed;
  const dayTimeInSeconds = dayCompletion?.timeInSeconds;

  // FONTE ÚNICA: usar planWorkouts do useAthletePlan (filtrado por week_start)
  // Isso garante que cada semana mostra APENAS os treinos daquela semana
  const displayWorkouts = planWorkouts.length > 0 ? planWorkouts : [];
  const currentWorkout = displayWorkouts.find((w) => w.day === activeDay);
  const hasAnyWorkouts = displayWorkouts.length > 0;

  const biometrics = useMemo(() => getUserBiometrics(athleteConfig), [athleteConfig]);

  // Fonte única de verdade: métricas por bloco + totais agregados
  // O header soma EXATAMENTE os valores arredondados que cada card exibe
  const blockMetricsMap = useMemo(() => {
    if (!currentWorkout) return { perBlock: [] as Array<{ kcal: number; durationSec: number; visible: boolean; showStats: boolean; confidencePercent: number }>, totalTime: 0, totalCalories: 0 };
    
    let sumMinutes = 0;
    let sumKcal = 0;
    const perBlock: Array<{ kcal: number; durationSec: number; visible: boolean; showStats: boolean; confidencePercent: number }> = [];
    
    currentWorkout.blocks.forEach((block, index) => {
      const displayData = getBlockDisplayDataFromParsed(block);
      if (!displayData.hasContent) {
        perBlock.push({ kcal: 0, durationSec: 0, visible: false, showStats: false, confidencePercent: 0 });
        return;
      }
      
      if (block.type === 'notas') {
        perBlock.push({ kcal: 0, durationSec: 0, visible: true, showStats: false, confidencePercent: 0 });
        return;
      }
      
      let kcal = 0;
      let dur = 0;
      let confidencePercent = 0;
      
      const hasParsedData = block.parsedExercises && block.parsedExercises.length > 0 && block.parseStatus === 'completed';
      
      if (hasParsedData) {
        // Motor físico — cálculo biomecânico completo com biometria real
        const metrics = computeBlockMetrics(
          block.parsedExercises!,
          { pesoKg: biometrics.weightKg && biometrics.weightKg > 0 ? biometrics.weightKg : 75, sexo: biometrics.sex },
          block.content,
          block.title
        );
        kcal = metrics.estimatedKcal || 0;
        dur = metrics.estimatedDurationSec || 0;
        confidencePercent = (dur > 0 && kcal > 0) ? 90 : 60;
      } else {
        // Fallback MET — usa biometria REAL do atleta (peso, sexo, nível)
        const blockEst = estimateBlock(block, biometrics, (athleteConfig?.trainingLevel as any) || 'open');
        dur = (blockEst.estimatedMinutes || 0) * 60;
        kcal = blockEst.estimatedKcal || 0;
        confidencePercent = blockEst.confidencePercent || 45;
      }
      
      const roundedMinutes = Math.round(dur / 60);
      const roundedKcal = Math.round(kcal);
      
      perBlock.push({ kcal: roundedKcal, durationSec: dur, visible: true, showStats: roundedMinutes > 0 || roundedKcal > 0, confidencePercent });
      
      sumMinutes += roundedMinutes;
      sumKcal += roundedKcal;
    });
    
    return {
      perBlock,
      totalTime: sumMinutes,
      totalCalories: sumKcal,
    };
  }, [currentWorkout, biometrics, athleteConfig]);

  const { totalTime, totalCalories } = blockMetricsMap;

  // ====== AI Daily Summary ======
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const aiCacheRef = useRef<Map<string, string>>(new Map());

  const buildWorkoutSummaryText = useCallback((workout: typeof currentWorkout) => {
    if (!workout || workout.isRestDay) return '';
    return buildSemanticSummary(workout.blocks as any);
  }, []);

  useEffect(() => {
    if (!currentWorkout || currentWorkout.isRestDay) {
      setAiSummary(null);
      return;
    }

    const cacheKey = `${currentWeek.start}_${activeDay}`;
    if (aiCacheRef.current.has(cacheKey)) {
      setAiSummary(aiCacheRef.current.get(cacheKey)!);
      return;
    }

    let cancelled = false;
    const fetchSummary = async () => {
      setAiSummaryLoading(true);
      try {
        const summaryText = buildWorkoutSummaryText(currentWorkout);
        const coachStyle = profile?.coach_style || 'PULSE';
        const { data, error } = await supabase.functions.invoke('generate-preworkout-message', {
          body: {
            mode: 'daily_summary',
            coachStyle,
            workoutSummary: summaryText,
            hasWorkout: true,
            sex: athleteConfig?.sexo || undefined,
          },
        });
        if (!cancelled && data?.message) {
          setAiSummary(data.message);
          aiCacheRef.current.set(cacheKey, data.message);
        }
      } catch (e) {
        console.error('AI summary error:', e);
      } finally {
        if (!cancelled) setAiSummaryLoading(false);
      }
    };
    fetchSummary();
    return () => { cancelled = true; };
  }, [activeDay, currentWorkout?.day, currentWeek.start]);

  const handleStartWorkout = () => {
    if (currentWorkout) {
      setSelectedWorkout(currentWorkout);
      setCurrentView('workout');
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToDashboard}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div>
                <OutlierWordmark size="sm" className="block" />
                <p className="text-sm text-muted-foreground">Treino Semanal</p>
              </div>
            </div>
            <UserHeader showLogout={true} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Week Navigator */}
        <div className="mb-6 pb-4 border-b border-border">
          <WeekNavigator
            currentWeek={currentWeek}
            canNavigateToPast={canNavigateToPast}
            canNavigateToFuture={canNavigateToFuture}
            onPreviousWeek={goToPreviousWeek}
            onNextWeek={goToNextWeek}
            onCurrentWeek={goToCurrentWeek}
            isViewingHistory={isViewingHistory}
          />
          {isViewingHistory && (
            <div className="mt-2 flex items-center justify-center gap-2 text-amber-500 text-sm">
              <History className="w-4 h-4" />
              <span>Visualizando histórico (somente leitura)</span>
            </div>
          )}
        </div>

        {/* Day Tabs */}
        <div className="flex gap-1 py-4 overflow-x-auto border-b border-border mb-6">
          {dayTabs.map((day) => {
            const hasWorkout = displayWorkouts.some((w) => w.day === day);
            const completion = completions.get(day);
            const isCompleted = !!completion?.completed;

            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`
                  flex items-center gap-1 px-3 py-2 rounded-lg font-display text-lg tracking-wide transition-all duration-200 whitespace-nowrap relative min-w-[52px]
                  ${activeDay === day
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'text-foreground bg-primary/10 hover:bg-primary/20'
                      : hasWorkout
                        ? 'text-foreground hover:bg-secondary'
                        : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary'
                  }
                  ${isViewingHistory ? 'opacity-80' : ''}
                `}
              >
                {DAY_NAMES[day].slice(0, 3).toUpperCase()}
                {isCompleted && (
                  <CheckCircle2 className={`w-3.5 h-3.5 ${activeDay === day ? 'text-primary-foreground' : 'text-primary'}`} />
                )}
                {hasWorkout && !isCompleted && activeDay !== day && (
                  <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${isViewingHistory ? 'bg-amber-500' : 'bg-primary'}`} />
                )}
              </button>
            );
          })}
        </div>


        {/* Loading State */}
        {loadingPlan && (
          <div className="min-h-[200px] flex items-center justify-center">
            <p className="text-muted-foreground">Carregando treinos...</p>
          </div>
        )}

        {/* Day Content */}
        {!loadingPlan && currentWorkout ? (
          <div className="space-y-4">
            {/* Day Header */}
            <div className="mb-4">
              <h2 className="font-display text-3xl mb-2">{DAY_NAMES[currentWorkout.day]}</h2>
              
              {/* Rest Day */}
              {currentWorkout.isRestDay && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 mb-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="text-blue-500 font-medium">🌙 Dia de descanso</span>
                  </div>
                </div>
              )}
              
              {/* Workout stats */}
              {!currentWorkout.isRestDay && (
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>{currentWorkout.stimulus}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium text-foreground">
                      {totalTime > 0 ? `~${totalTime}min` : 'Estimando…'}
                    </span>
                    <span className="text-xs text-muted-foreground/60">(estimado)</span>
                  </div>
                  {totalCalories > 0 && (
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-orange-500 font-medium">~{totalCalories} kcal</span>
                      <span className="text-xs text-muted-foreground/60">(estimado)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Daily Summary */}
            {!currentWorkout.isRestDay && (aiSummaryLoading || aiSummary) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-xl bg-secondary/50 border border-border"
              >
                <div className="flex items-start gap-3">
                  <MessageSquareText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5 block">
                      Coach {(profile?.coach_style || 'PULSE')}
                    </span>
                    {aiSummaryLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/90 leading-relaxed">{aiSummary}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Workout Blocks */}
            {currentWorkout.blocks.map((block, index) => {
              const displayData = getBlockDisplayDataFromParsed(block);
              
              if (!displayData.hasContent) {
                return null;
              }
              
              // Usar métricas pré-computadas (mesma fonte do header)
              const blockMet = blockMetricsMap.perBlock[index] || { kcal: 0, durationSec: 0, confidencePercent: 0, showStats: false, visible: false };
              const estimatedKcal = blockMet.kcal;
              const estimatedMinutes = Math.round(blockMet.durationSec / 60);
              const hasParsedData = block.parsedExercises && block.parsedExercises.length > 0 && block.parseStatus === 'completed';
              const isEstimated = !hasParsedData;

              // Bloco principal automático (por prioridade de categoria + duração)
              const isMainWod = identifyMainBlock(currentWorkout.blocks).blockIndex === index;
              const hasRegisteredTime = isMainWod && dayIsCompleted && dayTimeInSeconds && dayTimeInSeconds > 0;

              return (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index + 1) * 0.1 }}
                  className={`
                    card-elevated p-6 border-l-4 ${blockTypeColors[block.type] || 'border-l-border'}
                    ${isMainWod ? 'ring-1 ring-primary/30' : ''}
                  `}
                >
                  {/* Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <h3 className="font-display text-2xl font-bold tracking-tight uppercase">
                          {getBlockDisplayTitle(block, index)}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CategoryChip category={block.type} />
                          {isMainWod && (
                            <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wide uppercase">
                              WOD Principal
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Check badge se o dia foi concluído */}
                      {dayIsCompleted && (
                        <div className="flex-shrink-0 mt-1">
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold text-primary tracking-wide uppercase">Feito</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Content */}
                  {(() => {
                    const { exerciseLines, coachNotes: commentLines, structureDescription } = displayData;
                    return (
                      <>
                        {structureDescription && (
                          <div className="mb-4">
                            <StructureBadge structure={structureDescription} />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          {exerciseLines.length > 0 ? (
                            exerciseLines.map((line, idx) => {
                              if (line.startsWith('__STRUCT:')) {
                                return (
                                  <div key={idx} className="pt-3 pb-1">
                                    <StructureBadge structure={line.slice('__STRUCT:'.length)} />
                                  </div>
                                );
                              }
                              if (line.startsWith('__INTENSITY:')) {
                                return (
                                  <div key={idx} className="pt-2 pb-1">
                                    <IntensityBadge intensity={line.slice('__INTENSITY:'.length)} />
                                  </div>
                                );
                              }
                              return <ExerciseLine key={idx} line={line} className="text-foreground/80" />;
                            })
                          ) : (
                            <p className="text-xs text-muted-foreground/30 italic py-1">—</p>
                          )}
                        </div>
                        
                        <CommentSubBlock comments={commentLines} />
                      </>
                    );
                  })()}

                  {/* Tempo registrado em destaque - apenas no WOD Principal */}
                  {hasRegisteredTime && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium text-primary">Tempo registrado</span>
                      </div>
                      <span className="font-display text-3xl font-bold text-primary tracking-wider">
                        {formatRegisteredTime(dayTimeInSeconds!)}
                      </span>
                    </motion.div>
                  )}

                  {/* Block Stats */}
                  {block.type !== 'notas' && blockMet.showStats && (
                    <div className="flex items-center gap-4 pt-3 border-t border-border/50 mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {isEstimated ? '~' : ''}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatEstimatedTime(estimatedMinutes)}
                        </span>
                        {isEstimated && (
                          <span className="text-xs text-muted-foreground/60">(estimado)</span>
                        )}
                      </div>
                      {biometrics.isValid && (
                        <div className="flex items-center gap-2 text-sm">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="text-orange-500 font-medium">
                            {formatEstimatedKcal(estimatedKcal)}
                          </span>
                        </div>
                      )}
                      {/* Precision Badge */}
                      <PrecisionBadge confidencePercent={blockMet.confidencePercent} />
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Start Workout Button */}
            {!isViewingHistory && (
              <motion.button
                onClick={handleStartWorkout}
                className="w-full font-display text-xl tracking-wider px-8 py-5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                INICIAR TREINO
                <ChevronRight className="w-6 h-6" />
              </motion.button>
            )}
          </div>
        ) : !loadingPlan && hasAnyWorkouts ? (
          <div className="min-h-[200px] flex flex-col items-center justify-center gap-4 card-elevated p-8 rounded-xl">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Clock className="w-8 h-8 text-primary/60" />
            </div>
            <p className="text-muted-foreground text-center text-lg">
              Nenhum treino para {DAY_NAMES[activeDay].toLowerCase()}.
            </p>
          </div>
        ) : !loadingPlan ? (
          <div className="min-h-[200px] flex flex-col items-center justify-center gap-4 card-elevated p-8 rounded-xl">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Clock className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="font-display text-xl text-foreground">
              📭 Nenhum treino publicado para esta semana
            </h3>
            <p className="text-muted-foreground text-center text-sm max-w-md">
              {currentWeek.isFuture 
                ? 'Seu coach ainda não publicou treinos para a próxima semana.'
                : 'Seu coach ainda não publicou treinos para esta semana. Aguarde ou entre em contato.'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
