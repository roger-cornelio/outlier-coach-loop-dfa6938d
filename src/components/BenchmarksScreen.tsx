import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, History, Medal, Timer, Trash2, Zap } from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import { BenchmarkHistory } from './BenchmarkHistory';
import { EvolutionMilestones } from './EvolutionMilestones';
// AddResultModal removed from header - now inside ProvasTab
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
import { SimulatorScreen } from './simulator/SimulatorScreen';

export function BenchmarksScreen() {
  const {
    setCurrentView,
    athleteConfig,
    triggerExternalResultsRefresh,
    externalResultsRefreshKey
  } = useOutlierStore();
  const { status } = useAthleteStatus();
  const { clearHistory } = useBenchmarkResults();
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isClearing, setIsClearing] = useState(false);

  // Sync local refreshKey with global store (e.g. after import from dashboard CTA)
  useEffect(() => {
    if (externalResultsRefreshKey > 0) {
      setRefreshKey(prev => prev + 1);
    }
  }, [externalResultsRefreshKey]);

  const handleResultAdded = () => {
    triggerExternalResultsRefresh();
    setRefreshKey(prev => prev + 1);
  };

  const handleClearAllEvolution = async () => {
    if (!user) return;
    setIsClearing(true);
    try {
      // Delete all evolution data from DB
      await Promise.all([
        supabase.from('benchmark_results').delete().eq('user_id', user.id),
        supabase.from('diagnostico_resumo').delete().eq('atleta_id', user.id),
        supabase.from('diagnostico_melhoria').delete().eq('atleta_id', user.id),
        supabase.from('tempos_splits').delete().eq('atleta_id', user.id),
        supabase.from('race_results').delete().eq('athlete_id', user.id),
        supabase.from('benchmark_outlier_results').delete().eq('athlete_id', user.id),
        supabase.from('benchmark_outlier_progress').delete().eq('athlete_id', user.id),
        supabase.from('hyrox_metric_scores').delete().eq('hyrox_result_id', user.id),
        supabase.from('simulations').delete().eq('athlete_id', user.id),
      ]);
      // Clear local state
      clearHistory();
      clearStatusHistory();
      triggerExternalResultsRefresh();
      setRefreshKey(prev => prev + 1);
      toast.success('Todos os dados de evolução foram apagados.');
    } catch (err) {
      console.error('Error clearing evolution data:', err);
      toast.error('Erro ao limpar dados de evolução.');
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
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8 gap-1.5 px-2.5">
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">Limpar dados</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar dados de evolução?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso vai apagar permanentemente todos os dados de evolução: diagnósticos, provas, simulados e benchmarks. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAllEvolution} disabled={isClearing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {isClearing ? 'Apagando...' : 'Sim, apagar tudo'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="diagnostico" className="gap-1 text-xs sm:text-sm sm:gap-2">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Diagnóstico</span>
                  <span className="sm:hidden">Diag.</span>
                </TabsTrigger>
                <TabsTrigger value="analise" className="gap-1 text-xs sm:text-sm sm:gap-2">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Análise</span>
                  <span className="sm:hidden">Anál.</span>
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
                <ProvasTab refreshKey={refreshKey} onResultAdded={handleResultAdded} />
              </TabsContent>
              
              <TabsContent value="simulados">
                <SimulatorScreen />
              </TabsContent>
              
              <TabsContent value="benchmarks">
                <BenchmarkHistory key={`benchmarks-${refreshKey}`} filterType="benchmark" />
              </TabsContent>

              <TabsContent value="analise">
                <div className="space-y-6">
                  <FatigueIndexCard />
                  <TargetSplitsTable />
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
