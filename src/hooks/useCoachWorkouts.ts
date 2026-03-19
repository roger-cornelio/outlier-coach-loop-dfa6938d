/**
 * useCoachWorkouts - Hook para gerenciar treinos do coach no banco de dados
 * 
 * REGRAS DE VISIBILIDADE:
 * - Coach vê todos os seus treinos (qualquer status)
 * - Atleta vê APENAS treinos com status='published' AND price=0
 * 
 * REGRA MVP0: Benchmark só pode ser definido por ADMIN.
 * Coach não pode salvar isBenchmark - campo é automaticamente removido.
 * 
 * GATEKEEPER: Validação síncrona via IA antes do salvamento.
 * - Cenário A (parse_failure): IA rodou mas não encontrou exercícios → modal laranja
 * - Cenário B (infra_failure): Timeout/erro de rede → modal vermelho
 * - Preservação parcial: blocos que parsearam com sucesso mantêm dados
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DayWorkout, WorkoutBlock } from '@/types/outlier';
import { normalizeWorkoutsForPersistence } from '@/utils/workoutSerialization';
import type { GatekeeperErrorType, FailedBlock } from '@/components/WorkoutParseValidationModal';

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
  week_start: string | null;
}

/** Resultado da validação Gatekeeper */
export interface GatekeeperResult {
  success: boolean;
  errorType?: GatekeeperErrorType;
  failedBlocks: FailedBlock[];
  enrichedWorkouts: DayWorkout[];
}

interface UseCoachWorkoutsReturn {
  // Estado
  workouts: CoachWorkout[];
  loading: boolean;
  error: string | null;
  
  // Gatekeeper state
  gatekeeperResult: GatekeeperResult | null;
  clearGatekeeperResult: () => void;
  
  // Actions para coach
  saveWorkout: (title: string, workoutData: DayWorkout[], status?: WorkoutStatus, price?: number, weekStart?: string | null) => Promise<string | null>;
  /** Forçar salvamento ignorando validação (bypass consciente) */
  forceSaveWorkout: (title: string, workoutData: DayWorkout[], status?: WorkoutStatus, price?: number, weekStart?: string | null) => Promise<string | null>;
  updateWorkout: (id: string, updates: Partial<Pick<CoachWorkout, 'title' | 'workout_json' | 'status' | 'price'>>) => Promise<boolean>;
  publishWorkout: (id: string) => Promise<boolean>;
  archiveWorkout: (id: string) => Promise<boolean>;
  deleteWorkout: (id: string) => Promise<boolean>;
  duplicateAsDraft: (id: string) => Promise<string | null>;
  
  // Actions para atleta
  fetchAvailableWorkouts: () => Promise<DayWorkout[]>;
  
  // Refresh
  refetch: () => Promise<void>;
}

const PARSE_TIMEOUT_MS = 15_000;

/**
 * REGRA MVP0: Remove isBenchmark de todos os blocos se não for admin
 */
function stripBenchmarkIfNotAdmin(
  workoutData: DayWorkout[],
  isAdmin: boolean
): DayWorkout[] {
  if (isAdmin) return workoutData;

  return workoutData.map(day => ({
    ...day,
    blocks: day.blocks.map(block => {
      const { isBenchmark, ...cleanBlock } = block as WorkoutBlock & { isBenchmark?: boolean };
      return cleanBlock;
    }),
  }));
}

/**
 * Chama a Edge Function parse-workout-blocks com timeout
 */
async function callParseWorkoutBlocks(
  blocks: { blockId: string; blockType: string; content: string; title?: string }[]
): Promise<{ results?: any[]; error?: string; errorType?: string }> {
  try {
    const result = await Promise.race([
      supabase.functions.invoke('parse-workout-blocks', {
        body: { blocks },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), PARSE_TIMEOUT_MS)
      ),
    ]);

    const { data, error } = result as { data: any; error: any };

    if (error) {
      console.error('[Gatekeeper] Edge function error:', error);
      return { error: error.message || 'Edge function error', errorType: 'infra' };
    }

    if (data?.error) {
      return { error: data.error, errorType: data.errorType || 'infra' };
    }

    return { results: data?.results || [] };
  } catch (err: any) {
    if (err.message === 'TIMEOUT') {
      return { error: 'Timeout após 15 segundos', errorType: 'infra' };
    }
    return { error: err.message || 'Unknown error', errorType: 'infra' };
  }
}

/**
 * Valida blocos via IA e retorna resultado do Gatekeeper
 * Preservação parcial: blocos que parsearam com sucesso mantêm dados
 */
async function runGatekeeper(workoutData: DayWorkout[]): Promise<GatekeeperResult> {
  // Coletar blocos que precisam de validação (excluir notas e dias de descanso)
  const blocksToValidate: { blockId: string; blockType: string; content: string; title?: string; dayIndex: number; blockIndex: number }[] = [];
  
  workoutData.forEach((day, dayIdx) => {
    if (day.isRestDay) return;
    day.blocks.forEach((block, blockIdx) => {
      if (block.type === 'notas') return;
      blocksToValidate.push({
        blockId: block.id,
        blockType: block.type,
        content: block.content || '',
        title: block.title || undefined,
        dayIndex: dayIdx,
        blockIndex: blockIdx,
      });
    });
  });

  if (blocksToValidate.length === 0) {
    // Nenhum bloco para validar (todos são notas/descanso)
    return { success: true, failedBlocks: [], enrichedWorkouts: workoutData };
  }

  const response = await callParseWorkoutBlocks(
    blocksToValidate.map(b => ({ blockId: b.blockId, blockType: b.blockType, content: b.content }))
  );

  if (response.error) {
    // Cenário B: Erro de infraestrutura
    return {
      success: false,
      errorType: 'infra_failure',
      failedBlocks: blocksToValidate.map(b => ({
        blockId: b.blockId,
        blockTitle: workoutData[b.dayIndex].blocks[b.blockIndex].title || `Bloco ${b.blockIndex + 1}`,
        blockType: workoutData[b.dayIndex].blocks[b.blockIndex].type,
        reason: response.error!,
      })),
      enrichedWorkouts: workoutData,
    };
  }

  // Processar resultados - preservação parcial
  const failedBlocks: FailedBlock[] = [];
  const enrichedWorkouts = workoutData.map((day, dayIdx) => ({
    ...day,
    blocks: day.blocks.map((block, blockIdx) => {
      const validationEntry = blocksToValidate.find(
        b => b.dayIndex === dayIdx && b.blockIndex === blockIdx
      );
      if (!validationEntry) return block; // Bloco isento (notas/descanso)

      const result = response.results?.find((r: any) => r.blockId === block.id);
      
      if (!result || result.parseStatus === 'failed') {
        // IA não conseguiu parsear
        failedBlocks.push({
          blockId: block.id,
          blockTitle: block.title || `Bloco ${blockIdx + 1}`,
          blockType: block.type,
          reason: result?.error || 'Sem resposta da IA',
        });
        return { ...block, parseStatus: 'failed' as const, parsedAt: new Date().toISOString() };
      }

      if (result.parsedExercises.length === 0) {
        // Cenário A: IA rodou mas não encontrou exercícios
        failedBlocks.push({
          blockId: block.id,
          blockTitle: block.title || `Bloco ${blockIdx + 1}`,
          blockType: block.type,
          reason: 'Nenhum exercício reconhecido',
        });
        return { ...block, parsedExercises: [], parseStatus: 'failed' as const, parsedAt: new Date().toISOString() };
      }

      // Sucesso: enriquecer bloco com dados parseados
      return {
        ...block,
        parsedExercises: result.parsedExercises,
        parseStatus: 'completed' as const,
        parsedAt: new Date().toISOString(),
      };
    }),
  }));

  if (failedBlocks.length > 0) {
    return {
      success: false,
      errorType: 'parse_failure',
      failedBlocks,
      enrichedWorkouts,
    };
  }

  return { success: true, failedBlocks: [], enrichedWorkouts };
}

export function useCoachWorkouts(): UseCoachWorkoutsReturn {
  const { profile, isCoach, isAdmin, isSuperAdmin } = useAuth();
  const [workouts, setWorkouts] = useState<CoachWorkout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gatekeeperResult, setGatekeeperResult] = useState<GatekeeperResult | null>(null);

  const canManageWorkouts = isCoach || isAdmin || isSuperAdmin;

  const clearGatekeeperResult = useCallback(() => setGatekeeperResult(null), []);

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

      const parsed = (data || []).map((w) => ({
        ...w,
        status: w.status as WorkoutStatus,
        workout_json: (w.workout_json as unknown as DayWorkout[]) || [],
        week_start: w.week_start || null,
      }));

      setWorkouts(parsed);
    } catch (err) {
      console.error('[useCoachWorkouts] Error fetching workouts:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar treinos');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, canManageWorkouts]);

  useEffect(() => {
    if (canManageWorkouts && profile?.id) {
      fetchCoachWorkouts();
    }
  }, [canManageWorkouts, profile?.id, fetchCoachWorkouts]);

  /** Persistir treino no banco (sem validação - usado internamente) */
  const persistWorkout = useCallback(async (
    title: string,
    workoutData: DayWorkout[],
    status: WorkoutStatus = 'draft',
    price: number = 0,
    weekStart: string | null = null
  ): Promise<string | null> => {
    if (!profile?.id) {
      setError('Perfil não encontrado');
      return null;
    }

    try {
      const sanitizedWorkouts = stripBenchmarkIfNotAdmin(workoutData, isAdmin || isSuperAdmin);
      const normalizedWorkouts = normalizeWorkoutsForPersistence(sanitizedWorkouts);
      
      const insertPayload: Record<string, unknown> = {
        coach_id: profile.id,
        title,
        workout_json: JSON.parse(JSON.stringify(normalizedWorkouts)),
        status,
        price,
      };
      
      if (weekStart) {
        insertPayload.week_start = weekStart;
      }

      const { data, error: insertError } = await supabase
        .from('workouts')
        .insert([insertPayload] as any)
        .select('id')
        .single();

      if (insertError) throw insertError;

      await fetchCoachWorkouts();
      return data?.id || null;
    } catch (err) {
      console.error('[useCoachWorkouts] Error saving workout:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar treino');
      return null;
    }
  }, [profile?.id, fetchCoachWorkouts, isAdmin, isSuperAdmin]);

  /**
   * SAVE COM GATEKEEPER: Validação síncrona bloqueante
   * 1. Trava a UI (loading)
   * 2. Chama parse-workout-blocks
   * 3. Se falhar → retorna null e seta gatekeeperResult para exibir modal
   * 4. Se sucesso → salva com dados enriquecidos
   */
  const saveWorkout = useCallback(async (
    title: string,
    workoutData: DayWorkout[],
    status: WorkoutStatus = 'draft',
    price: number = 0,
    weekStart: string | null = null
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);
    setGatekeeperResult(null);

    try {
      // Rodar Gatekeeper
      const result = await runGatekeeper(workoutData);

      if (!result.success) {
        // Gatekeeper bloqueou - exibir modal
        setGatekeeperResult(result);
        setLoading(false);
        return null;
      }

      // Gatekeeper aprovou - salvar com dados enriquecidos
      const savedId = await persistWorkout(title, result.enrichedWorkouts, status, price, weekStart);
      return savedId;
    } catch (err) {
      console.error('[useCoachWorkouts] Gatekeeper error:', err);
      const errMsg = err instanceof Error ? err.message : 'Erro na validação';
      setError(errMsg);
      // Bug fix: setar gatekeeperResult para abrir modal vermelho (Cenário B)
      setGatekeeperResult({
        success: false,
        errorType: 'infra_failure',
        failedBlocks: [{
          blockId: 'global',
          blockTitle: 'Erro de infraestrutura',
          blockType: 'unknown',
          reason: errMsg,
        }],
        enrichedWorkouts: workoutData,
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [persistWorkout]);

  /**
   * FORCE SAVE: Bypass consciente do Gatekeeper
   * Preserva parsedExercises dos blocos que foram parseados com sucesso
   * Marca blocos que falharam com parseStatus: 'bypassed'
   */
  const forceSaveWorkout = useCallback(async (
    title: string,
    workoutData: DayWorkout[],
    status: WorkoutStatus = 'draft',
    price: number = 0,
    weekStart: string | null = null
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      // Se temos resultado do gatekeeper, usar os dados enriquecidos (preservação parcial)
      let dataToSave = workoutData;
      
      if (gatekeeperResult?.enrichedWorkouts) {
        // Marcar blocos que falharam como 'bypassed' em vez de 'failed'
        dataToSave = gatekeeperResult.enrichedWorkouts.map(day => ({
          ...day,
          blocks: day.blocks.map(block => {
            if (block.parseStatus === 'failed') {
              return { ...block, parseStatus: 'bypassed' as const };
            }
            return block;
          }),
        }));
      }

      const savedId = await persistWorkout(title, dataToSave, status, price, weekStart);
      setGatekeeperResult(null);
      return savedId;
    } catch (err) {
      console.error('[useCoachWorkouts] Force save error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao forçar salvamento');
      return null;
    } finally {
      setLoading(false);
    }
  }, [persistWorkout, gatekeeperResult]);

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
        const sanitizedWorkouts = stripBenchmarkIfNotAdmin(updates.workout_json, isAdmin || isSuperAdmin);
        const normalizedWorkouts = normalizeWorkoutsForPersistence(sanitizedWorkouts);
        updatePayload.workout_json = normalizedWorkouts as unknown as Record<string, unknown>;
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
  }, [fetchCoachWorkouts, isAdmin, isSuperAdmin]);

  const publishWorkout = useCallback(async (id: string): Promise<boolean> => {
    return updateWorkout(id, { status: 'published', price: 0 });
  }, [updateWorkout]);

  const archiveWorkout = useCallback(async (id: string): Promise<boolean> => {
    return updateWorkout(id, { status: 'archived' });
  }, [updateWorkout]);

  const deleteWorkout = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const workout = workouts.find(w => w.id === id);
      
      if (workout && workout.status === 'published' && workout.week_start && profile?.id) {
        const { error: plansDeleteError } = await supabase
          .from('athlete_plans')
          .delete()
          .eq('coach_id', profile.id)
          .eq('week_start', workout.week_start);

        if (plansDeleteError) {
          console.error('[useCoachWorkouts] Error deleting athlete_plans:', plansDeleteError);
        }
      }

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
  }, [fetchCoachWorkouts, workouts, profile?.id]);

  const fetchAvailableWorkouts = useCallback(async (): Promise<DayWorkout[]> => {
    try {
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

  const duplicateAsDraft = useCallback(async (id: string): Promise<string | null> => {
    const workout = workouts.find(w => w.id === id);
    if (!workout) {
      setError('Treino não encontrado');
      return null;
    }

    const newTitle = `${workout.title} (Edição)`;
    // Duplicação usa persistWorkout direto (sem Gatekeeper, pois os dados já foram validados)
    return persistWorkout(newTitle, workout.workout_json, 'draft', 0);
  }, [workouts, persistWorkout]);

  return {
    workouts,
    loading,
    error,
    gatekeeperResult,
    clearGatekeeperResult,
    saveWorkout,
    forceSaveWorkout,
    updateWorkout,
    publishWorkout,
    archiveWorkout,
    deleteWorkout,
    duplicateAsDraft,
    fetchAvailableWorkouts,
    refetch: fetchCoachWorkouts,
  };
}
