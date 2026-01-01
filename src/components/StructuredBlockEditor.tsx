/**
 * StructuredBlockEditor - Editor estruturado de bloco de treino
 * 
 * MODELO ANTI-BURRO:
 * - Título obrigatório
 * - Tipo obrigatório (dropdown)
 * - Formato obrigatório (dropdown)
 * - Itens estruturados (quantidade + unidade + movimento)
 * - Notas do coach (campo separado, opcional)
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, GripVertical, AlertCircle, ChevronDown, ChevronUp, Clipboard, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { WorkoutBlock } from '@/types/outlier';

// ============================================
// TIPOS E CONSTANTES
// ============================================

// FONTE ÚNICA: Todas as listas vêm de categoryValidation.ts
import { 
  BLOCK_CATEGORIES, 
  BLOCK_FORMATS,
  WORKOUT_UNITS,
  QUICK_PRESETS,
  validateBlockByCategory, 
  canBlockBeMain,
  getCategoryEmoji,
  VALIDATION_MESSAGES,
  type CategoryValidationResult,
  type BlockCategory,
  type BlockFormat,
  type WorkoutUnit,
} from '@/utils/categoryValidation';

// Re-exportar para compatibilidade com código existente
export const BLOCK_TYPES = BLOCK_CATEGORIES;
export const UNITS = WORKOUT_UNITS;
export { BLOCK_FORMATS, QUICK_PRESETS };

// Movimentos comuns para autocomplete (base inicial)
const COMMON_MOVEMENTS = [
  'Pull-ups', 'Push-ups', 'Air Squats', 'Burpees', 'Box Jumps',
  'Kettlebell Swings', 'Deadlifts', 'Cleans', 'Snatches', 'Thrusters',
  'Wall Balls', 'Double Unders', 'Toes to Bar', 'Muscle-ups', 'Handstand Push-ups',
  'Rowing', 'Assault Bike', 'Running', 'Ski Erg', 'Sled Push', 'Sled Pull',
  'Lunges', 'Step-ups', 'Farmers Carry', 'Sandbag Carry',
  'Burpee Broad Jump', 'Box Jump Over', 'Devil Press', 'Dumbbell Snatch',
  'Rope Climbs', 'Pistols', 'GHD Sit-ups', 'Back Extensions',
];

export interface WorkoutItem {
  id: string;
  quantity: number | '';
  unit: string;
  movement: string;
  notes?: string;
}

export interface StructuredBlock {
  id: string;
  title: string;
  type: string;
  format: string;
  items: WorkoutItem[];
  coachNotes: string;
  // Flags preservadas
  isMainWod?: boolean;
  isBenchmark?: boolean;
}

export interface BlockValidationError {
  field: string;
  message: string;
}

// ============================================
// VALIDAÇÃO
// ============================================

export function validateBlock(block: StructuredBlock): BlockValidationError[] {
  const errors: BlockValidationError[] = [];

  // Título obrigatório
  if (!block.title.trim()) {
    errors.push({ field: 'title', message: 'Título é obrigatório' });
  }

  // Tipo obrigatório
  if (!block.type) {
    errors.push({ field: 'type', message: 'Selecione o tipo do bloco' });
  }

  // Formato obrigatório
  if (!block.format) {
    errors.push({ field: 'format', message: 'Selecione o formato do bloco' });
  }

  // Mínimo 1 item válido
  const validItems = block.items.filter(
    item => item.quantity !== '' && item.quantity > 0 && item.unit && item.movement.trim()
  );

  if (validItems.length === 0) {
    errors.push({ field: 'items', message: 'Adicione pelo menos 1 item válido (quantidade + unidade + movimento)' });
  }

  return errors;
}

export function isBlockValid(block: StructuredBlock): boolean {
  return validateBlock(block).length === 0;
}

// ============================================
// CONVERSÃO PARA WorkoutBlock
// ============================================

export function structuredToWorkoutBlock(structured: StructuredBlock): WorkoutBlock {
  // ════════════════════════════════════════════════════════════════════════════
  // MVP0: TAGS SÃO FONTE DE VERDADE
  // O content DEVE usar tags [TREINO] e [COMENTÁRIO] para separação determinística
  // Isso garante que o comentário NUNCA apareça como treino na UI
  // ════════════════════════════════════════════════════════════════════════════
  
  // Gera o content a partir dos items estruturados
  const itemsContent = structured.items
    .filter(item => item.quantity !== '' && item.movement.trim())
    .map(item => {
      const base = `${item.quantity} ${item.unit} ${item.movement}`;
      return item.notes ? `${base} (${item.notes})` : base;
    })
    .join('\n');

  // ════════════════════════════════════════════════════════════════════════════
  // MVP0 FIX: Usar tags [TREINO]/[COMENTÁRIO] para separação soberana
  // NUNCA concatenar comentário diretamente no treino sem tags
  // ════════════════════════════════════════════════════════════════════════════
  let fullContent: string;
  const hasCoachNotes = structured.coachNotes?.trim();
  
  if (hasCoachNotes) {
    // Usar tags para separação determinística
    fullContent = `[TREINO]\n${itemsContent}\n[COMENTÁRIO]\n${structured.coachNotes.trim()}`;
  } else {
    // Sem comentário - só treino (sem tag necessária)
    fullContent = itemsContent;
  }

  // Mapear tipo para o formato do WorkoutBlock
  const typeMap: Record<string, WorkoutBlock['type']> = {
    aquecimento: 'aquecimento',
    forca: 'forca',
    conditioning: 'conditioning',
    especifico: 'especifico',
    core: 'core',
    corrida: 'corrida',
    bike: 'conditioning', // bike mapeia para conditioning
    remo: 'conditioning', // remo mapeia para conditioning
  };

  return {
    id: structured.id,
    type: typeMap[structured.type] || 'conditioning',
    title: structured.title.trim(),
    content: fullContent,
    isMainWod: structured.isMainWod,
    isBenchmark: structured.isBenchmark,
  };
}

export function workoutBlockToStructured(block: WorkoutBlock): StructuredBlock {
  // ════════════════════════════════════════════════════════════════════════════
  // MVP0: TAGS SÃO FONTE DE VERDADE
  // Se o content usa tags [TREINO]/[COMENTÁRIO], usar split determinístico
  // ════════════════════════════════════════════════════════════════════════════
  
  let trainingContent = block.content;
  let coachNotes = '';
  
  // Detectar tags e fazer split determinístico
  const hasTreinoTag = block.content.includes('[TREINO]');
  const hasComentarioTag = block.content.includes('[COMENTÁRIO]');
  
  if (hasTreinoTag || hasComentarioTag) {
    if (hasTreinoTag && hasComentarioTag) {
      // Caso ideal: ambas as tags existem
      const treinoStart = block.content.indexOf('[TREINO]') + '[TREINO]'.length;
      const comentarioStart = block.content.indexOf('[COMENTÁRIO]');
      const comentarioContentStart = comentarioStart + '[COMENTÁRIO]'.length;
      
      trainingContent = block.content.slice(treinoStart, comentarioStart).trim();
      coachNotes = block.content.slice(comentarioContentStart).trim();
    } else if (hasTreinoTag) {
      // Só [TREINO]: tudo depois é treino
      const treinoStart = block.content.indexOf('[TREINO]') + '[TREINO]'.length;
      trainingContent = block.content.slice(treinoStart).trim();
    } else if (hasComentarioTag) {
      // Só [COMENTÁRIO]: tudo antes é treino, depois é comentário
      const comentarioStart = block.content.indexOf('[COMENTÁRIO]');
      trainingContent = block.content.slice(0, comentarioStart).trim();
      coachNotes = block.content.slice(comentarioStart + '[COMENTÁRIO]'.length).trim();
    }
  } else {
    // Fallback: detectar notas com emoji (legado)
    const lines = block.content.split('\n');
    const trainingLines: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('📝') || line.toLowerCase().includes('nota:')) {
        coachNotes = line.replace(/^📝\s*/, '').replace(/^nota:\s*/i, '');
      } else {
        trainingLines.push(line);
      }
    }
    trainingContent = trainingLines.join('\n');
  }
  
  // Parse do trainingContent para extrair items
  const lines = trainingContent.split('\n').filter(l => l.trim());
  const items: WorkoutItem[] = [];

  for (const line of lines) {
    // Tenta parsear como item estruturado
    const match = line.match(/^(\d+(?:\.\d+)?)\s*(reps?|m|km|cal|min|sec|rounds?|x)\s+(.+?)(?:\s*\((.+)\))?$/i);
    if (match) {
      items.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        quantity: parseFloat(match[1]),
        unit: match[2].toLowerCase().replace(/s$/, ''), // normaliza plural
        movement: match[3].trim(),
        notes: match[4]?.trim(),
      });
    } else if (line.trim()) {
      // Linha não parseada - adiciona como movimento sem quantidade
      items.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        quantity: 1,
        unit: 'reps',
        movement: line.trim(),
      });
    }
  }

  // Se não encontrou items, adiciona um vazio
  if (items.length === 0) {
    items.push(createEmptyItem());
  }

  return {
    id: block.id,
    title: block.title,
    type: block.type,
    format: detectFormat(trainingContent),
    items,
    coachNotes,
    isMainWod: block.isMainWod,
    isBenchmark: block.isBenchmark,
  };
}

function detectFormat(content: string): string {
  const lower = content.toLowerCase();
  if (lower.includes('amrap')) return 'amrap';
  if (lower.includes('emom')) return 'emom';
  if (lower.includes('for time')) return 'for_time';
  if (/\d+\s*rounds?/.test(lower)) return 'rounds';
  if (lower.includes('interval')) return 'intervalos';
  return 'outro';
}

function createEmptyItem(): WorkoutItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    quantity: '',
    unit: 'reps',
    movement: '',
  };
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

interface StructuredBlockEditorProps {
  block: StructuredBlock;
  onChange: (block: StructuredBlock) => void;
  onRemove?: () => void;
  showValidation?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  movementHistory?: string[]; // Histórico de movimentos do coach
}

export function StructuredBlockEditor({
  block,
  onChange,
  onRemove,
  showValidation = false,
  isExpanded = true,
  onToggleExpand,
  movementHistory = [],
}: StructuredBlockEditorProps) {
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [activeMovementField, setActiveMovementField] = useState<string | null>(null);
  const [movementSearch, setMovementSearch] = useState('');
  
  const errors = showValidation ? validateBlock(block) : [];
  const hasError = (field: string) => errors.some(e => e.field === field);

  // Combinar movimentos comuns com histórico do coach
  const allMovements = useMemo(() => {
    const combined = [...new Set([...movementHistory, ...COMMON_MOVEMENTS])];
    return combined.sort();
  }, [movementHistory]);

  // Filtrar sugestões de movimento
  const movementSuggestions = useMemo(() => {
    if (!movementSearch.trim()) return allMovements.slice(0, 10);
    const search = movementSearch.toLowerCase();
    return allMovements
      .filter(m => m.toLowerCase().includes(search))
      .slice(0, 10);
  }, [movementSearch, allMovements]);

  const updateBlock = useCallback((updates: Partial<StructuredBlock>) => {
    onChange({ ...block, ...updates });
  }, [block, onChange]);

  const addItem = useCallback(() => {
    updateBlock({
      items: [...block.items, createEmptyItem()],
    });
  }, [block.items, updateBlock]);

  // Adicionar item com preset
  const addItemWithPreset = useCallback((unit: string, defaultQty: number) => {
    const newItem: WorkoutItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      quantity: defaultQty,
      unit,
      movement: '',
    };
    updateBlock({
      items: [...block.items, newItem],
    });
  }, [block.items, updateBlock]);

  // Parser de texto colado
  const parseAndAddItems = useCallback(() => {
    if (!pasteText.trim()) {
      setShowPasteInput(false);
      return;
    }

    const lines = pasteText.split('\n').filter(l => l.trim());
    const parsedItems: WorkoutItem[] = [];
    const unparsedLines: string[] = [];

    for (const line of lines) {
      // Padrões comuns: "10 Pull-ups", "100m Run", "15 cal Row", "3 rounds", "1:30 min rest"
      const patterns = [
        // "10 reps Pull-ups" ou "10 Pull-ups"
        /^(\d+(?:[.,]\d+)?)\s*(reps?|rep)?\s+(.+?)(?:\s*\((.+)\))?$/i,
        // "100m Run" ou "100 m Run"
        /^(\d+(?:[.,]\d+)?)\s*(m|km|meters?|metros?)\s+(.+?)(?:\s*\((.+)\))?$/i,
        // "15 cal Row"
        /^(\d+(?:[.,]\d+)?)\s*(cal|cals?|calorias?)\s+(.+?)(?:\s*\((.+)\))?$/i,
        // "3 rounds of..."
        /^(\d+(?:[.,]\d+)?)\s*(rounds?|rodadas?)\s+(?:of\s+)?(.+?)(?:\s*\((.+)\))?$/i,
        // "1 min rest" ou "30 sec hold"
        /^(\d+(?:[.,]\d+)?)\s*(min|sec|minutos?|segundos?)\s+(.+?)(?:\s*\((.+)\))?$/i,
        // Formato genérico: número + qualquer coisa
        /^(\d+(?:[.,]\d+)?)\s*[x×]\s*(.+?)(?:\s*\((.+)\))?$/i,
      ];

      let matched = false;
      
      for (const pattern of patterns) {
        const match = line.trim().match(pattern);
        if (match) {
          const qty = parseFloat(match[1].replace(',', '.'));
          let unit = 'reps';
          let movement = '';
          let notes = '';

          // Detectar unidade
          const unitMatch = match[2]?.toLowerCase() || '';
          if (unitMatch.startsWith('m') && !unitMatch.includes('min')) unit = 'm';
          else if (unitMatch.includes('km')) unit = 'km';
          else if (unitMatch.startsWith('cal')) unit = 'cal';
          else if (unitMatch.startsWith('round') || unitMatch.startsWith('rodada')) unit = 'rounds';
          else if (unitMatch.startsWith('min')) unit = 'min';
          else if (unitMatch.startsWith('sec') || unitMatch.startsWith('seg')) unit = 'sec';

          movement = match[3]?.trim() || match[2]?.trim() || '';
          notes = match[4]?.trim() || '';

          if (movement) {
            parsedItems.push({
              id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${parsedItems.length}`,
              quantity: qty,
              unit,
              movement,
              notes: notes || undefined,
            });
            matched = true;
            break;
          }
        }
      }

      if (!matched && line.trim()) {
        unparsedLines.push(line.trim());
      }
    }

    // Atualizar bloco
    if (parsedItems.length > 0) {
      // Remover itens vazios e adicionar os parseados
      const existingValidItems = block.items.filter(
        item => item.quantity !== '' && item.movement.trim()
      );
      updateBlock({
        items: [...existingValidItems, ...parsedItems],
        coachNotes: unparsedLines.length > 0 
          ? (block.coachNotes ? block.coachNotes + '\n' : '') + unparsedLines.join('\n')
          : block.coachNotes,
      });
    } else if (unparsedLines.length > 0) {
      // Tudo foi para notas
      updateBlock({
        coachNotes: (block.coachNotes ? block.coachNotes + '\n' : '') + unparsedLines.join('\n'),
      });
    }

    setPasteText('');
    setShowPasteInput(false);
  }, [pasteText, block.items, block.coachNotes, updateBlock]);

  const removeItem = useCallback((itemId: string) => {
    updateBlock({
      items: block.items.filter(i => i.id !== itemId),
    });
  }, [block.items, updateBlock]);

  const updateItem = useCallback((itemId: string, updates: Partial<WorkoutItem>) => {
    updateBlock({
      items: block.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ),
    });
  }, [block.items, updateBlock]);

  const typeConfig = BLOCK_TYPES.find(t => t.value === block.type);

  return (
    <div className={`border rounded-lg overflow-hidden ${
      errors.length > 0 ? 'border-destructive/50' : 'border-border'
    }`}>
      {/* Header colapsável */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full p-3 flex items-center justify-between bg-secondary/30 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {typeConfig && <span>{typeConfig.emoji}</span>}
          <span className="font-medium text-sm">
            {block.title || 'Novo Bloco'}
          </span>
          {errors.length > 0 && (
            <span className="text-destructive text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.length} erro(s)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Conteúdo expandido */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 bg-background">
              {/* Título */}
              <div className="space-y-1.5">
                <Label htmlFor={`title-${block.id}`}>
                  Título do Bloco <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`title-${block.id}`}
                  value={block.title}
                  onChange={(e) => updateBlock({ title: e.target.value })}
                  placeholder="Ex: AMRAP 20min"
                  className={hasError('title') ? 'border-destructive' : ''}
                />
                {hasError('title') && (
                  <p className="text-xs text-destructive">Título é obrigatório</p>
                )}
              </div>

              {/* Tipo e Formato */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo <span className="text-destructive">*</span></Label>
                  <Select value={block.type} onValueChange={(v) => updateBlock({ type: v })}>
                    <SelectTrigger className={hasError('type') ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border z-50">
                      {BLOCK_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.emoji} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Formato <span className="text-destructive">*</span></Label>
                  <Select value={block.format} onValueChange={(v) => updateBlock({ format: v })}>
                    <SelectTrigger className={hasError('format') ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border z-50">
                      {BLOCK_FORMATS.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items do treino */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label>
                    Itens do Treino <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Botão colar texto */}
                    <Button
                      type="button"
                      variant={showPasteInput ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowPasteInput(!showPasteInput)}
                      className="h-7 text-xs"
                    >
                      <Clipboard className="w-3 h-3 mr-1" />
                      Colar
                    </Button>
                    
                    {/* Presets rápidos */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          Rápido
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2 bg-popover border border-border" align="end">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground mb-2">Adicionar item:</p>
                          {QUICK_PRESETS.map((preset) => (
                            <Button
                              key={preset.unit}
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addItemWithPreset(preset.unit, preset.defaultQty)}
                              className="w-full justify-start h-8 text-xs"
                            >
                              <span className="mr-2">{preset.icon}</span>
                              {preset.label} ({preset.defaultQty} {preset.unit})
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addItem}
                      className="h-7 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Item
                    </Button>
                  </div>
                </div>

                {/* Campo de colar texto */}
                <AnimatePresence>
                  {showPasteInput && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 rounded-lg border border-dashed border-primary/50 bg-primary/5 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Cole o texto do treino. Linhas como "10 Pull-ups" serão convertidas automaticamente.
                        </p>
                        <Textarea
                          value={pasteText}
                          onChange={(e) => setPasteText(e.target.value)}
                          placeholder="Ex:
10 Pull-ups
100m Run
15 cal Assault Bike
3 rounds Burpees"
                          rows={4}
                          className="text-sm"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPasteText('');
                              setShowPasteInput(false);
                            }}
                            className="h-7 text-xs"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={parseAndAddItems}
                            className="h-7 text-xs"
                          >
                            Processar
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {hasError('items') && (
                  <p className="text-xs text-destructive">
                    Adicione pelo menos 1 item válido (quantidade + unidade + movimento)
                  </p>
                )}

                <div className="space-y-2">
                  {block.items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 cursor-move" />
                      
                      {/* Quantidade */}
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { 
                          quantity: e.target.value === '' ? '' : parseFloat(e.target.value) 
                        })}
                        placeholder="Qtd"
                        className="w-16 text-center"
                        min={0}
                      />

                      {/* Unidade */}
                      <Select 
                        value={item.unit} 
                        onValueChange={(v) => updateItem(item.id, { unit: v })}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50">
                          {UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Movimento com autocomplete */}
                      <Popover 
                        open={activeMovementField === item.id} 
                        onOpenChange={(open) => {
                          setActiveMovementField(open ? item.id : null);
                          if (open) setMovementSearch(item.movement);
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Input
                            value={item.movement}
                            onChange={(e) => {
                              updateItem(item.id, { movement: e.target.value });
                              setMovementSearch(e.target.value);
                              if (!activeMovementField) setActiveMovementField(item.id);
                            }}
                            onFocus={() => {
                              setActiveMovementField(item.id);
                              setMovementSearch(item.movement);
                            }}
                            placeholder="Movimento"
                            className="flex-1"
                          />
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-64 p-0 bg-popover border border-border" 
                          align="start"
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <Command>
                            <CommandInput 
                              placeholder="Buscar movimento..." 
                              value={movementSearch}
                              onValueChange={setMovementSearch}
                            />
                            <CommandList>
                              <CommandEmpty>Nenhum resultado</CommandEmpty>
                              <CommandGroup>
                                {movementSuggestions.map((movement) => (
                                  <CommandItem
                                    key={movement}
                                    value={movement}
                                    onSelect={() => {
                                      updateItem(item.id, { movement });
                                      setActiveMovementField(null);
                                    }}
                                  >
                                    {movement}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      {/* Observação */}
                      <Input
                        value={item.notes || ''}
                        onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                        placeholder="Obs"
                        className="w-24"
                      />

                      {/* Remover */}
                      {block.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notas do Coach */}
              <div className="space-y-1.5">
                <Label htmlFor={`notes-${block.id}`}>
                  Notas do Coach <span className="text-muted-foreground text-xs">(opcional)</span>
                </Label>
                <Textarea
                  id={`notes-${block.id}`}
                  value={block.coachNotes}
                  onChange={(e) => updateBlock({ coachNotes: e.target.value })}
                  placeholder="Comentários, objetivos, dicas de execução..."
                  rows={2}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Comentários e objetivos devem ficar aqui, não nos itens.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// FUNÇÕES AUXILIARES EXPORTADAS
// ============================================

export function createEmptyStructuredBlock(): StructuredBlock {
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: '',
    type: '',
    format: '',
    items: [createEmptyItem()],
    coachNotes: '',
  };
}

export function validateAllBlocks(blocks: StructuredBlock[]): {
  isValid: boolean;
  blockErrors: { blockIndex: number; errors: BlockValidationError[] }[];
} {
  const blockErrors = blocks
    .map((block, index) => ({
      blockIndex: index,
      errors: validateBlock(block),
    }))
    .filter(b => b.errors.length > 0);

  return {
    isValid: blockErrors.length === 0,
    blockErrors,
  };
}
