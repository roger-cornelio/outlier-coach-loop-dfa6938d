/**
 * useAthletePlan - Hook para carregar planos do atleta da tabela athlete_plans
 * 
 * REGRAS DE EXIBIÇÃO (MVP):
 * 1. Buscar apenas treinos com status='published' e scheduled_date dentro da semana atual
 * 2. Agrupar por scheduled_date para exibir no quadro semanal
 * 3. Múltiplos treinos no mesmo dia: listar todos
 * 4. Treinos sem scheduled_date: ignorar (legado)
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DayWorkout } from '@/types/outlier';

const EMPTY_WORKOUTS: DayWorkout[] = [];

export interface AthletePlan {
  id: string;
  week_start: string;
  scheduled_date: string | null;
  title: string | null;
  workouts: DayWorkout[];
  published_at: string | null;
  coach_id: string;
}

interface UseAthletePlanReturn {
  // Lista de todos os planos da semana (pode ter múltiplos)
  plans: AthletePlan[];
  // Plano principal (primeiro da lista, para compatibilidade)
  plan: AthletePlan | null;
  // Workouts agregados de todos os planos
  workouts: DayWorkout[];
  // Workouts organizados por dia da semana
  workoutsByDate: Map<string, DayWorkout[]>;
  loading: boolean;
  error: string | null;
  hasCoach: boolean;
  refetch: () => Promise<void>;
}

// Calcula o início da semana (segunda-feira)
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Calcula o fim da semana (domingo)
function getWeekEnd(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function useAthletePlan(): UseAthletePlanReturn {
  const { user, profile, canManageWorkouts } = useAuth();
  const [plans, setPlans] = useState<AthletePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Intervalo da semana estável durante a sessão
  const weekStart = useMemo(() => getWeekStart(), []);
  const weekEnd = useMemo(() => getWeekEnd(), []);

  const hasCoach = !!profile?.coach_id;
  const userId = user?.id ?? null;

  const fetchPlans = useCallback(async () => {
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
      // Buscar treinos publicados com scheduled_date dentro da semana
      const { data, error: fetchError } = await supabase
        .from('athlete_plans')
        .select('id, week_start, scheduled_date, title, plan_json, published_at, coach_id')
        .eq('athlete_user_id', userId)
        .eq('status', 'published')
        .not('scheduled_date', 'is', null)
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd)
        .order('scheduled_date', { ascending: true });

      if (fetchError) {
        console.error('[useAthletePlan] Fetch error:', fetchError);
        setError(fetchError.message || 'Erro ao carregar treinos');
        setPlans([]);
        return;
      }

      if (data && data.length > 0) {
        const parsedPlans: AthletePlan[] = data.map((row: any) => {
          const planJson = row.plan_json as { workouts?: DayWorkout[] } | null;
          return {
            id: row.id,
            week_start: row.week_start,
            scheduled_date: row.scheduled_date,
            title: row.title,
            workouts: planJson?.workouts || EMPTY_WORKOUTS,
            published_at: row.published_at,
            coach_id: row.coach_id,
          };
        });

        console.log('[useAthletePlan] Found plans:', parsedPlans.length);
        setPlans(parsedPlans);
      } else {
        console.log('[useAthletePlan] No plans found for week:', weekStart, '-', weekEnd);
        setPlans([]);
      }
    } catch (err: any) {
      console.error('[useAthletePlan] Exception:', err);
      setError(err?.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, [userId, canManageWorkouts, weekStart, weekEnd]);

  // Flag para evitar re-fetch em loop
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    hasFetchedRef.current = false;
  }, [userId, weekStart]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchPlans();
  }, [fetchPlans]);

  // Primeiro plano (para compatibilidade com código existente)
  const plan = plans.length > 0 ? plans[0] : null;

  // Agregar todos os workouts de todos os planos
  const workouts = useMemo(() => {
    if (plans.length === 0) return EMPTY_WORKOUTS;
    
    const allWorkouts: DayWorkout[] = [];
    for (const p of plans) {
      allWorkouts.push(...p.workouts);
    }
    return allWorkouts;
  }, [plans]);

  // Organizar workouts por data agendada
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, DayWorkout[]>();
    
    for (const p of plans) {
      if (!p.scheduled_date) continue;
      
      const existing = map.get(p.scheduled_date) || [];
      map.set(p.scheduled_date, [...existing, ...p.workouts]);
    }
    
    return map;
  }, [plans]);

  return {
    plans,
    plan,
    workouts,
    workoutsByDate,
    loading,
    error,
    hasCoach,
    refetch: fetchPlans,
  };
}
