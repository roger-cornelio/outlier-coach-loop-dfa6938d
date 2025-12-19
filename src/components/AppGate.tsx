/**
 * AppGate - SINGLE POINT of routing/rendering decisions
 * 
 * RULES:
 * 1. While loading: render ONLY a loader (no redirects, no fallbacks)
 * 2. Redirect ONLY when anon user tries to access protected route
 * 3. Authenticated user on /coach: NEVER redirect to "/", render appropriate screen
 * 4. Admin/Superadmin: render or allow access to /admin
 * 
 * Pages become "dumb" - they just render based on state, no navigation logic.
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

  // ===== RULE 2: Redirect logic (ONLY for anon users) =====
  
  // /admin route - requires admin role
  if (pathname.startsWith('/admin')) {
    if (state === 'anon') {
      console.log('[AppGate] REDIRECT /admin → /auth | Reason: anon user');
      return <Navigate to="/auth" replace />;
    }
    if (state !== 'admin') {
      // Authenticated but not admin - go to home
      console.log('[AppGate] REDIRECT /admin → / | Reason: not admin');
      return <Navigate to="/" replace />;
    }
    // Admin user - allow access
  }

  // /coach route - NEVER redirect authenticated users to "/"
  // Let the CoachPortal page handle rendering based on state
  if (pathname.startsWith('/coach')) {
    // Anon users can access /coach (it shows login form)
    // Authenticated users stay on /coach and see appropriate screen
    // NO REDIRECT TO "/" FOR AUTHENTICATED USERS
  }

  // / (index) route - requires auth (except welcome screen handled internally)
  if (pathname === '/') {
    // Let Index page handle welcome screen for anon users
    // It will redirect to /auth if needed
  }

  // /auth route
  if (pathname === '/auth') {
    // If already authenticated, redirect to appropriate place
    if (state !== 'anon') {
      if (state === 'admin') {
        console.log('[AppGate] REDIRECT /auth → /admin | Reason: admin user');
        return <Navigate to="/admin" replace />;
      }
      console.log('[AppGate] REDIRECT /auth → / | Reason: authenticated user');
      return <Navigate to="/" replace />;
    }
  }

  // ===== RULE 3: Render children (pages handle their own state-based rendering) =====
  return <>{children}</>;
}
