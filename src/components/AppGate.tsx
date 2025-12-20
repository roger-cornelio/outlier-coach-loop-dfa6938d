/**
 * AppGate - SINGLE POINT of routing/rendering decisions
 * 
 * CRITICAL RULES:
 * 1. While loading: render ONLY a loader (no redirects, no fallbacks)
 * 2. ANON users: allowed on login routes, redirect to /login for protected routes
 * 3. SUPERADMIN: NEVER blocked, NEVER redirected, access to ALL routes
 * 4. Decisions based ONLY on user.role, not coach_application
 * 5. Context preservation: /login/admin → /painel-admin, /coach → coach flow
 * 
 * ROUTE STRUCTURE:
 * - /login: User login (anon allowed)
 * - /login/admin: Admin login (anon allowed, redirects admin to /painel-admin)
 * - /coach: Coach portal (anon allowed - has its own login)
 * - /painel-admin: Admin dashboard (requires admin role)
 * - /app: Main app (requires authentication)
 */

import { ReactNode } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';

interface AppGateProps {
  children: ReactNode;
}

export function AppGate({ children }: AppGateProps) {
  const location = useLocation();
  const { state, loading } = useAppState();
  const pathname = location.pathname;

  console.log('[AppGate] state:', state, '| pathname:', pathname, '| loading:', loading);

  // ===== RULE 1: While loading, ONLY show loader =====
  if (loading || state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // ===== RULE 2: ANON user handling =====
  if (state === 'anon') {
    // PUBLIC ROUTES: Allow anon users on all login entry points
    const isLoginRoute = pathname === '/login' || pathname === '/login/admin';
    const isCoachRoute = pathname === '/coach';
    
    if (isLoginRoute || isCoachRoute) {
      return <>{children}</>;
    }
    
    // PROTECTED ROUTES: Redirect to /login
    console.log('[AppGate] REDIRECT → /login | Reason: anon user on protected route:', pathname);
    return <Navigate to="/login" replace />;
  }

  // ===== RULE 3: SUPERADMIN has unrestricted access =====
  if (state === 'superadmin') {
    return <>{children}</>;
  }

  // ===== RULE 4: Authenticated user routing based on context =====

  // /login/admin - Admin login page
  // If already admin → go to /painel-admin
  // If not admin → show access denied (Auth component handles this)
  if (pathname === '/login/admin') {
    if (state === 'admin') {
      console.log('[AppGate] REDIRECT /login/admin → /painel-admin | Reason: already admin');
      return <Navigate to="/painel-admin" replace />;
    }
    // Let Auth component handle non-admin case (shows access denied)
    return <>{children}</>;
  }

  // /login - User login page
  // Redirect authenticated users to their appropriate destination
  if (pathname === '/login') {
    if (state === 'admin') {
      console.log('[AppGate] REDIRECT /login → /painel-admin | Reason: admin user');
      return <Navigate to="/painel-admin" replace />;
    }
    if (state === 'coach') {
      console.log('[AppGate] REDIRECT /login → /coach | Reason: coach user');
      return <Navigate to="/coach" replace />;
    }
    // Athlete - go to main app
    console.log('[AppGate] REDIRECT /login → /app | Reason: authenticated athlete');
    return <Navigate to="/app" replace />;
  }

  // /painel-admin - requires admin role
  if (pathname.startsWith('/painel-admin')) {
    if (state !== 'admin') {
      console.log('[AppGate] BLOCKED /painel-admin | Reason: not admin, state:', state);
      // Show access denied inline, don't redirect to generic login
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
          <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl text-center max-w-md">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl text-foreground mb-4">Acesso Restrito</h1>
            <p className="text-muted-foreground mb-6">
              Você não possui permissão de administrador para acessar este painel.
            </p>
            <a
              href="/login/admin"
              className="inline-block w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
            >
              Voltar ao login admin
            </a>
          </div>
        </div>
      );
    }
    // Admin user - allow access
    return <>{children}</>;
  }

  // /coach - let CoachPortal handle its own state-based rendering
  // NO automatic redirect for authenticated users - coach portal manages this

  // /app - main application (requires authentication, already verified)
  
  // ===== RULE 5: Render children for all other cases =====
  return <>{children}</>;
}
