import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface AdaptWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (adaptations: AdaptationConfig) => void;
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

export function AdaptWorkoutModal({ isOpen, onClose, onSave }: AdaptWorkoutModalProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [otherNotes, setOtherNotes] = useState('');

  const toggleEquipment = (id: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
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
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50"
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="font-display text-2xl">ADAPTAR TREINO</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
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
                    onClick={handleSave}
                    className="flex-1 font-display text-lg tracking-wider px-6 py-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    SALVAR
                  </button>
                  <button
                    onClick={handleClear}
                    className="px-6 py-4 rounded-lg border border-border hover:bg-secondary transition-colors font-body text-sm"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
