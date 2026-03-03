import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { Trophy, ChevronDown, Loader2 } from 'lucide-react';
import type { PerformanceBucket } from '@/types/outlier';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useBenchmarkResults } from '@/hooks/useBenchmarkResults';
import { LevelProgress } from './LevelProgress';

export function EvolutionMilestones() {
  const { athleteConfig } = useOutlierStore();
  const { 
    loading, 
    getWeeklyResults, 
    getBucketCounts, 
    totalBenchmarks 
  } = useBenchmarkResults();
  const [showDetails, setShowDetails] = useState(false);

  const chartData = getWeeklyResults();
  const bucketCounts = getBucketCounts() as Record<PerformanceBucket, number>;

  if (loading) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/20">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-display text-xl">Sua Jornada</h3>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!athleteConfig) {
    return null;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-3 shadow-xl">
          <p className="text-xs text-muted-foreground mb-1">Semana de {data.weekLabel}</p>
          <p className="font-display text-lg text-primary">{data.avgScore}%</p>
          <p className="text-xs text-muted-foreground">{data.benchmarks} benchmark{data.benchmarks !== 1 ? 's' : ''}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card-elevated p-4 sm:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-primary/20">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-display text-xl">Sua Jornada</h3>
      </div>

      {/* Main Level Progress - Gamified View */}
      <LevelProgress />

      {/* Details Toggle */}
      {totalBenchmarks > 0 && (
        <div className="mt-5 pt-4 border-t border-border/50">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Ver estatísticas detalhadas</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4">
                  {/* Performance Buckets */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Distribuição de Performance</p>
                    <div className="grid grid-cols-5 gap-2">
                      {(['ELITE', 'STRONG', 'OK', 'TOUGH', 'DNF'] as PerformanceBucket[]).map((bucket) => {
                        const count = bucketCounts[bucket];
                        const colors: Record<PerformanceBucket, string> = {
                          ELITE: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
                          STRONG: 'bg-green-500/20 text-green-500 border-green-500/30',
                          OK: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
                          TOUGH: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
                          DNF: 'bg-red-500/20 text-red-500 border-red-500/30',
                        };
                        return (
                          <div
                            key={bucket}
                            className={`p-2 rounded-lg border text-center ${count > 0 ? colors[bucket] : 'bg-secondary/30 text-muted-foreground border-border/50'}`}
                          >
                            <div className="font-display text-lg">{count}</div>
                            <div className="text-[9px] uppercase tracking-wide opacity-80">{bucket}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Weekly Chart */}
                  {chartData.length > 1 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Evolução Semanal</p>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis 
                              dataKey="weekLabel" 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis 
                              domain={[0, 100]}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                              tickFormatter={(value) => `${value}%`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="avgScore"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              fill="url(#scoreGradient)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="text-xs text-muted-foreground text-center">
                    {totalBenchmarks} benchmark{totalBenchmarks !== 1 ? 's' : ''} completado{totalBenchmarks !== 1 ? 's' : ''}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
