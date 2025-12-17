import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import type { CoachStyle } from '@/types/outlier';
import { Flame, Heart, Zap } from 'lucide-react';

const coachOptions: { style: CoachStyle; icon: React.ReactNode; title: string; description: string }[] = [
  {
    style: 'IRON',
    icon: <Flame className="w-8 h-8" />,
    title: 'IRON',
    description: 'Sério, direto e exigente. Sem desculpas.',
  },
  {
    style: 'PULSE',
    icon: <Heart className="w-8 h-8" />,
    title: 'PULSE',
    description: 'Motivador, humano e consistente.',
  },
  {
    style: 'SPARK',
    icon: <Zap className="w-8 h-8" />,
    title: 'SPARK',
    description: 'Leve, entusiasta e bem-humorado.',
  },
];

export function WelcomeScreen() {
  const { setCoachStyle, setCurrentView, coachStyle } = useOutlierStore();

  const handleSelectCoach = (style: CoachStyle) => {
    setCoachStyle(style);
  };

  const handleContinue = () => {
    if (coachStyle) {
      setCurrentView('config');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{ background: 'var(--gradient-glow)' }}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10 max-w-2xl"
      >
        {/* Logo */}
        <motion.h1 
          className="font-display text-7xl md:text-9xl tracking-wider text-gradient mb-2"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          OUTLIER
        </motion.h1>
        
        <motion.p 
          className="text-xl md:text-2xl font-display text-muted-foreground tracking-wide mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Be the Outlier. Treine para ser fora da curva.
        </motion.p>
        
        <motion.p 
          className="text-muted-foreground mb-12 max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Seu programa de treinamento HYROX personalizado. 
          Escolha seu estilo de coach e comece a jornada.
        </motion.p>

        {/* Coach Selection */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {coachOptions.map((option) => (
            <motion.button
              key={option.style}
              onClick={() => handleSelectCoach(option.style)}
              className={`
                card-elevated p-6 text-left transition-all duration-300
                ${coachStyle === option.style 
                  ? 'border-primary glow-effect' 
                  : 'hover:border-muted-foreground/50'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`
                mb-4 inline-flex p-3 rounded-lg
                ${coachStyle === option.style 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-foreground'
                }
              `}>
                {option.icon}
              </div>
              <h3 className="font-display text-2xl mb-2">{option.title}</h3>
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </motion.button>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.button
          onClick={handleContinue}
          disabled={!coachStyle}
          className={`
            font-display text-xl tracking-wider px-12 py-4 rounded-lg
            transition-all duration-300
            ${coachStyle 
              ? 'bg-primary text-primary-foreground hover:opacity-90 animate-pulse-glow' 
              : 'bg-muted text-muted-foreground cursor-not-allowed'
            }
          `}
          whileHover={coachStyle ? { scale: 1.05 } : {}}
          whileTap={coachStyle ? { scale: 0.95 } : {}}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          PRONTO PARA PERFORMAR
        </motion.button>
      </motion.div>
    </div>
  );
}
