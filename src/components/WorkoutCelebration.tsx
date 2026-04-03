/**
 * WorkoutCelebration
 * 
 * Overlay de celebração pós-treino com partículas e haptic feedback.
 * Auto-dismiss após 2.5s.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Flame } from 'lucide-react';
import { useWorkoutStreak } from '@/hooks/useWorkoutStreak';

interface WorkoutCelebrationProps {
  onComplete: () => void;
}

function CelebrationParticle({ index }: { index: number }) {
  const angle = (index / 16) * 360;
  const distance = 80 + Math.random() * 120;
  const x = Math.cos((angle * Math.PI) / 180) * distance;
  const y = Math.sin((angle * Math.PI) / 180) * distance;
  const size = 4 + Math.random() * 8;
  const colors = [
    'hsl(var(--primary))',
    'hsl(45, 100%, 60%)',
    'hsl(280, 80%, 60%)',
    'hsl(160, 80%, 50%)',
    'hsl(20, 100%, 60%)',
  ];
  const color = colors[index % colors.length];

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        left: '50%',
        top: '50%',
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
      animate={{
        x,
        y: y - 40,
        opacity: [1, 1, 0],
        scale: [0, 1.5, 0.5],
      }}
      transition={{
        duration: 1.5,
        delay: 0.2 + index * 0.03,
        ease: 'easeOut',
      }}
    />
  );
}

export function WorkoutCelebration({ onComplete }: WorkoutCelebrationProps) {
  const [show, setShow] = useState(true);
  const { currentStreak, isStreakActive } = useWorkoutStreak();

  useEffect(() => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }

    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 300);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Particles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <CelebrationParticle key={i} index={i} />
            ))}
          </div>

          {/* Main content */}
          <motion.div
            className="relative flex flex-col items-center gap-4 text-center px-6"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5, type: 'spring', bounce: 0.4 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <CheckCircle2 className="w-20 h-20 text-primary" strokeWidth={1.5} />
            </motion.div>

            <motion.h2
              className="text-2xl sm:text-3xl font-black tracking-tight text-foreground"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              TREINO COMPLETO!
            </motion.h2>

            <motion.p
              className="text-muted-foreground text-sm"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              Mais um passo na sua evolução 💪
            </motion.p>

            {isStreakActive && currentStreak >= 2 && (
              <motion.div
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <Flame className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold text-primary">
                  {currentStreak} dias seguidos!
                </span>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
