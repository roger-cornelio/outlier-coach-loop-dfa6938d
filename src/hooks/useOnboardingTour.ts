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
    description: 'Esse é o seu centro de comando. Aqui você acompanha tudo sobre seu treino, evolução e metas. Vamos fazer um tour rápido?',
    icon: '🎯',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Sua visão geral: treino do dia, status de performance, radar diagnóstico e foco de evolução — tudo em um só lugar.',
    icon: '📊',
  },
  {
    id: 'weekly',
    title: 'Treino Semanal',
    description: 'Veja todos os treinos da semana organizados por dia. Cada sessão mostra tempo estimado, calorias e foco do treino.',
    icon: '📅',
  },
  {
    id: 'evolution',
    title: 'Evolução',
    description: 'Acompanhe seus benchmarks, compare com metas OUTLIER e veja o quanto você evoluiu ao longo do tempo.',
    icon: '📈',
  },
  {
    id: 'prova',
    title: 'Prova Alvo',
    description: 'Cadastre sua próxima prova e receba projeções de tempo, splits alvo e um plano de corrida personalizado.',
    icon: '🏁',
  },
  {
    id: 'config',
    title: 'Configurações',
    description: 'Ajuste seu perfil, equipamentos disponíveis, tempo de treino e preferências a qualquer momento.',
    icon: '⚙️',
  },
  {
    id: 'ready',
    title: 'Tudo pronto!',
    description: 'Agora é com você. Seu treino está esperando. Bora ser OUTLIER! 💪',
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
