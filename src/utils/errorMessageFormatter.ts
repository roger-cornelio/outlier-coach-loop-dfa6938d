/**
 * errorMessageFormatter.ts - Formatação padronizada de mensagens de erro
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANÔNICO — NÃO CRIAR VARIAÇÕES — MVP0
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este é o ÚNICO formatador de mensagens de erro do coach.
 * 
 * ESTRUTURA OBRIGATÓRIA DE TODA MENSAGEM DE ERRO:
 * - 🔴 Erro de estrutura — {DIA_DA_SEMANA}
 * - Linha {NÚMERO_DA_LINHA}
 * - 📌 O que aconteceu
 * - 🛠️ O que fazer agora
 * - ✅ Exemplo correto
 * - 🎯 Próximo passo
 */

import type { StructureIssue } from './structuredTextParser';

// Tipos de erro conhecidos
export type ErrorType = 
  | 'HYBRID_LINE' 
  | 'NO_STRUCTURE' 
  | 'MISSING_DAY' 
  | 'ISOLATED_COMMENT' 
  | 'AMBIGUOUS_CONTENT'
  | 'REST_WITH_STIMULUS'
  | 'GENERIC';

// Mapeamento de dias
const DAY_NAMES: Record<number, string> = {
  0: 'SEGUNDA',
  1: 'TERÇA',
  2: 'QUARTA',
  3: 'QUINTA',
  4: 'SEXTA',
  5: 'SÁBADO',
  6: 'DOMINGO',
};

// Copys padrão por tipo de erro
const ERROR_COPIES: Record<ErrorType, {
  whatHappened: string;
  whatToDo: string;
  exampleFix: string;
}> = {
  HYBRID_LINE: {
    whatHappened: 'A instrução do treino contém termos subjetivos misturados com a execução (ex.: "leve", "confortável").',
    whatToDo: 'Torne o treino objetivo e deixe a percepção no comentário.',
    exampleFix: `[TREINO]
45 min corrida PSE 5

[COMENTÁRIO]
Bem confortável`,
  },
  NO_STRUCTURE: {
    whatHappened: 'O sistema não conseguiu identificar claramente a estrutura do bloco.',
    whatToDo: 'Adicione um nome de bloco ou organize o conteúdo em linhas claras.',
    exampleFix: `Força
5x5 Back Squat`,
  },
  MISSING_DAY: {
    whatHappened: 'O treino não está associado a um dia válido da semana.',
    whatToDo: 'Inicie o treino com um dia válido (SEGUNDA a DOMINGO).',
    exampleFix: `SEGUNDA
Aquecimento
10 min corrida leve`,
  },
  ISOLATED_COMMENT: {
    whatHappened: 'Foi identificado um comentário sem uma instrução de treino associada.',
    whatToDo: 'Adicione a instrução do treino ou remova o comentário.',
    exampleFix: `[TREINO]
Mobilidade leve 15 minutos`,
  },
  AMBIGUOUS_CONTENT: {
    whatHappened: 'O sistema encontrou um trecho que não conseguiu classificar como treino válido.',
    whatToDo: 'Torne a instrução mais objetiva ou reescreva o trecho.',
    exampleFix: `Remo 2000m
Ritmo constante`,
  },
  REST_WITH_STIMULUS: {
    whatHappened: 'Foi identificado contexto de descanso/opcional junto com estímulo executável.',
    whatToDo: 'Use as tags [TREINO] e [COMENTÁRIO] para separar claramente.',
    exampleFix: `[TREINO]
Corrida leve 30 minutos

[COMENTÁRIO]
Opcional — apenas para soltar`,
  },
  GENERIC: {
    whatHappened: 'O sistema identificou um problema na estrutura do treino.',
    whatToDo: 'Revise o texto e corrija conforme o exemplo abaixo.',
    exampleFix: `[TREINO]
Seu estímulo aqui

[COMENTÁRIO]
Observações opcionais`,
  },
};

/**
 * Detecta o tipo de erro com base no message da issue
 */
export function detectErrorType(issue: StructureIssue): ErrorType {
  const msg = issue.message.toLowerCase();
  
  if (msg.includes('mistura') && (msg.includes('treino') || msg.includes('comentário'))) {
    return 'HYBRID_LINE';
  }
  if (msg.includes('estrutura') && msg.includes('não')) {
    return 'NO_STRUCTURE';
  }
  if (msg.includes('dia') && (msg.includes('ausente') || msg.includes('inválido'))) {
    return 'MISSING_DAY';
  }
  if (msg.includes('comentário') && msg.includes('isolado')) {
    return 'ISOLATED_COMMENT';
  }
  if (msg.includes('ambíguo') || msg.includes('não reconhecido')) {
    return 'AMBIGUOUS_CONTENT';
  }
  if (msg.includes('descanso') || msg.includes('opcional')) {
    return 'REST_WITH_STIMULUS';
  }
  
  return 'GENERIC';
}

/**
 * Retorna o nome do dia da semana com base no dayIndex
 */
export function getDayNameFromIndex(dayIndex?: number): string {
  if (dayIndex === undefined || dayIndex < 0 || dayIndex > 6) {
    return 'DIA NÃO IDENTIFICADO';
  }
  return DAY_NAMES[dayIndex] || 'DIA NÃO IDENTIFICADO';
}

/**
 * Formata a mensagem de erro completa com estrutura padronizada
 */
export interface FormattedError {
  // Header
  dayName: string;
  blockTitle: string;
  lineNumber: number | null;
  severity: 'ERROR' | 'WARNING';
  
  // Content
  whatHappened: string;
  whatToDo: string;
  exampleFix: string;
  
  // Original data
  lineText?: string;
  originalMessage: string;
  
  // Navigation
  dayIndex?: number;
  blockIndex?: number;
}

/**
 * Gera o título do bloco baseado no blockTitle da issue ou fallback
 */
function getBlockTitle(issue: StructureIssue): string {
  if (issue.blockTitle && issue.blockTitle.trim()) {
    return issue.blockTitle.trim();
  }
  if (issue.blockIndex !== undefined) {
    return `Bloco ${issue.blockIndex + 1}`;
  }
  return '';
}

/**
 * Converte uma StructureIssue em um FormattedError padronizado
 */
export function formatStructureIssue(issue: StructureIssue): FormattedError {
  const errorType = detectErrorType(issue);
  const copy = ERROR_COPIES[errorType];
  
  return {
    dayName: getDayNameFromIndex(issue.dayIndex),
    blockTitle: getBlockTitle(issue),
    lineNumber: issue.lineNumber || null,
    severity: issue.severity,
    whatHappened: copy.whatHappened,
    whatToDo: copy.whatToDo,
    exampleFix: issue.sampleFix || copy.exampleFix,
    lineText: issue.lineText,
    originalMessage: issue.message,
    dayIndex: issue.dayIndex,
    blockIndex: issue.blockIndex,
  };
}

/**
 * Formata uma lista de issues em FormattedErrors
 */
export function formatStructureIssues(issues: StructureIssue[]): FormattedError[] {
  return issues.map(formatStructureIssue);
}
