/**
 * useCoachOnboardingTour - Manages onboarding + tour state for new coaches
 * 
 * Two phases:
 * 1. Onboarding (3 fullscreen slides) — first-time welcome
 * 2. Tour (5 steps) — guided dashboard walkthrough
 * 
 * Both persisted via localStorage scoped by userId.
 */

import { useState, useCallback } from 'react';
import { useAppState } from './useAppState';

const ONBOARDING_SEEN_PREFIX = 'outlier_coach_onboarding_seen_';
const TOUR_SEEN_PREFIX = 'outlier_coach_tour_seen_';

// ── Onboarding Steps (fullscreen slides) ──

export interface OnboardingSlide {
  id: string;
  icon: string;
  title: string;
  description: string;
  bullets?: string[];
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'welcome',
    icon: '🏆',
    title: 'Bem-vindo à OUTLIER, Coach!',
    description: 'A plataforma que conecta coaches de HYROX aos seus atletas com treinos inteligentes, diagnósticos e evolução contínua.',
    bullets: [
      'Seus atletas pagam a plataforma',
      'Você recebe 80% da receita automaticamente',
      'Foque no treino — a gente cuida do resto',
    ],
  },
  {
    id: 'how-it-works',
    icon: '⚙️',
    title: 'Como funciona',
    description: 'Seu painel tem 3 pilares:',
    bullets: [
      '📋 Importar — Cole sua planilha e o sistema parseia automaticamente',
      '👥 Atletas — Gerencie sua base, feedbacks e evolução',
      '📅 Programações — Publique semanas de treino para seus atletas',
    ],
  },
  {
    id: 'next-steps',
    icon: '🚀',
    title: 'Próximos passos',
    description: 'Para começar a usar a plataforma:',
    bullets: [
      '✏️ Defina seu nome de exibição',
      '🔗 Vincule seus primeiros atletas por email',
      '📄 Importe sua primeira planilha de treinos',
    ],
  },
];

// ── Tour Steps (overlay cards) ──

export interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'atletas',
    title: 'Aba Atletas',
    description: 'Aqui você gerencia sua base, aprova solicitações de vínculo e acompanha os feedbacks dos treinos.',
    icon: '👥',
  },
  {
    id: 'importar',
    title: 'Aba Importar',
    description: 'Cole sua planilha de treinos e o sistema parseia automaticamente em blocos estruturados.',
    icon: '📋',
  },
  {
    id: 'programacoes',
    title: 'Aba Programações',
    description: 'Semanas salvas aparecem aqui, prontas para publicar para seus atletas com um clique.',
    icon: '📅',
  },
  {
    id: 'vincular',
    title: 'Vincular Atleta',
    description: 'Use o botão "Vincular Atleta" para convidar atletas por email e começar a gerenciar seus treinos.',
    icon: '🔗',
  },
  {
    id: 'ready',
    title: 'Tudo pronto!',
    description: 'Seu painel está configurado. Importe sua primeira planilha e comece a transformar treinos! 💪',
    icon: '🚀',
  },
];

export function useCoachOnboardingTour() {
  const { user } = useAppState();
  const userId = user?.id;
  const onboardingKey = userId ? `${ONBOARDING_SEEN_PREFIX}${userId}` : null;
  const tourKey = userId ? `${TOUR_SEEN_PREFIX}${userId}` : null;

  // Onboarding state
  const [onboardingActive, setOnboardingActive] = useState(() => {
    if (!onboardingKey) return false;
    try { return !localStorage.getItem(onboardingKey); } catch { return false; }
  });
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Tour state
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // ── Onboarding controls ──
  const completeOnboarding = useCallback(() => {
    setOnboardingActive(false);
    setOnboardingStep(0);
    if (onboardingKey) {
      try { localStorage.setItem(onboardingKey, 'true'); } catch {}
    }
    // Auto-start tour after onboarding
    if (tourKey) {
      const tourSeen = localStorage.getItem(tourKey);
      if (!tourSeen) {
        setTimeout(() => {
          setTourStep(0);
          setTourActive(true);
        }, 500);
      }
    }
  }, [onboardingKey, tourKey]);

  const nextOnboardingStep = useCallback(() => {
    if (onboardingStep < ONBOARDING_SLIDES.length - 1) {
      setOnboardingStep(s => s + 1);
    } else {
      completeOnboarding();
    }
  }, [onboardingStep, completeOnboarding]);

  const prevOnboardingStep = useCallback(() => {
    if (onboardingStep > 0) setOnboardingStep(s => s - 1);
  }, [onboardingStep]);

  const skipOnboarding = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  // ── Tour controls ──
  const completeTour = useCallback(() => {
    setTourActive(false);
    setTourStep(0);
    if (tourKey) {
      try { localStorage.setItem(tourKey, 'true'); } catch {}
    }
  }, [tourKey]);

  const startTour = useCallback(() => {
    setTourStep(0);
    setTourActive(true);
  }, []);

  const nextTourStep = useCallback(() => {
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep(s => s + 1);
    } else {
      completeTour();
    }
  }, [tourStep, completeTour]);

  const prevTourStep = useCallback(() => {
    if (tourStep > 0) setTourStep(s => s - 1);
  }, [tourStep]);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  return {
    // Onboarding
    onboardingActive,
    onboardingStep,
    onboardingSlide: ONBOARDING_SLIDES[onboardingStep],
    totalOnboardingSlides: ONBOARDING_SLIDES.length,
    nextOnboardingStep,
    prevOnboardingStep,
    skipOnboarding,
    // Tour
    tourActive,
    tourStep,
    tourStepData: TOUR_STEPS[tourStep],
    totalTourSteps: TOUR_STEPS.length,
    startTour,
    nextTourStep,
    prevTourStep,
    skipTour,
  };
}
