/**
 * useAthletePlan - Hook para carregar planos do atleta da tabela athlete_plans
 * 
 * REGRAS CANÔNICAS:
 * 1. Fonte única: week_start (não scheduled_date)
 * 2. Navegação travada em 3 semanas: -1, 0, +1
 * 3. Virada no domingo: se hoje é domingo, "ATUAL" = próxima semana
 * 4. Logs padronizados: ATHLETE_WEEK_RESOLVE, ATHLETE_PLAN_FETCH
 * 5. Persistência: semana selecionada é salva em localStorage e restaurada no reload
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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

// ============================================
// PERSISTÊNCIA DE SEMANA
// ============================================

/**
 * Salva a âncora da semana no localStorage
 */
function saveWeekAnchor(weekStart: string): void {
  try {
    localStorage.setItem(WEEK_ANCHOR_KEY, weekStart);
  } catch (e) {
    // Falha silenciosa (ex: storage bloqueado)
    console.warn('[WeekAnchor] Failed to save:', e);
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

    // Validar formato YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(stored)) return null;

    return stored;
  } catch (e) {
    console.warn('[WeekAnchor] Failed to load:', e);
    return null;
  }
}

/**
 * Determina a semana inicial considerando:
 * 1. Âncora persistida no localStorage (se válida e dentro da janela)
 * 2. Semana atual como fallback (e salva como default)
 */
function getInitialWeekStart(allowedWeeks: { prev: string; curr: string; next: string }): string {
  const storedAnchor = loadWeekAnchor();
  const allowed = new Set([allowedWeeks.prev, allowedWeeks.curr, allowedWeeks.next]);

  if (storedAnchor && allowed.has(storedAnchor)) {
    return storedAnchor;
  }

  // Fallback: usar semana atual e salvar
  saveWeekAnchor(allowedWeeks.curr);
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
        console.log('ATHLETE_WEEK_SYNC', {
          reason: 'selectedWeekStart fora da janela',
          old: prevSelected,
          new: curr,
        });
        return curr;
      }
      return prevSelected;
    });
  }, [allowedWeeks]);

  // Persistir semana selecionada SOMENTE após o primeiro render
  // (evita sobrescrever a âncora restaurada no boot)
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    saveWeekAnchor(selectedWeekStart);
  }, [selectedWeekStart]);

  // LOG: ATHLETE_WEEK_RESOLVE ao inicializar/navegar
  useEffect(() => {
    console.log('ATHLETE_WEEK_RESOLVE', {
      now: nowRef.current.toISOString(),
      dayOfWeek: nowRef.current.getDay(),
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
