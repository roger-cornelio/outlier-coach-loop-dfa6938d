/**
 * COACH STYLE CHANGER
 * 
 * Componente para alterar o estilo do treinador em Configurações.
 * Aplica mudança imediatamente e exibe toast personalizado por estilo.
 * 
 * IMPORTANTE: Não reutiliza a tela de seleção inicial (WelcomeScreen).
 * A tela de escolha é exclusiva do primeiro acesso.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { useCoachStylePersistence } from '@/hooks/useCoachStylePersistence';
import type { CoachStyle } from '@/types/outlier';
import { getCoachCopy } from '@/config/coachCopy';
import { Flame, Heart, Zap, Check, Loader2 } from 'lucide-react';

// Integrated coach messages (exact text per style - universal language)
const coachMessages: Record<CoachStyle, string> = {
  IRON: 'Irmão, daqui pra frente é direto e sem desculpa.',
  PULSE: 'Você escolheu bem. Constância com direção — vamos construir isso juntos.',
  SPARK: 'Agora é energia alta e ritmo forte. Bora acelerar.',
};

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
  const [savingStyle, setSavingStyle] = useState<CoachStyle | null>(null);
  const [showCoachMessage, setShowCoachMessage] = useState<CoachStyle | null>(null);

  const currentOption = coachOptions.find(o => o.style === coachStyle);
  const CurrentIcon = currentOption?.icon || Flame;

  const handleSelectStyle = async (style: CoachStyle) => {
    if (style === coachStyle) {
      // Same style - just close
      setIsExpanded(false);
      return;
    }
    
    setSavingStyle(style);
    
    const result = await saveCoachStyle(style);
    
    if (result.success) {
      // Show integrated coach message (10 seconds with fade-out)
      setShowCoachMessage(style);
      setIsExpanded(false);
      
      setTimeout(() => {
        setShowCoachMessage(null);
      }, 10000);
    }
    
    setSavingStyle(null);
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

  // Get institutional copy
  const coachCopy = getCoachCopy(coachStyle || 'PULSE');

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <h2 className="font-display text-2xl mb-2">ESTILO DO TREINADOR</h2>
      
      {/* Institutional note */}
      <p className="text-sm text-muted-foreground mb-4">
        {coachCopy.settings.coachStyleChangeNote}
      </p>
      
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

      {/* Subnote */}
      <p className="text-xs text-muted-foreground/70 mt-2">
        {coachCopy.settings.coachStyleChangeSubnote}
      </p>

      {/* Expanded Options - Direct selection, no confirmation modal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            {coachOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = option.style === coachStyle;
              const isSaving = savingStyle === option.style;
              
              return (
                <button
                  key={option.style}
                  onClick={() => handleSelectStyle(option.style)}
                  disabled={savingStyle !== null}
                  className={`
                    p-4 rounded-lg border transition-all duration-200 text-left
                    ${isSelected
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-border bg-card hover:border-muted-foreground/50'
                    }
                    ${savingStyle !== null && !isSaving ? 'opacity-50' : ''}
                  `}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    )}
                    <span className="font-display text-lg">{option.label}</span>
                    {isSelected && !isSaving && <Check className="w-4 h-4 text-primary ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Integrated Coach Message - appears after style change */}
      <AnimatePresence>
        {showCoachMessage && (() => {
          const messageOption = coachOptions.find(o => o.style === showCoachMessage);
          const MessageIcon = messageOption?.icon || Flame;
          
          return (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="mt-10 flex justify-center"
            >
              <div className="w-full max-w-lg px-10 py-8 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border border-primary/30 shadow-lg shadow-primary/10">
                <div className="flex flex-col items-center gap-4">
                  {/* Coach icon with pulse animation (3 cycles) */}
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ 
                      duration: 0.8, 
                      ease: 'easeInOut',
                      repeat: 2,
                      repeatDelay: 0.2
                    }}
                    className="p-4 rounded-full bg-primary/20 ring-2 ring-primary/30"
                  >
                    <MessageIcon className="w-8 h-8 text-primary" />
                  </motion.div>
                  
                  {/* Coach name - uppercase, bold, brand orange */}
                  <span className="font-display text-2xl uppercase tracking-[0.2em] font-bold text-primary">
                    {showCoachMessage}
                  </span>
                  
                  {/* Coach message - white, larger, expressive */}
                  <p className="text-lg md:text-xl text-white font-medium italic text-center leading-relaxed">
                    "{coachMessages[showCoachMessage]}"
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </motion.section>
  );
}
