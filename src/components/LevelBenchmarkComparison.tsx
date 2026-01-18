import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronUp, ChevronDown, Minus, Target, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useOutlierStore } from '@/store/outlierStore';
import type { AthleteStatus } from '@/types/outlier';

interface MetricScore {
  metric: string;
  raw_time_sec: number;
  percentile_value: number;
  data_source: string;
}

interface LevelBenchmark {
  metric: string;
  avg_sec: number;
  p25_sec: number | null;
  p75_sec: number | null;
}

interface Props {
  hyroxResultId: string;
  metricScores: MetricScore[];
  division: string;
  gender: string;
}

const METRIC_LABELS: Record<string, string> = {
  run_avg: 'Corrida',
  roxzone: 'Roxzone',
  ski: 'Ski Erg',
  sled_push: 'Sled Push',
  sled_pull: 'Sled Pull',
  bbj: 'Burpee BJ',
  row: 'Remo',
  farmers: 'Farmers',
  sandbag: 'Sandbag',
  wallballs: 'Wall Balls',
};

function formatSecondsToMMSS(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDifference(diffSeconds: number): string {
  const sign = diffSeconds > 0 ? '+' : '';
  return `${sign}${formatSecondsToMMSS(Math.abs(diffSeconds))}`;
}

function mapStatusToLevel(status: AthleteStatus): string {
  switch (status) {
    case 'hyrox_pro':
      return 'pro';
    case 'hyrox_open':
      return 'avancado';
    case 'avancado':
      return 'avancado';
    case 'intermediario':
      return 'intermediario';
    case 'iniciante':
    default:
      return 'iniciante';
  }
}

export function LevelBenchmarkComparison({ hyroxResultId, metricScores, division, gender }: Props) {
  const [benchmarks, setBenchmarks] = useState<LevelBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const { status } = useAthleteStatus();
  const { athleteConfig } = useOutlierStore();

  const athleteLevel = mapStatusToLevel(status);
  const athleteGender = athleteConfig?.sexo === 'feminino' ? 'F' : 'M';

  useEffect(() => {
    async function fetchBenchmarks() {
      try {
        const { data, error } = await supabase
          .from('performance_level_benchmarks')
          .select('metric, avg_sec, p25_sec, p75_sec')
          .eq('division', division)
          .eq('gender', athleteGender)
          .eq('level', athleteLevel)
          .eq('benchmark_set_id', 'v1')
          .eq('is_active', true);

        if (error) throw error;
        setBenchmarks(data || []);
      } catch (err) {
        console.error('Error fetching level benchmarks:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBenchmarks();
  }, [division, athleteGender, athleteLevel]);

  const comparisons = useMemo(() => {
    return metricScores.map(score => {
      const benchmark = benchmarks.find(b => b.metric === score.metric);
      
      if (!benchmark) {
        return {
          metric: score.metric,
          athleteTime: score.raw_time_sec,
          referenceTime: null,
          difference: null,
          classification: 'none' as const,
          dataSource: score.data_source,
        };
      }

      const diff = score.raw_time_sec - benchmark.avg_sec;
      
      // Classification: Acima (faster, negative diff), Dentro (close), Abaixo (slower, positive diff)
      let classification: 'acima' | 'dentro' | 'abaixo';
      const tolerance = benchmark.avg_sec * 0.05; // 5% tolerance
      
      if (diff < -tolerance) {
        classification = 'acima';
      } else if (diff > tolerance) {
        classification = 'abaixo';
      } else {
        classification = 'dentro';
      }

      return {
        metric: score.metric,
        athleteTime: score.raw_time_sec,
        referenceTime: benchmark.avg_sec,
        p25: benchmark.p25_sec,
        p75: benchmark.p75_sec,
        difference: diff,
        classification,
        dataSource: score.data_source,
      };
    });
  }, [metricScores, benchmarks]);

  if (loading || benchmarks.length === 0) {
    return null;
  }

  const levelLabel = athleteLevel.charAt(0).toUpperCase() + athleteLevel.slice(1);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Comparação com nível {levelLabel}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p>Compara seu tempo com a média de referência do seu nível atual.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge variant="outline" className="text-xs">
          {isOpen ? 'Ocultar' : 'Ver detalhes'}
        </Badge>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3">
        <div className="rounded-lg border border-border/50 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-5 gap-2 px-3 py-2 bg-secondary/50 text-xs font-medium text-muted-foreground">
            <div>Métrica</div>
            <div className="text-center">Seu tempo</div>
            <div className="text-center">Ref. {levelLabel}</div>
            <div className="text-center">Diferença</div>
            <div className="text-center">Status</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border/30">
            {comparisons.map(comp => (
              <div 
                key={comp.metric} 
                className="grid grid-cols-5 gap-2 px-3 py-2 text-sm items-center hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>{METRIC_LABELS[comp.metric] || comp.metric}</span>
                  {comp.dataSource === 'estimated' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground">*</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Tempo estimado</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                
                <div className="text-center font-mono">
                  {formatSecondsToMMSS(comp.athleteTime)}
                </div>
                
                <div className="text-center font-mono text-muted-foreground">
                  {comp.referenceTime !== null ? formatSecondsToMMSS(comp.referenceTime) : (
                    <span className="text-xs italic">Sem referência</span>
                  )}
                </div>
                
                <div className="text-center font-mono">
                  {comp.difference !== null ? (
                    <span className={comp.difference < 0 ? 'text-green-400' : comp.difference > 0 ? 'text-red-400' : 'text-muted-foreground'}>
                      {formatDifference(comp.difference)}
                    </span>
                  ) : '—'}
                </div>
                
                <div className="flex justify-center">
                  {comp.classification === 'acima' && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                      <ChevronUp className="w-3 h-3" />
                      Acima
                    </Badge>
                  )}
                  {comp.classification === 'dentro' && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
                      <Minus className="w-3 h-3" />
                      Dentro
                    </Badge>
                  )}
                  {comp.classification === 'abaixo' && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
                      <ChevronDown className="w-3 h-3" />
                      Abaixo
                    </Badge>
                  )}
                  {comp.classification === 'none' && (
                    <span className="text-xs text-muted-foreground italic">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-4">
          <span>* Tempo estimado a partir do tempo total</span>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
