/**
 * useAthleteDiagnosis - Hook para gerar diagnóstico textual do atleta
 * 
 * ABSORVE O CONTEÚDO DA ANTIGA TELA PULSE:
 * - Diagnóstico humano, curto e explicável
 * - Contexto emocional sem emoção vaga
 * - Sem botão ou CTA próprio
 * 
 * REGRAS:
 * - Texto curto (1 frase)
 * - Baseado em dados reais (treinos, resultados, consistência)
 * - Nunca usar termos genéricos ("bom", "ok")
 * - Nunca mostrar números crus
 * - Nunca competir com o CTA principal de treino
 * 
 * EXEMPLOS VÁLIDOS:
 * - "Hoje é dia de recuperação. O plano já considerou isso."
 * - "Carga controlada. Treino ajustado para evoluir sem quebrar."
 * - "Dia chave da semana. Intensidade planejada."
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
    const dayOfWeek = now.getDay(); // 0 = domingo, 1 = segunda, etc.
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const workoutsThisWeek = workoutResults?.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= startOfWeek;
    }) || [];

    const hasAdaptations = adaptedWorkouts.length > 0;
    const isFirstWorkoutOfWeek = workoutsThisWeek.length === 0;
    const hasMultipleWorkouts = workoutsThisWeek.length >= 3;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isMidWeek = dayOfWeek >= 3 && dayOfWeek <= 4; // quarta e quinta

    // Hierarquia de diagnósticos (ordem de prioridade)
    // Absorvendo conteúdo emocional da antiga tela PULSE
    
    // 1. Início de semana (segunda/terça)
    if (isFirstWorkoutOfWeek && dayOfWeek <= 2) {
      return {
        text: 'Semana nova, energia renovada. Vamos construir juntos.',
        type: 'positive' as const,
        icon: '🌅'
      };
    }

    // 2. Treino adaptado (prioridade alta - mostra valor do sistema)
    if (hasAdaptations) {
      return {
        text: 'Carga controlada. Treino ajustado para evoluir sem quebrar.',
        type: 'positive' as const,
        icon: '⚡'
      };
    }

    // 3. Semana intensa (atenção)
    if (hasMultipleWorkouts) {
      return {
        text: 'Semana intensa. O plano já está dosando a carga.',
        type: 'attention' as const,
        icon: '🔥'
      };
    }

    // 4. Dia chave (meio de semana)
    if (isMidWeek && workoutsThisWeek.length >= 1) {
      return {
        text: 'Dia chave da semana. Intensidade planejada.',
        type: 'positive' as const,
        icon: '🎯'
      };
    }

    // 5. Final de semana
    if (isWeekend) {
      return {
        text: 'Fim de semana é para consolidar. Aproveite o treino.',
        type: 'neutral' as const,
        icon: '🏆'
      };
    }

    // 6. Primeiro treino após alguns dias
    if (isFirstWorkoutOfWeek) {
      return {
        text: 'Primeiro treino da semana. Vamos começar forte.',
        type: 'neutral' as const,
        icon: '💪'
      };
    }

    // 7. Evolução estável
    if (workoutsThisWeek.length >= 1) {
      return {
        text: 'Evolução estável. Foco em consistência.',
        type: 'positive' as const,
        icon: '📈'
      };
    }

    // Fallback: Mensagem motivacional padrão
    return {
      text: 'Seu plano está pronto. O sistema cuida da progressão.',
      type: 'neutral' as const,
      icon: '✅'
    };
  }, [workoutResults, adaptedWorkouts, status, confidence]);
}
