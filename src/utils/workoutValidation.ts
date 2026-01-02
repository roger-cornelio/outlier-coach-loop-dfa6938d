/**
 * workoutValidation.ts - Validação obrigatória de treinos
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * REGRA DEFINITIVA: RENDER ≠ VALIDAÇÃO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 1. RENDER: Acontece SEMPRE que existir título ou conteúdo
 *    - Erros NUNCA podem impedir renderização
 *    - Blocos SEMPRE aparecem, mesmo com erros
 * 
 * 2. VALIDAÇÃO: Afeta APENAS:
 *    - Estilo visual (badge de erro, borda amarela)
 *    - Bloqueio de PUBLICAÇÃO
 *    - NUNCA afeta edição ou visualização
 * 
 * 3. LOGS OBRIGATÓRIOS:
 *    - [RENDER_BLOCK]: Confirma que bloco foi renderizado
 *    - [VALIDATION_ERROR]: Registra erros de validação
 *    - [PUBLISH_GUARD]: Registra decisão de bloqueio de publicação
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * REGRAS ADICIONAIS:
 * - É PROIBIDO salvar/publicar treino sem scheduled_date
 * - Treinos legados sem data devem ser logados e ignorados
 * - Treinos com data passada são automaticamente arquivados (read-only)
 */

import { DayWorkout } from '@/types/outlier';

export interface WorkoutValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ScheduledWorkout {
  scheduledDate: string | null;
  title: string;
  workouts: DayWorkout[];
}

/**
 * Valida se um treino pode ser salvo/publicado
 * REGRA: scheduled_date é OBRIGATÓRIA
 */
export function validateWorkoutForSave(
  workouts: DayWorkout[],
  scheduledDate: string | null | undefined,
  title?: string
): WorkoutValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // REGRA 1: Data obrigatória
  if (!scheduledDate) {
    errors.push('Data de agendamento é obrigatória. Selecione uma data antes de salvar.');
    console.log('[VALIDATION_ERROR] line=0 reason="scheduled_date ausente"');
  }

  // REGRA 2: Verificar se workouts existe
  if (!workouts || workouts.length === 0) {
    errors.push('Nenhum treino para salvar.');
    console.log('[VALIDATION_ERROR] line=0 reason="Nenhum treino para salvar"');
  }

  // REGRA 3: Título recomendado
  if (!title || title.trim().length < 3) {
    warnings.push('Título não informado. Será usado um título padrão.');
  }

  // [PUBLISH_GUARD] Log de resultado
  console.log('[PUBLISH_GUARD] validateWorkoutForSave', {
    blocked: errors.length > 0,
    errors: errors.length,
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida se um treino pode ser publicado para atletas
 * REGRA: week_start é a fonte única - não bloqueamos por data passada
 */
export function validateWorkoutForPublish(
  workouts: DayWorkout[],
  weekStartOrScheduledDate: string | null | undefined,
  selectedAthletes: string[]
): WorkoutValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // REGRA: Verificar se workouts existe
  if (!workouts || workouts.length === 0) {
    errors.push('Nenhum treino para publicar.');
    console.log('[VALIDATION_ERROR] line=0 reason="Nenhum treino para publicar"');
  }

  // REGRA: Pelo menos um atleta selecionado
  if (!selectedAthletes || selectedAthletes.length === 0) {
    errors.push('Selecione pelo menos um atleta.');
    console.log('[VALIDATION_ERROR] line=0 reason="Nenhum atleta selecionado"');
  }

  // REGRA: week_start/scheduledDate deve existir
  if (!weekStartOrScheduledDate) {
    errors.push('Semana não definida. Salve a programação com uma semana selecionada.');
    console.log('[VALIDATION_ERROR] line=0 reason="Semana não definida"');
  }

  // NOTA: Não bloqueamos por data passada - permitimos publicar qualquer semana

  // [PUBLISH_GUARD] Log de resultado
  console.log('[PUBLISH_GUARD] validateWorkoutForPublish', {
    blocked: errors.length > 0,
    errors: errors.length,
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Verifica se um treino é legado (sem scheduled_date)
 * Treinos legados devem ser logados e NÃO exibidos no painel
 */
export function isLegacyWorkout(scheduledDate: string | null | undefined): boolean {
  if (!scheduledDate) {
    console.warn('[WorkoutValidation] Treino legado detectado: sem scheduled_date');
    return true;
  }
  return false;
}

/**
 * Verifica se um treino está no passado (deve ser arquivado)
 */
export function isWorkoutInPast(scheduledDate: string | null | undefined): boolean {
  if (!scheduledDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const schedDate = new Date(scheduledDate + 'T00:00:00');
  
  return schedDate < today;
}

/**
 * Verifica se um treino está dentro de um intervalo de datas
 */
export function isWorkoutInDateRange(
  scheduledDate: string | null | undefined,
  startDate: string,
  endDate: string
): boolean {
  if (!scheduledDate) {
    console.warn('[WorkoutValidation] Treino sem data não exibido: isWorkoutInDateRange=false');
    return false;
  }
  
  const schedDate = new Date(scheduledDate + 'T00:00:00');
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');
  
  return schedDate >= start && schedDate <= end;
}

/**
 * Filtra treinos válidos (com scheduled_date) e loga os legados
 */
export function filterValidWorkouts<T extends { scheduled_date?: string | null }>(
  workouts: T[],
  logPrefix = 'WorkoutValidation'
): T[] {
  const valid: T[] = [];
  let legacyCount = 0;

  for (const workout of workouts) {
    if (!workout.scheduled_date) {
      legacyCount++;
    } else {
      valid.push(workout);
    }
  }

  if (legacyCount > 0) {
    console.warn(`[${logPrefix}] ${legacyCount} treino(s) legado(s) ignorado(s) (sem scheduled_date)`);
  }

  return valid;
}

/**
 * Gera mensagem de erro user-friendly
 */
export function getValidationErrorMessage(result: WorkoutValidationResult): string {
  if (result.isValid) return '';
  return result.errors.join('\n');
}
