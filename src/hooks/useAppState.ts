/**
 * useAppState - SINGLE SOURCE OF TRUTH for app state resolution
 * 
 * CRITICAL RULES:
 * 1. All access decisions depend ONLY on user.role from user_roles table
 * 2. coach_application is ONLY for administrative flow and UI, NOT permissions
 * 3. Roles: user (athlete), coach, admin, superadmin
 * 4. Every user starts as "user" (athlete)
 * 5. superadmin is NEVER blocked, NEVER redirected
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCoachApplication } from './useCoachApplication';

// AppUserState based ONLY on role (not application status)
export type AppUserState = 
  | 'loading'           // Auth/roles still resolving
  | 'anon'              // Not authenticated
  | 'athlete'           // Authenticated, role = user (no coach role)
  | 'coach'             // Authenticated, role = coach
  | 'admin'             // Authenticated, role = admin
  | 'superadmin';       // Authenticated, role = superadmin (NEVER blocked)

export interface AppState {
  state: AppUserState;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCoach: boolean;
  canManageWorkouts: boolean;
  /** Flags de carregamento do perfil (para decidir onboarding sem flicker) */
  profileLoading: boolean;
  profileLoaded: boolean;
  // Application status is ONLY for UI display, NOT for access control
  applicationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  user: ReturnType<typeof useAuth>['user'];
  profile: ReturnType<typeof useAuth>['profile'];
  role: ReturnType<typeof useAuth>['role'];
}

export function useAppState(): AppState {
  const auth = useAuth();
  const { status: appStatus, loading: appLoading } = useCoachApplication();

  // CRITICAL: Loading if auth is loading
  // Application loading is separate - we don't block rendering for it
  const loading = auth.loading;

  const state = useMemo<AppUserState>(() => {
    // LOADING: Never decide until auth is fully resolved
    if (auth.loading) {
      return 'loading';
    }

    // ANON: No authenticated user
    if (!auth.user) {
      return 'anon';
    }

    // ===== STATE BASED ONLY ON ROLE =====
    
    // SUPERADMIN: Highest priority, NEVER blocked
    if (auth.isSuperAdmin) {
      return 'superadmin';
    }

    // ADMIN: Has admin role
    if (auth.isAdmin) {
      return 'admin';
    }

    // COACH: Has coach role
    if (auth.isCoach) {
      return 'coach';
    }

    // ATHLETE: Default for authenticated users without special roles
    // This is the "user" role in the database
    return 'athlete';
  }, [auth.loading, auth.user, auth.isSuperAdmin, auth.isAdmin, auth.isCoach]);

  return {
    state,
    loading,
    isAuthenticated: !!auth.user,
    isAdmin: auth.isAdmin,
    isSuperAdmin: auth.isSuperAdmin,
    isCoach: auth.isCoach,
    canManageWorkouts: auth.canManageWorkouts,
    profileLoading: auth.profileLoading,
    profileLoaded: auth.profileLoaded,
    // Application status is ONLY for UI display
    applicationStatus: appStatus,
    user: auth.user,
    profile: auth.profile,
    role: auth.role,
  };
}
