/**
 * Hook para persistir o estilo do coach no perfil do usuário
 * 
 * O coach_style é salvo no banco de dados e carregado automaticamente
 * nos próximos logins, eliminando a necessidade de re-seleção.
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import type { CoachStyle } from '@/types/outlier';

export function useCoachStylePersistence() {
  const { user, profile } = useAuth();
  const { coachStyle, setCoachStyle } = useOutlierStore();

  /**
   * Salva o estilo do coach no banco de dados
   */
  const saveCoachStyle = useCallback(async (style: CoachStyle): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ coach_style: style })
        .eq('user_id', user.id);

      if (error) {
        console.error('[useCoachStylePersistence] Error saving coach_style:', error);
        return { success: false, error: error.message };
      }

      // Atualiza o store local também
      setCoachStyle(style);
      
      console.log('[useCoachStylePersistence] Coach style saved:', style);
      return { success: true };
    } catch (err) {
      console.error('[useCoachStylePersistence] Unexpected error:', err);
      return { success: false, error: 'Erro ao salvar preferência' };
    }
  }, [user, setCoachStyle]);

  /**
   * Carrega o estilo do coach do banco de dados para o store
   * Retorna true se encontrou um estilo salvo, false caso contrário
   */
  const loadCoachStyleFromProfile = useCallback((): boolean => {
    if (!profile?.coach_style) {
      return false;
    }

    const savedStyle = profile.coach_style as CoachStyle;
    
    // Valida se é um estilo válido
    if (['IRON', 'PULSE', 'SPARK'].includes(savedStyle)) {
      // Só atualiza se diferente do atual (evita loops)
      if (coachStyle !== savedStyle) {
        setCoachStyle(savedStyle);
        console.log('[useCoachStylePersistence] Coach style loaded from profile:', savedStyle);
      }
      return true;
    }

    return false;
  }, [profile?.coach_style, coachStyle, setCoachStyle]);

  /**
   * Verifica se o usuário já tem um estilo salvo no perfil
   */
  const hasPersistedCoachStyle = (): boolean => {
    const style = profile?.coach_style;
    return !!style && ['IRON', 'PULSE', 'SPARK'].includes(style);
  };

  return {
    saveCoachStyle,
    loadCoachStyleFromProfile,
    hasPersistedCoachStyle,
    persistedCoachStyle: profile?.coach_style as CoachStyle | null,
  };
}
