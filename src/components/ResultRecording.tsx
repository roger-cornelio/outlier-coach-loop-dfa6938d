import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { ArrowLeft, Check, X } from 'lucide-react';

export function ResultRecording() {
  const { selectedWorkout, setCurrentView, addWorkoutResult, athleteConfig } = useOutlierStore();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');

  if (!selectedWorkout) {
    setCurrentView('dashboard');
    return null;
  }

  const mainWod = selectedWorkout.blocks.find((b) => b.isMainWod);

  if (!mainWod) {
    setCurrentView('dashboard');
    return null;
  }

  const handleSubmit = () => {
    if (completed === null) return;

    const timeInSeconds = completed
      ? (parseInt(minutes || '0') * 60) + parseInt(seconds || '0')
      : undefined;

    addWorkoutResult({
      workoutId: selectedWorkout.day,
      blockId: mainWod.id,
      completed,
      timeInSeconds,
      date: new Date().toISOString(),
    });

    setCurrentView('feedback');
  };

  const isValidTime = () => {
    if (!completed) return true;
    const mins = parseInt(minutes || '0');
    const secs = parseInt(seconds || '0');
    return mins > 0 || secs > 0;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('workout')}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-2xl">REGISTRAR RESULTADO</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* WOD Info */}
          <div className="card-elevated p-6 mb-8 border-l-4 border-l-primary">
            <h3 className="font-display text-xl mb-2">{mainWod.title}</h3>
            <pre className="font-body text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {mainWod.content}
            </pre>
          </div>

          {/* Completed Question */}
          <div className="mb-8">
            <h2 className="font-display text-2xl mb-4">COMPLETOU O TREINO?</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setCompleted(true)}
                className={`
                  p-6 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2
                  ${completed === true
                    ? 'border-status-good bg-status-good/10'
                    : 'border-border hover:border-muted-foreground'
                  }
                `}
              >
                <Check className={`w-8 h-8 ${completed === true ? 'text-status-good' : 'text-muted-foreground'}`} />
                <span className="font-display text-xl">SIM</span>
              </button>
              <button
                onClick={() => setCompleted(false)}
                className={`
                  p-6 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2
                  ${completed === false
                    ? 'border-status-below bg-status-below/10'
                    : 'border-border hover:border-muted-foreground'
                  }
                `}
              >
                <X className={`w-8 h-8 ${completed === false ? 'text-status-below' : 'text-muted-foreground'}`} />
                <span className="font-display text-xl">NÃO</span>
              </button>
            </div>
          </div>

          {/* Time Input (only if completed) */}
          {completed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-8"
            >
              <h2 className="font-display text-2xl mb-4">TEMPO DO WOD</h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-2 block">Minutos</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    placeholder="00"
                    className="w-full px-4 py-4 rounded-lg bg-secondary border border-border text-center font-display text-3xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <span className="font-display text-4xl text-muted-foreground pt-6">:</span>
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-2 block">Segundos</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={seconds}
                    onChange={(e) => setSeconds(e.target.value)}
                    placeholder="00"
                    className="w-full px-4 py-4 rounded-lg bg-secondary border border-border text-center font-display text-3xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              {mainWod.referenceTime && athleteConfig && (
                <p className="text-sm text-muted-foreground mt-3">
                  Referência para {athleteConfig.level.replace('_', ' ')}: {' '}
                  {Math.floor(mainWod.referenceTime[athleteConfig.level] / 60)}:{String(mainWod.referenceTime[athleteConfig.level] % 60).padStart(2, '0')}
                </p>
              )}
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            onClick={handleSubmit}
            disabled={completed === null || (completed && !isValidTime())}
            className={`
              w-full font-display text-xl tracking-wider px-8 py-5 rounded-lg transition-all
              ${completed !== null && (completed ? isValidTime() : true)
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
              }
            `}
            whileHover={completed !== null ? { scale: 1.01 } : {}}
            whileTap={completed !== null ? { scale: 0.99 } : {}}
          >
            VER FEEDBACK
          </motion.button>
        </motion.div>
      </main>
    </div>
  );
}
