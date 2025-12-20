import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface EquipmentAdaptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (unavailableEquipment: string[]) => void;
  initialSelection?: string[];
}

// Os 4 equipamentos específicos para adaptação HYROX
const EQUIPMENT_OPTIONS = [
  { id: 'sled', label: 'Sled (Push/Pull)', emoji: '🛷' },
  { id: 'skierg', label: 'SkiErg', emoji: '⛷️' },
  { id: 'rower', label: 'Remo (Row)', emoji: '🚣' },
  { id: 'bike', label: 'Bike / Assault Bike', emoji: '🚴' },
];

export function EquipmentAdaptModal({ 
  isOpen, 
  onClose, 
  onApply,
  initialSelection = [] 
}: EquipmentAdaptModalProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(initialSelection);

  // Sincronizar com initialSelection quando modal abre
  useEffect(() => {
    if (isOpen) {
      setSelectedEquipment(initialSelection);
    }
  }, [isOpen, initialSelection]);

  const toggleEquipment = (id: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    onApply(selectedEquipment);
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
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Bottom Sheet Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:w-[calc(100%-2rem)]"
          >
            <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden">
              {/* Handle bar for mobile */}
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between p-5 pb-3">
                <div className="flex-1 pr-4">
                  <h2 className="font-display text-xl mb-1">AJUSTAR TREINO PARA O MEU BOX</h2>
                  <p className="text-muted-foreground text-sm">
                    Marque o que você <strong>NÃO</strong> tem. Eu adapto sem mudar o estímulo.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors -mt-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="px-5 pb-5 space-y-4">
                {/* Equipment Options */}
                <div className="space-y-2">
                  {EQUIPMENT_OPTIONS.map((item) => {
                    const isSelected = selectedEquipment.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleEquipment(item.id)}
                        className={`
                          w-full p-4 rounded-lg border-2 transition-all duration-200 
                          flex items-center gap-3 text-left
                          ${isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-secondary/30 hover:border-muted-foreground/50'
                          }
                        `}
                      >
                        <span className="text-2xl">{item.emoji}</span>
                        <span className="font-display text-base flex-1">{item.label}</span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                          >
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Apply Button */}
                <button
                  onClick={handleApply}
                  className="w-full font-display text-lg tracking-wider px-6 py-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  APLICAR ADAPTAÇÕES
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
