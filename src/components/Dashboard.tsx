import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { differenceInDays, parseISO } from 'date-fns';
import { useOutlierStore } from '@/store/outlierStore';
import { DAY_NAMES, type DayOfWeek } from '@/types/outlier';
import { Settings, Clock, Zap, ChevronRight, FileEdit, Flame, ArrowLeft, Loader2, LogIn, LogOut, Trophy, AlertCircle, RefreshCcw, Info, Scale, Target, TrendingUp, History, CalendarDays, X } from 'lucide-react';
import { calculateProvaAlvoTarget } from '@/utils/evolutionTimeframe';
import { deduplicateRaceName } from '@/utils/raceNameDedup';
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
import { getCoachCopy, getWorkoutFocusCopy } from '@/config/coachCopy';
import { WeekNavigator } from './WeekNavigator';
import { AthleteWeekDebugBar } from './AthleteWeekDebugBar';

import { LevelUpModal } from './LevelUpModal';
import { useLevelUpDetection } from '@/hooks/useLevelUpDetection';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';
import { getBlockDisplayTitle, getBlockDisplayDataFromParsed } from '@/utils/blockDisplayUtils';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';
import { CategoryChip, StructureBadge, CommentSubBlock, ExerciseLine } from './DSLBlockRenderer';

// Dashboard blocks
import { useEvents } from '@/hooks/useEvents';
import { 
  EvolutionChartBlock, 
  EvolutionFocusBlock 
} from './DashboardBlocks';
import { DiagnosticRadarBlock } from './DiagnosticRadarBlock';
import { useAthleteRaces } from '@/hooks/useAthleteRaces';
import { useTargetTimes } from '@/hooks/useTargetTimes';
import { useEvolutionFocus } from '@/hooks/useEvolutionFocus';
import { useWeeklyEvolution } from '@/hooks/useWeeklyEvolution';
import { useDiagnosticScores } from '@/hooks/useDiagnosticScores';
import { AthleteHeroIdentity } from './AthleteHeroIdentity';
import { WeeklySummaryCard } from './WeeklySummaryCard';
import { useWorkoutStreak } from '@/hooks/useWorkoutStreak';
import { ShieldCrest } from '@/components/ui/ShieldCrest';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ExtendedLevelKey } from '@/hooks/useJourneyProgress';


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

export function Dashboard() {
  const {
    setCurrentView,
    setSelectedWorkout, 
    baseWorkouts,
    adaptedWorkouts,
    adaptationPending,
    athleteConfig,
    viewingAsAthlete,
    setBaseWorkouts,
    clearBaseWorkouts,
    hasHydrated
  } = useOutlierStore();
  
  const { user, profile, isAdmin, isCoach, canManageWorkouts, loading: authLoading, signOut } = useAuth();
  const { state } = useAppState();
  const { status, getEffectiveLevelForWorkout, rulerScore, confidence, validatingCompetition } = useAthleteStatus();
  const { ensureAdapted, forceRegenerate, hasBaseWorkouts, hasAthleteConfig } = useAdaptationPipeline();
  const { fetchAvailableWorkouts } = useCoachWorkouts();
  const { 
    plan: athletePlan, 
    workouts: planWorkouts, 
    loading: loadingPlan, 
    hasCoach,
    // Navegação por semana
    currentWeek,
    canNavigateToPast,
    canNavigateToFuture,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    isViewingHistory,
    // Debug info
    debugInfo,
    resetToCurrentWeek,
    refetch,
  } = useAthletePlan();
  
  // Dashboard OUTLIER hooks
  const diagnosticScores = useDiagnosticScores();
  const evolutionFocus = useEvolutionFocus();
  const weeklyEvolution = useWeeklyEvolution();
  const { provaAlvo } = useAthleteRaces();
  const targetTimes = useTargetTimes(status, athleteConfig?.sexo || 'masculino');
  
  // Carregar configurações do atleta do banco (persistência)
  useAthleteProfile();
  
  // Detectar subida de nível para exibir modal
  const { showModal: showLevelUpModal, newLevel, acknowledgeLevel } = useLevelUpDetection(status);
  const journeyProgress = useJourneyProgress();
  const { currentStreak, isStreakActive, message: streakMessage } = useWorkoutStreak();
  
  // Estado para modal de categoria ao importar prova
  const [raceImportLevel, setRaceImportLevel] = useState<import('@/types/outlier').AthleteStatus | null>(null);
  const [dismissedNoWorkouts, setDismissedNoWorkouts] = useState(false);
  
  const navigate = useNavigate();
  
  // Dia atual para buscar treino do dia
  const todayDay = useMemo<DayOfWeek>(() => {
    const days: DayOfWeek[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const today = new Date().getDay();
    return days[today] || 'seg';
  }, []);
  
  const [activeDay, setActiveDay] = useState<DayOfWeek>(todayDay);
  const [isGeneratingAdaptation, setIsGeneratingAdaptation] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);

  // Listen for sidebar event to expand weekly view
  useEffect(() => {
    const handleExpandWeeklyView = () => {
      setShowDetailedView(true);
    };
    
    window.addEventListener('outlier:expand-weekly-view', handleExpandWeeklyView);
    return () => {
      window.removeEventListener('outlier:expand-weekly-view', handleExpandWeeklyView);
    };
  }, []);

  // Listen for race import event to show category modal
  useEffect(() => {
    const handleRaceImported = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const statusMap: Record<string, import('@/types/outlier').AthleteStatus> = {
        open: 'open', pro: 'pro', elite: 'elite',
      };
      const mapped = statusMap[detail?.status] || status || 'open';
      setRaceImportLevel(mapped);
    };
    
    window.addEventListener('outlier:race-imported', handleRaceImported);
    return () => window.removeEventListener('outlier:race-imported', handleRaceImported);
  }, [status]);

  // ============================================
  // REGRA CENTRAL: Aplicar/limpar treinos ao mudar semana
  // Guard: aguardar hydration do Zustand para evitar loops
  // CRÍTICO: Pular primeiro render para respeitar semana restaurada do localStorage
  // ============================================
  
  const selectedWeekStart = debugInfo?.selectedWeekStart;
  const isFirstRenderDashboardRef = useRef(true);
  
  useEffect(() => {
    // Guard: aguardar hydration do store
    if (!hasHydrated) {
      return;
    }
    // Guard: aguardar carregamento do plano
    if (loadingPlan) {
      return;
    }
    // Guard: pular primeiro render para não sobrescrever semana restaurada
    if (isFirstRenderDashboardRef.current) {
      isFirstRenderDashboardRef.current = false;
      // No primeiro render, aplicar treinos da semana restaurada
      const hasPlanForWeek = planWorkouts.length > 0;
      if (hasPlanForWeek) {
        setBaseWorkouts(planWorkouts);
      }
      return;
    }
    
    // Calcular localmente se há plano para evitar dep instável
    const hasPlanForWeek = planWorkouts.length > 0;
    
    if (hasPlanForWeek) {
      setBaseWorkouts(planWorkouts);
    } else {
      clearBaseWorkouts();
    }
  }, [hasHydrated, selectedWeekStart, loadingPlan]); // Deps mínimas - planWorkouts lido dentro do effect

  // ============================================
  // REGRA: Usar SEMPRE adaptedWorkouts quando existir
  // ============================================
  const displayWorkouts = adaptedWorkouts.length > 0 ? adaptedWorkouts : baseWorkouts;
  const isShowingAdapted = adaptedWorkouts.length > 0;
  
  // Get effective level for workout prescription
  const effectiveLevel = athleteConfig ? getEffectiveLevelForWorkout(athleteConfig.planTier ?? 'open') : 'open';
  
  const currentWorkout = displayWorkouts.find((w) => w.day === activeDay);
  const todayWorkout = displayWorkouts.find((w) => w.day === todayDay);
  const hasAnyWorkouts = displayWorkouts.length > 0;
  const hasTodayWorkout = !!todayWorkout && !todayWorkout.isRestDay;
  
  // Copy dinâmica baseada no treino do dia e estilo do coach
  const workoutFocusCopy = useMemo(() => {
    if (loadingPlan) return null;
    const blocks = todayWorkout?.blocks || [];
    return getWorkoutFocusCopy(athleteConfig?.coachStyle, blocks, hasTodayWorkout);
  }, [todayWorkout, athleteConfig?.coachStyle, hasTodayWorkout, loadingPlan]);

  // Prova Alvo info for header
  const provaAlvoInfo = useMemo(() => {
    if (!provaAlvo) return null;
    const daysUntil = differenceInDays(parseISO(provaAlvo.race_date), new Date());
    return {
      nome: deduplicateRaceName(provaAlvo.nome),
      race_date: provaAlvo.race_date,
      categoria: provaAlvo.categoria,
      daysUntil,
      partner_name: provaAlvo.partner_name,
      participation_type: provaAlvo.participation_type,
    };
  }, [provaAlvo]);

  const provaAlvoTargetTime = useMemo(() => {
    // Use proportional target based on Training Age + days until race
    const currentTimeSec = validatingCompetition?.open_equivalent_seconds;
    const daysUntil = provaAlvoInfo?.daysUntil;
    
    if (!currentTimeSec || !daysUntil || daysUntil <= 0) {
      // Fallback to fixed target if no race data
      if (!targetTimes) return null;
      const totalSec = targetTimes.targetSeconds;
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) return `${h}h${String(m).padStart(2, '0')}m${String(s).padStart(2, '0')}s`;
      return `${m}m${String(s).padStart(2, '0')}s`;
    }

    const { targetSeconds } = calculateProvaAlvoTarget(currentTimeSec, daysUntil);
    const h = Math.floor(targetSeconds / 3600);
    const m = Math.floor((targetSeconds % 3600) / 60);
    const s = Math.round(targetSeconds % 60);
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}m${String(s).padStart(2, '0')}s`;
    return `${m}m${String(s).padStart(2, '0')}s`;
  }, [validatingCompetition, provaAlvoInfo, targetTimes]);


  // ============================================
  // REGRA: Auto-adaptar APENAS se existir plano base
  // Guard: baseWorkouts.length > 0 é verificação REAL (não prop derivada)
  // ============================================
  useEffect(() => {
    // Guard fundamental: sem base, sem adaptação
    if (baseWorkouts.length === 0) {
      return;
    }
    
    // Guard: precisa ter config e estar pendente
    if (!adaptationPending || !hasAthleteConfig) {
      return;
    }
    
    console.log('[Dashboard] Auto-adapting workouts...');
    setIsGeneratingAdaptation(true);
    const result = ensureAdapted();
    setIsGeneratingAdaptation(false);
  }, [adaptationPending, baseWorkouts.length, hasAthleteConfig, ensureAdapted]);

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

  const { trackEvent } = useEvents();

  const handleStartWorkout = () => {
    trackEvent('workout_viewed');
    setCurrentView('weeklyTraining');
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


  // ============================================
  // ESTIMATIVA DE TEMPO E CALORIAS
  // Fonte única: estimateWorkout() do workoutEstimation.ts
  // Usa treino ADAPTADO e dados biométricos do atleta
  // ============================================
  const workoutEstimation = useMemo(() => {
    if (!currentWorkout) return null;
    
    // open/pro usam o effectiveLevel do status do atleta
    return estimateWorkout(currentWorkout, athleteConfig, effectiveLevel);
  }, [currentWorkout, athleteConfig, effectiveLevel]);
  
  // Verificar se peso está configurado
  const biometrics = useMemo(() => getUserBiometrics(athleteConfig), [athleteConfig]);
  
  // Tempo total em minutos
  const totalTime = workoutEstimation?.totals.estimatedMinutesTotal || 0;
  
  // Calorias totais
  const totalCalories = workoutEstimation?.totals.estimatedKcalTotal || 0;

  const handlePullRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);
  const { containerRef: pullRef, isRefreshing: isPullRefreshing, pullProgress, pullDistance } = usePullToRefresh(handlePullRefresh);

  return (
    <div ref={pullRef} className="min-h-screen">
      <PullToRefreshIndicator pullDistance={pullDistance} pullProgress={pullProgress} isRefreshing={isPullRefreshing} />
      {/* Content - Dashboard OUTLIER */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        
        {/* Header removido - agora está dentro do DiagnosticRadarBlock */}
        
        {/* ============================================
            BLOCO 1 — PERFIL DE PERFORMANCE COMPLETO
            (Diagnóstico + Limitador + Impacto + Projeção + CTA)
            ============================================ */}

        {/* Streak Badge */}
        {isStreakActive && currentStreak >= 2 && (
          <section className="mb-4">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Flame className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-primary">{currentStreak} dias seguidos</span>
              {streakMessage && (
                <span className="text-xs text-muted-foreground ml-auto">{streakMessage}</span>
              )}
            </div>
          </section>
        )}

        {/* ============================================
            IDENTIDADE DO ATLETA — Nome + Status (OPEN/PRO/ELITE)
            ============================================ */}
        <section className="mb-4">
          <AthleteHeroIdentity
            name={profile?.name || profile?.email?.split('@')[0] || 'Atleta'}
            status={status}
          />
        </section>

        {/* ============================================
            JORNADA OUTLIER — 3 Escudos (OPEN / PRO / ELITE)
            ============================================ */}
        <section className="mb-6">
          <div className="rounded-2xl border border-border bg-card/40 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Jornada Outlier
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {journeyProgress.outlierTitle ?? `Caminho até OUTLIER ${journeyProgress.targetLevelKey}`}
                </p>
              </div>
              {!journeyProgress.loading && (
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {journeyProgress.progressToTarget}%
                </span>
              )}
            </div>

            <TooltipProvider delayDuration={200}>
              <div className="grid grid-cols-3 gap-3 sm:gap-6">
                {(['OPEN', 'PRO', 'ELITE'] as ExtendedLevelKey[]).map((lvl) => {
                  const levelOrder: Record<ExtendedLevelKey, number> = { OPEN: 1, PRO: 2, ELITE: 3 };
                  const currentOrder = levelOrder[journeyProgress.category];
                  const thisOrder = levelOrder[lvl];
                  // Active = athlete reached OUTLIER status at this level
                  const active = journeyProgress.isOutlier && currentOrder >= thisOrder;
                  const isCurrent = journeyProgress.category === lvl;

                  const tooltipText = active
                    ? `OUTLIER ${lvl} conquistado`
                    : isCurrent
                      ? `Faltam: ${journeyProgress.missingRequirements.join(' • ') || 'completar requisitos'}`
                      : `Conquiste primeiro o nível anterior via prova oficial`;

                  return (
                    <Tooltip key={lvl}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'flex flex-col items-center gap-2 p-3 rounded-xl transition-all cursor-help',
                            isCurrent && 'bg-primary/5 ring-2 ring-primary/40',
                            !active && !isCurrent && 'opacity-60'
                          )}
                        >
                          <ShieldCrest
                            level={lvl}
                            active={active}
                            className={cn(
                              'w-16 h-16 sm:w-20 sm:h-20 transition-all',
                              isCurrent && 'drop-shadow-[0_0_12px_hsl(var(--primary)/0.5)]',
                              !active && 'grayscale'
                            )}
                          />
                          <span
                            className={cn(
                              'text-xs font-bold tracking-wider',
                              active ? 'text-foreground' : 'text-muted-foreground'
                            )}
                          >
                            {lvl}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs text-xs">
                        {tooltipText}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          </div>
        </section>

        <section className="mb-6">
          <WeeklySummaryCard />
        </section>

        {/* Empty state when athlete has coach but no workouts */}
        {hasCoach && !hasAnyWorkouts && !loadingPlan && !dismissedNoWorkouts && (
          <section className="mb-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/20">
              <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Treino desta semana ainda não foi publicado</p>
                <p className="text-xs text-muted-foreground">Aparecerá aqui quando seu coach publicar</p>
              </div>
              <button onClick={() => setDismissedNoWorkouts(true)} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        <section className="mb-6">
          <DiagnosticRadarBlock
            scores={diagnosticScores.scores}
            loading={diagnosticScores.loading}
            hasData={diagnosticScores.hasData}
            todayWorkoutLabel={workoutFocusCopy || undefined}
            hasTodayWorkout={hasTodayWorkout}
            onStartWorkout={handleStartWorkout}
            provaAlvo={provaAlvoInfo}
            provaAlvoTargetTime={provaAlvoTargetTime}
            perfilFisiologico={diagnosticScores.perfilFisiologico}
            splitTimes={diagnosticScores.splitTimes}
          />
        </section>


        {/* Blocos de Evolução movidos para outra view */}

        {/* Equipment Adapt Button moved to sidebar */}
      </main>


      {/* Debug Bar */}
      <AthleteWeekDebugBar
        now={debugInfo.now}
        currentWeekStart={debugInfo.currentWeekStart}
        selectedWeekStart={debugInfo.selectedWeekStart}
        minWeekStart={debugInfo.minWeekStart}
        maxWeekStart={debugInfo.maxWeekStart}
        hasPlanForSelectedWeek={debugInfo.hasPlanForSelectedWeek}
        plansFoundWeekStarts={debugInfo.plansFoundWeekStarts}
        onGoToPrev={goToPreviousWeek}
        onGoToCurrent={goToCurrentWeek}
        onGoToNext={goToNextWeek}
        onReset={resetToCurrentWeek}
        canGoToPrev={canNavigateToPast}
        canGoToNext={canNavigateToFuture}
      />

      {/* Level Up Modal (conquista OUTLIER) */}
      {newLevel && (
        <LevelUpModal
          isOpen={showLevelUpModal}
          newStatus={newLevel}
          isOutlier={journeyProgress.isOutlier}
          onContinue={acknowledgeLevel}
        />
      )}

      {/* Race Import Modal (categoria sem brasão) */}
      {raceImportLevel && (
        <LevelUpModal
          isOpen={!!raceImportLevel}
          newStatus={raceImportLevel}
          isOutlier={false}
          onContinue={() => setRaceImportLevel(null)}
        />
      )}
    </div>
  );
}
