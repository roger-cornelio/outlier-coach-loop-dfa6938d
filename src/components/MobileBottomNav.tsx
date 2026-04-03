/**
 * MobileBottomNav - Bottom tab bar para navegação mobile
 * 
 * Substitui o hamburger menu em telas < 768px.
 * 5 tabs fixas no rodapé: Dashboard, Treino, Evolução, Provas, Config.
 */

import { useNavigate } from 'react-router-dom';
import { useOutlierStore } from '@/store/outlierStore';
import { useNewPlanIndicator } from '@/hooks/useNewPlanIndicator';
import { useWorkoutStreak } from '@/hooks/useWorkoutStreak';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  TrendingUp,
  Target,
  Settings,
  Flame,
} from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  view?: string;
  route?: string;
}

const tabs: TabItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, view: 'dashboard' },
  { id: 'weeklyTraining', label: 'Treino', icon: Calendar, view: 'weeklyTraining' },
  { id: 'benchmarks', label: 'Evolução', icon: TrendingUp, view: 'benchmarks' },
  { id: 'prova-alvo', label: 'Provas', icon: Target, route: '/prova-alvo' },
  { id: 'config', label: 'Config', icon: Settings, view: 'config' },
];

export function MobileBottomNav() {
  const isMobile = useIsMobile();
  const { currentView, setCurrentView } = useOutlierStore();
  const { hasNewPlan, markAsSeen } = useNewPlanIndicator();
  const { currentStreak, isStreakActive } = useWorkoutStreak();
  const navigate = useNavigate();

  if (!isMobile) return null;

  const handleTabClick = (tab: TabItem) => {
    if (tab.view === 'weeklyTraining') markAsSeen();
    if (tab.route) {
      navigate(tab.route);
    } else if (tab.view) {
      setCurrentView(tab.view as any);
    }
  };

  const isActive = (tab: TabItem) => {
    if (tab.route) {
      return window.location.pathname === tab.route;
    }
    return currentView === tab.view;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
              aria-label={tab.label}
            >
              <div className="relative">
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                
                {/* New plan badge on Treino tab */}
                {tab.id === 'weeklyTraining' && hasNewPlan && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                )}
              </div>

              <span className={cn(
                'text-[10px] leading-tight',
                active ? 'font-semibold' : 'font-medium'
              )}>
                {tab.label}
              </span>

              {/* Streak badge on Dashboard tab */}
              {tab.id === 'dashboard' && isStreakActive && currentStreak >= 2 && (
                <div className="absolute -top-0.5 right-1/4 flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  <Flame className="w-2.5 h-2.5 text-primary" />
                  <span className="text-[8px] font-bold text-primary">{currentStreak}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
