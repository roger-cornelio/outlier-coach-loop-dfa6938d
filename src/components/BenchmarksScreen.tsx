import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, History, Medal, Timer, Trash2, Zap } from 'lucide-react';
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
import RoxCoachDashboard from './RoxCoachDashboard';
import { ProvasTab } from './ProvasTab';

export function BenchmarksScreen() {
  const {
    setCurrentView,
    athleteConfig,
    triggerExternalResultsRefresh
  } = useOutlierStore();
  const { status } = useAthleteStatus();
  const { clearHistory } = useBenchmarkResults();
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isClearing, setIsClearing] = useState(false);

  const handleResultAdded = () => {
    triggerExternalResultsRefresh();
    setRefreshKey(prev => prev + 1);
  };

  const handleClearAllResults = async () => {
    setIsClearing(true);
    try {
      clearHistory();
      if (user?.id) {
        const { error } = await supabase.from('benchmark_results').delete().eq('user_id', user.id);
        if (error) throw error;
      }
      clearStatusHistory();
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

  return (
    <div className="min-h-screen w-full self-stretch overflow-x-hidden">
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
                {athleteConfig && (
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {LEVEL_NAMES[status]} • Acompanhe seu progresso
                  </p>
                )}
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

              <AddResultModal onResultAdded={handleResultAdded} />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-8 w-full overflow-hidden">
        <div className="space-y-8">



          {/* Tabs: Todos | Simulados | Provas | Diagnóstico */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Tabs defaultValue="diagnostico" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="diagnostico" className="gap-1 text-xs sm:text-sm sm:gap-2">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Diagnóstico</span>
                  <span className="sm:hidden">Diag.</span>
                </TabsTrigger>
                <TabsTrigger value="provas" className="gap-1 text-xs sm:text-sm sm:gap-2">
                  <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Provas</span>
                </TabsTrigger>
                <TabsTrigger value="simulados" className="gap-1 text-xs sm:text-sm sm:gap-2">
                  <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Simulados</span>
                  <span className="sm:hidden">Simul.</span>
                </TabsTrigger>
                <TabsTrigger value="benchmarks" className="gap-1 text-xs sm:text-sm sm:gap-2">
                  <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Benchmarks</span>
                  <span className="sm:hidden">Bench.</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="diagnostico">
                <RoxCoachDashboard refreshKey={refreshKey} />
              </TabsContent>

              <TabsContent value="provas">
                <BenchmarkHistory key={`provas-${refreshKey}`} filterType="prova_oficial" />
              </TabsContent>
              
              <TabsContent value="simulados">
                <BenchmarkHistory key={`simulados-${refreshKey}`} filterType="simulado" />
              </TabsContent>
              
              <TabsContent value="benchmarks">
                <BenchmarkHistory key={`benchmarks-${refreshKey}`} filterType="all" />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
