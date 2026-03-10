import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ChevronRight, Flag, Pause, Play, X, ArrowRightLeft
} from 'lucide-react';
import { HYROX_PHASES, formatTimeMs, type SimulatorPhase } from './simulatorConstants';
import { getHyroxIcon } from './HyroxStationIcons';
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

export function ActiveSimulator({ division, onFinish, onCancel }: ActiveSimulatorProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInRoxzone, setIsInRoxzone] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [globalElapsed, setGlobalElapsed] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [roxzoneElapsed, setRoxzoneElapsed] = useState(0);
  const [roxzoneTotalElapsed, setRoxzoneTotalElapsed] = useState(0);

  const globalStartRef = useRef(Date.now());
  const phaseStartRef = useRef(Date.now());
  const roxzoneStartRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const totalPausedRef = useRef(0);
  const phasePausedRef = useRef(0);
  const roxzonePausedRef = useRef(0);
  const splitsRef = useRef<SplitResult[]>([]);
  const roxzoneAccRef = useRef(0);

  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const tick = useCallback(() => {
    if (pausedAtRef.current !== null) return;
    const now = Date.now();
    setGlobalElapsed(now - globalStartRef.current - totalPausedRef.current);
    if (isInRoxzone && roxzoneStartRef.current) {
      setRoxzoneElapsed(now - roxzoneStartRef.current - roxzonePausedRef.current);
    } else {
      setPhaseElapsed(now - phaseStartRef.current - phasePausedRef.current);
    }
    setRoxzoneTotalElapsed(roxzoneAccRef.current + (isInRoxzone && roxzoneStartRef.current ? (now - roxzoneStartRef.current - roxzonePausedRef.current) : 0));
  }, [isInRoxzone]);

  useEffect(() => {
    timerRef.current = setInterval(tick, 100);
    return () => clearInterval(timerRef.current);
  }, [tick]);

  const handlePause = () => {
    if (isPaused) {
      const pauseDuration = Date.now() - (pausedAtRef.current || Date.now());
      totalPausedRef.current += pauseDuration;
      if (isInRoxzone) {
        roxzonePausedRef.current += pauseDuration;
      } else {
        phasePausedRef.current += pauseDuration;
      }
      pausedAtRef.current = null;
      setIsPaused(false);
    } else {
      pausedAtRef.current = Date.now();
      setIsPaused(true);
    }
  };

  // End current phase → enter Roxzone transition
  const handleEndPhase = () => {
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

    const isLast = phaseIndex >= HYROX_PHASES.length - 1;

    if (isLast) {
      // Finish race — no roxzone after last phase
      const totalTime = Math.round((now - globalStartRef.current - totalPausedRef.current) / 1000);
      onFinish({
        total_time: totalTime,
        roxzone_time: Math.round(roxzoneAccRef.current / 1000),
        splits_data: splitsRef.current,
      });
    } else {
      // Enter roxzone transition
      setIsInRoxzone(true);
      roxzoneStartRef.current = now;
      roxzonePausedRef.current = 0;
      setRoxzoneElapsed(0);
    }
  };

  // End roxzone → start next phase
  const handleStartNextPhase = () => {
    if (isPaused) return;
    const now = Date.now();
    const roxzoneTime = now - roxzoneStartRef.current - roxzonePausedRef.current;
    roxzoneAccRef.current += roxzoneTime;

    setIsInRoxzone(false);
    setPhaseIndex(phaseIndex + 1);
    phaseStartRef.current = now;
    phasePausedRef.current = 0;
    setPhaseElapsed(0);
  };

  const currentPhase = HYROX_PHASES[phaseIndex];
  const nextPhase = phaseIndex < HYROX_PHASES.length - 1 ? HYROX_PHASES[phaseIndex + 1] : null;
  const isLast = phaseIndex >= HYROX_PHASES.length - 1;
  const progress = ((phaseIndex) / HYROX_PHASES.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-2">
        <Button 
          variant="outline" 
          size="default" 
          onClick={() => { if (!isPaused) { pausedAtRef.current = Date.now(); setIsPaused(true); } setShowQuitConfirm(true); }} 
          className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 font-semibold px-4"
        >
          <X className="w-5 h-5" /> Encerrar
        </Button>
        <span className="text-xs text-muted-foreground">{division}</span>
        <Button 
          variant="outline" 
          size="default" 
          onClick={handlePause} 
          className="gap-2 font-semibold px-4"
        >
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
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

      {/* Roxzone accumulated - always visible */}
      <div className="text-center pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
          <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs text-amber-500 font-medium">Roxzone</span>
          <span className="text-sm font-mono font-bold text-amber-500">{formatTimeMs(roxzoneTotalElapsed)}</span>
        </div>
      </div>

      {/* Phase card OR Roxzone transition card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {isInRoxzone ? (
            <motion.div
              key="roxzone"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              <Card className="p-8 sm:p-12 text-center space-y-4 border-amber-500/30 bg-amber-500/5">
                <ArrowRightLeft className="w-10 h-10 sm:w-14 sm:h-14 mx-auto text-amber-500" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Transição</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-amber-500">Roxzone</h2>
                <p className="text-4xl sm:text-5xl font-mono font-bold text-amber-500">
                  {formatTimeMs(roxzoneElapsed)}
                </p>
                {nextPhase && (
                  <p className="text-sm text-muted-foreground">
                    Próxima: <span className="font-medium text-foreground">{nextPhase.label}</span>
                  </p>
                )}
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key={phaseIndex}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-md"
            >
              <Card className="p-8 sm:p-12 text-center space-y-4">
                <div className="flex justify-center">{getHyroxIcon(currentPhase.icon, 'lg')}</div>
                <p className="text-xs text-muted-foreground">
                  Fase {phaseIndex + 1} de {HYROX_PHASES.length}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold">{currentPhase.label}</h2>
                <p className="text-4xl sm:text-5xl font-mono font-bold text-primary">
                  {formatTimeMs(phaseElapsed)}
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Big action button */}
      <div className="p-4 pb-8">
        {isInRoxzone ? (
          <Button
            onClick={handleStartNextPhase}
            disabled={isPaused}
            className="w-full h-16 sm:h-20 text-lg sm:text-xl font-bold gap-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black"
          >
            INICIAR {nextPhase?.label.toUpperCase()}
            <ChevronRight className="w-6 h-6" />
          </Button>
        ) : (
          <Button
            onClick={handleEndPhase}
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
        )}
      </div>

      {/* Quit confirm */}
      <AlertDialog open={showQuitConfirm} onOpenChange={setShowQuitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar simulado?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja encerrar? O simulado não foi concluído e os dados <strong>não serão salvos</strong> no seu histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { if (isPaused && pausedAtRef.current) { const pauseDuration = Date.now() - pausedAtRef.current; totalPausedRef.current += pauseDuration; if (isInRoxzone) { roxzonePausedRef.current += pauseDuration; } else { phasePausedRef.current += pauseDuration; } pausedAtRef.current = null; setIsPaused(false); } }}>Continuar prova</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel} className="bg-destructive text-destructive-foreground">
              Sim, encerrar (DNF)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
