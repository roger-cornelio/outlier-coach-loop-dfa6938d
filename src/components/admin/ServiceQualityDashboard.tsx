/**
 * ServiceQualityDashboard - Tela de Qualidade do Atendimento
 * 
 * Propósito: Monitorar a qualidade do atendimento dos coaches aos atletas.
 * NÃO avalia performance esportiva - avalia engajamento, constância e satisfação.
 * 
 * Estrutura:
 * 1. Cards de visão geral (topo)
 * 2. Lista de coaches (núcleo)
 * 3. Alertas inteligentes (rodapé)
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getCoachDisplayName } from '@/utils/displayName';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  AlertCircle,
  Info,
  TrendingDown,
  UserCheck,
  Activity,
  AlertTriangle,
  Star,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoachData {
  id: string;
  name: string;
  email: string;
  athleteCount: number;
  consistency: number; // percentage
  avgRating: number; // 1-5
  status: 'excellent' | 'attention' | 'critical';
}

interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  icon: React.ReactNode;
}

export function ServiceQualityDashboard() {
  const { isAdmin, loading: authLoading } = useAuth();
  
  const [coaches, setCoaches] = useState<CoachData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch coaches and their metrics using the SAME data source as UserManagement
  useEffect(() => {
    async function fetchData() {
      if (authLoading) return;
      
      try {
        setLoading(true);
        setError(null);

        // 1. Get all coach-athlete links from coach_athletes table (source of truth)
        const { data: coachAthleteLinks, error: linksError } = await supabase
          .from('coach_athletes')
          .select('*');

        if (linksError) {
          console.error('Error fetching coach_athletes:', linksError);
          setError('Erro ao carregar vínculos coach-atleta.');
          setLoading(false);
          return;
        }

        // 2. Get all coaches (users with coach role)
        const { data: coachRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'coach');

        if (rolesError) {
          console.error('Error fetching coach roles:', rolesError);
          setError('Erro ao carregar coaches.');
          setLoading(false);
          return;
        }

        if (!coachRoles || coachRoles.length === 0) {
          setCoaches([]);
          setLoading(false);
          return;
        }

        const coachUserIds = coachRoles.map(r => r.user_id);

        // 3. Get coach profiles
        const { data: coachProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, name, email')
          .in('user_id', coachUserIds);

        if (profilesError) {
          console.error('Error fetching coach profiles:', profilesError);
          setError('Erro ao carregar perfis de coaches.');
          setLoading(false);
          return;
        }

        // 4. Get all athlete profiles for metrics calculation
        const allAthleteIds = [...new Set((coachAthleteLinks || []).map(link => link.athlete_id))];
        
        let athleteProfiles: { id: string; user_id: string; name: string | null; email: string }[] = [];
        if (allAthleteIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, user_id, name, email')
            .in('user_id', allAthleteIds);
          athleteProfiles = profiles || [];
        }

        // 5. Get all benchmark results for athletes
        let allBenchmarkResults: { id: string; user_id: string; completed: boolean }[] = [];
        if (allAthleteIds.length > 0) {
          const { data: results } = await supabase
            .from('benchmark_results')
            .select('id, user_id, completed')
            .in('user_id', allAthleteIds);
          allBenchmarkResults = results || [];
        }

        // 6. Build coach data using coach_athletes links (same logic as UserManagement)
        const coachData: CoachData[] = (coachProfiles || []).map((coach) => {
          // Get athletes linked to this coach via coach_athletes table
          // Note: coach_athletes uses coach_id = user_id (auth.uid), not profile.id
          const linkedAthleteIds = (coachAthleteLinks || [])
            .filter(link => link.coach_id === coach.user_id)
            .map(link => link.athlete_id);

          const athleteCount = linkedAthleteIds.length;

          // Calculate consistency from benchmark results
          let consistency = 0;
          if (linkedAthleteIds.length > 0) {
            const athleteResults = allBenchmarkResults.filter(r => 
              linkedAthleteIds.includes(r.user_id)
            );

            if (athleteResults.length > 0) {
              const completedCount = athleteResults.filter(r => r.completed).length;
              consistency = Math.round((completedCount / athleteResults.length) * 100);
            }
          }

          // Calculate status based on consistency and athlete count
          // Rating is derived from consistency until a rating system exists
          const avgRating = athleteCount > 0 ? 4.0 + (consistency / 100) * 1 : 0;
          
          let status: 'excellent' | 'attention' | 'critical' = 'excellent';
          if (athleteCount === 0) {
            status = 'attention';
          } else if (consistency < 50 || avgRating < 3) {
            status = 'critical';
          } else if (consistency < 70 || avgRating < 4) {
            status = 'attention';
          }

          return {
            id: coach.id,
            name: getCoachDisplayName(coach),
            email: coach.email || '',
            athleteCount,
            consistency,
            avgRating: parseFloat(avgRating.toFixed(1)),
            status
          };
        });

        // Only show coaches with athletes linked via coach_athletes
        setCoaches(coachData.filter(c => c.athleteCount > 0));

      } catch (err) {
        console.error('Error in fetchData:', err);
        setError('Erro inesperado ao carregar dados.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [authLoading]);

  // Calculate overview stats
  const stats = useMemo(() => {
    const activeCoaches = coaches.filter(c => c.athleteCount > 0).length;
    const totalAthletes = coaches.reduce((sum, c) => sum + c.athleteCount, 0);
    
    const avgConsistency = coaches.length > 0
      ? Math.round(coaches.reduce((sum, c) => sum + c.consistency, 0) / coaches.length)
      : 0;
    
    const avgRating = coaches.length > 0
      ? parseFloat((coaches.reduce((sum, c) => sum + c.avgRating, 0) / coaches.length).toFixed(1))
      : 0;
    
    const riskCoaches = coaches.filter(c => c.status === 'critical' || c.status === 'attention').length;

    return {
      activeCoaches,
      totalAthletes,
      avgConsistency,
      avgRating,
      riskCoaches
    };
  }, [coaches]);

  // Generate smart alerts
  const alerts = useMemo((): Alert[] => {
    const alertList: Alert[] = [];

    const criticalCoaches = coaches.filter(c => c.status === 'critical');
    const attentionCoaches = coaches.filter(c => c.status === 'attention');
    const lowConsistencyCoaches = coaches.filter(c => c.consistency < 50);

    if (criticalCoaches.length > 0) {
      alertList.push({
        id: 'critical-coaches',
        type: 'critical',
        message: `${criticalCoaches.length} coach${criticalCoaches.length > 1 ? 'es' : ''} com status crítico necessitando atenção imediata`,
        icon: <AlertCircle className="w-4 h-4" />
      });
    }

    if (lowConsistencyCoaches.length > 0) {
      alertList.push({
        id: 'low-consistency',
        type: 'warning',
        message: `${lowConsistencyCoaches.length} coach${lowConsistencyCoaches.length > 1 ? 'es' : ''} com constância abaixo de 50%`,
        icon: <TrendingDown className="w-4 h-4" />
      });
    }

    if (attentionCoaches.length > 0 && criticalCoaches.length === 0) {
      alertList.push({
        id: 'attention-coaches',
        type: 'warning',
        message: `${attentionCoaches.length} coach${attentionCoaches.length > 1 ? 'es' : ''} requer${attentionCoaches.length > 1 ? 'em' : ''} acompanhamento`,
        icon: <AlertTriangle className="w-4 h-4" />
      });
    }

    if (alertList.length === 0 && coaches.length > 0) {
      alertList.push({
        id: 'all-good',
        type: 'info',
        message: 'Todos os coaches estão com bom desempenho operacional',
        icon: <CheckCircle2 className="w-4 h-4" />
      });
    }

    return alertList;
  }, [coaches]);

  // Guard: only admin can view
  if (!authLoading && !isAdmin) {
    return (
      <div className="flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground">
              Acesso restrito a administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: CoachData['status']) => {
    switch (status) {
      case 'excellent':
        return (
          <div className="flex items-center gap-1.5">
            <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500" />
            <span className="text-xs text-muted-foreground">Excelente</span>
          </div>
        );
      case 'attention':
        return (
          <div className="flex items-center gap-1.5">
            <Circle className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
            <span className="text-xs text-muted-foreground">Atenção</span>
          </div>
        );
      case 'critical':
        return (
          <div className="flex items-center gap-1.5">
            <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500" />
            <span className="text-xs text-muted-foreground">Crítico</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with helper text */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground tracking-wide">
          QUALIDADE DO ATENDIMENTO
        </h2>
        <p className="text-sm text-muted-foreground">
          Acompanhe a atuação dos coaches e a experiência dos atletas no Outlier
        </p>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Os dados abaixo refletem engajamento, constância e satisfação. Não representam desempenho esportivo individual.
          </p>
        </div>
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
      ) : (
        <>
          {/* 1. Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Coaches ativos</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-foreground">{stats.activeCoaches}</p>
              </CardContent>
            </Card>
            
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Constância atletas</span>
                </div>
                <p className={cn(
                  "text-2xl font-bold mt-1",
                  stats.avgConsistency >= 70 ? "text-primary" : 
                  stats.avgConsistency >= 50 ? "text-yellow-500" : "text-red-500"
                )}>
                  {stats.avgConsistency}%
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Satisfação média</span>
                </div>
                <p className={cn(
                  "text-2xl font-bold mt-1 flex items-center gap-1",
                  stats.avgRating >= 4 ? "text-primary" : 
                  stats.avgRating >= 3 ? "text-yellow-500" : "text-red-500"
                )}>
                  {stats.avgRating > 0 ? stats.avgRating : '--'}
                  <span className="text-sm font-normal text-muted-foreground">/ 5</span>
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={cn(
                    "w-4 h-4",
                    stats.riskCoaches > 0 ? "text-red-500" : "text-muted-foreground"
                  )} />
                  <span className="text-xs text-muted-foreground">Risco operacional</span>
                </div>
                <p className={cn(
                  "text-2xl font-bold mt-1",
                  stats.riskCoaches > 0 ? "text-red-500" : "text-foreground"
                )}>
                  {stats.riskCoaches}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 2. Coach List */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Lista de Coaches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coaches.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum coach com atletas vinculados.
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  {/* Table Header */}
                  <div className="grid grid-cols-5 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border/30 mb-2">
                    <div>Coach</div>
                    <div className="text-center">Atletas</div>
                    <div className="text-center">Constância</div>
                    <div className="text-center">Avaliação</div>
                    <div className="text-center">Status</div>
                  </div>
                  
                  {/* Table Rows */}
                  <div className="space-y-1">
                    {coaches.map((coach) => (
                      <div 
                        key={coach.id}
                        className={cn(
                          "grid grid-cols-5 gap-4 px-3 py-3 rounded-lg transition-colors",
                          "bg-muted/20 border border-border/20",
                          coach.status === 'critical' && "border-l-2 border-l-red-500/50",
                          coach.status === 'attention' && "border-l-2 border-l-yellow-500/50",
                          coach.status === 'excellent' && "border-l-2 border-l-green-500/50"
                        )}
                      >
                        <div className="flex flex-col justify-center min-w-0">
                          <p className="font-medium text-sm truncate text-foreground">
                            {coach.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {coach.email}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-center">
                          <span className="text-sm font-medium text-foreground">
                            {coach.athleteCount}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-center">
                          <span className={cn(
                            "text-sm font-medium",
                            coach.consistency >= 70 ? "text-green-500" :
                            coach.consistency >= 50 ? "text-yellow-500" : "text-red-500"
                          )}>
                            {coach.consistency}%
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium text-foreground">
                            {coach.avgRating}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-center">
                          {getStatusBadge(coach.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* 3. Smart Alerts */}
          {alerts.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Alertas Operacionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg border",
                      alert.type === 'critical' && "bg-red-500/5 border-red-500/20 text-red-400",
                      alert.type === 'warning' && "bg-yellow-500/5 border-yellow-500/20 text-yellow-500",
                      alert.type === 'info' && "bg-muted/30 border-border/30 text-muted-foreground"
                    )}
                  >
                    {alert.icon}
                    <span className="text-sm">{alert.message}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
