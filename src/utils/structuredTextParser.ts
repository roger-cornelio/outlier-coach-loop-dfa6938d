/**
 * structuredTextParser.ts - Parser de texto livre de treino
 * 
 * REGRAS DE PARSING (DETERMINÍSTICO):
 * - Linhas MAIÚSCULAS → dias ou títulos de blocos
 * - Linhas iniciadas por número → exercícios
 * - Texto solto → instruction/notas
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
  items: ParsedItem[];
  coachNotes: string[];
  instruction?: string;
}

export interface ParsedDay {
  day: DayOfWeek;
  blocks: ParsedBlock[];
}

export interface ParseResult {
  success: boolean;
  days: ParsedDay[];
  errors: string[];
  warnings: string[];
  alerts: string[]; // Alertas leves (não bloqueiam)
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

const TYPE_PATTERNS: { pattern: RegExp; type: WorkoutBlock['type'] }[] = [
  { pattern: /aquecimento|warm[- ]?up|🔥/i, type: 'aquecimento' },
  { pattern: /conditioning|condicionamento|metcon|⚡/i, type: 'conditioning' },
  { pattern: /for[cç]a|strength|💪/i, type: 'forca' },
  { pattern: /espec[ií]fico|specific|hyrox|🛷/i, type: 'especifico' },
  { pattern: /core|abdominal|🎯/i, type: 'core' },
  { pattern: /corrida|running|run\b|🏃/i, type: 'corrida' },
];

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

// ============================================
// PARSER PRINCIPAL - TEXTO LIVRE
// ============================================

export function parseStructuredText(text: string): ParseResult {
  const lines = text.split('\n');
  const result: ParseResult = {
    success: false,
    days: [],
    errors: [],
    warnings: [],
    alerts: [],
  };

  let currentDay: DayOfWeek | null = null;
  let currentBlock: ParsedBlock | null = null;
  let lineNumber = 0;

  const saveCurrentBlock = () => {
    if (currentBlock && currentDay) {
      // Só salva se tiver pelo menos 1 item OU notas
      if (currentBlock.items.length > 0 || currentBlock.coachNotes.length > 0 || currentBlock.instruction) {
        const dayEntry = result.days.find(d => d.day === currentDay);
        if (dayEntry) {
          dayEntry.blocks.push(currentBlock);
        }
      }
    }
    currentBlock = null;
  };

  const detectDay = (line: string): DayOfWeek | null => {
    // Limpa a linha
    const cleanLine = line.toLowerCase().replace(/[^a-záéíóúàâêôãõç\s-]/g, '').trim();
    
    // Verifica cada padrão de dia
    for (const [key, day] of Object.entries(DAY_MAP)) {
      if (cleanLine === key || cleanLine.startsWith(key + ' ') || cleanLine.endsWith(' ' + key)) {
        return day;
      }
    }
    
    // Segunda tentativa: verificar se a linha contém dia da semana em contexto
    for (const [key, day] of Object.entries(DAY_MAP)) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(line) && line.length < 50) {
        return day;
      }
    }
    
    return null;
  };

  const detectBlockType = (line: string): WorkoutBlock['type'] => {
    for (const { pattern, type } of TYPE_PATTERNS) {
      if (pattern.test(line)) {
        return type;
      }
    }
    return 'conditioning'; // default
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
    // Remove números e caracteres especiais para verificar se é maiúsculo
    const letters = line.replace(/[^a-záéíóúàâêôãõçA-ZÁÉÍÓÚÀÂÊÔÃÕÇ]/g, '');
    if (letters.length < 3) return false;
    return letters === letters.toUpperCase() && letters.length > 0;
  };

  const parseExerciseLine = (line: string): ParsedItem | null => {
    // Padrões comuns de exercício:
    // "10 reps Pull-ups"
    // "10 Pull-ups"
    // "- 5 x Push-ups"
    // "400m Run"
    // "30 cal Row"
    // "3 rounds of..."
    
    const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
    
    // Padrão: número + unidade opcional + movimento
    const match = cleanLine.match(/^(\d+(?:[.,]\d+)?)\s*(['"])?(\w+)?\s+(.+?)(?:\s*[\(@](.+)[\)@])?$/);
    
    if (match) {
      const quantity = parseFloat(match[1].replace(',', '.'));
      let rawUnit = match[3]?.toLowerCase() || match[2] || '';
      let movement = match[4].trim();
      const notes = match[5]?.trim();
      
      // Se unidade não reconhecida, assume reps e movimento inclui a "unidade"
      let unit = UNIT_MAP[rawUnit];
      if (!unit && rawUnit) {
        // Pode ser que a "unidade" seja parte do movimento
        movement = `${rawUnit} ${movement}`;
        unit = 'reps';
      } else if (!unit) {
        unit = 'reps';
      }
      
      // Detectar peso na linha
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
    // % → peso relativo (ok)
    const percentMatch = line.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (percentMatch) {
      return { weight: `${percentMatch[1]}%`, isAlert: false };
    }
    
    // PSE/RPE → esforço (ok)
    const rpeMatch = line.match(/(pse|rpe)\s*[:=]?\s*(\d+)/i);
    if (rpeMatch) {
      return { weight: `${rpeMatch[1].toUpperCase()} ${rpeMatch[2]}`, isAlert: false };
    }
    
    // Formato RX: 32/24kg ou 20/15 → referência (ok)
    const rxMatch = line.match(/(\d+)\s*\/\s*(\d+)\s*(?:kg)?/);
    if (rxMatch) {
      return { weight: `${rxMatch[1]}/${rxMatch[2]}kg`, isAlert: false };
    }
    
    // kg isolado → carga fixa (gerar alerta)
    const kgMatch = line.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
    if (kgMatch) {
      return { weight: `${kgMatch[1]}kg`, isAlert: true };
    }
    
    // leve/moderada/pesada → autorregulado
    if (/\b(leve|moderada?|pesada?|heavy|light|moderate)\b/i.test(line)) {
      return { weight: 'autorregulado', isAlert: false };
    }
    
    return { isAlert: false };
  };

  for (const rawLine of lines) {
    lineNumber++;
    const line = rawLine.trim();
    
    // Linha vazia
    if (!line) continue;

    // Detectar dia da semana
    const detectedDay = detectDay(line);
    if (detectedDay && isUpperCaseLine(line)) {
      saveCurrentBlock();
      
      // Verificar se dia já existe
      if (!result.days.some(d => d.day === detectedDay)) {
        result.days.push({ day: detectedDay, blocks: [] });
      }
      currentDay = detectedDay;
      currentBlock = null;
      continue;
    }

    // Detectar título de bloco (linha em maiúsculas que não é dia)
    if (isUpperCaseLine(line) && line.length > 3) {
      saveCurrentBlock();
      
      if (!currentDay) {
        // Sem dia definido ainda - criar bloco "avulso" no primeiro dia disponível ou criar seg
        if (result.days.length === 0) {
          result.days.push({ day: 'seg', blocks: [] });
          result.alerts.push('Treino sem dia definido - assumindo Segunda-feira');
        }
        currentDay = result.days[0].day;
      }
      
      currentBlock = {
        title: line,
        type: detectBlockType(line),
        format: detectFormat(line),
        isMainWod: false,
        isBenchmark: false,
        items: [],
        coachNotes: [],
      };
      continue;
    }

    // Detectar linha de exercício (começa com número ou marcador)
    if (/^[-•*]?\s*\d/.test(line)) {
      const item = parseExerciseLine(line);
      
      if (item) {
        // Se não há bloco, criar um genérico
        if (!currentBlock) {
          if (!currentDay && result.days.length === 0) {
            result.days.push({ day: 'seg', blocks: [] });
            result.alerts.push('Treino sem dia definido - assumindo Segunda-feira');
            currentDay = 'seg';
          } else if (!currentDay) {
            currentDay = result.days[0]?.day || 'seg';
          }
          
          currentBlock = {
            title: 'TREINO',
            type: 'conditioning',
            format: 'outro',
            isMainWod: false,
            isBenchmark: false,
            items: [],
            coachNotes: [],
          };
        }
        
        currentBlock.items.push(item);
        
        // Alertar sobre kg isolado
        if (item.isWeightAlert) {
          result.alerts.push(`Carga "${item.weight}" detectada - será autorregulada pelo sistema`);
        }
        
        continue;
      }
    }

    // Linha de texto solto → instruction ou nota
    if (currentBlock) {
      // Se parece instrução (curta, sem números)
      if (line.length < 100 && !/\d/.test(line)) {
        if (!currentBlock.instruction) {
          currentBlock.instruction = line;
        } else {
          currentBlock.coachNotes.push(line);
        }
      } else {
        currentBlock.coachNotes.push(line);
      }
    } else if (currentDay) {
      // Texto antes de qualquer bloco - criar bloco com essa instrução
      currentBlock = {
        title: 'TREINO',
        type: 'conditioning',
        format: 'outro',
        isMainWod: false,
        isBenchmark: false,
        items: [],
        coachNotes: [],
        instruction: line,
      };
    }
  }

  // Salvar último bloco
  saveCurrentBlock();

  // Validações finais
  if (result.days.length === 0) {
    result.errors.push('Nenhum treino válido encontrado');
  }

  let totalBlocks = 0;
  for (const day of result.days) {
    totalBlocks += day.blocks.length;
    if (day.blocks.length === 0) {
      result.warnings.push(`${getDayName(day.day)} sem blocos de treino`);
    }
  }

  if (totalBlocks === 0) {
    result.errors.push('Nenhum bloco de treino identificado');
  }

  // Alertar se nenhum WOD principal definido
  const hasMainWod = result.days.some(d => d.blocks.some(b => b.isMainWod));
  if (!hasMainWod && totalBlocks > 0) {
    result.alerts.push('Nenhum WOD principal definido');
  }

  result.success = result.errors.length === 0;
  return result;
}

// ============================================
// CONVERSÃO PARA DayWorkout[]
// ============================================

export function parsedToDayWorkouts(parsed: ParseResult): DayWorkout[] {
  return parsed.days.map(day => ({
    day: day.day,
    stimulus: '',
    estimatedTime: 60,
    blocks: day.blocks.map((block, idx) => ({
      id: `${day.day}-${idx}-${Date.now()}`,
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
  
  // Instrução primeiro
  if (block.instruction) {
    parts.push(block.instruction);
    parts.push('');
  }
  
  // Items
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

  // Notas do coach
  if (block.coachNotes.length > 0) {
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
