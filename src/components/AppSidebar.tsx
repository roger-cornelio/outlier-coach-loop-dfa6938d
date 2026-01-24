import { useState } from "react";
import { Calendar, Wrench, Menu } from "lucide-react";
import { useOutlierStore } from "@/store/outlierStore";
import { EquipmentAdaptModal } from "./EquipmentAdaptModal";
import { toast } from "sonner";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

function SidebarMenuContent() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  
  const { 
    athleteConfig, 
    baseWorkouts 
  } = useOutlierStore();
  
  const [isAdaptModalOpen, setIsAdaptModalOpen] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);
  
  const savedUnavailableEquipment = athleteConfig?.unavailableEquipment || [];
  const hasAdaptations = savedUnavailableEquipment.length > 0;
  const hasAnyWorkouts = baseWorkouts.length > 0;

  const handleSaveEquipmentAdaptations = (unavailableEquipment: string[]) => {
    if (athleteConfig) {
      const { setAthleteConfig } = useOutlierStore.getState();
      setAthleteConfig({
        ...athleteConfig,
        unavailableEquipment,
      });
    }
    
    if (unavailableEquipment.length > 0) {
      toast.success('Treino ajustado conforme sua realidade de hoje', { duration: 3000 });
    } else {
      toast.success('Adaptações removidas.', { duration: 3000 });
    }
  };

  // Disparar evento para o Dashboard alternar a visão semanal
  const handleToggleWeeklyView = () => {
    setShowDetailedView(!showDetailedView);
    // Disparar evento customizado para o Dashboard escutar
    window.dispatchEvent(new CustomEvent('sidebar:toggleWeeklyView', { detail: { show: !showDetailedView } }));
  };

  return (
    <>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Ver treino semanal */}
              {hasAnyWorkouts && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={handleToggleWeeklyView}
                    tooltip="Ver treino semanal"
                    className="hover:bg-sidebar-accent"
                  >
                    <Calendar className="h-5 w-5" />
                    {!collapsed && (
                      <span className="font-display text-sm tracking-wide">
                        {showDetailedView ? 'FECHAR VISÃO SEMANAL' : 'VER TREINO SEMANAL'}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Ajustar treino para o meu box */}
              {hasAnyWorkouts && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setIsAdaptModalOpen(true)}
                    tooltip="Ajustar treino para o meu box"
                    className={hasAdaptations 
                      ? "text-primary hover:bg-primary/20" 
                      : "hover:bg-sidebar-accent"
                    }
                  >
                    <Wrench className="h-5 w-5" />
                    {!collapsed && (
                      <span className="font-display text-sm tracking-wide">
                        {hasAdaptations 
                          ? `EQUIPAMENTOS (${savedUnavailableEquipment.length})`
                          : 'AJUSTAR TREINO'
                        }
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Equipment Adapt Modal */}
      <EquipmentAdaptModal
        isOpen={isAdaptModalOpen}
        onClose={() => setIsAdaptModalOpen(false)}
        onApply={handleSaveEquipmentAdaptations}
        initialSelection={savedUnavailableEquipment}
      />
    </>
  );
}

interface AppSidebarProps {
  children: React.ReactNode;
}

export function AppSidebar({ children }: AppSidebarProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        {/* Trigger fixo no canto superior esquerdo */}
        <div className="fixed top-4 left-4 z-[60]">
          <SidebarTrigger className="p-2 rounded-lg bg-sidebar hover:bg-sidebar-accent border border-sidebar-border transition-colors">
            <Menu className="h-5 w-5 text-sidebar-foreground" />
          </SidebarTrigger>
        </div>

        <Sidebar 
          className="border-r border-sidebar-border bg-sidebar"
          collapsible="offcanvas"
        >
          <SidebarMenuContent />
        </Sidebar>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
