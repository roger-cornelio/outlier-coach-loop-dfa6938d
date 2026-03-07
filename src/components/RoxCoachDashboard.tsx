import { useEffect, useState } from 'react';
import { Timer, TrendingUp, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import RoxCoachExtractor from './RoxCoachExtractor';

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
  refreshKey?: number;
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

/** Format seconds to mm:ss - always format for consistency */
function formatTime(seconds: number): string {
  if (seconds == null || seconds <= 0) return '0';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Translate metric name to Portuguese */
function translateMetric(metric: string): string {
  if (!metric) return '-';
  const map: Record<string, string> = {
    'potential improvement': 'Melhoria Potencial',
    'time': 'Tempo',
  };
  return map[metric.toLowerCase()] || metric;
}

export default function RoxCoachDashboard({ refreshKey = 0 }: RoxCoachDashboardProps) {
  const { user } = useAuth();
  const [splits, setSplits] = useState<Split[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [loading, setLoading] = useState(true);
  const [localRefresh, setLocalRefresh] = useState(0);

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
  }, [user, refreshKey, localRefresh]);

  if (loading) return null;

  const hasData = splits.length > 0 || diagnosticos.length > 0;

  return (
    <div className="space-y-6">
      {/* RoxCoach Extractor - always visible */}
      <RoxCoachExtractor onSuccess={() => setLocalRefresh(k => k + 1)} />

      {/* Data sections */}
      {hasData && (
        <>
          {/* Section 1: Tempos & Splits */}
          {splits.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Timer className="w-5 h-5 text-primary" />
                Tempos & Parciais
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

          {/* Section 2: Diagnóstico de Melhoria */}
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
                      <TableHead className="text-muted-foreground">Estação</TableHead>
                      <TableHead className="text-muted-foreground">Métrica</TableHead>
                      <TableHead className="text-muted-foreground text-right">Você</TableHead>
                      <TableHead className="text-muted-foreground text-right">Top 1%</TableHead>
                      <TableHead className="text-muted-foreground text-right">Diferença</TableHead>
                      <TableHead className="text-muted-foreground text-center">Foco %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diagnosticos.map((d) => (
                      <TableRow key={d.id} className="border-border">
                        <TableCell className="font-medium text-foreground text-sm">{d.movement}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{d.metric}</TableCell>
                        <TableCell className="text-right text-sm text-foreground">
                          {d.your_score > 300 ? formatTime(d.your_score) : d.your_score}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {d.top_1 > 300 ? formatTime(d.top_1) : d.top_1}
                        </TableCell>
                        <TableCell className="text-right text-sm text-foreground">
                          {d.improvement_value > 300 ? formatTime(d.improvement_value) : d.improvement_value}
                        </TableCell>
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
        </>
      )}

      {/* Empty state */}
      {!hasData && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
          <Zap className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Importe seus dados do RoxCoach acima para ver seu diagnóstico de performance.
          </p>
        </div>
      )}
    </div>
  );
}
