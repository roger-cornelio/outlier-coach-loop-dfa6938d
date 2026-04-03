/**
 * useOnboardingTour - Manages guided tour state for new athletes
 * 
 * Shows tour only ONCE after first_setup_completed transitions to true.
 * Uses localStorage scoped by userId to track if tour was already seen.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppState } from './useAppState';

const TOUR_SEEN_PREFIX = 'outlier_onboarding_tour_seen_';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji
  highlight?: string; // optional CSS selector to highlight
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao OUTLIER! 🏆',
    description: 'Esse é o seu centro de comando. Aqui seu treino é personalizado com base nos seus dados reais de prova. Vamos ver?',
    icon: '🎯',
  },
  {
    id: 'dashboard',
    title: 'Dashboard Inteligente',
    description: 'Treino do dia já adaptado aos seus pontos fracos. Radar diagnóstico, foco de evolução e status de performance — tudo conectado.',
    icon: '📊',
  },
  {
    id: 'weekly',
    title: 'Treino Semanal Personalizado',
    description: 'Cada sessão tem volume ajustado às suas estações mais fracas. Mais reps onde você precisa, menos onde já domina.',
    icon: '📅',
  },
  {
    id: 'evolution',
    title: 'Evolução com Dados Reais',
    description: 'Acompanhe benchmarks, compare com metas OUTLIER e veja o impacto da personalização na sua progressão.',
    icon: '📈',
  },
  {
    id: 'prova',
    title: 'Prova Alvo',
    description: 'Cadastre sua próxima prova e receba projeções de tempo, splits alvo e um plano de corrida baseado no seu diagnóstico.',
    icon: '🏁',
  },
  {
    id: 'config',
    title: 'Configurações',
    description: 'Ajuste perfil, equipamentos e tempo de treino. O motor recalcula seus ajustes automaticamente.',
    icon: '⚙️',
  },
  {
    id: 'ready',
    title: 'Tudo pronto!',
    description: 'Seu treino já está personalizado. Cada sessão ataca seus pontos fracos. Bora ser OUTLIER! 💪',
    icon: '🚀',
  },
];

export function useOnboardingTour() {
  const { user } = useAppState();
  const userId = user?.id;
  const storageKey = userId ? `${TOUR_SEEN_PREFIX}${userId}` : null;

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Check if tour should show (only once per user, after setup complete)
  const shouldShowTour = useCallback(() => {
    if (!storageKey) return false;
    try {
      return !localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  }, [storageKey]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const completeTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // silent
    }
  }, [storageKey]);

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  }, [currentStep, completeTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  return {
    isActive,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    currentStepData: TOUR_STEPS[currentStep],
    shouldShowTour,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
  };
}
