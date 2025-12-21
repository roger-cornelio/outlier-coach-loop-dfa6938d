/**
 * useAthletePlan - Hook para carregar planos do atleta da tabela athlete_plans
 * 
 * REGRAS DE EXIBIÇÃO (ANTI-BUG):
 * 1. scheduled_date é OBRIGATÓRIA - treinos sem data são IGNORADOS
 * 2. Buscar apenas treinos com status='published' e scheduled_date dentro da semana SELECIONADA
 * 3. Semana futura: treinos NÃO aparecem até a semana iniciar
 * 4. Semana passada: treinos aparecem apenas no Histórico (read-only)
 * 5. Treinos legados sem data são logados como warning
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DayWorkout } from '@/types/outlier';
import { filterValidWorkouts } from '@/utils/workoutValidation';

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
  // Lista de todos os planos da semana selecionada
  plans: AthletePlan[];
  // Plano principal (primeiro da lista, para compatibilidade)
  plan: AthletePlan | null;
  // Workouts agregados de todos os planos
  workouts: DayWorkout[];
  // Workouts organizados por data agendada
  workoutsByDate: Map<string, DayWorkout[]>;
  loading: boolean;
  error: string | null;
  hasCoach: boolean;
  refetch: () => Promise<void>;
  // Navegação por semana
  currentWeek: WeekInfo;
  canNavigateToPast: boolean;
  canNavigateToFuture: boolean;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
  // Histórico (semanas passadas)
  isViewingHistory: boolean;
}

// Calcula o início da semana (segunda-feira) a partir de uma data
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Calcula o fim da semana (domingo) a partir de uma data
function getWeekEnd(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Formatar label da semana
function formatWeekLabel(start: string, end: string): string {
  const startDate = new Date(start + 'T12:00:00');
  const endDate = new Date(end + 'T12:00:00');
  
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startMonth = startDate.toLocaleDateString('pt-BR', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('pt-BR', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

// Obter informações da semana
function getWeekInfo(referenceDate: Date): WeekInfo {
  const start = getWeekStart(referenceDate);
  const end = getWeekEnd(referenceDate);
  
  const today = new Date();
  const currentWeekStart = getWeekStart(today);
  
  const startDate = new Date(start + 'T00:00:00');
  const currentStartDate = new Date(currentWeekStart + 'T00:00:00');
  
  return {
    start,
    end,
    label: formatWeekLabel(start, end),
    isCurrent: start === currentWeekStart,
    isPast: startDate < currentStartDate,
    isFuture: startDate > currentStartDate,
  };
}

export function useAthletePlan(): UseAthletePlanReturn {
  const { user, profile, canManageWorkouts } = useAuth();
  const [plans, setPlans] = useState<AthletePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado de navegação por semana
  const [weekOffset, setWeekOffset] = useState(0); // 0 = semana atual, -1 = semana anterior, etc.

  // Calcular a semana selecionada baseada no offset
  const selectedWeekDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + (weekOffset * 7));
    return date;
  }, [weekOffset]);

  const weekStart = useMemo(() => getWeekStart(selectedWeekDate), [selectedWeekDate]);
  const weekEnd = useMemo(() => getWeekEnd(selectedWeekDate), [selectedWeekDate]);
  
  const currentWeek = useMemo(() => getWeekInfo(selectedWeekDate), [selectedWeekDate]);

  const hasCoach = !!profile?.coach_id;
  const userId = user?.id ?? null;

  // Navegação
  const goToPreviousWeek = useCallback(() => {
    setWeekOffset(prev => prev - 1);
  }, []);

  const goToNextWeek = useCallback(() => {
    // NÃO permitir navegar para semanas futuras (atleta não pode ver treinos futuros)
    if (weekOffset >= 0) return;
    setWeekOffset(prev => prev + 1);
  }, [weekOffset]);

  const goToCurrentWeek = useCallback(() => {
    setWeekOffset(0);
  }, []);

  // Atleta NÃO pode ver semanas futuras
  const canNavigateToFuture = weekOffset < 0;
  // Pode ver histórico (limite de 12 semanas para não sobrecarregar)
  const canNavigateToPast = weekOffset > -12;

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
      // Buscar treinos publicados com scheduled_date dentro da semana SELECIONADA
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
        // Filtrar treinos válidos (com scheduled_date) - loga legados automaticamente
        const validData = filterValidWorkouts(data, 'useAthletePlan');

        const parsedPlans: AthletePlan[] = validData.map((row: any) => {
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

        console.log(`[useAthletePlan] Found ${parsedPlans.length} plans for week:`, weekStart, '-', weekEnd);
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

  // Re-fetch quando a semana mudar
  useEffect(() => {
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
    // Navegação
    currentWeek,
    canNavigateToPast,
    canNavigateToFuture,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    isViewingHistory: currentWeek.isPast,
  };
}
