/**
 * BenchmarkCertificationScreen - Tela de Benchmark (Certificação de Nível)
 * 
 * O Benchmark é um treino-teste que o atleta executa para certificar o nível
 * (Beginner/Intermediate/Advanced/Hyrox Open/Pro/Elite) conforme as regras 
 * já existentes do sistema em Status do Atleta.
 * 
 * 3 Blocos:
 * 1. Sua Certificação - Status atual, último benchmark, CTA
 * 2. Como Funciona - Explicação do sistema
 * 3. Histórico - Tentativas anteriores
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Award, 
  CheckCircle2, 
  Clock, 
  Crown, 
  Info, 
  Play, 
  RefreshCw,
  History,
  Trophy,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LEVEL_NAMES, type AthleteStatus } from '@/types/outlier';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';
import { UserHeader } from './UserHeader';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface BenchmarkAttempt {
  id: string;
  performed_at: string;
  derived_level: AthleteStatus | null;
  score: number | null;
  time_in_seconds: number | null;
  status: 'completed' | 'pending';
}

export function BenchmarkCertificationScreen() {
  const { setCurrentView, athleteConfig } = useOutlierStore();
  const { status: currentStatus, rulerScore } = useAthleteStatus();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [lastBenchmark, setLastBenchmark] = useState<BenchmarkAttempt | null>(null);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkAttempt[]>([]);
  
  // Buscar histórico de benchmarks do atleta
  useEffect(() => {
    async function fetchBenchmarkHistory() {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('benchmark_results')
          .select('id, created_at, athlete_level, score, time_in_seconds, result_type')
          .eq('user_id', user.id)
          .eq('result_type', 'benchmark')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const attempts: BenchmarkAttempt[] = (data || []).map((item) => ({
          id: item.id,
          performed_at: item.created_at,
          derived_level: item.athlete_level as AthleteStatus | null,
          score: item.score ? Number(item.score) : null,
          time_in_seconds: item.time_in_seconds,
          status: 'completed' as const,
        }));
        
        setBenchmarkHistory(attempts);
        if (attempts.length > 0) {
          setLastBenchmark(attempts[0]);
        }
      } catch (err) {
        console.error('Error fetching benchmark history:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchBenchmarkHistory();
  }, [user?.id]);
  
  const handleStartBenchmark = () => {
    // TODO: Criar um workout benchmark padrão e iniciar execução
    // Por enquanto, redireciona para o treino semanal (usa a mesma execução de treinos)
    setCurrentView('benchmarks');
  };
  
  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };
  
  const formatTime = (seconds: number | null): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatDate = (dateStr: string): string => {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };
  
  const hasCompletedBenchmark = lastBenchmark !== null;
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToDashboard}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div>
                <OutlierWordmark size="sm" className="block" />
                <p className="text-sm text-muted-foreground">Benchmark (Certificação)</p>
              </div>
            </div>
            <UserHeader showLogout={true} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* BLOCO 1: Sua Certificação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Sua Certificação</CardTitle>
                  <CardDescription>Status atual e resultado do último benchmark</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Nível Atual */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Seu nível atual</p>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-primary" />
                        <span className="text-xl font-display font-bold text-primary">
                          {LEVEL_NAMES[currentStatus] || 'Iniciante'}
                        </span>
                      </div>
                    </div>
                    <Badge 
                      variant={hasCompletedBenchmark ? "default" : "secondary"}
                      className="text-sm"
                    >
                      {hasCompletedBenchmark ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Certificado</>
                      ) : (
                        'Não certificado'
                      )}
                    </Badge>
                  </div>
                  
                  {/* Último Benchmark */}
                  {hasCompletedBenchmark && lastBenchmark && (
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Último benchmark</span>
                        <span className="text-sm font-medium">{formatDate(lastBenchmark.performed_at)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Nível certificado</span>
                        <span className="text-sm font-medium text-primary">
                          {lastBenchmark.derived_level ? LEVEL_NAMES[lastBenchmark.derived_level] : 'N/A'}
                        </span>
                      </div>
                      {lastBenchmark.time_in_seconds && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-muted-foreground">Tempo</span>
                          <span className="text-sm font-mono">{formatTime(lastBenchmark.time_in_seconds)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* CTA Principal */}
                  <Button 
                    onClick={handleStartBenchmark}
                    size="lg"
                    className="w-full gap-2 text-lg py-6"
                  >
                    {hasCompletedBenchmark ? (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        Refazer Benchmark
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Iniciar Benchmark
                      </>
                    )}
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* BLOCO 2: Como Funciona */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Info className="w-5 h-5 text-blue-500" />
                </div>
                <CardTitle className="text-lg">Como funciona</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                O <span className="text-foreground font-medium">Benchmark</span> é um treino-teste padronizado 
                que confirma seu nível competitivo. Ao concluir o benchmark, sua régua de status é atualizada 
                automaticamente com base nas regras do sistema Outlier.
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <Clock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Duração estimada</p>
                  <p className="text-sm font-medium">15-25 min</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <Award className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Certificação</p>
                  <p className="text-sm font-medium">Automática</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <Trophy className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Atualiza</p>
                  <p className="text-sm font-medium">Nível e Régua</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* BLOCO 3: Histórico */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <History className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Histórico</CardTitle>
                  <CardDescription>Suas tentativas de benchmark</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : benchmarkHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Você ainda não fez seu benchmark.</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Complete seu primeiro benchmark para certificar seu nível.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Tempo</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {benchmarkHistory.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell className="font-medium">
                          {formatDate(attempt.performed_at)}
                        </TableCell>
                        <TableCell>
                          {attempt.derived_level ? (
                            <Badge variant="outline" className="text-xs">
                              {LEVEL_NAMES[attempt.derived_level] || attempt.derived_level}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatTime(attempt.time_in_seconds)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={attempt.status === 'completed' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {attempt.status === 'completed' ? 'Concluído' : 'Pendente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
