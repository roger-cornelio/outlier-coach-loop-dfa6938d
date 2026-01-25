import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusCrownPreset } from '@/components/ui/StatusCrownPreset';
import type { AthleteStatus } from '@/types/outlier';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LevelUpModal — Modal de Subida de Nível Premium
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Visual refinado: paleta reduzida (amarelo HYROX PRO, branco, preto),
 * hierarquia emocional clara, experiência de conquista premium.
 */

interface LevelUpModalProps {
  isOpen: boolean;
  newStatus: AthleteStatus;
  onContinue: () => void;
}

// Configuração visual por nível
const STATUS_CONFIG: Record<AthleteStatus, {
  label: string;
  crownColor: string;
}> = {
  iniciante: {
    label: 'INICIANTE',
    crownColor: 'text-slate-300',
  },
  intermediario: {
    label: 'INTERMEDIÁRIO',
    crownColor: 'text-emerald-400',
  },
  avancado: {
    label: 'AVANÇADO',
    crownColor: 'text-orange-400',
  },
  hyrox_open: {
    label: 'HYROX OPEN',
    crownColor: 'text-purple-400',
  },
  hyrox_pro: {
    label: 'HYROX PRO',
    crownColor: 'text-amber-400',
  },
};

// Partículas sutis (máximo 20% opacidade)
function SubtleParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/20"
          initial={{ 
            x: Math.random() * 300 - 150, 
            y: 500,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{ 
            y: -50,
            x: Math.random() * 300 - 150,
            opacity: [0.15, 0.2, 0]
          }}
          transition={{
            duration: Math.random() * 4 + 3,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: 'easeOut'
          }}
          style={{ left: `${Math.random() * 100}%` }}
        />
      ))}
    </div>
  );
}

export function LevelUpModal({ isOpen, newStatus, onContinue }: LevelUpModalProps) {
  const [showContent, setShowContent] = useState(false);
  const config = STATUS_CONFIG[newStatus];

  // Delay content for dramatic effect
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Dark Overlay - uniforme, sem gradientes fortes */}
          <div className="absolute inset-0 bg-zinc-950" />
          
          {/* Partículas sutis */}
          <SubtleParticles />

          {/* Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 150, 
              damping: 20,
              delay: 0.2 
            }}
            className="relative z-10 flex flex-col items-center text-center px-8 max-w-lg"
          >
            {/* Título menor com letter-spacing */}
            <AnimatePresence>
              {showContent && (
                <motion.p
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-xs font-medium text-white/50 uppercase tracking-[0.3em] mb-10"
                >
                  Novo Status Alcançado
                </motion.p>
              )}
            </AnimatePresence>

            {/* Coroa como elemento central dominante */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 180, 
                    damping: 15,
                    delay: 0.3 
                  }}
                  className="relative mb-12"
                >
                  {/* Glow suave circular atrás da coroa */}
                  <div 
                    className="absolute inset-0 -m-8 rounded-full blur-3xl opacity-30"
                    style={{ background: 'radial-gradient(circle, #FBBF24 0%, transparent 70%)' }}
                  />
                  
                  {/* Coroa grande */}
                  <div className="relative">
                    <StatusCrownPreset size="hero" colorClass="text-amber-400" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status Label - ponto focal textual principal */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mb-10"
                >
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-wide">
                    ATLETA {config.label}
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mensagem emocional - estilo editorial */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mb-14 space-y-1"
                >
                  <p className="text-base text-white/40 font-light tracking-wide">
                    Você não está na média.
                  </p>
                  <p className="text-base text-white/60 font-normal tracking-wide">
                    Você está fora da curva.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA - elegante, sólido */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <Button
                    onClick={onContinue}
                    size="lg"
                    className={cn(
                      'px-10 py-5 text-sm font-semibold uppercase tracking-widest',
                      'bg-amber-400 hover:bg-amber-500',
                      'text-zinc-900',
                      'rounded-lg',
                      'transition-colors duration-300'
                    )}
                  >
                    Continuar como Outlier
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
