/**
 * useAthletePlan - Hook para carregar planos do atleta da tabela athlete_plans
 * 
 * REGRAS CANÔNICAS:
 * 1. Fonte única: week_start (não scheduled_date)
 * 2. Navegação travada em 3 semanas: -1, 0, +1
 * 3. Virada no domingo: se hoje é domingo, "ATUAL" = próxima semana
 * 
 * REGRA DE BOOT (PRIMEIRO MOUNT):
 * - SEMPRE forçar semana atual no primeiro mount após login
 * - IGNORAR qualquer semana persistida no localStorage durante boot
 * - Só persistir semana após navegação MANUAL do usuário
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import type { DayWorkout } from '@/types/outlier';
import {
  getAthleteCurrentWeekStart,
  getAthleteAllowedWeeks,
  getWeekEndFromStart,
  formatWeekLabel,
} from '@/utils/weekCalculations';

const EMPTY_WORKOUTS: DayWorkout[] = [];
const WEEK_ANCHOR_KEY = 'outlier_week_anchor';
const WEEK_USER_NAVIGATED_KEY = 'outlier_week_user_navigated';

// ============================================
// PERSISTÊNCIA DE SEMANA
// ============================================

/**
 * Salva a âncora da semana no localStorage
 * SOMENTE chamado após navegação manual do usuário
 */
function saveWeekAnchor(weekStart: string): void {
  try {
    localStorage.setItem(WEEK_ANCHOR_KEY, weekStart);
  } catch (e) {
    console.warn('[WeekAnchor] Failed to save:', e);
  }
}

/**
 * Marca que o usuário navegou manualmente
 */
function markUserNavigated(): void {
  try {
    localStorage.setItem(WEEK_USER_NAVIGATED_KEY, 'true');
  } catch (e) {
    // Falha silenciosa
  }
}

/**
 * Verifica se o usuário já navegou manualmente nesta sessão
 */
function hasUserNavigated(): boolean {
  try {
    return localStorage.getItem(WEEK_USER_NAVIGATED_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * Limpa flag de navegação (chamado no logout ou novo login)
 */
function clearUserNavigatedFlag(): void {
  try {
    localStorage.removeItem(WEEK_USER_NAVIGATED_KEY);
  } catch (e) {
    // Falha silenciosa
  }
}

/**
 * Lê a âncora da semana do localStorage
 * Retorna null se não existir ou for inválida
 */
function loadWeekAnchor(): string | null {
  try {
    const stored = localStorage.getItem(WEEK_ANCHOR_KEY);
    if (!stored) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(stored)) return null;
    return stored;
  } catch (e) {
    return null;
  }
}

/**
 * Determina a semana inicial:
 * - Se usuário navegou manualmente E âncora está dentro da janela → usar âncora
 * - Caso contrário → SEMPRE semana atual (REGRA DE BOOT)
 */
function getInitialWeekStart(allowedWeeks: { prev: string; curr: string; next: string }): string {
  // REGRA DE BOOT: Se não houve navegação manual, forçar semana atual
  if (!hasUserNavigated()) {
    return allowedWeeks.curr;
  }
  
  // Se usuário navegou manualmente, tentar restaurar âncora
  const storedAnchor = loadWeekAnchor();
  const allowed = new Set([allowedWeeks.prev, allowedWeeks.curr, allowedWeeks.next]);

  if (storedAnchor && allowed.has(storedAnchor)) {
    return storedAnchor;
  }

  // Fallback: semana atual
  return allowedWeeks.curr;
}

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

export interface WeekDebugInfo {
  now: string;
  currentWeekStart: string;
  selectedWeekStart: string;
  minWeekStart: string;
  maxWeekStart: string;
  hasPlanForSelectedWeek: boolean;
  plansFoundWeekStarts: string[];
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
  // Debug info para a debug bar
  debugInfo: WeekDebugInfo;
  resetToCurrentWeek: () => void;
}

export function useAthletePlan(): UseAthletePlanReturn {
  const { user, profile, canManageWorkouts } = useAuth();
  const [plans, setPlans] = useState<AthletePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CRÍTICO: Calcular semanas permitidas de forma estável usando useRef
  // Isso evita recálculo em cada render mas permite atualização manual
  const nowRef = useRef(new Date());
  
  // Calcular allowedWeeks de forma estável
  const allowedWeeks = useMemo(() => {
    const now = nowRef.current;
    return getAthleteAllowedWeeks(now);
  }, []); // Deps vazias - calculado apenas no mount
  
  // Estado: qual das 3 semanas está selecionada
  // CRÍTICO: Inicializar com âncora persistida ou semana atual
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() => {
    const allowed = getAthleteAllowedWeeks(new Date());
    return getInitialWeekStart(allowed);
  });

  // Ref: impedir overwrite do localStorage no primeiro render
  const isFirstRenderRef = useRef(true);

  // Sincronizar selectedWeekStart se estiver fora da janela permitida
  // Usando functional update para evitar loops
  useEffect(() => {
    const { prev, curr, next } = allowedWeeks;
    const allowed = new Set([prev, curr, next]);

    setSelectedWeekStart(prevSelected => {
      if (!allowed.has(prevSelected)) {
        return curr;
      }
      return prevSelected;
    });
  }, [allowedWeeks]);

  // Persistir semana selecionada SOMENTE após navegação manual
  // (não persistir durante boot)
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    // Marcar que usuário navegou manualmente e salvar âncora
    markUserNavigated();
    saveWeekAnchor(selectedWeekStart);
  }, [selectedWeekStart]);

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

  // Guard: verificar se destino está dentro da janela permitida
  const isAllowedWeek = useCallback((weekStart: string): boolean => {
    const allowed = new Set([allowedWeeks.prev, allowedWeeks.curr, allowedWeeks.next]);
    return allowed.has(weekStart);
  }, [allowedWeeks]);

  const goToPreviousWeek = useCallback(() => {
    const { prev, curr, next } = allowedWeeks;
    
    let target: string | null = null;
    if (selectedWeekStart === curr) {
      target = prev;
    } else if (selectedWeekStart === next) {
      target = curr;
    }
    
    if (target && isAllowedWeek(target)) {
      setSelectedWeekStart(target);
    } else if (!canNavigateToPast) {
      toast({
        title: "Limite atingido",
        description: "Você só pode navegar entre semana anterior, atual e próxima.",
        variant: "destructive",
      });
    }
  }, [selectedWeekStart, allowedWeeks, isAllowedWeek, canNavigateToPast]);

  const goToNextWeek = useCallback(() => {
    const { prev, curr, next } = allowedWeeks;
    
    let target: string | null = null;
    if (selectedWeekStart === prev) {
      target = curr;
    } else if (selectedWeekStart === curr) {
      target = next;
    }
    
    if (target && isAllowedWeek(target)) {
      setSelectedWeekStart(target);
    } else if (!canNavigateToFuture) {
      toast({
        title: "Limite atingido",
        description: "Você só pode navegar entre semana anterior, atual e próxima.",
        variant: "destructive",
      });
    }
  }, [selectedWeekStart, allowedWeeks, isAllowedWeek, canNavigateToFuture]);

  const goToCurrentWeek = useCallback(() => {
    setSelectedWeekStart(allowedWeeks.curr);
  }, [allowedWeeks]);

  const resetToCurrentWeek = useCallback(() => {
    // Limpar flag de navegação para forçar boot limpo
    clearUserNavigatedFlag();
    nowRef.current = new Date();
    setSelectedWeekStart(getAthleteCurrentWeekStart(nowRef.current));
  }, []);

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

        setPlans(parsedPlans);
      } else {
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

  // ============================================
  // REALTIME: Subscription para mudanças em athlete_plans
  // ============================================
  useEffect(() => {
    if (!userId || canManageWorkouts) return;

    const channel: RealtimeChannel = supabase
      .channel(`athlete-plans-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'athlete_plans',
          filter: `athlete_user_id=eq.${userId}`,
        },
        () => {
          console.log('[useAthletePlan] Realtime: change detected, refetching...');
          fetchPlans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, canManageWorkouts, fetchPlans]);

  // ============================================
  // VISIBILITY: Refetch quando o usuário volta para a aba
  // ============================================
  useEffect(() => {
    if (!userId || canManageWorkouts) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useAthletePlan] Tab visible, refetching...');
        fetchPlans();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, canManageWorkouts, fetchPlans]);

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

  // Debug info para a debug bar
  const debugInfo: WeekDebugInfo = useMemo(() => ({
    now: nowRef.current.toISOString(),
    currentWeekStart: allowedWeeks.curr,
    selectedWeekStart,
    minWeekStart: allowedWeeks.prev,
    maxWeekStart: allowedWeeks.next,
    hasPlanForSelectedWeek: plans.length > 0,
    plansFoundWeekStarts: plans.map(p => p.week_start),
  }), [allowedWeeks, selectedWeekStart, plans]);

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
    debugInfo,
    resetToCurrentWeek,
  };
}
