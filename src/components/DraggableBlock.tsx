/**
 * DraggableBlock - Wrapper para blocos arrastáveis no editor do coach
 * Usa @dnd-kit/sortable para reordenar blocos dentro de um dia
 * e mover entre dias/sessões diferentes.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface DraggableBlockProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function DraggableBlock({ id, children, disabled }: DraggableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/drag">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={`absolute -left-1 top-1/2 -translate-y-1/2 z-10 p-1 rounded cursor-grab active:cursor-grabbing
          opacity-0 group-hover/drag:opacity-100 transition-opacity
          ${disabled ? 'hidden' : ''}
          bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground`}
        title="Arrastar bloco"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      {children}
    </div>
  );
}

/**
 * Parseia o ID composto de um bloco arrastável.
 * Formato: "day-{dayIndex}-block-{blockIndex}"
 */
export function parseDraggableId(id: string): { dayIndex: number; blockIndex: number } | null {
  const match = id.match(/^day-(\d+)-block-(\d+)$/);
  if (!match) return null;
  return {
    dayIndex: parseInt(match[1], 10),
    blockIndex: parseInt(match[2], 10),
  };
}

/**
 * Gera o ID composto para um bloco arrastável.
 */
export function makeDraggableId(dayIndex: number, blockIndex: number): string {
  return `day-${dayIndex}-block-${blockIndex}`;
}
