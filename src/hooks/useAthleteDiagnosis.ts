/**
 * useAthleteDiagnosis - Hook para gerar diagnóstico textual do atleta
 * 
 * REGRAS:
 * - Texto curto (1 frase)
 * - Baseado em dados reais (treinos, resultados, consistência)
 * - Nunca usar termos genéricos ("bom", "ok")
 * - Nunca mostrar números crus
 * 
 * EXEMPLOS VÁLIDOS:
 * - "Carga adequada — mantenha intensidade"
 * - "Fadiga acumulada — ajuste aplicado hoje"
 * - "Evolução estável — foco em consistência"
 * - "Primeiro treino da semana — vamos começar"
 */

import { useMemo } from 'react';
import { useOutlierStore } from '@/store/outlierStore';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useBenchmarkResults } from '@/hooks/useBenchmarkResults';
import { useAthletePlan } from '@/hooks/useAthletePlan';

export interface AthleteDiagnosis {
  text: string;
  type: 'positive' | 'neutral' | 'attention';
  icon: string;
}

export function useAthleteDiagnosis(): AthleteDiagnosis {
  const { workoutResults, adaptedWorkouts } = useOutlierStore();
  const { status, confidence } = useAthleteStatus();
  const { results } = useBenchmarkResults();
  const { workouts } = useAthletePlan();

  return useMemo(() => {
    // Contar treinos da semana atual
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const workoutsThisWeek = workoutResults?.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= startOfWeek;
    }) || [];

    const hasWorkoutsToday = workoutsThisWeek.some(w => {
      const workoutDate = new Date(w.date);
      return workoutDate.toDateString() === now.toDateString();
    });

    const hasAdaptations = adaptedWorkouts.length > 0;
    const isFirstWorkoutOfWeek = workoutsThisWeek.length === 0;
    const hasMultipleWorkouts = workoutsThisWeek.length >= 3;

    // Hierarquia de diagnósticos (ordem de prioridade)
    
    // 1. Primeiro treino da semana
    if (isFirstWorkoutOfWeek) {
      return {
        text: 'Primeiro treino da semana — vamos começar forte',
        type: 'neutral' as const,
        icon: '💪'
      };
    }

    // 2. Treino adaptado hoje
    if (hasAdaptations) {
      return {
        text: 'Treino calibrado para você — estímulo otimizado',
        type: 'positive' as const,
        icon: '⚡'
      };
    }

    // 3. Muitos treinos na semana (possível fadiga)
    if (hasMultipleWorkouts) {
      return {
        text: 'Semana intensa — mantenha qualidade do movimento',
        type: 'attention' as const,
        icon: '🔥'
      };
    }

    // 4. Treinos em dia
    if (workoutsThisWeek.length >= 1) {
      return {
        text: 'Evolução estável — foco em consistência',
        type: 'positive' as const,
        icon: '📈'
      };
    }

    // Fallback: Carga adequada
    return {
      text: 'Carga adequada — mantenha intensidade',
      type: 'neutral' as const,
      icon: '✅'
    };
  }, [workoutResults, adaptedWorkouts, status, confidence]);
}
