/**
 * ONBOARDING DECISION HOOK
 * 
 * Centraliza TODA a lógica de decisão sobre mostrar onboarding.
 * 
 * REGRA-MÃE: A tela "Escolha o estilo do seu treinador" só aparece
 * quando profile.coach_style estiver AUSENTE.
 * 
 * REGRAS:
 * 1. Se auth.status === "loading" OU profileLoaded === false → não redirecionar
 * 2. Se authenticated E coach_style EXISTE → shouldShowOnboarding = false (COACH_STYLE_PRESENT)
 * 3. Se authenticated E coach_style AUSENTE → shouldShowOnboarding = true (COACH_STYLE_MISSING)
 * 4. Se unauthenticated → shouldShowOnboarding = false
 * 
 * MIGRAÇÃO AUTOMÁTICA: Se coach_style existe mas first_setup_completed é null/false,
 * dispara atualização automática para first_setup_completed = true
 */

import { useMemo, useEffect, useRef } from 'react';
import { useAppState } from './useAppState';
import { useOutlierStore } from '@/store/outlierStore';
import { supabase } from '@/integrations/supabase/client';

export type RedirectReason =
  | 'WAITING_FOR_DATA'
  | 'COACH_STYLE_PRESENT'
  | 'COACH_STYLE_MISSING'
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
  const { state, user, profile, profileLoaded, updateProfileOptimistic } = useAppState();
  const { coachStyle, currentView } = useOutlierStore();
  
  // Track if we've already done the auto-migration
  const autoMigrationDone = useRef(false);

  // MIGRAÇÃO AUTOMÁTICA: Se coach_style existe mas first_setup_completed é null/false
  useEffect(() => {
    if (autoMigrationDone.current) return;
    if (!profileLoaded || !user?.id) return;
    
    const hasCoachStyle = profile?.coach_style && ['IRON', 'PULSE', 'SPARK'].includes(profile.coach_style);
    const setupNotCompleted = profile?.first_setup_completed !== true;
    
    if (hasCoachStyle && setupNotCompleted) {
      console.log('[useOnboardingDecision] AUTO-MIGRATION: coach_style exists but first_setup_completed is not true. Fixing...');
      autoMigrationDone.current = true;
      
      // Optimistic update
      updateProfileOptimistic({ first_setup_completed: true });
      
      // Persist to database
      supabase
        .from('profiles')
        .update({ first_setup_completed: true })
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('[useOnboardingDecision] Auto-migration failed:', error);
          } else {
            console.log('[useOnboardingDecision] Auto-migration completed successfully');
          }
        });
    }
  }, [profileLoaded, user?.id, profile?.coach_style, profile?.first_setup_completed, updateProfileOptimistic]);

  const decision = useMemo(() => {
    // Map app state to auth status
    const authStatus: 'loading' | 'authenticated' | 'unauthenticated' =
      state === 'loading' ? 'loading' :
      state === 'anon' ? 'unauthenticated' : 'authenticated';

    const userId = user?.id || null;
    const profileCoachStyle = profile?.coach_style || null;
    const firstSetupCompleted = profile?.first_setup_completed ?? null;
    const localCoachStyle = coachStyle || null;
    
    // Validate coach_style
    const hasValidCoachStyle = profileCoachStyle && ['IRON', 'PULSE', 'SPARK'].includes(profileCoachStyle);

    // Log for debugging
    console.log('[useOnboardingDecision] Computing decision:', {
      authStatus,
      userId: userId?.slice(0, 8),
      profileLoaded,
      hasValidCoachStyle,
      profileCoachStyle,
      firstSetupCompleted,
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

    // REGRA-MÃE: Se coach_style existe → NÃO mostrar onboarding
    if (hasValidCoachStyle) {
      console.log('[useOnboardingDecision] → COACH_STYLE_PRESENT');
      return {
        shouldShowOnboarding: false,
        canRedirect: true,
        lastRedirectReason: 'COACH_STYLE_PRESENT' as RedirectReason,
        authStatus,
        userId,
        profileLoaded,
        profileCoachStyle,
        firstSetupCompleted,
        localCoachStyle,
        currentView,
      };
    }

    // Rule 3: coach_style ausente → mostrar onboarding
    console.log('[useOnboardingDecision] → COACH_STYLE_MISSING');
    return {
      shouldShowOnboarding: true,
      canRedirect: true,
      lastRedirectReason: 'COACH_STYLE_MISSING' as RedirectReason,
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
