/**
 * Index - "DUMB" page that renders based on AppState
 * 
 * IMPORTANT: Only authenticated users reach this page.
 * AppGate redirects anon users to /auth before they can see Index.
 * 
 * COACH STYLE FLOW:
 * - First login: Shows WelcomeScreen for coach selection, saves to profile
 * - Subsequent logins: Loads saved coach_style, skips to dashboard/config
 * 
 * ONBOARDING DECISION:
 * - Centralized in useOnboardingDecision hook
 * - Only redirects when: authenticated AND profileLoaded AND shouldShowOnboarding
 */

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useOutlierStore } from "@/store/outlierStore";
import { useAppState } from "@/hooks/useAppState";
import { useEvents } from "@/hooks/useEvents";
import { useOnboardingDecision } from "@/hooks/useOnboardingDecision";
import type { CoachStyle } from "@/types/outlier";
import { WelcomeScreen } from "@/components/WelcomeScreen";

import { AthleteWelcomeScreen } from "@/components/AthleteWelcomeScreen";
import { AthleteConfig } from "@/components/AthleteConfig";
import { Dashboard } from "@/components/Dashboard";
import { WorkoutExecution } from "@/components/WorkoutExecution";
import { ResultRecording } from "@/components/ResultRecording";
import { PerformanceFeedback } from "@/components/PerformanceFeedback";
import { AdminSpreadsheet } from "@/components/AdminSpreadsheet";
import { BenchmarksScreen } from "@/components/BenchmarksScreen";
import { CoachPerformance } from "@/components/CoachPerformance";
import { CoachApplicationPage } from "@/components/CoachApplicationPage";
import { WeeklyTrainingView } from "@/components/WeeklyTrainingView";
import { EvolutionTab } from "@/components/evolution/EvolutionTab";

import { AnimatePresence, motion } from "framer-motion";
import { useCoachTheme } from "@/hooks/useCoachTheme";
import { useLevelTheme } from "@/hooks/useLevelTheme";
import { Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useDarkMode } from "@/hooks/useDarkMode";
import { OnboardingTour } from "@/components/OnboardingTour";


const LAST_ROUTE_KEY = "outlier_last_route";

function loadLastRoute(): string | null {
  try {
    return localStorage.getItem(LAST_ROUTE_KEY);
  } catch {
    return null;
  }
}

const LOADING_PHRASES = [
  "Preparando sua experiência...",
  "Entendendo sua prova...",
  "Avaliando splits reais...",
  "Quase lá...",
];

const Index = () => {
  const { hasHydrated, currentView, setCurrentView, coachStyle, setCoachStyle, athleteConfig, setAthleteConfig } = useOutlierStore();
  const { state, isCoach, canManageWorkouts, profile, profileLoaded, profileLoading } = useAppState();
  
  // Initialize dark mode
  useDarkMode();
  

  const navigate = useNavigate();
  const location = useLocation();

  // Centralized onboarding decision
  const onboardingDecision = useOnboardingDecision();

  // Track if we've already done the initial navigation check
  const initialCheckDone = useRef(false);

  // CRÍTICO: só considerar "restaurado" após hydration do zustand
  // E apenas se currentView não é uma tela de setup
  const isSetupView = currentView === 'welcome' || currentView === 'athleteWelcome' || currentView === 'config';
  const viewRestoredFromStorage = hasHydrated && !isSetupView;

  // Initialize event tracking (tracks app_opened automatically)
  useEvents();

  // Apply coach theme and level theme (colors for text/badges only, NOT background)
  useCoachTheme();
  useLevelTheme();

  // FLUXO PRINCIPAL DE NAVEGAÇÃO
  // 
  // REGRA MESTRA: Usar APENAS first_setup_completed === true
  // 
  // REGRAS:
  // 1. first_setup_completed === true → direto para preWorkout/dashboard
  // 2. first_setup_completed !== true → mostrar telas de onboarding
  // 3. F5/reload com setup completo → manter tela atual
  // 4. A tela de Configuração só abre por ação explícita do usuário
  //
  useEffect(() => {
    // PROTECTED: Only proceed when we have data and can redirect
    if (!onboardingDecision.canRedirect || initialCheckDone.current) {
      return;
    }

    // Force onboarding via ?force-onboarding=1 (superadmin ou dev)
    const searchParams = new URLSearchParams(location.search);
    const forceOnboarding = searchParams.get('force-onboarding') === '1';
    if (forceOnboarding) {
      console.log(`[NAV][Index] force-onboarding activated, state=${state}`);
      setCurrentView('welcome');
      initialCheckDone.current = true;
      return;
    }

    const coachStyleFromProfile = profile?.coach_style;
    const lastRoute = loadLastRoute();
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    const outlierWeekAnchor = localStorage.getItem('outlier_week_anchor');
    
    // ========== DEBUG LOG ==========
    console.log(`[GATE][Index] currentView=${currentView} isSetupComplete=${onboardingDecision.isSetupComplete} first_setup_completed=${onboardingDecision.firstSetupCompleted} coachStyle=${coachStyleFromProfile} lastRoute=${lastRoute} viewRestoredFromStorage=${viewRestoredFromStorage} outlier_week_anchor=${outlierWeekAnchor} ts=${new Date().toISOString()}`);
    // ================================

    // ===== PRIORIDADE 1: SETUP COMPLETO (first_setup_completed === true) =====
    if (onboardingDecision.isSetupComplete && !forceOnboarding) {
      // Sincronizar coach_style se necessário
      if (coachStyleFromProfile) {
        const normalized = coachStyleFromProfile as CoachStyle;
        if (coachStyle !== normalized) {
          setCoachStyle(normalized);
        }
      }
      
      // Se tem última rota válida (F5/reload), restaurar
      if (lastRoute && lastRoute !== currentPath) {
        console.log(`[NAV][Index] from=${currentPath} to=${lastRoute} first_setup_completed=${onboardingDecision.firstSetupCompleted} coachStyle=${coachStyleFromProfile} reason=restore_last_route_F5 ts=${new Date().toISOString()}`);
        navigate(lastRoute, { replace: true });
        initialCheckDone.current = true;
        return;
      }
      
      // Se view foi restaurada do localStorage, respeitar
      if (viewRestoredFromStorage) {
        console.log(`[NAV][Index] currentView=${currentView} first_setup_completed=${onboardingDecision.firstSetupCompleted} reason=view_restored_from_storage_NO_REDIRECT ts=${new Date().toISOString()}`);
        initialCheckDone.current = true;
        return;
      }
      
      // REGRA: Atleta configurado vai direto para dashboard
      // NUNCA ir para welcome, athleteWelcome ou config automaticamente
      // NOTE: preWorkout foi removido como etapa intermediária
      if (currentView === 'welcome' || currentView === 'athleteWelcome' || currentView === 'config' || currentView === 'preWorkout') {
        // Ir direto para dashboard (treino do dia)
        console.log(`[NAV][Index] from_view=${currentView} to_view=dashboard first_setup_completed=${onboardingDecision.firstSetupCompleted} coachStyle=${coachStyleFromProfile} reason=setup_complete_redirect_to_dashboard ts=${new Date().toISOString()}`);
        setCurrentView('dashboard');
      }
      
      initialCheckDone.current = true;
      return;
    }

    // ===== PRIORIDADE 2: SETUP INCOMPLETO → SEMPRE ONBOARDING =====
    // REGRA MESTRA: Se first_setup_completed !== true, NUNCA ir para preWorkout/dashboard
    // Ignorar lastRoute, viewRestoredFromStorage, etc.
    // Nota: Este bloco foi removido. Agora o fluxo cai direto na PRIORIDADE 3.

    // ===== PRIORIDADE 3: SETUP INCOMPLETO → ONBOARDING =====
    // Apenas mostrar telas de setup se first_setup_completed !== true
    if (onboardingDecision.shouldShowOnboarding) {
      // Sincronizar coach_style se existir no profile
      if (coachStyleFromProfile) {
        const normalized = coachStyleFromProfile as CoachStyle;
        if (coachStyle !== normalized) {
          setCoachStyle(normalized);
        }
      }
      
      // Determinar qual tela de setup mostrar
      const hasCoachStyle = coachStyleFromProfile && ['IRON', 'PULSE', 'SPARK'].includes(coachStyleFromProfile);
      
      // REGRA: Usuário com coach_style mas sem setup completo
      // Fluxo: welcome → athleteWelcome → config → save → preWorkout
      if (!hasCoachStyle) {
        // Sem coach_style → começar do início (welcome = seleção de coach)
        if (currentView !== 'welcome') {
          console.log(`[NAV][Index] from_view=${currentView} to_view=welcome first_setup_completed=${onboardingDecision.firstSetupCompleted} coachStyle=${coachStyleFromProfile} reason=onboarding_no_coach_style ts=${new Date().toISOString()}`);
          setCurrentView('welcome');
        }
      } else {
        // Tem coach_style mas first_setup_completed !== true
        // Se já está em athleteWelcome ou config, manter (fluxo correto)
        // Senão, ir para athleteWelcome (tela "Você está prestes a se tornar Outlier")
        if (currentView !== 'config' && currentView !== 'athleteWelcome') {
          console.log(`[NAV][Index] from_view=${currentView} to_view=athleteWelcome first_setup_completed=${onboardingDecision.firstSetupCompleted} coachStyle=${coachStyleFromProfile} reason=onboarding_has_coach_needs_welcome_then_config ts=${new Date().toISOString()}`);
          setCurrentView('athleteWelcome');
        }
      }
      
      initialCheckDone.current = true;
      return;
    }

    initialCheckDone.current = true;
  }, [
    onboardingDecision.canRedirect,
    onboardingDecision.shouldShowOnboarding,
    onboardingDecision.isSetupComplete,
    onboardingDecision.lastRedirectReason,
    profile?.coach_style,
    coachStyle,
    currentView,
    setCoachStyle,
    setCurrentView,
    viewRestoredFromStorage,
    navigate,
    location.pathname,
    location.search,
    location.hash,
  ]);

  // View access control for authenticated users
  useEffect(() => {
    // LOADING: Do nothing, AppGate handles loading state
    if (state === 'loading') return;

    // ADMIN and SUPERADMIN can access ALL views - no redirect
    // They can navigate the app normally like any athlete

    // Non-admin trying to access admin views: reset to dashboard
    const isAdminView = currentView === 'admin' || currentView === 'userManagement' || 
                        currentView === 'params' || currentView === 'coachApplicationsAdmin';
    if (isAdminView && !canManageWorkouts) {
      setCurrentView('dashboard');
      return;
    }

    // Non-coach trying to access coach performance: reset to dashboard
    if (currentView === 'coachPerformance' && !isCoach && state !== 'admin' && state !== 'superadmin') {
      setCurrentView('dashboard');
      return;
    }
  }, [state, currentView, isCoach, canManageWorkouts, setCurrentView]);

  // Listen for simulator CTA → navigate to benchmarks (simulator tab)
  useEffect(() => {
    const handler = () => setCurrentView('benchmarks');
    window.addEventListener('outlier:open-simulator', handler);
    return () => window.removeEventListener('outlier:open-simulator', handler);
  }, [setCurrentView]);

  // Show loading while checking auth/profile (não navegar enquanto carrega)
  // Também bloqueia render enquanto decisão de onboarding não é determinística
  // Rotating loading phrases
  const [phraseIndex, setPhraseIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  if (state === 'loading' || profileLoading || !profileLoaded || !onboardingDecision.canRedirect) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <AnimatePresence mode="wait">
          <motion.p
            key={phraseIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-muted-foreground tracking-wide"
          >
            {LOADING_PHRASES[phraseIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    );
  }

  // ============================================================
  // MAP EXPLÍCITO DE VIEWS - REGRA 1: Evitar undefined/crash
  // ============================================================
  const VIEW_COMPONENTS = {
    welcome: WelcomeScreen,
    athleteWelcome: AthleteWelcomeScreen,
    config: AthleteConfig,
    dashboard: Dashboard,
    weeklyTraining: WeeklyTrainingView,
    workout: WorkoutExecution,
    result: ResultRecording,
    feedback: PerformanceFeedback,
    admin: AdminSpreadsheet,
    benchmarks: BenchmarksScreen,
    evolution: EvolutionTab,
    coachPerformance: CoachPerformance,
    coachApplication: CoachApplicationPage,
  } as const;

  const renderView = () => {
    // REGRA ABSOLUTA: Se first_setup_completed === true, NUNCA renderizar telas de setup
    // REGRA INVERSA: Se first_setup_completed !== true, NUNCA renderizar preWorkout/dashboard
    const setupComplete = onboardingDecision.isSetupComplete;
    const isForceOnboarding = new URLSearchParams(location.search).get('force-onboarding') === '1';
    
    // Resolver view efetiva
    let effectiveView = currentView;
    
    if (setupComplete && !isForceOnboarding) {
      // Se setup completo, redirecionar telas de setup para dashboard
      // NOTE: preWorkout foi removido como etapa intermediária
      if (currentView === 'welcome' || currentView === 'athleteWelcome' || currentView === 'preWorkout') {
        effectiveView = 'dashboard';
      }
    } else {
      // BLOQUEIO CRÍTICO: Se setup NÃO completo, PROIBIR dashboard/workout/etc
      // Estas views são EXCLUSIVAS de usuários configurados
      const protectedViews = ['dashboard', 'workout', 'result', 'feedback', 'benchmarks'];
      if (protectedViews.includes(currentView)) {
        // Redirecionar para athleteWelcome ou welcome conforme coach_style
        const hasCoachStyle = profile?.coach_style && ['IRON', 'PULSE', 'SPARK'].includes(profile.coach_style);
        effectiveView = hasCoachStyle ? 'athleteWelcome' : 'welcome';
        console.log(`[RENDER] BLOCKED view=${currentView} → effectiveView=${effectiveView} reason=setup_not_complete`);
      }
    }
    
    // Proteção de views de admin/coach
    if (effectiveView === 'admin' && !canManageWorkouts) {
      effectiveView = 'dashboard';
    }
    if (effectiveView === 'coachPerformance' && !isCoach) {
      effectiveView = 'dashboard';
    }

    // Resolver componente do map
    const Screen = VIEW_COMPONENTS[effectiveView as keyof typeof VIEW_COMPONENTS];
    
    // FALLBACK SEGURO: Se view inválida ou componente undefined
    if (!Screen || typeof Screen !== 'function') {
      console.error('[VIEW] invalid currentView or undefined Screen', { 
        currentView, 
        effectiveView,
        screenType: typeof Screen,
        availableViews: Object.keys(VIEW_COMPONENTS)
      });
      // Renderizar fallback sem framer-motion para evitar crash
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8">
            <p className="text-destructive mb-4">View inválida: {currentView}</p>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      );
    }
    
    // Renderizar componente válido
    return <Screen />;
  };


  // Determine if sidebar should be visible (only for main app views, not onboarding)
  const showSidebar = onboardingDecision.isSetupComplete && 
    !['welcome', 'athleteWelcome', 'config'].includes(currentView);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)]">
        {/* Sidebar - only visible after setup complete (desktop only) */}
        {showSidebar && (
          <AppSidebar />
        )}
        
        {/* Mobile Bottom Nav - tab bar for mobile (only after setup complete) */}
        {showSidebar && (
          <MobileBottomNav />
        )}
        
        {/* Main content area */}
        <div className="flex-1 min-h-screen min-w-0 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="min-h-screen pb-20"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Guided onboarding tour for new athletes */}
        {showSidebar && <OnboardingTour />}


      </div>
    </SidebarProvider>
  );
};

export default Index;
