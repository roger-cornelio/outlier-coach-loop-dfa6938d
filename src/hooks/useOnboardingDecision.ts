/**
 * ONBOARDING DECISION HOOK
 * 
 * Centraliza TODA a lógica de decisão sobre mostrar onboarding.
 * 
 * DEFINIÇÃO DE "SETUP COMPLETO":
 * - first_setup_completed === true no perfil
 * - OU coach_style existe E athleteConfig tem trainingLevel (inferido)
 * 
 * REGRAS:
 * 1. Se auth.status === "loading" OU profileLoaded === false → não redirecionar
 * 2. Se authenticated E setup completo → shouldShowOnboarding = false
 * 3. Se authenticated E setup incompleto → shouldShowOnboarding = true
 * 4. Se unauthenticated → shouldShowOnboarding = false
 * 
 * IMPORTANTE:
 * - Login, logout, novo dispositivo NÃO redefinem setup
 * - Setup concluído é estado do perfil, não da sessão
 */

import { useMemo, useEffect, useRef } from 'react';
import { useAppState } from './useAppState';
import { useOutlierStore } from '@/store/outlierStore';
import { supabase } from '@/integrations/supabase/client';

export type RedirectReason =
  | 'WAITING_FOR_DATA'
  | 'SETUP_COMPLETE'
  | 'SETUP_INCOMPLETE'
  | 'NOT_LOGGED_IN';

export interface OnboardingDecision {
  shouldShowOnboarding: boolean;
  canRedirect: boolean;
  lastRedirectReason: RedirectReason;
  isSetupComplete: boolean;
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
  const { coachStyle, currentView, athleteConfig } = useOutlierStore();
  
  // Track if we've already done the auto-migration
  const autoMigrationDone = useRef(false);

  // MIGRAÇÃO AUTOMÁTICA: Se setup está completo mas first_setup_completed é null/false
  useEffect(() => {
    if (autoMigrationDone.current) return;
    if (!profileLoaded || !user?.id) return;
    
    const hasCoachStyle = profile?.coach_style && ['IRON', 'PULSE', 'SPARK'].includes(profile.coach_style);
    const hasTrainingLevel = athleteConfig?.trainingLevel;
    const setupNotCompleted = profile?.first_setup_completed !== true;
    
    // Se tem coach_style E training_level, marca como completo
    if (hasCoachStyle && hasTrainingLevel && setupNotCompleted) {
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
          }
        });
    }
  }, [profileLoaded, user?.id, profile?.coach_style, profile?.first_setup_completed, athleteConfig?.trainingLevel, updateProfileOptimistic]);

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
    
    // Check training parameters (from local athleteConfig)
    const hasTrainingLevel = athleteConfig?.trainingLevel;
    
    // SETUP COMPLETO = flag explícita OU (coach_style + training_level inferido)
    const isSetupComplete = 
      firstSetupCompleted === true || 
      (hasValidCoachStyle && hasTrainingLevel);

    // ===== DECISION LOGIC =====

    // Rule 1: Still loading - don't redirect
    if (authStatus === 'loading' || !profileLoaded) {
      return {
        shouldShowOnboarding: false,
        canRedirect: false,
        lastRedirectReason: 'WAITING_FOR_DATA' as RedirectReason,
        isSetupComplete: false,
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
      return {
        shouldShowOnboarding: false,
        canRedirect: false,
        lastRedirectReason: 'NOT_LOGGED_IN' as RedirectReason,
        isSetupComplete: false,
        authStatus,
        userId,
        profileLoaded,
        profileCoachStyle,
        firstSetupCompleted,
        localCoachStyle,
        currentView,
      };
    }

    // SETUP COMPLETO → NÃO mostrar onboarding
    if (isSetupComplete) {
      return {
        shouldShowOnboarding: false,
        canRedirect: true,
        lastRedirectReason: 'SETUP_COMPLETE' as RedirectReason,
        isSetupComplete: true,
        authStatus,
        userId,
        profileLoaded,
        profileCoachStyle,
        firstSetupCompleted,
        localCoachStyle,
        currentView,
      };
    }

    // SETUP INCOMPLETO → mostrar onboarding
    return {
      shouldShowOnboarding: true,
      canRedirect: true,
      lastRedirectReason: 'SETUP_INCOMPLETE' as RedirectReason,
      isSetupComplete: false,
      authStatus,
      userId,
      profileLoaded,
      profileCoachStyle,
      firstSetupCompleted,
      localCoachStyle,
      currentView,
    };
  }, [state, user?.id, profile?.coach_style, profile?.first_setup_completed, profileLoaded, coachStyle, currentView, athleteConfig?.trainingLevel]);

  return decision;
}
