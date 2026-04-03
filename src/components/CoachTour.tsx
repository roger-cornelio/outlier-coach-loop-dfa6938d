/**
 * CoachTour - Interactive guided tour for coach dashboard
 * Uses Lucide icons, mini nav, and preview cards with OUTLIER palette.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Users, FileText, CalendarDays, Link, icons } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TOUR_STEPS, type TourStep } from '@/hooks/useCoachOnboardingTour';
import { cn } from '@/lib/utils';

const COACH_NAV_TABS = [
  { id: 'overview', label: 'Atletas', icon: Users },
  { id: 'spreadsheet', label: 'Importar', icon: FileText },
  { id: 'programs', label: 'Programações', icon: CalendarDays },
  { id: 'link', label: 'Vincular', icon: Link },
];

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const IconComp = icons[name as keyof typeof icons];
  if (!IconComp) return null;
  return <IconComp className={className} />;
}

interface CoachTourProps {
  active: boolean;
  step: number;
  totalSteps: number;
  stepData: TourStep;
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
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Orange gradient header */}
            <div className="h-1 bg-gradient-to-r from-primary to-primary/60" />

            <button
              onClick={onSkip}
              className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
              aria-label="Pular tour"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-4">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-2 tracking-wide">
                {step + 1} de {totalSteps}
              </p>
            </div>

            {/* Icon + Title */}
            <div className="px-6 pt-5 pb-2 text-center">
              <motion.div
                key={`tour-icon-${step}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4"
              >
                <LucideIcon name={stepData.lucideIcon} className="w-7 h-7 text-primary" />
              </motion.div>

              <h2 className="font-display text-xl md:text-2xl tracking-wide font-bold text-foreground mb-2">
                {stepData.title}
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {stepData.description}
              </p>
            </div>

            {/* Preview cards */}
            <div className="px-6 py-3 space-y-2">
              {stepData.previewItems.map((item, i) => (
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

            {/* Mini coach nav */}
            <div className="mx-6 my-3 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-around py-2">
              {COACH_NAV_TABS.map((tab) => {
                const active = tab.id === stepData.tabId;
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
                    i === step ? 'bg-primary w-6' : i < step ? 'bg-primary/40' : 'bg-muted'
                  )}
                />
              ))}
            </div>

            <div className="px-6 pb-5 pt-1 flex items-center gap-3">
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
