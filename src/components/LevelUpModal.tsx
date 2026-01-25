import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusCrownPreset } from '@/components/ui/StatusCrownPreset';
import type { AthleteStatus } from '@/types/outlier';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LevelUpModal — Modal de Subida de Nível com StatusCrown Canônico
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Usa <StatusCrown /> para garantir consistência pixel-perfect.
 */

interface LevelUpModalProps {
  isOpen: boolean;
  newStatus: AthleteStatus;
  onContinue: () => void;
}

// Configuração visual por nível (ícone é sempre StatusCrown)
const STATUS_CONFIG: Record<AthleteStatus, {
  label: string;
  gradient: string;
  glow: string;
  particleColor: string;
  crownColor: string;
}> = {
  iniciante: {
    label: 'INICIANTE',
    gradient: 'from-slate-500 to-slate-600',
    glow: 'shadow-slate-500/60',
    particleColor: 'bg-slate-400',
    crownColor: 'text-white/90',
  },
  intermediario: {
    label: 'INTERMEDIÁRIO',
    gradient: 'from-emerald-500 to-green-600',
    glow: 'shadow-emerald-500/60',
    particleColor: 'bg-emerald-400',
    crownColor: 'text-white/90',
  },
  avancado: {
    label: 'AVANÇADO',
    gradient: 'from-orange-500 to-red-600',
    glow: 'shadow-orange-500/60',
    particleColor: 'bg-orange-400',
    crownColor: 'text-white/90',
  },
  hyrox_open: {
    label: 'HYROX OPEN',
    gradient: 'from-purple-500 to-pink-600',
    glow: 'shadow-purple-500/60',
    particleColor: 'bg-purple-400',
    crownColor: 'text-white',
  },
  hyrox_pro: {
    label: 'HYROX PRO',
    gradient: 'from-amber-400 to-yellow-500',
    glow: 'shadow-amber-500/70',
    particleColor: 'bg-amber-400',
    crownColor: 'text-white',
  },
};

// Floating particles animation
function FloatingParticles({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className={cn('absolute w-2 h-2 rounded-full opacity-60', color)}
          initial={{ 
            x: Math.random() * 400 - 200, 
            y: 600,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{ 
            y: -100,
            x: Math.random() * 400 - 200,
            opacity: [0.6, 0.8, 0]
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 2,
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
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />
          
          {/* Floating Particles */}
          <FloatingParticles color={config.particleColor} />

          {/* Content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 200, 
              damping: 20,
              delay: 0.2 
            }}
            className="relative z-10 flex flex-col items-center text-center px-8 max-w-md"
          >
            {/* Fire Emoji Header */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: 'spring', 
                stiffness: 300, 
                damping: 15,
                delay: 0.4 
              }}
              className="mb-6"
            >
              <span className="text-6xl">🔥</span>
            </motion.div>

            {/* Title */}
            <AnimatePresence>
              {showContent && (
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-3xl md:text-4xl font-display font-bold text-white mb-8 text-status-title"
                >
                  NOVO STATUS ALCANÇADO
                </motion.h1>
              )}
            </AnimatePresence>

            {/* Avatar */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 200, 
                    damping: 15,
                    delay: 0.3 
                  }}
                  className="relative mb-8"
                >
                  {/* Outer Glow */}
                  <div 
                    className={cn(
                      'absolute -inset-6 rounded-full blur-2xl opacity-70',
                      `bg-gradient-to-br ${config.gradient}`
                    )} 
                  />
                  
                  {/* Pulsing Ring */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    className={cn(
                      'absolute -inset-4 rounded-full border-2',
                      `border-current opacity-50`
                    )}
                    style={{ color: config.particleColor.replace('bg-', 'text-').replace('400', '500') }}
                  />
                  
                  {/* Main Avatar Circle */}
                  <div
                    className={cn(
                      'relative w-40 h-40 rounded-full flex items-center justify-center',
                      'border-4 border-white/20',
                      `bg-gradient-to-br ${config.gradient}`,
                      `shadow-2xl ${config.glow}`
                    )}
                  >
                    {/* StatusCrownPreset canônico */}
                    <StatusCrownPreset size="hero" colorClass={config.crownColor} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status Label */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mb-6"
                >
                  <div 
                    className={cn(
                      'inline-flex items-center gap-3 px-6 py-3 rounded-full',
                      'border-2 font-bold uppercase tracking-wider text-xl text-status-title',
                      `bg-gradient-to-r ${config.gradient}`,
                      'text-white border-white/20'
                    )}
                  >
                    <StatusCrownPreset size="lg" colorClass="text-white" />
                    <span>ATLETA {config.label}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Identity Message */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mb-10 space-y-2"
                >
                  <p className="text-xl text-white/90 font-medium">
                    Você não está na média.
                  </p>
                  <p className="text-xl text-white font-bold">
                    Você está fora da curva.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA Button */}
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
                      'px-8 py-6 text-lg font-bold uppercase tracking-wider',
                      'bg-gradient-to-r from-primary to-primary/80',
                      'hover:from-primary/90 hover:to-primary/70',
                      'shadow-xl shadow-primary/30',
                      'transition-all duration-300 hover:scale-105'
                    )}
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    CONTINUAR COMO OUTLIER
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
