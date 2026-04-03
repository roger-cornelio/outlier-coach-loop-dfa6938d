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
    description: 'A plataforma que transforma sua planilha genérica em treinos individualizados — automaticamente.',
    bullets: [
      'Seus atletas pagam a plataforma, você recebe 80%',
      'Motor de adaptação ajusta volume por diagnóstico de cada atleta',
      'Você revisa e aprova os ajustes antes de publicar',
    ],
  },
  {
    id: 'how-it-works',
    icon: '⚙️',
    title: 'Personalização inteligente',
    description: 'Seu treino base é adaptado automaticamente para cada atleta:',
    bullets: [
      '🎯 Diagnóstico analisa splits reais e identifica pontos fracos',
      '⚡ Motor de proporção ajusta volume por estação (±15%)',
      '✅ Você controla tudo — liga/desliga por atleta antes de publicar',
    ],
  },
  {
    id: 'next-steps',
    icon: '🚀',
    title: 'Próximos passos',
    description: 'Para começar a escalar com qualidade:',
    bullets: [
      '✏️ Defina seu nome de exibição',
      '🔗 Vincule seus primeiros atletas por email',
      '📄 Importe sua planilha — o sistema parseia e adapta automaticamente',
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
    description: 'Gerencie sua base, veja diagnósticos individuais e acompanhe feedbacks. Cada atleta com dados de prova recebe adaptação automática.',
    icon: '👥',
  },
  {
    id: 'importar',
    title: 'Aba Importar',
    description: 'Cole sua planilha e o sistema parseia em blocos estruturados. Na publicação, o motor adapta o volume para cada atleta.',
    icon: '📋',
  },
  {
    id: 'programacoes',
    title: 'Aba Programações',
    description: 'Publique com adaptação inteligente: cada atleta recebe volume ajustado aos seus pontos fracos, com um clique.',
    icon: '📅',
  },
  {
    id: 'vincular',
    title: 'Vincular Atleta',
    description: 'Convide atletas por email. Quando importarem seus resultados HYROX, o motor calcula os ajustes automaticamente.',
    icon: '🔗',
  },
  {
    id: 'ready',
    title: 'Tudo pronto!',
    description: 'Seu painel está configurado. Importe sua planilha, ative a adaptação e escale sua operação com qualidade 1:1! 💪',
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
