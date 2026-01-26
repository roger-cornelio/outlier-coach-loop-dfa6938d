/**
 * AppSidebar - Navegação lateral global do aplicativo OUTLIER
 * 
 * SEÇÕES:
 * - Dashboard (diagnóstico principal)
 * - Treino Semanal (agenda e plano)
 * - Status do Atleta (benchmarks)
 * - Configurações
 * - Logout
 */

import { 
  LayoutDashboard, 
  Calendar, 
  Trophy,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Apple,
  Stethoscope,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOutlierStore } from '@/store/outlierStore';
import { useLogout } from '@/hooks/useLogout';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';

interface NavItem {
  title: string;
  view?: string;
  route?: string;
  icon: React.ElementType;
  action?: () => void;
  isDestructive?: boolean;
}

export function AppSidebar() {
  const { currentView, setCurrentView } = useOutlierStore();
  const { state: sidebarState } = useSidebar();
  const { logout, isLoggingOut } = useLogout();
  const navigate = useNavigate();
  const isCollapsed = sidebarState === 'collapsed';

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
      title: 'Prova Alvo',
      route: '/prova-alvo',
      icon: Target
    },
    { 
      title: 'Nutrição', 
      route: '/nutricao', 
      icon: Apple
    },
    { 
      title: 'Medicina do Esporte', 
      route: '/medicina-do-esporte', 
      icon: Stethoscope
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
    if (item.action) {
      item.action();
    } else if (item.route) {
      navigate(item.route);
    } else if (item.view) {
      setCurrentView(item.view as any);
    }
  };

  const isActive = (item: NavItem) => {
    if (item.route) {
      return window.location.pathname === item.route;
    }
    return currentView === item.view;
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Sidebar 
      className={cn(
        "border-r border-border/50 bg-background/95 backdrop-blur-sm transition-all duration-300",
        isCollapsed ? "w-14" : "w-56"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-border/30">
        {!isCollapsed && (
          <OutlierWordmark size="sm" className="opacity-80" />
        )}
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isActive(item);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleNavClick(item)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                        active
                          ? "bg-primary/10 text-primary border-l-2 border-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                      tooltip={item.title}
                    >
                      <item.icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        active ? "text-primary" : "text-muted-foreground"
                      )} />
                      {!isCollapsed && (
                        <span className={cn(
                          "font-medium text-sm tracking-wide",
                          active ? "text-primary" : ""
                        )}>
                          {item.title}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border/30 space-y-2">
        {/* Logout Button */}
        <SidebarMenuButton
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-destructive hover:bg-destructive/10"
          tooltip="Sair"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && (
            <span className="font-medium text-sm tracking-wide">
              Sair
            </span>
          )}
        </SidebarMenuButton>

        {/* Collapse Toggle */}
        <SidebarTrigger className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          )}
        </SidebarTrigger>
      </SidebarFooter>
    </Sidebar>
  );
}
