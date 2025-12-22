/**
 * ONBOARDING DECISION HOOK
 * 
 * Centraliza TODA a lógica de decisão sobre mostrar onboarding.
 * 
 * REGRA MESTRA:
 * A decisão usa APENAS a flag booleana: first_setup_completed === true
 * NÃO usa inferência de outros campos.
 *
 * HOTFIX (tri-state no bootstrap):
 * - Durante o carregamento/backfill, first_setup_completed pode estar INDEFINIDO.
 * - NESSA FASE, o gate NÃO pode decidir fluxo; apenas exibir loading neutro.
 */

import { useMemo } from 'react';
import { useAppState } from './useAppState';
import { useOutlierStore } from '@/store/outlierStore';

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
  /**
   * Tri-state no bootstrap:
   * - undefined: aguardando profile/backfill
   * - false/true: decidido
   */
  firstSetupCompleted: boolean | undefined;
  localCoachStyle: string | null;
  currentView: string;
}

export function useOnboardingDecision(): OnboardingDecision {
  const { state, user, profile, profileLoaded } = useAppState();
  const { coachStyle, currentView } = useOutlierStore();

  const decision = useMemo(() => {
    // Map app state to auth status
    const authStatus: 'loading' | 'authenticated' | 'unauthenticated' =
      state === 'loading' ? 'loading' : state === 'anon' ? 'unauthenticated' : 'authenticated';

    const userId = user?.id || null;
    const profileCoachStyle = profile?.coach_style || null;

    // Tri-state no bootstrap
    let firstSetupCompleted: boolean | undefined;

    if (!profileLoaded) {
      firstSetupCompleted = undefined;
    } else if (!profile) {
      // Perfil inexistente (usuário novo) => setup incompleto
      firstSetupCompleted = false;
    } else if (profile.first_setup_completed === true) {
      firstSetupCompleted = true;
    } else if (profile.first_setup_completed === false) {
      firstSetupCompleted = false;
    } else {
      // Caso legado: valor veio null/undefined do banco
      firstSetupCompleted = undefined;
    }

    const localCoachStyle = coachStyle || null;

    // REGRA MESTRA: Usar APENAS first_setup_completed === true
    const isSetupComplete = firstSetupCompleted === true;

    // ========== DEBUG LOG ==========
    console.log(
      `[GATE][useOnboardingDecision] authStatus=${authStatus} profileLoaded=${profileLoaded} first_setup_completed=${firstSetupCompleted} isSetupComplete=${isSetupComplete} coachStyle=${profileCoachStyle} currentView=${currentView} ts=${new Date().toISOString()}`
    );

    // ===== DECISION LOGIC =====

    // Rule 1: Still loading OR tri-state unresolved - don't redirect
    if (authStatus === 'loading' || !profileLoaded || firstSetupCompleted === undefined) {
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

    // SETUP COMPLETO (first_setup_completed === true) → NÃO mostrar onboarding
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
  }, [
    state,
    user?.id,
    profile?.coach_style,
    // importante: não colapsar aqui; apenas observar mudanças
    // eslint-disable-next-line react-hooks/exhaustive-deps
    (profile as any)?.first_setup_completed,
    profileLoaded,
    coachStyle,
    currentView,
  ]);

  return decision;
}
