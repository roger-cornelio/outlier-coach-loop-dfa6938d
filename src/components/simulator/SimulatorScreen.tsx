import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Trophy, Calendar, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatTime } from './simulatorConstants';
import { SimulatorSetupModal } from './SimulatorSetupModal';
import { SimulationDetailModal } from './SimulationDetailModal';
import { ActiveSimulator } from './ActiveSimulator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SimulationRecord {
  id: string;
  created_at: string;
  division: string;
  total_time: number;
  roxzone_time: number;
  splits_data: any[];
}

type ViewState = 'list' | 'setup' | 'active';

export function SimulatorScreen() {
  const { user } = useAuth();
  const [simulations, setSimulations] = useState<SimulationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<ViewState>('list');
  const [activeDivision, setActiveDivision] = useState('');
  const [selectedSim, setSelectedSim] = useState<SimulationRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

    // Open detail of the just-finished simulation
    if (inserted) {
      setSelectedSim(inserted as unknown as SimulationRecord);
      setDetailOpen(true);
    }
  };

  const handleCancelRace = () => {
    setViewState('list');
    toast.info('Simulado abandonado');
  };

  // Active simulator is fullscreen overlay
  if (viewState === 'active') {
    return (
      <ActiveSimulator
        division={activeDivision}
        onFinish={handleFinishRace}
        onCancel={handleCancelRace}
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
          {simulations.map((sim, i) => (
            <motion.div
              key={sim.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => { setSelectedSim(sim); setDetailOpen(true); }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{sim.division}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(sim.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-mono font-bold text-primary">{formatTime(sim.total_time)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Setup modal */}
      <SimulatorSetupModal
        open={viewState === 'setup'}
        onClose={() => setViewState('list')}
        onStart={handleStartRace}
      />

      {/* Detail modal */}
      <SimulationDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        simulation={selectedSim}
      />
    </div>
  );
}
