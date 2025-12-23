/**
 * structuredTextParser.ts - Parser de texto modelo estruturado
 * 
 * MODELO OBRIGATÓRIO:
 * 
 * DIA: <SEGUNDA | TERÇA | QUARTA | QUINTA | SEXTA | SÁBADO | DOMINGO>
 * BLOCO: <Título do bloco>
 * TIPO: <Aquecimento | Força | Conditioning | Específico | Core | Corrida | Bike | Remo>
 * FORMATO: <For Time | AMRAP | EMOM | Rounds | Intervalos | Técnica>
 * PRINCIPAL: <true | false>
 * BENCHMARK: <true | false>
 * - <quantidade> <unidade> <movimento>
 * 
 * REGRAS:
 * - Texto fora do padrão NÃO pode ser salvo
 * - Linhas não parseadas vão para "Notas do coach"
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
}

export interface ParsedBlock {
  title: string;
  type: WorkoutBlock['type'];
  format: string;
  isMainWod: boolean;
  isBenchmark: boolean;
  items: ParsedItem[];
  coachNotes: string[];
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
}

// ============================================
// MAPEAMENTOS
// ============================================

const DAY_MAP: Record<string, DayOfWeek> = {
  'segunda': 'seg',
  'segunda-feira': 'seg',
  'seg': 'seg',
  'terça': 'ter',
  'terca': 'ter',
  'terça-feira': 'ter',
  'ter': 'ter',
  'quarta': 'qua',
  'quarta-feira': 'qua',
  'qua': 'qua',
  'quinta': 'qui',
  'quinta-feira': 'qui',
  'qui': 'qui',
  'sexta': 'sex',
  'sexta-feira': 'sex',
  'sex': 'sex',
  'sábado': 'sab',
  'sabado': 'sab',
  'sab': 'sab',
  'domingo': 'dom',
  'dom': 'dom',
};

const TYPE_MAP: Record<string, WorkoutBlock['type']> = {
  'aquecimento': 'aquecimento',
  'força': 'forca',
  'forca': 'forca',
  'conditioning': 'conditioning',
  'condicionamento': 'conditioning',
  'específico': 'especifico',
  'especifico': 'especifico',
  'hyrox': 'especifico',
  'core': 'core',
  'corrida': 'corrida',
  'run': 'corrida',
  'bike': 'conditioning', // bike mapeia para conditioning
  'remo': 'conditioning', // remo mapeia para conditioning
  'row': 'conditioning',
};

const FORMAT_MAP: Record<string, string> = {
  'for time': 'for_time',
  'fortime': 'for_time',
  'amrap': 'amrap',
  'emom': 'emom',
  'rounds': 'rounds',
  'intervalos': 'intervalos',
  'intervalo': 'intervalos',
  'técnica': 'tecnica',
  'tecnica': 'tecnica',
  'outro': 'outro',
};

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
};

// ============================================
// PARSER PRINCIPAL
// ============================================

export function parseStructuredText(text: string): ParseResult {
  const lines = text.split('\n');
  const result: ParseResult = {
    success: false,
    days: [],
    errors: [],
    warnings: [],
  };

  let currentDay: DayOfWeek | null = null;
  let currentBlock: ParsedBlock | null = null;
  let lineNumber = 0;

  const saveCurrentBlock = () => {
    if (currentBlock && currentDay) {
      const dayEntry = result.days.find(d => d.day === currentDay);
      if (dayEntry) {
        dayEntry.blocks.push(currentBlock);
      }
    }
    currentBlock = null;
  };

  for (const rawLine of lines) {
    lineNumber++;
    const line = rawLine.trim();
    
    // Linha vazia
    if (!line) continue;

    // PADRÃO: DIA: <valor>
    const dayMatch = line.match(/^DIA:\s*(.+)$/i);
    if (dayMatch) {
      saveCurrentBlock();
      const dayValue = dayMatch[1].trim().toLowerCase();
      const mappedDay = DAY_MAP[dayValue];
      
      if (mappedDay) {
        // Verificar se dia já existe
        if (result.days.some(d => d.day === mappedDay)) {
          result.warnings.push(`Linha ${lineNumber}: Dia "${dayValue}" já definido anteriormente`);
        } else {
          result.days.push({ day: mappedDay, blocks: [] });
        }
        currentDay = mappedDay;
      } else {
        result.errors.push(`Linha ${lineNumber}: Dia inválido "${dayValue}". Use: Segunda, Terça, Quarta, Quinta, Sexta, Sábado ou Domingo`);
      }
      continue;
    }

    // PADRÃO: BLOCO: <título>
    const blockMatch = line.match(/^BLOCO:\s*(.+)$/i);
    if (blockMatch) {
      saveCurrentBlock();
      
      if (!currentDay) {
        result.errors.push(`Linha ${lineNumber}: BLOCO definido antes de DIA`);
        continue;
      }

      currentBlock = {
        title: blockMatch[1].trim(),
        type: 'conditioning', // default
        format: 'outro', // default
        isMainWod: false,
        isBenchmark: false,
        items: [],
        coachNotes: [],
      };
      continue;
    }

    // PADRÃO: TIPO: <valor>
    const typeMatch = line.match(/^TIPO:\s*(.+)$/i);
    if (typeMatch) {
      if (!currentBlock) {
        result.errors.push(`Linha ${lineNumber}: TIPO definido antes de BLOCO`);
        continue;
      }
      
      const typeValue = typeMatch[1].trim().toLowerCase();
      const mappedType = TYPE_MAP[typeValue];
      
      if (mappedType) {
        currentBlock.type = mappedType;
      } else {
        result.errors.push(`Linha ${lineNumber}: TIPO inválido "${typeValue}". Use: Aquecimento, Força, Conditioning, Específico, Core, Corrida, Bike ou Remo`);
      }
      continue;
    }

    // PADRÃO: FORMATO: <valor>
    const formatMatch = line.match(/^FORMATO:\s*(.+)$/i);
    if (formatMatch) {
      if (!currentBlock) {
        result.errors.push(`Linha ${lineNumber}: FORMATO definido antes de BLOCO`);
        continue;
      }
      
      const formatValue = formatMatch[1].trim().toLowerCase();
      const mappedFormat = FORMAT_MAP[formatValue];
      
      if (mappedFormat) {
        currentBlock.format = mappedFormat;
      } else {
        result.errors.push(`Linha ${lineNumber}: FORMATO inválido "${formatValue}". Use: For Time, AMRAP, EMOM, Rounds, Intervalos ou Técnica`);
      }
      continue;
    }

    // PADRÃO: PRINCIPAL: <true|false>
    const principalMatch = line.match(/^PRINCIPAL:\s*(true|false|sim|não|nao|yes|no)$/i);
    if (principalMatch) {
      if (!currentBlock) {
        result.errors.push(`Linha ${lineNumber}: PRINCIPAL definido antes de BLOCO`);
        continue;
      }
      
      const value = principalMatch[1].toLowerCase();
      currentBlock.isMainWod = ['true', 'sim', 'yes'].includes(value);
      continue;
    }

    // PADRÃO: BENCHMARK: <true|false>
    const benchmarkMatch = line.match(/^BENCHMARK:\s*(true|false|sim|não|nao|yes|no)$/i);
    if (benchmarkMatch) {
      if (!currentBlock) {
        result.errors.push(`Linha ${lineNumber}: BENCHMARK definido antes de BLOCO`);
        continue;
      }
      
      const value = benchmarkMatch[1].toLowerCase();
      currentBlock.isBenchmark = ['true', 'sim', 'yes'].includes(value);
      continue;
    }

    // PADRÃO: - <quantidade> <unidade> <movimento>
    const itemMatch = line.match(/^[-•*]\s*(\d+(?:[.,]\d+)?)\s*(\w+)\s+(.+?)(?:\s*\((.+)\))?$/);
    if (itemMatch) {
      if (!currentBlock) {
        result.warnings.push(`Linha ${lineNumber}: Item ignorado (fora de um BLOCO)`);
        continue;
      }

      const quantity = parseFloat(itemMatch[1].replace(',', '.'));
      const rawUnit = itemMatch[2].toLowerCase();
      const movement = itemMatch[3].trim();
      const notes = itemMatch[4]?.trim();

      const unit = UNIT_MAP[rawUnit] || 'reps';

      currentBlock.items.push({
        quantity,
        unit,
        movement,
        notes,
      });
      continue;
    }

    // Linha não reconhecida - vai para notas do coach
    if (currentBlock) {
      currentBlock.coachNotes.push(line);
      result.warnings.push(`Linha ${lineNumber}: Movida para notas do coach: "${line.substring(0, 50)}${line.length > 50 ? '...' : ''}"`);
    } else if (currentDay) {
      result.warnings.push(`Linha ${lineNumber}: Ignorada (fora de um BLOCO): "${line.substring(0, 50)}${line.length > 50 ? '...' : ''}"`);
    }
  }

  // Salvar último bloco
  saveCurrentBlock();

  // Validações finais
  if (result.days.length === 0) {
    result.errors.push('Nenhum DIA encontrado. Use o formato: DIA: Segunda');
  }

  for (const day of result.days) {
    if (day.blocks.length === 0) {
      result.errors.push(`Dia ${getDayName(day.day)} não tem blocos definidos`);
    }

    for (const block of day.blocks) {
      if (!block.title.trim()) {
        result.errors.push(`Bloco sem título no dia ${getDayName(day.day)}`);
      }
      if (block.items.length === 0) {
        result.errors.push(`Bloco "${block.title}" no dia ${getDayName(day.day)} não tem itens válidos`);
      }
    }

    // Verificar múltiplos principais
    const mainCount = day.blocks.filter(b => b.isMainWod).length;
    if (mainCount > 1) {
      result.warnings.push(`Dia ${getDayName(day.day)} tem ${mainCount} blocos marcados como Principal. Recomendamos apenas 1.`);
    }
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
  const itemsText = block.items
    .map(item => {
      const base = `${item.quantity} ${item.unit} ${item.movement}`;
      return item.notes ? `${base} (${item.notes})` : base;
    })
    .join('\n');

  if (block.coachNotes.length > 0) {
    return `${itemsText}\n\n📝 ${block.coachNotes.join('\n')}`;
  }

  return itemsText;
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
  };
  return labels[type] || type;
}

// ============================================
// TEMPLATE DE EXEMPLO
// ============================================

export const TEMPLATE_EXAMPLE = `DIA: Segunda
BLOCO: AMRAP 20min
TIPO: Conditioning
FORMATO: AMRAP
PRINCIPAL: true
BENCHMARK: false
- 5 reps Pull-ups
- 10 reps Push-ups
- 15 reps Air Squats

BLOCO: Aquecimento
TIPO: Aquecimento
FORMATO: Rounds
PRINCIPAL: false
BENCHMARK: false
- 400 m Run
- 10 reps Air Squats
- 10 reps Arm Circles

DIA: Terça
BLOCO: Força - Back Squat
TIPO: Força
FORMATO: Técnica
PRINCIPAL: true
BENCHMARK: false
- 5 reps Back Squat (70%)
- 5 reps Back Squat (75%)
- 5 reps Back Squat (80%)`;
