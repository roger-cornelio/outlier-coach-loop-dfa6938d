/**
 * AppSidebar - Navegação lateral global do aplicativo OUTLIER
 * 
 * SEÇÕES:
 * - Dashboard (diagnóstico principal)
 * - Treino Semanal (agenda e plano)
 * - Ajustes de Treino (equipamentos)
 * - Status do Atleta (benchmarks)
 * - Configurações
 */

import { 
  LayoutDashboard, 
  Calendar, 
  Wrench, 
  Trophy,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
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
}

interface AppSidebarProps {
  onOpenEquipmentModal?: () => void;
}

export function AppSidebar({ onOpenEquipmentModal }: AppSidebarProps) {
  const { currentView, setCurrentView } = useOutlierStore();
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === 'collapsed';

  const navItems: NavItem[] = [
    { 
      title: 'Dashboard', 
      view: 'dashboard', 
      icon: LayoutDashboard 
    },
    { 
      title: 'Treino Semanal', 
      view: 'weekly-training', 
      icon: Calendar,
      action: () => {
        // Abre o dashboard e expande a visão semanal
        setCurrentView('dashboard');
        // Disparar evento customizado para expandir a visão semanal
        window.dispatchEvent(new CustomEvent('outlier:expand-weekly-view'));
      }
    },
    { 
      title: 'Ajustes de Treino', 
      view: 'equipment-adjust', 
      icon: Wrench,
      action: () => {
        // Abre o modal de equipamentos diretamente
        onOpenEquipmentModal?.();
      }
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
    if (item.view === 'weekly-training') {
      return currentView === 'dashboard'; // Highlight when on dashboard
    }
    if (item.view === 'equipment-adjust') {
      return false; // Never highlight - it's a modal action
    }
    return currentView === item.view;
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
                  <SidebarMenuItem key={item.view}>
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

      <SidebarFooter className="p-2 border-t border-border/30">
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
