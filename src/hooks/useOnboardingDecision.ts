/**
 * ONBOARDING DECISION HOOK
 * 
 * Centraliza TODA a lógica de decisão sobre mostrar onboarding.
 * Função única: computeShouldShowOnboarding()
 * 
 * REGRAS:
 * 1. Se auth.status === "loading" OU profileLoaded === false → não redirecionar
 * 2. Se authenticated E first_setup_completed === true → shouldShowOnboarding = false
 * 3. Se authenticated E first_setup_completed === false → shouldShowOnboarding = true
 * 4. Se unauthenticated → shouldShowOnboarding = false
 */

import { useMemo } from 'react';
import { useAppState } from './useAppState';
import { useOutlierStore } from '@/store/outlierStore';

export type RedirectReason =
  | 'WAITING_FOR_DATA'
  | 'SETUP_COMPLETED'
  | 'SETUP_NOT_COMPLETED'
  | 'NOT_LOGGED_IN'
  | 'BLOCKED_REDIRECT_FROM_SETTINGS';

export interface OnboardingDecision {
  shouldShowOnboarding: boolean;
  canRedirect: boolean;
  lastRedirectReason: RedirectReason;
  // Debug info
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  userId: string | null;
  profileLoaded: boolean;
  profileCoachStyle: string | null;
  firstSetupCompleted: boolean | null;
  localCoachStyle: string | null;
  currentView: string;
}

export function useOnboardingDecision(): OnboardingDecision {
  const { state, user, profile, profileLoaded } = useAppState();
  const { coachStyle, currentView } = useOutlierStore();

  const decision = useMemo(() => {
    // Map app state to auth status
    const authStatus: 'loading' | 'authenticated' | 'unauthenticated' =
      state === 'loading' ? 'loading' :
      state === 'anon' ? 'unauthenticated' : 'authenticated';

    const userId = user?.id || null;
    const profileCoachStyle = profile?.coach_style || null;
    const firstSetupCompleted = profile?.first_setup_completed ?? null;
    const localCoachStyle = coachStyle || null;

    // Log for debugging
    console.log('[useOnboardingDecision] Computing decision:', {
      authStatus,
      userId: userId?.slice(0, 8),
      profileLoaded,
      firstSetupCompleted,
      profileCoachStyle,
      localCoachStyle,
      currentView,
    });

    // ===== DECISION LOGIC =====

    // Rule 1: Still loading - don't redirect
    if (authStatus === 'loading' || !profileLoaded) {
      console.log('[useOnboardingDecision] → WAITING_FOR_DATA');
      return {
        shouldShowOnboarding: false,
        canRedirect: false,
        lastRedirectReason: 'WAITING_FOR_DATA' as RedirectReason,
        authStatus,
        userId,
        profileLoaded,
        profileCoachStyle,
        firstSetupCompleted,
        localCoachStyle,
        currentView,
      };
    }

    // Rule 4: Not logged in
    if (authStatus === 'unauthenticated') {
      console.log('[useOnboardingDecision] → NOT_LOGGED_IN');
      return {
        shouldShowOnboarding: false,
        canRedirect: false,
        lastRedirectReason: 'NOT_LOGGED_IN' as RedirectReason,
        authStatus,
        userId,
        profileLoaded,
        profileCoachStyle,
        firstSetupCompleted,
        localCoachStyle,
        currentView,
      };
    }

    // Rule 2: Setup completed - no onboarding
    if (firstSetupCompleted === true) {
      console.log('[useOnboardingDecision] → SETUP_COMPLETED');
      return {
        shouldShowOnboarding: false,
        canRedirect: true,
        lastRedirectReason: 'SETUP_COMPLETED' as RedirectReason,
        authStatus,
        userId,
        profileLoaded,
        profileCoachStyle,
        firstSetupCompleted,
        localCoachStyle,
        currentView,
      };
    }

    // Rule 3: Setup not completed - show onboarding
    console.log('[useOnboardingDecision] → SETUP_NOT_COMPLETED');
    return {
      shouldShowOnboarding: true,
      canRedirect: true,
      lastRedirectReason: 'SETUP_NOT_COMPLETED' as RedirectReason,
      authStatus,
      userId,
      profileLoaded,
      profileCoachStyle,
      firstSetupCompleted,
      localCoachStyle,
      currentView,
    };
  }, [state, user?.id, profile?.coach_style, profile?.first_setup_completed, profileLoaded, coachStyle, currentView]);

  return decision;
}
