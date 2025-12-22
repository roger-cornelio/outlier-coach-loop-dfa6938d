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

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useOutlierStore } from "@/store/outlierStore";
import { useAppState } from "@/hooks/useAppState";
import { useEvents } from "@/hooks/useEvents";
import { useOnboardingDecision } from "@/hooks/useOnboardingDecision";
import type { CoachStyle } from "@/types/outlier";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { PreWorkoutScreen } from "@/components/PreWorkoutScreen";
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
import { DebugPanel } from "@/components/DebugPanel";
import { AnimatePresence, motion } from "framer-motion";
import { useCoachTheme } from "@/hooks/useCoachTheme";
import { useLevelTheme } from "@/hooks/useLevelTheme";
import { Loader2 } from "lucide-react";

const LAST_ROUTE_KEY = "outlier_last_route";

function loadLastRoute(): string | null {
  try {
    return localStorage.getItem(LAST_ROUTE_KEY);
  } catch {
    return null;
  }
}

const Index = () => {
  const { hasHydrated, currentView, setCurrentView, coachStyle, setCoachStyle, athleteConfig } = useOutlierStore();
  const { state, isCoach, canManageWorkouts, profile, profileLoaded, profileLoading } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();

  // Centralized onboarding decision
  const onboardingDecision = useOnboardingDecision();

  // Track if we've already done the initial navigation check
  const initialCheckDone = useRef(false);

  // CRÍTICO: só considerar "restaurado" após hydration do zustand
  const viewRestoredFromStorage = hasHydrated && currentView !== "welcome" && currentView !== "athleteWelcome";

  // Initialize event tracking (tracks app_opened automatically)
  useEvents();

  // Apply coach theme and level theme (colors for text/badges only, NOT background)
  useCoachTheme();
  useLevelTheme();

  // FLUXO PRINCIPAL DE NAVEGAÇÃO
  // 
  // REGRAS UX DEFINITIVAS:
  // 1. Setup completo → direto para treino do dia (preWorkout/dashboard)
  // 2. Setup incompleto → mostrar telas de onboarding
  // 3. F5/reload → manter tela atual (via outlier_last_route)
  // 4. Login NÃO é configuração - nunca reexibir setup para usuário configurado
  //
  useEffect(() => {
    // PROTECTED: Only proceed when we have data and can redirect
    if (!onboardingDecision.canRedirect || initialCheckDone.current) {
      return;
    }

    const coachStyleFromProfile = profile?.coach_style;
    const lastRoute = loadLastRoute();
    const currentPath = `${location.pathname}${location.search}${location.hash}`;

    // ===== PRIORIDADE 1: SETUP COMPLETO + ÚLTIMA ROTA (F5) =====
    // Se setup já foi concluído e existe última rota válida, restaurar e encerrar
    if (onboardingDecision.isSetupComplete && lastRoute) {
      // Sincronizar coach_style se necessário
      if (coachStyleFromProfile) {
        const normalized = coachStyleFromProfile as CoachStyle;
        if (coachStyle !== normalized) {
          setCoachStyle(normalized);
        }
      }
      
      if (lastRoute !== currentPath) {
        navigate(lastRoute, { replace: true });
      }
      initialCheckDone.current = true;
      return;
    }

    // ===== PRIORIDADE 2: SETUP COMPLETO → DIRETO PARA TREINO =====
    // Usuário configurado deve ir direto para preWorkout/dashboard, NUNCA para telas de setup
    if (onboardingDecision.isSetupComplete) {
      // Sincronizar coach_style
      if (coachStyleFromProfile) {
        const normalized = coachStyleFromProfile as CoachStyle;
        if (coachStyle !== normalized) {
          setCoachStyle(normalized);
        }
      }
      
      // Ir direto para treino (preWorkout) ou dashboard
      // NUNCA ir para welcome, athleteWelcome ou config
      if (currentView === 'welcome' || currentView === 'athleteWelcome' || currentView === 'config') {
        if (athleteConfig) {
          setCurrentView('preWorkout');
        } else {
          setCurrentView('dashboard');
        }
      }
      
      initialCheckDone.current = true;
      return;
    }

    // ===== PRIORIDADE 3: PROTEÇÃO DE RELOAD (F5) - VIEW RESTAURADA =====
    // Se currentView foi restaurado do localStorage, respeitar contexto
    if (viewRestoredFromStorage) {
      if (coachStyleFromProfile) {
        const normalized = coachStyleFromProfile as CoachStyle;
        if (coachStyle !== normalized) {
          setCoachStyle(normalized);
        }
      }
      initialCheckDone.current = true;
      return;
    }

    // ===== PRIORIDADE 4: SETUP INCOMPLETO → ONBOARDING =====
    // Apenas mostrar telas de setup se realmente necessário
    if (onboardingDecision.shouldShowOnboarding) {
      // Determinar qual tela de setup mostrar
      const hasCoachStyle = coachStyleFromProfile && ['IRON', 'PULSE', 'SPARK'].includes(coachStyleFromProfile);
      
      if (!hasCoachStyle) {
        // Sem coach_style → começar do início (welcome)
        if (currentView !== 'welcome') {
          setCurrentView('welcome');
        }
      } else {
        // Tem coach_style mas falta parâmetros → ir para config
        if (currentView !== 'config') {
          setCurrentView('config');
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
    athleteConfig,
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

  // Show loading while checking auth/profile (não navegar enquanto carrega)
  if (state === 'loading' || profileLoading || !profileLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case "welcome":
        return <WelcomeScreen />;
      case "athleteWelcome":
        return <AthleteWelcomeScreen />;
      case "config":
        return <AthleteConfig />;
      case "preWorkout":
        return <PreWorkoutScreen />;
      case "dashboard":
        return <Dashboard />;
      case "workout":
        return <WorkoutExecution />;
      case "result":
        return <ResultRecording />;
      case "feedback":
        return <PerformanceFeedback />;
      case "admin":
        return canManageWorkouts ? <AdminSpreadsheet /> : <Dashboard />;
      case "benchmarks":
        return <BenchmarksScreen />;
      case "coachPerformance":
        return isCoach ? <CoachPerformance /> : <Dashboard />;
      case "coachApplication":
        return <CoachApplicationPage />;
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-screen pb-20"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>

      {/* Debug Panel - only in development */}
      <DebugPanel
        state={{
          authStatus: onboardingDecision.authStatus,
          userId: onboardingDecision.userId,
          profileLoaded: onboardingDecision.profileLoaded,
          profileCoachStyle: onboardingDecision.profileCoachStyle,
          firstSetupCompleted: onboardingDecision.firstSetupCompleted,
          isSetupComplete: onboardingDecision.isSetupComplete,
          localCoachStyle: onboardingDecision.localCoachStyle,
          shouldShowOnboarding: onboardingDecision.shouldShowOnboarding,
          currentRoute: '/app',
          currentView: currentView,
          lastRedirectReason: onboardingDecision.lastRedirectReason,
        }}
      />
    </div>
  );
};

export default Index;
