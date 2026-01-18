import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronUp, ChevronDown, Minus, Target, Info, AlertTriangle } from 'lucide-react';
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

// Division aliases for lookup fallback
const DIVISION_ALIASES: Record<string, string[]> = {
  'HYROX PRO': ['HYROX PRO'],
  'HYROX OPEN': ['HYROX OPEN', 'HYROX'],
  'HYROX': ['HYROX', 'HYROX OPEN'],
  'PRO': ['HYROX PRO'],
  'OPEN': ['HYROX OPEN', 'HYROX'],
};

// Normalize division string for lookup
function normalizeDivision(division: string): string {
  const upper = (division || '').toUpperCase().trim();
  // Direct canonical values
  if (upper === 'HYROX PRO' || upper === 'HYROX OPEN') {
    return upper;
  }
  // Aliases
  if (upper.includes('PRO')) return 'HYROX PRO';
  if (upper.includes('OPEN') || upper === 'HYROX') return 'HYROX OPEN';
  // Default fallback
  return 'HYROX OPEN';
}

// Get fallback divisions to try in order
function getDivisionFallbacks(division: string): string[] {
  const normalized = normalizeDivision(division);
  return DIVISION_ALIASES[normalized] || [normalized, 'HYROX OPEN', 'HYROX PRO'];
}

export function LevelBenchmarkComparison({ hyroxResultId, metricScores, division, gender }: Props) {
  const [benchmarks, setBenchmarks] = useState<LevelBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [lookupInfo, setLookupInfo] = useState<{ division: string; gender: string; level: string; found: number } | null>(null);
  const { status } = useAthleteStatus();
  const { athleteConfig } = useOutlierStore();
  const { isAdmin } = useAuth();

  const athleteLevel = mapStatusToLevel(status);
  const athleteGender = athleteConfig?.sexo === 'feminino' ? 'F' : 'M';

  useEffect(() => {
    async function fetchBenchmarks() {
      setLoading(true);
      const divisionsToTry = getDivisionFallbacks(division);
      
      let foundData: LevelBenchmark[] = [];
      let usedDivision = division;

      // Try each division fallback until we find data
      for (const divToTry of divisionsToTry) {
        try {
          const { data, error } = await supabase
            .from('performance_level_benchmarks')
            .select('metric, avg_sec, p25_sec, p75_sec')
            .eq('division', divToTry)
            .eq('gender', athleteGender)
            .eq('level', athleteLevel)
            .eq('benchmark_set_id', 'v1')
            .eq('is_active', true);

          if (error) {
            console.error(`Error fetching benchmarks for division ${divToTry}:`, error);
            continue;
          }

          if (data && data.length > 0) {
            foundData = data;
            usedDivision = divToTry;
            break;
          }
        } catch (err) {
          console.error(`Error in benchmark fetch for ${divToTry}:`, err);
        }
      }

      setBenchmarks(foundData);
      setLookupInfo({
        division: usedDivision,
        gender: athleteGender,
        level: athleteLevel,
        found: foundData.length,
      });
      setLoading(false);
    }

    fetchBenchmarks();
  }, [division, athleteGender, athleteLevel]);

  // All 10 metrics for HYROX
  const ALL_METRICS = ['run_avg', 'roxzone', 'ski', 'sled_push', 'sled_pull', 'bbj', 'row', 'farmers', 'sandbag', 'wallballs'];

  const comparisons = useMemo(() => {
    // Use metricScores if available, otherwise create empty entries for all metrics
    const scoreMap = new Map(metricScores.map(s => [s.metric, s]));
    
    return ALL_METRICS.map(metric => {
      const score = scoreMap.get(metric);
      const benchmark = benchmarks.find(b => b.metric === metric);
      
      if (!score) {
        return {
          metric,
          athleteTime: null,
          referenceTime: benchmark?.avg_sec ?? null,
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
          difference: null,
          classification: 'none' as const,
          dataSource: score.data_source,
          hasBenchmark: false,
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
        metric,
        athleteTime: score.raw_time_sec,
        referenceTime: benchmark.avg_sec,
        p25: benchmark.p25_sec,
        p75: benchmark.p75_sec,
        difference: diff,
        classification,
        dataSource: score.data_source,
        hasBenchmark: true,
      };
    });
  }, [metricScores, benchmarks]);

  const levelLabel = athleteLevel.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const hasAnyBenchmark = comparisons.some(c => c.hasBenchmark);

  // Always render - never return null
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

  // Empty state when no benchmarks found
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
              Sem referência configurada para {normalizeDivision(division)} / {athleteGender === 'F' ? 'Feminino' : 'Masculino'} / {levelLabel}
            </p>
            <p className="text-xs text-muted-foreground/70">
              Ajuste no painel de Admin para habilitar comparações de nível.
            </p>
            
            {/* Admin debug info */}
            {isAdmin && lookupInfo && (
              <div className="mt-3 p-2 rounded bg-black/20 border border-border/30">
                <p className="text-xs font-mono text-muted-foreground">
                  [DEBUG] Lookup: division={lookupInfo.division}, gender={lookupInfo.gender}, level={lookupInfo.level}, set=v1; encontrados: {lookupInfo.found}
                </p>
              </div>
            )}
            
            {/* Show all metrics as empty */}
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
        {/* Admin debug info at top when data found */}
        {isAdmin && lookupInfo && (
          <div className="mb-3 p-2 rounded bg-black/20 border border-border/30">
            <p className="text-xs font-mono text-muted-foreground">
              [DEBUG] Lookup: division={lookupInfo.division}, gender={lookupInfo.gender}, level={lookupInfo.level}, set=v1; encontrados: {lookupInfo.found}
            </p>
          </div>
        )}

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
                  {comp.athleteTime !== null ? formatSecondsToMMSS(comp.athleteTime) : '—'}
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
