/**
 * useCoachWorkouts - Hook para gerenciar treinos do coach no banco de dados
 * 
 * REGRAS DE VISIBILIDADE:
 * - Coach vê todos os seus treinos (qualquer status)
 * - Atleta vê APENAS treinos com status='published' AND price=0
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { DayWorkout } from '@/types/outlier';

export type WorkoutStatus = 'draft' | 'published' | 'archived';

export interface CoachWorkout {
  id: string;
  coach_id: string;
  title: string;
  workout_json: DayWorkout[];
  price: number;
  status: WorkoutStatus;
  created_at: string;
  updated_at: string;
}

interface UseCoachWorkoutsReturn {
  // Estado
  workouts: CoachWorkout[];
  loading: boolean;
  error: string | null;
  
  // Actions para coach
  saveWorkout: (title: string, workoutData: DayWorkout[], status?: WorkoutStatus, price?: number) => Promise<string | null>;
  updateWorkout: (id: string, updates: Partial<Pick<CoachWorkout, 'title' | 'workout_json' | 'status' | 'price'>>) => Promise<boolean>;
  publishWorkout: (id: string) => Promise<boolean>;
  archiveWorkout: (id: string) => Promise<boolean>;
  deleteWorkout: (id: string) => Promise<boolean>;
  
  // Actions para atleta
  fetchAvailableWorkouts: () => Promise<DayWorkout[]>;
  
  // Refresh
  refetch: () => Promise<void>;
}

export function useCoachWorkouts(): UseCoachWorkoutsReturn {
  const { profile, isCoach, isAdmin, isSuperAdmin } = useAuth();
  const [workouts, setWorkouts] = useState<CoachWorkout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManageWorkouts = isCoach || isAdmin || isSuperAdmin;

  // Fetch coach's own workouts
  const fetchCoachWorkouts = useCallback(async () => {
    if (!profile?.id || !canManageWorkouts) {
      setWorkouts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('workouts')
        .select('*')
        .eq('coach_id', profile.id)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Parse workout_json for each workout
      const parsed = (data || []).map((w) => ({
        ...w,
        status: w.status as WorkoutStatus,
        workout_json: (w.workout_json as unknown as DayWorkout[]) || [],
      }));

      setWorkouts(parsed);
    } catch (err) {
      console.error('[useCoachWorkouts] Error fetching workouts:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar treinos');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, canManageWorkouts]);

  // Auto-fetch on mount for coaches
  useEffect(() => {
    if (canManageWorkouts && profile?.id) {
      fetchCoachWorkouts();
    }
  }, [canManageWorkouts, profile?.id, fetchCoachWorkouts]);

  // Save new workout
  const saveWorkout = useCallback(async (
    title: string,
    workoutData: DayWorkout[],
    status: WorkoutStatus = 'draft',
    price: number = 0
  ): Promise<string | null> => {
    if (!profile?.id) {
      setError('Perfil não encontrado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Cast workout_json to any to bypass strict JSON type checking
      const insertPayload = {
        coach_id: profile.id,
        title,
        workout_json: JSON.parse(JSON.stringify(workoutData)),
        status,
        price,
      };

      const { data, error: insertError } = await supabase
        .from('workouts')
        .insert([insertPayload] as any)
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Refresh list
      await fetchCoachWorkouts();

      return data?.id || null;
    } catch (err) {
      console.error('[useCoachWorkouts] Error saving workout:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar treino');
      return null;
    } finally {
      setLoading(false);
    }
  }, [profile?.id, fetchCoachWorkouts]);

  // Update existing workout
  const updateWorkout = useCallback(async (
    id: string,
    updates: Partial<Pick<CoachWorkout, 'title' | 'workout_json' | 'status' | 'price'>>
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const updatePayload: Record<string, unknown> = {};
      
      if (updates.title !== undefined) updatePayload.title = updates.title;
      if (updates.status !== undefined) updatePayload.status = updates.status;
      if (updates.price !== undefined) updatePayload.price = updates.price;
      if (updates.workout_json !== undefined) {
        updatePayload.workout_json = updates.workout_json as unknown as Record<string, unknown>;
      }

      const { error: updateError } = await supabase
        .from('workouts')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchCoachWorkouts();
      return true;
    } catch (err) {
      console.error('[useCoachWorkouts] Error updating workout:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar treino');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchCoachWorkouts]);

  // Publish workout (sets status=published, price=0)
  const publishWorkout = useCallback(async (id: string): Promise<boolean> => {
    return updateWorkout(id, { status: 'published', price: 0 });
  }, [updateWorkout]);

  // Archive workout
  const archiveWorkout = useCallback(async (id: string): Promise<boolean> => {
    return updateWorkout(id, { status: 'archived' });
  }, [updateWorkout]);

  // Delete workout
  const deleteWorkout = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('workouts')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchCoachWorkouts();
      return true;
    } catch (err) {
      console.error('[useCoachWorkouts] Error deleting workout:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar treino');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchCoachWorkouts]);

  // Fetch available workouts for athletes (published + free)
  const fetchAvailableWorkouts = useCallback(async (): Promise<DayWorkout[]> => {
    try {
      // RLS policy already filters: status='published' AND price=0
      const { data, error: fetchError } = await supabase
        .from('workouts')
        .select('workout_json, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const workoutJson = data[0].workout_json;
        if (Array.isArray(workoutJson)) {
          return workoutJson as unknown as DayWorkout[];
        }
      }

      return [];
    } catch (err) {
      console.error('[useCoachWorkouts] Error fetching available workouts:', err);
      return [];
    }
  }, []);

  return {
    workouts,
    loading,
    error,
    saveWorkout,
    updateWorkout,
    publishWorkout,
    archiveWorkout,
    deleteWorkout,
    fetchAvailableWorkouts,
    refetch: fetchCoachWorkouts,
  };
}
