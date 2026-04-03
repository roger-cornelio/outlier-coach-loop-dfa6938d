/**
 * CoachOnboarding - 3-step fullscreen welcome for new coaches
 * Uses Lucide icons in circles with OUTLIER palette.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, icons } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ONBOARDING_SLIDES, type OnboardingSlide } from '@/hooks/useCoachOnboardingTour';

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const IconComp = icons[name as keyof typeof icons];
  if (!IconComp) return null;
  return <IconComp className={className} />;
}

interface CoachOnboardingProps {
  active: boolean;
  step: number;
  totalSteps: number;
  slide: OnboardingSlide;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function CoachOnboarding({ active, step, totalSteps, slide, onNext, onPrev, onSkip }: CoachOnboardingProps) {
  if (!active) return null;

  const progress = ((step + 1) / totalSteps) * 100;
  const isFirst = step === 0;
  const isLast = step === totalSteps - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="coach-onboarding"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-background/90 backdrop-blur-lg" onClick={onSkip} />

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ duration: 0.35 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Orange gradient header */}
            <div className="h-1 bg-gradient-to-r from-primary to-primary/60" />

            <button
              onClick={onSkip}
              className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
              aria-label="Pular"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-4">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-2 tracking-wide">
                {step + 1} de {totalSteps}
              </p>
            </div>

            <div className="px-6 pt-6 pb-4">
              <motion.div
                key={`icon-${step}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5"
              >
                <LucideIcon name={slide.lucideIcon} className="w-8 h-8 text-primary" />
              </motion.div>

              <h2 className="font-display text-xl md:text-2xl tracking-wide font-bold text-foreground mb-3 text-center">
                {slide.title}
              </h2>

              <p className="text-sm md:text-base text-muted-foreground leading-relaxed text-center mb-4">
                {slide.description}
              </p>

              {slide.bullets && (
                <ul className="space-y-2.5 text-left">
                  {slide.bullets.map((bullet, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.1 }}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground"
                    >
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span>{bullet}</span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-1.5 py-3">
              {ONBOARDING_SLIDES.map((_, i) => (
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
                  'Vamos lá! 💪'
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
