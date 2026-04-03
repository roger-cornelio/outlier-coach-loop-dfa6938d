/**
 * OnboardingTour - Interactive guided tour for new athletes
 * 
 * Shows mini bottom nav highlighting current tab + schematic preview cards.
 * Uses Lucide icons and OUTLIER color palette throughout.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, LayoutDashboard, Calendar, TrendingUp, Target, Settings, icons } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOnboardingTour, TOUR_STEPS } from '@/hooks/useOnboardingTour';
import { useOnboardingDecision } from '@/hooks/useOnboardingDecision';
import { cn } from '@/lib/utils';

const NAV_TABS = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'weeklyTraining', label: 'Treino', icon: Calendar },
  { id: 'benchmarks', label: 'Evolução', icon: TrendingUp },
  { id: 'prova-alvo', label: 'Provas', icon: Target },
  { id: 'config', label: 'Config', icon: Settings },
];

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const IconComp = icons[name as keyof typeof icons];
  if (!IconComp) return null;
  return <IconComp className={className} />;
}

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

  useEffect(() => {
    if (isSetupComplete && shouldShowTour() && !isActive) {
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
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={skipTour} />

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Orange gradient header */}
            <div className="h-1 bg-gradient-to-r from-primary to-primary/60" />

            {/* Skip */}
            <button
              onClick={skipTour}
              className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
              aria-label="Pular tour"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Progress */}
            <div className="px-6 pt-4">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-2 tracking-wide">
                {currentStep + 1} de {totalSteps}
              </p>
            </div>

            {/* Icon + Title */}
            <div className="px-6 pt-5 pb-2 text-center">
              <motion.div
                key={`icon-${currentStep}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4"
              >
                <LucideIcon name={currentStepData.lucideIcon} className="w-7 h-7 text-primary" />
              </motion.div>

              <h2 className="font-display text-xl md:text-2xl tracking-wide font-bold text-foreground mb-2">
                {currentStepData.title}
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentStepData.description}
              </p>
            </div>

            {/* Preview cards */}
            <div className="px-6 py-3 space-y-2">
              {currentStepData.previewItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary/50 border border-border/50"
                >
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <LucideIcon name={item.icon} className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground/80">{item.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Mini bottom nav */}
            <div className="mx-6 my-3 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-around py-2">
              {NAV_TABS.map((tab) => {
                const active = tab.id === currentStepData.tabId;
                const Icon = tab.icon;
                return (
                  <div
                    key={tab.id}
                    className={cn(
                      'flex flex-col items-center gap-0.5 transition-colors',
                      active ? 'text-primary' : 'text-muted-foreground/40'
                    )}
                  >
                    <Icon className="w-4 h-4" strokeWidth={active ? 2.5 : 2} />
                    <span className={cn('text-[9px]', active && 'font-semibold')}>{tab.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-1.5 py-2">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    i === currentStep ? 'bg-primary w-6' : i < currentStep ? 'bg-primary/40' : 'bg-muted'
                  )}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="px-6 pb-5 pt-1 flex items-center gap-3">
              {!isFirst && (
                <Button variant="ghost" size="sm" onClick={prevStep} className="gap-1">
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </Button>
              )}
              {isFirst && (
                <Button variant="ghost" size="sm" onClick={skipTour} className="text-muted-foreground">
                  Pular
                </Button>
              )}
              <div className="flex-1" />
              <Button onClick={nextStep} size="sm" className="gap-1 min-w-[120px]">
                {isLast ? (
                  'Começar! 💪'
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
