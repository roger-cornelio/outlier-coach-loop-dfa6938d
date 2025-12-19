import { useCallback } from 'react';
import { useOutlierStore } from '@/store/outlierStore';
import { buildWorkoutByTime, validateAdaptation, calculateWodTime } from '@/utils/workoutAdaptationEngine';
import type { DayWorkout, AthleteConfig, TrainingLevel } from '@/types/outlier';
import { toast } from 'sonner';

// ============================================
// HOOK PARA PIPELINE DE ADAPTAÇÃO POR TEMPO REAL v2
// ============================================
// Motor com tabela de referência (atleta intermediário HYROX)
// Tempos de transição: 15s estação, 20s carga, 10s bloco
// Usa o motor buildWorkoutByTime que:
// 1. Adapta por nível + sexo (volume/carga)
// 2. Adapta por tempo disponível (remove/condensa)
// 3. Garante que treino curto ≠ treino longo
// ============================================

interface AdaptationPipelineResult {
  success: boolean;
  adaptedWorkouts: DayWorkout[];
  summary?: {
    totalOriginalMinutes: number;
    totalAdaptedMinutes: number;
    wasCondensed: boolean;
    blocksRemoved: number;
  };
}

interface GenerateOptions {
  overrideConfig?: AthleteConfig;
}

// Mapear level do app para TrainingLevel
function mapLevel(level: string): TrainingLevel {
  const upper = level?.toUpperCase();
  if (upper === 'BASE') return 'base';
  if (upper === 'PROGRESSIVO') return 'progressivo';
  return 'performance';
}

// Normalizar tempo para minutos
function normalizeTime(duration: number | 'ilimitado'): number {
  if (duration === 'ilimitado') return 9999;
  return typeof duration === 'number' ? duration : 60;
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
   * Usa motor de adaptação por tempo real
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

    const nivel = mapLevel(config.trainingLevel);
    const sexo = config.sexo || 'masculino';
    const tempoDisponivel = normalizeTime(config.sessionDuration);

    console.log('🔄 Iniciando adaptação por tempo real...');
    console.log(`Nível: ${nivel}`);
    console.log(`Sexo: ${sexo}`);
    console.log(`Tempo disponível: ${tempoDisponivel}min`);

    // Processar cada dia
    const adaptedDays: DayWorkout[] = [];
    let totalOriginalMin = 0;
    let totalAdaptedMin = 0;
    let anyCondensed = false;
    let totalBlocksRemoved = 0;

    for (const dayWorkout of baseWorkouts) {
      // Usar o motor de adaptação por tempo
      const result = buildWorkoutByTime({
        nivel,
        sexo,
        tempoDisponivel,
        wodBase: dayWorkout,
      });

      // Validar adaptação (em dev)
      if (process.env.NODE_ENV === 'development') {
        const validation = validateAdaptation(
          dayWorkout,
          result.workout,
          9999, // tempo original (ilimitado)
          tempoDisponivel,
          result.timeRelationTier
        );
        
        if (!validation.isValid) {
          console.warn('⚠️ Validação falhou:', validation.errors);
        }
      }

      adaptedDays.push(result.workout);
      
      totalOriginalMin += result.originalDuration;
      totalAdaptedMin += result.adaptedDuration;
      anyCondensed = anyCondensed || result.wasCondensed;
      totalBlocksRemoved += result.blocksRemoved;
    }

    console.log('✅ Adaptação por tempo concluída');
    console.log(`Tempo original: ${totalOriginalMin}min → Adaptado: ${totalAdaptedMin}min`);
    if (anyCondensed) console.log('📉 WOD foi condensado para caber no tempo');
    if (totalBlocksRemoved > 0) console.log(`🗑️ ${totalBlocksRemoved} blocos acessórios removidos`);

    // Salvar no store
    setAdaptedWorkouts(adaptedDays);

    return {
      success: true,
      adaptedWorkouts: adaptedDays,
      summary: {
        totalOriginalMinutes: totalOriginalMin,
        totalAdaptedMinutes: totalAdaptedMin,
        wasCondensed: anyCondensed,
        blocksRemoved: totalBlocksRemoved,
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
        toast.success('Treino adaptado ao seu perfil');
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
