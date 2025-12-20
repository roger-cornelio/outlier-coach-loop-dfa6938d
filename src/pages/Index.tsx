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

const Index = () => {
  const { currentView, setCurrentView, coachStyle, setCoachStyle, athleteConfig } = useOutlierStore();
  const { state, isCoach, canManageWorkouts, profile, profileLoaded, profileLoading } = useAppState();

  // Centralized onboarding decision
  const onboardingDecision = useOnboardingDecision();

  // Track if we've already done the initial navigation check
  const initialCheckDone = useRef(false);

  // Initialize event tracking (tracks app_opened automatically)
  useEvents();

  // Apply coach theme and level theme (colors for text/badges only, NOT background)
  useCoachTheme();
  useLevelTheme();

  // COACH STYLE FLOW (using centralized decision)
  // REGRA: Welcome screen APENAS no primeiro acesso (first_setup_completed == false)
  // Em logins futuros, vai direto para preWorkout/dashboard
  useEffect(() => {
    // PROTECTED: Only proceed when we have data and can redirect
    if (!onboardingDecision.canRedirect || initialCheckDone.current) {
      console.log('[Index] Redirect blocked:', onboardingDecision.lastRedirectReason);
      return;
    }

    const coachStyleFromProfile = profile?.coach_style;

    // ===== CONDIÇÃO EXATA DE ONBOARDING =====
    // Using centralized decision
    if (onboardingDecision.shouldShowOnboarding) {
      if (currentView !== 'welcome' && currentView !== 'athleteWelcome' && currentView !== 'config') {
        console.log('[Index] Showing onboarding - reason:', onboardingDecision.lastRedirectReason);
        setCurrentView('welcome');
      }
      initialCheckDone.current = true;
      return;
    }

    // Se setup já foi completado, sincroniza coach_style e vai para fluxo principal
    if (coachStyleFromProfile) {
      const normalized = coachStyleFromProfile as CoachStyle;
      if (coachStyle !== normalized) {
        setCoachStyle(normalized);
      }
    }

    // Login subsequente: vai direto para preWorkout ou dashboard
    if (currentView === 'welcome') {
      if (athleteConfig) {
        setCurrentView('preWorkout');
      } else {
        setCurrentView('dashboard');
      }
      console.log('[Index] Skipped welcome - reason:', onboardingDecision.lastRedirectReason);
    }

    initialCheckDone.current = true;
  }, [
    onboardingDecision.canRedirect,
    onboardingDecision.shouldShowOnboarding,
    onboardingDecision.lastRedirectReason,
    profile?.coach_style,
    coachStyle,
    currentView,
    athleteConfig,
    setCoachStyle,
    setCurrentView,
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

  // Show loading while checking auth
  if (state === 'loading') {
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
