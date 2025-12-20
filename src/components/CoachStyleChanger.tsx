/**
 * COACH STYLE CHANGER
 * 
 * Componente para alterar o estilo do treinador em Configurações.
 * Exibe o estilo atual e permite mudança com confirmação.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { useCoachStylePersistence } from '@/hooks/useCoachStylePersistence';
import type { CoachStyle } from '@/types/outlier';
import { Flame, Heart, Zap, Check, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const coachOptions: { style: CoachStyle; label: string; icon: typeof Flame; description: string }[] = [
  { 
    style: 'IRON', 
    label: 'IRON', 
    icon: Flame,
    description: 'Comando direto e cobrança intensa'
  },
  { 
    style: 'PULSE', 
    label: 'PULSE', 
    icon: Heart,
    description: 'Apoio emocional e motivação constante'
  },
  { 
    style: 'SPARK', 
    label: 'SPARK', 
    icon: Zap,
    description: 'Energia explosiva e desafios dinâmicos'
  },
];

interface CoachStyleChangerProps {
  compact?: boolean;
}

export function CoachStyleChanger({ compact = false }: CoachStyleChangerProps) {
  const { coachStyle } = useOutlierStore();
  const { saveCoachStyle } = useCoachStylePersistence();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<CoachStyle | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentOption = coachOptions.find(o => o.style === coachStyle);
  const CurrentIcon = currentOption?.icon || Flame;

  const handleSelectStyle = (style: CoachStyle) => {
    if (style === coachStyle) {
      // Same style - just close
      setIsExpanded(false);
      return;
    }
    
    setSelectedStyle(style);
    setShowConfirmation(true);
  };

  const handleConfirmChange = async () => {
    if (!selectedStyle) return;
    
    setIsSaving(true);
    
    const result = await saveCoachStyle(selectedStyle);
    
    if (result.success) {
      toast.success(`Estilo alterado para ${selectedStyle}`);
      setShowConfirmation(false);
      setIsExpanded(false);
      setSelectedStyle(null);
    } else {
      toast.error('Erro ao salvar. Tente novamente.');
    }
    
    setIsSaving(false);
  };

  const handleCancelChange = () => {
    setShowConfirmation(false);
    setSelectedStyle(null);
  };

  if (compact) {
    // Versão compacta para exibição em header/sidebar
    return (
      <div className="flex items-center gap-2 text-sm">
        <CurrentIcon className="w-4 h-4 text-primary" />
        <span className="font-display tracking-wide">{coachStyle}</span>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <h2 className="font-display text-2xl mb-4">ESTILO DO TREINADOR</h2>
      
      {/* Current Style Display */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full p-4 rounded-lg border transition-all duration-200 text-left
          flex items-center justify-between
          ${isExpanded 
            ? 'border-primary bg-primary/10' 
            : 'border-border bg-card hover:border-muted-foreground/50'
          }
        `}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary text-primary-foreground">
            <CurrentIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="font-display text-xl tracking-wide">{coachStyle || 'Não definido'}</p>
            <p className="text-sm text-muted-foreground">{currentOption?.description}</p>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">
          {isExpanded ? 'Fechar' : 'Alterar'}
        </span>
      </button>

      {/* Expanded Options */}
      <AnimatePresence>
        {isExpanded && !showConfirmation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            {coachOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = option.style === coachStyle;
              
              return (
                <button
                  key={option.style}
                  onClick={() => handleSelectStyle(option.style)}
                  className={`
                    p-4 rounded-lg border transition-all duration-200 text-left
                    ${isSelected
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-border bg-card hover:border-muted-foreground/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-display text-lg">{option.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmation && selectedStyle && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-5 rounded-lg border border-amber-500/30 bg-amber-500/10"
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground mb-1">Confirmar alteração?</p>
                <p className="text-sm text-muted-foreground">
                  Você está alterando de <strong>{coachStyle}</strong> para <strong>{selectedStyle}</strong>.
                  O estilo do treinador afeta todo o tom das mensagens e feedbacks do app.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelChange}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmChange}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
