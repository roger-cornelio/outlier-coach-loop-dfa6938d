/**
 * CoachBenchmarksTab - Versão simplificada do BenchmarksScreen para uso em tabs
 * Remove headers duplicados e verificação de auth
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, History, Medal, Timer, Trash2 } from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import { BenchmarkHistory } from './BenchmarkHistory';
import { EvolutionMilestones } from './EvolutionMilestones';
import { AddResultModal } from './AddResultModal';
import { useAthleteStatus, clearStatusHistory } from '@/hooks/useAthleteStatus';
import { useBenchmarkResults } from '@/hooks/useBenchmarkResults';
import { LEVEL_NAMES } from '@/types/outlier';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function CoachBenchmarksTab() {
  const { athleteConfig, triggerExternalResultsRefresh } = useOutlierStore();
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
        const { error } = await supabase
          .from('benchmark_results')
          .delete()
          .eq('user_id', user.id);
        
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
    <div className="space-y-6">
      {/* Header com ações */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="w-5 h-5 text-primary" />
              Benchmarks e Evolução
              {athleteConfig && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  • {LEVEL_NAMES[status]}
                </span>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Zerar</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Zerar todos os resultados?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá apagar permanentemente todos os benchmarks, simulados e provas oficiais. 
                      O progresso e nível serão resetados. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAllResults}
                      disabled={isClearing}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isClearing ? 'Apagando...' : 'Sim, apagar tudo'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
      </Card>

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
        <Card>
          <CardContent className="pt-6">
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
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
