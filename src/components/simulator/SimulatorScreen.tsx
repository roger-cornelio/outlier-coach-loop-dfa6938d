import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Trophy, Calendar, Clock, ChevronDown, Loader2, ArrowRightLeft, Trash2, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useOutlierStore } from '@/store/outlierStore';
import { formatTime, HYROX_PHASES } from './simulatorConstants';
import { SimulatorSetupModal } from './SimulatorSetupModal';
import { ActiveSimulator } from './ActiveSimulator';
import { SimuladosComparisonView } from './SimuladosComparisonView';
import { getHyroxIcon } from './HyroxStationIcons';
import { TargetSplitsTable } from '@/components/evolution/TargetSplitsTable';
import { type Split } from '@/components/diagnostico/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAthleteProfile } from '@/hooks/useAthleteProfile';
import { getCoachLine } from '@/config/coachCopy';

const PHASE_TO_SPLIT_NAME: Record<number, string> = {
  0: 'Running 1', 1: 'Ski Erg', 2: 'Running 2', 3: 'Sled Push',
  4: 'Running 3', 5: 'Sled Pull', 6: 'Running 4', 7: 'Burpee Broad Jump',
  8: 'Running 5', 9: 'Rowing', 10: 'Running 6', 11: 'Farmers Carry',
  12: 'Running 7', 13: 'Sandbag Lunges', 14: 'Running 8', 15: 'Wall Balls',
};

function secondsToTimeStr(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

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
  const { user, profile } = useAuth();
  const coachStyle = profile?.coach_style || 'PULSE';
  const { triggerExternalResultsRefresh } = useOutlierStore();
  const [simulations, setSimulations] = useState<SimulationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<ViewState>('list');
  const [activeDivision, setActiveDivision] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Race splits for "Última Prova" column
  const [raceSplits, setRaceSplits] = useState<Split[]>([]);
  const [raceFinishTime, setRaceFinishTime] = useState<string | null>(null);

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
    fetchRaceSplits();
  }, [user]);

  const fetchRaceSplits = async () => {
    if (!user) return;
    const { data: resumo } = await supabase
      .from('diagnostico_resumo')
      .select('id, finish_time')
      .eq('atleta_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (resumo) {
      setRaceFinishTime(resumo.finish_time);
      const { data: splitsData } = await supabase
        .from('tempos_splits')
        .select('split_name, time')
        .eq('resumo_id', resumo.id);
      if (splitsData) setRaceSplits(splitsData as Split[]);
    }
  };

  const handleDeleteSimulation = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar este simulado?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('simulations').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao apagar simulado');
    } else {
      toast.success('Simulado apagado');
      setSimulations(prev => prev.filter(s => s.id !== id));
      triggerExternalResultsRefresh();
    }
    setDeletingId(null);
  };

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
    triggerExternalResultsRefresh();
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
      {/* Calculadora de Pace — usa última prova real + último simulado como target */}
      {simulations.length > 0 && (() => {
        const lastSim = simulations[0];
        const simSplits: Split[] = ((lastSim.splits_data || []) as SplitData[]).map((s, i) => ({
          id: String(i),
          split_name: s.type === 'roxzone' ? 'Roxzone' : (PHASE_TO_SPLIT_NAME[s.phase] || s.label),
          time: secondsToTimeStr(s.time_seconds),
        }));
        // If we have race data, show race as "Última Prova" and simulation time as default target
        // Otherwise fall back to simulation splits for both
        const hasRaceData = raceSplits.length > 0;
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <TargetSplitsTable
              splits={hasRaceData ? simSplits : simSplits}
              finishTime={formatTime(lastSim.total_time)}
              raceSplits={hasRaceData ? raceSplits : undefined}
              raceFinishTime={hasRaceData ? raceFinishTime : undefined}
              title="Calculadora de Pace Ideal"
            />
          </motion.div>
        );
      })()}

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
                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSimulation(sim.id); }}
                          disabled={deletingId === sim.id}
                        >
                          {deletingId === sim.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Apagar simulado
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Compare button */}
      {simulations.length >= 1 && (
        <Button
          variant="outline"
          onClick={() => setViewState('compare')}
          className="w-full gap-2"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Comparar Simulados
        </Button>
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