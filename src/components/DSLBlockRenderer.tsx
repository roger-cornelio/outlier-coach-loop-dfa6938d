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
import { MessageSquare, AlertTriangle, Repeat, Clock, Timer, Dumbbell, ListOrdered, Activity, Weight } from 'lucide-react';
import { normalizeBlockTitle, normalizeRestLineForDisplay, isStructureLine, normalizeStructureLabel, STRUCT_LINE_PREFIX, INTENSITY_LINE_PREFIX } from '@/utils/blockDisplayUtils';
import type { WorkoutBlock } from '@/types/outlier';
import { BLOCK_CATEGORIES } from '@/utils/categoryValidation';
import { cn } from '@/lib/utils';
import { extractLineSemantics, SEMANTIC_COLORS, type SemanticSegment } from '@/utils/lineSemanticExtractor';

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
    return { icon: <Repeat className="w-3.5 h-3.5" />, colorClass: 'bg-primary/25 text-primary border-primary/40' };
  }
  if (upper.includes('EMOM') || upper.includes('E2MOM') || upper.includes('E3MOM')) {
    return { icon: <Clock className="w-3.5 h-3.5" />, colorClass: 'bg-amber-500/25 text-amber-300 border-amber-500/40' };
  }
  if (upper.includes('AMRAP')) {
    return { icon: <Timer className="w-3.5 h-3.5" />, colorClass: 'bg-green-500/25 text-green-300 border-green-500/40' };
  }
  if (upper.includes('FOR TIME') || upper.includes('TIME')) {
    return { icon: <Timer className="w-3.5 h-3.5" />, colorClass: 'bg-blue-500/25 text-blue-300 border-blue-500/40' };
  }
  if (upper.includes('SÉRIE') || upper.includes('SERIES')) {
    return { icon: <Dumbbell className="w-3.5 h-3.5" />, colorClass: 'bg-purple-500/25 text-purple-300 border-purple-500/40' };
  }
  if (/^\d+\s*·/.test(structure.trim())) {
    return { icon: <ListOrdered className="w-3.5 h-3.5" />, colorClass: 'bg-slate-700/30 text-slate-200 border-slate-500/40' };
  }
  
  return { icon: <Repeat className="w-3.5 h-3.5" />, colorClass: 'bg-primary/25 text-primary border-primary/40' };
}

export function StructureBadge({ structure, className }: StructureBadgeProps) {
  const { icon, colorClass } = getStructureStyle(structure);
  
  // Rep scheme special rendering: "40 · 30 · 20 · 10"
  const isRepScheme = /^\d+\s*·/.test(structure.trim());
  
  if (isRepScheme) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          'font-bold uppercase tracking-wide text-xs px-3 py-1.5 border gap-1.5',
          colorClass,
          className
        )}
      >
        {icon}
        {structure}
      </Badge>
    );
  }
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-bold uppercase tracking-wide text-xs px-3 py-1.5 border gap-1.5',
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
// INTENSITY BADGE - Badge visual vermelho para indicadores de intensidade
// ═══════════════════════════════════════════════════════════════════════════════

interface IntensityBadgeProps {
  intensity: string;
  className?: string;
}

export function IntensityBadge({ intensity, className }: IntensityBadgeProps) {
  // Remove parênteses externas se existirem: "(forte)" → "forte"
  const displayText = intensity.replace(/^\(/, '').replace(/\)$/, '').trim();
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-bold uppercase tracking-wide text-xs px-3 py-1.5 border gap-1.5',
        'bg-red-600/25 text-red-400 border-red-600/40',
        className
      )}
    >
      <Activity className="w-3 h-3" />
      {displayText}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY CHIP - Chip visual colorido por categoria
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cores por categoria para identidade visual distinta
 */
const CATEGORY_COLORS: Record<string, string> = {
  aquecimento: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  forca: 'bg-red-500/20 text-red-600 border-red-500/30',
  metcon: 'bg-primary/20 text-primary border-primary/30',
  especifico: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  corrida: 'bg-green-500/20 text-green-600 border-green-500/30',
  acessorio: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  core: 'bg-indigo-500/20 text-indigo-600 border-indigo-500/30',
  conditioning: 'bg-primary/20 text-primary border-primary/30',
};

interface CategoryChipProps {
  category: string | null | undefined;
  className?: string;
}

export function CategoryChip({ category, className }: CategoryChipProps) {
  if (!category) return null;
  
  const categoryInfo = BLOCK_CATEGORIES.find(c => c.value === category);
  const label = categoryInfo?.label || category;
  const emoji = categoryInfo?.emoji || '';
  const colorClass = CATEGORY_COLORS[category] || 'bg-muted text-muted-foreground border-border';
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-xs font-semibold uppercase tracking-wide px-2.5 py-1 border gap-1.5',
        colorClass,
        className
      )}
    >
      {emoji && <span>{emoji}</span>}
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
// SEMANTIC EXERCISE LINE - Linha com diferenciação visual por tipo semântico
// ═══════════════════════════════════════════════════════════════════════════════

interface SemanticExerciseLineProps {
  line: string;
  className?: string;
}

/**
 * Renderiza uma linha de exercício com cada segmento colorido por tipo:
 * movimento (normal), duração (azul), carga (vermelho), etc.
 */
export function SemanticExerciseLine({ line, className }: SemanticExerciseLineProps) {
  const displayText = line.trim().replace(/^-\s*/, '');
  const normalizedText = normalizeRestLineForDisplay(displayText);
  const segments = extractLineSemantics(normalizedText);
  
  // Se só tem 1 segmento do tipo movement, renderiza simples
  if (segments.length <= 1 && segments[0]?.type === 'movement') {
    return (
      <p className={cn('text-sm text-foreground/80 leading-relaxed', className)}>
        {normalizedText}
      </p>
    );
  }

  return (
    <p className={cn('text-sm leading-relaxed flex flex-wrap items-center gap-x-1 gap-y-0.5', className)}>
      {segments.map((seg, idx) => {
        const colors = SEMANTIC_COLORS[seg.type];
        
        if (seg.type === 'movement') {
          return (
            <span key={idx} className="text-foreground/80">
              {seg.text}
            </span>
          );
        }
        
        if (seg.type === 'parenthetical') {
          return (
            <span key={idx} className="text-muted-foreground italic text-xs">
              {seg.text}
            </span>
          );
        }

        // HYROX load badge — orange with weight icon
        if (seg.type === 'hyrox_load') {
          const colors = SEMANTIC_COLORS[seg.type];
          return (
            <span
              key={idx}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wide',
                colors.bg, colors.text, colors.border
              )}
              title={colors.label}
            >
              <Weight className="w-3 h-3" />
              {seg.text.replace(/[()]/g, '')}
            </span>
          );
        }

        // Metric segments get a colored inline badge
        return (
          <span 
            key={idx} 
            className={cn(
              'inline-flex items-center px-1.5 py-0 rounded text-xs font-medium border',
              colors.bg, colors.text, colors.border
            )}
            title={colors.label}
          >
            {seg.text}
          </span>
        );
      })}
    </p>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMENT SUB-BLOCK - Container visual distinto para comentários do coach
// ═══════════════════════════════════════════════════════════════════════════════

interface CommentSubBlockProps {
  comments: string[];
  className?: string;
  showLabel?: boolean;
}

export function CommentSubBlock({ comments, className, showLabel = true }: CommentSubBlockProps) {
  // REGRA: Não renderiza container se não há comentários (visual limpo)
  if (!comments || comments.length === 0) return null;
  
  return (
    <div className={cn(
      'mt-3 pl-3 py-2 border-l-2 border-primary/40 bg-muted/20 rounded-r-lg',
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-md bg-primary/10 flex-shrink-0">
          <MessageSquare className="w-4 h-4 text-primary/70" />
        </div>
        <div className="flex-1 min-w-0">
          {showLabel && (
            <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide block mb-2">
              Comentário do Coach
            </span>
          )}
          <div className="space-y-1.5">
            {comments.map((comment, idx) => (
              <p key={idx} className="text-sm text-muted-foreground italic leading-relaxed">
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
// BLOCK HEADER - Header do bloco com título destacado e categoria
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
      <h4 className="font-display text-base font-bold tracking-tight text-foreground uppercase">
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
      'p-3 rounded-lg border',
      isMainWod 
        ? 'border-primary/40 bg-primary/5' 
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
      
      {/* Exercise Lines (may contain __STRUCT: inline badges) */}
      <div className="space-y-1">
        {exerciseLines.length > 0 ? (
          exerciseLines.map((line, idx) => {
            // Detect inline structure badges (__STRUCT:2 ROUNDS)
            if (line.startsWith(STRUCT_LINE_PREFIX)) {
              const structLabel = line.slice(STRUCT_LINE_PREFIX.length);
              return (
              <div key={idx} className="pt-2 pb-0.5">
                  <StructureBadge structure={structLabel} />
                </div>
              );
            }
            // Detect intensity badges (__INTENSITY:PSE 8)
            if (line.startsWith(INTENSITY_LINE_PREFIX)) {
              const intensityLabel = line.slice(INTENSITY_LINE_PREFIX.length);
              return (
              <div key={idx} className="pt-1.5 pb-0.5">
                  <IntensityBadge intensity={intensityLabel} />
                </div>
              );
            }
            return <ExerciseLine key={idx} line={line} />;
          })
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
