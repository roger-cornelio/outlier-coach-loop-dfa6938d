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
  version: '1.2.0',
  description: 'Planilha do coach = PRO (100%). Sistema escala apenas para BAIXO. Multiplicador final NUNCA excede 1.0.',
  criticalRules: {
    tetoMaximo: 'Planilha do coach é o TETO MÁXIMO (100%)',
    semAumento: 'Sistema NUNCA aumenta volume acima da planilha',
    proIdentico: 'PRO + Masculino + tempo suficiente = conteúdo IDÊNTICO à planilha',
    clampFinal: 'Todos os multiplicadores são limitados a max 1.0',
  },
  multipliers: {
    level: {
      iniciante: 0.65,      // 60-65%
      intermediario: 0.80,  // 75-80%
      avancado: 0.90,       // 90%
      pro: 1.00,            // 100% (TETO MÁXIMO - nunca mais)
    },
    gender: {
      masculino: 1.00,
      feminino: 0.85,
    },
  },
  calculationOrder: [
    '1. Tipo de bloco',
    '2. Nível do atleta (clamp max 1.0)',
    '3. Gênero (clamp max 1.0)',
    '4. Tempo disponível (clamp max 1.0)',
    '5. Multiplicador final = min(1.0, nivel × genero × tempo)',
    '6. Equipamentos (substituição)',
  ],
  rules: {
    conditioning: 'volume_final = min(1.0, nivel × genero × tempo) × volume_base',
    forca: 'mantém %1RM, ajusta séries por min(1.0, genero), reps iguais',
    corrida: 'distância_final = min(1.0, genero × tempo) × distância_base',
    proFullVolume: 'PRO + Masculino + tempo ok → conteúdo original sem alteração',
  },
};
