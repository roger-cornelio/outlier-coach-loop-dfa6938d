import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, History, Medal, Timer } from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import { BenchmarkHistory } from './BenchmarkHistory';
import { EvolutionMilestones } from './EvolutionMilestones';
import { AddResultModal } from './AddResultModal';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { LEVEL_NAMES } from '@/types/outlier';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function BenchmarksScreen() {
  const { setCurrentView, athleteConfig } = useOutlierStore();
  const { status } = useAthleteStatus();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleResultAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
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
                  Evolução
                </h1>
                {athleteConfig && (
                  <p className="text-sm text-muted-foreground">
                    {LEVEL_NAMES[status]} • Acompanhe seu progresso
                  </p>
                )}
              </div>
            </div>
            
            {/* Add Result Button */}
            <AddResultModal onResultAdded={handleResultAdded} />
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

          {/* Tabs for different result types */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="all" className="gap-2">
                  <History className="w-4 h-4" />
                  Todos
                </TabsTrigger>
                <TabsTrigger value="simulados" className="gap-2">
                  <Timer className="w-4 h-4" />
                  Simulados
                </TabsTrigger>
                <TabsTrigger value="provas" className="gap-2">
                  <Medal className="w-4 h-4" />
                  Provas
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <BenchmarkHistory key={`all-${refreshKey}`} filterType="all" />
              </TabsContent>
              
              <TabsContent value="simulados">
                <BenchmarkHistory key={`simulados-${refreshKey}`} filterType="simulado" />
              </TabsContent>
              
              <TabsContent value="provas">
                <BenchmarkHistory key={`provas-${refreshKey}`} filterType="prova_oficial" />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
