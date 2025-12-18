import { useCallback } from 'react';
import { useOutlierStore } from '@/store/outlierStore';
import { 
  adaptWorkout, 
  type MandatoryAthleteParams, 
  type WorkoutBlockInput,
  type TrainingLevel 
} from '@/utils/mandatoryAdaptationEngine';
import type { DayWorkout, WorkoutBlock } from '@/types/outlier';
import { toast } from 'sonner';

// ============================================
// HOOK PARA PIPELINE DE ADAPTAÇÃO OBRIGATÓRIA
// ============================================
// Garante que o treino exibido seja sempre adaptado
// ao nível/sexo/tempo/equipamentos do atleta
// ============================================

interface AdaptationPipelineResult {
  success: boolean;
  adaptedWorkouts: DayWorkout[];
  summary?: {
    totalOriginalMinutes: number;
    totalAdaptedMinutes: number;
    levelMultiplier: number;
    genderMultiplier: number;
  };
}

// Mapear tipo de bloco do app para tipo do motor
function mapBlockType(type: string): WorkoutBlockInput['type'] {
  const mapping: Record<string, WorkoutBlockInput['type']> = {
    'aquecimento': 'aquecimento',
    'conditioning': 'conditioning',
    'forca': 'forca',
    'corrida': 'corrida',
    'core': 'core',
    'especifico': 'especifico',
    'notas': 'notas',
  };
  return mapping[type] || 'conditioning';
}

// Converter bloco do app para input do motor
function convertToEngineBlock(block: WorkoutBlock): WorkoutBlockInput {
  return {
    id: block.id,
    type: mapBlockType(block.type),
    title: block.title,
    content: block.content,
    estimatedMinutes: block.durationMinutes,
    isBenchmark: block.isBenchmark,
    benchmarkId: block.benchmarkId,
  };
}

// Converter output do motor de volta para bloco do app
function convertFromEngineBlock(
  adaptedBlock: any, 
  originalBlock: WorkoutBlock
): WorkoutBlock {
  return {
    ...originalBlock,
    // Substituir conteúdo pelo adaptado
    content: adaptedBlock.adaptedContent || adaptedBlock.content,
    // Atualizar duração estimada
    durationMinutes: adaptedBlock.finalEstimatedMinutes || originalBlock.durationMinutes,
  };
}

export function useAdaptationPipeline() {
  const { 
    baseWorkouts, 
    athleteConfig, 
    setAdaptedWorkouts,
    adaptationPending,
    markAdaptationPending,
  } = useOutlierStore();

  /**
   * Gera treino adaptado para o atleta com base na planilha do coach
   * Aplica: nível → gênero → tempo → equipamentos
   */
  const generateAdaptedWorkouts = useCallback((): AdaptationPipelineResult => {
    // Validar que temos base e config
    if (!baseWorkouts || baseWorkouts.length === 0) {
      console.log('❌ Sem planilha base para adaptar');
      return { success: false, adaptedWorkouts: [] };
    }

    if (!athleteConfig) {
      console.log('❌ Sem configuração do atleta');
      return { success: false, adaptedWorkouts: [] };
    }

    console.log('🔄 Iniciando pipeline de adaptação...');
    console.log('Config:', {
      level: athleteConfig.trainingLevel,
      sexo: athleteConfig.sexo,
      duration: athleteConfig.sessionDuration,
    });

    // Preparar parâmetros obrigatórios
    const engineParams: MandatoryAthleteParams = {
      level: athleteConfig.trainingLevel as TrainingLevel,
      gender: athleteConfig.sexo || 'masculino',
      availableTimeMinutes: athleteConfig.sessionDuration === 'ilimitado' 
        ? 9999 
        : athleteConfig.sessionDuration,
      availableEquipment: athleteConfig.equipment || [],
    };

    console.log('Motor params:', engineParams);

    // Processar cada dia
    const adaptedDays: DayWorkout[] = [];
    let totalOriginalMin = 0;
    let totalAdaptedMin = 0;

    for (const dayWorkout of baseWorkouts) {
      // Converter blocos para formato do motor
      const engineBlocks = dayWorkout.blocks.map(convertToEngineBlock);

      // Chamar motor de adaptação
      const result = adaptWorkout(engineBlocks, engineParams);

      if (!result.success) {
        console.error('❌ Falha na adaptação do dia', dayWorkout.day, result.validationErrors);
        // Usar original se falhar
        adaptedDays.push(dayWorkout);
        continue;
      }

      totalOriginalMin += result.summary.totalOriginalMinutes;
      totalAdaptedMin += result.summary.totalAdaptedMinutes;

      // Converter blocos adaptados de volta
      const adaptedBlocks = result.blocks.map((adaptedBlock, index) => 
        convertFromEngineBlock(adaptedBlock, dayWorkout.blocks[index])
      );

      // Criar dia adaptado
      adaptedDays.push({
        ...dayWorkout,
        blocks: adaptedBlocks,
        estimatedTime: result.summary.totalAdaptedMinutes,
      });
    }

    console.log('✅ Adaptação concluída');
    console.log(`Original: ${totalOriginalMin}min → Adaptado: ${totalAdaptedMin}min`);

    // Salvar no store
    setAdaptedWorkouts(adaptedDays);

    return {
      success: true,
      adaptedWorkouts: adaptedDays,
      summary: {
        totalOriginalMinutes: totalOriginalMin,
        totalAdaptedMinutes: totalAdaptedMin,
        levelMultiplier: engineParams.level === 'base' ? 0.65 
          : engineParams.level === 'progressivo' ? 0.80 
          : 1.00,
        genderMultiplier: engineParams.gender === 'feminino' ? 0.85 : 1.00,
      },
    };
  }, [baseWorkouts, athleteConfig, setAdaptedWorkouts]);

  /**
   * Verifica se precisa readaptar e executa se necessário
   */
  const ensureAdapted = useCallback(() => {
    if (adaptationPending && baseWorkouts.length > 0 && athleteConfig) {
      const result = generateAdaptedWorkouts();
      if (result.success) {
        toast.success('Treino adaptado ao seu nível', {
          description: `${result.summary?.levelMultiplier === 1 ? '100%' : Math.round((result.summary?.levelMultiplier || 1) * 100) + '%'} do volume`,
        });
      }
      return result;
    }
    return null;
  }, [adaptationPending, baseWorkouts, athleteConfig, generateAdaptedWorkouts]);

  /**
   * Força readaptação (usado quando config muda)
   */
  const forceRegenerate = useCallback(() => {
    markAdaptationPending();
    return generateAdaptedWorkouts();
  }, [markAdaptationPending, generateAdaptedWorkouts]);

  return {
    generateAdaptedWorkouts,
    ensureAdapted,
    forceRegenerate,
    adaptationPending,
    hasBaseWorkouts: baseWorkouts.length > 0,
    hasAthleteConfig: !!athleteConfig,
  };
}
