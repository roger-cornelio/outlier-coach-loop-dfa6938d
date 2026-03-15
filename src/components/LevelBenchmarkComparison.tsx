import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronUp, ChevronDown, Minus, Target, Info, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MetricScore {
  metric: string;
  raw_time_sec: number;
  percentile_value: number;
  data_source: string;
}

interface DiagnosticoRef {
  metric: string;
  top_1: number;
}

interface Props {
  hyroxResultId: string;
  metricScores: MetricScore[];
  division: string;
  gender: string;
}

const METRIC_LABELS: Record<string, string> = {
  run_avg: 'Run',
  roxzone: 'Roxzone',
  ski: 'Ski Erg',
  sled_push: 'Sled Push',
  sled_pull: 'Sled Pull',
  bbj: 'Burpee BJ',
  row: 'Row',
  farmers: 'Farmers',
  sandbag: 'Sandbag',
  wallballs: 'Wall Balls',
};

const ALL_METRICS = ['run_avg', 'roxzone', 'ski', 'sled_push', 'sled_pull', 'bbj', 'row', 'farmers', 'sandbag', 'wallballs'];

function formatSecondsToMMSS(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDifference(diffSeconds: number): string {
  const sign = diffSeconds > 0 ? '+' : '';
  return `${sign}${formatSecondsToMMSS(Math.abs(diffSeconds))}`;
}

export function LevelBenchmarkComparison({ hyroxResultId, metricScores, division, gender }: Props) {
  const [references, setReferences] = useState<DiagnosticoRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchReferences() {
      setLoading(true);
      try {
        // Get the athlete's user_id from the benchmark_result
        const { data: brData } = await supabase
          .from('benchmark_results')
          .select('user_id')
          .eq('id', hyroxResultId)
          .single();

        if (!brData?.user_id) {
          setLoading(false);
          return;
        }

        // Get the latest resumo_id for this athlete
        const { data: resumoData } = await supabase
          .from('diagnostico_resumo')
          .select('id')
          .eq('atleta_id', brData.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!resumoData?.id) {
          setLoading(false);
          return;
        }

        // Fetch diagnostico_melhoria for this resumo
        const { data: melhorias } = await supabase
          .from('diagnostico_melhoria')
          .select('metric, top_1')
          .eq('resumo_id', resumoData.id);

        if (melhorias && melhorias.length > 0) {
          setReferences(melhorias.map(m => ({ metric: m.metric, top_1: m.top_1 })));
        }
      } catch (err) {
        console.error('[LevelBenchmarkComparison] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReferences();
  }, [hyroxResultId]);

  const comparisons = useMemo(() => {
    const scoreMap = new Map(metricScores.map(s => [s.metric, s]));
    const refMap = new Map(references.map(r => [r.metric, r.top_1]));

    return ALL_METRICS.map(metric => {
      const score = scoreMap.get(metric);
      const refSec = refMap.get(metric);

      if (!score) {
        return {
          metric,
          athleteTime: null,
          referenceTime: refSec ?? null,
          difference: null,
          classification: 'none' as const,
          dataSource: 'none',
          hasRef: refSec != null,
        };
      }

      if (refSec == null) {
        return {
          metric,
          athleteTime: score.raw_time_sec,
          referenceTime: null,
          difference: null,
          classification: 'none' as const,
          dataSource: score.data_source,
          hasRef: false,
        };
      }

      const diff = score.raw_time_sec - refSec;
      const tolerance = refSec * 0.05;

      let classification: 'acima' | 'dentro' | 'abaixo';
      if (diff < -tolerance) {
        classification = 'acima';
      } else if (diff > tolerance) {
        classification = 'abaixo';
      } else {
        classification = 'dentro';
      }

      return {
        metric,
        athleteTime: score.raw_time_sec,
        referenceTime: refSec,
        difference: diff,
        classification,
        dataSource: score.data_source,
        hasRef: true,
      };
    });
  }, [metricScores, references]);

  const hasAnyRef = comparisons.some(c => c.hasRef);

  if (loading) {
    return (
      <div className="p-3 rounded-lg bg-secondary/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="w-4 h-4 animate-pulse" />
          <span>Carregando comparação...</span>
        </div>
      </div>
    );
  }

  if (!hasAnyRef) {
    return (
      <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-foreground">
              Comparação com Meta OUTLIER
            </p>
            <p className="text-sm text-muted-foreground">
              Importe seu diagnóstico primeiro para ver as metas de referência.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Comparação com Meta OUTLIER</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p>Compara seu tempo com a referência Top 1% do diagnóstico.</p>
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
          <div className="grid grid-cols-5 gap-2 px-3 py-2 bg-secondary/50 text-xs font-medium text-muted-foreground">
            <div>Métrica</div>
            <div className="text-center">Seu tempo</div>
            <div className="text-center">Meta OUTLIER</div>
            <div className="text-center">Diferença</div>
            <div className="text-center">Status</div>
          </div>

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
                  {comp.athleteTime !== null ? formatSecondsToMMSS(comp.athleteTime) : '—'}
                </div>

                <div className="text-center font-mono text-muted-foreground">
                  {comp.referenceTime !== null ? formatSecondsToMMSS(comp.referenceTime) : (
                    <span className="text-xs italic">—</span>
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

        <div className="mt-2 text-xs text-muted-foreground">
          <span>* Tempo estimado</span>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
