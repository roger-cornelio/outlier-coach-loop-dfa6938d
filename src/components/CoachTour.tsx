/**
 * CoachTour - 5-step guided overlay for coach dashboard
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TOUR_STEPS } from '@/hooks/useCoachOnboardingTour';

interface CoachTourProps {
  active: boolean;
  step: number;
  totalSteps: number;
  stepData: { id: string; title: string; description: string; icon: string };
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function CoachTour({ active, step, totalSteps, stepData, onNext, onPrev, onSkip }: CoachTourProps) {
  if (!active) return null;

  const progress = ((step + 1) / totalSteps) * 100;
  const isFirst = step === 0;
  const isLast = step === totalSteps - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="coach-tour"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onSkip} />

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <button
              onClick={onSkip}
              className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
              aria-label="Pular tour"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-5">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-2 tracking-wide">
                {step + 1} de {totalSteps}
              </p>
            </div>

            <div className="px-6 pt-6 pb-4 text-center">
              <motion.div
                key={`tour-icon-${step}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="text-5xl mb-5"
              >
                {stepData.icon}
              </motion.div>

              <h2 className="font-display text-xl md:text-2xl tracking-wide font-bold text-foreground mb-3">
                {stepData.title}
              </h2>

              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {stepData.description}
              </p>
            </div>

            <div className="flex justify-center gap-1.5 py-3">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === step ? 'bg-primary w-6' : i < step ? 'bg-primary/40' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <div className="px-6 pb-6 pt-2 flex items-center gap-3">
              {!isFirst && (
                <Button variant="ghost" size="sm" onClick={onPrev} className="gap-1">
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </Button>
              )}
              {isFirst && (
                <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
                  Pular
                </Button>
              )}
              <div className="flex-1" />
              <Button onClick={onNext} size="sm" className="gap-1 min-w-[120px]">
                {isLast ? (
                  'Começar! 🔥'
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
