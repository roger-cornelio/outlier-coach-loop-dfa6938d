/**
 * useAppState - SINGLE SOURCE OF TRUTH for app state resolution
 * 
 * Centralizes: auth session, roles, coach_application status
 * Exposes ONE unified state that all routing decisions depend on.
 */

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useCoachApplication } from './useCoachApplication';

export type AppUserState = 
  | 'loading'           // Auth/roles/application still resolving
  | 'anon'              // Not authenticated
  | 'athlete'           // Authenticated, no coach application, regular user
  | 'coach_pending'     // Authenticated, application pending
  | 'coach_rejected'    // Authenticated, application rejected
  | 'coach_approved'    // Authenticated, has coach role
  | 'admin';            // Authenticated, admin or superadmin

export interface AppState {
  state: AppUserState;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCoach: boolean;
  canManageWorkouts: boolean;
  applicationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  user: ReturnType<typeof useAuth>['user'];
  profile: ReturnType<typeof useAuth>['profile'];
}

export function useAppState(): AppState {
  const auth = useAuth();
  const { application, loading: appLoading, status: appStatus } = useCoachApplication();

  // CRITICAL: We're loading if auth is loading OR if user exists but application status isn't resolved
  const loading = auth.loading || appLoading;

  const state = useMemo<AppUserState>(() => {
    // LOADING: Never decide until fully resolved
    if (loading) {
      return 'loading';
    }

    // ANON: No authenticated user
    if (!auth.user) {
      return 'anon';
    }

    // ADMIN/SUPERADMIN: Highest priority
    if (auth.isAdmin || auth.isSuperAdmin) {
      return 'admin';
    }

    // COACH (role active): Application approved and role granted
    if (auth.isCoach) {
      return 'coach_approved';
    }

    // Coach application states (user has no coach role yet)
    if (application?.status === 'pending') {
      return 'coach_pending';
    }

    if (application?.status === 'rejected') {
      return 'coach_rejected';
    }

    // Regular athlete (authenticated but no coach application or role)
    return 'athlete';
  }, [loading, auth.user, auth.isAdmin, auth.isSuperAdmin, auth.isCoach, application?.status]);

  return {
    state,
    loading,
    isAuthenticated: !!auth.user,
    isAdmin: auth.isAdmin,
    isSuperAdmin: auth.isSuperAdmin,
    isCoach: auth.isCoach,
    canManageWorkouts: auth.canManageWorkouts,
    applicationStatus: appStatus,
    user: auth.user,
    profile: auth.profile,
  };
}
