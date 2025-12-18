import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, History } from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import { BenchmarkHistory } from './BenchmarkHistory';
import { EvolutionMilestones } from './EvolutionMilestones';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { LEVEL_NAMES } from '@/types/outlier';

export function BenchmarksScreen() {
  const { setCurrentView, athleteConfig } = useOutlierStore();
  const { status } = useAthleteStatus();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              title="Voltar ao Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display text-2xl text-gradient flex items-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                Benchmarks & Evolução
              </h1>
              {athleteConfig && (
                <p className="text-sm text-muted-foreground">
                  {LEVEL_NAMES[status]} • Acompanhe seu progresso
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Evolution Milestones */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <EvolutionMilestones />
          </motion.div>

          {/* Benchmark History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-secondary">
                <History className="w-5 h-5 text-muted-foreground" />
              </div>
              <h2 className="font-display text-xl">Histórico de Benchmarks</h2>
            </div>
            <BenchmarkHistory />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
