import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronUp, ChevronDown, Minus, Target, Info, AlertTriangle, Database, Settings } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import type { AthleteStatus } from '@/types/outlier';

interface MetricScore {
  metric: string;
  raw_time_sec: number;
  percentile_value: number;
  data_source: string;
}

interface BenchmarkReference {
  metric: string;
  ref_sec: number;
  ref_source: 'override' | 'derived';
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

// All 10 HYROX metrics
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

function mapStatusToTier(status: AthleteStatus): string {
  switch (status) {
    case 'hyrox_pro':
      return 'hyrox_pro';
    case 'hyrox_open':
      return 'hyrox_open';
    case 'avancado':
      return 'avancado';
    case 'intermediario':
      return 'intermediario';
    case 'iniciante':
    default:
      return 'iniciante';
  }
}

// Calculate age group from athlete's age
function getAgeGroup(idade: number | null | undefined): string {
  if (!idade) return '25-29'; // Default age group
  if (idade < 25) return '25-29';
  if (idade < 30) return '25-29';
  if (idade < 35) return '30-34';
  if (idade < 40) return '35-39';
  if (idade < 45) return '40-44';
  if (idade < 50) return '45-49';
  if (idade < 55) return '50-54';
  if (idade < 60) return '55-59';
  return '60+';
}

export function LevelBenchmarkComparison({ hyroxResultId, metricScores, division, gender }: Props) {
  const [benchmarks, setBenchmarks] = useState<BenchmarkReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [lookupInfo, setLookupInfo] = useState<{ tier: string; gender: string; ageGroup: string; found: number } | null>(null);
  const { status } = useAthleteStatus();
  const { athleteConfig } = useOutlierStore();
  const { isAdmin } = useAuth();

  const athleteTier = mapStatusToTier(status);
  const athleteGender = athleteConfig?.sexo === 'feminino' ? 'F' : 'M';
  const athleteAgeGroup = getAgeGroup(athleteConfig?.idade);

  useEffect(() => {
    async function fetchBenchmarks() {
      setLoading(true);
      const references: BenchmarkReference[] = [];

      // Fetch reference for each metric using the new function
      for (const metric of ALL_METRICS) {
        try {
          const { data, error } = await supabase
            .rpc('get_benchmark_reference', {
              p_tier: athleteTier,
              p_gender: athleteGender,
              p_age_group: athleteAgeGroup,
              p_metric: metric,
              p_version: 'v1'
            });

          if (error) {
            console.error(`Error fetching benchmark for ${metric}:`, error);
            continue;
          }

          if (data && data.length > 0 && data[0].ref_sec !== null) {
            references.push({
              metric,
              ref_sec: data[0].ref_sec,
              ref_source: data[0].ref_source as 'override' | 'derived'
            });
          }
        } catch (err) {
          console.error(`Error in benchmark fetch for ${metric}:`, err);
        }
      }

      setBenchmarks(references);
      setLookupInfo({
        tier: athleteTier,
        gender: athleteGender,
        ageGroup: athleteAgeGroup,
        found: references.length,
      });
      setLoading(false);
    }

    fetchBenchmarks();
  }, [athleteTier, athleteGender, athleteAgeGroup]);

  const comparisons = useMemo(() => {
    const scoreMap = new Map(metricScores.map(s => [s.metric, s]));
    const benchmarkMap = new Map(benchmarks.map(b => [b.metric, b]));
    
    return ALL_METRICS.map(metric => {
      const score = scoreMap.get(metric);
      const benchmark = benchmarkMap.get(metric);
      
      if (!score) {
        return {
          metric,
          athleteTime: null,
          referenceTime: benchmark?.ref_sec ?? null,
          refSource: benchmark?.ref_source ?? null,
          difference: null,
          classification: 'none' as const,
          dataSource: 'none',
          hasBenchmark: !!benchmark,
        };
      }

      if (!benchmark) {
        return {
          metric,
          athleteTime: score.raw_time_sec,
          referenceTime: null,
          refSource: null,
          difference: null,
          classification: 'none' as const,
          dataSource: score.data_source,
          hasBenchmark: false,
        };
      }

      const diff = score.raw_time_sec - benchmark.ref_sec;
      
      // Classification: Acima (faster, negative diff), Dentro (close), Abaixo (slower, positive diff)
      let classification: 'acima' | 'dentro' | 'abaixo';
      const tolerance = benchmark.ref_sec * 0.05; // 5% tolerance
      
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
        referenceTime: benchmark.ref_sec,
        refSource: benchmark.ref_source,
        difference: diff,
        classification,
        dataSource: score.data_source,
        hasBenchmark: true,
      };
    });
  }, [metricScores, benchmarks]);

  const tierLabel = athleteTier.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const hasAnyBenchmark = comparisons.some(c => c.hasBenchmark);

  if (loading) {
    return (
      <div className="p-3 rounded-lg bg-secondary/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="w-4 h-4 animate-pulse" />
          <span>Carregando comparação com nível...</span>
        </div>
      </div>
    );
  }

  if (!hasAnyBenchmark) {
    return (
      <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-foreground">
              Comparação com referência do seu nível
            </p>
            <p className="text-sm text-muted-foreground">
              Sem referência configurada para {tierLabel} / {athleteGender === 'F' ? 'Feminino' : 'Masculino'} / {athleteAgeGroup}
            </p>
            <p className="text-xs text-muted-foreground/70">
              Configure os benchmarks master no painel de Admin para habilitar comparações.
            </p>
            
            {isAdmin && lookupInfo && (
              <div className="mt-3 p-2 rounded bg-black/20 border border-border/30">
                <p className="text-xs font-mono text-muted-foreground">
                  [DEBUG] Lookup: tier={lookupInfo.tier}, gender={lookupInfo.gender}, age_group={lookupInfo.ageGroup}; encontrados: {lookupInfo.found}
                </p>
              </div>
            )}
            
            <div className="mt-4 space-y-1">
              {ALL_METRICS.map(metric => (
                <div key={metric} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">{METRIC_LABELS[metric] || metric}</span>
                  <span className="text-xs italic text-muted-foreground/50">Sem referência</span>
                </div>
              ))}
            </div>
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
          <span className="text-sm font-medium">Comparação com nível {tierLabel}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p>Compara seu tempo com a referência do seu nível, ajustada por gênero e faixa etária.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge variant="outline" className="text-xs">
          {isOpen ? 'Ocultar' : 'Ver detalhes'}
        </Badge>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3">
        {isAdmin && lookupInfo && (
          <div className="mb-3 p-2 rounded bg-black/20 border border-border/30">
            <p className="text-xs font-mono text-muted-foreground">
              [DEBUG] Lookup: tier={lookupInfo.tier}, gender={lookupInfo.gender}, age_group={lookupInfo.ageGroup}; encontrados: {lookupInfo.found}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-border/50 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-2 px-3 py-2 bg-secondary/50 text-xs font-medium text-muted-foreground">
            <div>Métrica</div>
            <div className="text-center">Seu tempo</div>
            <div className="text-center">Ref. {tierLabel}</div>
            <div className="text-center">Fonte</div>
            <div className="text-center">Diferença</div>
            <div className="text-center">Status</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border/30">
            {comparisons.map(comp => (
              <div 
                key={comp.metric} 
                className="grid grid-cols-6 gap-2 px-3 py-2 text-sm items-center hover:bg-secondary/20 transition-colors"
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
                    <span className="text-xs italic">Sem ref.</span>
                  )}
                </div>
                
                <div className="flex justify-center">
                  {comp.refSource === 'override' ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Settings className="w-3 h-3 text-amber-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Override manual</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : comp.refSource === 'derived' ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Database className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Derivado (Master + Deltas)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
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
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-4 flex-wrap">
          <span>* Tempo estimado</span>
          <span className="flex items-center gap-1">
            <Settings className="w-3 h-3 text-amber-400" /> Override
          </span>
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3" /> Derivado
          </span>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
