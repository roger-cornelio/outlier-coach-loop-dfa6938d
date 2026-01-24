/**
 * AthleteLayout - Layout principal com sidebar para atletas
 * 
 * Envolve todas as telas da área /app com:
 * - Sidebar de navegação global (esquerda)
 * - Header simplificado (apenas identidade do usuário)
 * - Container para conteúdo
 * 
 * A sidebar agora contém:
 * - Navegação principal (Dashboard, Treino, Ajustes, Status, Config)
 * - Botão de logout
 */

import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AthleteViewSelector } from '@/components/AthleteViewSelector';
import { useAppState } from '@/hooks/useAppState';
import { useAuth } from '@/hooks/useAuth';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useOutlierStore } from '@/store/outlierStore';
import { UserAvatar } from '@/components/UserAvatar';
import { AthleteStatusBadge } from '@/components/AthleteStatusAvatar';

export function AthleteLayout() {
  const { state } = useAppState();
  const { profile } = useAuth();
  const { athleteConfig } = useOutlierStore();
  const { status: athleteStatus } = useAthleteStatus();
  const isAdminViewing = state === 'admin' || state === 'superadmin';

  const displayName = profile?.name || profile?.email?.split('@')[0] || 'Usuário';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header simplificado - apenas identidade */}
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-4">
                {/* Admin: Seletor de atleta para visualização */}
                {isAdminViewing && <AthleteViewSelector />}
              </div>
              
              {/* Identidade do usuário (simplificado - sem dropdown) */}
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={displayName}
                  gender={athleteConfig?.sexo}
                  trainingLevel={athleteConfig?.trainingLevel}
                  athleteStatus={athleteStatus}
                  size="md"
                  showGlow
                />
                <div className="flex flex-col items-start text-left min-w-0">
                  <span className="font-semibold text-foreground text-sm truncate max-w-[140px]">
                    {displayName}
                  </span>
                  <AthleteStatusBadge status={athleteStatus} size="sm" />
                </div>
              </div>
            </div>
          </header>

          {/* Conteúdo principal */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
