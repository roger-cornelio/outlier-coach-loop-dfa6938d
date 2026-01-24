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
  const effectiveLevel = athleteConfig ? getEffectiveLevelForWorkout(athleteConfig.trainingDifficulty) : 'intermediario';
  
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
    
    // Mapear trainingLevel para AthleteLevel
    const levelMap: Record<string, string> = {
      'base': 'iniciante',
      'progressivo': 'intermediario',
      'performance': 'avancado',
    };
    const level = levelMap[athleteConfig?.trainingLevel || 'progressivo'] || effectiveLevel;
    
    return estimateWorkout(currentWorkout, athleteConfig, level as any);
  }, [currentWorkout, athleteConfig, effectiveLevel]);
  
  // Verificar se peso está configurado
  const biometrics = useMemo(() => getUserBiometrics(athleteConfig), [athleteConfig]);
  
  // Tempo total em minutos
  const totalTime = workoutEstimation?.totals.estimatedMinutesTotal || 0;
  
  // Calorias totais
  const totalCalories = workoutEstimation?.totals.estimatedKcalTotal || 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <OutlierWordmark size="sm" className="block" />
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


      {/* Content - Dashboard OUTLIER */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        
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
          {!hasAnyWorkouts && !loadingPlan && (
            <p className="text-center text-muted-foreground text-sm mt-3">
              Nenhum treino programado para esta semana
            </p>
          )}
        </section>

        {/* Day Tabs - Para visualização detalhada */}
        {hasAnyWorkouts && (
          <section className="mb-6">
            <button
              onClick={() => setShowDetailedView(!showDetailedView)}
              className="w-full py-3 px-4 rounded-lg border border-border bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all flex items-center justify-center gap-2"
            >
              <span className="font-display text-sm tracking-wide">
                {showDetailedView ? 'FECHAR VISÃO SEMANAL' : 'VER TREINO SEMANAL'}
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${showDetailedView ? 'rotate-90' : ''}`} />
            </button>
          </section>
        )}

        {/* Detailed View - Workout blocks */}
        <AnimatePresence>
          {showDetailedView && hasAnyWorkouts && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Week Navigator - Context for Weekly Training */}
              <div className="mb-4 pb-4 border-b border-border">
                <WeekNavigator
                  currentWeek={currentWeek}
                  canNavigateToPast={canNavigateToPast}
                  canNavigateToFuture={canNavigateToFuture}
                  onPreviousWeek={goToPreviousWeek}
                  onNextWeek={goToNextWeek}
                  onCurrentWeek={goToCurrentWeek}
                  isViewingHistory={isViewingHistory}
                />
                {isViewingHistory && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-amber-500 text-sm">
                    <History className="w-4 h-4" />
                    <span>Visualizando histórico (somente leitura)</span>
                  </div>
                )}
              </div>

              {/* Day Tabs */}
              <div className="flex gap-1 py-4 overflow-x-auto border-b border-border mb-6">
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
                        ${isViewingHistory ? 'opacity-80' : ''}
                      `}
                    >
                      {DAY_NAMES[day].slice(0, 3).toUpperCase()}
                      {hasWorkout && activeDay !== day && (
                        <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${isViewingHistory ? 'bg-amber-500' : 'bg-primary'}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Day Content */}
              {currentWorkout ? (
                <div className="space-y-4">
                  {/* Day Header */}
                  <div className="mb-4">
                    <h2 className="font-display text-3xl mb-2">{DAY_NAMES[currentWorkout.day]}</h2>
                    
                    {/* Rest Day */}
                    {currentWorkout.isRestDay && (
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 mb-4">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-blue-500" />
                          <span className="text-blue-500 font-medium">🌙 Dia de descanso</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Workout stats */}
                    {!currentWorkout.isRestDay && (
                      <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-primary" />
                          <span>{currentWorkout.stimulus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{totalTime > 0 ? `${totalTime}min` : 'Estimando…'}</span>
                        </div>
                        {totalCalories > 0 && (
                          <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-orange-500 font-medium">~{Math.abs(totalCalories)} kcal</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Workout Blocks */}
                  {currentWorkout.blocks.map((block, index) => {
                    const displayData = getBlockDisplayDataFromParsed(block);
                    
                    if (!displayData.hasContent) {
                      return null;
                    }
                    
                    const blockEstimate = workoutEstimation?.blocks[index];
                    const estimatedMinutes = blockEstimate?.estimatedMinutes || 0;
                    const estimatedKcal = blockEstimate?.estimatedKcal || 0;
                    const blockConfidence = blockEstimate?.confidence || 'low';

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
                        {/* Header */}
                        <div className="mb-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                              <h3 className="font-display text-2xl font-bold tracking-tight uppercase">
                                {getBlockDisplayTitle(block, index)}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <CategoryChip category={block.type} />
                                {block.isMainWod && (
                                  <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wide uppercase">
                                    WOD Principal
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Content */}
                        {(() => {
                          const { exerciseLines, coachNotes: commentLines, structureDescription } = displayData;
                          return (
                            <>
                              {structureDescription && (
                                <div className="mb-4">
                                  <StructureBadge structure={structureDescription} />
                                </div>
                              )}
                              
                              <div className="space-y-2">
                                {exerciseLines.length > 0 ? (
                                  exerciseLines.map((line, idx) => (
                                    <ExerciseLine key={idx} line={line} className="text-foreground/80" />
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground/30 italic py-1">—</p>
                                )}
                              </div>
                              
                              <CommentSubBlock comments={commentLines} />
                            </>
                          );
                        })()}

                        {/* Block Stats */}
                        {block.type !== 'notas' && (
                          <div className="flex items-center gap-4 pt-3 border-t border-border/50">
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {blockConfidence === 'low' ? '~' : ''}
                              </span>
                              <span className="font-medium text-foreground">
                                {formatEstimatedTime(estimatedMinutes)}
                              </span>
                              {blockConfidence === 'low' && (
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

                  {/* Start Workout Button */}
                  {!isViewingHistory && (
                    <motion.button
                      onClick={handleStartWorkout}
                      className="w-full font-display text-xl tracking-wider px-8 py-5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      INICIAR TREINO
                      <ChevronRight className="w-6 h-6" />
                    </motion.button>
                  )}
                </div>
              ) : (
                <div className="min-h-[200px] flex flex-col items-center justify-center gap-4 card-elevated p-8 rounded-xl">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Clock className="w-8 h-8 text-primary/60" />
                  </div>
                  <p className="text-muted-foreground text-center text-lg">
                    Nenhum treino para {DAY_NAMES[activeDay].toLowerCase()}.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State - No workouts at all */}
        {!hasAnyWorkouts && !loadingPlan && (
          <div className="min-h-[200px] flex flex-col items-center justify-center gap-4 card-elevated p-8 rounded-xl">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Clock className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="font-display text-xl text-foreground">
              📭 Nenhum treino publicado para esta semana
            </h3>
            <p className="text-muted-foreground text-center text-sm max-w-md">
              {currentWeek.isFuture 
                ? 'Seu coach ainda não publicou treinos para a próxima semana.'
                : 'Seu coach ainda não publicou treinos para esta semana. Aguarde ou entre em contato.'}
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
          </div>
        )}

        {/* Equipment Adapt Button */}
        {hasAnyWorkouts && !isViewingHistory && (
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
        )}
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
