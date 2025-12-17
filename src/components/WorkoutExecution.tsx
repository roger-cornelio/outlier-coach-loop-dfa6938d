import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { DAY_NAMES } from '@/types/outlier';
import { ArrowLeft, Check, Clock, Play, Flame } from 'lucide-react';
import { getEstimatedTimeForLevel, calculateCalories, formatBlockTime } from '@/utils/workoutCalculations';
import { toast } from 'sonner';

const blockTypeColors: Record<string, string> = {
  aquecimento: 'border-l-amber-500',
  conditioning: 'border-l-primary',
  forca: 'border-l-red-500',
  especifico: 'border-l-purple-500',
  core: 'border-l-blue-500',
  corrida: 'border-l-green-500',
  notas: 'border-l-muted-foreground',
};

// Coach-specific motivational messages for block completion
const getCompletionMessage = (coachStyle: string | undefined, blockType: string, blocksRemaining: number) => {
  const isLastBlock = blocksRemaining === 0;
  
  const messages = {
    IRON: {
      aquecimento: ['Aquecimento feito. Agora o trabalho começa.', 'Corpo preparado. Foco no que vem.'],
      conditioning: ['Etapa concluída. Mantenha o ritmo.', 'Bloco finalizado. Sem tempo pra descanso mental.'],
      forca: ['Força registrada. Continue construindo.', 'Bloco de força completo. Isso soma.'],
      especifico: ['Trabalho específico feito. É isso que diferencia.', 'Etapa crítica concluída.'],
      core: ['Core ativado. Fundação sólida.', 'Estabilidade garantida. Próximo.'],
      corrida: ['Corrida concluída. Pernas prontas.', 'Cardio na conta. Siga em frente.'],
      default: ['Feito. Próximo.', 'Concluído. Continue.'],
      final: ['Treino completo. Você fez o que precisava.', 'Missão cumprida. Descanse com mérito.']
    },
    SPARK: {
      aquecimento: ['Aquecimento check! 🔥 Bora pro show!', 'Corpo ligado! ✨ Vamos nessa!'],
      conditioning: ['ISSO AÍ! 💪 Arrasou no conditioning!', 'Boaaa! 🚀 Tá voando!'],
      forca: ['Força mode ON! 💪 Que fase!', 'Pesado demais! 🔥 Continua assim!'],
      especifico: ['Específico DONE! 🎯 Foco total!', 'Mandou bem! 🚀 É assim que se faz!'],
      core: ['Core ativado! 💪 Barriga de aço!', 'Check no core! ✨ Firme e forte!'],
      corrida: ['Corrida check! 🏃 Tá on fire!', 'Cardio feito! 🔥 Energia pura!'],
      default: ['Mais um! 💪 Vamo que vamo!', 'Check! ✨ Tá demais!'],
      final: ['TREINO COMPLETO! 🎉🔥 Você é incrível!', 'FINALIZOU! 🚀 Isso foi LINDO!']
    },
    PULSE: {
      aquecimento: ['Aquecimento concluído. Seu corpo agradece esse cuidado.', 'Boa preparação. Agora você está pronto.'],
      conditioning: ['Ótimo trabalho no conditioning. Você está construindo resistência.', 'Bloco desafiador concluído. Isso é consistência.'],
      forca: ['Força feita com presença. Cada rep conta.', 'Bloco de força completo. Você está mais forte.'],
      especifico: ['Trabalho específico feito. Evolução acontecendo.', 'Etapa importante concluída. Continue assim.'],
      core: ['Core trabalhado. Base sólida pra tudo.', 'Estabilidade em dia. Bom trabalho.'],
      corrida: ['Corrida concluída. Coração mais forte.', 'Cardio feito. Cada passo importa.'],
      default: ['Mais um bloco feito. Continue presente.', 'Concluído. Você está no caminho certo.'],
      final: ['Treino completo. Você apareceu e entregou. Isso é o que importa.', 'Finalizado. Descanse bem, você merece.']
    }
  };

  const style = coachStyle as keyof typeof messages || 'PULSE';
  const coachMessages = messages[style] || messages.PULSE;
  
  if (isLastBlock) {
    const finalMessages = coachMessages.final;
    return finalMessages[Math.floor(Math.random() * finalMessages.length)];
  }
  
  const typeMessages = coachMessages[blockType as keyof typeof coachMessages] || coachMessages.default;
  return typeMessages[Math.floor(Math.random() * typeMessages.length)];
};

export function WorkoutExecution() {
  const { selectedWorkout, setCurrentView, athleteConfig } = useOutlierStore();
  const [completedBlocks, setCompletedBlocks] = useState<string[]>([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);

  if (!selectedWorkout) {
    setCurrentView('dashboard');
    return null;
  }

  const toggleBlockComplete = (blockId: string, blockType: string) => {
    const isCompleting = !completedBlocks.includes(blockId);
    
    setCompletedBlocks((prev) =>
      prev.includes(blockId)
        ? prev.filter((id) => id !== blockId)
        : [...prev, blockId]
    );

    // Show motivational toast when completing a block
    if (isCompleting) {
      const newCompletedCount = completedBlocks.length + 1;
      const blocksRemaining = selectedWorkout.blocks.length - newCompletedCount;
      const message = getCompletionMessage(athleteConfig?.coachStyle, blockType, blocksRemaining);
      
      const toastStyle = athleteConfig?.coachStyle === 'SPARK' 
        ? { duration: 2500 }
        : { duration: 2000 };
      
      toast.success(message, toastStyle);
    }
  };

  const mainWod = selectedWorkout.blocks.find((b) => b.isMainWod);
  const allBlocksComplete = selectedWorkout.blocks.every((b) => completedBlocks.includes(b.id));

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
              <h1 className="font-display text-2xl">{DAY_NAMES[selectedWorkout.day]}</h1>
              <p className="text-sm text-muted-foreground">{selectedWorkout.stimulus}</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{selectedWorkout.estimatedTime}min</span>
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
            width: `${(completedBlocks.length / selectedWorkout.blocks.length) * 100}%` 
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Workout Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-4 mb-8">
          {selectedWorkout.blocks.map((block, index) => {
            const isComplete = completedBlocks.includes(block.id);
            const isCurrent = index === currentBlockIndex;
            const estimatedTime = athleteConfig 
              ? getEstimatedTimeForLevel(block, athleteConfig.level)
              : null;
            const calories = athleteConfig 
              ? calculateCalories(block, athleteConfig, estimatedTime)
              : null;

            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  card-elevated p-6 border-l-4 transition-all duration-300
                  ${blockTypeColors[block.type] || 'border-l-border'}
                  ${isComplete ? 'opacity-60' : ''}
                  ${block.isMainWod ? 'ring-2 ring-primary/50' : ''}
                `}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => {
                      toggleBlockComplete(block.id, block.type);
                      if (!isComplete && index === currentBlockIndex) {
                        setCurrentBlockIndex(Math.min(index + 1, selectedWorkout.blocks.length - 1));
                      }
                    }}
                    className={`
                      mt-1 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
                      ${isComplete
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/30 hover:border-primary'
                      }
                    `}
                  >
                    {isComplete && <Check className="w-4 h-4" />}
                  </button>

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
                      {block.content}
                    </pre>

                    {/* Block Stats */}
                    {(estimatedTime || calories) && block.type !== 'notas' && (
                      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
                        {estimatedTime && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Tempo:</span>
                            <span className="font-medium text-foreground">{formatBlockTime(estimatedTime)}</span>
                          </div>
                        )}
                        {calories && (
                          <div className="flex items-center gap-2 text-sm">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-orange-500 font-medium">~{calories} kcal</span>
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
      </main>
    </div>
  );
}
