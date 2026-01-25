import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import { getCoachCopy } from '@/config/coachCopy';
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
  
  // Carregar configurações do atleta do banco (persistência)
  useAthleteProfile();
  
  // Detectar subida de nível para exibir modal
  const { showModal: showLevelUpModal, newLevel, acknowledgeLevel } = useLevelUpDetection(status);
  
  const navigate = useNavigate();
  
  const [activeDay, setActiveDay] = useState<DayOfWeek>(() => {
    // Inicializar com o dia atual da semana
    const days: DayOfWeek[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const today = new Date().getDay();
    return days[today] || 'seg';
  });
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
  const effectiveLevel = athleteConfig ? getEffectiveLevelForWorkout(athleteConfig.trainingLevel) : 'intermediario';
  
  const currentWorkout = displayWorkouts.find((w) => w.day === activeDay);
  const hasAnyWorkouts = displayWorkouts.length > 0;


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
    // Determinar o dia atual da semana (seg, ter, qua, etc.)
    const days: DayOfWeek[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const todayDayOfWeek = days[new Date().getDay()];
    
    // Buscar treino do dia ATUAL (não do dia selecionado na aba)
    const todayWorkout = displayWorkouts.find((w) => w.day === todayDayOfWeek);
    
    if (todayWorkout && !todayWorkout.isRestDay) {
      setSelectedWorkout(todayWorkout);
      setCurrentView('workout');
    } else {
      toast.info('Não há treino previsto para esse dia.', {
        duration: 3000,
      });
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
        
        {/* ============================================
            BLOCO 0 — IDENTIDADE HERO DO ATLETA
            ============================================ */}
        <section className="mb-8">
          <AthleteHeroIdentity
            name={profile?.name || user?.email?.split('@')[0] || 'Atleta'}
            status={status}
          />
        </section>
        
        {/* ============================================
            BLOCO 1 — DIAGNÓSTICO (Radar Chart)
            ============================================ */}
        <section className="mb-6">
          <DiagnosticRadarBlock
            scores={diagnosticScores.scores}
            loading={diagnosticScores.loading}
            hasData={diagnosticScores.hasData}
          />
        </section>

        {/* ============================================
            BLOCO 2 — SUA EVOLUÇÃO (Gráfico de Linha)
            ============================================ */}
        <section className="mb-6">
          <EvolutionChartBlock
            data={weeklyEvolution.data}
            diagnosticText={weeklyEvolution.diagnosticText}
            trend={weeklyEvolution.trend}
            loading={weeklyEvolution.loading}
            hasData={weeklyEvolution.hasData}
            onViewEvolution={() => setCurrentView('benchmarks')}
          />
        </section>

        {/* ============================================
            BLOCO 3 — FOCOS DE EVOLUÇÃO
            ============================================ */}
        <section className="mb-6">
          <EvolutionFocusBlock
            focusPoints={evolutionFocus.focusPoints}
            hasData={evolutionFocus.hasData}
            loading={evolutionFocus.loading}
            onViewEvolution={() => setCurrentView('benchmarks')}
          />
        </section>

        {/* ============================================
            BLOCO 4 — CTA ÚNICO: BORA TREINAR
            ============================================ */}
        <section className="mb-6">
          <motion.button
            onClick={handleStartWorkout}
            disabled={!hasAnyWorkouts}
            className="w-full font-display text-2xl tracking-wider px-8 py-6 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 shadow-lg"
            whileHover={{ scale: hasAnyWorkouts ? 1.02 : 1 }}
            whileTap={{ scale: hasAnyWorkouts ? 0.98 : 1 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Flame className="w-7 h-7" />
            BORA TREINAR
            <ChevronRight className="w-7 h-7" />
          </motion.button>
          
          {/* Texto motivacional sobre o foco do treino */}
          <p className="text-center text-muted-foreground text-sm mt-4">
            {hasAnyWorkouts 
              ? "Hoje o foco será em resistência e força funcional. Bora evoluir! 💪"
              : !loadingPlan 
                ? "Nenhum treino programado para esta semana"
                : null
            }
          </p>
        </section>

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
