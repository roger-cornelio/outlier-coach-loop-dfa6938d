import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { DAY_NAMES } from '@/types/outlier';
import { ArrowLeft, Check, Clock, Play, Flame, Info, Timer, Target, Wrench } from 'lucide-react';
import { getBlockDuration, getReferenceTimeForLevel, calculateCalories, formatBlockTime } from '@/utils/workoutCalculations';
import { getEffectiveContent, getEffectiveTargetRange, getEffectiveNotes, getEffectivePSE, getEffectiveReferencePace, getPSEInfo, formatPace } from '@/utils/benchmarkVariants';
import { toast } from 'sonner';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { getBlockCompletionLine } from '@/config/coachCopy';
import { EquipmentAdaptModal } from './EquipmentAdaptModal';
import { adaptWorkoutForEquipment } from '@/utils/equipmentAdaptation';

const blockTypeColors: Record<string, string> = {
  aquecimento: 'border-l-amber-500',
  conditioning: 'border-l-primary',
  forca: 'border-l-red-500',
  especifico: 'border-l-purple-500',
  core: 'border-l-blue-500',
  corrida: 'border-l-green-500',
  notas: 'border-l-muted-foreground',
};

export function WorkoutExecution() {
  const { selectedWorkout, setCurrentView, athleteConfig, setAthleteConfig } = useOutlierStore();
  const [completedBlocks, setCompletedBlocks] = useState<string[]>([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [justCompletedBlock, setJustCompletedBlock] = useState<string | null>(null);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);

  // Equipamentos indisponíveis salvos no athleteConfig
  const savedUnavailableEquipment = athleteConfig?.unavailableEquipment || [];

  // Adaptar workout baseado nos equipamentos indisponíveis
  const { workout: displayedWorkout, result: adaptationResult } = useMemo(() => {
    if (!selectedWorkout) {
      return { workout: null, result: { adapted: false, substitutions: [], noSubstitutionItems: [] } };
    }
    return adaptWorkoutForEquipment(selectedWorkout, savedUnavailableEquipment);
  }, [selectedWorkout, savedUnavailableEquipment]);

  if (!selectedWorkout || !displayedWorkout) {
    setCurrentView('dashboard');
    return null;
  }

  const handleApplyEquipmentAdaptation = (unavailableEquipment: string[]) => {
    // Salvar preferências no athleteConfig
    if (athleteConfig) {
      setAthleteConfig({
        ...athleteConfig,
        unavailableEquipment,
      });
    }

    // Mostrar feedback
    if (unavailableEquipment.length > 0) {
      toast.success('Treino adaptado pro seu box.', { duration: 3000 });
    } else {
      toast.success('Adaptações removidas. Treino original restaurado.', { duration: 3000 });
    }
  };

  // Get animation variants based on coach style
  const getCompletionAnimation = (coachStyle: string | undefined) => {
    switch (coachStyle) {
      case 'IRON':
        return {
          initial: { scale: 1 },
          complete: { 
            scale: [1, 0.98, 1],
            transition: { duration: 0.2 }
          }
        };
      case 'SPARK':
        return {
          initial: { scale: 1, rotate: 0 },
          complete: { 
            scale: [1, 1.05, 0.95, 1.02, 1],
            rotate: [0, -2, 2, -1, 0],
            transition: { duration: 0.5 }
          }
        };
      case 'PULSE':
      default:
        return {
          initial: { scale: 1 },
          complete: { 
            scale: [1, 1.02, 1],
            opacity: [1, 0.8, 0.6],
            transition: { duration: 0.4 }
          }
        };
    }
  };

  // Get checkbox animation based on coach style
  const getCheckboxAnimation = (coachStyle: string | undefined, isComplete: boolean) => {
    if (!isComplete) return { scale: 1, opacity: 1 };
    
    switch (coachStyle) {
      case 'IRON':
        return {
          scale: [0, 1.1, 1],
          transition: { duration: 0.15 }
        };
      case 'SPARK':
        return {
          scale: [0, 1.3, 0.9, 1.1, 1],
          rotate: [0, 10, -10, 5, 0],
          transition: { duration: 0.4 }
        };
      case 'PULSE':
      default:
        return {
          scale: [0, 1.05, 1],
          transition: { duration: 0.3 }
        };
    }
  };

  const toggleBlockComplete = (blockId: string, blockType: string) => {
    const isCompleting = !completedBlocks.includes(blockId);
    
    setCompletedBlocks((prev) =>
      prev.includes(blockId)
        ? prev.filter((id) => id !== blockId)
        : [...prev, blockId]
    );

    // Show motivational toast and trigger animation when completing a block
    if (isCompleting) {
      setJustCompletedBlock(blockId);
      setTimeout(() => setJustCompletedBlock(null), 600);
      
      const newCompletedCount = completedBlocks.length + 1;
      const blocksRemaining = displayedWorkout.blocks.length - newCompletedCount;
      const isLastBlock = blocksRemaining === 0;
      const message = getBlockCompletionLine(athleteConfig?.coachStyle, blockType, isLastBlock);
      
      const toastStyle = athleteConfig?.coachStyle === 'SPARK' 
        ? { duration: 2500 }
        : { duration: 2000 };
      
      toast.success(message, toastStyle);
    }
  };

  const mainWod = displayedWorkout.blocks.find((b) => b.isMainWod);
  const allBlocksComplete = displayedWorkout.blocks.every((b) => completedBlocks.includes(b.id));

  const handleFinishWorkout = () => {
    if (mainWod) {
      setCurrentView('result');
    } else {
      setCurrentView('dashboard');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-display text-2xl">{DAY_NAMES[displayedWorkout.day]}</h1>
              <p className="text-sm text-muted-foreground">{displayedWorkout.stimulus}</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{displayedWorkout.estimatedTime}min</span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-secondary h-1">
        <motion.div
          className="bg-primary h-full"
          initial={{ width: 0 }}
          animate={{ 
            width: `${(completedBlocks.length / displayedWorkout.blocks.length) * 100}%` 
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Workout Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Equipment Adaptation Button */}
        <div className="mb-6">
          <button
            onClick={() => setIsEquipmentModalOpen(true)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all
              ${savedUnavailableEquipment.length > 0
                ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
                : 'border-border bg-secondary/50 hover:bg-secondary hover:border-muted-foreground/50'
              }
            `}
          >
            <Wrench className="w-4 h-4" />
            <span className="font-display text-sm tracking-wide">
              {savedUnavailableEquipment.length > 0 
                ? `EQUIPAMENTOS ADAPTADOS (${savedUnavailableEquipment.length})`
                : 'TROCAR EQUIPAMENTOS'
              }
            </span>
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            Sem algum equipamento no seu box? Eu adapto sem mudar o estímulo.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {displayedWorkout.blocks.map((block, index) => {
            const isComplete = completedBlocks.includes(block.id);
            const isCurrent = index === currentBlockIndex;
            const isJustCompleted = justCompletedBlock === block.id;
            
            // Get effective level from training level
            const effectiveLevel = athleteConfig?.trainingLevel === 'base' ? 'iniciante' : 
                                   athleteConfig?.trainingLevel === 'performance' ? 'avancado' : 'intermediario';
            
            // Get effective content and notes based on athlete level
            const effectiveContent = getEffectiveContent(block, effectiveLevel);
            const effectiveNotes = getEffectiveNotes(block, effectiveLevel);
            const effectiveTargetRange = getEffectiveTargetRange(block, effectiveLevel);
            const effectivePSE = getEffectivePSE(block, effectiveLevel);
            const effectivePace = getEffectiveReferencePace(block, effectiveLevel);
            const pseInfo = effectivePSE ? getPSEInfo(effectivePSE) : null;
            
            // Block duration (used for calories) - from durationMinutes
            const blockDuration = athleteConfig 
              ? getBlockDuration(block, effectiveLevel)
              : null;
            
            // Reference time (informational only) - estimated from content
            const referenceTime = athleteConfig 
              ? getReferenceTimeForLevel(block, effectiveLevel)
              : null;
            
            // Calories use ONLY blockDuration
            const calories = athleteConfig 
              ? calculateCalories(block, athleteConfig, effectiveLevel)
              : null;
            
            const completionAnim = getCompletionAnimation(athleteConfig?.coachStyle);

            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isJustCompleted ? completionAnim.complete : { opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  card-elevated p-6 border-l-4 transition-all duration-300
                  ${blockTypeColors[block.type] || 'border-l-border'}
                  ${isComplete ? 'opacity-60' : ''}
                  ${block.isMainWod ? 'ring-2 ring-primary/50' : ''}
                  ${isJustCompleted && athleteConfig?.coachStyle === 'SPARK' ? 'ring-2 ring-yellow-400/50' : ''}
                `}
              >
                <div className="flex items-start gap-4">
                  <motion.button
                    onClick={() => {
                      toggleBlockComplete(block.id, block.type);
                      if (!isComplete && index === currentBlockIndex) {
                        setCurrentBlockIndex(Math.min(index + 1, displayedWorkout.blocks.length - 1));
                      }
                    }}
                    className={`
                      mt-1 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
                      ${isComplete
                        ? athleteConfig?.coachStyle === 'SPARK' 
                          ? 'bg-yellow-500 border-yellow-500 text-black'
                          : athleteConfig?.coachStyle === 'IRON'
                            ? 'bg-zinc-700 border-zinc-700 text-white'
                            : 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/30 hover:border-primary'
                      }
                    `}
                    whileTap={{ scale: 0.9 }}
                  >
                    <AnimatePresence mode="wait">
                      {isComplete && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={getCheckboxAnimation(athleteConfig?.coachStyle, true)}
                          exit={{ scale: 0, opacity: 0 }}
                        >
                          <Check className="w-4 h-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <h3 className={`font-display text-xl ${isComplete ? 'line-through' : ''}`}>
                        {block.title}
                      </h3>
                      {block.isMainWod && (
                        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold tracking-wide">
                          WOD PRINCIPAL
                        </span>
                      )}
                    </div>
                    <pre className="font-body text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {effectiveContent}
                    </pre>
                    
                    {/* Level-specific notes */}
                    {effectiveNotes && (
                      <div className="flex items-start gap-2 mt-3 p-2 bg-secondary/50 rounded text-xs text-muted-foreground">
                        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{effectiveNotes}</span>
                      </div>
                    )}

                    {/* Block Stats */}
                    {(blockDuration || referenceTime || calories || pseInfo || effectivePace) && block.type !== 'notas' && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-border/50">
                        {/* Block Duration - used for calories */}
                        {blockDuration && (
                          <div className="flex items-center gap-2 text-sm">
                            <Timer className="w-4 h-4 text-primary" />
                            <span className="text-muted-foreground">Duração:</span>
                            <span className="font-medium text-foreground">{formatBlockTime(blockDuration)}</span>
                          </div>
                        )}
                        
                        {/* Reference Time - informational only */}
                        {referenceTime && !blockDuration && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Ref:</span>
                            <span className="text-muted-foreground italic">~{formatBlockTime(referenceTime)}</span>
                          </div>
                        )}
                        
                        {/* Calories - only shown if blockDuration exists */}
                        {calories && (
                          <div className="flex items-center gap-2 text-sm">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-orange-500 font-medium">~{calories} kcal</span>
                          </div>
                        )}
                        
                        {/* PSE */}
                        {pseInfo && (
                          <div className="flex items-center gap-2 text-sm">
                            <Target className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">PSE:</span>
                            <span className={`font-medium ${pseInfo.colorClass}`}>
                              {effectivePSE}/10
                            </span>
                          </div>
                        )}
                        
                        {/* Pace */}
                        {effectivePace && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Pace:</span>
                            <span className="font-medium text-foreground">{formatPace(effectivePace)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Finish Button */}
        <motion.button
          onClick={handleFinishWorkout}
          disabled={!allBlocksComplete && !!mainWod}
          className={`
            w-full font-display text-xl tracking-wider px-8 py-5 rounded-lg transition-all
            flex items-center justify-center gap-3
            ${allBlocksComplete || !mainWod
              ? 'bg-primary text-primary-foreground hover:opacity-90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
            }
          `}
          whileHover={allBlocksComplete || !mainWod ? { scale: 1.01 } : {}}
          whileTap={allBlocksComplete || !mainWod ? { scale: 0.99 } : {}}
        >
          {mainWod ? 'REGISTRAR RESULTADO' : 'FINALIZAR TREINO'}
          <Play className="w-5 h-5" />
        </motion.button>

        {!allBlocksComplete && mainWod && (
          <p className="text-center text-muted-foreground text-sm mt-4">
            Complete todos os blocos para registrar seu resultado
          </p>
        )}

        {/* Equipment Substitution Button - Bottom */}
        <button
          onClick={() => setIsEquipmentModalOpen(true)}
          className="w-full mt-6 py-3 px-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <Wrench className="w-4 h-4" />
          <span className="font-display text-sm tracking-wide">SUBSTITUIÇÕES DE EQUIPAMENTOS</span>
        </button>
      </main>

      {/* Equipment Adaptation Modal */}
      <EquipmentAdaptModal
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
        onApply={handleApplyEquipmentAdaptation}
        initialSelection={savedUnavailableEquipment}
      />
    </div>
  );
}
