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

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, GripVertical, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WorkoutBlock } from '@/types/outlier';

// ============================================
// TIPOS E CONSTANTES
// ============================================

export const BLOCK_TYPES = [
  { value: 'aquecimento', label: 'Aquecimento', emoji: '🔥' },
  { value: 'forca', label: 'Força', emoji: '💪' },
  { value: 'conditioning', label: 'Conditioning', emoji: '⚡' },
  { value: 'especifico', label: 'Específico (HYROX)', emoji: '🛷' },
  { value: 'core', label: 'Core', emoji: '🎯' },
  { value: 'corrida', label: 'Corrida', emoji: '🏃' },
  { value: 'bike', label: 'Bike', emoji: '🚴' },
  { value: 'remo', label: 'Remo', emoji: '🚣' },
] as const;

export const BLOCK_FORMATS = [
  { value: 'for_time', label: 'For Time' },
  { value: 'amrap', label: 'AMRAP' },
  { value: 'emom', label: 'EMOM' },
  { value: 'rounds', label: 'Rounds' },
  { value: 'intervalos', label: 'Intervalos' },
  { value: 'tecnica', label: 'Técnica' },
  { value: 'outro', label: 'Outro' },
] as const;

export const UNITS = [
  { value: 'reps', label: 'reps' },
  { value: 'm', label: 'm' },
  { value: 'km', label: 'km' },
  { value: 'cal', label: 'cal' },
  { value: 'min', label: 'min' },
  { value: 'sec', label: 'sec' },
  { value: 'rounds', label: 'rounds' },
] as const;

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
  // Gera o content a partir dos items estruturados
  const itemsContent = structured.items
    .filter(item => item.quantity !== '' && item.movement.trim())
    .map(item => {
      const base = `${item.quantity} ${item.unit} ${item.movement}`;
      return item.notes ? `${base} (${item.notes})` : base;
    })
    .join('\n');

  // Adiciona notas do coach se existir
  const fullContent = structured.coachNotes.trim()
    ? `${itemsContent}\n\n📝 ${structured.coachNotes.trim()}`
    : itemsContent;

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
  // Parse do content para extrair items
  const lines = block.content.split('\n').filter(l => l.trim());
  const items: WorkoutItem[] = [];
  let coachNotes = '';

  for (const line of lines) {
    // Detecta notas do coach
    if (line.startsWith('📝') || line.toLowerCase().includes('nota:')) {
      coachNotes = line.replace(/^📝\s*/, '').replace(/^nota:\s*/i, '');
      continue;
    }

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
    format: detectFormat(block.content),
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
}

export function StructuredBlockEditor({
  block,
  onChange,
  onRemove,
  showValidation = false,
  isExpanded = true,
  onToggleExpand,
}: StructuredBlockEditorProps) {
  const errors = showValidation ? validateBlock(block) : [];
  const hasError = (field: string) => errors.some(e => e.field === field);

  const updateBlock = useCallback((updates: Partial<StructuredBlock>) => {
    onChange({ ...block, ...updates });
  }, [block, onChange]);

  const addItem = useCallback(() => {
    updateBlock({
      items: [...block.items, createEmptyItem()],
    });
  }, [block.items, updateBlock]);

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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Itens do Treino <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className="h-7 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar
                  </Button>
                </div>

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

                      {/* Movimento */}
                      <Input
                        value={item.movement}
                        onChange={(e) => updateItem(item.id, { movement: e.target.value })}
                        placeholder="Movimento (ex: Pull-ups)"
                        className="flex-1"
                      />

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
