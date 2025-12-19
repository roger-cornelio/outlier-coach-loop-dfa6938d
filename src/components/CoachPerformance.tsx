import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useOutlierStore } from '@/store/outlierStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Award,
  Clock,
  Target,
  AlertCircle,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { getParamsForVersion, getActiveParams } from '@/config/outlierParams';

interface AthleteResult {
  id: string;
  user_id: string;
  workout_id: string;
  block_id: string;
  time_in_seconds: number | null;
  score: number | null;
  bucket: string | null;
  athlete_level: string | null;
  result_type: string | null;
  created_at: string;
  event_name: string | null;
  benchmark_id: string | null;
}

interface AthleteWithResults {
  userId: string;
  email: string;
  results: AthleteResult[];
}

interface BenchmarkSummary {
  benchmarkId: string;
  name: string;
  executions: number;
  avgTimeSeconds: number;
  bucketDistribution: Record<string, number>;
  trend: 'up' | 'down' | 'stable';
}

export function CoachPerformance() {
  const { user, isCoach, isAdmin, loading: authLoading } = useAuth();
  const { setCurrentView } = useOutlierStore();
  
  const [athletes, setAthletes] = useState<AthleteWithResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteWithResults | null>(null);

  // Fetch coach's athletes and their results
  useEffect(() => {
    async function fetchData() {
      if (!user || authLoading) return;
      
      try {
        setLoading(true);
        setError(null);

        // 1. Get athletes linked to this coach
        const { data: coachAthletes, error: athletesError } = await supabase
          .from('coach_athletes')
          .select('athlete_id')
          .eq('coach_id', user.id);

        if (athletesError) {
          console.error('Error fetching coach athletes:', athletesError);
          setError('Erro ao carregar atletas vinculados.');
          setLoading(false);
          return;
        }

        if (!coachAthletes || coachAthletes.length === 0) {
          setAthletes([]);
          setLoading(false);
          return;
        }

        const athleteIds = coachAthletes.map(a => a.athlete_id);

        // 2. Get profiles for these athletes
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', athleteIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // 3. Get benchmark results for these athletes
        const { data: results, error: resultsError } = await supabase
          .from('benchmark_results')
          .select('*')
          .in('user_id', athleteIds)
          .order('created_at', { ascending: false });

        if (resultsError) {
          console.error('Error fetching results:', resultsError);
          setError('Erro ao carregar resultados dos atletas.');
          setLoading(false);
          return;
        }

        // 4. Map results to athletes
        const athletesWithResults: AthleteWithResults[] = athleteIds.map(athleteId => {
          const profile = profiles?.find(p => p.user_id === athleteId);
          const athleteResults = (results || []).filter(r => r.user_id === athleteId);
          
          return {
            userId: athleteId,
            email: profile?.email || 'Atleta',
            results: athleteResults
          };
        });

        setAthletes(athletesWithResults);
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError('Erro inesperado ao carregar dados.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, authLoading]);

  // Aggregate statistics
  const stats = useMemo(() => {
    const allResults = athletes.flatMap(a => a.results);
    const benchmarkResults = allResults.filter(r => r.result_type === 'benchmark' && r.bucket);
    
    const bucketCounts: Record<string, number> = {
      ELITE: 0,
      STRONG: 0,
      OK: 0,
      TOUGH: 0
    };
    
    benchmarkResults.forEach(r => {
      if (r.bucket && bucketCounts.hasOwnProperty(r.bucket)) {
        bucketCounts[r.bucket]++;
      }
    });
    
    const total = benchmarkResults.length || 1;
    const bucketPercentages = {
      ELITE: Math.round((bucketCounts.ELITE / total) * 100),
      STRONG: Math.round((bucketCounts.STRONG / total) * 100),
      OK: Math.round((bucketCounts.OK / total) * 100),
      TOUGH: Math.round((bucketCounts.TOUGH / total) * 100)
    };
    
    const validTimes = allResults.filter(r => r.time_in_seconds && r.time_in_seconds > 0);
    const avgTimeSeconds = validTimes.length > 0
      ? validTimes.reduce((sum, r) => sum + (r.time_in_seconds || 0), 0) / validTimes.length
      : 0;
    
    return {
      totalAthletes: athletes.length,
      totalExecutions: allResults.length,
      bucketPercentages,
      avgTimeSeconds
    };
  }, [athletes]);

  // Benchmark summaries
  const benchmarkSummaries = useMemo((): BenchmarkSummary[] => {
    const allResults = athletes.flatMap(a => a.results);
    const benchmarkResults = allResults.filter(r => r.result_type === 'benchmark' && r.benchmark_id);
    
    const grouped: Record<string, AthleteResult[]> = {};
    benchmarkResults.forEach(r => {
      const key = r.benchmark_id || r.workout_id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });
    
    return Object.entries(grouped).map(([benchmarkId, results]) => {
      const validTimes = results.filter(r => r.time_in_seconds && r.time_in_seconds > 0);
      const avgTime = validTimes.length > 0
        ? validTimes.reduce((sum, r) => sum + (r.time_in_seconds || 0), 0) / validTimes.length
        : 0;
      
      const bucketDist: Record<string, number> = { ELITE: 0, STRONG: 0, OK: 0, TOUGH: 0 };
      results.forEach(r => {
        if (r.bucket && bucketDist.hasOwnProperty(r.bucket)) {
          bucketDist[r.bucket]++;
        }
      });
      
      // Calculate trend based on recent vs older results
      const sorted = [...results].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (sorted.length >= 2) {
        const recentAvg = sorted.slice(0, Math.ceil(sorted.length / 2))
          .filter(r => r.time_in_seconds)
          .reduce((sum, r) => sum + (r.time_in_seconds || 0), 0) / Math.max(1, Math.ceil(sorted.length / 2));
        const olderAvg = sorted.slice(Math.ceil(sorted.length / 2))
          .filter(r => r.time_in_seconds)
          .reduce((sum, r) => sum + (r.time_in_seconds || 0), 0) / Math.max(1, Math.floor(sorted.length / 2));
        
        if (recentAvg < olderAvg * 0.95) trend = 'up';
        else if (recentAvg > olderAvg * 1.05) trend = 'down';
      }
      
      return {
        benchmarkId,
        name: results[0]?.event_name || benchmarkId,
        executions: results.length,
        avgTimeSeconds: avgTime,
        bucketDistribution: bucketDist,
        trend
      };
    }).sort((a, b) => b.executions - a.executions);
  }, [athletes]);

  // Guard: only coach/admin can view
  if (!authLoading && !isCoach && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground">
              Acesso restrito a coaches autorizados.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBucketColor = (bucket: string) => {
    switch (bucket) {
      case 'ELITE': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'STRONG': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'OK': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'TOUGH': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  // Athlete detail view
  if (selectedAthlete) {
    const athleteResults = selectedAthlete.results
      .filter(r => r.result_type === 'benchmark')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedAthlete(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {selectedAthlete.email}
              </h1>
              <p className="text-sm text-muted-foreground">
                {athleteResults.length} execuções de benchmark
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Os critérios de avaliação são definidos pelo sistema (Admin) para garantir comparabilidade e evolução justa.
            </p>
          </div>

          {/* Results list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Benchmarks</CardTitle>
            </CardHeader>
            <CardContent>
              {athleteResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum benchmark executado ainda.
                </p>
              ) : (
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-3">
                    {athleteResults.map((result, idx) => {
                      const prevResult = athleteResults[idx + 1];
                      let trend: 'up' | 'down' | 'stable' = 'stable';
                      
                      if (prevResult && result.time_in_seconds && prevResult.time_in_seconds) {
                        if (result.time_in_seconds < prevResult.time_in_seconds * 0.98) trend = 'up';
                        else if (result.time_in_seconds > prevResult.time_in_seconds * 1.02) trend = 'down';
                      }
                      
                      return (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-4 rounded-lg bg-card border border-border/50"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-foreground truncate">
                                  {result.event_name || result.benchmark_id || result.workout_id}
                                </span>
                                {result.bucket && (
                                  <Badge variant="outline" className={getBucketColor(result.bucket)}>
                                    {result.bucket}
                                  </Badge>
                                )}
                                <TrendIcon trend={trend} />
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {result.time_in_seconds ? formatTime(result.time_in_seconds) : '--:--'}
                                </span>
                                <span>
                                  {new Date(result.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main view
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentView('admin')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Performance dos Atletas
            </h1>
            <p className="text-sm text-muted-foreground">
              Visão somente leitura dos seus atletas
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Os critérios de performance são definidos pelo sistema para garantir justiça e comparabilidade.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : athletes.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum atleta vinculado a você ainda.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                O administrador precisa vincular atletas ao seu perfil.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Atletas</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.totalAthletes}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Execuções</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.totalExecutions}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Tempo Médio</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {stats.avgTimeSeconds > 0 ? formatTime(stats.avgTimeSeconds) : '--'}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-muted-foreground">ELITE</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.bucketPercentages.ELITE}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Bucket distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Distribuição de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {(['ELITE', 'STRONG', 'OK', 'TOUGH'] as const).map(bucket => (
                    <div 
                      key={bucket}
                      className={`p-3 rounded-lg text-center ${getBucketColor(bucket)}`}
                    >
                      <p className="text-xs font-medium">{bucket}</p>
                      <p className="text-lg font-bold">{stats.bucketPercentages[bucket]}%</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Benchmark summaries */}
            {benchmarkSummaries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Benchmarks Executados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {benchmarkSummaries.slice(0, 10).map(benchmark => (
                    <div 
                      key={benchmark.benchmarkId}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{benchmark.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{benchmark.executions} execuções</span>
                          <span>Média: {formatTime(benchmark.avgTimeSeconds)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendIcon trend={benchmark.trend} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Athletes list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Meus Atletas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {athletes.map(athlete => {
                  const benchmarkCount = athlete.results.filter(r => r.result_type === 'benchmark').length;
                  const latestBucket = athlete.results.find(r => r.bucket)?.bucket;
                  
                  return (
                    <motion.button
                      key={athlete.userId}
                      onClick={() => setSelectedAthlete(athlete)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors text-left"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{athlete.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {benchmarkCount} benchmark{benchmarkCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {latestBucket && (
                          <Badge variant="outline" className={`text-xs ${getBucketColor(latestBucket)}`}>
                            {latestBucket}
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </motion.button>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
