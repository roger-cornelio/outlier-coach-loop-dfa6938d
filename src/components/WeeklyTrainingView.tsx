/**
 * WeeklyTrainingView - Página dedicada para visualização do treino semanal
 * 
 * Contém:
 * - WeekNavigator (navegação entre semanas)
 * - Day Tabs (SEG-DOM)
 * - Blocos de treino completos
 * - Botão INICIAR TREINO
 * 
 * Esta é uma VIEW dedicada, acessível via sidebar "Treino Semanal"
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { DAY_NAMES, type DayOfWeek } from '@/types/outlier';
import { Clock, Zap, ChevronRight, Flame, History, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAthletePlan } from '@/hooks/useAthletePlan';
import { WeekNavigator } from './WeekNavigator';
import { getBlockDisplayTitle, getBlockDisplayDataFromParsed } from '@/utils/blockDisplayUtils';
import { CategoryChip, StructureBadge, CommentSubBlock, ExerciseLine } from './DSLBlockRenderer';
import { estimateWorkout, formatEstimatedTime, formatEstimatedKcal, getUserBiometrics } from '@/utils/workoutEstimation';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';
import { UserHeader } from './UserHeader';

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
  } = useAthletePlan();

  const [activeDay, setActiveDay] = useState<DayOfWeek>(() => {
    const days: DayOfWeek[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const today = new Date().getDay();
    return days[today] || 'seg';
  });

  // Usar adaptedWorkouts quando existir, senão baseWorkouts
  const displayWorkouts = adaptedWorkouts.length > 0 ? adaptedWorkouts : baseWorkouts;
  const currentWorkout = displayWorkouts.find((w) => w.day === activeDay);
  const hasAnyWorkouts = displayWorkouts.length > 0;

  // Estimativa de tempo e calorias
  const workoutEstimation = useMemo(() => {
    if (!currentWorkout) return null;
    const levelMap: Record<string, string> = {
      'base': 'iniciante',
      'progressivo': 'intermediario',
      'performance': 'avancado',
    };
    const level = levelMap[athleteConfig?.trainingLevel || 'progressivo'] || 'intermediario';
    return estimateWorkout(currentWorkout, athleteConfig, level as any);
  }, [currentWorkout, athleteConfig]);

  const biometrics = useMemo(() => getUserBiometrics(athleteConfig), [athleteConfig]);
  const totalTime = workoutEstimation?.totals.estimatedMinutesTotal || 0;
  const totalCalories = workoutEstimation?.totals.estimatedKcalTotal || 0;

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
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`
                  px-4 py-2 rounded-lg font-display text-lg tracking-wide transition-all duration-200 whitespace-nowrap relative
                  ${activeDay === day
                    ? 'bg-primary text-primary-foreground'
                    : hasWorkout
                      ? 'text-foreground hover:bg-secondary'
                      : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary'
                  }
                  ${isViewingHistory ? 'opacity-80' : ''}
                `}
              >
                {DAY_NAMES[day].slice(0, 3).toUpperCase()}
                {hasWorkout && activeDay !== day && (
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
                    <span>{totalTime > 0 ? `${totalTime}min` : 'Estimando…'}</span>
                  </div>
                  {totalCalories > 0 && (
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-orange-500 font-medium">~{Math.abs(totalCalories)} kcal</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Workout Blocks */}
            {currentWorkout.blocks.map((block, index) => {
              const displayData = getBlockDisplayDataFromParsed(block);
              
              if (!displayData.hasContent) {
                return null;
              }
              
              const blockEstimate = workoutEstimation?.blocks[index];
              const estimatedMinutes = blockEstimate?.estimatedMinutes || 0;
              const estimatedKcal = blockEstimate?.estimatedKcal || 0;
              const blockConfidence = blockEstimate?.confidence || 'low';

              return (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index + 1) * 0.1 }}
                  className={`
                    card-elevated p-6 border-l-4 ${blockTypeColors[block.type] || 'border-l-border'}
                    ${block.isMainWod ? 'ring-1 ring-primary/30' : ''}
                  `}
                >
                  {/* Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <h3 className="font-display text-2xl font-bold tracking-tight uppercase">
                          {getBlockDisplayTitle(block, index)}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CategoryChip category={block.type} />
                          {block.isMainWod && (
                            <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wide uppercase">
                              WOD Principal
                            </span>
                          )}
                        </div>
                      </div>
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
                            exerciseLines.map((line, idx) => (
                              <ExerciseLine key={idx} line={line} className="text-foreground/80" />
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground/30 italic py-1">—</p>
                          )}
                        </div>
                        
                        <CommentSubBlock comments={commentLines} />
                      </>
                    );
                  })()}

                  {/* Block Stats */}
                  {block.type !== 'notas' && (
                    <div className="flex items-center gap-4 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {blockConfidence === 'low' ? '~' : ''}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatEstimatedTime(estimatedMinutes)}
                        </span>
                        {blockConfidence === 'low' && (
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
          </div>
        ) : null}
      </main>
    </div>
  );
}
