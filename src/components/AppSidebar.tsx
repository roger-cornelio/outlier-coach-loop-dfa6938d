/**
 * AppSidebar - Navegação global da OUTLIER
 * 
 * Itens:
 * 1. Dashboard
 * 2. Treino Semanal
 * 3. Ajustes de Treino
 * 4. Status do Atleta
 * 5. Configurações
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Wrench, 
  Trophy, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';
import { cn } from '@/lib/utils';

/**
 * Navegação da sidebar mapeia para as telas RICAS existentes do produto.
 * Cada rota aponta para componentes já consolidados, não stubs simplificados.
 */
const navItems = [
  { 
    title: 'Dashboard', 
    path: '/app', 
    icon: LayoutDashboard,
    description: 'Visão geral e diagnóstico'
  },
  { 
    title: 'Treino Semanal', 
    path: '/app/treino', 
    icon: Calendar,
    description: 'Prescrição da semana'
  },
  { 
    title: 'Ajustes de Treino', 
    path: '/app/ajustes', 
    icon: Wrench,
    description: 'Equipamentos e adaptações'
  },
  { 
    title: 'Status do Atleta', 
    path: '/app/status', 
    icon: Trophy,
    description: 'Nível e categoria HYROX'
  },
  { 
    title: 'Configurações', 
    path: '/app/config', 
    icon: Settings,
    description: 'Conta e preferências'
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar 
      className={cn(
        "border-r border-border bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      {/* Header com Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-border",
        isCollapsed && "justify-center px-2"
      )}>
        {!isCollapsed && <OutlierWordmark size="sm" />}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">O</span>
          </div>
        )}
      </div>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
                        "hover:bg-muted",
                        active && "bg-primary/10 text-primary border-l-2 border-primary",
                        !active && "text-muted-foreground",
                        isCollapsed && "justify-center px-2"
                      )}
                      tooltip={isCollapsed ? item.title : undefined}
                    >
                      <item.icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        active && "text-primary"
                      )} />
                      {!isCollapsed && (
                        <div className="flex flex-col items-start">
                          <span className={cn(
                            "text-sm font-medium",
                            active && "font-semibold"
                          )}>
                            {item.title}
                          </span>
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Toggle Button */}
      <div className="mt-auto border-t border-border p-2">
        <SidebarTrigger className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Recolher</span>
            </>
          )}
        </SidebarTrigger>
      </div>
    </Sidebar>
  );
}
