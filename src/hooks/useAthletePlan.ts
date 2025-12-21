/**
 * useAthletePlan - Hook para carregar o plano do atleta da tabela athlete_plans
 * 
 * Prioridade:
 * 1. Se atleta tem coach vinculado (profiles.coach_id), buscar athlete_plans
 * 2. Se não tem plano publicado, retornar empty state
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DayWorkout } from '@/types/outlier';

const EMPTY_WORKOUTS: DayWorkout[] = [];

// Comparação simples por id+week_start (evita deep compare caro)
function planEquals(a: AthletePlan | null, b: AthletePlan | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.week_start === b.week_start && a.published_at === b.published_at;
}

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

  // week_start estável durante a sessão (evita loop por Date() em deps)
  const weekStart = useMemo(() => getWeekStart(), []);
  const lastPlanKeyRef = useRef<string | null>(null);

  const hasCoach = !!profile?.coach_id;

  // userId estável (primitivo)
  const userId = user?.id ?? null;

  const fetchPlan = useCallback(async () => {
    // Se é coach/admin, não precisa buscar plano de atleta
    if (canManageWorkouts) {
      setLoading(false);
      return;
    }

    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('athlete_plans')
        .select('id, week_start, title, plan_json, published_at, coach_id')
        .eq('athlete_user_id', userId)
        .eq('week_start', weekStart)
        .eq('status', 'published')
        .maybeSingle();

      if (fetchError) {
        console.error('[useAthletePlan] Fetch error:', fetchError);
        setError(fetchError.message || 'Erro ao carregar treino');
        setPlan((prev) => (prev === null ? prev : null));
        return;
      }

      if (data) {
        const planJson = data.plan_json as { workouts?: DayWorkout[] } | null;
        const nextPlan: AthletePlan = {
          id: data.id,
          week_start: data.week_start,
          title: data.title,
          workouts: planJson?.workouts || EMPTY_WORKOUTS,
          published_at: data.published_at,
          coach_id: data.coach_id,
        };

        // Só atualiza se realmente mudou
        setPlan((prev) => (planEquals(prev, nextPlan) ? prev : nextPlan));
      } else {
        setPlan((prev) => (prev === null ? prev : null));
      }
    } catch (err: any) {
      console.error('[useAthletePlan] Exception:', err);
      setError(err?.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, [userId, canManageWorkouts, weekStart]);

  // Flag para evitar re-fetch em loop
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Reset flag quando deps reais mudam
    hasFetchedRef.current = false;
  }, [userId, weekStart]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchPlan();
  }, [fetchPlan]);

  // Workouts estável - só muda quando plan.id muda
  const workouts = plan?.workouts ?? EMPTY_WORKOUTS;

  return {
    plan,
    workouts,
    loading,
    error,
    hasCoach,
    refetch: fetchPlan,
  };
}
