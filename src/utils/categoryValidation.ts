/**
 * categoryValidation.ts - Sistema Anti-Burro de Categorias MVP0
 * 
 * PRINCÍPIOS:
 * 1. Categoria é o ÚNICO sinal para o motor (não título, não texto)
 * 2. Validações determinísticas por categoria
 * 3. Mensagens claras user-friendly
 * 4. Flags internas para dificuldade (has_integrated_run, has_hyrox_station)
 */

// ============================================
// LISTA FINAL DE CATEGORIAS (MVP0)
// ============================================

export const BLOCK_CATEGORIES = [
  { value: 'aquecimento', label: 'Aquecimento', emoji: '🔥', canBeMain: false },
  { value: 'forca', label: 'Força', emoji: '💪', canBeMain: true },
  { value: 'metcon', label: 'Metcon', emoji: '⚡', canBeMain: true },
  { value: 'especifico', label: 'Específico (HYROX)', emoji: '🛷', canBeMain: true },
  { value: 'corrida', label: 'Corrida', emoji: '🏃', canBeMain: false }, // MVP0: não pode ser principal
  { value: 'acessorio', label: 'Acessório', emoji: '🎯', canBeMain: false },
] as const;

export type BlockCategory = typeof BLOCK_CATEGORIES[number]['value'];

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
    message: '❗ Selecione a categoria do bloco\nO sistema precisa saber se este treino é Força, Metcon, Corrida ou Específico (HYROX).',
  },
  // Bloco sem conteúdo
  EMPTY_BLOCK: {
    code: 'EMPTY_BLOCK', 
    message: '❗ Este bloco não contém um treino\nAdicione ao menos uma linha com exercício, estrutura ou prescrição.',
  },
  // Força incompleta
  FORCA_INCOMPLETE: {
    code: 'FORCA_INCOMPLETE',
    message: '❗ Bloco de Força incompleto\nInclua séries/reps, carga (%/kg) ou PSE/RPE.',
  },
  // Metcon incompleto
  METCON_INCOMPLETE: {
    code: 'METCON_INCOMPLETE',
    message: '❗ Bloco de Metcon incompleto\nInclua AMRAP, EMOM, For Time, Rounds ou exercícios com repetições.',
  },
  // Específico inválido
  ESPECIFICO_INVALID: {
    code: 'ESPECIFICO_INVALID',
    message: '❗ Bloco Específico (HYROX) inválido\nUse esta categoria apenas para treinos com estações como sled, wall ball, lunge ou carry.',
  },
  // Corrida incompleta
  CORRIDA_INCOMPLETE: {
    code: 'CORRIDA_INCOMPLETE',
    message: '❗ Bloco de Corrida incompleto\nInforme distância (km/m) ou intensidade (Zona, pace ou %FC).',
  },
  // Principal inválido
  MAIN_WOD_INVALID: {
    code: 'MAIN_WOD_INVALID',
    message: '❗ Este bloco não pode ser o treino principal do dia.',
  },
  // Mais de um principal
  MULTIPLE_MAIN_WODS: {
    code: 'MULTIPLE_MAIN_WODS',
    message: '❗ Apenas um treino principal por dia é permitido.',
  },
} as const;

// ============================================
// PADRÕES DE VALIDAÇÃO (REGEX)
// ============================================

const PATTERNS = {
  // Força: séries/reps ou carga
  SERIES_REPS: /(\d+)\s*[xX×]\s*(\d+)|(\d+)\s*sets?|(\d+)\s*reps?|(\d+)\s*séries?/i,
  LOAD_INTENSITY: /(\d+)\s*kg|(\d+)\s*%|[Pp][Ss][Ee]|[Rr][Pp][Ee]|carga|peso/i,
  
  // Metcon: estrutura
  METCON_STRUCTURE: /amrap|emom|for\s*time|rounds?|chipper|time\s*cap|tabata|\d+\s*min/i,
  METCON_EXERCISES: /(\d+)\s*(reps?|cal|m\b|km|unidades)/i,
  
  // Específico (HYROX): estações
  HYROX_STATIONS: /sled|wall\s*ball|lunge|carry|sandbag|farmer/i,
  
  // Corrida: distância ou intensidade
  RUN_DISTANCE: /(\d+)\s*(km|m\b|metros?|quilômetros?)/i,
  RUN_INTENSITY: /zona\s*\d|z\d|pace|%\s*fc|frequência|bpm|\d+['′:]?\d*/i,
  
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
