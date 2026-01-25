/**
 * AppSidebar - Navegação lateral compacta do aplicativo OUTLIER
 * 
 * SIDEBAR COMPACTA (apenas ícones) com opção de expansão:
 * - Dashboard (diagnóstico principal)
 * - Treino Semanal (agenda e plano)
 * - Ajustes de Treino (equipamentos)
 * - Status do Atleta (benchmarks)
 * - Configurações
 * - Logout (fixado na parte inferior)
 */

import { useState } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Trophy,
  Settings,
  LogOut,
  Wrench,
  ChevronLeft,
  ChevronRight
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
  const [isExpanded, setIsExpanded] = useState(false);
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

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <aside className={cn(
      "h-screen bg-background border-r border-border/30 flex flex-col transition-all duration-300",
      isExpanded ? "w-56" : "w-24"
    )}>
      {/* Toggle Button */}
      <div className="flex justify-end p-3">
        <button
          onClick={toggleExpand}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          {isExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col items-center py-4 gap-2 px-2">
        {navItems.map((item) => {
          const active = isActive(item);
          
          const buttonContent = (
            <button
              onClick={() => handleNavClick(item)}
              className={cn(
                "flex items-center rounded-xl transition-all duration-200",
                isExpanded ? "w-full px-4 py-3 gap-3" : "w-16 h-16 justify-center",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "w-7 h-7 flex-shrink-0",
                active ? "text-primary" : "text-muted-foreground"
              )} />
              {isExpanded && (
                <span className={cn(
                  "text-sm font-medium truncate",
                  active ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.title}
                </span>
              )}
            </button>
          );

          if (isExpanded) {
            return <div key={item.view} className="w-full">{buttonContent}</div>;
          }

          return (
            <Tooltip key={item.view} delayDuration={300}>
              <TooltipTrigger asChild>
                {buttonContent}
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.title}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Logout - Fixed at bottom */}
      <div className="py-6 flex flex-col items-center border-t border-border/30 px-2">
        {isExpanded ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-7 h-7 flex-shrink-0" />
            <span className="text-sm font-medium">Sair</span>
          </button>
        ) : (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="w-16 h-16 flex items-center justify-center rounded-xl transition-all duration-200 text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-7 h-7" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Sair
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}