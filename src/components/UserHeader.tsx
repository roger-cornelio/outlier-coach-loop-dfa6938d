import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import { LogOut, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserHeaderProps {
  showLogout?: boolean;
  className?: string;
}

export function UserHeader({ showLogout = true, className = '' }: UserHeaderProps) {
  const { user, profile, role, signOut } = useAuth();
  const { setCurrentView } = useOutlierStore();
  const navigate = useNavigate();

  if (!user) return null;

  const displayName = profile?.name || profile?.email || user.email || 'Usuário';
  
  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    coach: 'Coach',
    user: 'Atleta',
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentView('welcome');
    navigate('/');
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
            {displayName}
          </span>
          <Badge variant="outline" className="text-xs w-fit px-1.5 py-0">
            {roleLabels[role] || role}
          </Badge>
        </div>
      </div>
      
      {showLogout && (
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      )}
    </div>
  );
}
