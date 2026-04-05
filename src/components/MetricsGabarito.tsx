/**
 * MetricsGabarito — Barra de badges semânticos editáveis por linha
 * 
 * Aparece SOMENTE no modo edição do coach.
 * Cada badge é clicável para editar tipo/valor ou excluir.
 * "+ Métrica" permite adicionar métrica que o parser não pegou.
 */

import { useState, useMemo } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { extractLineSemantics, SEMANTIC_COLORS, type SemanticSegment, type SemanticType } from '@/utils/lineSemanticExtractor';
import type { SemanticOverride, SemanticOverrideType } from '@/types/outlier';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MetricsGabaritoProps {
  line: string;
  overrides?: SemanticOverride[];
  onChange: (overrides: SemanticOverride[]) => void;
}

const EDITABLE_TYPES: { value: SemanticOverrideType; label: string }[] = [
  { value: 'reps', label: 'Repetições' },
  { value: 'load', label: 'Carga' },
  { value: 'duration', label: 'Duração' },
  { value: 'intensity', label: 'Intensidade' },
  { value: 'cadence', label: 'Cadência' },
  { value: 'distance', label: 'Distância' },
];

interface MergedSegment {
  index: number;
  type: SemanticType;
  text: string;
  isOverridden: boolean;
  isAdded: boolean;
  isRemoved: boolean;
}

function mergeSegmentsWithOverrides(
  segments: SemanticSegment[],
  overrides: SemanticOverride[],
): MergedSegment[] {
  const overrideMap = new Map<number, SemanticOverride>();
  const addedOverrides: SemanticOverride[] = [];

  for (const o of overrides) {
    if (o.isAdded) {
      addedOverrides.push(o);
    } else {
      overrideMap.set(o.index, o);
    }
  }

  // Only non-movement segments
  const metricSegments = segments
    .map((seg, i) => ({ ...seg, originalIndex: i }))
    .filter(s => s.type !== 'movement');

  const merged: MergedSegment[] = metricSegments.map((seg, metricIdx) => {
    const override = overrideMap.get(metricIdx);
    if (override?.isRemoved) {
      return { index: metricIdx, type: seg.type, text: seg.text, isOverridden: false, isAdded: false, isRemoved: true };
    }
    if (override) {
      return { index: metricIdx, type: override.type as SemanticType, text: override.text, isOverridden: true, isAdded: false, isRemoved: false };
    }
    return { index: metricIdx, type: seg.type, text: seg.text, isOverridden: false, isAdded: false, isRemoved: false };
  });

  // Add manually added overrides
  for (const added of addedOverrides) {
    merged.push({
      index: added.index,
      type: added.type as SemanticType,
      text: added.text,
      isOverridden: false,
      isAdded: true,
      isRemoved: false,
    });
  }

  return merged;
}

function EditPopover({
  segment,
  onSave,
  onRemove,
}: {
  segment: MergedSegment;
  onSave: (type: SemanticOverrideType, text: string) => void;
  onRemove: () => void;
}) {
  const [editType, setEditType] = useState<SemanticOverrideType>(segment.type as SemanticOverrideType);
  const [editText, setEditText] = useState(segment.text);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="appearance-none border-0 bg-transparent p-0 cursor-pointer">
          <Badge
            variant="outline"
            className={cn(
              'text-[11px] px-2 py-0.5 font-medium transition-colors',
              segment.isRemoved
                ? 'opacity-30 line-through'
                : SEMANTIC_COLORS[segment.type]
                  ? `${SEMANTIC_COLORS[segment.type].bg} ${SEMANTIC_COLORS[segment.type].text} ${SEMANTIC_COLORS[segment.type].border}`
                  : '',
              segment.isOverridden && 'ring-1 ring-primary/40',
              segment.isAdded && 'ring-1 ring-emerald-500/40',
            )}
          >
            {segment.text}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-56 p-3 space-y-2">
        <Select value={editType} onValueChange={(v) => setEditType(v as SemanticOverrideType)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EDITABLE_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="h-8 text-xs"
          placeholder="Valor"
        />
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs flex-1"
            onClick={() => {
              onSave(editType, editText);
              setOpen(false);
            }}
          >
            <Check className="w-3 h-3 mr-1" /> Salvar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs px-2"
            onClick={() => {
              onRemove();
              setOpen(false);
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function MetricsGabarito({ line, overrides = [], onChange }: MetricsGabaritoProps) {
  const segments = useMemo(() => extractLineSemantics(line), [line]);
  const merged = useMemo(() => mergeSegmentsWithOverrides(segments, overrides), [segments, overrides]);
  const [addOpen, setAddOpen] = useState(false);
  const [newType, setNewType] = useState<SemanticOverrideType>('duration');
  const [newText, setNewText] = useState('');

  // Only show metrics (skip movement)
  const visibleMetrics = merged.filter(s => s.type !== 'movement' && s.type !== 'parenthetical');

  if (visibleMetrics.length === 0 && overrides.length === 0) return null;

  const handleSave = (segIndex: number, isAdded: boolean, type: SemanticOverrideType, text: string) => {
    const updated = overrides.filter(o => !(o.index === segIndex && o.isAdded === isAdded));
    updated.push({ index: segIndex, type, text, isAdded });
    onChange(updated);
  };

  const handleRemove = (segIndex: number, isAdded: boolean) => {
    if (isAdded) {
      onChange(overrides.filter(o => !(o.index === segIndex && o.isAdded === true)));
    } else {
      const updated = overrides.filter(o => o.index !== segIndex || o.isAdded);
      updated.push({ index: segIndex, type: 'duration', text: '', isRemoved: true });
      onChange(updated);
    }
  };

  const handleAdd = () => {
    if (!newText.trim()) return;
    const maxIdx = Math.max(999, ...overrides.map(o => o.index));
    onChange([...overrides, { index: maxIdx + 1, type: newType, text: newText.trim(), isAdded: true }]);
    setNewText('');
    setAddOpen(false);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap pl-2 py-0.5">
      {visibleMetrics.map((seg) => (
        <EditPopover
          key={`${seg.index}-${seg.isAdded ? 'a' : 'o'}`}
          segment={seg}
          onSave={(type, text) => handleSave(seg.index, seg.isAdded, type, text)}
          onRemove={() => handleRemove(seg.index, seg.isAdded)}
        />
      ))}

      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-1.5 py-0.5 rounded border border-dashed border-muted-foreground/30 hover:border-muted-foreground/60"
          >
            <Plus className="w-3 h-3" /> Métrica
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-52 p-3 space-y-2">
          <Select value={newType} onValueChange={(v) => setNewType(v as SemanticOverrideType)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDITABLE_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="h-8 text-xs"
            placeholder="Ex: Z2, 5min, 80kg"
          />
          <Button size="sm" className="h-7 text-xs w-full" onClick={handleAdd} disabled={!newText.trim()}>
            <Plus className="w-3 h-3 mr-1" /> Adicionar
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}