/**
 * MobileNav - Menu mobile hamburger para navegação no OUTLIER
 * 
 * REGRAS:
 * - Visível APENAS em telas < 768px (mobile)
 * - Reaproveita EXATAMENTE a mesma navegação da AppSidebar
 * - NÃO duplica rotas ou lógica
 * - Apenas uma "casca visual" alternativa para mobile
 */

import { useState } from 'react';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Calendar, 
  Trophy, 
  Settings, 
  LogOut,
  Loader2
} from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import { useLogout } from '@/hooks/useLogout';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';

interface NavItem {
  title: string;
  view: string;
  icon: React.ElementType;
}

// MESMOS ITENS DA SIDEBAR - ÚNICA FONTE DE VERDADE
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

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { currentView, setCurrentView } = useOutlierStore();
  const { logout, isLoggingOut } = useLogout();

  // Só renderiza em mobile
  if (!isMobile) return null;

  const handleNavClick = (view: string) => {
    setCurrentView(view as any);
    setIsOpen(false); // Fecha o menu após navegar
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  const isActive = (view: string) => currentView === view;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </Button>
      </SheetTrigger>

      <SheetContent 
        side="left" 
        className="w-72 bg-background border-r border-border/50 p-0"
      >
        {/* Header do Menu */}
        <SheetHeader className="p-6 border-b border-border/30">
          <div className="flex items-center justify-between">
            <OutlierWordmark size="sm" className="opacity-80" />
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          </div>
        </SheetHeader>

        {/* Lista de Navegação */}
        <nav className="flex-1 py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.view);
              return (
                <li key={item.view}>
                  <button
                    onClick={() => handleNavClick(item.view)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                      active
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn(
                      "w-5 h-5 flex-shrink-0",
                      active ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "font-medium text-sm tracking-wide",
                      active ? "text-primary" : ""
                    )}>
                      {item.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer com Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/30">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-medium text-sm tracking-wide">
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
