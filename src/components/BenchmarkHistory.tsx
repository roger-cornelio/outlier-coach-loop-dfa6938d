import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Trophy, TrendingUp, TrendingDown, Minus, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { WorkoutBlock, WorkoutResult, PerformanceBucket } from '@/types/outlier';

interface BenchmarkData {
  block: WorkoutBlock;
  results: WorkoutResult[];
  bestTime: number | null;
  lastTime: number | null;
  trend: 'improving' | 'declining' | 'stable' | 'new';
  improvement: number | null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getBucketForTime(time: number, block: WorkoutBlock): PerformanceBucket {
  if (block.targetRange && block.targetRange.min > 0 && block.targetRange.max > 0) {
    const mid = (block.targetRange.min + block.targetRange.max) / 2;
    if (time <= block.targetRange.min) return 'ELITE';
    if (time <= mid) return 'STRONG';
    if (time <= block.targetRange.max) return 'OK';
    return 'TOUGH';
  }
  
  if (block.targetSeconds) {
    const ratio = time / block.targetSeconds;
    if (ratio <= 0.85) return 'ELITE';
    if (ratio <= 0.95) return 'STRONG';
    if (ratio <= 1.10) return 'OK';
    return 'TOUGH';
  }
  
  return 'OK';
}

const bucketColors: Record<PerformanceBucket, string> = {
  ELITE: 'hsl(var(--status-excellent))',
  STRONG: 'hsl(var(--status-good))',
  OK: 'hsl(var(--primary))',
  TOUGH: 'hsl(var(--status-attention))',
  DNF: 'hsl(var(--status-below))',
};

export function BenchmarkHistory() {
  const { weeklyWorkouts, workoutResults } = useOutlierStore();
  const [expandedBenchmark, setExpandedBenchmark] = useState<string | null>(null);

  // Find all benchmark blocks and their results
  const benchmarkData = useMemo(() => {
    const benchmarks: BenchmarkData[] = [];

    // Get all benchmark blocks from current and historical workouts
    weeklyWorkouts.forEach(workout => {
      workout.blocks.forEach(block => {
        if (block.isBenchmark && block.isMainWod) {
          const results = workoutResults
            .filter(r => r.blockId === block.id && r.completed && r.timeInSeconds)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          if (results.length > 0) {
            const times = results.map(r => r.timeInSeconds!);
            const bestTime = Math.min(...times);
            const lastTime = times[times.length - 1];
            const firstTime = times[0];

            let trend: BenchmarkData['trend'] = 'new';
            let improvement: number | null = null;

            if (results.length > 1) {
              improvement = ((firstTime - lastTime) / firstTime) * 100;
              if (improvement > 2) trend = 'improving';
              else if (improvement < -2) trend = 'declining';
              else trend = 'stable';
            }

            benchmarks.push({
              block,
              results,
              bestTime,
              lastTime,
              trend,
              improvement,
            });
          }
        }
      });
    });

    return benchmarks;
  }, [weeklyWorkouts, workoutResults]);

  if (benchmarkData.length === 0) {
    return (
      <div className="p-6 rounded-lg bg-secondary/50 border border-border text-center">
        <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">
          Nenhum benchmark registrado ainda.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Complete WODs marcados como benchmark para ver seu progresso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-status-excellent" />
        <h3 className="font-display text-lg">EVOLUÇÃO DOS BENCHMARKS</h3>
      </div>

      {benchmarkData.map((data) => {
        const isExpanded = expandedBenchmark === data.block.id;
        const chartData = data.results.map(r => ({
          date: formatDate(r.date),
          time: r.timeInSeconds!,
          timeFormatted: formatTime(r.timeInSeconds!),
          bucket: getBucketForTime(r.timeInSeconds!, data.block),
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
                  <h4 className="font-display text-sm">{data.block.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{data.results.length} registro(s)</span>
                    {data.bestTime && (
                      <>
                        <span>•</span>
                        <span>PR: {formatTime(data.bestTime)}</span>
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
                          {data.bestTime ? formatTime(data.bestTime) : '-'}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50 text-center">
                        <Calendar className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Último</p>
                        <p className="font-display text-sm">
                          {data.lastTime ? formatTime(data.lastTime) : '-'}
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
    </div>
  );
}
