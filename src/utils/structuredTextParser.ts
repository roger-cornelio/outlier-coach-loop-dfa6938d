/**
 * structuredTextParser.ts - Parser de texto livre de treino
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

export interface ParsedBlock {
  title: string;
  type: WorkoutBlock['type'];
  format: string;
  isMainWod: boolean;
  isBenchmark: boolean;
  optional: boolean; // Treino opcional (não exige WOD principal)
  items: ParsedItem[];
  coachNotes: string[];
  instruction?: string;
  instructions: string[]; // Lista de instruções do bloco
}

export interface ParsedDay {
  day: DayOfWeek | null; // Pode ser null se não identificado
  blocks: ParsedBlock[];
  alerts: string[]; // Alertas no nível do dia
}

export interface ParseResult {
  success: boolean;
  days: ParsedDay[];
  errors: string[];
  warnings: string[];
  alerts: string[]; // Alertas globais
  needsDaySelection?: boolean; // Indica se precisa selecionar dia manualmente
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
  const lowLine = line.toLowerCase();
  
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
// INFERÊNCIA DE TIPO — TÍTULO PRIMEIRO, DEPOIS CONTEÚDO
// ============================================

// Mapeamento determinístico de tipo pelo TÍTULO (case-insensitive, match simples)
const TYPE_PATTERNS: { pattern: RegExp; type: WorkoutBlock['type'] }[] = [
  { pattern: /aquecimento|warm[- ]?up|🔥/i, type: 'aquecimento' },
  { pattern: /for[cç]a|strength|💪/i, type: 'forca' },
  { pattern: /espec[ií]fico|specific|hyrox|🛷/i, type: 'especifico' },
  { pattern: /core|abdominal|🎯/i, type: 'core' },
  { pattern: /grip/i, type: 'forca' }, // Grip → Força
  { pattern: /corrida|running|run\b|🏃/i, type: 'corrida' },
  { pattern: /bike|airbike|assault|ciclismo|cycling/i, type: 'corrida' }, // Bike → Corrida (cardio)
  { pattern: /remo|row|rowing|ski/i, type: 'corrida' }, // Remo/Ski → Corrida (cardio)
  { pattern: /descanso|rest|recovery/i, type: 'aquecimento' }, // Descanso técnico
  { pattern: /conditioning|condicionamento|metcon|wod|amrap|for\s*time|emom|⚡/i, type: 'conditioning' },
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

// Função para limpar título removendo "TREINO" e prefixos técnicos
function cleanBlockTitle(title: string): string {
  // Remove prefixo "TREINO" ou "TREINO -"
  let cleaned = title.replace(/^TREINO\s*[-–—:]?\s*/i, '').trim();
  // Remove prefixos técnicos comuns
  cleaned = cleaned.replace(/^(WOD|METCON)\s*[-–—:]?\s*/i, '').trim();
  // Se ficou vazio, retorna algo genérico baseado no conteúdo que virá
  if (!cleaned || cleaned.length < 2) {
    return 'Bloco Principal';
  }
  return cleaned;
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

// Separador de bloco explícito
const BLOCK_SEPARATOR = '⸻';

export function parseStructuredText(text: string): ParseResult {
  const lines = text.split('\n');
  const result: ParseResult = {
    success: false,
    days: [],
    errors: [],
    warnings: [],
    alerts: [],
    needsDaySelection: false,
  };

  let currentDay: DayOfWeek | null = null;
  let currentDayEntry: ParsedDay | null = null;
  let currentBlock: ParsedBlock | null = null;
  let lineNumber = 0;
  let hasExplicitDay = false;

  const createNewBlock = (rawTitle: string): ParsedBlock => {
    const title = cleanBlockTitle(rawTitle);
    const isOptional = /\bopcional\b/i.test(rawTitle);
    return {
      title,
      type: detectBlockType(rawTitle), // Usa título original para detectar tipo
      format: detectFormat(rawTitle),
      isMainWod: false,
      isBenchmark: false,
      optional: isOptional,
      items: [],
      coachNotes: [],
      instructions: [],
    };
  };

  const saveCurrentBlock = () => {
    if (currentBlock) {
      // Só salva se tiver pelo menos 1 item OU instruções OU for estímulo de treino
      const allContent = [
        currentBlock.instruction || '',
        ...currentBlock.instructions,
        ...currentBlock.items.map(i => `${i.quantity} ${i.unit} ${i.movement}`)
      ].join(' ');
      
      const hasTrainingStimulus = isTrainingStimulus(allContent);
      const hasContent = currentBlock.items.length > 0 || currentBlock.instructions.length > 0 || currentBlock.instruction;
      
      if (hasContent || hasTrainingStimulus) {
        // Refinar tipo por conteúdo se ainda é conditioning genérico
        currentBlock.type = detectTypeByContent(currentBlock);
        
        // Detectar se é opcional pelo conteúdo
        if (/\bopcional\b/i.test(allContent)) {
          currentBlock.optional = true;
        }
        
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

    // Separador explícito ⸻ → fim do bloco atual
    if (line.includes(BLOCK_SEPARATOR)) {
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

    // Detectar título de bloco (linha em maiúsculas que não é dia)
    if (isUpperCaseLine(line) && line.length > 3) {
      saveCurrentBlock();
      currentBlock = createNewBlock(line);
      continue;
    }

    // Detectar linha de exercício (começa com número ou marcador)
    if (/^[-•*]?\s*\d/.test(line)) {
      const item = parseExerciseLine(line);
      
      if (item) {
        // Se não há bloco, criar um genérico
        if (!currentBlock) {
          currentBlock = createNewBlock('Bloco Principal');
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
      // ANTI-BURRO: Se a linha tem estímulo, é instrução de treino, NUNCA comentário
      if (isTrainingStimulus(line)) {
        currentBlock.instructions.push(line);
        // Detectar se é opcional
        if (/\bopcional\b/i.test(line)) {
          currentBlock.optional = true;
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
      // ANTI-BURRO: Se tem estímulo, criar bloco de treino
      if (isTrainingStimulus(line)) {
        currentBlock = createNewBlock('Bloco Principal');
        currentBlock.instructions.push(line);
        if (/\bopcional\b/i.test(line)) {
          currentBlock.optional = true;
        }
      } else {
        currentBlock = createNewBlock('Bloco Principal');
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
