import { useEffect, useState } from 'react';
import { Timer, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Split {
  id: string;
  split_name: string;
  time: string;
}

interface Diagnostico {
  id: string;
  movement: string;
  metric: string;
  value: number;
  your_score: number;
  top_1: number;
  improvement_value: number;
  percentage: number;
  total_improvement: number;
}

interface RoxCoachDashboardProps {
  refreshKey: number;
}

function PercentageBadge({ value }: { value: number }) {
  const abs = Math.abs(value);
  if (abs < 5) {
    return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">{value.toFixed(1)}%</Badge>;
  }
  if (abs < 15) {
    return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30">{value.toFixed(1)}%</Badge>;
  }
  return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">{value.toFixed(1)}%</Badge>;
}

export default function RoxCoachDashboard({ refreshKey }: RoxCoachDashboardProps) {
  const { user } = useAuth();
  const [splits, setSplits] = useState<Split[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);
      const [splitsRes, diagRes] = await Promise.all([
        supabase.from('tempos_splits').select('*').eq('atleta_id', user!.id).order('created_at'),
        supabase.from('diagnostico_melhoria').select('*').eq('atleta_id', user!.id).order('percentage', { ascending: false }),
      ]);

      setSplits((splitsRes.data as any[]) || []);
      setDiagnosticos((diagRes.data as any[]) || []);
      setLoading(false);
    }

    fetchData();
  }, [user, refreshKey]);

  if (loading) return null;
  if (splits.length === 0 && diagnosticos.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Section 1: Splits */}
      {splits.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            Tempos & Splits
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {splits.map((split) => (
              <div
                key={split.id}
                className="bg-card border border-border rounded-xl p-4 text-center space-y-1"
              >
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">
                  {split.split_name}
                </p>
                <p className="text-xl font-bold text-primary">
                  {split.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Diagnostico */}
      {diagnosticos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Diagnóstico de Melhoria
          </h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Movement</TableHead>
                  <TableHead className="text-muted-foreground">Metric</TableHead>
                  <TableHead className="text-muted-foreground text-right">You</TableHead>
                  <TableHead className="text-muted-foreground text-right">Top 1%</TableHead>
                  <TableHead className="text-muted-foreground text-right">Gap</TableHead>
                  <TableHead className="text-muted-foreground text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diagnosticos.map((d) => (
                  <TableRow key={d.id} className="border-border">
                    <TableCell className="font-medium text-foreground text-sm">{d.movement}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{d.metric}</TableCell>
                    <TableCell className="text-right text-sm text-foreground">{d.your_score}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{d.top_1}</TableCell>
                    <TableCell className="text-right text-sm text-foreground">{d.improvement_value}</TableCell>
                    <TableCell className="text-center">
                      <PercentageBadge value={d.percentage} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
