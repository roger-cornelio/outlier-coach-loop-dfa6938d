/**
 * OnboardingTour - Guided tour overlay for new athletes
 * 
 * Fullscreen modal with step-by-step cards showing key features.
 * Auto-triggers once after first setup completion.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOnboardingTour, TOUR_STEPS } from '@/hooks/useOnboardingTour';
import { useOnboardingDecision } from '@/hooks/useOnboardingDecision';

export function OnboardingTour() {
  const {
    isActive,
    currentStep,
    totalSteps,
    currentStepData,
    shouldShowTour,
    startTour,
    nextStep,
    prevStep,
    skipTour,
  } = useOnboardingTour();

  const { isSetupComplete } = useOnboardingDecision();

  // Auto-start tour when setup just completed and tour hasn't been seen
  useEffect(() => {
    if (isSetupComplete && shouldShowTour() && !isActive) {
      // Small delay to let dashboard render first
      const timer = setTimeout(() => startTour(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isSetupComplete, shouldShowTour, isActive, startTour]);

  if (!isActive) return null;

  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-background/80 backdrop-blur-md"
          onClick={skipTour}
        />

        {/* Tour Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Skip button */}
            <button
              onClick={skipTour}
              className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
              aria-label="Pular tour"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Progress bar */}
            <div className="px-6 pt-5">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-2 tracking-wide">
                {currentStep + 1} de {totalSteps}
              </p>
            </div>

            {/* Content */}
            <div className="px-6 pt-6 pb-4 text-center">
              {/* Icon */}
              <motion.div
                key={`icon-${currentStep}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="text-5xl mb-5"
              >
                {currentStepData.icon}
              </motion.div>

              {/* Title */}
              <h2 className="font-display text-xl md:text-2xl tracking-wide font-bold text-foreground mb-3">
                {currentStepData.title}
              </h2>

              {/* Description */}
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {currentStepData.description}
              </p>
            </div>

            {/* Feature preview dots */}
            <div className="flex justify-center gap-1.5 py-3">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'bg-primary w-6'
                      : i < currentStep
                      ? 'bg-primary/40'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 pt-2 flex items-center gap-3">
              {!isFirst && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevStep}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </Button>
              )}

              {isFirst && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipTour}
                  className="text-muted-foreground"
                >
                  Pular
                </Button>
              )}

              <div className="flex-1" />

              <Button
                onClick={nextStep}
                size="sm"
                className="gap-1 min-w-[120px]"
              >
                {isLast ? (
                  'Começar! 🔥'
                ) : isFirst ? (
                  <>
                    Vamos lá
                    <ChevronRight className="w-4 h-4" />
                  </>
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
