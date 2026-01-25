/**
 * WORKOUT SERIALIZATION UTILITIES
 * 
 * Funções para normalizar dados de treino antes de persistir no banco.
 * Garante que durationSec seja sempre salvo como fonte de verdade auditável.
 * 
 * REGRAS:
 * - durationSec é persistido explicitamente no JSON
 * - durationMinutes continua existindo como input humano e fallback
 * - Dados antigos sem durationSec funcionam via durationMinutes * 60
 * - Nenhuma migração automática de dados históricos
 */

import type { WorkoutBlock, DayWorkout } from '@/types/outlier';
import { getBlockEffectiveDurationSec } from '@/utils/timeCalc';

/**
 * Normaliza um bloco de treino para persistência.
 * 
 * Se durationMinutes existe e durationSec não está definido (ou é inconsistente),
 * calcula e atribui durationSec correspondente.
 * 
 * @param block - Bloco de treino a normalizar
 * @returns Bloco normalizado com durationSec persistível
 */
export function normalizeBlockForPersistence(block: WorkoutBlock): WorkoutBlock {
  // Se já tem durationSec válido E consistente com durationMinutes, mantém
  if (block.durationSec && block.durationSec > 0) {
    // Verificar consistência: se durationMinutes existe, durationSec deve corresponder
    if (block.durationMinutes && block.durationMinutes > 0) {
      const expectedSec = Math.round(block.durationMinutes * 60);
      // Se durationSec difere muito (mais de 1 segundo de tolerância), recalcular
      if (Math.abs(block.durationSec - expectedSec) > 1) {
        console.log(`[normalizeBlockForPersistence] Inconsistência detectada no bloco "${block.title}": durationSec=${block.durationSec}, esperado=${expectedSec}. Usando durationMinutes como fonte.`);
        return {
          ...block,
          durationSec: expectedSec,
        };
      }
    }
    return block;
  }
  
  // Se tem durationMinutes válido mas não tem durationSec, calcular
  if (block.durationMinutes && block.durationMinutes > 0) {
    const calculatedSec = Math.round(block.durationMinutes * 60);
    return {
      ...block,
      durationSec: calculatedSec,
    };
  }
  
  // Verificar também levelVariants para durationMinutes
  if (block.levelVariants) {
    const levels = ['iniciante', 'intermediario', 'avancado', 'hyrox_pro'] as const;
    let hasAnyDuration = false;
    
    for (const level of levels) {
      const variant = block.levelVariants[level];
      if (variant?.durationMinutes && variant.durationMinutes > 0) {
        hasAnyDuration = true;
        break;
      }
    }
    
    // Se tem duration em variants mas não no bloco base, usar o effective
    if (hasAnyDuration && !block.durationSec) {
      const effectiveSec = getBlockEffectiveDurationSec({
        durationSec: block.durationSec,
        durationMinutes: block.durationMinutes,
      });
      
      if (effectiveSec > 0) {
        return {
          ...block,
          durationSec: effectiveSec,
        };
      }
    }
  }
  
  // Bloco sem duração definida - mantém como está
  return block;
}

/**
 * Normaliza todos os blocos de um dia de treino para persistência.
 * 
 * @param dayWorkout - Dia de treino com blocos a normalizar
 * @returns Dia de treino com blocos normalizados
 */
export function normalizeDayWorkoutForPersistence(dayWorkout: DayWorkout): DayWorkout {
  return {
    ...dayWorkout,
    blocks: dayWorkout.blocks.map(normalizeBlockForPersistence),
  };
}

/**
 * Normaliza uma lista de dias de treino para persistência.
 * Aplica normalização de durationSec em todos os blocos.
 * 
 * @param workouts - Array de dias de treino
 * @returns Array normalizado com durationSec persistível
 */
export function normalizeWorkoutsForPersistence(workouts: DayWorkout[]): DayWorkout[] {
  const normalized = workouts.map(normalizeDayWorkoutForPersistence);
  
  // Log de auditoria
  const blockCount = normalized.reduce((sum, day) => sum + day.blocks.length, 0);
  const blocksWithDurationSec = normalized.reduce((sum, day) => 
    sum + day.blocks.filter(b => b.durationSec && b.durationSec > 0).length
  , 0);
  
  console.log(`[SERIALIZE] Normalização: ${blocksWithDurationSec}/${blockCount} blocos com durationSec`);
  
  return normalized;
}

/**
 * Verifica se um bloco tem duração definida (durationSec ou durationMinutes).
 * Útil para validação antes de salvar.
 * 
 * @param block - Bloco a verificar
 * @returns true se tem duração definida
 */
export function blockHasDuration(block: WorkoutBlock): boolean {
  if (block.durationSec && block.durationSec > 0) return true;
  if (block.durationMinutes && block.durationMinutes > 0) return true;
  
  // Verificar levelVariants
  if (block.levelVariants) {
    const levels = ['iniciante', 'intermediario', 'avancado', 'hyrox_pro'] as const;
    for (const level of levels) {
      const variant = block.levelVariants[level];
      if (variant?.durationMinutes && variant.durationMinutes > 0) {
        return true;
      }
    }
  }
  
  return false;
}
