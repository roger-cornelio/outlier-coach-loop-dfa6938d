import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Trophy, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Clock, Calendar } from 'lucide-react';
import type { WorkoutBlock, WorkoutResult, PerformanceBucket, BenchmarkDirection } from '@/types/outlier';
import { getEffectiveTargetRange, classifyBenchmarkPerformance, getBenchmarkMetricInfo } from '@/utils/benchmarkVariants';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getBlockDisplayTitle, getBlockCategoryLabel } from '@/utils/blockDisplayUtils';
import { HyroxResultCard } from './HyroxResultCard';

interface BenchmarkData {
  block: WorkoutBlock;
  results: WorkoutResult[];
  bestValue: number | null;
  lastValue: number | null;
  trend: 'improving' | 'declining' | 'stable' | 'new';
  improvement: number | null;
}

interface ExternalResult {
  id: string;
  result_type: 'simulado' | 'prova_oficial';
  event_name: string | null;
  event_date: string | null;
  time_in_seconds: number | null;
  screenshot_url: string | null;
  race_category: 'OPEN' | 'PRO' | null;
  created_at: string;
}

interface BenchmarkHistoryProps {
  filterType?: 'all' | 'benchmark' | 'simulado' | 'prova_oficial';
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getBucketForValue(
  value: number, 
  block: WorkoutBlock, 
  athleteLevel?: string
): PerformanceBucket {
  const effectiveRange = getEffectiveTargetRange(block, athleteLevel as any);
  const direction = block.benchmarkDirection || 'lower_is_better';
  
  if (effectiveRange && effectiveRange.min > 0 && effectiveRange.max > 0) {
    return classifyBenchmarkPerformance(value, effectiveRange, direction);
  }
  
  // Fallback for legacy time-based
  if (block.targetSeconds) {
    const ratio = value / block.targetSeconds;
    if (direction === 'lower_is_better') {
      if (ratio <= 0.85) return 'ELITE';
      if (ratio <= 0.95) return 'STRONG';
      if (ratio <= 1.10) return 'OK';
      return 'TOUGH';
    } else {
      if (ratio >= 1.15) return 'ELITE';
      if (ratio >= 1.05) return 'STRONG';
      if (ratio >= 0.90) return 'OK';
      return 'TOUGH';
    }
  }
  
  return 'OK';
}

/**
 * Get the best value based on direction
 */
function getBestValue(values: number[], direction: BenchmarkDirection): number {
  return direction === 'lower_is_better' 
    ? Math.min(...values) 
    : Math.max(...values);
}

/**
 * Calculate improvement percentage based on direction
 */
function calculateImprovement(first: number, last: number, direction: BenchmarkDirection): number {
  if (direction === 'lower_is_better') {
    return ((first - last) / first) * 100; // Positive = improved (faster)
  } else {
    return ((last - first) / first) * 100; // Positive = improved (more reps/distance)
  }
}

const bucketColors: Record<PerformanceBucket, string> = {
  ELITE: 'hsl(var(--status-excellent))',
  STRONG: 'hsl(var(--status-good))',
  OK: 'hsl(var(--primary))',
  TOUGH: 'hsl(var(--status-attention))',
  DNF: 'hsl(var(--status-below))',
};

export function BenchmarkHistory({ filterType = 'all' }: BenchmarkHistoryProps) {
  const { adaptedWorkouts, baseWorkouts, workoutResults, athleteConfig } = useOutlierStore();
  // Usar treinos adaptados quando disponíveis, senão base
  const displayWorkouts = adaptedWorkouts.length > 0 ? adaptedWorkouts : baseWorkouts;
  const { user } = useAuth();
  const [expandedBenchmark, setExpandedBenchmark] = useState<string | null>(null);
  const [externalResults, setExternalResults] = useState<ExternalResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch external results (simulados and provas) from Supabase
  useEffect(() => {
    const fetchExternalResults = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        let query = supabase
          .from('benchmark_results')
          .select('id, result_type, event_name, event_date, time_in_seconds, screenshot_url, race_category, created_at')
          .eq('user_id', user.id)
          .in('result_type', ['simulado', 'prova_oficial'])
          .order('created_at', { ascending: false });

        const { data, error } = await query;
        
        if (error) throw error;
        setExternalResults((data || []) as ExternalResult[]);
      } catch (err) {
        console.error('Error fetching external results:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExternalResults();
  }, [user]);

  // Filter external results based on filterType
  const filteredExternalResults = useMemo(() => {
    if (filterType === 'all') return externalResults;
    if (filterType === 'benchmark') return [];
    return externalResults.filter(r => r.result_type === filterType);
  }, [externalResults, filterType]);

  // Find all benchmark blocks and their results
  const benchmarkData = useMemo(() => {
    if (filterType === 'simulado' || filterType === 'prova_oficial') return [];
    
    const benchmarks: BenchmarkData[] = [];

    displayWorkouts.forEach(workout => {
      workout.blocks.forEach(block => {
        if (block.isBenchmark && block.isMainWod) {
          const results = workoutResults
            .filter(r => r.blockId === block.id && r.completed && r.timeInSeconds)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          if (results.length > 0) {
            const values = results.map(r => r.timeInSeconds!);
            const direction = block.benchmarkDirection || 'lower_is_better';
            const bestValue = getBestValue(values, direction);
            const lastValue = values[values.length - 1];
            const firstValue = values[0];

            let trend: BenchmarkData['trend'] = 'new';
            let improvement: number | null = null;

            if (results.length > 1) {
              improvement = calculateImprovement(firstValue, lastValue, direction);
              if (improvement > 2) trend = 'improving';
              else if (improvement < -2) trend = 'declining';
              else trend = 'stable';
            }

            benchmarks.push({
              block,
              results,
              bestValue,
              lastValue,
              trend,
              improvement,
            });
          }
        }
      });
    });

    return benchmarks;
  }, [displayWorkouts, workoutResults, filterType]);

  const hasContent = benchmarkData.length > 0 || filteredExternalResults.length > 0;

  if (!hasContent && !loading) {
    return (
      <div className="p-6 rounded-lg bg-secondary/50 border border-border text-center">
        <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">
          {filterType === 'simulado' 
            ? 'Nenhum simulado registrado ainda.'
            : filterType === 'prova_oficial'
              ? 'Nenhuma prova oficial registrada ainda.'
              : 'Nenhum resultado registrado ainda.'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Use o botão "Adicionar Resultado" para registrar seus tempos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* External Results - Simulados and Provas - Using HyroxResultCard */}
      {filteredExternalResults.length > 0 && (
        <div className="space-y-3">
          {filteredExternalResults.map((result) => (
            <HyroxResultCard
              key={result.id}
              result={result}
              gender={athleteConfig?.sexo === 'feminino' ? 'F' : 'M'}
            />
          ))}
        </div>
      )}

      {/* Regular Benchmarks */}
      {benchmarkData.length > 0 && (
        <>
          {filteredExternalResults.length > 0 && (
            <div className="flex items-center gap-2 mt-6 mb-4">
              <Trophy className="w-5 h-5 text-status-excellent" />
              <h3 className="font-display text-lg">BENCHMARKS DE TREINO</h3>
            </div>
          )}

          {benchmarkData.map((data, dataIndex) => {
            const isExpanded = expandedBenchmark === data.block.id;
            const direction = data.block.benchmarkDirection || 'lower_is_better';
            const metricInfo = getBenchmarkMetricInfo(data.block.benchmarkMetric || 'time_seconds');
            const chartData = data.results.map(r => ({
              date: formatDate(r.date),
              time: r.timeInSeconds!,
              timeFormatted: metricInfo.format(r.timeInSeconds!),
              bucket: getBucketForValue(r.timeInSeconds!, data.block, 'intermediario'),
            }));

            return (
              <motion.div
                key={data.block.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-elevated rounded-lg overflow-hidden"
              >
                {/* Header - always visible */}
                <button
                  onClick={() => setExpandedBenchmark(isExpanded ? null : data.block.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-status-excellent/10">
                      <Trophy className="w-5 h-5 text-status-excellent" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-display text-sm">{getBlockDisplayTitle(data.block, dataIndex)}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>• {getBlockCategoryLabel(data.block)}</span>
                        <span>•</span>
                        <span>{data.results.length} registro(s)</span>
                        {data.bestValue && (
                          <>
                            <span>•</span>
                            <span>PR: {metricInfo.format(data.bestValue)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Trend indicator */}
                    {data.trend === 'improving' && (
                      <div className="flex items-center gap-1 text-status-good text-xs">
                        <TrendingUp className="w-4 h-4" />
                        <span>+{data.improvement?.toFixed(1)}%</span>
                      </div>
                    )}
                    {data.trend === 'declining' && (
                      <div className="flex items-center gap-1 text-status-attention text-xs">
                        <TrendingDown className="w-4 h-4" />
                        <span>{data.improvement?.toFixed(1)}%</span>
                      </div>
                    )}
                    {data.trend === 'stable' && (
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Minus className="w-4 h-4" />
                        <span>estável</span>
                      </div>
                    )}
                    {data.trend === 'new' && (
                      <span className="text-xs text-muted-foreground">1º registro</span>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded content with chart */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 border-t border-border">
                        {/* Chart */}
                        <div className="h-48 mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                stroke="hsl(var(--border))"
                              />
                              <YAxis 
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                stroke="hsl(var(--border))"
                                tickFormatter={(value) => formatTime(value)}
                                domain={['auto', 'auto']}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--background))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                                formatter={(value: number) => [formatTime(value), 'Tempo']}
                                labelFormatter={(label) => `Data: ${label}`}
                              />
                              
                              {/* Target range reference lines */}
                              {data.block.targetRange && data.block.targetRange.min > 0 && (
                                <ReferenceLine 
                                  y={data.block.targetRange.min} 
                                  stroke="hsl(var(--status-excellent))" 
                                  strokeDasharray="5 5"
                                  label={{ 
                                    value: 'ELITE', 
                                    position: 'right', 
                                    fontSize: 10,
                                    fill: 'hsl(var(--status-excellent))'
                                  }}
                                />
                              )}
                              {data.block.targetRange && data.block.targetRange.max > 0 && (
                                <ReferenceLine 
                                  y={data.block.targetRange.max} 
                                  stroke="hsl(var(--status-attention))" 
                                  strokeDasharray="5 5"
                                  label={{ 
                                    value: 'MAX', 
                                    position: 'right', 
                                    fontSize: 10,
                                    fill: 'hsl(var(--status-attention))'
                                  }}
                                />
                              )}
                              
                              <Line
                                type="monotone"
                                dataKey="time"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                dot={(props) => {
                                  const { cx, cy, payload } = props;
                                  const color = bucketColors[payload.bucket as PerformanceBucket];
                                  return (
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={5}
                                      fill={color}
                                      stroke="hsl(var(--background))"
                                      strokeWidth={2}
                                    />
                                  );
                                }}
                                activeDot={{ r: 7, strokeWidth: 2 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Stats summary */}
                        <div className="grid grid-cols-3 gap-3 mt-4">
                          <div className="p-3 rounded-lg bg-secondary/50 text-center">
                            <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Melhor</p>
                            <p className="font-display text-sm text-status-excellent">
                              {data.bestValue ? metricInfo.format(data.bestValue) : '-'}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-secondary/50 text-center">
                            <Calendar className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Último</p>
                            <p className="font-display text-sm">
                              {data.lastValue ? metricInfo.format(data.lastValue) : '-'}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-secondary/50 text-center">
                            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Evolução</p>
                            <p className={`font-display text-sm ${
                              data.improvement && data.improvement > 0 
                                ? 'text-status-good' 
                                : data.improvement && data.improvement < 0 
                                  ? 'text-status-attention' 
                                  : ''
                            }`}>
                              {data.improvement !== null 
                                ? `${data.improvement > 0 ? '+' : ''}${data.improvement.toFixed(1)}%` 
                                : '-'}
                            </p>
                          </div>
                        </div>

                        {/* Target info */}
                        {data.block.targetRange && (
                          <div className="mt-3 p-3 rounded-lg bg-status-excellent/5 border border-status-excellent/20">
                            <p className="text-xs text-muted-foreground">
                              <Trophy className="w-3 h-3 inline mr-1" />
                              Faixa alvo: {formatTime(data.block.targetRange.min)} → {formatTime(data.block.targetRange.max)}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </>
      )}
    </div>
  );
}
