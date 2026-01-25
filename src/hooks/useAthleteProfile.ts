/**
 * useAthleteProfile - Hook para persistir e carregar configurações do atleta
 * 
 * REGRAS:
 * - Salva configurações no banco (profiles)
 * - Carrega ao iniciar sessão
 * - Nunca reseta para valores padrão se já existe configuração
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import type { AthleteConfig, TrainingLevel, SessionDuration, CoachStyle } from '@/types/outlier';

interface ProfileData {
  name: string | null;
  coach_style: string | null;
  training_level: string | null;
  session_duration: string | null;
  altura: number | null;
  peso: number | null;
  idade: number | null;
  sexo: string | null;
  unavailable_equipment: string[] | null;
  equipment_notes: string | null;
}

export function useAthleteProfile() {
  const { user, profile } = useAuth();
  const { setAthleteConfig, setCoachStyle, athleteConfig, coachStyle } = useOutlierStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar configurações do perfil ao iniciar
  const loadProfileConfig = useCallback(async () => {
    if (!user?.id || isLoaded) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, coach_style, training_level, session_duration, altura, peso, idade, sexo, unavailable_equipment, equipment_notes')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useAthleteProfile] Error loading profile:', error);
        return;
      }

      if (data) {
        // Carregar coach style se existir no banco
        if (data.coach_style && !coachStyle) {
          setCoachStyle(data.coach_style as CoachStyle);
        }

        // Montar athleteConfig a partir dos dados do banco
        const hasPersistedConfig = data.training_level || data.peso || data.altura || data.idade || data.sexo;
        
        if (hasPersistedConfig) {
          // Normalizar valores legados para open/pro
          const normalizeLevel = (level: string | null): TrainingLevel => {
            if (level === 'pro') return 'pro';
            if (level === 'open') return 'open';
            // Fallback para valores legados ou null
            return 'open';
          };
          
          const loadedConfig: AthleteConfig = {
            trainingLevel: normalizeLevel(data.training_level),
            sessionDuration: parseSessionDuration(data.session_duration) || athleteConfig?.sessionDuration || 60,
            altura: data.altura ?? athleteConfig?.altura,
            peso: data.peso ?? athleteConfig?.peso,
            idade: data.idade ?? athleteConfig?.idade,
            sexo: (data.sexo as 'masculino' | 'feminino') ?? athleteConfig?.sexo,
            unavailableEquipment: (data.unavailable_equipment as string[] | null) ?? athleteConfig?.unavailableEquipment ?? [],
            equipmentNotes: data.equipment_notes ?? athleteConfig?.equipmentNotes ?? '',
            coachStyle: (data.coach_style as CoachStyle) || coachStyle || 'PULSE',
          };

          setAthleteConfig(loadedConfig);
        }
      }
      
      setIsLoaded(true);
    } catch (err) {
      console.error('[useAthleteProfile] Exception:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isLoaded, setAthleteConfig, setCoachStyle, athleteConfig, coachStyle]);

  // Salvar configurações no perfil
  // CRÍTICO: Sempre seta first_setup_completed = true ao salvar config
  const saveProfileConfig = useCallback(async (
    config: AthleteConfig,
    name?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    setIsSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        training_level: config.trainingLevel,
        session_duration: String(config.sessionDuration),
        altura: config.altura ?? null,
        peso: config.peso ?? null,
        idade: config.idade ?? null,
        sexo: config.sexo ?? null,
        unavailable_equipment: config.unavailableEquipment ?? [],
        equipment_notes: config.equipmentNotes ?? null,
        coach_style: config.coachStyle,
        // REGRA MESTRA: Marcar setup como concluído ao salvar configuração
        first_setup_completed: true,
      };

      // Atualizar nome se fornecido
      if (name !== undefined) {
        updateData.name = name;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) {
        console.error('[useAthleteProfile] Error saving profile:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[useAthleteProfile] Exception saving:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user?.id]);

  // Atualizar apenas o nome
  const updateName = useCallback(async (newName: string): Promise<boolean> => {
    if (!user?.id) return false;
    if (!newName || newName.trim().length < 2) return false;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: newName.trim() })
        .eq('user_id', user.id);

      if (error) {
        console.error('[useAthleteProfile] Error updating name:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[useAthleteProfile] Exception updating name:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user?.id]);

  // Carregar ao montar
  useEffect(() => {
    if (user?.id && !isLoaded) {
      loadProfileConfig();
    }
  }, [user?.id, isLoaded, loadProfileConfig]);

  return {
    isLoading,
    isSaving,
    isLoaded,
    saveProfileConfig,
    updateName,
    loadProfileConfig,
  };
}

// Helper para parsear session duration
function parseSessionDuration(value: string | null): SessionDuration | null {
  if (!value) return null;
  if (value === 'ilimitado') return 'ilimitado';
  const num = parseInt(value);
  if ([30, 45, 60, 90].includes(num)) return num as SessionDuration;
  return null;
}
