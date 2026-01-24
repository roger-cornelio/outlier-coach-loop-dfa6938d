/**
 * WeeklyTraining - Tela de Treino Semanal
 * 
 * Responsabilidades:
 * - Período semanal e navegação entre semanas
 * - Dias da semana com tabs
 * - Treinos do dia com blocos detalhados
 * - Execução de treino
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { DAY_NAMES, type DayOfWeek } from '@/types/outlier';
import { Clock, Zap, Flame, ChevronRight, History, Loader2 } from 'lucide-react';
import { estimateWorkout, formatEstimatedTime, formatEstimatedKcal, getUserBiometrics } from '@/utils/workoutEstimation';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useAthleteProfile } from '@/hooks/useAthleteProfile';
import { useAthletePlan } from '@/hooks/useAthletePlan';
import { useAdaptationPipeline } from '@/hooks/useAdaptationPipeline';
import { WeekNavigator } from '@/components/WeekNavigator';
import { getBlockDisplayTitle, getBlockDisplayDataFromParsed } from '@/utils/blockDisplayUtils';
import { CategoryChip, StructureBadge, CommentSubBlock, ExerciseLine } from '@/components/DSLBlockRenderer';

const dayTabs: DayOfWeek[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

const blockTypeColors: Record<string, string> = {
  aquecimento: 'border-l-amber-500',
  conditioning: 'border-l-primary',
  forca: 'border-l-red-500',
  especifico: 'border-l-purple-500',
  core: 'border-l-blue-500',
  corrida: 'border-l-green-500',
  notas: 'border-l-muted-foreground',
};

export default function WeeklyTraining() {
  const {
    setCurrentView,
    setSelectedWorkout,
    baseWorkouts,
    adaptedWorkouts,
    adaptationPending,
    athleteConfig,
    setBaseWorkouts,
    clearBaseWorkouts,
    hasHydrated
  } = useOutlierStore();

  const { getEffectiveLevelForWorkout } = useAthleteStatus();
  const { ensureAdapted, hasAthleteConfig } = useAdaptationPipeline();
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
    debugInfo,
  } = useAthletePlan();

  useAthleteProfile();

  const [activeDay, setActiveDay] = useState<DayOfWeek>(() => {
    const days: DayOfWeek[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const today = new Date().getDay();
    return days[today] || 'seg';
  });

  const [isGeneratingAdaptation, setIsGeneratingAdaptation] = useState(false);

  // Aplicar treinos ao mudar semana
  const selectedWeekStart = debugInfo?.selectedWeekStart;
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (!hasHydrated || loadingPlan) return;
    
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      if (planWorkouts.length > 0) {
        setBaseWorkouts(planWorkouts);
      }
      return;
    }

    if (planWorkouts.length > 0) {
      setBaseWorkouts(planWorkouts);
    } else {
      clearBaseWorkouts();
    }
  }, [hasHydrated, selectedWeekStart, loadingPlan]);

  // Auto-adaptar
  useEffect(() => {
    if (baseWorkouts.length === 0 || !adaptationPending || !hasAthleteConfig) return;
    
    setIsGeneratingAdaptation(true);
    ensureAdapted();
    setIsGeneratingAdaptation(false);
  }, [adaptationPending, baseWorkouts.length, hasAthleteConfig, ensureAdapted]);

  const displayWorkouts = adaptedWorkouts.length > 0 ? adaptedWorkouts : baseWorkouts;
  const isShowingAdapted = adaptedWorkouts.length > 0;
  const currentWorkout = displayWorkouts.find((w) => w.day === activeDay);
  const hasAnyWorkouts = displayWorkouts.length > 0;
  const effectiveLevel = athleteConfig ? getEffectiveLevelForWorkout(athleteConfig.trainingDifficulty) : 'intermediario';

  // Estimativa
  const workoutEstimation = useMemo(() => {
    if (!currentWorkout) return null;
    const levelMap: Record<string, string> = {
      'base': 'iniciante',
      'progressivo': 'intermediario',
      'performance': 'avancado',
    };
    const level = levelMap[athleteConfig?.trainingLevel || 'progressivo'] || effectiveLevel;
    return estimateWorkout(currentWorkout, athleteConfig, level as any);
  }, [currentWorkout, athleteConfig, effectiveLevel]);

  const biometrics = useMemo(() => getUserBiometrics(athleteConfig), [athleteConfig]);
  const totalTime = workoutEstimation?.totals.estimatedMinutesTotal || 0;
  const totalCalories = workoutEstimation?.totals.estimatedKcalTotal || 0;

  const handleStartWorkout = () => {
    if (currentWorkout) {
      setSelectedWorkout(currentWorkout);
      setCurrentView('workout');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-display tracking-wide mb-6">Treino Semanal</h1>

      {/* Week Navigator */}
      <div className="mb-6">
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
      {hasAnyWorkouts && (
        <div className="flex gap-1 py-4 overflow-x-auto border-b border-border mb-6">
          {dayTabs.map((day) => {
            const hasWorkout = displayWorkouts.some((w) => w.day === day);
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`
                  px-4 py-2 rounded-lg font-display text-lg tracking-wide transition-all duration-200 whitespace-nowrap relative
                  ${activeDay === day
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : hasWorkout
                      ? 'bg-secondary/80 text-foreground hover:bg-secondary'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }
                `}
              >
                {DAY_NAMES[day]}
                {hasWorkout && activeDay !== day && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {loadingPlan && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* No Workouts */}
      {!loadingPlan && !hasAnyWorkouts && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum treino programado para esta semana.</p>
        </div>
      )}

      {/* Current Workout */}
      {currentWorkout && (
        <motion.div
          key={activeDay}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Estimation Bar */}
          {workoutEstimation && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{formatEstimatedTime(totalTime)}</span>
              </div>
              {biometrics.weightKg && (
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span className="font-medium">{formatEstimatedKcal(totalCalories)}</span>
                </div>
              )}
              {isShowingAdapted && (
                <span className="text-xs text-muted-foreground ml-auto">Treino adaptado</span>
              )}
            </div>
          )}

          {/* Workout Blocks */}
          <div className="space-y-4">
            {currentWorkout.blocks.map((block, idx) => {
              const displayData = getBlockDisplayDataFromParsed(block);
              return (
                <div
                  key={block.id || idx}
                  className={`card-elevated p-4 border-l-4 ${blockTypeColors[block.type] || 'border-l-muted'}`}
                >
                  {/* Block Title */}
                  <div className="flex items-start gap-2 mb-3">
                    <h3 className="font-display text-lg tracking-wide flex-1">
                      {getBlockDisplayTitle(block, idx)}
                    </h3>
                    {block.isMainWod && (
                      <span className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary font-medium">
                        PRINCIPAL
                      </span>
                    )}
                  </div>

                  {/* Category & Structure */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <CategoryChip category={block.type} />
                    {displayData.structureDescription && (
                      <StructureBadge structure={displayData.structureDescription} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="space-y-1">
                    {displayData.exerciseLines.map((line, i) => (
                      <ExerciseLine key={i} line={line} />
                    ))}
                  </div>

                  {/* Coach Notes */}
                  {displayData.coachNotes && displayData.coachNotes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <CommentSubBlock comments={displayData.coachNotes} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Start Workout CTA */}
          {!isViewingHistory && (
            <motion.button
              onClick={handleStartWorkout}
              className="w-full font-display text-xl tracking-wider px-6 py-5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg mt-6"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Flame className="w-6 h-6" />
              INICIAR TREINO
              <ChevronRight className="w-6 h-6" />
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  );
}
