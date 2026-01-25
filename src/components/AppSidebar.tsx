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
  LogOut
} from 'lucide-react';
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
  view: string;
  icon: React.ElementType;
  action?: () => void;
  isDestructive?: boolean;
}

export function AppSidebar() {
  const { currentView, setCurrentView } = useOutlierStore();
  const { state: sidebarState } = useSidebar();
  const { logout, isLoggingOut } = useLogout();
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
    } else {
      setCurrentView(item.view as any);
    }
  };

  const isActive = (item: NavItem) => {
    return currentView === item.view;
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Sidebar 
      className={cn(
        "border-r border-border/50 bg-background/95 backdrop-blur-sm transition-all duration-300",
        isCollapsed ? "w-20" : "w-80"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="p-6 border-b border-border/30">
        {!isCollapsed && (
          <OutlierWordmark size="lg" className="opacity-80" />
        )}
      </SidebarHeader>

      <SidebarContent className="py-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isActive(item);
                return (
                  <SidebarMenuItem key={item.view}>
                    <SidebarMenuButton
                      onClick={() => handleNavClick(item)}
                      className={cn(
                        "w-full flex items-center gap-4 px-4 py-3.5 rounded-lg transition-all duration-200",
                        active
                          ? "bg-primary/10 text-primary border-l-3 border-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                      tooltip={item.title}
                    >
                      <item.icon className={cn(
                        "w-7 h-7 flex-shrink-0",
                        active ? "text-primary" : "text-muted-foreground"
                      )} />
                      {!isCollapsed && (
                        <span className={cn(
                          "font-medium text-lg tracking-wide",
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

      <SidebarFooter className="p-3 border-t border-border/30 space-y-3">
        {/* Logout Button */}
        <SidebarMenuButton
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3.5 rounded-lg transition-all duration-200 text-destructive hover:bg-destructive/10"
          tooltip="Sair"
        >
          <LogOut className="w-7 h-7 flex-shrink-0" />
          {!isCollapsed && (
            <span className="font-medium text-lg tracking-wide">
              Sair
            </span>
          )}
        </SidebarMenuButton>

        {/* Collapse Toggle */}
        <SidebarTrigger className="w-full flex items-center justify-center p-3 rounded-lg hover:bg-muted/50 transition-colors">
          {isCollapsed ? (
            <ChevronRight className="w-6 h-6 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-6 h-6 text-muted-foreground" />
          )}
        </SidebarTrigger>
      </SidebarFooter>
    </Sidebar>
  );
}
