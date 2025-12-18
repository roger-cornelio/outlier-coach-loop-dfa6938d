import { supabase } from "@/integrations/supabase/client";
import type { 
  MandatoryAthleteParams, 
  WorkoutBlockInput, 
  AdaptationResult 
} from "@/utils/mandatoryAdaptationEngine";

// ============================================
// HOOK PARA ADAPTAÇÃO OBRIGATÓRIA DE TREINOS
// ============================================
// Este hook garante que NENHUM treino seja entregue
// ao atleta sem passar pelo motor de adaptação
// ============================================

interface UseWorkoutAdaptationOptions {
  onSuccess?: (result: AdaptationResult) => void;
  onError?: (error: string) => void;
}

export function useWorkoutAdaptation(options?: UseWorkoutAdaptationOptions) {
  const adaptWorkout = async (
    blocks: WorkoutBlockInput[],
    athleteParams: MandatoryAthleteParams,
    dayLabel?: string
  ): Promise<AdaptationResult | null> => {
    try {
      console.log("🔄 Iniciando adaptação obrigatória de treino...");
      console.log("Parâmetros:", { 
        level: athleteParams.level, 
        gender: athleteParams.gender,
        time: athleteParams.availableTimeMinutes,
        blocks: blocks.length 
      });

      const { data, error } = await supabase.functions.invoke('mandatory-adapt-workout', {
        body: {
          athleteParams,
          blocks,
          dayLabel,
        },
      });

      if (error) {
        console.error("❌ Erro na adaptação:", error);
        options?.onError?.(error.message);
        return null;
      }

      if (!data.success) {
        console.error("❌ Adaptação falhou:", data.validationErrors || data.error);
        options?.onError?.(data.error || "Erro desconhecido na adaptação");
        return null;
      }

      console.log("✅ Adaptação concluída:", data.summary);
      
      const result: AdaptationResult = {
        success: true,
        blocks: data.adaptedBlocks,
        summary: data.summary,
        validationErrors: [],
      };

      options?.onSuccess?.(result);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("❌ Exceção na adaptação:", errorMessage);
      options?.onError?.(errorMessage);
      return null;
    }
  };

  return { adaptWorkout };
}

// ============================================
// VALIDAÇÃO DE PARÂMETROS OBRIGATÓRIOS
// ============================================

export function validateAthleteParams(params: Partial<MandatoryAthleteParams>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!params.level) {
    errors.push('Nível do atleta é obrigatório');
  } else if (!['iniciante', 'intermediario', 'avancado', 'pro'].includes(params.level)) {
    errors.push('Nível inválido');
  }

  if (!params.gender) {
    errors.push('Gênero é obrigatório');
  } else if (!['masculino', 'feminino'].includes(params.gender)) {
    errors.push('Gênero inválido');
  }

  if (params.availableTimeMinutes === undefined || params.availableTimeMinutes === null) {
    errors.push('Tempo disponível é obrigatório');
  } else if (params.availableTimeMinutes < 15) {
    errors.push('Tempo mínimo é 15 minutos');
  }

  if (!params.availableEquipment || !Array.isArray(params.availableEquipment)) {
    errors.push('Lista de equipamentos é obrigatória');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================
// INFORMAÇÕES DO MOTOR
// ============================================

export const ENGINE_INFO = {
  name: 'OUTLIER_MANDATORY_ADAPTATION',
  version: '1.0.0',
  multipliers: {
    level: {
      iniciante: 0.65,
      intermediario: 0.80,
      avancado: 1.00,
      pro: 1.10,
    },
    gender: {
      masculino: 1.00,
      feminino: 0.85,
    },
  },
  calculationOrder: [
    '1. Tipo de bloco',
    '2. Nível do atleta',
    '3. Gênero',
    '4. Tempo disponível',
    '5. Equipamentos',
  ],
  rules: {
    conditioning: 'volume_final = volume_base × nivel × gênero × tempo',
    forca: 'mantém %1RM, ajusta séries por gênero, reps iguais',
    corrida: 'ajusta distância por gênero e tempo, mantém pace',
  },
};
