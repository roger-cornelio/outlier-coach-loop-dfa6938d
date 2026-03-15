import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ShieldCrest } from '@/components/ui/ShieldCrest';
import { ChevronRight } from 'lucide-react';
import type { AthleteStatus } from '@/types/outlier';

interface LevelUpModalProps {
  isOpen: boolean;
  newStatus: AthleteStatus;
  isOutlier?: boolean;
  onContinue: () => void;
}

const STATUS_CONFIG: Record<AthleteStatus, {
  label: string;
  accentHsl: string;
  levelKey: 'OPEN' | 'PRO' | 'ELITE';
  nextLabel: string | null;
}> = {
  open: { label: 'OPEN', accentHsl: '271 81% 56%', levelKey: 'OPEN', nextLabel: 'PRO OUTLIER' },
  pro: { label: 'PRO', accentHsl: '45 93% 58%', levelKey: 'PRO', nextLabel: 'ELITE OUTLIER' },
  elite: { label: 'ELITE', accentHsl: '50 95% 65%', levelKey: 'ELITE', nextLabel: null },
};

function CelebrationParticles({ accentHsl }: { accentHsl: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            backgroundColor: `hsl(${accentHsl} / ${Math.random() * 0.4 + 0.1})`,
            left: `${Math.random() * 100}%`,
          }}
          initial={{ y: '100vh', opacity: 0, scale: 0 }}
          animate={{
            y: '-20vh',
            opacity: [0, 0.6, 0],
            scale: [0, 1.5, 0.5],
          }}
          transition={{
            duration: Math.random() * 5 + 4,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

export function LevelUpModal({ isOpen, newStatus, isOutlier = false, onContinue }: LevelUpModalProps) {
  const [showContent, setShowContent] = useState(false);
  const config = STATUS_CONFIG[newStatus];

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
          {/* Background */}
          <div className="absolute inset-0 bg-zinc-950" />

          {/* Particles */}
          <CelebrationParticles accentHsl={config.accentHsl} />

          {/* Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.15 }}
            className="relative z-10 flex flex-col items-center text-center px-8 max-w-md"
          >
            {/* Subheading */}
            <AnimatePresence>
              {showContent && (
                <motion.p
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-xs font-medium text-white/50 uppercase tracking-[0.3em] mb-8"
                >
                  Novo Status Alcançado
                </motion.p>
              )}
            </AnimatePresence>

            {/* Shield — Big, pulsating, glowing */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 120,
                    damping: 14,
                    delay: 0.25,
                  }}
                  className="relative mb-10"
                >
                  {/* Multi-layer glow */}
                  <motion.div
                    className="absolute inset-0 -m-20 rounded-full blur-[100px]"
                    style={{ backgroundColor: `hsl(${config.accentHsl} / 0.35)` }}
                    animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.5, 0.35] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="absolute inset-0 -m-12 rounded-full blur-2xl"
                    style={{ backgroundColor: `hsl(${config.accentHsl} / 0.2)` }}
                    animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.35, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                  />

                  {/* Shield image — pulsating */}
                  <motion.div
                    className="relative w-56 h-56 md:w-72 md:h-72"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ShieldCrest
                      level={config.levelKey}
                      active={true}
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Level Label */}
            <AnimatePresence>
              {showContent && (
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-3xl md:text-5xl font-display font-bold text-white uppercase tracking-wide mb-4"
                >
                  {isOutlier ? `${config.label} OUTLIER` : `Categoria ${config.label}`}
                </motion.h1>
              )}
            </AnimatePresence>

            {/* Decorative line */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="w-16 h-px mb-8"
                  style={{ backgroundColor: `hsl(${config.accentHsl} / 0.5)` }}
                />
              )}
            </AnimatePresence>

            {/* Manifesto */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.65 }}
                  className="mb-12 space-y-1"
                >
                  {isOutlier ? (
                    <>
                      <p className="text-base text-white/40 font-light italic">
                        Você não está na média.
                      </p>
                      <p className="text-lg text-white/70 font-semibold italic">
                        Você está fora da curva.
                      </p>
                    </>
                  ) : (
                    <p className="text-base text-white/50 font-light italic">
                      Sua categoria foi atualizada. Continue treinando para conquistar o título OUTLIER.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <Button
                    onClick={onContinue}
                    className={cn(
                      'px-10 py-6 text-sm font-semibold uppercase tracking-wider',
                      'bg-amber-400 hover:bg-amber-500',
                      'text-zinc-900',
                      'rounded-xl',
                      'border-0 shadow-lg shadow-amber-400/20',
                      'transition-all duration-200 hover:shadow-xl hover:shadow-amber-400/30',
                      'flex items-center gap-2'
                    )}
                  >
                    {config.nextLabel
                      ? `Avançar para ${config.nextLabel}`
                      : `Você é ${config.label} OUTLIER`}
                    {config.nextLabel && <ChevronRight className="w-5 h-5" />}
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
