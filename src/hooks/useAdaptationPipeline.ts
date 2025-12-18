import { useCallback } from 'react';
import { useOutlierStore } from '@/store/outlierStore';
import { 
  adaptWorkoutText, 
  computeMultiplier, 
  type LevelKey, 
  type SexKey,
  LEVEL_MULT,
  SEX_MULT
} from '@/lib/adaptation/adaptWorkoutText';
import type { DayWorkout, WorkoutBlock, AthleteConfig } from '@/types/outlier';
import { toast } from 'sonner';

// ============================================
// HOOK PARA PIPELINE DE ADAPTAÇÃO OBRIGATÓRIA
// ============================================
// Usa adaptação baseada em texto puro
// Aplica multiplicador (nível × sexo) em reps, metros, rounds, cal
// ============================================

interface AdaptationPipelineResult {
  success: boolean;
  adaptedWorkouts: DayWorkout[];
  summary?: {
    totalOriginalMinutes: number;
    totalAdaptedMinutes: number;
    levelMultiplier: number;
    genderMultiplier: number;
    combinedMultiplier: number;
  };
}

interface GenerateOptions {
  overrideConfig?: AthleteConfig;
}

// Mapear level do app para LevelKey do motor
function mapLevel(level: string): LevelKey {
  const upper = level?.toUpperCase();
  if (upper === 'BASE') return 'BASE';
  if (upper === 'PROGRESSIVO') return 'PROGRESSIVO';
  return 'PERFORMANCE';
}

// Mapear sexo do app para SexKey
function mapSex(sexo: string): SexKey {
  const lower = sexo?.toLowerCase();
  return lower === 'feminino' ? 'F' : 'M';
}

// Adaptar conteúdo de um bloco
function adaptBlockContent(block: WorkoutBlock, multiplier: number): WorkoutBlock {
  const isWarmup = block.type === 'aquecimento';
  
  const adaptedContent = adaptWorkoutText({
    text: block.content,
    multiplier,
    adaptWarmup: false, // nunca adaptar aquecimento
  });

  // Estimar duração adaptada proporcionalmente
  const adaptedDuration = isWarmup 
    ? block.durationMinutes 
    : Math.max(1, Math.floor(block.durationMinutes * multiplier));

  return {
    ...block,
    content: adaptedContent,
    durationMinutes: adaptedDuration,
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
   * Aplica: nível × sexo (texto direto)
   * @param options.overrideConfig - Config a usar (evita race condition)
   */
  const generateAdaptedWorkouts = useCallback((options?: GenerateOptions): AdaptationPipelineResult => {
    const config = options?.overrideConfig || athleteConfig;
    
    // Validar que temos base e config
    if (!baseWorkouts || baseWorkouts.length === 0) {
      console.log('❌ Sem planilha base para adaptar');
      return { success: false, adaptedWorkouts: [] };
    }

    if (!config) {
      console.log('❌ Sem configuração do atleta');
      return { success: false, adaptedWorkouts: [] };
    }

    const level = mapLevel(config.trainingLevel);
    const sex = mapSex(config.sexo || 'masculino');
    const multiplier = computeMultiplier(level, sex);

    console.log('🔄 Iniciando adaptação de texto...');
    console.log(`Level: ${level} (${LEVEL_MULT[level]})`);
    console.log(`Sexo: ${sex} (${SEX_MULT[sex]})`);
    console.log(`Multiplicador final: ${multiplier}`);

    // Fast path: PERFORMANCE + M = 1.0 → sem alterações
    if (multiplier === 1.0) {
      console.log('✅ PERFORMANCE M - usando planilha base sem alterações');
      setAdaptedWorkouts(baseWorkouts);
      return {
        success: true,
        adaptedWorkouts: baseWorkouts,
        summary: {
          totalOriginalMinutes: baseWorkouts.reduce((sum, d) => sum + (d.estimatedTime || 0), 0),
          totalAdaptedMinutes: baseWorkouts.reduce((sum, d) => sum + (d.estimatedTime || 0), 0),
          levelMultiplier: LEVEL_MULT[level],
          genderMultiplier: SEX_MULT[sex],
          combinedMultiplier: multiplier,
        },
      };
    }

    // Processar cada dia
    const adaptedDays: DayWorkout[] = [];
    let totalOriginalMin = 0;
    let totalAdaptedMin = 0;

    for (const dayWorkout of baseWorkouts) {
      // Adaptar cada bloco
      const adaptedBlocks = dayWorkout.blocks.map(block => 
        adaptBlockContent(block, multiplier)
      );

      // Calcular tempos
      const originalTime = dayWorkout.blocks.reduce((sum, b) => sum + b.durationMinutes, 0);
      const adaptedTime = adaptedBlocks.reduce((sum, b) => sum + b.durationMinutes, 0);
      
      totalOriginalMin += originalTime;
      totalAdaptedMin += adaptedTime;

      // Criar dia adaptado
      adaptedDays.push({
        ...dayWorkout,
        blocks: adaptedBlocks,
        estimatedTime: adaptedTime,
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
        levelMultiplier: LEVEL_MULT[level],
        genderMultiplier: SEX_MULT[sex],
        combinedMultiplier: multiplier,
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
        const pct = Math.round((result.summary?.combinedMultiplier || 1) * 100);
        toast.success('Treino adaptado ao seu nível', {
          description: `${pct}% do volume`,
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
