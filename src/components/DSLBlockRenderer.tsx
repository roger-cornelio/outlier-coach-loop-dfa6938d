/**
 * DSLBlockRenderer - Visual Components for DSL-parsed Workout Blocks
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * UX SPEC: EDITOR DSL VISUAL TOKENS (MVP0 OUTLIER)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VISUAL TOKENS (TIPOS) — MAPA DE ESTILO:
 * 
 * | Token      | Size     | Weight   | Color              | Background         | Icon?      |
 * |------------|----------|----------|--------------------|--------------------|------------|
 * | DAY        | text-xl  | bold     | foreground         | gradient divider   | —          |
 * | BLOCK      | text-lg  | semibold | foreground         | card               | —          |
 * | STRUCTURE  | text-xs  | bold     | primary (orange)   | primary/20         | badge      |
 * | EXERCISE   | text-sm  | normal   | foreground/80      | transparent        | — (no dash)|
 * | COMMENT    | text-xs  | normal   | muted-foreground   | muted/20           | 💬         |
 * | ERROR      | text-xs  | medium   | destructive        | destructive/10     | ⚠️         |
 * 
 * REGRAS:
 * - EXERCISE: hífen NÃO aparece visualmente, mas continua no rawText
 * - STRUCTURE: badge laranja no topo do bloco (ex.: "3 ROUNDS", "EMOM 12'")
 * - COMMENT: agrupado em sub-bloco "Comentário", cinza, fonte menor, ícone 💬
 * - ERROR: só aparece na tela de EDIÇÃO, NUNCA no Preview/Atleta
 * - DAY: header grande com divisor visual
 */

import { Badge } from '@/components/ui/badge';
import { MessageSquare, AlertTriangle, Repeat, Clock, Timer, Dumbbell } from 'lucide-react';
import { normalizeBlockTitle, normalizeRestLineForDisplay, isStructureLine, normalizeStructureLabel } from '@/utils/blockDisplayUtils';
import type { WorkoutBlock } from '@/types/outlier';
import { BLOCK_CATEGORIES } from '@/utils/categoryValidation';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURE BADGE - Badge visual para **ROUNDS**, **EMOM**, **AMRAP**, etc.
// ═══════════════════════════════════════════════════════════════════════════════

interface StructureBadgeProps {
  structure: string;
  className?: string;
}

/**
 * Determina o ícone e cor para cada tipo de estrutura
 */
function getStructureStyle(structure: string): { icon: React.ReactNode; colorClass: string } {
  const upper = structure.toUpperCase();
  
  if (upper.includes('ROUND') || upper.includes('RFT')) {
    return { icon: <Repeat className="w-3 h-3" />, colorClass: 'bg-primary/20 text-primary border-primary/30' };
  }
  if (upper.includes('EMOM') || upper.includes('E2MOM') || upper.includes('E3MOM')) {
    return { icon: <Clock className="w-3 h-3" />, colorClass: 'bg-amber-500/20 text-amber-600 border-amber-500/30' };
  }
  if (upper.includes('AMRAP')) {
    return { icon: <Timer className="w-3 h-3" />, colorClass: 'bg-green-500/20 text-green-600 border-green-500/30' };
  }
  if (upper.includes('FOR TIME') || upper.includes('TIME')) {
    return { icon: <Timer className="w-3 h-3" />, colorClass: 'bg-blue-500/20 text-blue-600 border-blue-500/30' };
  }
  if (upper.includes('SÉRIE') || upper.includes('SERIES')) {
    return { icon: <Dumbbell className="w-3 h-3" />, colorClass: 'bg-purple-500/20 text-purple-600 border-purple-500/30' };
  }
  
  // Default: primary color
  return { icon: <Repeat className="w-3 h-3" />, colorClass: 'bg-primary/20 text-primary border-primary/30' };
}

export function StructureBadge({ structure, className }: StructureBadgeProps) {
  const { icon, colorClass } = getStructureStyle(structure);
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-bold uppercase tracking-wide text-[10px] px-2.5 py-1 border gap-1.5',
        colorClass,
        className
      )}
    >
      {icon}
      {structure}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY CHIP - Chip visual para categoria do bloco
// ═══════════════════════════════════════════════════════════════════════════════

interface CategoryChipProps {
  category: string | null | undefined;
  className?: string;
}

export function CategoryChip({ category, className }: CategoryChipProps) {
  if (!category) return null;
  
  const categoryInfo = BLOCK_CATEGORIES.find(c => c.value === category);
  const label = categoryInfo?.label || category;
  
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        'text-[10px] font-medium uppercase tracking-wide px-2 py-0.5',
        className
      )}
    >
      {label}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXERCISE LINE - Linha de exercício (SEM hífen visível)
// ═══════════════════════════════════════════════════════════════════════════════

interface ExerciseLineProps {
  line: string;
  className?: string;
}

export function ExerciseLine({ line, className }: ExerciseLineProps) {
  // Remove hífen inicial se existir (visual only)
  const displayText = line.trim().replace(/^-\s*/, '');
  
  // Aplica normalização de "Descanso" → "Intervalo" para instruções intra-bloco
  const normalizedText = normalizeRestLineForDisplay(displayText);
  
  return (
    <p className={cn('text-sm text-foreground/80 leading-relaxed', className)}>
      {normalizedText}
    </p>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMENT SUB-BLOCK - Sub-bloco visual para comentários do coach
// ═══════════════════════════════════════════════════════════════════════════════

interface CommentSubBlockProps {
  comments: string[];
  className?: string;
  showLabel?: boolean;
}

export function CommentSubBlock({ comments, className, showLabel = true }: CommentSubBlockProps) {
  if (!comments || comments.length === 0) return null;
  
  return (
    <div className={cn(
      'mt-3 ml-2 pl-3 py-2 border-l-2 border-muted-foreground/30 bg-muted/20 rounded-r-md',
      className
    )}>
      <div className="flex items-start gap-2">
        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {showLabel && (
            <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wide block mb-1">
              Comentário
            </span>
          )}
          <div className="space-y-1">
            {comments.map((comment, idx) => (
              <p key={idx} className="text-xs text-muted-foreground italic leading-relaxed">
                {comment}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION ALERT - Alerta de erro (SÓ NA EDIÇÃO)
// ═══════════════════════════════════════════════════════════════════════════════

interface ValidationAlertProps {
  message: string;
  type?: 'error' | 'warning';
  className?: string;
}

export function ValidationAlert({ message, type = 'error', className }: ValidationAlertProps) {
  const isError = type === 'error';
  
  return (
    <div className={cn(
      'flex items-start gap-2 p-2 rounded-md text-xs',
      isError ? 'bg-destructive/10 border border-destructive/30' : 'bg-amber-500/10 border border-amber-500/30',
      className
    )}>
      <AlertTriangle className={cn(
        'w-3.5 h-3.5 flex-shrink-0 mt-0.5',
        isError ? 'text-destructive' : 'text-amber-500'
      )} />
      <span className={isError ? 'text-destructive' : 'text-amber-600'}>
        {message}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK HEADER - Header do bloco com título e categoria
// ═══════════════════════════════════════════════════════════════════════════════

interface BlockHeaderProps {
  title: string;
  category?: string | null;
  isMainWod?: boolean;
  blockIndex: number;
  className?: string;
}

export function BlockHeader({ title, category, isMainWod, blockIndex, className }: BlockHeaderProps) {
  // Normaliza título (remove "BLOCO:" se existir)
  const displayTitle = normalizeBlockTitle(title) || `Bloco ${blockIndex + 1}`;
  
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <h4 className="font-semibold text-lg text-foreground">
        {displayTitle}
      </h4>
      <CategoryChip category={category} />
      {isMainWod && (
        <Badge className="bg-primary text-primary-foreground text-[10px] font-bold uppercase px-2 py-0.5">
          WOD Principal
        </Badge>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAY HEADER - Header do dia com divisor visual
// ═══════════════════════════════════════════════════════════════════════════════

interface DayHeaderProps {
  dayName: string;
  blocksCount: number;
  isRestDay?: boolean;
  className?: string;
}

export function DayHeader({ dayName, blocksCount, isRestDay, className }: DayHeaderProps) {
  return (
    <div className={cn(
      'flex items-center justify-between py-4 border-b-2 border-primary/30 mb-4',
      className
    )}>
      <div className="flex items-center gap-3">
        <span className="font-bold text-xl uppercase tracking-wide text-foreground">
          {dayName}
        </span>
        {isRestDay && (
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 border-blue-500/30 px-3 py-1">
            🌙 DESCANSO
          </Badge>
        )}
      </div>
      {!isRestDay && (
        <span className="text-sm text-muted-foreground">
          {blocksCount} bloco{blocksCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL BLOCK RENDERER - Renderizador completo de bloco para Preview/Atleta
// ═══════════════════════════════════════════════════════════════════════════════

interface FullBlockRendererProps {
  block: WorkoutBlock;
  blockIndex: number;
  exerciseLines: string[];
  coachNotes: string[];
  structureDescription?: string | null;
  isMainWod?: boolean;
  showComments?: boolean;
  className?: string;
}

export function FullBlockRenderer({
  block,
  blockIndex,
  exerciseLines,
  coachNotes,
  structureDescription,
  isMainWod,
  showComments = true,
  className
}: FullBlockRendererProps) {
  return (
    <div className={cn(
      'p-4 rounded-xl border-2',
      isMainWod 
        ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' 
        : 'border-border bg-card',
      className
    )}>
      {/* Header */}
      <BlockHeader 
        title={block.title || ''} 
        category={block.type} 
        isMainWod={isMainWod}
        blockIndex={blockIndex}
        className="mb-3"
      />
      
      {/* Structure Badge */}
      {structureDescription && (
        <div className="mb-3">
          <StructureBadge structure={structureDescription} />
        </div>
      )}
      
      {/* Exercise Lines */}
      <div className="space-y-1">
        {exerciseLines.length > 0 ? (
          exerciseLines.map((line, idx) => (
            <ExerciseLine key={idx} line={line} />
          ))
        ) : (
          <p className="text-xs text-muted-foreground/50 italic">
            Sem exercícios definidos.
          </p>
        )}
      </div>
      
      {/* Coach Notes */}
      {showComments && <CommentSubBlock comments={coachNotes} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MICROCOPY - Textos padrão da UI
// ═══════════════════════════════════════════════════════════════════════════════

export const DSL_MICROCOPY = {
  PREVIEW_READONLY: 'Somente leitura',
  ERRORS_EDIT_ONLY: 'Erros aparecem apenas na edição',
  AUTOFORMAT_HINT: 'Autoformatar adiciona hífen em exercícios dentro de blocos estruturados',
  COMMENT_HINT: 'Comentários devem estar entre parênteses ( )',
  BLOCK_NEEDS_FIX: 'Este bloco precisa de ajuste na edição.',
  NO_WORKOUT: 'Sem treino disponível.',
};
