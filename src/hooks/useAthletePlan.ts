/**
 * useAthletePlan - Hook para carregar o plano do atleta da tabela athlete_plans
 * 
 * Prioridade:
 * 1. Se atleta tem coach vinculado (profiles.coach_id), buscar athlete_plans
 * 2. Se não tem plano publicado, retornar empty state
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DayWorkout } from '@/types/outlier';

export interface AthletePlan {
  id: string;
  week_start: string;
  title: string | null;
  workouts: DayWorkout[];
  published_at: string | null;
  coach_id: string;
}

interface UseAthletePlanReturn {
  plan: AthletePlan | null;
  workouts: DayWorkout[];
  loading: boolean;
  error: string | null;
  hasCoach: boolean;
  refetch: () => Promise<void>;
}

// Calcula o início da semana (segunda-feira)
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajusta para segunda
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function useAthletePlan(): UseAthletePlanReturn {
  const { user, profile, canManageWorkouts } = useAuth();
  const [plan, setPlan] = useState<AthletePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasCoach = !!profile?.coach_id;

  const fetchPlan = useCallback(async () => {
    // Se é coach/admin, não precisa buscar plano de atleta
    if (canManageWorkouts) {
      setLoading(false);
      return;
    }

    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const weekStart = getWeekStart();
      
      // Buscar plano da semana atual (usando any para evitar erro de tipos não gerados)
      const { data, error: fetchError } = await (supabase as any)
        .from('athlete_plans')
        .select('id, week_start, title, plan_json, published_at, coach_id')
        .eq('athlete_user_id', user.id)
        .eq('week_start', weekStart)
        .eq('status', 'published')
        .maybeSingle();

      if (fetchError) {
        console.error('[useAthletePlan] Fetch error:', fetchError);
        setError('Erro ao carregar treino');
        setPlan(null);
        return;
      }

      if (data) {
        const planJson = data.plan_json as { workouts?: DayWorkout[] } | null;
        setPlan({
          id: data.id,
          week_start: data.week_start,
          title: data.title,
          workouts: planJson?.workouts || [],
          published_at: data.published_at,
          coach_id: data.coach_id,
        });
      } else {
        setPlan(null);
      }
    } catch (err) {
      console.error('[useAthletePlan] Error:', err);
      setError('Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, [user?.id, canManageWorkouts]);

  // Fetch on mount e quando user muda
  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  return {
    plan,
    workouts: plan?.workouts || [],
    loading,
    error,
    hasCoach,
    refetch: fetchPlan,
  };
}
