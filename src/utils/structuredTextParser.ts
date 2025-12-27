/**
 * structuredTextParser.ts - Parser de texto livre de treino
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANÔNICO — NÃO CRIAR VARIAÇÕES — MVP0
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este é o ÚNICO parser de texto de treino da aplicação.
 * 
 * CONTRATO:
 * - Entrada: string (texto do textarea, sem modificações)
 * - Saída: ParseResult (estrutura de dias/blocos/exercícios)
 * 
 * PROIBIDO:
 * - Criar parsers paralelos
 * - Modificar o texto antes de chamar este parser
 * - Inserir cabeçalhos de dia no texto
 * - Parsing "por página" ou "por print"
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * PRINCÍPIO FUNDAMENTAL: ATLETA > COACH
 * ═══════════════════════════════════════════════════════════════════════════════
 * Em qualquer situação de ambiguidade, dúvida ou incerteza:
 * - A experiência do atleta tem prioridade absoluta
 * - Preferir BLOQUEAR o coach a gerar resultado incorreto para o atleta
 * - O sistema NUNCA tenta adivinhar intenção do coach
 * - Se não há 100% de certeza, o sistema NÃO executa
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * REGRAS DE PARSING (DETERMINÍSTICO):
 * - Linhas MAIÚSCULAS → dias ou títulos de blocos
 * - Linhas iniciadas por número → exercícios
 * - Separador ⸻ → fim explícito do bloco
 * - REGRA PRINCIPAL: Todo texto abaixo de um BLOCO pertence ao BLOCO até:
 *   - Novo BLOCO (linha maiúscula)
 *   - Novo DIA
 *   - Separador ⸻
 * - Pesos: % → relativo, PSE/RPE → esforço, 32/24kg → referência RX, kg isolado → carga fixa (gerar alerta)
 * 
 * VALIDAÇÕES BLOQUEANTES (fail-safe):
 * - Título de bloco obrigatório (não pode começar com exercício)
 * - WOD principal só via ação explícita do coach
 * - Nenhuma inferência que gere ambiguidade para o atleta
 */

import type { DayOfWeek, DayWorkout, WorkoutBlock } from '@/types/outlier';

// ============================================
// TIPOS
// ============================================

export interface ParsedItem {
  quantity: number;
  unit: string;
  movement: string;
  notes?: string;
  weight?: string;
  isWeightAlert?: boolean; // Alerta quando kg isolado
}

// ============================================
// MVP0: CLASSIFICAÇÃO DE ITENS — EXERCISE / REST / NOTE
// ============================================
// Cada linha é classificada com:
// - kind: EXERCISE | REST | NOTE
// - confidence: HIGH | MEDIUM | LOW
// - flags: OPTIONAL (exercício trackável mas não obrigatório)

export type ItemKind = 'EXERCISE' | 'REST' | 'NOTE';
export type ItemConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

// Flags especiais para itens
export interface ItemFlags {
  optional?: boolean; // Exercício opcional trackável (aparece pro atleta, só computa se feito)
}

// Resultado de classificação de uma linha
export interface ClassifiedItem {
  kind: ItemKind;
  confidence: ItemConfidence;
  flags?: ItemFlags;
}

// Legacy type alias para compatibilidade
export type LineType = 'exercise' | 'comment';

export interface ParsedLine {
  id: string; // ID único para reordenação
  text: string;
  type: LineType;
  // MVP0: Novos campos de classificação
  kind?: ItemKind;
  confidence?: ItemConfidence;
  flags?: ItemFlags;
}

export interface ParsedBlock {
  title: string;
  type: WorkoutBlock['type'];
  format: string;
  formatDisplay?: string; // Formato extraído para exibição (ex: "EMOM 30'")
  isMainWod: boolean;
  isBenchmark: boolean;
  optional: boolean; // Treino opcional (não exige WOD principal)
  items: ParsedItem[];
  lines: ParsedLine[]; // Linhas classificadas (exercício ou comentário)
  coachNotes: string[];
  instruction?: string;
  instructions: string[]; // Lista de instruções do bloco
  isAutoGenTitle?: boolean; // True se título foi gerado automaticamente como "BLOCO X"
}

export interface ParsedDay {
  day: DayOfWeek | null; // Pode ser null se não identificado
  blocks: ParsedBlock[];
  alerts: string[]; // Alertas no nível do dia
  isRestDay?: boolean; // MVP0: Dia de descanso não exige WOD Principal
}

export interface ParseResult {
  success: boolean;
  days: ParsedDay[];
  errors: string[];
  warnings: string[];
  alerts: string[]; // Alertas globais
  needsDaySelection?: boolean; // Indica se precisa selecionar dia manualmente
  hasDayAnchors?: boolean; // MVP0: Indica se o texto tem âncoras de dia (SEGUNDA, TERÇA, etc.)
}

// ============================================
// VALIDAÇÃO DE DIAS DA SEMANA — MVP0
// ============================================
// O PACER só pode rodar se o texto tiver dias da semana explícitos
// OU se o dia veio via UI (importação por dia)

const DAY_ANCHOR_PATTERNS = [
  /\bsegunda(?:-feira)?\b/i,
  /\bter[çc]a(?:-feira)?\b/i,
  /\bquarta(?:-feira)?\b/i,
  /\bquinta(?:-feira)?\b/i,
  /\bsexta(?:-feira)?\b/i,
  /\bs[aá]bado\b/i,
  /\bdomingo\b/i,
  /\b(?:###?\s*)?seg\b/i,
  /\b(?:###?\s*)?ter\b/i,
  /\b(?:###?\s*)?qua\b/i,
  /\b(?:###?\s*)?qui\b/i,
  /\b(?:###?\s*)?sex\b/i,
  /\b(?:###?\s*)?sab\b/i,
  /\b(?:###?\s*)?dom\b/i,
];

/**
 * MVP0: Valida se o texto tem âncoras de dia da semana
 * REGRA: O PACER nunca pode rodar em texto sem dias explícitos
 * 
 * @returns { hasDays: boolean, daysFound: string[] }
 */
export function validateDayAnchors(text: string): { hasDays: boolean; daysFound: string[] } {
  const daysFound: string[] = [];
  const normalizedText = text.toLowerCase();
  
  const dayNames = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  
  for (let i = 0; i < DAY_ANCHOR_PATTERNS.length; i++) {
    const pattern = DAY_ANCHOR_PATTERNS[i];
    if (pattern.test(normalizedText)) {
      // Mapear para nome legível
      const dayIndex = i % 7;
      const dayName = dayNames[dayIndex];
      if (!daysFound.includes(dayName)) {
        daysFound.push(dayName);
      }
    }
  }
  
  return {
    hasDays: daysFound.length > 0,
    daysFound,
  };
}

// ============================================
// MAPEAMENTOS
// ============================================

const DAY_MAP: Record<string, DayOfWeek> = {
  'segunda': 'seg',
  'segunda-feira': 'seg',
  'seg': 'seg',
  'monday': 'seg',
  'mon': 'seg',
  'terça': 'ter',
  'terca': 'ter',
  'terça-feira': 'ter',
  'ter': 'ter',
  'tuesday': 'ter',
  'tue': 'ter',
  'quarta': 'qua',
  'quarta-feira': 'qua',
  'qua': 'qua',
  'wednesday': 'qua',
  'wed': 'qua',
  'quinta': 'qui',
  'quinta-feira': 'qui',
  'qui': 'qui',
  'thursday': 'qui',
  'thu': 'qui',
  'sexta': 'sex',
  'sexta-feira': 'sex',
  'sex': 'sex',
  'friday': 'sex',
  'fri': 'sex',
  'sábado': 'sab',
  'sabado': 'sab',
  'sab': 'sab',
  'saturday': 'sab',
  'sat': 'sab',
  'domingo': 'dom',
  'dom': 'dom',
  'sunday': 'dom',
  'sun': 'dom',
};

// ============================================
// REGRA MESTRA: isTrainingStimulus — ESTÍMULO = TREINO
// ============================================
// Se existe estímulo mensurável, é TREINO. PONTO FINAL.
// Retorna true se a linha contiver padrão de estímulo físico

function isTrainingStimulus(line: string): boolean {
  // ⏱️ TEMPO: min, minutes, ', minutos, até X minutos
  if (/\d+\s*(?:min|minutos?|minutes?|')\b/i.test(line)) return true;
  if (/até\s*\d+\s*(?:min|minutos?)/i.test(line)) return true;
  
  // 📏 DISTÂNCIA: m, km, metros
  if (/\d+\s*(?:m|km|metros?)\b/i.test(line)) return true;
  
  // 🔁 REPETIÇÃO / VOLUME: reps, rounds, EMOM, AMRAP, For Time
  if (/\d+\s*(?:reps?|rounds?|rodadas?)\b/i.test(line)) return true;
  if (/\b(?:emom|amrap|for\s*time|tabata)\b/i.test(line)) return true;
  
  // ❤️ ZONA / ESFORÇO: Zona, FC, PSE, RPE
  if (/\b(?:zona|zone)\s*\d/i.test(line)) return true;
  if (/\b(?:fc|hr)\s*[:=]?\s*\d/i.test(line)) return true;
  if (/\b(?:pse|rpe)\s*[:=]?\s*\d/i.test(line)) return true;
  
  // Faixa de valores (30-40, 30–40)
  if (/\d+\s*[-–]\s*\d+\s*(?:min|'|m|km)/i.test(line)) return true;
  
  return false;
}

// ============================================
// HEURÍSTICA: isPrescriptionLine — PRESCRIÇÃO MENSURÁVEL
// ============================================
// Para dias de descanso: detecta se a linha é prescrição de treino
// REGRA: Tempo ou distância SOZINHOS já caracterizam treino!
// "45 min" ou "10km" são VÁLIDOS mesmo sem atividade explícita

function isPrescriptionLine(line: string): boolean {
  // a) Verificar medida mensurável (SUFICIENTE POR SI SÓ)
  const hasMeasurableTime = /(?:^|[^\d])(\d{1,3})\s*(?:min|minutos?|'|h|hora|horas)\b/i.test(line) ||
                            /até\s*\d+\s*(?:min|minutos?)/i.test(line) ||
                            /\d+\+?\s*(?:min|minutos)/i.test(line);
  const hasMeasurableDistance = /\d+\s*(?:m|km)\b/i.test(line);
  
  // REGRA CRÍTICA: Tempo ou distância SOZINHOS já caracterizam treino
  // "45 min" = treino válido, "10km" = treino válido
  if (hasMeasurableTime || hasMeasurableDistance) {
    return true;
  }
  
  return false;
}

// ============================================
// INFERIR TIPO DE PRESCRIÇÃO POR LINHA
// ============================================
function inferPrescriptionType(line: string): WorkoutBlock['type'] {
  if (/\b(?:corrida|trote|run|running|km|pace)\b/i.test(line)) return 'corrida';
  if (/\b(?:bike|airbike|assault|ciclismo|cycling)\b/i.test(line)) return 'corrida';
  if (/\b(?:remo|row|rowing|ski|erg)\b/i.test(line)) return 'corrida';
  if (/\b(?:caminhada|walk)\b/i.test(line)) return 'corrida';
  if (/\b(?:swimming|natação|swim)\b/i.test(line)) return 'corrida';
  
  // Se tem tempo/distância mas sem atividade explícita, assume cardio/conditioning
  return 'conditioning';
}

// ============================================
// INFERÊNCIA DE TIPO — TÍTULO PRIMEIRO, DEPOIS CONTEÚDO
// ============================================

// Mapeamento determinístico de tipo pelo TÍTULO (case-insensitive, match simples)
// ORDEM IMPORTA: padrões mais específicos primeiro
const TYPE_PATTERNS: { pattern: RegExp; type: WorkoutBlock['type'] }[] = [
  // Aquecimento
  { pattern: /aquec/i, type: 'aquecimento' },
  { pattern: /warm[- ]?up/i, type: 'aquecimento' },
  { pattern: /🔥/i, type: 'aquecimento' },
  
  // Força (inclui Grip)
  { pattern: /for[cç]a/i, type: 'forca' },
  { pattern: /strength/i, type: 'forca' },
  { pattern: /grip/i, type: 'forca' },
  { pattern: /💪/i, type: 'forca' },
  
  // Específico (Hyrox, etc)
  { pattern: /espec[ií]fico/i, type: 'especifico' },
  { pattern: /specific/i, type: 'especifico' },
  { pattern: /hyrox/i, type: 'especifico' },
  { pattern: /🛷/i, type: 'especifico' },
  
  // Core
  { pattern: /core/i, type: 'core' },
  { pattern: /abdominal/i, type: 'core' },
  { pattern: /🎯/i, type: 'core' },
  
  // Corrida/Cardio
  { pattern: /corrida/i, type: 'corrida' },
  { pattern: /running/i, type: 'corrida' },
  { pattern: /\brun\b/i, type: 'corrida' },
  { pattern: /bike/i, type: 'corrida' },
  { pattern: /airbike/i, type: 'corrida' },
  { pattern: /ciclismo/i, type: 'corrida' },
  { pattern: /cycling/i, type: 'corrida' },
  { pattern: /remo/i, type: 'corrida' },
  { pattern: /row/i, type: 'corrida' },
  { pattern: /ski/i, type: 'corrida' },
  { pattern: /🏃/i, type: 'corrida' },
  
  // Descanso técnico → Aquecimento
  { pattern: /descanso/i, type: 'aquecimento' },
  { pattern: /\brest\b/i, type: 'aquecimento' },
  { pattern: /recovery/i, type: 'aquecimento' },
  
  // Conditioning (WOD, AMRAP, etc) - por último como fallback
  { pattern: /conditioning/i, type: 'conditioning' },
  { pattern: /condicionamento/i, type: 'conditioning' },
  { pattern: /metcon/i, type: 'conditioning' },
  { pattern: /\bwod\b/i, type: 'conditioning' },
  { pattern: /amrap/i, type: 'conditioning' },
  { pattern: /for\s*time/i, type: 'conditioning' },
  { pattern: /emom/i, type: 'conditioning' },
  { pattern: /⚡/i, type: 'conditioning' },
];

// Mapeamento de tipo por CONTEÚDO (usado se título não definir tipo)
const CONTENT_TYPE_PATTERNS: { pattern: RegExp; type: WorkoutBlock['type'] }[] = [
  { pattern: /\b(?:corrida|run|running|km|pace)\b/i, type: 'corrida' },
  { pattern: /\b(?:bike|airbike|assault)\b/i, type: 'corrida' },
  { pattern: /\b(?:remo|row|rowing|ski|erg)\b/i, type: 'corrida' },
  { pattern: /\b(?:sled|sandbag|wall\s*ball|farmer|carry|lunges?)\b/i, type: 'especifico' },
  { pattern: /\b(?:core|plank|toes?\s*to\s*bar|sit[- ]?up|hollow)\b/i, type: 'core' },
  { pattern: /\b(?:squat|deadlift|press|clean|snatch|jerk)\b/i, type: 'forca' },
];

// ============================================
// VALIDAÇÃO DE TÍTULO MVP0
// ============================================
// A 1ª linha do bloco vira title APENAS SE não for:
// - Categoria isolada (Aquecimento, Força, Metcon, etc.)
// - Formato (AMRAP, EMOM, For Time, Rounds, Intervalos)
// - Começa com número/unidade (5 Rounds, 10km, 500m, Min 1:)

const CATEGORY_ONLY_PATTERNS = [
  /^aquecimento$/i,
  /^for[çc]a$/i,
  /^metcon$/i,
  /^espec[ií]fico$/i,
  /^corrida$/i,
  /^acess[óo]rio$/i,
  /^condicionamento$/i,
  /^core$/i,
  /^mobilidade$/i,
  /^wod$/i,
];

const FORMAT_ONLY_PATTERNS = [
  /^amrap$/i,
  /^emom$/i,
  /^for\s+time$/i,
  /^rounds?$/i,
  /^intervalos?$/i,
  /^tabata$/i,
  /^e\d+m(om)?$/i,  // E2MOM, E3M, etc.
];

const STARTS_WITH_NUMBER_UNIT = /^\d+\s*(rounds?|km|m|min|x|reps?|cal|calorias?)\b/i;
const MIN_PATTERN = /^min\s*\d+/i;  // Min 1:, Min 2:, etc.

function isLineACategoryOrFormat(line: string): boolean {
  const trimmed = line.trim();
  
  // Verifica se é categoria isolada
  for (const pattern of CATEGORY_ONLY_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  
  // Verifica se é formato isolado
  for (const pattern of FORMAT_ONLY_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  
  // Verifica se começa com número + unidade
  if (STARTS_WITH_NUMBER_UNIT.test(trimmed)) return true;
  
  // Verifica padrão "Min X:"
  if (MIN_PATTERN.test(trimmed)) return true;
  
  return false;
}

// Função para limpar título removendo prefixos técnicos
// REGRA: Nunca substituir nome do coach por rótulos sistêmicos
// REGRA MVP0: Retornar string VAZIA se não houver título real (fallback só na UI)
function cleanBlockTitle(title: string): string {
  // Se for categoria/formato isolado, NÃO é título → retorna vazio
  if (isLineACategoryOrFormat(title)) {
    return '';
  }
  
  // Remove prefixo "TREINO" ou "TREINO -"
  let cleaned = title.replace(/^TREINO\s*[-–—:]?\s*/i, '').trim();
  // Remove "WOD" ou "METCON" se seguido de outro texto (mantém se for o único)
  if (/^(WOD|METCON)\s*[-–—:]?\s*.{3,}/i.test(cleaned)) {
    cleaned = cleaned.replace(/^(WOD|METCON)\s*[-–—:]?\s*/i, '').trim();
  }
  
  // Após limpeza, verificar novamente se virou categoria/formato
  if (isLineACategoryOrFormat(cleaned)) {
    return '';
  }
  
  // REGRA MVP0: Se não há título válido, retorna VAZIO (fallback só na UI)
  // NUNCA retornar "Bloco X" aqui - isso é dado, não display
  if (!cleaned || cleaned.length < 2) {
    return '';
  }
  return cleaned;
}

// ============================================
// DERIVAR TÍTULO DO BLOCO (OPÇÃO A)
// ============================================
// derivedTitle = primeira linha não vazia do conteúdo textual do bloco
// NÃO criar campo novo - calculado em runtime para exibição e validação

export function getDerivedTitle(block: ParsedBlock): string {
  // 1. Se block.title existe e está preenchido (não é fallback), usar
  // MVP0: Ignorar títulos auto-gerados "Bloco X" / "BLOCO X" no dado
  if (block.title && 
      block.title.trim().length > 0 && 
      !/^Bloco \d+$/i.test(block.title) &&
      !/^BLOCO \d+$/i.test(block.title)) {
    return block.title.trim();
  }
  
  // 2. Senão, derivar da primeira linha não vazia do conteúdo
  // Prioridade: instruction > instructions[0] > items[0].movement
  if (block.instruction && block.instruction.trim().length > 0) {
    return block.instruction.trim();
  }
  
  if (block.instructions && block.instructions.length > 0) {
    const firstInstruction = block.instructions[0]?.trim();
    if (firstInstruction && firstInstruction.length > 0) {
      return firstInstruction;
    }
  }
  
  // 3. Se ainda não tem, está vazio
  return '';
}

// ============================================
// VALIDAÇÃO DE TÍTULO — REGRA ANTI-BURRO (CORRIGIDA)
// ============================================
// Um bloco só é "sem título" se:
//   - não existir block.title E derivedTitle estiver vazio
//
// Um bloco tem "título inválido por parecer exercício" se:
//   - derivedTitle (ou block.title) contiver sinais claros de prescrição

// Verifica se a linha parece prescrição/exercício (inválida para título)
// REGRA CORRIGIDA: Só rejeita se a linha CLARAMENTE for uma prescrição de exercício
// Títulos humanos livres como "Grip & Strength", "Conditioning — For Time" são VÁLIDOS
export function looksLikePrescription(line: string): boolean {
  if (!line || line.trim().length === 0) return false;
  
  const trimmed = line.trim();
  
  // 1. Começa com marcador de lista: -, •, 1), 1.
  // EXCEÇÃO: "— " (travessão) é separador válido em títulos como "Conditioning — For Time"
  if (/^[-•]\s/.test(trimmed)) return true; // Hífen seguido de espaço = lista
  if (/^\d+[).]\s/.test(trimmed)) return true; // "1) " ou "1. " = lista
  
  // 2. Linha que COMEÇA com número seguido de unidade/exercício = prescrição clara
  // Ex: "10km", "5 Rounds", "30' EMOM", "3x10 Pull-ups"
  if (/^\d+/.test(trimmed)) return true;
  
  // 3. Padrões de FORMAT LINE - são CONTEÚDO de bloco, não títulos
  // Ex: "EMOM 30'", "AMRAP 15", "For Time", "E2MOM 12", "Every 2 min"
  // Mas "Conditioning — For Time" ou "Specific — AMRAP" são VÁLIDOS (contêm mais contexto antes)
  if (isFormatLine(trimmed)) return true;
  
  // 4. Contém unidades de medida que indicam prescrição clara
  // kg, lb, cal com números próximos
  if (/\d+\s*(kg|lb|cal)\b/i.test(trimmed)) return true;
  
  // 5. Padrão "Min X:" que indica EMOM
  if (/^min\s*\d+\s*:/i.test(trimmed)) return true;
  
  // TUDO MAIS É VÁLIDO como título humano
  // Ex: "Grip & Strength", "Força Específica", "Conditioning — For Time"
  return false;
}

// ============================================
// FORMAT LINE - Linhas de formato (EMOM, AMRAP, etc.)
// ============================================
// Essas linhas NUNCA abrem um novo bloco - são CONTEÚDO do bloco
// Se aparecerem como primeira linha, o bloco recebe título genérico "BLOCO {n}"

export function isFormatLine(line: string): boolean {
  if (!line || line.trim().length === 0) return false;
  
  const trimmed = line.trim();
  
  // Padrões de formato que NÃO são títulos de bloco:
  // EMOM, E2MOM, E3MOM (E\d+MOM), AMRAP, For Time, Tabata, Every X min
  const formatPatterns = [
    /^emom\b/i,                      // EMOM, EMOM 30'
    /^e\d+mom\b/i,                   // E2MOM, E3MOM, etc.
    /^amrap\b/i,                     // AMRAP, AMRAP 15
    /^for\s*time\b/i,                // For Time
    /^tabata\b/i,                    // Tabata
    /^every\s+\d+/i,                 // Every 2 min, Every 90 sec
    /^rft\b/i,                       // RFT (Rounds For Time)
  ];
  
  return formatPatterns.some(pattern => pattern.test(trimmed));
}

// Extrai o formato limpo de uma linha de formato
export function extractFormatFromLine(line: string): string {
  if (!line) return '';
  return line.trim();
}

// Retorna true se o bloco tem problema de título
// - Sem título: derivedTitle vazio
// - Título inválido: derivedTitle parece prescrição
export function isInvalidBlockTitle(title: string, block?: ParsedBlock): boolean {
  // Se recebeu o bloco, usar derivedTitle
  if (block) {
    const derived = getDerivedTitle(block);
    
    // Sem título = derivedTitle vazio
    if (!derived || derived.length === 0) return true;
    
    // Título inválido = parece prescrição
    return looksLikePrescription(derived);
  }
  
  // Fallback: validar o título diretamente (para compatibilidade)
  if (!title || title.trim().length === 0) return true;
  // MVP0: "Bloco X" no dado é inválido (deve estar vazio, não preenchido com fallback)
  if (/^Bloco \d+$/i.test(title) || /^BLOCO \d+$/i.test(title)) return true;
  
  return looksLikePrescription(title);
}

// Retorna a razão legível do erro (para exibição)
export function getBlockTitleError(title: string, block?: ParsedBlock): string | null {
  // Se recebeu o bloco, usar derivedTitle
  const derived = block ? getDerivedTitle(block) : title?.trim();
  
  // Sem título
  if (!derived || derived.length === 0) {
    return 'O bloco precisa começar com o tipo de treino.\nEx: Aquecimento, Força, Condicionamento.';
  }
  
  // Título inválido (parece prescrição)
  if (looksLikePrescription(derived)) {
    return 'Ajuste o título do bloco (parece exercício).\nEx: Aquecimento, Força, Condicionamento.';
  }
  
  return null;
}

// Retorna o título para exibição (display)
// MVP0: Usa derivedTitle se válido, senão fallback "Bloco X"
export function getDisplayTitle(block: ParsedBlock, blockIndex: number): string {
  const derived = getDerivedTitle(block);
  
  // Se tem título derivado válido (não auto-gerado), usar
  if (derived && derived.length > 0) {
    // Verificar se não é auto-gerado
    const isAutoGen = /^Bloco \d+$/i.test(derived) || 
                      /^BLOCO \d+$/i.test(derived) ||
                      derived.toLowerCase() === 'treino' ||
                      derived.toLowerCase() === 'novo bloco';
    
    if (!isAutoGen) {
      return derived;
    }
  }
  
  // Se block.title existe mas é auto-gerado, ainda assim verificar outros campos
  // (para compatibilidade futura com block.name, block.headerTitle, etc.)
  
  // Fallback neutro sequencial
  return `Bloco ${blockIndex + 1}`;
}

// ============================================
// CLASSIFICAÇÃO DE LINHAS: EXERCISE vs COMMENT
// ============================================
// Lista de movimentos conhecidos para classificação
const KNOWN_MOVEMENTS = [
  'squat', 'lunge', 'burpee', 'pull-up', 'pullup', 'push-up', 'pushup',
  'row', 'bike', 'ski', 'wall ball', 'wallball', 'deadlift', 'clean',
  'snatch', 'jerk', 'press', 'thruster', 'box jump', 'jump', 'run',
  'sprint', 'sled', 'sandbag', 'farmer', 'carry', 'swing', 'kettlebell',
  'dumbbell', 'barbell', 'toes to bar', 'ttb', 'sit-up', 'situp',
  'plank', 'hollow', 'superman', 'pistol', 'step-up', 'stepup',
  'double under', 'du', 'single under', 'rope', 'muscle-up', 'muscleup',
  'handstand', 'hspu', 'dip', 'ring', 'rig', 'v-up', 'airbike',
  'assault', 'echo', 'concept', 'skierg', 'rower', 'cal row', 'cal bike'
];

// Padrões de início de comentário
const COMMENT_STARTERS = [
  /^descansar?\b/i,
  /^observa[çc][ãa]o\b/i,
  /^nota\b/i,
  /^cuidado\b/i,
  /^foco\b/i,
  /^objetivo\b/i,
  /^aten[çc][ãa]o\b/i,
  /^dica\b/i,
  /^lembre/i,
  /^📝/,
  /^💡/,
  /^⚠️/,
];

// Modalidades conhecidas para classificação de linha com duração
const MODALITY_KEYWORDS = [
  'corrida', 'bike', 'remo', 'ski', 'caminhada', 'cardio', 'erg',
  'run', 'running', 'row', 'rowing', 'walk', 'cycling', 'airbike',
  'assault', 'echo', 'concept', 'skierg', 'trote', 'swimming', 'natação'
];

// Categorias que indicam cardio/endurance (bloco pertence a essas = linha com duração é exercício)
const CARDIO_CATEGORIES = ['corrida', 'cardio', 'endurance', 'conditioning'];

// Classifica uma linha como exercise ou comment
// Opcionalmente recebe a categoria do bloco para regra de duração + categoria
export function classifyLine(line: string, blockCategory?: string): LineType {
  if (!line || line.trim().length === 0) return 'comment';
  
  const trimmed = line.trim();
  const lowerLine = trimmed.toLowerCase();
  
  // 1. Verificar padrões de comentário primeiro
  if (COMMENT_STARTERS.some(pattern => pattern.test(trimmed))) {
    return 'comment';
  }
  
  // 2. REGRA NOVA: Duração + (Modalidade OU Categoria Cardio) = EXERCÍCIO
  // Ex: "Corrida leve até 45 minutos" deve ser exercício
  const hasDuration = /\d+\s*(?:min|minutos?|minutes?|'|'')\b/i.test(trimmed) ||
                      /até\s*\d+\s*(?:min|minutos?)/i.test(trimmed);
  
  if (hasDuration) {
    // Verificar se tem modalidade na linha
    const hasModality = MODALITY_KEYWORDS.some(mod => lowerLine.includes(mod));
    
    // Verificar se o bloco é de categoria cardio/endurance
    const blockIsCardio = blockCategory && 
      CARDIO_CATEGORIES.some(cat => blockCategory.toLowerCase().includes(cat));
    
    if (hasModality || blockIsCardio) {
      return 'exercise';
    }
  }
  
  // 3. Começa com número (incluindo intervalos 8-10, 8–10)
  if (/^\d+/.test(trimmed) || /^\d+\s*[-–]\s*\d+/.test(trimmed)) {
    return 'exercise';
  }
  
  // 4. Contém unidades/padrões de exercício
  const exercisePatterns = [
    /\breps?\b/i,
    /\bm\b/i, // metros
    /\bkm\b/i,
    /\bcal\b/i,
    /\bkg\b/i,
    /\blb\b/i,
    /\bmin\b/i,
    /\bsec\b/i,
    /\bseg\b/i,
    /[''"]/, // aspas de tempo
    /^min\s*\d+\s*:/i, // Min 1:, Min 2:
    /\brounds?\b/i,
    /\bsets?\b/i,
    /\bemom\b/i,
    /\be\d+mom\b/i,
    /\bamrap\b/i,
    /\bfor\s*time\b/i,
    /\btabata\b/i,
    /\brft\b/i,
  ];
  
  if (exercisePatterns.some(pattern => pattern.test(trimmed))) {
    return 'exercise';
  }
  
  // 5. Contém nome de movimento conhecido
  if (KNOWN_MOVEMENTS.some(movement => lowerLine.includes(movement))) {
    return 'exercise';
  }
  
  // 6. Se não caiu em nenhuma regra acima, é comentário
  return 'comment';
}

// ============================================
// MVP0: CLASSIFICAÇÃO DETERMINÍSTICA DE ITENS
// ============================================
// Classifica linha como EXERCISE / REST / NOTE com confidence
// Regras determinísticas sem IA

// Padrões de descanso/off
const REST_PATTERNS = [
  /\bdescanso\b/i,
  /\boff\b/i,
  /\brecovery\b/i,
  /\bfolga\b/i,
  /\bdia\s*(de\s*)?(descanso|livre|off)\b/i,
  /\bhoje\s+(é\s+)?descanso\b/i,
  /\brest\s*day\b/i,
];

// Padrões de exercício opcional
const OPTIONAL_PATTERNS = [
  /\bse\s+quiser\b/i,
  /\bcaso\s+queira\b/i,
  /\bopcional\b/i,
  /\bse\s+estiver\s+bem\b/i,
  /\bse\s+tiver\s+tempo\b/i,
  /\bse\s+conseguir\b/i,
  /\bapenas\s+se\b/i,
];

// Padrões HIGH confidence de exercício
const HIGH_CONFIDENCE_EXERCISE_PATTERNS = [
  // Tempo: 45 min, 30min, 10', mm:ss
  /\d+\s*(?:min|minutos?|minutes?|')\b/i,
  // Distância: 5km, 400m, 10 km
  /\d+\s*(?:km|m)\b/i,
  // Séries: 5x5, 4 rounds, 3 sets
  /\d+\s*x\s*\d+/i,
  /\d+\s*(?:rounds?|rodadas?|sets?)\b/i,
  // Formatos conhecidos
  /\b(?:emom|amrap|for\s*time|tabata|rft)\b/i,
  // Começa com número + movimento
  /^\d+\s+(?:burpees?|squats?|lunges?|pull-?ups?|push-?ups?|deadlifts?|cleans?|snatches?|jerks?)/i,
  // Tempo explícito mm:ss
  /\d{1,2}:\d{2}/,
];

// Padrões MEDIUM confidence de exercício
const MEDIUM_CONFIDENCE_EXERCISE_PATTERNS = [
  // Movimento + esforço: corrida PSE 6, bike RPE 7
  /\b(?:pse|rpe)\s*[:=]?\s*\d/i,
  // Zona de esforço
  /\b(?:zona|zone)\s*\d/i,
  // Frequência cardíaca
  /\b(?:fc|hr)\s*[:=]?\s*\d/i,
  // Palavras de exercício sem medida
  /\b(?:corrida|bike|remo|ski|caminhada|trote|run|row|swim)\b/i,
];

// Padrões de NOTE (comentário/observação)
const NOTE_PATTERNS = [
  /^descansar\s+o\s+necess[aá]rio\b/i,
  /\bobs(?:erva[çc][ãa]o)?\b/i,
  /\bnota\b/i,
  /\bcoment[aá]rio\b/i,
  /\bdica\b/i,
  /\baten[çc][ãa]o\b/i,
  /\bcuidado\b/i,
  /\bfoco\b/i,
  /\bobjetivo\b/i,
  /\blembre\b/i,
  /^📝/,
  /^💡/,
  /^⚠️/,
  /^ℹ️/,
];

/**
 * MVP0: Classifica uma linha com kind + confidence + flags
 * REGRAS DETERMINÍSTICAS (sem IA)
 * 
 * Prioridade:
 * 1) REST + OPTIONAL + exercício detectável → REST + EXERCISE OPTIONAL
 * 2) REST puro
 * 3) EXERCISE (com confidence)
 * 4) NOTE (fallback)
 */
export function classifyItemDeterministic(line: string): ClassifiedItem {
  if (!line || line.trim().length === 0) {
    return { kind: 'NOTE', confidence: 'LOW' };
  }
  
  const trimmed = line.trim();
  const lowerLine = trimmed.toLowerCase();
  
  // REGRA #: Linhas iniciadas com "#" são SEMPRE classificadas como NOTE
  if (trimmed.startsWith('#')) {
    console.log('[CLASSIFY] NOTE (# prefix):', trimmed);
    return { kind: 'NOTE', confidence: 'HIGH' };
  }
  
  // 1. Verificar se é REST (descanso/off/recovery/folga)
  const isRest = REST_PATTERNS.some(p => p.test(lowerLine));
  
  // 2. Verificar se tem padrão opcional
  const isOptional = OPTIONAL_PATTERNS.some(p => p.test(lowerLine));
  
  // 3. Verificar se tem padrão de exercício (HIGH ou MEDIUM)
  const isHighExercise = HIGH_CONFIDENCE_EXERCISE_PATTERNS.some(p => p.test(trimmed));
  const isMediumExercise = MEDIUM_CONFIDENCE_EXERCISE_PATTERNS.some(p => p.test(trimmed));
  
  // 4. Verificar se é NOTE explícita
  const isNote = NOTE_PATTERNS.some(p => p.test(trimmed));
  
  // ========================================
  // REGRAS DE CLASSIFICAÇÃO
  // ========================================
  
  // MVP0 FIX: Se tem "corrida/bike/etc" + tempo/distância, é HIGH mesmo com opcional
  const hasCardioActivity = /\b(?:corrida|bike|remo|ski|caminhada|trote|run|row|swim|airbike)\b/i.test(lowerLine);
  const hasTimeOrDistance = /\d+\s*(?:min|minutos?|'|km|m)\b/i.test(trimmed);
  const isCardioWithMeasure = hasCardioActivity && hasTimeOrDistance;
  
  // A) EXERCISE OPTIONAL com medida (prioridade máxima para rastreamento)
  // Ex: "corrida opcional 45 min", "se quiser, bike 30min"
  if (isOptional && (isHighExercise || isCardioWithMeasure)) {
    console.log('[CLASSIFY] EXERCISE OPTIONAL HIGH:', trimmed);
    return {
      kind: 'EXERCISE',
      confidence: 'HIGH',
      flags: { optional: true },
    };
  }
  
  // B) REST com exercício opcional detectável
  // Ex: "Descanso. Se quiser, corrida leve 30min"
  if (isRest && isOptional && (isHighExercise || isMediumExercise || isCardioWithMeasure)) {
    console.log('[CLASSIFY] REST + EXERCISE OPTIONAL:', trimmed);
    return {
      kind: 'EXERCISE',
      confidence: isHighExercise || isCardioWithMeasure ? 'HIGH' : 'MEDIUM',
      flags: { optional: true },
    };
  }
  
  // C) REST puro
  if (isRest && !isOptional && !isCardioWithMeasure) {
    return { kind: 'REST', confidence: 'HIGH' };
  }
  
  // D) EXERCISE OPTIONAL (sem REST mas marcado como opcional)
  if (isOptional && isMediumExercise) {
    return {
      kind: 'EXERCISE',
      confidence: 'MEDIUM',
      flags: { optional: true },
    };
  }
  
  // D) EXERCISE HIGH confidence
  if (isHighExercise) {
    return { kind: 'EXERCISE', confidence: 'HIGH' };
  }
  
  // E) EXERCISE MEDIUM confidence
  if (isMediumExercise) {
    return { kind: 'EXERCISE', confidence: 'MEDIUM' };
  }
  
  // F) NOTE explícita
  if (isNote) {
    return { kind: 'NOTE', confidence: 'HIGH' };
  }
  
  // G) Começa com número (provável exercício) → LOW confidence
  if (/^\d+/.test(trimmed)) {
    return { kind: 'EXERCISE', confidence: 'LOW' };
  }
  
  // H) Contém movimento conhecido → LOW confidence
  const hasMovement = KNOWN_MOVEMENTS.some(m => lowerLine.includes(m));
  if (hasMovement) {
    return { kind: 'EXERCISE', confidence: 'LOW' };
  }
  
  // I) Fallback: NOTE com LOW confidence
  return { kind: 'NOTE', confidence: 'LOW' };
}

/**
 * Converte ClassifiedItem para LineType legado
 * Para manter compatibilidade com código existente
 */
export function itemKindToLineType(kind: ItemKind): LineType {
  if (kind === 'EXERCISE') return 'exercise';
  return 'comment';
}

// ============================================
// NORMALIZAÇÃO DE TEXTO (para dedup e comparação)
// ============================================
// Normaliza texto para comparação: lowercase, trim, remove acentos, remove pontuação leve
export function normalizeText(s: string): string {
  if (!s) return '';
  
  return s
    .toLowerCase()
    .trim()
    // Normaliza Unicode e remove diacríticos (acentos)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remove pontuação leve e caracteres especiais
    .replace(/[:;,.\-—_*"'""\(\)\[\]]/g, '')
    // Substitui & por e
    .replace(/&/g, 'e')
    // Múltiplos espaços para 1
    .replace(/\s+/g, ' ')
    .trim();
}

// Gera ID único para linha
let lineIdCounter = 0;
export function generateLineId(): string {
  lineIdCounter++;
  return `line-${Date.now()}-${lineIdCounter}`;
}

// Classifica todas as linhas de um bloco
// MVP0: Usa classifyItemDeterministic para kind/confidence/flags
export function classifyBlockLines(block: ParsedBlock): ParsedLine[] {
  const lines: ParsedLine[] = [];
  const normalizedTitle = normalizeText(block.title);
  const normalizedFormat = block.formatDisplay ? normalizeText(block.formatDisplay) : '';
  
  // Helper para verificar se linha deve ser descartada (duplicata do título/formato)
  const shouldDiscard = (text: string, index: number, prevNormalized: string): boolean => {
    const normalized = normalizeText(text);
    
    // Linha vazia
    if (!normalized) return true;
    
    // Igual ao título do bloco
    if (normalized === normalizedTitle) return true;
    
    // Igual ao formato do bloco
    if (normalizedFormat && normalized === normalizedFormat) return true;
    
    // Nas primeiras 3 linhas: descartar se igual à linha anterior
    if (index < 3 && normalized === prevNormalized) return true;
    
    return false;
  };
  
  // Helper para criar ParsedLine com classificação completa
  const createLine = (text: string): ParsedLine => {
    const classified = classifyItemDeterministic(text);
    return {
      id: generateLineId(),
      text: text.trim(),
      type: itemKindToLineType(classified.kind),
      kind: classified.kind,
      confidence: classified.confidence,
      flags: classified.flags,
    };
  };
  
  let prevNormalized = '';
  let lineIndex = 0;
  
  // Adicionar instruction principal
  if (block.instruction && block.instruction.trim()) {
    if (!shouldDiscard(block.instruction, lineIndex, prevNormalized)) {
      lines.push(createLine(block.instruction));
      prevNormalized = normalizeText(block.instruction);
    }
    lineIndex++;
  }
  
  // Adicionar instructions
  if (block.instructions) {
    for (const instr of block.instructions) {
      if (instr.trim() && !shouldDiscard(instr, lineIndex, prevNormalized)) {
        lines.push(createLine(instr));
        prevNormalized = normalizeText(instr);
      }
      lineIndex++;
    }
  }
  
  // Adicionar items formatados (exercícios sempre HIGH confidence)
  for (const item of block.items) {
    let text = `${item.quantity} ${item.unit} ${item.movement}`;
    if (item.weight) {
      text += ` @ ${item.weight}`;
    }
    if (item.notes) {
      text += ` (${item.notes})`;
    }
    lines.push({
      id: generateLineId(),
      text: text.trim(),
      type: 'exercise',
      kind: 'EXERCISE',
      confidence: 'HIGH',
    });
  }
  
  // Adicionar coachNotes
  if (block.coachNotes) {
    for (const note of block.coachNotes) {
      if (note.trim() && !shouldDiscard(note, lineIndex, prevNormalized)) {
        // Notes do coach: usar classificação mas priorizar NOTE
        const classified = classifyItemDeterministic(note);
        // Se o coach colocou como nota, respeitar como NOTE a menos que seja exercício óbvio
        const finalKind = classified.kind === 'EXERCISE' && classified.confidence === 'HIGH' 
          ? 'EXERCISE' 
          : 'NOTE';
        lines.push({
          id: generateLineId(),
          text: note.trim(),
          type: finalKind === 'EXERCISE' ? 'exercise' : 'comment',
          kind: finalKind,
          confidence: classified.confidence,
          flags: classified.flags,
        });
        prevNormalized = normalizeText(note);
      }
      lineIndex++;
    }
  }
  
  // ============================================
  // DEDUP FINAL: remover linhas duplicadas por type + normalizedText
  // ============================================
  const seen = new Set<string>();
  const dedupedLines: ParsedLine[] = [];
  
  for (const line of lines) {
    const key = `${line.type}|${normalizeText(line.text)}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedupedLines.push(line);
    }
  }
  
  return dedupedLines;
}

const FORMAT_PATTERNS: { pattern: RegExp; format: string }[] = [
  { pattern: /for\s*time|fortime/i, format: 'for_time' },
  { pattern: /amrap/i, format: 'amrap' },
  { pattern: /emom/i, format: 'emom' },
  { pattern: /rounds?(\s|$)/i, format: 'rounds' },
  { pattern: /intervalos?/i, format: 'intervalos' },
  { pattern: /t[eé]cnica/i, format: 'tecnica' },
  { pattern: /tabata/i, format: 'tabata' },
];

const UNIT_MAP: Record<string, string> = {
  'reps': 'reps',
  'rep': 'reps',
  'repetições': 'reps',
  'repeticoes': 'reps',
  'm': 'm',
  'metros': 'm',
  'metro': 'm',
  'km': 'km',
  'cal': 'cal',
  'calorias': 'cal',
  'caloria': 'cal',
  'min': 'min',
  'minutos': 'min',
  'minuto': 'min',
  'sec': 'sec',
  'segundos': 'sec',
  'segundo': 'sec',
  's': 'sec',
  'rounds': 'rounds',
  'round': 'rounds',
  'rodadas': 'rounds',
  'rodada': 'rounds',
  'x': 'reps',
  "'": 'min',
  '"': 'sec',
};

// Padrões de instrução (não são notas)
const INSTRUCTION_PATTERNS = [
  /descanso/i,
  /rest/i,
  /registrar/i,
  /objetivo/i,
  /zona\s*\d/i,
  /fc\s*[:=]?\s*\d/i,
  /pse\s*[:=]?\s*\d/i,
  /rounds?/i,
  /emom/i,
  /for\s*time/i,
  /amrap/i,
];

// ============================================
// PARSER PRINCIPAL - TEXTO LIVRE
// ============================================

// Separadores de bloco explícitos (⸻ e variações de traços)
// MVP0: Suportar formato real do coach
const BLOCK_SEPARATOR_PATTERNS = [
  /⸻/,           // Traço longo Unicode
  /—{2,}/,        // 2+ em-dashes
  /–{3,}/,        // 3+ en-dashes
  /-{3,}/,        // 3+ hifens
];

// Verifica se linha é um separador de bloco
function isBlockSeparator(line: string): boolean {
  const trimmed = line.trim();
  // Linha que é APENAS separadores (sem texto)
  if (BLOCK_SEPARATOR_PATTERNS.some(p => p.test(trimmed))) {
    // Verificar se é majoritariamente separadores (>50%)
    const cleanedLength = trimmed.replace(/[⸻—–\-\s]/g, '').length;
    return cleanedLength < trimmed.length * 0.3; // Menos de 30% é texto = é separador
  }
  return false;
}

// MVP0: Títulos soltos de bloco (headings sem prefixo ##)
// Detecta linhas curtas que são títulos de bloco
const HEADING_PATTERNS = [
  /^aquecimento$/i,
  /^força\s+espec[ií]fica$/i,
  /^espec[ií]fico$/i,
  /^grip\s*[&e]\s*strength$/i,
  /^corrida\s*[—–-]\s*.+$/i,  // "Corrida — Outro Período"
  /^for[çc]a$/i,
  /^metcon$/i,
  /^wod$/i,
  /^core$/i,
  /^acess[óo]rio$/i,
  /^mobilidade$/i,
  /^t[ée]cnica$/i,
  /^conditioning$/i,
  /^condicionamento$/i,
];

// ============================================
// MVP0: LISTAS BRANCA E NEGRA PARA TÍTULOS (DEFINIÇÃO GLOBAL)
// ============================================
// Essas listas são usadas tanto em isHeadingLine quanto em extractHeadingFromLines

const GLOBAL_TITLE_WHITELIST = [
  /^aquecimento$/i,
  /^for[çc]a$/i,
  /^for[çc]a\s+espec[ií]fica$/i,
  /^espec[ií]fico$/i,
  /^conditioning$/i,
  /^condicionamento$/i,
  /^grip$/i,
  /^grip\s*[&e]\s*strength$/i,
  /^core$/i,
  /^mobilidade$/i,
  /^corrida$/i,
  /^corrida\s*[—–-]\s*.+$/i,  // "Corrida — Outro Período", "Corrida — Longão"
  /^fortalecimento$/i,
  /^metcon$/i,
  /^wod$/i,
  /^t[ée]cnica$/i,
  /^acess[óo]rio$/i,
  /^warm[- ]?up$/i,
  /^strength$/i,
];

const GLOBAL_TITLE_BLACKLIST = [
  /descanso/i,
  /descansar/i,
  /necess[aá]rio/i,
  /vai\s+aproveitar/i,
  /objetivo/i,
  /registre/i,
  /priorizando/i,
  /opcional/i,
  /se\s+quiser/i,
  /se\s+precisar/i,
  /se\s+estiver/i,
  /caso\s+queira/i,
  /lembre/i,
  /aten[çc][ãa]o/i,
  /obs(?:erva[çc][ãa]o)?:/i,
  /nota:/i,
  /dica:/i,
  /zona\s*\d/i,  // "Zona 2" não é título
  /^\d/,  // Linhas que começam com número
  /^#/,   // Linhas que começam com #
];

// Verifica se linha está na BLACKLIST (nunca pode virar título)
function isBlacklistLine(line: string): boolean {
  const trimmed = line.trim();
  return GLOBAL_TITLE_BLACKLIST.some(p => p.test(trimmed));
}

// Verifica se linha está na WHITELIST (sempre é título)
function isWhitelistLine(line: string): boolean {
  const trimmed = line.trim();
  return GLOBAL_TITLE_WHITELIST.some(p => p.test(trimmed));
}

// Verifica se linha é um heading/título de bloco (não precisa ser MAIÚSCULA)
// MVP0 FIX: Usa WHITELIST e verifica BLACKLIST
function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  
  // Debug log para rastrear
  console.log('[isHeadingLine] Verificando:', JSON.stringify(trimmed), 'len=', trimmed.length);
  
  // BLACKLIST: NUNCA é heading
  if (isBlacklistLine(trimmed)) {
    console.log('[isHeadingLine] → BLACKLIST, retorna false');
    return false;
  }
  
  // WHITELIST: SEMPRE é heading (match exato)
  if (isWhitelistLine(trimmed)) {
    console.log('[isHeadingLine] → WHITELIST match exato, retorna true');
    return true;
  }
  
  // Heading patterns conhecidos (case-insensitive)
  if (HEADING_PATTERNS.some(p => p.test(trimmed))) {
    console.log('[isHeadingLine] → HEADING_PATTERNS, retorna true');
    return true;
  }
  
  // Linha curta (<=60 chars) + NÃO começa com número + contém palavra-chave de bloco
  if (trimmed.length <= 60 && !/^\d/.test(trimmed)) {
    const blockKeywords = [
      /aquecimento/i, /for[çc]a/i, /metcon/i, /espec[ií]fico/i,
      /corrida/i, /core/i, /grip/i, /acess[óo]rio/i, /mobilidade/i,
      /t[ée]cnica/i, /conditioning/i, /condicionamento/i, /fortalecimento/i
    ];
    const hasKeyword = blockKeywords.some(p => p.test(trimmed));
    // Se contém keyword E é curta E não parece exercício, é heading
    if (hasKeyword && !isExercisePatternLine(trimmed)) {
      console.log('[isHeadingLine] → Keyword match + curta, retorna true');
      return true;
    }
  }
  
  console.log('[isHeadingLine] → Nenhum match, retorna false');
  return false;
}

// Verifica se linha parece ser exercício (para evitar falsos positivos de heading)
function isExercisePatternLine(line: string): boolean {
  // Começa com número
  if (/^\d+/.test(line)) return true;
  // Tem padrão de exercício
  if (/\d+\s*(x|reps?|min|m|km|rounds?|cal)/i.test(line)) return true;
  return false;
}

export function parseStructuredText(text: string): ParseResult {
  console.log('[PARSER] === parseStructuredText INICIADO ===');
  console.log('[PARSER] Texto recebido (primeiros 500 chars):', text.substring(0, 500));
  
  const lines = text.split('\n');
  console.log('[PARSER] Total de linhas:', lines.length);
  
  // MVP0: Validar âncoras de dia antes de parsear
  const dayValidation = validateDayAnchors(text);
  console.log('[PARSER] Dias detectados:', dayValidation.daysFound);
  
  const result: ParseResult = {
    success: false,
    days: [],
    errors: [],
    warnings: [],
    alerts: [],
    needsDaySelection: false,
    hasDayAnchors: dayValidation.hasDays,
  };

  let currentDay: DayOfWeek | null = null;
  let currentDayEntry: ParsedDay | null = null;
  let currentBlock: ParsedBlock | null = null;
  let lineNumber = 0;
  let hasExplicitDay = false;

  // Contador de blocos para fallback de título
  let blockCounter = 0;
  
  /**
   * REGRA MVP0: Categoria NUNCA é inferida automaticamente.
   * O coach DEVE selecionar manualmente via UI.
   * type = '' (vazio) até o coach definir.
   */
  const createNewBlock = (rawTitle: string, isAutoGen: boolean = false): ParsedBlock => {
    blockCounter++;
    // MVP0 FIX: Se isAutoGen, título fica VAZIO (fallback só na UI)
    // NUNCA persistir "BLOCO X" como título real
    const title = isAutoGen ? '' : cleanBlockTitle(rawTitle);
    const isOptional = /\bopcional\b/i.test(rawTitle);
    return {
      title,
      type: '' as any, // MVP0: Categoria OBRIGATÓRIA - coach deve selecionar (NÃO INFERIR)
      format: detectFormat(rawTitle),
      formatDisplay: undefined,
      isMainWod: false,
      isBenchmark: false,
      optional: isOptional,
      items: [],
      lines: [],
      coachNotes: [],
      instructions: [],
      isAutoGenTitle: isAutoGen || title === '', // Marcar como auto-gen se título ficou vazio
    };
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MVP0: Usa funções globais isWhitelistLine e isBlacklistLine
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * MVP0: Extrai heading das primeiras 5 linhas do bloco
   * ORDEM: 1) Lista branca → 2) Heurística (curto sem número)
   * BLOQUEIO: Lista negra nunca vira título
   */
  const extractHeadingFromLines = (lines: string[]): { heading: string; remainingLines: string[] } | null => {
    // Filtrar linhas não vazias
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);
    
    // PASSO 1: Procurar título na LISTA BRANCA (prioridade máxima)
    for (let i = 0; i < Math.min(5, nonEmptyLines.length); i++) {
      const line = nonEmptyLines[i].trim();
      
      // Se está na lista negra, pular
      if (isBlacklistLine(line)) continue;
      
      // Se está na lista branca, É título!
      if (isWhitelistLine(line)) {
        console.log('[PARSER] Título WHITELIST encontrado na linha', i + 1, ':', line);
        const remaining = [...nonEmptyLines];
        remaining.splice(i, 1);
        return { heading: line, remainingLines: remaining };
      }
    }
    
    // PASSO 2: Heurística - linha curta, sem número, sem lista negra
    for (let i = 0; i < Math.min(5, nonEmptyLines.length); i++) {
      const line = nonEmptyLines[i].trim();
      
      // Se está na lista negra, pular
      if (isBlacklistLine(line)) continue;
      
      // Heading válido = linha curta (<=60), NÃO inicia com número
      if (line.length <= 60 && !/^\d/.test(line)) {
        // Verificar se NÃO é padrão de exercício
        const isExercisePattern = 
          /^emom\b/i.test(line) ||
          /^amrap\b/i.test(line) ||
          /^for\s*time\b/i.test(line) ||
          /^\d+\s*rounds?\b/i.test(line) ||
          /^min\s*\d+/i.test(line) ||
          /^\d+\s*x\s*\d+/i.test(line) ||
          /^\d+['']\s*/i.test(line) ||  // 45'' prancha
          /^\d+:\d+/i.test(line) ||     // mm:ss
          /^\d+\s*(m|km|cal)\b/i.test(line);
        
        if (!isExercisePattern) {
          // Verificar se tem keyword de bloco
          const hasBlockKeyword = [
            /aquecimento/i, /for[çc]a/i, /metcon/i, /espec[ií]fico/i,
            /corrida/i, /core/i, /grip/i, /acess[óo]rio/i, /mobilidade/i,
            /t[ée]cnica/i, /conditioning/i, /condicionamento/i, /strength/i,
            /warm[- ]?up/i, /wod/i, /fortalecimento/i
          ].some(p => p.test(line));
          
          // Linha curta sem números também pode ser heading
          const isShortNoNumbers = line.length <= 40 && !/\d/.test(line);
          
          if (hasBlockKeyword || isShortNoNumbers) {
            console.log('[PARSER] Heading heurístico na linha', i + 1, ':', line);
            const remaining = [...nonEmptyLines];
            remaining.splice(i, 1);
            return { heading: line, remainingLines: remaining };
          }
        }
      }
    }
    
    return null;
  };

  const saveCurrentBlock = () => {
    if (currentBlock) {
      // MVP0: Antes de salvar, tentar extrair heading das instructions se título vazio
      if (!currentBlock.title || currentBlock.title.trim() === '') {
        const allLines = [
          currentBlock.instruction || '',
          ...currentBlock.instructions,
        ].filter(l => l.trim());
        
        const extracted = extractHeadingFromLines(allLines);
        if (extracted) {
          currentBlock.title = cleanBlockTitle(extracted.heading);
          currentBlock.isAutoGenTitle = currentBlock.title === '';
          // Atualizar instructions removendo o heading
          currentBlock.instructions = extracted.remainingLines.filter(l => l !== currentBlock!.instruction);
          if (currentBlock.instruction === extracted.heading) {
            currentBlock.instruction = undefined;
          }
          console.log('[PARSER] Título extraído do conteúdo:', currentBlock.title);
        }
      }
      
      // Só salva se tiver pelo menos 1 item OU instruções OU for estímulo de treino
      const allContent = [
        currentBlock.instruction || '',
        ...currentBlock.instructions,
        ...currentBlock.items.map(i => `${i.quantity} ${i.unit} ${i.movement}`)
      ].join(' ');
      
      const hasTrainingStimulus = isTrainingStimulus(allContent);
      const hasContent = currentBlock.items.length > 0 || currentBlock.instructions.length > 0 || currentBlock.instruction;
      
      if (hasContent || hasTrainingStimulus) {
        // MVP0: NÃO refinar tipo automaticamente - coach deve selecionar
        // REMOVIDO: currentBlock.type = detectTypeByContent(currentBlock);
        
        // Detectar se é opcional pelo conteúdo
        if (/\bopcional\b/i.test(allContent)) {
          currentBlock.optional = true;
        }
        
        // Classificar linhas do bloco (exercise vs comment)
        currentBlock.lines = classifyBlockLines(currentBlock);
        
        // Find or create day entry (allow null day)
        if (!currentDayEntry) {
          currentDayEntry = { day: currentDay, blocks: [], alerts: [] };
          result.days.push(currentDayEntry);
        }
        currentDayEntry.blocks.push(currentBlock);
      }
    }
    currentBlock = null;
  };

  const detectDay = (line: string): DayOfWeek | null => {
    const cleanLine = line.toLowerCase().replace(/[^a-záéíóúàâêôãõç\s-]/g, '').trim();
    
    for (const [key, day] of Object.entries(DAY_MAP)) {
      if (cleanLine === key || cleanLine.startsWith(key + ' ') || cleanLine.endsWith(' ' + key)) {
        return day;
      }
    }
    
    for (const [key, day] of Object.entries(DAY_MAP)) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(line) && line.length < 50) {
        return day;
      }
    }
    
    return null;
  };

  // Detecta tipo pelo TÍTULO primeiro
  const detectBlockType = (line: string): WorkoutBlock['type'] => {
    for (const { pattern, type } of TYPE_PATTERNS) {
      if (pattern.test(line)) {
        return type;
      }
    }
    // Se título não definiu, retorna null para tentar por conteúdo depois
    return 'conditioning'; // Fallback inicial, será refinado por conteúdo
  };

  // Detecta tipo pelo CONTEÚDO (chamado após bloco completo)
  const detectTypeByContent = (block: ParsedBlock): WorkoutBlock['type'] => {
    // Se já tem tipo definido pelo título (não é conditioning genérico), mantém
    if (block.type !== 'conditioning') return block.type;
    
    // Verifica conteúdo das instruções
    const allContent = [
      block.instruction || '',
      ...block.instructions,
      ...block.items.map(i => i.movement)
    ].join(' ');
    
    for (const { pattern, type } of CONTENT_TYPE_PATTERNS) {
      if (pattern.test(allContent)) {
        return type;
      }
    }
    
    // Fallback final: Conditioning
    return 'conditioning';
  };

  const detectFormat = (line: string): string => {
    for (const { pattern, format } of FORMAT_PATTERNS) {
      if (pattern.test(line)) {
        return format;
      }
    }
    return 'outro';
  };

  const isUpperCaseLine = (line: string): boolean => {
    const letters = line.replace(/[^a-záéíóúàâêôãõçA-ZÁÉÍÓÚÀÂÊÔÃÕÇ]/g, '');
    if (letters.length < 3) return false;
    return letters === letters.toUpperCase() && letters.length > 0;
  };

  const isInstructionLine = (line: string): boolean => {
    return INSTRUCTION_PATTERNS.some(pattern => pattern.test(line));
  };

  const parseExerciseLine = (line: string): ParsedItem | null => {
    const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
    
    // Padrão: número + unidade opcional + movimento
    const match = cleanLine.match(/^(\d+(?:[.,]\d+)?)\s*(['"])?(\w+)?\s+(.+?)(?:\s*[\(@](.+)[\)@])?$/);
    
    if (match) {
      const quantity = parseFloat(match[1].replace(',', '.'));
      let rawUnit = match[3]?.toLowerCase() || match[2] || '';
      let movement = match[4].trim();
      const notes = match[5]?.trim();
      
      let unit = UNIT_MAP[rawUnit];
      if (!unit && rawUnit) {
        movement = `${rawUnit} ${movement}`;
        unit = 'reps';
      } else if (!unit) {
        unit = 'reps';
      }
      
      const weightInfo = detectWeight(cleanLine);
      
      return {
        quantity,
        unit,
        movement,
        notes,
        weight: weightInfo.weight,
        isWeightAlert: weightInfo.isAlert,
      };
    }
    
    // Padrão simplificado: "número movimento"
    const simpleMatch = cleanLine.match(/^(\d+)\s+(.+)$/);
    if (simpleMatch) {
      const weightInfo = detectWeight(cleanLine);
      return {
        quantity: parseInt(simpleMatch[1]),
        unit: 'reps',
        movement: simpleMatch[2].trim(),
        weight: weightInfo.weight,
        isWeightAlert: weightInfo.isAlert,
      };
    }
    
    return null;
  };

  const detectWeight = (line: string): { weight?: string; isAlert: boolean } => {
    const percentMatch = line.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (percentMatch) {
      return { weight: `${percentMatch[1]}%`, isAlert: false };
    }
    
    const rpeMatch = line.match(/(pse|rpe)\s*[:=]?\s*(\d+)/i);
    if (rpeMatch) {
      return { weight: `${rpeMatch[1].toUpperCase()} ${rpeMatch[2]}`, isAlert: false };
    }
    
    const rxMatch = line.match(/(\d+)\s*\/\s*(\d+)\s*(?:kg)?/);
    if (rxMatch) {
      return { weight: `${rxMatch[1]}/${rxMatch[2]}kg`, isAlert: false };
    }
    
    const kgMatch = line.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
    if (kgMatch) {
      return { weight: `${kgMatch[1]}kg`, isAlert: true };
    }
    
    if (/\b(leve|moderada?|pesada?|heavy|light|moderate)\b/i.test(line)) {
      return { weight: 'autorregulado', isAlert: false };
    }
    
    return { isAlert: false };
  };

  for (const rawLine of lines) {
    lineNumber++;
    const line = rawLine.trim();
    
    // Linha vazia - continua no bloco atual
    if (!line) continue;

    // Separador explícito ⸻ ou variações (---, ———) → fim do bloco atual
    if (isBlockSeparator(line)) {
      console.log('[PARSER] Separador de bloco detectado:', line);
      saveCurrentBlock();
      continue;
    }

    // Detectar dia da semana
    const detectedDay = detectDay(line);
    if (detectedDay && isUpperCaseLine(line)) {
      saveCurrentBlock();
      
      hasExplicitDay = true;
      currentDay = detectedDay;
      
      // Criar nova entrada de dia
      currentDayEntry = result.days.find(d => d.day === detectedDay) || null;
      if (!currentDayEntry) {
        currentDayEntry = { day: detectedDay, blocks: [], alerts: [] };
        result.days.push(currentDayEntry);
      }
      currentBlock = null;
      continue;
    }

    // REGRA: FORMAT LINES (EMOM, AMRAP, etc.) NUNCA abrem novo bloco
    // Se não há bloco atual, criar "BLOCO {n}" com formatDisplay
    if (isFormatLine(line)) {
      if (!currentBlock) {
        // Criar bloco genérico com título "BLOCO X"
        currentBlock = createNewBlock('', true);
        currentBlock.formatDisplay = extractFormatFromLine(line);
        currentBlock.type = 'conditioning'; // Tipo padrão para blocos com formato
        currentBlock.format = detectFormat(line);
      }
      // Adicionar como instrução do bloco
      currentBlock.instructions.push(line);
      continue;
    }

    // MVP0: Detectar heading/título solto (não precisa ser MAIÚSCULA)
    // Ex: "Força Específica", "Grip & Strength", "Corrida — Outro Período"
    if (isHeadingLine(line)) {
      console.log('[PARSER] Heading detectado:', line);
      saveCurrentBlock();
      currentBlock = createNewBlock(line);
      continue;
    }

    // Detectar título de bloco (linha em maiúsculas que não é dia E não é format_line)
    if (isUpperCaseLine(line) && line.length > 3 && !isFormatLine(line)) {
      console.log('[PARSER] Título MAIÚSCULO detectado:', line);
      saveCurrentBlock();
      currentBlock = createNewBlock(line);
      continue;
    }

    // Detectar linha de exercício (começa com número ou marcador)
    if (/^[-•*]?\s*\d/.test(line)) {
      const item = parseExerciseLine(line);
      
      if (item) {
        // Se não há bloco, criar um genérico (com fallback neutro "Bloco X")
        if (!currentBlock) {
          currentBlock = createNewBlock('', true);
        }
        
        currentBlock.items.push(item);
        
        // Adicionar alerta ao dia atual sobre kg isolado
        if (item.isWeightAlert && currentDayEntry) {
          const alertMsg = `Carga "${item.weight}" detectada - será autorregulada pelo sistema`;
          if (!currentDayEntry.alerts.includes(alertMsg)) {
            currentDayEntry.alerts.push(alertMsg);
          }
        } else if (item.isWeightAlert) {
          result.alerts.push(`Carga "${item.weight}" detectada - será autorregulada pelo sistema`);
        }
        
        continue;
      }
    }

    // REGRA PRINCIPAL: Todo texto abaixo de um BLOCO pertence ao BLOCO
    // REGRA MESTRA: Se tem estímulo de treino, NUNCA vira comentário
    if (currentBlock) {
      // ANTI-BURRO: Se a linha tem estímulo ou prescrição, é instrução de treino, NUNCA comentário
      if (isTrainingStimulus(line) || isPrescriptionLine(line)) {
        currentBlock.instructions.push(line);
        // Detectar se é opcional
        if (/\bopcional\b/i.test(line)) {
          currentBlock.optional = true;
        }
        // Atualizar tipo se ainda é genérico/conditioning e temos prescrição
        if (currentBlock.type === 'conditioning' && isPrescriptionLine(line)) {
          currentBlock.type = inferPrescriptionType(line);
        }
      } else if (isInstructionLine(line)) {
        // Linha de instrução (Rounds, EMOM, descanso, etc)
        currentBlock.instructions.push(line);
      } else if (!currentBlock.instruction && line.length < 80 && !/\d/.test(line)) {
        // Primeira linha curta sem números → instruction principal
        currentBlock.instruction = line;
      } else {
        // Resto vai para instructions, NÃO para notas soltas
        currentBlock.instructions.push(line);
      }
    } else {
      // Texto antes de qualquer bloco
      // ANTI-BURRO: Se tem estímulo ou prescrição, criar bloco de treino
      if (isTrainingStimulus(line) || isPrescriptionLine(line)) {
        const isOptional = /\bopcional\b/i.test(line);
        const inferredType = inferPrescriptionType(line);
        
        // Criar bloco com título apropriado - fallback neutro para blocos genéricos
        const blockTitle = isOptional ? 'Opcional' : '';
        currentBlock = createNewBlock(blockTitle);
        currentBlock.type = inferredType;
        currentBlock.instructions.push(line);
        currentBlock.optional = isOptional;
      } else {
        currentBlock = createNewBlock('');
        if (isInstructionLine(line)) {
          currentBlock.instructions.push(line);
        } else {
          currentBlock.instruction = line;
        }
      }
    }
  }

  // Salvar último bloco
  saveCurrentBlock();

  // Validações finais
  if (result.days.length === 0) {
    result.errors.push('Nenhum treino válido encontrado');
  }

  let totalBlocks = 0;
  let hasDayNull = false;
  for (const day of result.days) {
    totalBlocks += day.blocks.length;
    if (day.day === null) {
      hasDayNull = true;
    }
    if (day.blocks.length === 0 && day.day !== null) {
      result.warnings.push(`${getDayName(day.day as DayOfWeek)} sem blocos de treino`);
    }
    
    // Verificar se tem WOD principal definido - alerta no nível do dia
    // REGRA: Se TODOS os blocos são opcionais, não exige WOD principal
    const allBlocksOptional = day.blocks.every(b => b.optional);
    const hasMainWodInDay = day.blocks.some(b => b.isMainWod);
    
    if (!hasMainWodInDay && day.blocks.length > 0 && !allBlocksOptional) {
      day.alerts.push('Nenhum WOD principal definido');
    }
  }

  if (totalBlocks === 0) {
    result.errors.push('Nenhum bloco de treino identificado');
  }

  // Marcar se precisa selecionar dia
  if (hasDayNull || !hasExplicitDay) {
    result.needsDaySelection = true;
  }

  result.success = result.errors.length === 0;
  
  // MVP0: Log final para debug do pipeline
  console.log('[PARSER] === parseStructuredText FINALIZADO ===');
  console.log('[PARSER] Resultado:', {
    success: result.success,
    totalDays: result.days.length,
    days: result.days.map(d => ({
      day: d.day,
      blocksCount: d.blocks.length,
      blocks: d.blocks.map((b, i) => ({
        index: i,
        title: b.title || `(vazio → fallback UI "Bloco ${i+1}")`,
        type: b.type || '(categoria não definida)',
        isMainWod: b.isMainWod,
        linesCount: b.lines?.length || 0,
        itemsCount: b.items?.length || 0,
      })),
    })),
    errors: result.errors,
    warnings: result.warnings,
  });
  
  return result;
}

// ============================================
// CONVERSÃO PARA DayWorkout[]
// ============================================

export function parsedToDayWorkouts(parsed: ParseResult, selectedDay?: DayOfWeek): DayWorkout[] {
  return parsed.days.map(day => ({
    // Use selected day if the parsed day is null
    day: (day.day || selectedDay || 'seg') as DayOfWeek,
    stimulus: '',
    estimatedTime: 60,
    blocks: day.blocks.map((block, idx) => ({
      id: `${day.day || selectedDay || 'new'}-${idx}-${Date.now()}`,
      type: block.type,
      title: block.title,
      content: formatBlockContent(block),
      isMainWod: block.isMainWod || undefined,
      isBenchmark: block.isBenchmark || undefined,
    })),
    isRestDay: day.isRestDay || false, // MVP0: Preservar flag de descanso
  }));
}

function formatBlockContent(block: ParsedBlock): string {
  const parts: string[] = [];
  
  // Instrução principal primeiro
  if (block.instruction) {
    parts.push(block.instruction);
    parts.push('');
  }
  
  // Instruções adicionais
  if (block.instructions && block.instructions.length > 0) {
    parts.push(block.instructions.join('\n'));
    parts.push('');
  }
  
  // Items (exercícios)
  const itemsText = block.items
    .map(item => {
      let base = `${item.quantity} ${item.unit} ${item.movement}`;
      if (item.weight) {
        base += ` @ ${item.weight}`;
      }
      return item.notes ? `${base} (${item.notes})` : base;
    })
    .join('\n');
  
  if (itemsText) {
    parts.push(itemsText);
  }

  // Notas do coach (apenas se existirem)
  if (block.coachNotes && block.coachNotes.length > 0) {
    parts.push('');
    parts.push(`📝 ${block.coachNotes.join('\n')}`);
  }

  return parts.join('\n').trim();
}

// ============================================
// UTILITÁRIOS
// ============================================

export function getDayName(day: DayOfWeek): string {
  const names: Record<DayOfWeek, string> = {
    seg: 'Segunda',
    ter: 'Terça',
    qua: 'Quarta',
    qui: 'Quinta',
    sex: 'Sexta',
    sab: 'Sábado',
    dom: 'Domingo',
  };
  return names[day];
}

export function getFormatLabel(format: string): string {
  const labels: Record<string, string> = {
    for_time: 'For Time',
    amrap: 'AMRAP',
    emom: 'EMOM',
    rounds: 'Rounds',
    intervalos: 'Intervalos',
    tecnica: 'Técnica',
    tabata: 'Tabata',
    outro: 'Outro',
  };
  return labels[format] || format;
}

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    aquecimento: 'Aquecimento',
    forca: 'Força',
    conditioning: 'Conditioning',
    especifico: 'Específico',
    core: 'Core',
    corrida: 'Corrida',
    notas: 'Notas',
  };
  return labels[type] || type;
}

// ============================================
// TEMPLATE DE EXEMPLO (para referência interna)
// ============================================

export const TEMPLATE_EXAMPLE = `SEGUNDA

AQUECIMENTO
3 rounds
400m Run
10 Air Squats
10 Arm Circles

AMRAP 20 MIN
5 Pull-ups
10 Push-ups
15 Air Squats

TERÇA

FORÇA - BACK SQUAT
5 reps @ 70%
5 reps @ 75%
5 reps @ 80%

FOR TIME
21-15-9
Thrusters 43/30kg
Pull-ups`;
