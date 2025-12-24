/**
 * workoutConceptsCopy.ts - Copy para conceitos de treino
 * 
 * ============================================================
 * PRINCÍPIO FUNDAMENTAL: ATLETA > COACH
 * ============================================================
 * Em qualquer ambiguidade:
 * - Bloquear coach > Gerar resultado incorreto para atleta
 * - Exigir ação explícita > Inferir automaticamente
 * - Falhar cedo e claramente > Falhar silenciosamente
 * ============================================================
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
    
    // COPY OFICIAL (NÃO ALTERAR)
    description: 'O WOD principal é o parâmetro de ajuste do treino.',
    tooltip: 'O WOD principal é o parâmetro de ajuste do treino. É a partir dele que o app calibra intensidade, volume e frequência para o atleta.',
    
    // Estados
    manualLabel: 'Principal',
    
    // Instruções
    setManualHint: 'Clique para definir este bloco como WOD principal do dia',
    removeManualHint: 'Remover marcação de bloco principal',
    
    // Feedback (não há mais detecção automática)
    noMainBlockWarning: 'Nenhum WOD principal definido. Marque o bloco central do treino.',
    
    // COPY OFICIAL PARA CALLOUT (NÃO ALTERAR)
    calloutText: 'O WOD principal é o parâmetro de ajuste do treino.\nÉ a partir dele que o app calibra intensidade, volume e frequência para o atleta.\n\nSem ele, o ajuste do treino do atleta fica menos preciso.',
    
    // Copy para erro bloqueante
    missingError: (day: string) => `${day} não tem WOD principal definido. Defina um bloco como Principal antes de salvar.`,
    
    // Copy detalhada para exibição no editor
    editorDescription: 'O WOD principal é o parâmetro de ajuste do treino. É a partir dele que o app calibra intensidade, volume e frequência para o atleta. Sem ele, o ajuste do treino do atleta fica menos preciso.',
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
    
    // Sugestão para nome da programação
    programNameLabel: 'Nome da Programação (Periodização semanal)',
    programNameSuggestion: 'Sugestão: Ex: Construção Aeróbia',
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
