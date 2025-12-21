import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { DAY_NAMES, type DayOfWeek, type AthleteLevel } from '@/types/outlier';
import { Settings, Clock, Zap, ChevronRight, FileEdit, Wrench, Flame, ArrowLeft, Loader2, LogIn, LogOut, Trophy, AlertCircle, RefreshCcw, Info, Scale, Target, TrendingUp } from 'lucide-react';
import { EquipmentAdaptModal } from './EquipmentAdaptModal';
import { estimateWorkout, formatEstimatedTime, formatEstimatedKcal, getUserBiometrics } from '@/utils/workoutEstimation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useAthleteProfile } from '@/hooks/useAthleteProfile';
import { UserHeader } from './UserHeader';
import { useAdaptationPipeline } from '@/hooks/useAdaptationPipeline';
import { AthleteViewSelector } from './AthleteViewSelector';
import { useAppState } from '@/hooks/useAppState';
import { useCoachWorkouts } from '@/hooks/useCoachWorkouts';
import { useAthletePlan } from '@/hooks/useAthletePlan';
import { getCoachCopy } from '@/config/coachCopy';

const dayTabs: DayOfWeek[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

const blockTypeColors: Record<string, string> = {
  aquecimento: 'border-l-amber-500',
  conditioning: 'border-l-primary',
  forca: 'border-l-red-500',
  especifico: 'border-l-purple-500',
  core: 'border-l-blue-500',
  corrida: 'border-l-green-500',
  notas: 'border-l-muted-foreground',
};

// Coach-specific summary language
const getCoachSummaryStyle = (coachStyle: string | undefined) => {
  switch (coachStyle) {
    case 'IRON':
      return {
        title: 'BRIEFING DO TREINO',
        timeLabel: 'Tempo de execução:',
        caloriesLabel: 'Gasto calórico:',
        objectiveLabel: 'Missão do dia:',
        emptyState: 'Aguardando programação.',
        icon: '⚔️'
      };
    case 'SPARK':
      return {
        title: '🔥 SEU TREINO DE HOJE',
        timeLabel: 'Duração estimada:',
        caloriesLabel: 'Vai queimar:',
        objectiveLabel: 'Bora lá! Hoje é dia de:',
        emptyState: 'Ainda sem treino por aqui! 😅',
        icon: '🚀'
      };
    case 'PULSE':
    default:
      return {
        title: 'RESUMO DO TREINO',
        timeLabel: 'Tempo total:',
        caloriesLabel: 'Calorias estimadas:',
        objectiveLabel: 'O foco de hoje:',
        emptyState: 'Aguardando treinos do seu coach.',
        icon: '💪'
      };
  }
};

export function Dashboard() {
  const {
    setCurrentView,
    setSelectedWorkout, 
    baseWorkouts,
    adaptedWorkouts,
    adaptationPending,
    athleteConfig,
    viewingAsAthlete,
    setBaseWorkouts
  } = useOutlierStore();
  
  const { user, isAdmin, isCoach, canManageWorkouts, loading: authLoading, signOut } = useAuth();
  const { state } = useAppState();
  const { status, getEffectiveLevelForWorkout, rulerScore, confidence } = useAthleteStatus();
  const { ensureAdapted, forceRegenerate, hasBaseWorkouts, hasAthleteConfig } = useAdaptationPipeline();
  const { fetchAvailableWorkouts } = useCoachWorkouts();
  const { plan: athletePlan, workouts: planWorkouts, loading: loadingPlan, hasCoach } = useAthletePlan();
  
  // Carregar configurações do atleta do banco (persistência)
  useAthleteProfile();
  // Chave estável para detectar mudança real de plano
  const planId = athletePlan?.id ?? null;
  const planWeekStart = athletePlan?.week_start ?? null;
  const lastAppliedPlanIdRef = useRef<string | null>(null);
  const navigate = useNavigate();
  
  const [activeDay, setActiveDay] = useState<DayOfWeek>('seg');
  const [isAdaptModalOpen, setIsAdaptModalOpen] = useState(false);
  const savedUnavailableEquipment = athleteConfig?.unavailableEquipment || [];
  const [workoutFeedback, setWorkoutFeedback] = useState<string | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [isGeneratingAdaptation, setIsGeneratingAdaptation] = useState(false);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);

  // ============================================
  // REGRA: Prioridade de treinos
  // 1. Treinos do coach (athlete_plans) se atleta tem coach vinculado
  // 2. Treinos locais (baseWorkouts/adaptedWorkouts)
  // 3. Fallback: buscar do banco (workouts publicados)
  // ============================================
  
  // Efeito 1: Aplicar plano do coach quando planId muda
  useEffect(() => {
    if (!planId || planWorkouts.length === 0) return;
    if (lastAppliedPlanIdRef.current === planId) return;
    
    console.log('[Dashboard] Applying coach plan:', planId);
    lastAppliedPlanIdRef.current = planId;
    setBaseWorkouts(planWorkouts);
  }, [planId, planWorkouts, setBaseWorkouts]);

  // Efeito 2: Fallback - buscar do banco se não tem plano do coach nem treinos locais
  const hasLocalWorkouts = baseWorkouts.length > 0;
  const hasPlanWorkouts = planWorkouts.length > 0;
  
  useEffect(() => {
    if (hasPlanWorkouts || hasLocalWorkouts || canManageWorkouts || loadingPlan) return;
    
    let cancelled = false;
    setIsLoadingFromDb(true);
    
    fetchAvailableWorkouts()
      .then((workoutsFromDb) => {
        if (cancelled) return;
        if (workoutsFromDb.length > 0) {
          console.log('[Dashboard] Loaded workouts from database:', workoutsFromDb.length, 'days');
          setBaseWorkouts(workoutsFromDb);
        }
      })
      .catch((err) => {
        if (!cancelled) console.error('[Dashboard] Error loading workouts from DB:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingFromDb(false);
      });
    
    return () => { cancelled = true; };
  }, [hasPlanWorkouts, hasLocalWorkouts, canManageWorkouts, loadingPlan, fetchAvailableWorkouts, setBaseWorkouts]);

  // ============================================
  // REGRA: Usar SEMPRE adaptedWorkouts quando existir
  // ============================================
  const displayWorkouts = adaptedWorkouts.length > 0 ? adaptedWorkouts : baseWorkouts;
  const isShowingAdapted = adaptedWorkouts.length > 0;
  
  // Get effective level for workout prescription
  const effectiveLevel = athleteConfig ? getEffectiveLevelForWorkout(athleteConfig.trainingDifficulty) : 'intermediario';
  
  const currentWorkout = displayWorkouts.find((w) => w.day === activeDay);
  const hasAnyWorkouts = displayWorkouts.length > 0;


  // Auto-adaptar ao montar se necessário
  useEffect(() => {
    if (adaptationPending && hasBaseWorkouts && hasAthleteConfig) {
      setIsGeneratingAdaptation(true);
      const result = ensureAdapted();
      setIsGeneratingAdaptation(false);
    }
  }, [adaptationPending, hasBaseWorkouts, hasAthleteConfig, ensureAdapted]);

  const handleAdminAccess = () => {
    if (!user) {
      toast.info('Faça login para acessar o painel');
      navigate('/auth');
      return;
    }
    if (!canManageWorkouts) {
      toast.error('Acesso restrito: apenas coaches e administradores');
      return;
    }
    setCurrentView('admin');
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Erro ao sair');
    } else {
      toast.success('Logout realizado');
      setCurrentView('welcome');
    }
  };

  // Fetch AI feedback when workout or coach style changes
  useEffect(() => {
    const fetchFeedback = async () => {
      if (!currentWorkout || !athleteConfig?.coachStyle) {
        setWorkoutFeedback(null);
        return;
      }

      setIsLoadingFeedback(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-workout-feedback', {
          body: {
            coachStyle: athleteConfig.coachStyle,
            blocks: currentWorkout.blocks.map(b => ({
              type: b.type,
              title: b.title,
              content: b.content,
            })),
            dayName: DAY_NAMES[currentWorkout.day],
            sex: athleteConfig.sexo,
          },
        });

        if (error) throw error;
        
        if (data?.feedback) {
          setWorkoutFeedback(data.feedback);
        }
      } catch (err) {
        console.error('Error fetching feedback:', err);
        setWorkoutFeedback(null);
      } finally {
        setIsLoadingFeedback(false);
      }
    };

    fetchFeedback();
  }, [currentWorkout?.day, athleteConfig?.coachStyle, isShowingAdapted]);

  const handleStartWorkout = () => {
    if (currentWorkout) {
      setSelectedWorkout(currentWorkout);
      setCurrentView('workout');
    }
  };

  const handleGenerateAdaptation = () => {
    setIsGeneratingAdaptation(true);
    const result = forceRegenerate();
    setIsGeneratingAdaptation(false);
    
    if (result.success) {
      toast.success('Treino adaptado com sucesso!');
    } else {
      toast.error('Erro ao adaptar treino');
    }
  };

  const handleSaveEquipmentAdaptations = (unavailableEquipment: string[]) => {
    // Salvar no athleteConfig via store
    if (athleteConfig) {
      const { setAthleteConfig } = useOutlierStore.getState();
      setAthleteConfig({
        ...athleteConfig,
        unavailableEquipment,
      });
    }
    
    if (unavailableEquipment.length > 0) {
      toast.success('Treino adaptado pro seu box.', { duration: 3000 });
    } else {
      toast.success('Adaptações removidas.', { duration: 3000 });
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${minutes}min`;
  };

  const hasAdaptations = savedUnavailableEquipment.length > 0;

  // ============================================
  // ESTIMATIVA DE TEMPO E CALORIAS
  // Fonte única: estimateWorkout() do workoutEstimation.ts
  // Usa treino ADAPTADO e dados biométricos do atleta
  // ============================================
  const workoutEstimation = useMemo(() => {
    if (!currentWorkout) return null;
    
    // Mapear trainingLevel para AthleteLevel
    const levelMap: Record<string, AthleteLevel> = {
      'base': 'iniciante',
      'progressivo': 'intermediario',
      'performance': 'avancado',
    };
    const level = levelMap[athleteConfig?.trainingLevel || 'progressivo'] || effectiveLevel;
    
    return estimateWorkout(currentWorkout, athleteConfig, level);
  }, [currentWorkout, athleteConfig, effectiveLevel]);
  
  // Verificar se peso está configurado
  const biometrics = useMemo(() => getUserBiometrics(athleteConfig), [athleteConfig]);
  
  // Tempo total em minutos
  const totalTime = workoutEstimation?.totals.estimatedMinutesTotal || 0;
  
  // Calorias totais
  const totalCalories = workoutEstimation?.totals.estimatedKcalTotal || 0;

  // Fallback objective if AI fails
  const getFallbackObjective = (): string => {
    if (!currentWorkout) return '';
    
    const blockTypes = currentWorkout.blocks.map(b => b.type);
    const hasForce = blockTypes.includes('forca');
    const hasConditioning = blockTypes.includes('conditioning');

    if (hasForce && hasConditioning) {
      return 'Desenvolver força funcional combinada com capacidade cardiorrespiratória.';
    } else if (hasForce) {
      return 'Foco em desenvolvimento de força e potência muscular.';
    } else if (hasConditioning) {
      return 'Melhorar condicionamento e resistência metabólica.';
    }
    return 'Treino completo para desenvolvimento atlético geral.';
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView('welcome')}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display text-3xl text-gradient">OUTLIER</h1>
              {athleteConfig && (
                  <p className="text-sm text-muted-foreground">
                    Coach {athleteConfig.coachStyle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Admin: Seletor de atleta para visualização */}
              {(state === 'admin' || state === 'superadmin') && (
                <AthleteViewSelector />
              )}
              <UserHeader showLogout={true} />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView('benchmarks')}
                className="p-3 rounded-lg bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-colors"
                title="Benchmarks & Evolução"
              >
                <Trophy className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentView('config')}
                className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                  title={`Sair (${user.email})`}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="p-3 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                  title="Fazer login"
                >
                  <LogIn className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Adaptation Status Banner - Texto fixo sem métricas */}
      {hasBaseWorkouts && isShowingAdapted && (
        <div className="border-b bg-primary/5 border-primary/10">
          <div className="max-w-6xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Treino calibrado para você.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cada bloco foi ajustado para entregar o estímulo certo — nem mais, nem menos — para que você evolua de forma sustentável.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCurrentView('config')}
                className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors text-sm"
              >
                Ajustes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning banner when not adapted yet */}
      {hasBaseWorkouts && !isShowingAdapted && hasAthleteConfig && (
        <div className="border-b bg-amber-500/10 border-amber-500/20">
          <div className="max-w-6xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-500">
                    Ajuste seu treino para gerar a versão personalizada
                  </p>
                </div>
              </div>
              <button
                onClick={handleGenerateAdaptation}
                disabled={isGeneratingAdaptation}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors text-sm flex items-center gap-2"
              >
                {isGeneratingAdaptation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'Gerar Treino'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Adaptation Banner */}
      {hasAdaptations && (
        <div className="border-b bg-blue-500/5 border-blue-500/10">
          <div className="max-w-6xl mx-auto px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <RefreshCcw className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  🔁 Treino ajustado conforme sua realidade de hoje
                </p>
                <p className="text-xs text-muted-foreground">
                  Mantivemos o estímulo principal do treino, mesmo com adaptações de equipamento.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day Tabs */}
      <div className="sticky top-[73px] z-40 bg-background border-b border-border overflow-x-auto">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 py-2">
            {dayTabs.map((day) => {
              const hasWorkout = displayWorkouts.some((w) => w.day === day);
              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`
                    px-4 py-2 rounded-lg font-display text-lg tracking-wide transition-all duration-200 whitespace-nowrap relative
                    ${activeDay === day
                      ? 'bg-primary text-primary-foreground'
                      : hasWorkout
                        ? 'text-foreground hover:bg-secondary'
                        : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary'
                    }
                  `}
                >
                  {DAY_NAMES[day].slice(0, 3).toUpperCase()}
                  {hasWorkout && activeDay !== day && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {currentWorkout ? (
            <motion.div
              key={activeDay}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Day Header */}
              <div className="mb-8">
                <h2 className="font-display text-4xl mb-2">{DAY_NAMES[currentWorkout.day]}</h2>
                
                {/* Training Level Badge */}
                <div className="mb-3">
                  {athleteConfig?.trainingLevel ? (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold uppercase text-sm tracking-wide ${
                      athleteConfig.trainingLevel === 'base' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : athleteConfig.trainingLevel === 'performance'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {athleteConfig.trainingLevel === 'base' && <Target className="w-4 h-4" />}
                      {athleteConfig.trainingLevel === 'progressivo' && <TrendingUp className="w-4 h-4" />}
                      {athleteConfig.trainingLevel === 'performance' && <Flame className="w-4 h-4" />}
                      <span>NÍVEL: {athleteConfig.trainingLevel.toUpperCase()}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold uppercase text-sm tracking-wide bg-muted/50 text-muted-foreground border border-border">
                      <AlertCircle className="w-4 h-4" />
                      <span>NÍVEL: NÃO DEFINIDO</span>
                      <button 
                        onClick={() => setCurrentView('config')}
                        className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded hover:bg-primary/30 transition-colors"
                      >
                        Definir
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>{currentWorkout.stimulus}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{totalTime > 0 ? formatTime(totalTime) : 'Estimando…'}</span>
                  </div>
                  {totalCalories > 0 && (
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-orange-500 font-medium">~{Math.abs(totalCalories)} kcal</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Workout Adjusted Note - Institutional copy */}
              {(() => {
                const dashboardCopy = getCoachCopy(athleteConfig?.coachStyle).dashboard;
                return (
                  <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground/80">
                    <Info className="w-3.5 h-3.5" />
                    <span>{dashboardCopy.workoutAdjustedNote}</span>
                  </div>
                );
              })()}

              {/* Workout Summary Block */}
              {(() => {
                const summaryStyle = getCoachSummaryStyle(athleteConfig?.coachStyle);
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-elevated p-6 border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent mb-4"
                  >
                    <h3 className="font-display text-xl mb-4 text-primary">
                      {summaryStyle.title}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-6 mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        <span className="text-muted-foreground">{summaryStyle.timeLabel}</span>
                        <span className="font-display text-lg text-foreground">{formatTime(totalTime)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-500" />
                        <span className="text-muted-foreground">{summaryStyle.caloriesLabel}</span>
                        <span className="font-display text-lg text-orange-500">
                          {totalCalories > 0 ? `~${Math.abs(totalCalories)} kcal` : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/50">
                      <p className="text-sm text-muted-foreground font-medium mb-1">
                        {summaryStyle.objectiveLabel}
                      </p>
                      {isLoadingFeedback ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">
                            {athleteConfig?.coachStyle === 'SPARK' ? 'Preparando motivação... 🔥' : 
                             athleteConfig?.coachStyle === 'IRON' ? 'Processando...' : 
                             'Gerando feedback...'}
                          </span>
                        </div>
                      ) : (
                        <p className="text-foreground">{workoutFeedback || getFallbackObjective()}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })()}

              {/* Missing Weight Warning */}
              {biometrics.missingWeight && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10"
                >
                  <div className="flex items-start gap-3">
                    <Scale className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-500">
                        Para calcular tempo e calorias, informe seu peso em Configurações.
                      </p>
                      <button
                        onClick={() => setCurrentView('config')}
                        className="text-xs text-amber-500/80 hover:text-amber-500 underline mt-1"
                      >
                        Ir para Configurações →
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Workout Blocks */}
              <div className="space-y-4 mb-8">
                {currentWorkout.blocks.map((block, index) => {
                  // Tempo e calorias vêm do workoutEstimation (fonte única)
                  const blockEstimate = workoutEstimation?.blocks[index];
                  const estimatedMinutes = blockEstimate?.estimatedMinutes || 0;
                  const estimatedKcal = blockEstimate?.estimatedKcal || 0;
                  const confidence = blockEstimate?.confidence || 'low';

                  return (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (index + 1) * 0.1 }}
                      className={`
                        card-elevated p-6 border-l-4 ${blockTypeColors[block.type] || 'border-l-border'}
                        ${block.isMainWod ? 'ring-1 ring-primary/30' : ''}
                      `}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="font-display text-xl">{block.title}</h3>
                        <div className="flex items-center gap-2">
                          {block.isMainWod && (
                            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold tracking-wide">
                              WOD PRINCIPAL
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <pre className="font-body text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed mb-4">
                        {block.content}
                      </pre>

                      {/* Block Stats */}
                      {block.type !== 'notas' && (
                        <div className="flex items-center gap-4 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {confidence === 'low' ? '~' : ''}
                            </span>
                            <span className="font-medium text-foreground">
                              {formatEstimatedTime(estimatedMinutes)}
                            </span>
                            {confidence === 'low' && (
                              <span className="text-xs text-muted-foreground/60">(estimado)</span>
                            )}
                          </div>
                          {biometrics.isValid && (
                            <div className="flex items-center gap-2 text-sm">
                              <Flame className="w-4 h-4 text-orange-500" />
                              <span className="text-orange-500 font-medium">
                                {formatEstimatedKcal(estimatedKcal)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Start Workout Button */}
              <motion.button
                onClick={handleStartWorkout}
                className="w-full font-display text-xl tracking-wider px-8 py-5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                INICIAR TREINO
                <ChevronRight className="w-6 h-6" />
              </motion.button>

              {/* Equipment Substitution Button */}
              <div className="mt-6">
                <button
                  onClick={() => setIsAdaptModalOpen(true)}
                  className={`
                    w-full py-3 px-4 rounded-lg border transition-all flex items-center justify-center gap-2
                    ${hasAdaptations
                      ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
                      : 'border-border bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }
                  `}
                >
                  <Wrench className="w-4 h-4" />
                  <span className="font-display text-sm tracking-wide">
                    {hasAdaptations 
                      ? `EQUIPAMENTOS ADAPTADOS (${savedUnavailableEquipment.length})`
                      : 'AJUSTAR TREINO PARA O MEU BOX'
                    }
                  </span>
                </button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Sem algum equipamento no seu box? Eu adapto sem mudar o estímulo.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Day Header */}
              <div className="mb-8">
                <h2 className="font-display text-4xl mb-2 text-muted-foreground/50">{DAY_NAMES[activeDay]}</h2>
              </div>

              {/* Empty State */}
              <div className="min-h-[300px] flex flex-col items-center justify-center gap-4 card-elevated p-8 rounded-xl">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Clock className="w-8 h-8 text-primary/60" />
                </div>
                {hasAnyWorkouts ? (
                  <>
                    <p className="text-muted-foreground text-center text-lg">
                      Nenhum treino para {DAY_NAMES[activeDay].toLowerCase()}.
                    </p>
                    <p className="text-muted-foreground/60 text-center text-sm">
                      Aproveite para descansar ou confira outro dia.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-display text-xl text-foreground">
                      Aguardando treino do coach
                    </h3>
                    <p className="text-muted-foreground text-center text-sm max-w-md">
                      A planilha semanal ainda não foi inserida. Os treinos aparecerão aqui assim que um coach configurá-los.
                    </p>
                    {canManageWorkouts && (
                      <button
                        onClick={handleAdminAccess}
                        className="mt-4 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm flex items-center gap-2"
                      >
                        <FileEdit className="w-4 h-4" />
                        Inserir Planilha
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Equipment Adapt Modal */}
      <EquipmentAdaptModal
        isOpen={isAdaptModalOpen}
        onClose={() => setIsAdaptModalOpen(false)}
        onApply={handleSaveEquipmentAdaptations}
        initialSelection={savedUnavailableEquipment}
      />
    </div>
  );
}
