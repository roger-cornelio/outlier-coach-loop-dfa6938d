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
 * Design: Limpo, premium, emocional
 * Paleta: Amarelo HYROX PRO + Branco + Preto
 */

interface LevelUpModalProps {
  isOpen: boolean;
  newStatus: AthleteStatus;
  onContinue: () => void;
}

// Configuração visual por nível
const STATUS_CONFIG: Record<AthleteStatus, {
  label: string;
  accentHsl: string; // HSL para glow
}> = {
  open: {
    label: 'OPEN',
    accentHsl: '271 81% 56%',
  },
  pro: {
    label: 'PRO',
    accentHsl: '45 93% 58%',
  },
  elite: {
    label: 'ELITE',
    accentHsl: '50 95% 65%',
  },
};

// Subtle floating particles - reduced opacity
function SubtleParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-amber-400/15"
          initial={{ 
            x: Math.random() * 300 - 150, 
            y: 500,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{ 
            y: -50,
            x: Math.random() * 300 - 150,
            opacity: [0.1, 0.2, 0]
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
      const timer = setTimeout(() => setShowContent(true), 400);
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
          {/* Dark Background - Pure black/dark gray */}
          <div className="absolute inset-0 bg-zinc-950" />
          
          {/* Subtle Particles */}
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
              delay: 0.15 
            }}
            className="relative z-10 flex flex-col items-center text-center px-8 max-w-md"
          >
            {/* Subheading - smaller with letter-spacing */}
            <AnimatePresence>
              {showContent && (
                <motion.p
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-xs font-medium text-white/50 uppercase tracking-[0.3em] mb-12"
                >
                  Novo Status Alcançado
                </motion.p>
              )}
            </AnimatePresence>

            {/* Crown - Central dominant element with soft glow */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 180, 
                    damping: 18,
                    delay: 0.25 
                  }}
                  className="relative mb-14"
                >
                  {/* Soft circular glow behind crown */}
                  <div 
                    className="absolute inset-0 -m-8 rounded-full blur-3xl opacity-25"
                    style={{ backgroundColor: `hsl(${config.accentHsl})` }}
                  />
                  
                  {/* Crown Icon - Hero size, white */}
                  <div className="relative">
                    <StatusCrownPreset size="hero" colorClass="text-white" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Primary Status Label - Main focal point */}
            <AnimatePresence>
              {showContent && (
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-3xl md:text-4xl font-display font-bold text-white uppercase tracking-wide mb-16"
                >
                  Atleta {config.label}
                </motion.h1>
              )}
            </AnimatePresence>

            {/* Emotional Manifesto Text - Editorial style, lower contrast */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="mb-16 space-y-1"
                >
                  <p className="text-base text-white/40 font-light italic">
                    Você não está na média.
                  </p>
                  <p className="text-base text-white/60 font-medium italic">
                    Você está fora da curva.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA Button - Solid HYROX PRO Yellow, elegant */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button
                    onClick={onContinue}
                    className={cn(
                      'px-8 py-5 text-sm font-semibold uppercase tracking-wider',
                      'bg-amber-400 hover:bg-amber-500',
                      'text-zinc-900',
                      'rounded-lg',
                      'border-0 shadow-none',
                      'transition-colors duration-200'
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
