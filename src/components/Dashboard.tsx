import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { DAY_NAMES, type DayOfWeek } from '@/types/outlier';
import { Settings, Clock, Zap, ChevronRight, FileEdit, Wrench, Flame, ArrowLeft, Loader2 } from 'lucide-react';
import { AdaptWorkoutModal, type AdaptationConfig } from './AdaptWorkoutModal';
import { getEstimatedTimeForLevel, calculateCalories, calculateTotalWorkoutCalories, formatBlockTime } from '@/utils/workoutCalculations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export function Dashboard() {
  const { setCurrentView, setSelectedWorkout, weeklyWorkouts, athleteConfig } = useOutlierStore();
  const [activeDay, setActiveDay] = useState<DayOfWeek>('seg');
  const [isAdaptModalOpen, setIsAdaptModalOpen] = useState(false);
  const [adaptations, setAdaptations] = useState<AdaptationConfig | null>(null);
  const [workoutFeedback, setWorkoutFeedback] = useState<string | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [adaptedWorkoutContent, setAdaptedWorkoutContent] = useState<string | null>(null);
  const [adaptedWorkoutJson, setAdaptedWorkoutJson] = useState<{
    day: string;
    total_minutes: number;
    blocks: Array<{
      type: string;
      title: string;
      target_minutes: number;
      content: string;
    }>;
  } | null>(null);
  const [isAdapting, setIsAdapting] = useState(false);

  const currentWorkout = weeklyWorkouts.find((w) => w.day === activeDay);
  const hasAnyWorkouts = weeklyWorkouts.length > 0;

  // Fetch AI feedback when workout or coach style changes
  useEffect(() => {
    const fetchFeedback = async () => {
      if (!currentWorkout || !athleteConfig?.coachStyle) {
        setWorkoutFeedback(null);
        return;
      }

      setIsLoadingFeedback(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-workout-feedback', {
          body: {
            coachStyle: athleteConfig.coachStyle,
            blocks: currentWorkout.blocks.map(b => ({
              type: b.type,
              title: b.title,
              content: b.content,
            })),
            dayName: DAY_NAMES[currentWorkout.day],
          },
        });

        if (error) throw error;
        
        if (data?.feedback) {
          setWorkoutFeedback(data.feedback);
        }
      } catch (err) {
        console.error('Error fetching feedback:', err);
        // Fallback to static message
        setWorkoutFeedback(null);
      } finally {
        setIsLoadingFeedback(false);
      }
    };

    fetchFeedback();
  }, [currentWorkout?.day, athleteConfig?.coachStyle]);

  // Clear adapted workout when day changes
  useEffect(() => {
    setAdaptedWorkoutContent(null);
    setAdaptedWorkoutJson(null);
  }, [activeDay]);

  const handleStartWorkout = () => {
    if (currentWorkout) {
      setSelectedWorkout(currentWorkout);
      setCurrentView('workout');
    }
  };

  const handleSaveAdaptations = async (config: AdaptationConfig) => {
    setAdaptations(config);
    
    // If adaptations are cleared, reset adapted workout
    if (!config.unavailableEquipment.length && !config.otherNotes) {
      setAdaptedWorkoutContent(null);
      setAdaptedWorkoutJson(null);
      return;
    }

    // Call AI to adapt workout
    if (currentWorkout && athleteConfig) {
      setIsAdapting(true);
      try {
        const { data, error } = await supabase.functions.invoke('adapt-workout', {
          body: {
            athleteConfig: {
              level: athleteConfig.level,
              sessionDuration: athleteConfig.sessionDuration,
              altura: athleteConfig.altura,
              peso: athleteConfig.peso,
              idade: athleteConfig.idade,
              sexo: athleteConfig.sexo,
            },
            workout: {
              day: DAY_NAMES[currentWorkout.day],
              stimulus: currentWorkout.stimulus,
              blocks: currentWorkout.blocks,
            },
            adaptations: {
              unavailableEquipment: config.unavailableEquipment,
              otherNotes: config.otherNotes,
            },
          },
        });

        if (error) throw error;

        if (data?.adaptedWorkoutJson) {
          setAdaptedWorkoutJson(data.adaptedWorkoutJson);
          setAdaptedWorkoutContent(null);
          toast.success('Treino adaptado com sucesso!');
        } else if (data?.adaptedWorkout) {
          setAdaptedWorkoutContent(data.adaptedWorkout);
          setAdaptedWorkoutJson(null);
          toast.success('Treino adaptado com sucesso!');
        } else if (data?.message) {
          setAdaptedWorkoutContent(null);
          setAdaptedWorkoutJson(null);
          toast.info(data.message);
        }
      } catch (err) {
        console.error('Error adapting workout:', err);
        toast.error('Erro ao adaptar treino');
      } finally {
        setIsAdapting(false);
      }
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${minutes}min`;
  };

  const hasAdaptations = adaptations && (adaptations.unavailableEquipment.length > 0 || adaptations.otherNotes);

  // Calculate total calories for current workout
  const totalCalories = currentWorkout && athleteConfig 
    ? calculateTotalWorkoutCalories(currentWorkout.blocks, athleteConfig)
    : 0;

  // Calculate total time for current workout
  const totalTime = currentWorkout?.estimatedTime || 0;

  // Fallback objective if AI fails
  const getFallbackObjective = (): string => {
    if (!currentWorkout) return '';
    
    const blockTypes = currentWorkout.blocks.map(b => b.type);
    const hasForce = blockTypes.includes('forca');
    const hasConditioning = blockTypes.includes('conditioning');

    if (hasForce && hasConditioning) {
      return 'Desenvolver força funcional combinada com capacidade cardiorrespiratória.';
    } else if (hasForce) {
      return 'Foco em desenvolvimento de força e potência muscular.';
    } else if (hasConditioning) {
      return 'Melhorar condicionamento e resistência metabólica.';
    }
    return 'Treino completo para desenvolvimento atlético geral.';
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView('welcome')}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display text-3xl text-gradient">OUTLIER</h1>
                {athleteConfig && (
                  <p className="text-sm text-muted-foreground">
                    Coach {athleteConfig.coachStyle} • {athleteConfig.level.replace('_', ' ').toUpperCase()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAdaptModalOpen(true)}
                className={`
                  p-3 rounded-lg transition-colors relative
                  ${hasAdaptations 
                    ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                    : 'bg-secondary hover:bg-secondary/80'
                  }
                `}
                title="Adaptar Treino"
              >
                <Wrench className="w-5 h-5" />
                {hasAdaptations && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
                )}
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                title="Inserir Planilha (Admin)"
              >
                <FileEdit className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView('config')}
                className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Adaptations Banner */}
      {hasAdaptations && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="max-w-6xl mx-auto px-6 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">Adaptações ativas:</span>
              <span className="text-muted-foreground">
                {adaptations.unavailableEquipment.length > 0 && (
                  <>Sem {adaptations.unavailableEquipment.map(e => e.toUpperCase()).join(', ')}</>
                )}
                {adaptations.unavailableEquipment.length > 0 && adaptations.otherNotes && ' • '}
                {adaptations.otherNotes && <>{adaptations.otherNotes.slice(0, 30)}...</>}
              </span>
              <button
                onClick={() => setIsAdaptModalOpen(true)}
                className="ml-auto text-primary hover:underline"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Tabs */}
      <div className="sticky top-[73px] z-40 bg-background border-b border-border overflow-x-auto">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 py-2">
            {dayTabs.map((day) => {
              const hasWorkout = weeklyWorkouts.some((w) => w.day === day);
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
                  `}
                >
                  {DAY_NAMES[day].slice(0, 3).toUpperCase()}
                  {hasWorkout && activeDay !== day && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {currentWorkout ? (
            <motion.div
              key={activeDay}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Day Header */}
              <div className="mb-8">
                <h2 className="font-display text-4xl mb-2">{DAY_NAMES[currentWorkout.day]}</h2>
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>{currentWorkout.stimulus}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(currentWorkout.estimatedTime)}</span>
                  </div>
                  {totalCalories > 0 && (
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-orange-500 font-medium">~{totalCalories} kcal</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Workout Summary Block */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-elevated p-6 border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent mb-4"
              >
                <h3 className="font-display text-xl mb-4 text-primary">RESUMO DO TREINO</h3>
                
                <div className="flex flex-wrap items-center gap-6 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className="text-muted-foreground">Tempo total:</span>
                    <span className="font-display text-lg text-foreground">{formatTime(totalTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <span className="text-muted-foreground">Calorias estimadas:</span>
                    <span className="font-display text-lg text-orange-500">
                      {totalCalories > 0 ? `~${totalCalories} kcal` : '-'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50">
                  <p className="text-sm text-muted-foreground font-medium mb-1">
                    Objetivo do dia ({athleteConfig?.coachStyle || 'PULSE'}):
                  </p>
                  {isLoadingFeedback ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Gerando feedback...</span>
                    </div>
                  ) : (
                    <p className="text-foreground">{workoutFeedback || getFallbackObjective()}</p>
                  )}
                </div>
              </motion.div>

              {/* Adapted Workout Block - Show when adaptations are active */}
              {hasAdaptations && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-elevated p-6 border-l-4 border-l-green-500 bg-gradient-to-r from-green-500/5 to-transparent mb-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-xl text-green-500 flex items-center gap-2">
                      <Wrench className="w-5 h-5" />
                      TREINO ADAPTADO
                    </h3>
                    {adaptedWorkoutJson && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{adaptedWorkoutJson.total_minutes} min</span>
                      </div>
                    )}
                  </div>
                  
                  {isAdapting ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-4">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Adaptando treino...</span>
                    </div>
                  ) : adaptedWorkoutJson ? (
                    <div className="space-y-4">
                      {adaptedWorkoutJson.blocks.map((block, index) => (
                        <div 
                          key={index} 
                          className={`p-4 rounded-lg bg-secondary/30 border-l-2 ${
                            block.type === 'aquecimento' ? 'border-l-amber-500' :
                            block.type === 'forca' ? 'border-l-red-500' :
                            block.type === 'conditioning' ? 'border-l-primary' :
                            block.type === 'core' ? 'border-l-blue-500' :
                            block.type === 'especifico' ? 'border-l-purple-500' :
                            block.type === 'corrida' ? 'border-l-green-500' :
                            'border-l-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-display text-lg">{block.title}</h4>
                            <span className="text-xs text-muted-foreground">{block.target_minutes} min</span>
                          </div>
                          <pre className="font-body text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {block.content}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : adaptedWorkoutContent ? (
                    <pre className="font-body text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {adaptedWorkoutContent}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Clique em "Editar" no banner acima para configurar as adaptações.
                    </p>
                  )}
                </motion.div>
              )}

              {/* Workout Blocks */}
              <div className="space-y-4 mb-8">
                {currentWorkout.blocks.map((block, index) => {
                  const level = athleteConfig?.level || 'intermediario';
                  const estimatedTime = getEstimatedTimeForLevel(block, level);
                  const calories = calculateCalories(block, athleteConfig, estimatedTime);

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
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="font-display text-xl">{block.title}</h3>
                        <div className="flex items-center gap-2">
                          {block.isMainWod && (
                            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold tracking-wide">
                              WOD PRINCIPAL
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <pre className="font-body text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed mb-4">
                        {block.content}
                      </pre>

                      {/* Block Stats */}
                      {block.type !== 'notas' && (
                        <div className="flex items-center gap-4 pt-3 border-t border-border/50">
                          {estimatedTime && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Tempo esperado ({level.replace('_', ' ')}):
                              </span>
                              <span className="font-medium text-foreground">{formatBlockTime(estimatedTime)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-orange-500 font-medium">
                              {calories ? `~${calories} kcal` : '-'}
                            </span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Start Workout Button */}
              <motion.button
                onClick={handleStartWorkout}
                className="w-full font-display text-xl tracking-wider px-8 py-5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                INICIAR TREINO
                <ChevronRight className="w-6 h-6" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Day Header */}
              <div className="mb-8">
                <h2 className="font-display text-4xl mb-2 text-muted-foreground/50">{DAY_NAMES[activeDay]}</h2>
              </div>

              {/* Empty State */}
              <div className="min-h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground/50 text-center">
                  Nenhum treino inserido
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Adapt Workout Modal */}
      <AdaptWorkoutModal
        isOpen={isAdaptModalOpen}
        onClose={() => setIsAdaptModalOpen(false)}
        onSave={handleSaveAdaptations}
      />
    </div>
  );
}
