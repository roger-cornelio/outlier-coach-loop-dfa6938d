import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Trophy, Clock, ArrowRightLeft, PersonStanding, 
  CableCar, MoveRight, MoveLeft, TrendingUp, Ship, Luggage, PackageOpen, Target 
} from 'lucide-react';
import { formatTime, HYROX_PHASES, type SimulatorPhase } from './simulatorConstants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function getSplitIcon(iconKey: string) {
  const cls = "w-3.5 h-3.5";
  switch (iconKey) {
    case 'run': return <PersonStanding className={`${cls} text-blue-400`} />;
    case 'ski': return <CableCar className={`${cls} text-cyan-400`} />;
    case 'sled_push': return <MoveRight className={`${cls} text-orange-400`} />;
    case 'sled_pull': return <MoveLeft className={`${cls} text-orange-400`} />;
    case 'burpee': return <TrendingUp className={`${cls} text-red-400`} />;
    case 'row': return <Ship className={`${cls} text-green-400`} />;
    case 'farmers': return <Luggage className={`${cls} text-yellow-400`} />;
    case 'sandbag': return <PackageOpen className={`${cls} text-purple-400`} />;
    case 'wallballs': return <Target className={`${cls} text-pink-400`} />;
    default: return <PersonStanding className={`${cls} text-blue-400`} />;
  }
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

interface SimulationDetailModalProps {
  open: boolean;
  onClose: () => void;
  simulation: SimulationRecord | null;
}

export function SimulationDetailModal({ open, onClose, simulation }: SimulationDetailModalProps) {
  if (!simulation) return null;

  const splits = (simulation.splits_data || []) as SplitData[];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Resultado do Simulado
          </DialogTitle>
          <DialogDescription>
            {format(new Date(simulation.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
            {' · '}
            {simulation.division}
          </DialogDescription>
        </DialogHeader>

        {/* Main stats */}
        <div className="grid grid-cols-2 gap-3 py-2">
          <Card className="p-4 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Tempo Total</p>
            <p className="text-2xl font-bold font-mono text-primary">{formatTime(simulation.total_time)}</p>
          </Card>
          <Card className="p-4 text-center">
            <ArrowRightLeft className="w-5 h-5 mx-auto mb-1 text-accent" />
            <p className="text-xs text-muted-foreground">Roxzone</p>
            <p className="text-2xl font-bold font-mono text-accent">{formatTime(simulation.roxzone_time)}</p>
          </Card>
        </div>

        {/* Splits table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">#</th>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Fase</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Tempo</th>
              </tr>
            </thead>
            <tbody>
              {splits.map((split, i) => (
                <tr key={i} className={`border-t border-border ${split.type === 'run' ? 'bg-blue-500/5' : ''}`}>
                  <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      {getSplitIcon(HYROX_PHASES[split.phase]?.icon || split.type)}
                      {split.label}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-medium">
                    {formatTime(split.time_seconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
