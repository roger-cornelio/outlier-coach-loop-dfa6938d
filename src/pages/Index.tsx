import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { AthleteConfig } from '@/components/AthleteConfig';
import { Dashboard } from '@/components/Dashboard';
import { WorkoutExecution } from '@/components/WorkoutExecution';
import { ResultRecording } from '@/components/ResultRecording';
import { PerformanceFeedback } from '@/components/PerformanceFeedback';
import { AdminSpreadsheet } from '@/components/AdminSpreadsheet';
import { AdminParamsEditor } from '@/components/AdminParamsEditor';
import { UserManagement } from '@/components/UserManagement';
import { BenchmarksScreen } from '@/components/BenchmarksScreen';
import { CoachPerformance } from '@/components/CoachPerformance';
import { AnimatePresence, motion } from 'framer-motion';
import { useCoachTheme } from '@/hooks/useCoachTheme';
import { useLevelTheme } from '@/hooks/useLevelTheme';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { currentView, setCurrentView } = useOutlierStore();
  const { user, profile, loading: authLoading, canManageWorkouts, isAdmin, isCoach } = useAuth();
  const navigate = useNavigate();
  
  // Initialize event tracking (tracks app_opened automatically)
  useEvents();
  
  // Apply coach theme and level theme (colors for text/badges only, NOT background)
  useCoachTheme();
  useLevelTheme();

  // MANDATORY LOGIN: Redirect to auth if not logged in (except welcome)
  useEffect(() => {
    if (authLoading) return;
    
    // Allow welcome screen without login
    if (currentView === 'welcome') return;
    
    // Redirect to auth if not logged in
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Redirect non-coaches away from admin
    if (currentView === 'admin' && !canManageWorkouts) {
      setCurrentView('dashboard');
      return;
    }
    
    // Redirect non-admins away from user management and params
    if ((currentView === 'userManagement' || currentView === 'params') && !isAdmin) {
      setCurrentView('dashboard');
      return;
    }
    
    // Redirect non-coaches away from coach performance
    if (currentView === 'coachPerformance' && !isCoach && !isAdmin) {
      setCurrentView('dashboard');
      return;
    }
  }, [user, authLoading, currentView, canManageWorkouts, isAdmin, isCoach, navigate, setCurrentView]);

  // Show loading while checking auth
  if (authLoading && currentView !== 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'config':
        return <AthleteConfig />;
      case 'dashboard':
        return <Dashboard />;
      case 'workout':
        return <WorkoutExecution />;
      case 'result':
        return <ResultRecording />;
      case 'feedback':
        return <PerformanceFeedback />;
      case 'admin':
        return canManageWorkouts ? <AdminSpreadsheet /> : <Dashboard />;
      case 'params':
        return isAdmin ? <AdminParamsEditor /> : <Dashboard />;
      case 'users':
      case 'userManagement':
        return isAdmin ? <UserManagement /> : <Dashboard />;
      case 'benchmarks':
        return <BenchmarksScreen />;
      case 'coachPerformance':
        return (isCoach || isAdmin) ? <CoachPerformance /> : <Dashboard />;
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
