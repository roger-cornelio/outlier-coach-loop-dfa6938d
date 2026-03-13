import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Trophy, Calendar, Clock, ChevronDown, Loader2, ArrowRightLeft } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatTime, HYROX_PHASES } from './simulatorConstants';
import { SimulatorSetupModal } from './SimulatorSetupModal';
import { ActiveSimulator } from './ActiveSimulator';
import { SimuladosComparisonView } from './SimuladosComparisonView';
import { getHyroxIcon } from './HyroxStationIcons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SplitData {
  phase: number;
  label: string;
  time_seconds: number;
  type: string;
}

interface SimulationRecord {
  id: string;
  created_at: string;
  division: string;
  total_time: number;
  roxzone_time: number;
  splits_data: SplitData[];
}

type ViewState = 'list' | 'setup' | 'active' | 'compare';

export function SimulatorScreen() {
  const { user } = useAuth();
  const [simulations, setSimulations] = useState<SimulationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<ViewState>('list');
  const [activeDivision, setActiveDivision] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchSimulations = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('simulations')
      .select('*')
      .eq('athlete_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSimulations(data as unknown as SimulationRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSimulations();
  }, [user]);

  const handleStartSetup = () => setViewState('setup');

  const handleStartRace = (division: string) => {
    setActiveDivision(division);
    setViewState('active');
  };

  const handleFinishRace = async (data: { total_time: number; roxzone_time: number; splits_data: any[] }) => {
    if (!user) return;

    const { data: inserted, error } = await supabase
      .from('simulations')
      .insert({
        athlete_id: user.id,
        division: activeDivision,
        total_time: data.total_time,
        roxzone_time: data.roxzone_time,
        splits_data: data.splits_data as any,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving simulation:', error);
      toast.error('Erro ao salvar simulado');
      setViewState('list');
      return;
    }

    toast.success('Simulado finalizado!');
    setViewState('list');
    await fetchSimulations();

    // Auto-expand the just-finished simulation
    if (inserted) {
      setExpandedIds(new Set([inserted.id]));
    }
  };

  const handleCancelRace = () => {
    setViewState('list');
    toast.info('Simulado encerrado. Como a prova não foi concluída, os tempos não foram salvos no seu histórico.', { duration: 5000 });
  };

  if (viewState === 'active') {
    return (
      <ActiveSimulator
        division={activeDivision}
        onFinish={handleFinishRace}
        onCancel={handleCancelRace}
      />
    );
  }

  if (viewState === 'compare') {
    return (
      <SimuladosComparisonView
        simulations={simulations}
        onBack={() => setViewState('list')}
        onSimulationUpdated={fetchSimulations}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* CTA */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Button
          onClick={handleStartSetup}
          className="w-full h-14 text-lg font-bold gap-3 rounded-xl"
        >
          <Play className="w-5 h-5" />
          Iniciar Novo Simulado
        </Button>
      </motion.div>

      {/* History */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : simulations.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">Nenhum simulado registrado ainda.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Clique em "Iniciar Novo Simulado" para cronometrar sua prova.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {simulations.map((sim, i) => {
            const isOpen = expandedIds.has(sim.id);
            const splits = (sim.splits_data || []) as SplitData[];

            return (
              <motion.div
                key={sim.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Collapsible open={isOpen} onOpenChange={() => toggleExpanded(sim.id)}>
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger className="w-full p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="font-medium text-sm truncate">{sim.division}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(sim.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-bold text-primary">{formatTime(sim.total_time)}</p>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-center">
                            <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tempo Total</p>
                            <p className="text-xl font-bold font-mono text-primary">{formatTime(sim.total_time)}</p>
                          </div>
                          <div className="bg-accent/5 border border-accent/10 rounded-lg p-3 text-center">
                            <ArrowRightLeft className="w-4 h-4 mx-auto mb-1 text-accent" />
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Roxzone</p>
                            <p className="text-xl font-bold font-mono text-accent">{formatTime(sim.roxzone_time)}</p>
                          </div>
                        </div>

                        {/* Splits */}
                        {splits.length > 0 && (
                          <div className="rounded-lg border border-border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-muted/50">
                                  <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">#</th>
                                  <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Fase</th>
                                  <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Tempo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {splits.map((split, j) => (
                                  <tr key={j} className={`border-t border-border/50 ${split.type === 'run' ? 'bg-blue-500/5' : ''}`}>
                                    <td className="py-1.5 px-3 text-muted-foreground text-xs">{j + 1}</td>
                                    <td className="py-1.5 px-3">
                                      <div className="flex items-center gap-2 text-xs">
                                        {getHyroxIcon(HYROX_PHASES[split.phase]?.icon || split.type, 'sm')}
                                        {split.label}
                                      </div>
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono font-medium text-xs">
                                      {formatTime(split.time_seconds)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Setup modal */}
      <SimulatorSetupModal
        open={viewState === 'setup'}
        onClose={() => setViewState('list')}
        onStart={handleStartRace}
      />
    </div>
  );
}