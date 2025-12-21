/**
 * workoutConceptsCopy.ts - Copy para conceitos de treino
 * 
 * DISTINÇÃO CRÍTICA:
 * - WOD Principal ≠ Benchmark
 * - São conceitos INDEPENDENTES que não devem ser confundidos
 */

export const WORKOUT_CONCEPTS = {
  // ============================================
  // WOD PRINCIPAL (Main Block)
  // ============================================
  mainBlock: {
    label: 'WOD Principal',
    shortLabel: 'Principal',
    icon: '⚡',
    
    // Copy para o coach
    description: 'Bloco central do treino do dia.',
    tooltip: 'WOD principal é o bloco central do treino do dia. É ele que usamos para medir performance no contexto do atleta.',
    
    // Estados
    manualLabel: 'Principal (definido)',
    autoLabel: 'Principal (auto)',
    
    // Instruções
    setManualHint: 'Clique para definir este bloco como principal',
    removeManualHint: 'Remover marcação manual (voltar para automático)',
    
    // Feedback
    autoDetectedMessage: 'Bloco principal identificado automaticamente com base no tipo e duração.',
  },

  // ============================================
  // BENCHMARK
  // ============================================
  benchmark: {
    label: 'Benchmark',
    shortLabel: 'Benchmark',
    icon: '🏆',
    
    // Copy para o coach
    description: 'Treino repetível para análise de evolução.',
    tooltip: 'Benchmark serve para comparar evolução ao longo do tempo. Use apenas quando o treino for repetível.',
    
    // Instruções
    markHint: 'Marcar como benchmark para rastrear evolução',
    unmarkHint: 'Remover marcação de benchmark',
    
    // Importante: benchmark é INDEPENDENTE do WOD principal
    independenceNote: 'Benchmark é independente do WOD Principal. Um bloco pode ser Principal sem ser Benchmark, ou Benchmark sem ser Principal.',
  },

  // ============================================
  // REGRAS DE CLAREZA
  // ============================================
  rules: {
    mainBlockDoesNotImplyBenchmark: 'WOD Principal NÃO implica Benchmark.',
    benchmarkDoesNotReplaceMainBlock: 'Benchmark NÃO substitui WOD Principal.',
    bothCanCoexist: 'Um bloco pode ser WOD Principal E Benchmark ao mesmo tempo, mas são conceitos distintos.',
  },

  // ============================================
  // COPY PARA UI
  // ============================================
  ui: {
    // Tooltips nos botões
    mainBlockButtonTooltip: 'Define o bloco central do treino (usado para adaptação)',
    benchmarkButtonTooltip: 'Marca como benchmark para rastrear evolução ao longo do tempo',
    
    // Legenda
    legendMainBlock: 'WOD Principal: bloco central para adaptação e performance contextual',
    legendBenchmark: 'Benchmark: treino repetível para análise histórica de evolução',
  },
} as const;

/**
 * Retorna a copy do conceito de WOD Principal
 */
export function getMainBlockCopy() {
  return WORKOUT_CONCEPTS.mainBlock;
}

/**
 * Retorna a copy do conceito de Benchmark
 */
export function getBenchmarkCopy() {
  return WORKOUT_CONCEPTS.benchmark;
}

/**
 * Retorna a copy para a UI
 */
export function getUIConceptsCopy() {
  return WORKOUT_CONCEPTS.ui;
}
