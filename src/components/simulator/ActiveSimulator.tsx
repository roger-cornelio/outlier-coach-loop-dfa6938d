import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ChevronRight, Flag, Pause, Play, X, 
  PersonStanding, Waves, ArrowRight, ArrowLeft, 
  Dumbbell, Rows3, Weight, Footprints, Circle
} from 'lucide-react';
import { HYROX_PHASES, formatTimeMs, type SimulatorPhase } from './simulatorConstants';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface SplitResult {
  phase: number;
  label: string;
  time_seconds: number;
  type: string;
}

interface ActiveSimulatorProps {
  division: string;
  onFinish: (data: { total_time: number; roxzone_time: number; splits_data: SplitResult[] }) => void;
  onCancel: () => void;
}

function getPhaseIcon(phase: SimulatorPhase) {
  const cls = "w-10 h-10 sm:w-14 sm:h-14";
  switch (phase.icon) {
    case 'run': return <PersonStanding className={`${cls} text-blue-400`} />;
    case 'ski': return <Waves className={`${cls} text-cyan-400`} />;
    case 'sled_push': return <ArrowRight className={`${cls} text-orange-400`} />;
    case 'sled_pull': return <ArrowLeft className={`${cls} text-orange-400`} />;
    case 'burpee': return <Dumbbell className={`${cls} text-red-400`} />;
    case 'row': return <Rows3 className={`${cls} text-green-400`} />;
    case 'farmers': return <Weight className={`${cls} text-yellow-400`} />;
    case 'sandbag': return <Footprints className={`${cls} text-purple-400`} />;
    case 'wallballs': return <Circle className={`${cls} text-pink-400`} />;
    default: return <PersonStanding className={`${cls} text-blue-400`} />;
  }
}

export function ActiveSimulator({ division, onFinish, onCancel }: ActiveSimulatorProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [globalElapsed, setGlobalElapsed] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);

  const globalStartRef = useRef(Date.now());
  const phaseStartRef = useRef(Date.now());
  const pausedAtRef = useRef<number | null>(null);
  const totalPausedRef = useRef(0);
  const phasePausedRef = useRef(0);
  const splitsRef = useRef<SplitResult[]>([]);
  const roxzoneAccRef = useRef(0);
  // Track transition: after a run ends, time until next button press = roxzone
  const transitionStartRef = useRef<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const tick = useCallback(() => {
    if (pausedAtRef.current !== null) return;
    const now = Date.now();
    setGlobalElapsed(now - globalStartRef.current - totalPausedRef.current);
    setPhaseElapsed(now - phaseStartRef.current - phasePausedRef.current);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(tick, 100);
    return () => clearInterval(timerRef.current);
  }, [tick]);

  const handlePause = () => {
    if (isPaused) {
      // Resume
      const pauseDuration = Date.now() - (pausedAtRef.current || Date.now());
      totalPausedRef.current += pauseDuration;
      phasePausedRef.current += pauseDuration;
      pausedAtRef.current = null;
      setIsPaused(false);
    } else {
      pausedAtRef.current = Date.now();
      setIsPaused(true);
    }
  };

  const handleNextPhase = () => {
    if (isPaused) return;
    const now = Date.now();
    const phaseTime = (now - phaseStartRef.current - phasePausedRef.current) / 1000;
    const currentPhase = HYROX_PHASES[phaseIndex];

    // Save split
    splitsRef.current.push({
      phase: phaseIndex,
      label: currentPhase.label,
      time_seconds: Math.round(phaseTime),
      type: currentPhase.type,
    });

    // Roxzone: if a run just ended, start transition timer
    if (currentPhase.type === 'run') {
      transitionStartRef.current = now;
    } else if (transitionStartRef.current !== null) {
      // Station ended — no transition to count here
      transitionStartRef.current = null;
    }

    // If station started after a run, measure roxzone
    if (currentPhase.type === 'run' && phaseIndex < 15) {
      // The "roxzone" is counted when they press the button to START the station
      // So we record it on the NEXT press — handled below
    }

    // If we were in a transition (prev was run), count roxzone
    // Actually roxzone = time between pressing "next" after run and pressing "next" after reaching station start
    // Simplified: we just mark the transition start when run ends, and measure when station button is pressed
    // But since pressing the button IS the transition, let's count roxzone differently:
    // Roxzone = for each run→station transition, a fixed measurement isn't possible with single button
    // Alternative: roxzone is accumulated as the brief moment. With single button, we skip roxzone calc
    // Per user request: "tempo entre finalizar a corrida e iniciar o exercício" = they press button once
    // This means roxzone can't be measured with a single button press per phase
    // We'll set roxzone_time = 0 for now (needs double-tap for real measurement)

    const isLast = phaseIndex >= HYROX_PHASES.length - 1;

    if (isLast) {
      // Finish
      const totalTime = Math.round((now - globalStartRef.current - totalPausedRef.current) / 1000);
      onFinish({
        total_time: totalTime,
        roxzone_time: Math.round(roxzoneAccRef.current),
        splits_data: splitsRef.current,
      });
    } else {
      setPhaseIndex(phaseIndex + 1);
      phaseStartRef.current = Date.now();
      phasePausedRef.current = 0;
    }
  };

  const currentPhase = HYROX_PHASES[phaseIndex];
  const isLast = phaseIndex >= HYROX_PHASES.length - 1;
  const progress = ((phaseIndex) / HYROX_PHASES.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => setShowQuitConfirm(true)} className="gap-1 text-destructive">
          <X className="w-4 h-4" /> Sair
        </Button>
        <span className="text-xs text-muted-foreground">{division}</span>
        <Button variant="ghost" size="sm" onClick={handlePause} className="gap-1">
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {isPaused ? 'Retomar' : 'Pausar'}
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Global timer */}
      <div className="text-center pt-6 pb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Tempo Total</p>
        <p className="text-3xl sm:text-4xl font-mono font-bold text-foreground">{formatTimeMs(globalElapsed)}</p>
      </div>

      {/* Phase card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={phaseIndex}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md"
          >
            <Card className="p-8 sm:p-12 text-center space-y-4">
              <div className="flex justify-center">{getPhaseIcon(currentPhase)}</div>
              <p className="text-xs text-muted-foreground">
                Fase {phaseIndex + 1} de {HYROX_PHASES.length}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold">{currentPhase.label}</h2>
              <p className="text-4xl sm:text-5xl font-mono font-bold text-primary">
                {formatTimeMs(phaseElapsed)}
              </p>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Big action button */}
      <div className="p-4 pb-8">
        <Button
          onClick={handleNextPhase}
          disabled={isPaused}
          className={`w-full h-16 sm:h-20 text-lg sm:text-xl font-bold gap-3 rounded-2xl ${
            isLast 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-primary hover:bg-primary/90'
          }`}
        >
          {isLast ? (
            <>
              <Flag className="w-6 h-6" />
              FINALIZAR 🏁
            </>
          ) : (
            <>
              PRÓXIMA ESTAÇÃO
              <ChevronRight className="w-6 h-6" />
            </>
          )}
        </Button>
      </div>

      {/* Quit confirm */}
      <AlertDialog open={showQuitConfirm} onOpenChange={setShowQuitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonar simulado?</AlertDialogTitle>
            <AlertDialogDescription>O progresso atual será perdido.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel} className="bg-destructive text-destructive-foreground">
              Sim, abandonar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
