/**
 * AppGate - SINGLE POINT of routing/rendering decisions
 * 
 * CRITICAL RULES:
 * 1. While loading: render ONLY a loader (no redirects, no fallbacks)
 * 2. ANON users: ALWAYS redirect to /auth (except /auth and /coach routes)
 * 3. SUPERADMIN: NEVER blocked, NEVER redirected, access to ALL routes
 * 4. Decisions based ONLY on user.role, not coach_application
 * 5. No implicit redirects for authenticated users
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
  // CRITICAL: No redirects, no decisions, no rendering routes
  if (loading || state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // ===== RULE 2: ANON users MUST see login first =====
  // Redirect anon users to /login for ALL routes except login routes and /coach
  if (state === 'anon') {
    // /auth or /login routes - allow anon users
    if (pathname === '/auth' || pathname.startsWith('/login')) {
      return <>{children}</>;
    }
    
    // /coach route - allow anon users (shows login form within)
    if (pathname.startsWith('/coach')) {
      return <>{children}</>;
    }
    
    // ALL OTHER ROUTES: redirect to /login
    console.log('[AppGate] REDIRECT → /login | Reason: anon user on protected route:', pathname);
    return <Navigate to="/login" replace />;
  }

  // ===== RULE 3: SUPERADMIN is NEVER blocked, NEVER redirected =====
  if (state === 'superadmin') {
    // Superadmin has access to ALL routes without any restrictions
    return <>{children}</>;
  }

  // ===== RULE 4: Route-based access control for authenticated users =====
  
  // /admin route - requires admin or superadmin role
  if (pathname.startsWith('/admin')) {
    if (state !== 'admin') {
      // Authenticated but not admin - go to home
      console.log('[AppGate] REDIRECT /admin → / | Reason: not admin');
      return <Navigate to="/" replace />;
    }
    // Admin user - allow access
  }

  // /auth and /login routes - redirect authenticated users away
  if (pathname === '/auth' || pathname === '/login') {
    if (state === 'admin') {
      console.log('[AppGate] REDIRECT /auth → /admin | Reason: admin user');
      return <Navigate to="/admin" replace />;
    }
    console.log('[AppGate] REDIRECT /auth → / | Reason: authenticated user');
    return <Navigate to="/" replace />;
  }
  
  // /login/admin - redirect authenticated admins to /admin, block non-admins
  if (pathname === '/login/admin') {
    if (state === 'admin') {
      console.log('[AppGate] REDIRECT /login/admin → /admin | Reason: already admin');
      return <Navigate to="/admin" replace />;
    }
    // Non-admin authenticated users - let Auth page handle access denied
    return <>{children}</>;
  }
  
  // /login/coach - redirect authenticated coaches to /coach
  if (pathname === '/login/coach') {
    // Let Auth page handle the redirect after checking coach status
    return <>{children}</>;
  }

  // /coach route - let CoachPortal handle rendering based on role
  // NO REDIRECT TO "/" FOR AUTHENTICATED USERS

  // ===== RULE 5: Render children (pages handle their own state-based rendering) =====
  return <>{children}</>;
}
