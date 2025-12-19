/**
 * Index - "DUMB" page that renders based on AppState
 * 
 * NO automatic redirects scattered. Uses useAppState for decisions.
 * AppGate handles routing protection.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOutlierStore } from "@/store/outlierStore";
import { useAppState } from "@/hooks/useAppState";
import { useEvents } from "@/hooks/useEvents";
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
import { AnimatePresence, motion } from "framer-motion";
import { useCoachTheme } from "@/hooks/useCoachTheme";
import { useLevelTheme } from "@/hooks/useLevelTheme";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { currentView, setCurrentView } = useOutlierStore();
  const { state, isCoach, canManageWorkouts } = useAppState();
  const navigate = useNavigate();

  // Initialize event tracking (tracks app_opened automatically)
  useEvents();

  // Apply coach theme and level theme (colors for text/badges only, NOT background)
  useCoachTheme();
  useLevelTheme();

  // Minimal navigation logic - AppGate handles most protection
  useEffect(() => {
    // LOADING: Do nothing, let AppGate show loader
    if (state === 'loading') return;

    // ANON on welcome: allowed
    if (state === 'anon' && currentView === 'welcome') return;

    // ANON trying to access other views: redirect to auth
    if (state === 'anon' && currentView !== 'welcome') {
      navigate('/auth');
      return;
    }

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
  }, [state, currentView, isCoach, canManageWorkouts, navigate, setCurrentView]);

  // Show loading while checking auth (except welcome screen)
  if (state === 'loading' && currentView !== 'welcome') {
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
          className="min-h-screen"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Index;
