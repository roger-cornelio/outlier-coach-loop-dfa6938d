/**
 * CoachDashboard - Painel exclusivo do Coach (MVP)
 * 
 * Conteúdo:
 * - Cabeçalho: Painel do Coach
 * - Seção: Atletas vinculados (via profiles.coach_id)
 * - Seção: Treinos do coach (via workouts.coach_id)
 * - Botão: Sair (Logout)
 * 
 * Regras:
 * - Apenas coach, admin ou superadmin podem acessar (protegido por AppGate)
 * - Coach NUNCA acessa /app (fluxo de atleta)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users, Dumbbell, LogOut, User, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface LinkedAthlete {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
}

interface CoachWorkout {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function CoachDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [athletes, setAthletes] = useState<LinkedAthlete[]>([]);
  const [workouts, setWorkouts] = useState<CoachWorkout[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(true);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);

  // Buscar atletas vinculados ao coach (via profiles.coach_id)
  useEffect(() => {
    async function fetchAthletes() {
      if (!profile?.id) return;

      try {
        setLoadingAthletes(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_id, name, email')
          .eq('coach_id', profile.id);

        if (error) {
          console.error('[CoachDashboard] Erro ao buscar atletas:', error);
          setAthletes([]);
        } else {
          setAthletes(data || []);
        }
      } finally {
        setLoadingAthletes(false);
      }
    }

    if (profile?.id) {
      fetchAthletes();
    }
  }, [profile?.id]);

  // Buscar treinos do coach (via workouts.coach_id)
  useEffect(() => {
    async function fetchWorkouts() {
      if (!profile?.id) return;

      try {
        setLoadingWorkouts(true);
        const { data, error } = await supabase
          .from('workouts')
          .select('id, title, status, created_at')
          .eq('coach_id', profile.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[CoachDashboard] Erro ao buscar treinos:', error);
          setWorkouts([]);
        } else {
          setWorkouts(data || []);
        }
      } finally {
        setLoadingWorkouts(false);
      }
    }

    if (profile?.id) {
      fetchWorkouts();
    }
  }, [profile?.id]);

  // Logout
  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-[hsl(0,0%,3%)] p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel do Coach</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seus atletas e acompanhe treinos
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </motion.div>

        {/* Seção: Atletas vinculados */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" />
                Atletas Vinculados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAthletes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : athletes.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Atletas vinculados aparecerão aqui.
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {athletes.map((athlete) => (
                      <div
                        key={athlete.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {athlete.name || athlete.email}
                          </p>
                          {athlete.name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {athlete.email}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                          Ativo
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Seção: Treinos */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Dumbbell className="w-5 h-5 text-primary" />
                Treinos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingWorkouts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : workouts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum treino criado ainda.
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {workouts.map((workout) => (
                      <div
                        key={workout.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Dumbbell className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {workout.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(workout.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            workout.status === 'published'
                              ? 'bg-green-500/10 text-green-400 border-green-500/30'
                              : workout.status === 'draft'
                              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {workout.status === 'published'
                            ? 'Publicado'
                            : workout.status === 'draft'
                            ? 'Rascunho'
                            : workout.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
