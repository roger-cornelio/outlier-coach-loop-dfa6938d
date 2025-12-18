import { useOutlierStore } from '@/store/outlierStore';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { AthleteConfig } from '@/components/AthleteConfig';
import { Dashboard } from '@/components/Dashboard';
import { WorkoutExecution } from '@/components/WorkoutExecution';
import { ResultRecording } from '@/components/ResultRecording';
import { PerformanceFeedback } from '@/components/PerformanceFeedback';
import { AdminSpreadsheet } from '@/components/AdminSpreadsheet';
import { UserManagement } from '@/components/UserManagement';
import { AnimatePresence, motion } from 'framer-motion';
import { useCoachTheme } from '@/hooks/useCoachTheme';

const Index = () => {
  const { currentView } = useOutlierStore();
  
  // Apply coach theme to the document
  useCoachTheme();

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
        return <AdminSpreadsheet />;
      case 'users':
      case 'userManagement':
        return <UserManagement />;
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="min-h-screen bg-background"
      >
        {renderView()}
      </motion.div>
    </AnimatePresence>
  );
};

export default Index;
