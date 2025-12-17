import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { sampleWeeklyWorkouts } from '@/data/sampleWorkouts';
import { DAY_NAMES, type DayOfWeek } from '@/types/outlier';
import { Settings, Clock, Zap, ChevronRight } from 'lucide-react';

const dayTabs: DayOfWeek[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

const blockTypeColors: Record<string, string> = {
  aquecimento: 'border-l-amber-500',
  conditioning: 'border-l-primary',
  forca: 'border-l-red-500',
  especifico: 'border-l-purple-500',
  core: 'border-l-blue-500',
  corrida: 'border-l-green-500',
  notas: 'border-l-muted-foreground',
};

export function Dashboard() {
  const { setCurrentView, setSelectedWorkout, setWeeklyWorkouts, weeklyWorkouts, athleteConfig } = useOutlierStore();
  const [activeDay, setActiveDay] = useState<DayOfWeek>('seg');

  useEffect(() => {
    if (weeklyWorkouts.length === 0) {
      setWeeklyWorkouts(sampleWeeklyWorkouts);
    }
  }, [weeklyWorkouts, setWeeklyWorkouts]);

  const currentWorkout = weeklyWorkouts.find((w) => w.day === activeDay);

  const handleStartWorkout = () => {
    if (currentWorkout) {
      setSelectedWorkout(currentWorkout);
      setCurrentView('workout');
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${minutes}min`;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl text-gradient">OUTLIER</h1>
              {athleteConfig && (
                <p className="text-sm text-muted-foreground">
                  Coach {athleteConfig.coachStyle} • {athleteConfig.level.replace('_', ' ').toUpperCase()}
                </p>
              )}
            </div>
            <button
              onClick={() => setCurrentView('config')}
              className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Day Tabs */}
      <div className="sticky top-[73px] z-40 bg-background border-b border-border overflow-x-auto">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 py-2">
            {dayTabs.map((day) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`
                  px-4 py-2 rounded-lg font-display text-lg tracking-wide transition-all duration-200 whitespace-nowrap
                  ${activeDay === day
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }
                `}
              >
                {DAY_NAMES[day].slice(0, 3).toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {currentWorkout && (
            <motion.div
              key={activeDay}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Day Header */}
              <div className="mb-8">
                <h2 className="font-display text-4xl mb-2">{DAY_NAMES[currentWorkout.day]}</h2>
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>{currentWorkout.stimulus}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(currentWorkout.estimatedTime)}</span>
                  </div>
                </div>
              </div>

              {/* Workout Blocks */}
              <div className="space-y-4 mb-8">
                {currentWorkout.blocks.map((block, index) => (
                  <motion.div
                    key={block.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                      card-elevated p-6 border-l-4 ${blockTypeColors[block.type] || 'border-l-border'}
                      ${block.isMainWod ? 'ring-1 ring-primary/30' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="font-display text-xl">{block.title}</h3>
                      {block.isMainWod && (
                        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold tracking-wide">
                          WOD PRINCIPAL
                        </span>
                      )}
                    </div>
                    <pre className="font-body text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {block.content}
                    </pre>
                  </motion.div>
                ))}
              </div>

              {/* Start Workout Button */}
              <motion.button
                onClick={handleStartWorkout}
                className="w-full font-display text-xl tracking-wider px-8 py-5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                INICIAR TREINO
                <ChevronRight className="w-6 h-6" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
