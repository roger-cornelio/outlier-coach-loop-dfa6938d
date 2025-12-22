/**
 * ONBOARDING DECISION HOOK
 * 
 * Centraliza TODA a lógica de decisão sobre mostrar onboarding.
 * 
 * REGRA MESTRA:
 * A decisão usa APENAS a flag booleana: first_setup_completed === true
 * NÃO usa inferência de outros campos.
 * 
 * REGRAS:
 * 1. Se auth.status === "loading" OU profileLoaded === false → não redirecionar
 * 2. Se authenticated E first_setup_completed === true → shouldShowOnboarding = false
 * 3. Se authenticated E first_setup_completed !== true → shouldShowOnboarding = true
 * 4. Se unauthenticated → shouldShowOnboarding = false
 * 
 * IMPORTANTE:
 * - Login, logout, novo dispositivo NÃO redefinem setup
 * - Setup concluído é estado do perfil (first_setup_completed), não da sessão
 * - A tela de Configuração só abre por ação explícita do usuário
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
    // REGRA: first_setup_completed NUNCA pode ser null na decisão
    // Forçar boolean para garantir decisões determinísticas
    const firstSetupCompleted = !!profile?.first_setup_completed;
    const localCoachStyle = coachStyle || null;
    
    // REGRA MESTRA: Usar APENAS first_setup_completed === true
    // NÃO usar inferência de outros campos
    const isSetupComplete = firstSetupCompleted === true;
    
    // ========== DEBUG LOG ==========
    console.log(`[GATE][useOnboardingDecision] authStatus=${authStatus} profileLoaded=${profileLoaded} first_setup_completed=${firstSetupCompleted} isSetupComplete=${isSetupComplete} coachStyle=${profileCoachStyle} currentView=${currentView} ts=${new Date().toISOString()}`);

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
  }, [state, user?.id, profile?.coach_style, profile?.first_setup_completed, profileLoaded, coachStyle, currentView]);

  return decision;
}
