import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { CoachApplicationForm } from './CoachApplicationForm';
import { UserHeader } from './UserHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function CoachApplicationPage() {
  const { setCurrentView } = useOutlierStore();
  const { isCoach } = useAuth();

  // If already a coach, redirect to admin
  if (isCoach) {
    setCurrentView('admin');
    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentView('dashboard')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">
              Quero ser Coach
            </h1>
          </div>
          <UserHeader showLogout={false} />
        </div>

        {/* Form */}
        <CoachApplicationForm />
      </div>
    </div>
  );
}
