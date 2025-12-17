import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { DAY_NAMES } from '@/types/outlier';
import { ArrowLeft, Check, Clock, Play } from 'lucide-react';

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
  const { selectedWorkout, setCurrentView } = useOutlierStore();
  const [completedBlocks, setCompletedBlocks] = useState<string[]>([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);

  if (!selectedWorkout) {
    setCurrentView('dashboard');
    return null;
  }

  const toggleBlockComplete = (blockId: string) => {
    setCompletedBlocks((prev) =>
      prev.includes(blockId)
        ? prev.filter((id) => id !== blockId)
        : [...prev, blockId]
    );
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
                      toggleBlockComplete(block.id);
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
