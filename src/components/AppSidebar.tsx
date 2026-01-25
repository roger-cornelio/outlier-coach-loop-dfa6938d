/**
 * AppSidebar - Navegação lateral compacta do aplicativo OUTLIER
 * 
 * SIDEBAR COMPACTA (apenas ícones):
 * - Dashboard (diagnóstico principal)
 * - Treino Semanal (agenda e plano)
 * - Ajustes de Treino (equipamentos)
 * - Status do Atleta (benchmarks)
 * - Configurações
 * - Logout (fixado na parte inferior)
 */

import { 
  LayoutDashboard, 
  Calendar, 
  Trophy,
  Settings,
  LogOut,
  Wrench
} from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import { useLogout } from '@/hooks/useLogout';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  title: string;
  view: string;
  icon: React.ElementType;
}

export function AppSidebar() {
  const { currentView, setCurrentView } = useOutlierStore();
  const { logout } = useLogout();

  const navItems: NavItem[] = [
    { 
      title: 'Dashboard', 
      view: 'dashboard', 
      icon: LayoutDashboard 
    },
    { 
      title: 'Treino Semanal', 
      view: 'weeklyTraining', 
      icon: Calendar
    },
    { 
      title: 'Ajustes de Treino', 
      view: 'equipmentAdjust', 
      icon: Wrench
    },
    { 
      title: 'Status do Atleta', 
      view: 'benchmarks', 
      icon: Trophy 
    },
    { 
      title: 'Configurações', 
      view: 'config', 
      icon: Settings 
    },
  ];

  const handleNavClick = (item: NavItem) => {
    setCurrentView(item.view as any);
  };

  const isActive = (item: NavItem) => {
    return currentView === item.view;
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className="h-screen w-24 bg-background border-r border-border/30 flex flex-col">
      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col items-center py-8 gap-2">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Tooltip key={item.view} delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "w-16 h-16 flex items-center justify-center rounded-xl transition-all duration-200",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "w-8 h-8",
                    active ? "text-primary" : "text-muted-foreground"
                  )} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.title}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Logout - Fixed at bottom */}
      <div className="py-6 flex flex-col items-center border-t border-border/30">
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={handleLogout}
              className="w-16 h-16 flex items-center justify-center rounded-xl transition-all duration-200 text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-8 h-8" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            Sair
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
