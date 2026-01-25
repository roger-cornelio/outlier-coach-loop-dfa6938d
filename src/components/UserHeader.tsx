import { useAuth } from '@/hooks/useAuth';
import { useLogout } from '@/hooks/useLogout';
import { useOutlierStore } from '@/store/outlierStore';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { LogOut, Settings, UserCircle, ChevronDown, Loader2 } from 'lucide-react';
import { LEVEL_NAMES, type AthleteStatus } from '@/types/outlier';
import { UserAvatar } from './UserAvatar';
import { AthleteStatusBadge } from './AthleteStatusAvatar';
import { getDisplayName } from '@/utils/displayName';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserHeaderProps {
  showLogout?: boolean;
  className?: string;
}

export function UserHeader({ showLogout = true, className = '' }: UserHeaderProps) {
  const { user, profile, role } = useAuth();
  const { logout, isLoggingOut } = useLogout();
  const { setCurrentView, athleteConfig } = useOutlierStore();
  const { status: athleteStatus } = useAthleteStatus();

  if (!user) return null;

  const roleLabels: Record<string, string> = {
    superadmin: 'SuperAdmin',
    admin: 'Admin',
    coach: 'Coach',
    user: 'Atleta',
  };

  // Get human-readable level name
  const getLevelName = (status: AthleteStatus): string => {
    return LEVEL_NAMES[status] || 'Iniciante';
  };

  const handleLogout = () => {
    logout();
  };

  const handleProfile = () => {
    setCurrentView('config');
  };

  const handleSettings = () => {
    setCurrentView('config');
  };

  const displayName = getDisplayName(profile);
  const roleLabel = roleLabels[role] || 'Atleta';
  const levelLabel = getLevelName(athleteStatus);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-2 rounded-lg hover:bg-card/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-card border border-border shadow-xl z-50"
          sideOffset={8}
        >
          {/* Menu Options */}
          <DropdownMenuItem 
            onClick={handleProfile}
            className="cursor-pointer py-2.5"
          >
            <UserCircle className="w-4 h-4 mr-2" />
            <span>Perfil</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={handleSettings}
            className="cursor-pointer py-2.5"
          >
            <Settings className="w-4 h-4 mr-2" />
            <span>Configurações</span>
          </DropdownMenuItem>

          {showLogout && (
            <>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="cursor-pointer py-2.5 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                <span>{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}