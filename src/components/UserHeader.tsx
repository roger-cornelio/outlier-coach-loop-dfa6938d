import { useAuth } from '@/hooks/useAuth';
import { useLogout } from '@/hooks/useLogout';
import { useOutlierStore } from '@/store/outlierStore';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { LogOut, Settings, UserCircle, ChevronDown, Loader2 } from 'lucide-react';
import { LEVEL_NAMES, type AthleteStatus } from '@/types/outlier';
import { UserAvatar } from './UserAvatar';
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

  const displayName = profile?.name || profile?.email?.split('@')[0] || 'Usuário';
  const roleLabel = roleLabels[role] || 'Atleta';
  const levelLabel = getLevelName(athleteStatus);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 px-3 py-2 rounded-xl bg-card/50 border border-border/30 hover:bg-card/80 hover:border-border/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20">
            {/* Avatar automático baseado em sexo e nível */}
            <UserAvatar
              name={displayName}
              gender={athleteConfig?.sexo}
              trainingLevel={athleteConfig?.trainingLevel}
              athleteStatus={athleteStatus}
              size="md"
              showGlow
            />
            
            {/* Identity Block */}
            <div className="flex flex-col items-start text-left min-w-0">
              <span className="font-semibold text-foreground text-sm truncate max-w-[140px]">
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground">
                {roleLabel} • Nível {levelLabel}
              </span>
            </div>

            {/* Dropdown indicator */}
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-card border border-border shadow-xl z-50"
          sideOffset={8}
        >
          {/* Header with user info */}
          <DropdownMenuLabel className="py-3">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-foreground truncate">
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                {profile?.email || user.email}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {roleLabel}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  {levelLabel}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

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