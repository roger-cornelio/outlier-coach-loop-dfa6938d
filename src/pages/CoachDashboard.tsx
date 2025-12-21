/**
 * CoachDashboard - Painel COMPLETO do Coach
 * 
 * Tabs:
 * - Atletas: atletas vinculados (via profiles.coach_id)
 * - Treinos: CRUD de treinos do coach
 * - Planilha: Template padrão do coach (AdminSpreadsheet)
 * - Benchmarks: Gerenciar benchmarks
 * - Parâmetros: Regras e configurações do coach (AdminParamsEditor)
 * 
 * Regras:
 * - Apenas coach, admin ou superadmin podem acessar (protegido por AppGate)
 * - Coach NUNCA acessa /app (fluxo de atleta)
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLogout } from '@/hooks/useLogout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, Users, Dumbbell, LogOut, User, FileText, Plus, 
  LayoutGrid, Settings2, Trophy, Send, Archive, Trash2, Eye, UserPlus, UserMinus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { CreateWorkoutModal } from '@/components/CreateWorkoutModal';
import { CoachWorkoutManager } from '@/components/CoachWorkoutManager';
import { CoachSpreadsheetTab } from '@/components/CoachSpreadsheetTab';
import { CoachBenchmarksTab } from '@/components/CoachBenchmarksTab';
import { AdminParamsEditor } from '@/components/AdminParamsEditor';
import { LinkAthleteModal } from '@/components/LinkAthleteModal';
import { useToast } from '@/hooks/use-toast';

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
  price: number;
}

export default function CoachDashboard() {
  const { profile, isAdmin } = useAuth();
  const { logout, isLoggingOut } = useLogout();
  const { toast } = useToast();

  const [athletes, setAthletes] = useState<LinkedAthlete[]>([]);
  const [workouts, setWorkouts] = useState<CoachWorkout[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(true);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinkAthleteModal, setShowLinkAthleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('atletas');

  // Função para recarregar treinos
  const fetchWorkouts = async () => {
    if (!profile?.id) return;

    try {
      setLoadingWorkouts(true);
      const { data, error } = await supabase
        .from('workouts')
        .select('id, title, status, created_at, price')
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
  };

  // Função para recarregar atletas
  const fetchAthletes = async () => {
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
  };

  // Buscar atletas vinculados ao coach (via profiles.coach_id)
  useEffect(() => {
    if (profile?.id) {
      fetchAthletes();
    }
  }, [profile?.id]);

  // Desvincular atleta
  const handleUnlinkAthlete = async (athleteId: string, athleteName: string) => {
    const confirmed = window.confirm(`Desvincular ${athleteName}?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from('profiles')
      .update({ coach_id: null })
      .eq('id', athleteId);

    if (error) {
      toast({ title: 'Erro ao desvincular', variant: 'destructive' });
    } else {
      toast({ title: 'Atleta desvinculado' });
      fetchAthletes();
    }
  };

  // Buscar treinos do coach ao montar
  useEffect(() => {
    if (profile?.id) {
      fetchWorkouts();
    }
  }, [profile?.id]);

  // Ações rápidas de treino
  const handlePublishWorkout = async (workoutId: string) => {
    const { error } = await supabase
      .from('workouts')
      .update({ status: 'published' })
      .eq('id', workoutId);
    
    if (error) {
      toast({ title: 'Erro ao publicar', variant: 'destructive' });
    } else {
      toast({ title: 'Treino publicado!' });
      fetchWorkouts();
    }
  };

  const handleArchiveWorkout = async (workoutId: string) => {
    const { error } = await supabase
      .from('workouts')
      .update({ status: 'archived' })
      .eq('id', workoutId);
    
    if (error) {
      toast({ title: 'Erro ao arquivar', variant: 'destructive' });
    } else {
      toast({ title: 'Treino arquivado' });
      fetchWorkouts();
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId);
    
    if (error) {
      toast({ title: 'Erro ao deletar', variant: 'destructive' });
    } else {
      toast({ title: 'Treino deletado' });
      fetchWorkouts();
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Renderizar conteúdo baseado na tab selecionada
  const renderTabContent = () => {
    switch (activeTab) {
      case 'atletas':
        return (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-primary" />
                  Atletas Vinculados
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowLinkAthleteModal(true)}
                  className="flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  Vincular Atleta
                </Button>
              </div>
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
                    Nenhum atleta vinculado ainda.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowLinkAthleteModal(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Vincular primeiro atleta
                  </Button>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
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
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                            Ativo
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlinkAthlete(athlete.id, athlete.name || athlete.email)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Desvincular atleta"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        );

      case 'treinos':
        return (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Dumbbell className="w-5 h-5 text-primary" />
                  Treinos do Coach
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Criar Treino
                </Button>
              </div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Criar primeiro treino
                  </Button>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
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
                        <div className="flex items-center gap-2">
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
                              : 'Arquivado'}
                          </Badge>
                          
                          {/* Ações rápidas */}
                          <div className="flex gap-1">
                            {workout.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePublishWorkout(workout.id)}
                                className="h-8 w-8 p-0 text-green-500 hover:bg-green-500/10"
                                title="Publicar"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                            {workout.status === 'published' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchiveWorkout(workout.id)}
                                className="h-8 w-8 p-0"
                                title="Arquivar"
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            )}
                            {workout.status === 'archived' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePublishWorkout(workout.id)}
                                className="h-8 w-8 p-0 text-green-500 hover:bg-green-500/10"
                                title="Republicar"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWorkout(workout.id)}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              title="Deletar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        );

      case 'planilha':
        return <CoachSpreadsheetTab />;

      case 'benchmarks':
        return <CoachBenchmarksTab />;

      case 'parametros':
        return <AdminParamsEditor />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-[hsl(0,0%,3%)]">
      {/* Header fixo */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <LayoutGrid className="w-6 h-6 text-primary" />
                Painel do Coach
              </h1>
              <p className="text-sm text-muted-foreground">
                {profile?.name || profile?.email}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </Button>
          </div>
        </div>
      </header>

      {/* Navegação por Tabs */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="atletas" className="gap-1.5 text-xs sm:text-sm">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Atletas</span>
            </TabsTrigger>
            <TabsTrigger value="treinos" className="gap-1.5 text-xs sm:text-sm">
              <Dumbbell className="w-4 h-4" />
              <span className="hidden sm:inline">Treinos</span>
            </TabsTrigger>
            <TabsTrigger value="planilha" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Planilha</span>
            </TabsTrigger>
            <TabsTrigger value="benchmarks" className="gap-1.5 text-xs sm:text-sm">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Benchmarks</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="parametros" className="gap-1.5 text-xs sm:text-sm">
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Parâmetros</span>
              </TabsTrigger>
            )}
          </TabsList>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </Tabs>
      </div>

      {/* Modal de criação de treino */}
      <CreateWorkoutModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={fetchWorkouts}
      />

      {/* Modal de vincular atleta */}
      <LinkAthleteModal
        open={showLinkAthleteModal}
        onOpenChange={setShowLinkAthleteModal}
        onSuccess={fetchAthletes}
      />
    </div>
  );
}
