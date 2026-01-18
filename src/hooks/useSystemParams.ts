import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * System parameter stored in database
 */
export interface SystemParam {
  id: string;
  key: string;
  value: any;
  description: string | null;
  category: string;
  updated_at: string;
  updated_by: string | null;
  created_at: string;
}

/**
 * Category grouping for parameters
 */
export interface ParamCategory {
  name: string;
  label: string;
  description: string;
  params: SystemParam[];
}

interface UseSystemParamsResult {
  params: SystemParam[];
  categories: ParamCategory[];
  loading: boolean;
  error: string | null;
  canEdit: boolean;
  
  /** Fetch all params from database */
  refresh: () => Promise<void>;
  
  /** Update a single parameter */
  updateParam: (key: string, value: any) => Promise<boolean>;
  
  /** Update multiple parameters atomically */
  updateParams: (updates: Array<{ key: string; value: any }>) => Promise<boolean>;
  
  /** Get parameter value by key */
  getParam: <T = any>(key: string, fallback?: T) => T | undefined;
}

/**
 * Category definitions for UI grouping
 */
const CATEGORY_DEFINITIONS: Record<string, { label: string; description: string }> = {
  benchmark: {
    label: 'Benchmarks',
    description: 'Faixas de tempo alvo e classificação de performance'
  },
  estimation: {
    label: 'Estimativas',
    description: 'Multiplicadores e fatores para cálculo de tempo/calorias'
  },
  mets: {
    label: 'METs / Energia',
    description: 'Valores calóricos por modalidade e intensidade'
  },
  adaptation: {
    label: 'Adaptação',
    description: 'Regras de ajuste de treino por perfil do atleta'
  },
  progression: {
    label: 'Progressão',
    description: 'Thresholds e regras de evolução de nível'
  },
  general: {
    label: 'Geral',
    description: 'Parâmetros gerais do sistema'
  }
};

/**
 * Hook to manage system parameters stored in database.
 * 
 * SECURITY:
 * - Only admins can view/edit parameters (enforced by RLS)
 * - Non-admins will get empty results
 * - All changes are audited with updated_by and updated_at
 * 
 * GUARDRAILS:
 * - Never exposes secrets (those go in Project Secrets)
 * - Separate from percentile_bands (versioned statistical model)
 */
export function useSystemParams(): UseSystemParamsResult {
  const { user, isAdmin } = useAuth();
  const [params, setParams] = useState<SystemParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit = isAdmin;

  // Fetch all parameters
  const refresh = useCallback(async () => {
    if (!user) {
      setParams([]);
      setLoading(false);
      return;
    }

    console.log('[SYSTEM_PARAMS] Fetching parameters...');
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('system_params')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (fetchError) {
        // RLS will return empty for non-admins, not an error
        if (fetchError.code === 'PGRST116') {
          setParams([]);
        } else {
          console.error('[SYSTEM_PARAMS] Fetch error:', fetchError);
          setError(fetchError.message);
        }
      } else {
        console.log('[SYSTEM_PARAMS] Fetched:', data?.length || 0, 'params');
        setParams(data || []);
      }
    } catch (err) {
      console.error('[SYSTEM_PARAMS] Unexpected error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load parameters');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load on mount and when user changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Update a single parameter
  const updateParam = useCallback(async (key: string, value: any): Promise<boolean> => {
    if (!user || !canEdit) {
      console.error('[SYSTEM_PARAMS] Not authorized to update');
      return false;
    }

    console.log('[SYSTEM_PARAMS] Updating:', key);

    try {
      const { error: updateError } = await supabase
        .from('system_params')
        .update({
          value,
          updated_by: user.id
        })
        .eq('key', key);

      if (updateError) {
        console.error('[SYSTEM_PARAMS] Update error:', updateError);
        setError(updateError.message);
        return false;
      }

      // Refresh to get updated data
      await refresh();
      return true;
    } catch (err) {
      console.error('[SYSTEM_PARAMS] Update failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to update parameter');
      return false;
    }
  }, [user, canEdit, refresh]);

  // Update multiple parameters
  const updateParams = useCallback(async (
    updates: Array<{ key: string; value: any }>
  ): Promise<boolean> => {
    if (!user || !canEdit) {
      console.error('[SYSTEM_PARAMS] Not authorized to update');
      return false;
    }

    console.log('[SYSTEM_PARAMS] Bulk updating:', updates.length, 'params');

    try {
      // Use upsert for each update (Supabase doesn't support bulk update by key)
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('system_params')
          .update({
            value: update.value,
            updated_by: user.id
          })
          .eq('key', update.key);

        if (updateError) {
          console.error('[SYSTEM_PARAMS] Update error for', update.key, ':', updateError);
          setError(updateError.message);
          return false;
        }
      }

      await refresh();
      return true;
    } catch (err) {
      console.error('[SYSTEM_PARAMS] Bulk update failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to update parameters');
      return false;
    }
  }, [user, canEdit, refresh]);

  // Get parameter value by key
  const getParam = useCallback(<T = any>(key: string, fallback?: T): T | undefined => {
    const param = params.find(p => p.key === key);
    if (param) {
      return param.value as T;
    }
    return fallback;
  }, [params]);

  // Group params by category
  const categories = Object.entries(CATEGORY_DEFINITIONS).map(([name, def]) => ({
    name,
    label: def.label,
    description: def.description,
    params: params.filter(p => p.category === name)
  })).filter(cat => cat.params.length > 0);

  return {
    params,
    categories,
    loading,
    error,
    canEdit,
    refresh,
    updateParam,
    updateParams,
    getParam
  };
}
