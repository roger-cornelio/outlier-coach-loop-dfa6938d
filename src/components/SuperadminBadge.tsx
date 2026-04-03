import { useAuth } from '@/hooks/useAuth';
import { Shield } from 'lucide-react';

export function SuperadminBadge() {
  const { isSuperAdmin, user } = useAuth();

  if (!isSuperAdmin || !user) return null;

  return (
    <div className="fixed top-2 right-2 z-[9999] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-xs font-bold shadow-lg backdrop-blur-sm border border-primary/50 pointer-events-none select-none">
      <Shield className="w-3.5 h-3.5" />
      <span>SUPERADMIN</span>
    </div>
  );
}
