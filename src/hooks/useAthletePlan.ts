/**
 * useAthletePlan - Hook para carregar planos do atleta da tabela athlete_plans
 * 
 * REGRAS CANÔNICAS:
 * 1. Fonte única: week_start (não scheduled_date)
 * 2. Navegação travada em 3 semanas: -1, 0, +1
 * 3. Virada no domingo: se hoje é domingo, "ATUAL" = próxima semana
 * 4. Logs padronizados: ATHLETE_WEEK_RESOLVE, ATHLETE_PLAN_FETCH
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DayWorkout } from '@/types/outlier';
import {
  getAthleteCurrentWeekStart,
  getAthleteAllowedWeeks,
  getWeekEndFromStart,
  formatWeekLabel,
} from '@/utils/weekCalculations';

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

export interface WeekInfo {
  start: string;
  end: string;
  label: string;
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
}

interface UseAthletePlanReturn {
  plans: AthletePlan[];
  plan: AthletePlan | null;
  workouts: DayWorkout[];
  workoutsByDate: Map<string, DayWorkout[]>;
  loading: boolean;
  error: string | null;
  hasCoach: boolean;
  refetch: () => Promise<void>;
  currentWeek: WeekInfo;
  canNavigateToPast: boolean;
  canNavigateToFuture: boolean;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
  isViewingHistory: boolean;
}

export function useAthletePlan(): UseAthletePlanReturn {
  const { user, profile, canManageWorkouts } = useAuth();
  const [plans, setPlans] = useState<AthletePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calcular semanas permitidas usando função canônica
  // Normalizar para meia-noite local para evitar bugs de timezone
  const now = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  
  const allowedWeeks = useMemo(() => getAthleteAllowedWeeks(now), [now]);
  
  // Estado: qual das 3 semanas está selecionada (prev, curr, next)
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() => 
    getAthleteCurrentWeekStart(new Date())
  );

  // Sincronizar selectedWeekStart se estiver fora da janela permitida (ex: reload no domingo)
  useEffect(() => {
    const { prev, curr, next } = allowedWeeks;
    if (selectedWeekStart !== prev && selectedWeekStart !== curr && selectedWeekStart !== next) {
      console.log('ATHLETE_WEEK_SYNC', { 
        reason: 'selectedWeekStart fora da janela',
        old: selectedWeekStart,
        new: curr 
      });
      setSelectedWeekStart(curr);
    }
  }, [allowedWeeks, selectedWeekStart]);

  // LOG: ATHLETE_WEEK_RESOLVE ao inicializar/navegar
  useEffect(() => {
    console.log('ATHLETE_WEEK_RESOLVE', {
      now: new Date().toISOString(),
      dayOfWeek: new Date().getDay(),
      currentWeekStart: allowedWeeks.curr,
      selectedWeekStart,
      minWeekStart: allowedWeeks.prev,
      maxWeekStart: allowedWeeks.next,
    });
  }, [allowedWeeks, selectedWeekStart]);

  // Calcular informações da semana selecionada
  const currentWeek = useMemo((): WeekInfo => {
    const start = selectedWeekStart;
    const end = getWeekEndFromStart(start);
    const label = formatWeekLabel(start, end);
    
    return {
      start,
      end,
      label,
      isCurrent: start === allowedWeeks.curr,
      isPast: start === allowedWeeks.prev,
      isFuture: start === allowedWeeks.next,
    };
  }, [selectedWeekStart, allowedWeeks]);

  const hasCoach = !!profile?.coach_id;
  const userId = user?.id ?? null;

  // Navegação travada em 3 semanas
  const canNavigateToPast = selectedWeekStart !== allowedWeeks.prev;
  const canNavigateToFuture = selectedWeekStart !== allowedWeeks.next;

  const goToPreviousWeek = useCallback(() => {
    if (selectedWeekStart === allowedWeeks.curr) {
      setSelectedWeekStart(allowedWeeks.prev);
    } else if (selectedWeekStart === allowedWeeks.next) {
      setSelectedWeekStart(allowedWeeks.curr);
    }
    // Se já está no prev, não faz nada (guard interno)
  }, [selectedWeekStart, allowedWeeks]);

  const goToNextWeek = useCallback(() => {
    if (selectedWeekStart === allowedWeeks.prev) {
      setSelectedWeekStart(allowedWeeks.curr);
    } else if (selectedWeekStart === allowedWeeks.curr) {
      setSelectedWeekStart(allowedWeeks.next);
    }
    // Se já está no next, não faz nada (guard interno)
  }, [selectedWeekStart, allowedWeeks]);

  const goToCurrentWeek = useCallback(() => {
    setSelectedWeekStart(allowedWeeks.curr);
  }, [allowedWeeks]);

  // Fetch plans por week_start
  const fetchPlans = useCallback(async () => {
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
      // LOG: antes do fetch
      console.log('ATHLETE_PLAN_FETCH', {
        selectedWeekStart,
        userId,
      });

      // FONTE ÚNICA: Buscar por week_start
      const { data, error: fetchError } = await supabase
        .from('athlete_plans')
        .select('id, week_start, scheduled_date, title, plan_json, published_at, coach_id')
        .eq('athlete_user_id', userId)
        .eq('status', 'published')
        .eq('week_start', selectedWeekStart)
        .order('published_at', { ascending: false });

      if (fetchError) {
        console.error('[useAthletePlan] Fetch error:', fetchError);
        setError(fetchError.message || 'Erro ao carregar treinos');
        setPlans([]);
        
        // LOG: fetch falhou
        console.log('ATHLETE_PLAN_FETCH', {
          selectedWeekStart,
          found: false,
          error: fetchError.message,
        });
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

        console.log('ATHLETE_PLAN_FETCH', {
          selectedWeekStart,
          found: true,
          planCount: parsedPlans.length,
        });
        setPlans(parsedPlans);
      } else {
        console.log('ATHLETE_PLAN_FETCH', {
          selectedWeekStart,
          found: false,
        });
        setPlans([]);
      }
    } catch (err: any) {
      console.error('[useAthletePlan] Exception:', err);
      setError(err?.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, [userId, canManageWorkouts, selectedWeekStart]);

  // Re-fetch quando a semana mudar
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Primeiro plano
  const plan = plans.length > 0 ? plans[0] : null;

  // Agregar workouts
  const workouts = useMemo(() => {
    if (plans.length === 0) return EMPTY_WORKOUTS;
    
    const allWorkouts: DayWorkout[] = [];
    for (const p of plans) {
      allWorkouts.push(...p.workouts);
    }
    return allWorkouts;
  }, [plans]);

  // Organizar workouts por data
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
    currentWeek,
    canNavigateToPast,
    canNavigateToFuture,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    isViewingHistory: currentWeek.isPast,
  };
}
