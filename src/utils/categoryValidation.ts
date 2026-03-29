/**
 * categoryValidation.ts - Sistema Anti-Burro de Categorias MVP0
 * 
 * PRINCÍPIOS:
 * 1. Categoria é o ÚNICO sinal para o motor (não título, não texto)
 * 2. Validações determinísticas por categoria
 * 3. Mensagens claras user-friendly
 * 4. Flags internas para dificuldade (has_integrated_run, has_hyrox_station)
 * 
 * FONTE ÚNICA: Este arquivo define as listas oficiais de:
 * - BLOCK_CATEGORIES (categoria do bloco)
 * - BLOCK_FORMATS (formato do bloco)
 * - WORKOUT_UNITS (unidades dos itens)
 * 
 * Todos os componentes DEVEM importar daqui. NÃO duplicar arrays.
 */

// ============================================
// LISTA FINAL DE CATEGORIAS (MVP0)
// ============================================

export const BLOCK_CATEGORIES = [
  { value: 'aquecimento', label: 'Aquecimento', emoji: '🔥' },
  { value: 'forca', label: 'Força', emoji: '💪' },
  { value: 'metcon', label: 'Metcon', emoji: '⚡' },
  { value: 'especifico', label: 'Específico (HYROX)', emoji: '🛷' },
  { value: 'corrida', label: 'Corrida', emoji: '🏃' },
  { value: 'acessorio', label: 'Acessório', emoji: '🔧' },
  { value: 'mobilidade', label: 'Mobilidade', emoji: '🧘' },
  { value: 'tecnica', label: 'Técnica', emoji: '🎯' },
] as const;

// ============================================
// PRIORIDADE POR CATEGORIA (para corte por tempo)
// Score final = CATEGORY_PRIORITY_WEIGHT + duraçãoEstimadaMinutos
// Maior score = maior prioridade = removido por último
// ============================================

export const CATEGORY_PRIORITY_WEIGHT: Record<string, number> = {
  corrida: 110,      // NUNCA remover, só reduzir duração
  metcon: 100,       // Remove por último
  especifico: 90,    // Remove por último
  forca: 80,         // Remove se necessário
  aquecimento: 30,   // Remove cedo
  acessorio: 20,     // Remove cedo
  tecnica: 15,       // Remove cedo
  mobilidade: 10,    // Remove cedo
  notas: 0,          // Remove primeiro
};

// Categorias que NUNCA são removidas (apenas reduzidas)
export const NEVER_REMOVE_CATEGORIES = new Set(['corrida']);

export type BlockCategory = typeof BLOCK_CATEGORIES[number]['value'];

// ============================================
// LISTA FINAL DE FORMATOS (MVP0)
// ============================================

/**
 * Formato define a ESTRUTURA do treino.
 * "Técnica" NÃO é formato - deve ser colocado no título ou texto.
 */
export const BLOCK_FORMATS = [
  { value: 'for_time', label: 'For Time' },
  { value: 'amrap', label: 'AMRAP' },
  { value: 'emom', label: 'EMOM' },
  { value: 'rounds', label: 'Rounds' },
  { value: 'intervalos', label: 'Intervalos' },
  { value: 'outro', label: 'Outro' },
] as const;

export type BlockFormat = typeof BLOCK_FORMATS[number]['value'];

// ============================================
// LISTA FINAL DE UNIDADES (MVP0)
// ============================================

export const WORKOUT_UNITS = [
  { value: 'reps', label: 'reps' },
  { value: 'm', label: 'm' },
  { value: 'km', label: 'km' },
  { value: 'cal', label: 'cal' },
  { value: 'min', label: 'min' },
  { value: 'sec', label: 'sec' },
  { value: 'rounds', label: 'rounds' },
] as const;

export type WorkoutUnit = typeof WORKOUT_UNITS[number]['value'];

// ============================================
// PRESETS RÁPIDOS (AÇÕES RÁPIDAS)
// ============================================

export const QUICK_PRESETS = [
  { label: 'Reps', unit: 'reps' as WorkoutUnit, defaultQty: 10, icon: '🔄' },
  { label: 'Metros', unit: 'm' as WorkoutUnit, defaultQty: 100, icon: '📏' },
  { label: 'Calorias', unit: 'cal' as WorkoutUnit, defaultQty: 15, icon: '🔥' },
  { label: 'Tempo', unit: 'min' as WorkoutUnit, defaultQty: 1, icon: '⏱️' },
  { label: 'Rounds', unit: 'rounds' as WorkoutUnit, defaultQty: 3, icon: '🔁' },
] as const;

// ============================================
// INTERFACE DE RESULTADO DE VALIDAÇÃO
// ============================================

export interface CategoryValidationResult {
  isValid: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  // Flags internas calculadas
  flags: BlockFlags;
}

export interface BlockFlags {
  has_integrated_run: boolean;
  has_hyrox_station: boolean;
}

// ============================================
// MENSAGENS DE ERRO (UX OBRIGATÓRIA)
// ============================================

export const VALIDATION_MESSAGES = {
  // Categoria não selecionada
  CATEGORY_REQUIRED: {
    code: 'CATEGORY_REQUIRED',
    message: '❗ Selecione a categoria do bloco\nO sistema precisa saber como interpretar o treino.',
  },
  // Bloco sem conteúdo
  EMPTY_BLOCK: {
    code: 'EMPTY_BLOCK', 
    message: '❗ Este bloco não contém um treino\nAdicione ao menos uma linha com exercício, estrutura ou prescrição.',
  },
  // Força incompleta
  FORCA_INCOMPLETE: {
    code: 'FORCA_INCOMPLETE',
    message: '❗ Bloco de Força incompleto\nInclua reps/sets, carga ou PSE/RPE.',
  },
  // Metcon incompleto
  METCON_INCOMPLETE: {
    code: 'METCON_INCOMPLETE',
    message: '❗ Bloco de Metcon incompleto\nInclua AMRAP, EMOM, For Time, Rounds ou exercícios.',
  },
  // Específico inválido
  ESPECIFICO_INVALID: {
    code: 'ESPECIFICO_INVALID',
    message: '❗ Use Específico (HYROX) apenas para treinos com sled, wall ball, lunge ou carry.',
  },
  // Corrida incompleta
  CORRIDA_INCOMPLETE: {
    code: 'CORRIDA_INCOMPLETE',
    message: '❗ Informe distância ou intensidade (Zona, %FC ou pace).',
  },
  // Mantido por compatibilidade (não usado mais)
  MAIN_WOD_INVALID: {
    code: 'MAIN_WOD_INVALID',
    message: '❗ Este bloco não pode ser o treino principal do dia.',
  },
  MULTIPLE_MAIN_WODS: {
    code: 'MULTIPLE_MAIN_WODS',
    message: '❗ Apenas um treino principal por dia é permitido.',
  },
} as const;

// ============================================
// PADRÕES DE VALIDAÇÃO (REGEX)
// ============================================

/**
 * REGRAS DE INTENSIDADE MVP0:
 * 
 * FORÇA aceita:
 * - reps / sets / rounds (ex: 5x5, 3 sets de 8, 6 reps)
 * - PSE / RPE
 * - % de carga / kg
 * 
 * FORÇA **NÃO** aceita (ignorar silenciosamente):
 * - %FCmáx / Zona cardíaca (são de Corrida)
 * 
 * CORRIDA aceita:
 * - km / m / metros
 * - Zona / %FC / pace / frequência
 */

const PATTERNS = {
  // Força: séries/reps (ex: 5x5, 3 sets de 8, 6 reps, 4 séries)
  SERIES_REPS: /(\d+)\s*[xX×]\s*(\d+)|(\d+)\s*sets?|(\d+)\s*reps?|(\d+)\s*séries?|(\d+)\s*rounds?/i,
  
  // Força: carga/intensidade (EXCLUINDO zona/fc que são de Corrida)
  // Aceita: kg, % (de carga), PSE, RPE, carga, peso
  LOAD_INTENSITY: /(\d+)\s*kg|(\d+)\s*%(?!\s*fc)|[Pp][Ss][Ee]|[Rr][Pp][Ee]|carga|peso/i,
  
  // Metcon: estrutura
  METCON_STRUCTURE: /amrap|emom|for\s*time|rounds?|chipper|time\s*cap|tabata|interval|\d+\s*min/i,
  METCON_EXERCISES: /(\d+)\s*(reps?|cal|m\b|km|unidades)/i,
  
  // Específico (HYROX): estações
  HYROX_STATIONS: /sled|wall\s*ball|lunge|carry|sandbag|farmer/i,
  
  // Corrida: distância
  RUN_DISTANCE: /(\d+)\s*(km|m\b|metros?|quilômetros?)/i,
  
  // Corrida: intensidade cardíaca (exclusivo para Corrida, NÃO para Força)
  RUN_INTENSITY: /zona\s*\d|z\d|pace|%\s*fc|%\s*fcmax|frequência|bpm/i,
  
  // Flags: corrida integrada
  INTEGRATED_RUN: /run|corrida|trote|\d+\s*m\s*run|\d+\s*km/i,
};

// ============================================
// FUNÇÕES DE VALIDAÇÃO
// ============================================

/**
 * Extrai o texto completo do bloco para validação
 */
function getBlockFullText(blockContent: string, blockItems?: { movement: string; notes?: string }[]): string {
  let text = blockContent || '';
  
  // Adiciona itens estruturados se existirem
  if (blockItems && blockItems.length > 0) {
    const itemsText = blockItems
      .map(item => `${item.movement} ${item.notes || ''}`)
      .join(' ');
    text = `${text} ${itemsText}`;
  }
  
  return text.toLowerCase();
}

/**
 * Calcula flags internas do bloco
 */
export function calculateBlockFlags(content: string): BlockFlags {
  const text = content.toLowerCase();
  
  return {
    has_integrated_run: PATTERNS.INTEGRATED_RUN.test(text),
    has_hyrox_station: PATTERNS.HYROX_STATIONS.test(text),
  };
}

/**
 * Valida bloco de Força
 */
function validateForca(text: string): boolean {
  return PATTERNS.SERIES_REPS.test(text) || PATTERNS.LOAD_INTENSITY.test(text);
}

/**
 * Valida bloco de Metcon
 */
function validateMetcon(text: string): boolean {
  return PATTERNS.METCON_STRUCTURE.test(text) || PATTERNS.METCON_EXERCISES.test(text);
}

/**
 * Valida bloco Específico (HYROX)
 */
function validateEspecifico(text: string): boolean {
  return PATTERNS.HYROX_STATIONS.test(text);
}

/**
 * Valida bloco de Corrida
 */
function validateCorrida(text: string): boolean {
  return PATTERNS.RUN_DISTANCE.test(text) || PATTERNS.RUN_INTENSITY.test(text);
}

/**
 * Valida um bloco baseado em sua categoria
 * REGRA: Apenas block.category é usado - não título, não inferência
 */
export function validateBlockByCategory(
  category: string | null | undefined,
  content: string,
  blockItems?: { movement: string; notes?: string }[]
): CategoryValidationResult {
  const flags = calculateBlockFlags(content);
  
  // REGRA 1: Categoria obrigatória
  if (!category) {
    return {
      isValid: false,
      errorCode: VALIDATION_MESSAGES.CATEGORY_REQUIRED.code,
      errorMessage: VALIDATION_MESSAGES.CATEGORY_REQUIRED.message,
      flags,
    };
  }
  
  // Obter texto completo
  const fullText = getBlockFullText(content, blockItems);
  
  // REGRA 2: Bloco não pode estar vazio
  if (!fullText.trim()) {
    return {
      isValid: false,
      errorCode: VALIDATION_MESSAGES.EMPTY_BLOCK.code,
      errorMessage: VALIDATION_MESSAGES.EMPTY_BLOCK.message,
      flags,
    };
  }
  
  // REGRAS POR CATEGORIA
  switch (category) {
    case 'aquecimento':
    case 'acessorio':
    case 'mobilidade':
    case 'tecnica':
      // Livre - sem validação adicional
      return { isValid: true, errorCode: null, errorMessage: null, flags };
    
    case 'forca':
      if (!validateForca(fullText)) {
        return {
          isValid: false,
          errorCode: VALIDATION_MESSAGES.FORCA_INCOMPLETE.code,
          errorMessage: VALIDATION_MESSAGES.FORCA_INCOMPLETE.message,
          flags,
        };
      }
      return { isValid: true, errorCode: null, errorMessage: null, flags };
    
    case 'metcon':
      if (!validateMetcon(fullText)) {
        return {
          isValid: false,
          errorCode: VALIDATION_MESSAGES.METCON_INCOMPLETE.code,
          errorMessage: VALIDATION_MESSAGES.METCON_INCOMPLETE.message,
          flags,
        };
      }
      return { isValid: true, errorCode: null, errorMessage: null, flags };
    
    case 'especifico':
      if (!validateEspecifico(fullText)) {
        return {
          isValid: false,
          errorCode: VALIDATION_MESSAGES.ESPECIFICO_INVALID.code,
          errorMessage: VALIDATION_MESSAGES.ESPECIFICO_INVALID.message,
          flags,
        };
      }
      return { isValid: true, errorCode: null, errorMessage: null, flags };
    
    case 'corrida':
      if (!validateCorrida(fullText)) {
        return {
          isValid: false,
          errorCode: VALIDATION_MESSAGES.CORRIDA_INCOMPLETE.code,
          errorMessage: VALIDATION_MESSAGES.CORRIDA_INCOMPLETE.message,
          flags,
        };
      }
      return { isValid: true, errorCode: null, errorMessage: null, flags };
    
    default:
      // Categoria desconhecida - tratar como erro de categoria
      return {
        isValid: false,
        errorCode: VALIDATION_MESSAGES.CATEGORY_REQUIRED.code,
        errorMessage: VALIDATION_MESSAGES.CATEGORY_REQUIRED.message,
        flags,
      };
  }
}

/**
 * Valida se um bloco pode ser marcado como Principal
 */
export function canBlockBeMain(category: string | null | undefined): boolean {
  if (!category) return false;
  
  const categoryConfig = BLOCK_CATEGORIES.find(c => c.value === category);
  return categoryConfig?.canBeMain ?? false;
}

/**
 * Valida regras do WOD Principal para um dia
 * Retorna erro se houver violação
 */
export function validateMainWodRules(
  blocks: Array<{ category?: string | null; isMainWod?: boolean }>
): { isValid: boolean; errorCode: string | null; errorMessage: string | null } {
  const mainBlocks = blocks.filter(b => b.isMainWod === true);
  
  // REGRA: Apenas 1 principal por dia
  if (mainBlocks.length > 1) {
    return {
      isValid: false,
      errorCode: VALIDATION_MESSAGES.MULTIPLE_MAIN_WODS.code,
      errorMessage: VALIDATION_MESSAGES.MULTIPLE_MAIN_WODS.message,
    };
  }
  
  // REGRA: Se marcado como principal, verificar se a categoria permite
  for (const block of mainBlocks) {
    if (!canBlockBeMain(block.category)) {
      return {
        isValid: false,
        errorCode: VALIDATION_MESSAGES.MAIN_WOD_INVALID.code,
        errorMessage: VALIDATION_MESSAGES.MAIN_WOD_INVALID.message,
      };
    }
  }
  
  return { isValid: true, errorCode: null, errorMessage: null };
}

/**
 * Validação completa de todos os blocos de um dia
 */
export function validateDayBlocks(
  blocks: Array<{
    category?: string | null;
    content: string;
    isMainWod?: boolean;
    items?: { movement: string; notes?: string }[];
  }>
): {
  isValid: boolean;
  blockErrors: Array<{ blockIndex: number; errorCode: string; errorMessage: string }>;
  dayError: { errorCode: string; errorMessage: string } | null;
} {
  const blockErrors: Array<{ blockIndex: number; errorCode: string; errorMessage: string }> = [];
  
  // Validar cada bloco individualmente
  blocks.forEach((block, index) => {
    const result = validateBlockByCategory(block.category, block.content, block.items);
    if (!result.isValid && result.errorCode && result.errorMessage) {
      blockErrors.push({
        blockIndex: index,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      });
    }
  });
  
  // Validar regras do WOD Principal
  const mainWodValidation = validateMainWodRules(blocks);
  
  return {
    isValid: blockErrors.length === 0 && mainWodValidation.isValid,
    blockErrors,
    dayError: mainWodValidation.isValid ? null : {
      errorCode: mainWodValidation.errorCode!,
      errorMessage: mainWodValidation.errorMessage!,
    },
  };
}

/**
 * Helper: Obter emoji da categoria
 */
export function getCategoryEmoji(category: string | null | undefined): string {
  if (!category) return '❓';
  const config = BLOCK_CATEGORIES.find(c => c.value === category);
  return config?.emoji ?? '❓';
}

/**
 * Helper: Obter label da categoria
 */
export function getCategoryLabel(category: string | null | undefined): string {
  if (!category) return 'Selecione a categoria';
  const config = BLOCK_CATEGORIES.find(c => c.value === category);
  return config?.label ?? 'Categoria desconhecida';
}
