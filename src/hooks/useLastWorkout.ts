/**
 * useLastWorkout - Hook para obter informações do último treino executado
 * 
 * FONTE DE VERDADE: benchmark_results + localStorage
 * - Lê o último treino registrado
 * - Retorna nome, data e status (completo/parcial)
 * 
 * GUARDRAILS:
 * - Apenas leitura, nunca modifica dados
 * - Retorna null se não houver treinos
 */

import { useState, useEffect, useMemo } from 'react';
import { useOutlierStore } from '@/store/outlierStore';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface LastWorkoutInfo {
  workoutId: string;
  title: string;
  date: string;
  relativeDate: string;
  status: 'completed' | 'partial';
  statusLabel: string;
}

export interface UseLastWorkoutResult {
  lastWorkout: LastWorkoutInfo | null;
  loading: boolean;
}

export function useLastWorkout(): UseLastWorkoutResult {
  const { user } = useAuth();
  const { workoutResults } = useOutlierStore();
  const [lastWorkout, setLastWorkout] = useState<LastWorkoutInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLastWorkout() {
      // Primeiro, tentar do store local (mais recente)
      if (workoutResults && workoutResults.length > 0) {
        const sorted = [...workoutResults].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const latest = sorted[0];
        
        setLastWorkout({
          workoutId: latest.workoutId,
          title: `Treino de ${new Date(latest.date).toLocaleDateString('pt-BR', { weekday: 'long' })}`,
          date: latest.date,
          relativeDate: formatDistanceToNow(new Date(latest.date), { 
            addSuffix: true, 
            locale: ptBR 
          }),
          status: latest.completed ? 'completed' : 'partial',
          statusLabel: latest.completed ? 'Concluído' : 'Parcial'
        });
        setLoading(false);
        return;
      }

      // Fallback: buscar do Supabase
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('benchmark_results')
            .select('id, workout_id, completed, created_at')
            .eq('user_id', user.id)
            .not('result_type', 'in', '("simulado","prova_oficial")')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!error && data) {
            const date = new Date(data.created_at);
            setLastWorkout({
              workoutId: data.workout_id,
              title: `Treino de ${date.toLocaleDateString('pt-BR', { weekday: 'long' })}`,
              date: data.created_at,
              relativeDate: formatDistanceToNow(date, { 
                addSuffix: true, 
                locale: ptBR 
              }),
              status: data.completed ? 'completed' : 'partial',
              statusLabel: data.completed ? 'Concluído' : 'Parcial'
            });
          }
        } catch (err) {
          console.error('[useLastWorkout] Error:', err);
        }
      }

      setLoading(false);
    }

    fetchLastWorkout();
  }, [user?.id, workoutResults]);

  return {
    lastWorkout,
    loading
  };
}
