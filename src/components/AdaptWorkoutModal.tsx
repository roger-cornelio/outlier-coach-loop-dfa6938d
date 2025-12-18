import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface AdaptWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (adaptations: AdaptationConfig) => void;
}

export interface AdaptationConfig {
  unavailableEquipment: string[];
  otherNotes: string;
}

// Apenas os 4 equipamentos HYROX que podem gerar adaptação
const equipmentOptions = [
  { id: 'skierg', label: 'SkiErg', emoji: '⛷️' },
  { id: 'rower', label: 'Remo Ergômetro', emoji: '🚣' },
  { id: 'bike', label: 'Assault Bike', emoji: '🚴' },
  { id: 'sled', label: 'Sled (Push / Pull)', emoji: '🛷' },
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
    toast.success(
      'Configuração salva com sucesso. O treino exibido considera suas preferências atuais.',
      { duration: 4000 }
    );
    onClose();
  };

  const handleClear = () => {
    setSelectedEquipment([]);
    setOtherNotes('');
    onSave({
      unavailableEquipment: [],
      otherNotes: '',
    });
    toast.success('Configurações de adaptação limpas.');
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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg z-50"
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex-1 pr-4">
                  <h2 className="font-display text-2xl mb-2">ADAPTAR TREINO POR EQUIPAMENTO</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Selecione os equipamentos que você <strong>NÃO</strong> tem acesso hoje.
                    O OUTLIER ajusta o treino para manter o estímulo correto, respeitando o padrão HYROX.
                  </p>
                  <p className="text-muted-foreground/70 text-xs mt-2 italic">
                    Esta função está em evolução e fará adaptações cada vez mais precisas.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors self-start"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Equipment Section */}
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Marque apenas se esse equipamento não estiver disponível no seu treino de hoje.
                  </p>

                  {/* Equipment Options */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
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
                        <span className="font-display text-base flex-1 text-left">{item.label}</span>
                        {selectedEquipment.includes(item.id) && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground/70 italic">
                    As substituições priorizam o mesmo estímulo metabólico e muscular do treino original.
                  </p>
                </div>

                {/* Other Notes Section */}
                <div>
                  <label className="block font-display text-base mb-2">
                    OUTROS AJUSTES <span className="font-body text-sm text-muted-foreground">(opcional)</span>
                  </label>
                  <textarea
                    value={otherNotes}
                    onChange={(e) => setOtherNotes(e.target.value)}
                    placeholder="Ex: box pequeno, restrição temporária, lesão leve, adaptação específica."
                    className="w-full h-24 px-4 py-3 rounded-lg bg-secondary border border-border font-body text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
                  />
                  <p className="text-xs text-muted-foreground/70 mt-2 italic">
                    Essas informações ajudam o sistema e o coach a evoluir as adaptações.
                    Nem todos os ajustes são aplicados automaticamente nesta versão.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
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
