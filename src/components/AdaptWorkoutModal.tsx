import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOutlierStore } from '@/store/outlierStore';
import { DAY_NAMES, type DayOfWeek } from '@/types/outlier';

interface AdaptWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (adaptations: AdaptationConfig) => void;
  activeDay?: DayOfWeek;
}

export interface AdaptationConfig {
  unavailableEquipment: string[];
  otherNotes: string;
}

const equipmentOptions = [
  { id: 'ski', label: 'SKI', emoji: '⛷️' },
  { id: 'remo', label: 'REMO', emoji: '🚣' },
  { id: 'sled', label: 'SLED', emoji: '🛷' },
  { id: 'wallball', label: 'WALL BALL', emoji: '🏐' },
];

export function AdaptWorkoutModal({ isOpen, onClose, onSave, activeDay = 'seg' }: AdaptWorkoutModalProps) {
  const { athleteConfig, weeklyWorkouts } = useOutlierStore();
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [otherNotes, setOtherNotes] = useState('');
  const [isAdapting, setIsAdapting] = useState(false);
  const [adaptedWorkout, setAdaptedWorkout] = useState<string | null>(null);

  const currentWorkout = weeklyWorkouts.find((w) => w.day === activeDay);

  const toggleEquipment = (id: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleAdaptWorkout = async () => {
    if (!athleteConfig) {
      toast.error('Configure o perfil do atleta primeiro');
      return;
    }

    setIsAdapting(true);
    setAdaptedWorkout(null);

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
          workout: currentWorkout ? {
            day: DAY_NAMES[currentWorkout.day],
            stimulus: currentWorkout.stimulus,
            blocks: currentWorkout.blocks,
          } : null,
          adaptations: {
            unavailableEquipment: selectedEquipment,
            otherNotes,
          },
        },
      });

      if (error) throw error;

      if (data?.message) {
        // No workout for this day
        setAdaptedWorkout(data.message);
      } else if (data?.adaptedWorkout) {
        setAdaptedWorkout(data.adaptedWorkout);
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (err) {
      console.error('Error adapting workout:', err);
      toast.error('Erro ao adaptar treino. Tente novamente.');
    } finally {
      setIsAdapting(false);
    }
  };

  const handleSave = () => {
    onSave({
      unavailableEquipment: selectedEquipment,
      otherNotes,
    });
    onClose();
  };

  const handleClear = () => {
    setSelectedEquipment([]);
    setOtherNotes('');
    setAdaptedWorkout(null);
  };

  const handleClose = () => {
    setAdaptedWorkout(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50 max-h-[85vh] overflow-hidden flex flex-col"
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                <h2 className="font-display text-2xl">ADAPTAR TREINO</h2>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto">
                {!adaptedWorkout ? (
                  <>
                    <p className="text-muted-foreground text-sm mb-6">
                      Selecione os equipamentos que você <strong>NÃO</strong> possui para receber adaptações alternativas.
                    </p>

                    {/* Equipment Options */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {equipmentOptions.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => toggleEquipment(item.id)}
                          className={`
                            p-4 rounded-lg border-2 transition-all duration-200 flex items-center gap-3
                            ${selectedEquipment.includes(item.id)
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-secondary/50 hover:border-muted-foreground/50'
                            }
                          `}
                        >
                          <span className="text-2xl">{item.emoji}</span>
                          <span className="font-display text-lg flex-1 text-left">{item.label}</span>
                          {selectedEquipment.includes(item.id) && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Other Notes */}
                    <div className="mb-6">
                      <label className="block font-display text-lg mb-2">OUTROS</label>
                      <textarea
                        value={otherNotes}
                        onChange={(e) => setOtherNotes(e.target.value)}
                        placeholder="Descreva outros equipamentos que não possui ou necessidades especiais de adaptação..."
                        className="w-full h-24 px-4 py-3 rounded-lg bg-secondary border border-border font-body text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleAdaptWorkout}
                        disabled={isAdapting || (!selectedEquipment.length && !otherNotes)}
                        className="flex-1 font-display text-lg tracking-wider px-6 py-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isAdapting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            ADAPTANDO...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-5 h-5" />
                            GERAR ADAPTAÇÃO
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-6 py-4 rounded-lg border border-border hover:bg-secondary transition-colors font-body text-sm"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={handleClear}
                        className="px-6 py-4 rounded-lg border border-border hover:bg-secondary transition-colors font-body text-sm"
                      >
                        Limpar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Adapted Workout Result */}
                    <div className="mb-6">
                      <h3 className="font-display text-xl mb-4 text-primary">
                        TREINO ADAPTADO - {DAY_NAMES[activeDay]}
                      </h3>
                      <div className="bg-secondary/50 rounded-lg p-4 border border-border">
                        <pre className="font-body text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {adaptedWorkout}
                        </pre>
                      </div>
                    </div>

                    {/* Back Button */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setAdaptedWorkout(null)}
                        className="flex-1 font-display text-lg tracking-wider px-6 py-4 rounded-lg border border-border hover:bg-secondary transition-colors"
                      >
                        VOLTAR
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex-1 font-display text-lg tracking-wider px-6 py-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        APLICAR
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
