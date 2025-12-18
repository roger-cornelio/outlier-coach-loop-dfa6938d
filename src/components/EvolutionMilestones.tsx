import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { Trophy, Target, TrendingUp, Star, Award, Zap, ChevronRight } from 'lucide-react';
import { classifyBenchmarkPerformance, calculateBenchmarkScore } from '@/utils/benchmarkVariants';
import type { AthleteLevel, PerformanceBucket } from '@/types/outlier';

interface BenchmarkResult {
  blockId: string;
  benchmarkId?: string;
  timeInSeconds: number;
  date: string;
  bucket?: PerformanceBucket;
  score?: number;
}

interface MilestoneData {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number; // 0-100
  achieved: boolean;
  level: 'bronze' | 'silver' | 'gold' | 'elite';
}

const LEVEL_ORDER: AthleteLevel[] = ['iniciante', 'intermediario', 'avancado', 'hyrox_pro'];

const LEVEL_DISPLAY: Record<AthleteLevel, { name: string; color: string; bgColor: string }> = {
  iniciante: { name: 'Iniciante', color: 'text-emerald-500', bgColor: 'bg-emerald-500/20' },
  intermediario: { name: 'Intermediário', color: 'text-blue-500', bgColor: 'bg-blue-500/20' },
  avancado: { name: 'Avançado', color: 'text-purple-500', bgColor: 'bg-purple-500/20' },
  hyrox_pro: { name: 'HYROX PRO', color: 'text-amber-500', bgColor: 'bg-amber-500/20' },
};

const BUCKET_SCORES: Record<PerformanceBucket, number> = {
  ELITE: 100,
  STRONG: 80,
  OK: 60,
  TOUGH: 40,
  DNF: 0,
};

export function EvolutionMilestones() {
  const { workoutResults, weeklyWorkouts, athleteConfig } = useOutlierStore();

  const evolutionData = useMemo(() => {
    if (!athleteConfig) return null;

    // Get all benchmark blocks from weekly workouts
    const benchmarkBlocks = weeklyWorkouts.flatMap(w => 
      w.blocks.filter(b => b.isBenchmark)
    );

    // Get completed benchmark results
    const benchmarkResults: BenchmarkResult[] = workoutResults
      .filter(r => r.completed && r.timeInSeconds)
      .map(r => {
        const block = benchmarkBlocks.find(b => b.id === r.blockId);
        if (!block) return null;

        const bucket = classifyBenchmarkPerformance(
          r.timeInSeconds!,
          block.targetRange || block.levelTargetRanges?.[athleteConfig.level],
          block.benchmarkDirection || 'lower_is_better'
        );

        const score = calculateBenchmarkScore(
          r.timeInSeconds!,
          block.targetRange || block.levelTargetRanges?.[athleteConfig.level],
          block.benchmarkDirection || 'lower_is_better',
          block.benchmarkWeight || 1
        );

        return {
          blockId: r.blockId,
          benchmarkId: block.benchmarkId,
          timeInSeconds: r.timeInSeconds!,
          date: r.date,
          bucket,
          score,
        };
      })
      .filter(Boolean) as BenchmarkResult[];

    // Calculate average score
    const totalScore = benchmarkResults.reduce((sum, r) => sum + (r.score || 0), 0);
    const avgScore = benchmarkResults.length > 0 ? totalScore / benchmarkResults.length : 0;

    // Count performance buckets
    const bucketCounts: Record<PerformanceBucket, number> = {
      ELITE: 0,
      STRONG: 0,
      OK: 0,
      TOUGH: 0,
      DNF: 0,
    };
    benchmarkResults.forEach(r => {
      if (r.bucket) bucketCounts[r.bucket]++;
    });

    // Calculate evolution level based on performance
    const currentLevelIndex = LEVEL_ORDER.indexOf(athleteConfig.level);
    let suggestedLevelIndex = currentLevelIndex;
    
    if (avgScore >= 90 && bucketCounts.ELITE >= 2) {
      suggestedLevelIndex = Math.min(currentLevelIndex + 1, LEVEL_ORDER.length - 1);
    } else if (avgScore < 40 && bucketCounts.TOUGH + bucketCounts.DNF > bucketCounts.ELITE + bucketCounts.STRONG) {
      suggestedLevelIndex = Math.max(currentLevelIndex - 1, 0);
    }

    // Progress to next level (0-100)
    const progressToNextLevel = currentLevelIndex < LEVEL_ORDER.length - 1
      ? Math.min(100, (avgScore / 90) * 100)
      : 100;

    return {
      benchmarkResults,
      avgScore,
      bucketCounts,
      totalBenchmarks: benchmarkResults.length,
      currentLevel: athleteConfig.level,
      suggestedLevel: LEVEL_ORDER[suggestedLevelIndex],
      progressToNextLevel,
      shouldEvolve: suggestedLevelIndex > currentLevelIndex,
    };
  }, [workoutResults, weeklyWorkouts, athleteConfig]);

  const milestones = useMemo((): MilestoneData[] => {
    if (!evolutionData) return [];

    const { bucketCounts, totalBenchmarks, avgScore } = evolutionData;

    return [
      {
        id: 'first_benchmark',
        title: 'Primeiro Benchmark',
        description: 'Complete seu primeiro benchmark',
        icon: <Target className="w-5 h-5" />,
        progress: totalBenchmarks >= 1 ? 100 : 0,
        achieved: totalBenchmarks >= 1,
        level: 'bronze',
      },
      {
        id: 'consistency',
        title: 'Consistência',
        description: 'Complete 5 benchmarks',
        icon: <TrendingUp className="w-5 h-5" />,
        progress: Math.min(100, (totalBenchmarks / 5) * 100),
        achieved: totalBenchmarks >= 5,
        level: 'silver',
      },
      {
        id: 'strong_performer',
        title: 'Performance Forte',
        description: 'Alcance 3 classificações STRONG ou superior',
        icon: <Zap className="w-5 h-5" />,
        progress: Math.min(100, ((bucketCounts.STRONG + bucketCounts.ELITE) / 3) * 100),
        achieved: bucketCounts.STRONG + bucketCounts.ELITE >= 3,
        level: 'silver',
      },
      {
        id: 'elite_status',
        title: 'Status Elite',
        description: 'Alcance classificação ELITE em um benchmark',
        icon: <Star className="w-5 h-5" />,
        progress: bucketCounts.ELITE >= 1 ? 100 : Math.min(99, avgScore),
        achieved: bucketCounts.ELITE >= 1,
        level: 'gold',
      },
      {
        id: 'evolution_ready',
        title: 'Pronto para Evoluir',
        description: 'Score médio acima de 90%',
        icon: <Award className="w-5 h-5" />,
        progress: Math.min(100, (avgScore / 90) * 100),
        achieved: avgScore >= 90,
        level: 'elite',
      },
    ];
  }, [evolutionData]);

  if (!evolutionData || evolutionData.totalBenchmarks === 0) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/20">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-display text-xl">Marcos de Evolução</h3>
        </div>
        <p className="text-muted-foreground text-sm">
          Complete benchmarks para acompanhar sua evolução e desbloquear marcos.
        </p>
      </div>
    );
  }

  const getLevelColor = (level: MilestoneData['level']) => {
    switch (level) {
      case 'bronze': return 'from-amber-700 to-amber-500';
      case 'silver': return 'from-slate-400 to-slate-300';
      case 'gold': return 'from-yellow-500 to-amber-400';
      case 'elite': return 'from-purple-600 to-pink-500';
    }
  };

  const currentLevelInfo = LEVEL_DISPLAY[evolutionData.currentLevel];
  const nextLevel = LEVEL_ORDER[LEVEL_ORDER.indexOf(evolutionData.currentLevel) + 1];
  const nextLevelInfo = nextLevel ? LEVEL_DISPLAY[nextLevel] : null;

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/20">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-xl">Marcos de Evolução</h3>
          <p className="text-sm text-muted-foreground">
            {evolutionData.totalBenchmarks} benchmark{evolutionData.totalBenchmarks !== 1 ? 's' : ''} completado{evolutionData.totalBenchmarks !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Level Progress */}
      <div className="mb-6 p-4 rounded-xl bg-secondary/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-md text-xs font-bold ${currentLevelInfo.bgColor} ${currentLevelInfo.color}`}>
              {currentLevelInfo.name}
            </span>
          </div>
          {nextLevelInfo && (
            <div className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${nextLevelInfo.bgColor} ${nextLevelInfo.color} opacity-60`}>
                {nextLevelInfo.name}
              </span>
            </div>
          )}
        </div>
        
        <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${evolutionData.progressToNextLevel}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/60 rounded-full"
          />
        </div>
        
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Score médio: {Math.round(evolutionData.avgScore)}%</span>
          {nextLevelInfo && (
            <span>{Math.round(evolutionData.progressToNextLevel)}% para {nextLevelInfo.name}</span>
          )}
        </div>

        {evolutionData.shouldEvolve && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30"
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-500">
                Você está pronto para evoluir para {LEVEL_DISPLAY[evolutionData.suggestedLevel].name}!
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {(['ELITE', 'STRONG', 'OK', 'TOUGH', 'DNF'] as PerformanceBucket[]).map((bucket) => {
          const count = evolutionData.bucketCounts[bucket];
          const colors: Record<PerformanceBucket, string> = {
            ELITE: 'bg-gradient-to-b from-amber-500/30 to-amber-600/30 text-amber-500 border-amber-500/30',
            STRONG: 'bg-gradient-to-b from-green-500/30 to-green-600/30 text-green-500 border-green-500/30',
            OK: 'bg-gradient-to-b from-blue-500/30 to-blue-600/30 text-blue-500 border-blue-500/30',
            TOUGH: 'bg-gradient-to-b from-orange-500/30 to-orange-600/30 text-orange-500 border-orange-500/30',
            DNF: 'bg-gradient-to-b from-red-500/30 to-red-600/30 text-red-500 border-red-500/30',
          };
          return (
            <div
              key={bucket}
              className={`p-2 rounded-lg border text-center ${count > 0 ? colors[bucket] : 'bg-secondary/30 text-muted-foreground border-border/50'}`}
            >
              <div className="font-display text-xl">{count}</div>
              <div className="text-[10px] uppercase tracking-wide opacity-80">{bucket}</div>
            </div>
          );
        })}
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        {milestones.map((milestone, index) => (
          <motion.div
            key={milestone.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-3 rounded-lg border transition-all ${
              milestone.achieved
                ? 'bg-gradient-to-r from-primary/10 to-transparent border-primary/30'
                : 'bg-secondary/30 border-border/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                milestone.achieved
                  ? `bg-gradient-to-br ${getLevelColor(milestone.level)} text-white`
                  : 'bg-secondary text-muted-foreground'
              }`}>
                {milestone.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium text-sm ${milestone.achieved ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {milestone.title}
                  </span>
                  {milestone.achieved && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      ✓ Desbloqueado
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">{milestone.description}</p>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${milestone.progress}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className={`h-full rounded-full ${
                      milestone.achieved
                        ? `bg-gradient-to-r ${getLevelColor(milestone.level)}`
                        : 'bg-muted-foreground/50'
                    }`}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
