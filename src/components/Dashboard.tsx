import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInDays, parseISO } from 'date-fns';
import { useOutlierStore } from '@/store/outlierStore';
import { DAY_NAMES, type DayOfWeek } from '@/types/outlier';
import { Settings, Clock, Zap, ChevronRight, FileEdit, Wrench, Flame, ArrowLeft, Loader2, LogIn, LogOut, Trophy, AlertCircle, RefreshCcw, Info, Scale, Target, TrendingUp, History } from 'lucide-react';
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
import { getCoachCopy, getWorkoutFocusCopy } from '@/config/coachCopy';
import { WeekNavigator } from './WeekNavigator';
import { AthleteWeekDebugBar } from './AthleteWeekDebugBar';

import { LevelUpModal } from './LevelUpModal';
import { useLevelUpDetection } from '@/hooks/useLevelUpDetection';
import { getBlockDisplayTitle, getBlockDisplayDataFromParsed } from '@/utils/blockDisplayUtils';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';
import { CategoryChip, StructureBadge, CommentSubBlock, ExerciseLine } from './DSLBlockRenderer';

// Dashboard blocks
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
  const { status, getEffectiveLevelForWorkout, rulerScore, confidence } = useAthleteStatus();
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
  
  const navigate = useNavigate();
  
  // Dia atual para buscar treino do dia
  const todayDay = useMemo<DayOfWeek>(() => {
    const days: DayOfWeek[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const today = new Date().getDay();
    return days[today] || 'seg';
  }, []);
  
  const [activeDay, setActiveDay] = useState<DayOfWeek>(todayDay);
  const [isAdaptModalOpen, setIsAdaptModalOpen] = useState(false);
  const savedUnavailableEquipment = athleteConfig?.unavailableEquipment || [];
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
      nome: provaAlvo.nome,
      race_date: provaAlvo.race_date,
      categoria: provaAlvo.categoria,
      daysUntil,
    };
  }, [provaAlvo]);

  const provaAlvoTargetTime = useMemo(() => {
    if (!targetTimes) return null;
    const totalSec = targetTimes.targetSeconds;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}m${String(s).padStart(2, '0')}s`;
    return `${m}m${String(s).padStart(2, '0')}s`;
  }, [targetTimes]);


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

  const handleStartWorkout = () => {
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
      toast.success('Treino ajustado conforme sua realidade de hoje', { duration: 3000 });
    } else {
      toast.success('Adaptações removidas.', { duration: 3000 });
    }
  };

  const hasAdaptations = savedUnavailableEquipment.length > 0;

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

  return (
    <div className="min-h-screen">
      {/* Content - Dashboard OUTLIER */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        
        {/* Header removido - agora está dentro do DiagnosticRadarBlock */}
        
        {/* ============================================
            BLOCO 1 — PERFIL DE PERFORMANCE COMPLETO
            (Diagnóstico + Limitador + Impacto + Projeção + CTA)
            ============================================ */}
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
          />
        </section>


        {/* Blocos de Evolução movidos para outra view */}

        {/* Equipment Adapt Button moved to sidebar */}
      </main>

      {/* Equipment Adapt Modal */}
      <EquipmentAdaptModal
        isOpen={isAdaptModalOpen}
        onClose={() => setIsAdaptModalOpen(false)}
        onApply={handleSaveEquipmentAdaptations}
        initialSelection={savedUnavailableEquipment}
      />

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

      {/* Level Up Modal */}
      {newLevel && (
        <LevelUpModal
          isOpen={showLevelUpModal}
          newStatus={newLevel}
          onContinue={acknowledgeLevel}
        />
      )}
    </div>
  );
}
