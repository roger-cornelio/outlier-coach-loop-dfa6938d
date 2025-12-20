/**
 * AppGate - SINGLE POINT of routing/rendering decisions
 * 
 * ROTAS OFICIAIS (entry points):
 * - /login: Login usuário/atleta
 * - /login/coach: Login coach (tela dedicada)
 * - /login/admin: Login admin
 * 
 * DESTINOS (pós-login, protegidos):
 * - /app: App principal (requer auth, BLOQUEADO para coach)
 * - /painel-admin: Dashboard admin (requer role admin)
 * - /coach/dashboard: Dashboard coach (requer role coach)
 * 
 * REDIRECTS (aliases):
 * - /, /auth, /longin → /login
 * - /coach → /coach/dashboard
 */

import { ReactNode } from 'react';
import { useLocation, Navigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';

interface AppGateProps {
  children: ReactNode;
}

export function AppGate({ children }: AppGateProps) {
  const location = useLocation();
  const { state, loading, profileLoading } = useAppState();
  const pathname = location.pathname;

  console.log('[AppGate] state:', state, '| pathname:', pathname, '| loading:', loading, '| profileLoading:', profileLoading);

  // ===== RULE 1: While loading (auth OR profile), ONLY show loader =====
  if (loading || profileLoading || state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // ===== RULE 2: ANON user handling =====
  if (state === 'anon') {
    // PUBLIC ROUTES: Allow anon users on all login entry points + coach set password
    const isPublicRoute = 
      pathname === '/login' || 
      pathname === '/login/admin' || 
      pathname === '/login/coach' ||
      pathname === '/coach/definir-senha';
    
    if (isPublicRoute) {
      return <>{children}</>;
    }
    
    // PROTECTED ROUTE: /painel-admin → redirect to /login/admin (not generic /login)
    if (pathname.startsWith('/painel-admin')) {
      console.log('[AppGate] REDIRECT → /login/admin | Reason: anon user on admin route');
      return <Navigate to="/login/admin" replace />;
    }
    
    // PROTECTED ROUTE: /coach/* → redirect to /login/coach
    if (pathname.startsWith('/coach')) {
      console.log('[AppGate] REDIRECT → /login/coach | Reason: anon user on coach route');
      return <Navigate to="/login/coach" replace />;
    }
    
    // OTHER PROTECTED ROUTES: Redirect to /login
    console.log('[AppGate] REDIRECT → /login | Reason: anon user on protected route:', pathname);
    return <Navigate to="/login" replace />;
  }

  // ===== RULE 3: SUPERADMIN has unrestricted access =====
  if (state === 'superadmin') {
    return <>{children}</>;
  }

  // ===== RULE 4: Authenticated user routing based on context =====

  // /login/coach - Coach login page
  // If already coach → go to /coach/dashboard
  // Otherwise let CoachAuth handle the flow (it manages its own states)
  if (pathname === '/login/coach') {
    if (state === 'coach') {
      console.log('[AppGate] REDIRECT /login/coach → /coach/dashboard | Reason: already coach');
      return <Navigate to="/coach/dashboard" replace />;
    }
    // CoachAuth handles everything: login, contact modal, set password
    return <>{children}</>;
  }

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
      console.log('[AppGate] REDIRECT /login → /coach/dashboard | Reason: coach user');
      return <Navigate to="/coach/dashboard" replace />;
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
            <Link
              to="/login/admin"
              className="inline-block w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
            >
              Voltar ao login admin
            </Link>
          </div>
        </div>
      );
    }
    // Admin user - allow access
    return <>{children}</>;
  }

  // /coach routes - requires coach role
  if (pathname.startsWith('/coach')) {
    if (state !== 'coach') {
      console.log('[AppGate] BLOCKED /coach/* | Reason: not coach, state:', state);
      // Redirect to /login/coach with message
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
          <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl text-center max-w-md">
            <div className="w-16 h-16 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl text-foreground mb-4">Área de Coach</h1>
            <p className="text-muted-foreground mb-6">
              Esta área é restrita para coaches. Faça login com uma conta de coach ou volte para a área de atleta.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/login/coach"
                className="inline-block w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
              >
                Entrar como Coach
              </Link>
              <Link
                to="/app"
                className="text-muted-foreground hover:text-primary text-sm transition-colors"
              >
                Voltar para área de atleta
              </Link>
            </div>
          </div>
        </div>
      );
    }
    // Coach user - allow access
    return <>{children}</>;
  }

  // ===== RULE 5: COACH cannot access athlete routes (/app) =====
  // If coach tries to access /app, redirect to /coach/dashboard
  if (pathname === '/app' && state === 'coach') {
    console.log('[AppGate] REDIRECT /app → /coach/dashboard | Reason: coach cannot access athlete app');
    return <Navigate to="/coach/dashboard" replace />;
  }

  // /app - main application (requires authentication, already verified above)
  
  // ===== RULE 6: Render children for all other cases =====
  return <>{children}</>;
}
