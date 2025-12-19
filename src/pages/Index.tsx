import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOutlierStore } from "@/store/outlierStore";
import { useAuth } from "@/hooks/useAuth";
import { useEvents } from "@/hooks/useEvents";
import { WelcomeScreen } from "@/components/WelcomeScreen";
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
  const { user, profile, loading: authLoading, canManageWorkouts, isAdmin, isCoach } = useAuth();
  const navigate = useNavigate();

  // Initialize event tracking (tracks app_opened automatically)
  useEvents();

  // Apply coach theme and level theme (colors for text/badges only, NOT background)
  useCoachTheme();
  useLevelTheme();

  // MANDATORY LOGIN: Redirect to auth if not logged in
  // ADMIN users are redirected to /admin route (isolated)
  useEffect(() => {
    if (authLoading) return;

    // ===== ADMIN: Redirect to /admin route =====
    if (user && isAdmin) {
      navigate("/admin");
      return;
    }

    // ===== Welcome screen: allowed without login =====
    if (currentView === "welcome" && !user) return;

    // ===== No user: redirect to auth =====
    if (!user) {
      navigate("/auth");
      return;
    }

    // ===== Non-admin trying to access admin views: redirect to dashboard =====
    if (currentView === "admin" || currentView === "userManagement" || currentView === "params" || currentView === "coachApplicationsAdmin") {
      setCurrentView("dashboard");
      return;
    }

    // ===== Non-coach trying to access coach performance: redirect to dashboard =====
    if (currentView === "coachPerformance" && !isCoach) {
      setCurrentView("dashboard");
      return;
    }
  }, [user, authLoading, currentView, canManageWorkouts, isAdmin, isCoach, navigate, setCurrentView]);

  // Show loading while checking auth
  if (authLoading && currentView !== "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderView = () => {
    // ADMIN users are handled by /admin route, not here
    // This Index page is for athletes and coaches only

    switch (currentView) {
      case "welcome":
        return <WelcomeScreen />;
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
        // Coach can access admin spreadsheet for workout management
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
