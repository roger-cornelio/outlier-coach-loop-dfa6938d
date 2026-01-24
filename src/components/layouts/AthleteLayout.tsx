/**
 * AthleteLayout - Layout principal com sidebar para atletas
 * 
 * Envolve todas as telas da área /app com:
 * - Sidebar de navegação global
 * - Header com informações do usuário
 * - Container para conteúdo
 */

import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { UserHeader } from '@/components/UserHeader';
import { AthleteViewSelector } from '@/components/AthleteViewSelector';
import { useAppState } from '@/hooks/useAppState';

export function AthleteLayout() {
  const { state } = useAppState();
  const isAdminViewing = state === 'admin' || state === 'superadmin';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header fixo */}
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-4">
                {/* Admin: Seletor de atleta para visualização */}
                {isAdminViewing && <AthleteViewSelector />}
              </div>
              <UserHeader showLogout={true} />
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
