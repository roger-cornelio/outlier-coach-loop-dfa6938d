import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, History, Medal, Timer, Trash2 } from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import { BenchmarkHistory } from './BenchmarkHistory';
import { EvolutionMilestones } from './EvolutionMilestones';
import { AddResultModal } from './AddResultModal';
import { useAthleteStatus, clearStatusHistory } from '@/hooks/useAthleteStatus';
import { useBenchmarkResults } from '@/hooks/useBenchmarkResults';
import { LEVEL_NAMES } from '@/types/outlier';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
export function BenchmarksScreen() {
  const {
    setCurrentView,
    athleteConfig,
    triggerExternalResultsRefresh
  } = useOutlierStore();
  const {
    status
  } = useAthleteStatus();
  const {
    clearHistory
  } = useBenchmarkResults();
  const {
    user
  } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const handleResultAdded = () => {
    triggerExternalResultsRefresh();
    setRefreshKey(prev => prev + 1);
  };
  const handleClearAllResults = async () => {
    setIsClearing(true);
    try {
      // Clear local storage benchmarks
      clearHistory();

      // Clear Supabase results if user is logged in
      if (user?.id) {
        const {
          error
        } = await supabase.from('benchmark_results').delete().eq('user_id', user.id);
        if (error) throw error;
      }

      // Clear athlete status history from localStorage
      clearStatusHistory();

      // Trigger refresh to recalculate status with empty data
      triggerExternalResultsRefresh();
      toast.success('Todos os resultados foram apagados');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error clearing results:', error);
      toast.error('Erro ao apagar resultados');
    } finally {
      setIsClearing(false);
    }
  };
  return <div className="min-h-screen w-full self-stretch overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button onClick={() => setCurrentView('dashboard')} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors flex-shrink-0" title="Voltar ao Dashboard">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display text-lg sm:text-2xl text-gradient flex items-center gap-2 text-accent">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                  <span className="truncate">Evolução</span>
                </h1>
                {athleteConfig && <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {LEVEL_NAMES[status]} • Acompanhe seu progresso
                  </p>}
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8 w-8">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Zerar todos os resultados?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá apagar permanentemente todos os seus benchmarks, simulados e provas oficiais. 
                      Seu progresso e nível serão resetados. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAllResults} disabled={isClearing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {isClearing ? 'Apagando...' : 'Sim, apagar tudo'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Add Result Button */}
              <AddResultModal onResultAdded={handleResultAdded} />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8">
        <div className="space-y-8">
          {/* Evolution Milestones */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.1
        }}>
            <EvolutionMilestones />
          </motion.div>

          {/* Tabs for different result types */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.2
        }}>
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
    </div>;
}