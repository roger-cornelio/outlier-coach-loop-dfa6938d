/**
 * useOnboardingTour - Manages guided tour state for new athletes
 * 
 * Shows tour only ONCE after first_setup_completed transitions to true.
 * Uses localStorage scoped by userId to track if tour was already seen.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppState } from './useAppState';

const TOUR_SEEN_PREFIX = 'outlier_onboarding_tour_seen_';

export interface TourPreviewItem {
  icon: string; // Lucide icon name
  label: string;
}

export interface TourStep {
  id: string;
  title: string;
  description: string;
  lucideIcon: string; // Lucide icon name
  tabId: string; // maps to bottom nav tab
  previewItems: TourPreviewItem[];
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'dashboard',
    title: 'Dashboard Inteligente',
    description: 'Treino do dia adaptado aos seus dados reais. Radar diagnóstico, foco de evolução e status de performance — tudo conectado.',
    lucideIcon: 'LayoutDashboard',
    tabId: 'dashboard',
    previewItems: [
      { icon: 'Activity', label: 'Radar diagnóstico' },
      { icon: 'Dumbbell', label: 'Treino do dia' },
      { icon: 'TrendingUp', label: 'Status de performance' },
    ],
  },
  {
    id: 'weeklyTraining',
    title: 'Treino Semanal',
    description: 'Cada sessão tem volume ajustado às suas estações mais fracas. Mais reps onde você precisa, menos onde já domina.',
    lucideIcon: 'Calendar',
    tabId: 'weeklyTraining',
    previewItems: [
      { icon: 'ListChecks', label: 'Sessões da semana' },
      { icon: 'Sliders', label: 'Adaptação automática' },
      { icon: 'Clock', label: 'Tempo estimado' },
    ],
  },
  {
    id: 'benchmarks',
    title: 'Evolução com Dados',
    description: 'Acompanhe benchmarks, compare com metas OUTLIER e veja o impacto da personalização na sua progressão.',
    lucideIcon: 'TrendingUp',
    tabId: 'benchmarks',
    previewItems: [
      { icon: 'BarChart3', label: 'Benchmarks OUTLIER' },
      { icon: 'Target', label: 'Metas por nível' },
      { icon: 'ArrowUpRight', label: 'Histórico de evolução' },
    ],
  },
  {
    id: 'prova-alvo',
    title: 'Prova Alvo',
    description: 'Cadastre sua próxima prova e receba projeções de tempo, splits alvo e plano de corrida personalizado.',
    lucideIcon: 'Target',
    tabId: 'prova-alvo',
    previewItems: [
      { icon: 'Flag', label: 'Próxima prova' },
      { icon: 'Timer', label: 'Splits projetados' },
      { icon: 'Route', label: 'Plano de corrida' },
    ],
  },
  {
    id: 'config',
    title: 'Configurações',
    description: 'Ajuste perfil, equipamentos e tempo de treino. O motor recalcula seus ajustes automaticamente.',
    lucideIcon: 'Settings',
    tabId: 'config',
    previewItems: [
      { icon: 'User', label: 'Perfil e biometria' },
      { icon: 'Wrench', label: 'Equipamentos disponíveis' },
      { icon: 'Clock', label: 'Tempo de treino' },
    ],
  },
];

export function useOnboardingTour() {
  const { user } = useAppState();
  const userId = user?.id;
  const storageKey = userId ? `${TOUR_SEEN_PREFIX}${userId}` : null;

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

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
    } catch {}
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
