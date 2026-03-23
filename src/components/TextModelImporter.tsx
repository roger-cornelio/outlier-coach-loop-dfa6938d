/**
 * TextModelImporter - Importador de treino via texto livre
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * FLUXO DE 2 TELAS MVP0 — EDIÇÃO → PREVIEW → PROGRAMAÇÕES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * TELA 1 - EDIÇÃO (mode='edit'):
 *   - Área de texto para colar treino
 *   - Seleção de semana OBRIGATÓRIA
 *   - Edição de blocos (categoria, título, WOD principal)
 *   - Botão único: "Salvar e ir para preview"
 * 
 * TELA 2 - PREVIEW (mode='preview'):
 *   - 100% READ-ONLY
 *   - Visualização exata do que atleta verá
 *   - Botões: "Voltar para edição" e "Salvar e ir para Programações"
 * 
 * TELA 3 - PROGRAMAÇÕES:
 *   - Aba separada (CoachProgramsTab)
 *   - Publicar/Excluir/Arquivar workouts salvos
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { CoachWorkout } from '@/hooks/useCoachWorkouts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, AlertCircle, CheckCircle, Eye, Trash2, 
  AlertTriangle, Star, Loader2, Moon, MoreVertical, Pencil, 
  Puzzle, Copy, ArrowLeft, ArrowRight, Save, MessageSquare,
  Wand2, Send, Clock, Flame, ChevronDown, ChevronUp
} from 'lucide-react';
import { useExerciseSuggestionSubmit } from '@/hooks/useExerciseSuggestions';
import { BlockEditorModal } from './BlockEditorModal';
import { useToast } from '@/hooks/use-toast';
import { WeekPeriodSelector, type WeekPeriod } from './WeekPeriodSelector';
import { autoFormatDSL, previewAutoFormatChanges } from '@/utils/dslAutoFormat';
import { StructureBadge, CommentSubBlock, CategoryChip, ExerciseLine } from './DSLBlockRenderer';
import { estimateWorkout, formatEstimatedTime, formatEstimatedKcal } from '@/utils/workoutEstimation';
import { computeBlockMetrics } from '@/utils/computeBlockKcalFromParsed';
import { getBlockTimeMeta } from '@/utils/timeValidation';
import { getBlockDisplayTitle, STRUCT_LINE_PREFIX } from '@/utils/blockDisplayUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  getDayName,
  isInvalidBlockTitle,
  normalizeText,
  validateDayAnchors,
  validateCoachInput,
  type ParseResult 
} from '@/utils/structuredTextParser';
import { normalizeRestLineForDisplay, normalizeBlockTitle, normalizeDayLabel, getBlockDisplayDataFromParsed } from '@/utils/blockDisplayUtils';
import type { DayOfWeek, DayWorkout } from '@/types/outlier';
import { BLOCK_CATEGORIES } from '@/utils/categoryValidation';
import { StructuredErrorDisplay, RecommendedModelBlock } from './StructuredErrorDisplay';
import { useCoachDraft, type DraftMode } from '@/hooks/useCoachDraft';
import { calculateParsingCoverage, type CoverageReport, type UnmatchedLine, type UnmatchedCategory, detectExerciseTypos, type ExerciseTypoWarning } from '@/utils/parsingCoverage';
import { calculateEngineCoverage } from '@/utils/engineCoverage';
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface TextModelImporterProps {
  onSaveAndGoToPrograms?: (workouts: DayWorkout[], title: string, weekStart: string | null) => Promise<boolean>;
  isSaving?: boolean;
  initialWorkout?: CoachWorkout | null;
  onClearInitialWorkout?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BIOMETRICS PADRÃO PARA PREVIEW DO COACH (mesmo do CoachProgramsTab)
// ═══════════════════════════════════════════════════════════════════════════════
const COACH_PREVIEW_ATHLETE_CONFIG = {
  peso: 75,
  sexo: 'masculino' as const,
  idade: 30,
  altura: 170,
};

const previewBlockTypeColors: Record<string, string> = {
  aquecimento: 'border-l-amber-500',
  conditioning: 'border-l-primary',
  forca: 'border-l-red-500',
  especifico: 'border-l-purple-500',
  core: 'border-l-blue-500',
  corrida: 'border-l-green-500',
  notas: 'border-l-muted-foreground',
};

// ═══════════════════════════════════════════════════════════════════════════════
// PreviewDayCard — Card colapsável por dia com UI idêntica à tela do atleta
// ═══════════════════════════════════════════════════════════════════════════════

interface PreviewDayCardProps {
  dayWorkout: DayWorkout;
  dayName: string;
  isRestDay: boolean;
}

function PreviewDayCard({ dayWorkout, dayName, isRestDay }: PreviewDayCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCoverageModal, setShowCoverageModal] = useState(false);

  const workoutEst = useMemo(() => {
    if (isRestDay) return null;
    return estimateWorkout(dayWorkout, COACH_PREVIEW_ATHLETE_CONFIG as any, 'pro');
  }, [dayWorkout, isRestDay]);

  const blockMetrics = useMemo(() => {
    if (isRestDay || !dayWorkout.blocks) return { perBlock: [], totalTime: 0, totalCalories: 0 };

    let sumMinutes = 0;
    let sumKcal = 0;
    const perBlock: Array<{ kcal: number; durationSec: number; visible: boolean; showStats: boolean; confidencePercent: number }> = [];

    dayWorkout.blocks.forEach((block, index) => {
      const displayData = getBlockDisplayDataFromParsed(block);
      if (!displayData.hasContent) {
        perBlock.push({ kcal: 0, durationSec: 0, visible: false, showStats: false, confidencePercent: 0 });
        return;
      }
      if (block.type === 'notas') {
        perBlock.push({ kcal: 0, durationSec: 0, visible: true, showStats: false, confidencePercent: 0 });
        return;
      }

      const hasParsedData = block.parsedExercises && block.parsedExercises.length > 0 && block.parseStatus === 'completed';
      let kcal = 0;
      let dur = 0;
      let confidencePercent = 0;

      if (hasParsedData) {
        const metrics = computeBlockMetrics(
          block.parsedExercises!,
          { pesoKg: 75, sexo: 'masculino' },
          block.content,
          block.title
        );
        kcal = metrics.estimatedKcal || 0;
        dur = metrics.estimatedDurationSec || 0;
        confidencePercent = (dur > 0 && kcal > 0) ? 90 : 60;
      } else {
        // Fallback: use workoutEstimation with MET-based kcal
        const blockEst = workoutEst?.blocks[index];
        if (blockEst) {
          dur = (blockEst.estimatedMinutes || 0) * 60;
          kcal = blockEst.estimatedKcal || 0;
          confidencePercent = blockEst.confidencePercent || 45;
        } else {
          const timeMeta = getBlockTimeMeta(block);
          dur = timeMeta.durationSecUsed || 0;
          confidencePercent = 45;
        }
      }

      const roundedMinutes = Math.round(dur / 60);
      const roundedKcal = Math.round(kcal);
      perBlock.push({ kcal: roundedKcal, durationSec: dur, visible: true, showStats: roundedMinutes > 0 || roundedKcal > 0, confidencePercent });
      sumMinutes += roundedMinutes;
      sumKcal += roundedKcal;
    });

    return { perBlock, totalTime: sumMinutes, totalCalories: sumKcal };
  }, [dayWorkout, workoutEst, isRestDay]);

  const { totalTime, totalCalories } = blockMetrics;

  // Engine coverage per day
  const dayCoverage = useMemo(() => {
    if (isRestDay || !dayWorkout.blocks || dayWorkout.blocks.length === 0) return null;
    return calculateEngineCoverage(blockMetrics.perBlock, dayWorkout.blocks as any);
  }, [isRestDay, dayWorkout.blocks, blockMetrics.perBlock]);

  const coverageBadgeClass = dayCoverage
    ? dayCoverage.successRate === 100
      ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
      : dayCoverage.successRate >= 50
        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20'
        : 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
    : '';

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Day Header (collapsible trigger) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between bg-secondary/30 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-bold text-sm uppercase">
            {dayName}
          </Badge>
          {isRestDay ? (
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-600">
              <Moon className="w-3 h-3 mr-1" />
              Descanso
            </Badge>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
                {dayWorkout.blocks?.length || 0} bloco(s)
              </span>
              {totalTime > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium text-foreground">~{totalTime}min</span>
                </div>
              )}
              {totalCalories > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-orange-500 font-medium">~{totalCalories} kcal</span>
                </div>
              )}
              {dayCoverage && dayCoverage.totalBlocks > 0 && (
                <Badge 
                  variant="outline" 
                  className={`text-xs px-2 py-0.5 cursor-pointer transition-colors ${coverageBadgeClass}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCoverageModal(true);
                  }}
                >
                  ⚡ {dayCoverage.calculatedBlocks}/{dayCoverage.totalBlocks}
                </Badge>
              )}
            </>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Modal de detalhes da precisão do motor — por dia */}
      {dayCoverage && dayCoverage.totalBlocks > 0 && (
        <Dialog open={showCoverageModal} onOpenChange={setShowCoverageModal}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Precisão do Motor — {dayName}</DialogTitle>
              <DialogDescription>
                {dayCoverage.calculatedBlocks} de {dayCoverage.totalBlocks} blocos com tempo e calorias ({dayCoverage.successRate}%)
              </DialogDescription>
            </DialogHeader>

            {dayCoverage.successRate === 100 ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle className="h-10 w-10 text-primary" />
                <p className="text-sm text-center text-foreground/80">
                  Todos os blocos calculados com sucesso!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayCoverage.blocks.map((block, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 text-sm px-3 py-2.5 rounded-md border ${
                      block.success
                        ? 'bg-primary/5 border-primary/10'
                        : 'bg-amber-500/5 border-amber-500/10'
                    }`}
                  >
                    {block.success ? (
                      <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{block.title}</p>
                      {block.success ? (
                        <p className="text-xs text-muted-foreground">
                          {Math.round(block.durationSec / 60)} min · {block.kcal} kcal
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {block.reasonLabel}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                <div className="rounded-md border border-muted bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    💡 Use padrões como <strong>EMOM</strong>, <strong>AMRAP</strong>, <strong>FOR TIME</strong> ou 
                    adicione repetições e séries explícitas.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCoverageModal(false)}>
                Entendi
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Expanded Content — identical to athlete WeeklyTrainingView */}
      <AnimatePresence>
        {isExpanded && !isRestDay && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 bg-background">
              {dayWorkout.blocks?.map((block, idx) => {
                const displayData = getBlockDisplayDataFromParsed(block);
                if (!displayData.hasContent) return null;

                const blockMet = blockMetrics.perBlock[idx] || { kcal: 0, durationSec: 0, showStats: false };
                const estimatedKcal = blockMet.kcal;
                const estimatedMinutes = Math.round(blockMet.durationSec / 60);
                const hasParsedData = block.parsedExercises && block.parsedExercises.length > 0 && block.parseStatus === 'completed';
                const isEstimated = !hasParsedData;
                const isMainWod = block.isMainWod;

                const { exerciseLines, coachNotes: commentLines, structureDescription } = displayData;

                return (
                  <div
                    key={block.id || idx}
                    className={`
                      p-5 rounded-xl border-l-4 bg-card border border-border
                      ${previewBlockTypeColors[block.type] || 'border-l-border'}
                      ${isMainWod ? 'ring-1 ring-primary/30' : ''}
                    `}
                  >
                    {/* Block Header */}
                    <div className="mb-4">
                      <h3 className="font-display text-xl font-bold tracking-tight uppercase">
                        {getBlockDisplayTitle(block, idx)}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap mt-1.5">
                        <CategoryChip category={block.type} />
                        {isMainWod && (
                          <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wide uppercase">
                            WOD Principal
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Structure Badge */}
                    {structureDescription && (
                      <div className="mb-4">
                        <StructureBadge structure={structureDescription} />
                      </div>
                    )}

                    {/* Exercise Lines */}
                    <div className="space-y-2">
                      {exerciseLines.length > 0 ? (
                        exerciseLines.map((line, lineIdx) => {
                          if (line.startsWith(STRUCT_LINE_PREFIX)) {
                            return (
                              <div key={lineIdx} className="pt-3 pb-1">
                                <StructureBadge structure={line.slice(STRUCT_LINE_PREFIX.length)} />
                              </div>
                            );
                          }
                          return <ExerciseLine key={lineIdx} line={line} className="text-foreground/80" />;
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground/30 italic py-1">—</p>
                      )}
                    </div>

                    {/* Coach Notes */}
                    <CommentSubBlock comments={commentLines} />

                    {/* Block Stats with Precision Badge */}
                    {block.type !== 'notas' && blockMet.showStats && (
                      <div className="flex items-center gap-4 pt-3 border-t border-border/50 mt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{isEstimated ? '~' : ''}</span>
                          <span className="font-medium text-foreground">
                            {formatEstimatedTime(estimatedMinutes)}
                          </span>
                        </div>
                        {estimatedKcal > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-orange-500 font-medium">
                              {formatEstimatedKcal(estimatedKcal)}
                            </span>
                          </div>
                        )}
                        {/* Precision Badge */}
                        {blockMet.confidencePercent > 0 && (
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-1.5 py-0 h-5 font-medium ${
                              blockMet.confidencePercent >= 70 
                                ? 'bg-primary/10 text-primary border-primary/20' 
                                : blockMet.confidencePercent >= 50 
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                                  : 'bg-destructive/10 text-destructive border-destructive/20'
                            }`}
                          >
                            ⚡ ~{blockMet.confidencePercent}%
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const BLOCK_TYPE_OPTIONS = BLOCK_CATEGORIES.map(cat => ({
  value: cat.value,
  label: cat.label,
}));

function deriveWeekPeriod(weekStart: string): WeekPeriod {
  const monday = new Date(weekStart + 'T12:00:00');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return {
    startDate: weekStart,
    endDate: sunday.toISOString().split('T')[0],
    label: `${fmt(monday)} → ${fmt(sunday)}`,
  };
}

export function TextModelImporter({ onSaveAndGoToPrograms, isSaving = false, initialWorkout, onClearInitialWorkout }: TextModelImporterProps) {
  const { submitSuggestion, submitting: suggestSubmitting, submitted: suggestedExercises } = useExerciseSuggestionSubmit();
  const { toast } = useToast();
  const { exercises: exerciseLibrary } = useExerciseLibrary();
  // ═══════════════════════════════════════════════════════════════════════════
  // HOOK DE DRAFT PERSISTENTE (ÚNICA FONTE DE VERDADE)
  // ═══════════════════════════════════════════════════════════════════════════
  const {
    draft,
    isHydrated,
    mode: rawMode,
    rawText,
    weekId,
    parseResult,
    restDays,
    programName,
    effectiveDays,
    canGoToPreview,
    canSave,
    setRawText,
    setWeekId,
    setParsedResult,
    setEditedDays,
    updateParseResult,
    setRestDays,
    setProgramName,
    goToEdit,
    goToPreview,
    goBackToImport,
    goBackToEditing,
    clearDraft,
    patchDraft,
  } = useCoachDraft();

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALIZAÇÃO DE MODE (HOTFIX: 'publish' → 'preview')
  // ═══════════════════════════════════════════════════════════════════════════
  // Se mode vier como 'publish' (valor inválido/legado), tratar como 'preview'
  const mode: DraftMode = (rawMode === 'publish' as any) ? 'preview' : rawMode;
  
  // Log de diagnóstico
  if (rawMode !== mode) {
    console.log('[MODE_NORMALIZE]', { mode: rawMode, effective: mode });
  }

  // Estados locais (UI only)
  const [isParsing, setIsParsing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ dayIndex: number; blockIndex: number } | null>(null);
  const [editingBlock, setEditingBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);
  const [expandedDayForScroll, setExpandedDayForScroll] = useState<string | null>(null);
  const [highlightedBlock, setHighlightedBlock] = useState<{ dayIndex: number; blockIndex?: number } | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateCopied, setTemplateCopied] = useState(false);
  const [coverageReport, setCoverageReport] = useState<CoverageReport | null>(null);
  const [showCoverageBadge, setShowCoverageBadge] = useState(false);
  const [showCoverageModal, setShowCoverageModal] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [exerciseTypoWarnings, setExerciseTypoWarnings] = useState<ExerciseTypoWarning[]>([]);
  

  // Recalcula cobertura quando a biblioteca de exercícios atualiza (ex: admin aprovou exercício novo)
  useEffect(() => {
    if (!parseResult || !exerciseLibrary.length || !coverageReport) return;
    const updated = calculateParsingCoverage(parseResult, exerciseLibrary.map(e => e.name));
    if (updated.successRate !== coverageReport.successRate || 
        updated.unmatchedLines.length !== coverageReport.unmatchedLines.length) {
      setCoverageReport(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseLibrary]);

  // Memoized autoformat preview — O(n) single-pass, recalcula apenas quando rawText muda
  const autoFormatPreview = useMemo(() => {
    if (!rawText.trim()) return { hasChanges: false, changesCount: 0, affectedLines: [] };
    return previewAutoFormatChanges(rawText);
  }, [rawText]);

  // Engine coverage agora é calculado dentro de cada PreviewDayCard


  // LOAD WORKOUT FOR EDIT (from Programações tab)
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!initialWorkout) return;

    const workoutDays = initialWorkout.workout_json as DayWorkout[];

    // Cast to any to avoid structural mismatch between ParsedDay and DayWorkout
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const syntheticParseResult = {
      success: true,
      days: [] as any[], // not used for rendering — effectiveDays comes from parsedDays
      structureIssues: [],
      rawText: '',
      warnings: [],
      errors: [],
      alerts: [],
      needsDaySelection: false,
    } as any;

    const weekPeriod = initialWorkout.week_start
      ? deriveWeekPeriod(initialWorkout.week_start)
      : null;

    patchDraft({
      parsedDays: workoutDays,
      editedDays: null,
      weekId: weekPeriod,
      programName: initialWorkout.title,
      mode: 'edit',
      parseResult: syntheticParseResult,
      rawText: '',
      isDirty: false,
      restDays: {},
    });

    onClearInitialWorkout?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWorkout]);

  const summarizeDraft = (d: any) => {
    const days = (d?.editedDays || d?.parsedDays) as DayWorkout[] | null;
    const blocksTotal = (days || []).reduce((sum, day) => sum + ((day?.blocks?.length as number) || 0), 0);
    return {
      mode: d?.mode,
      weekId: d?.weekId?.label ?? null,
      daysCount: days?.length ?? 0,
      blocksTotal,
      firstBlockTitle: days?.[0]?.blocks?.[0]?.title ?? null,
      hasRawText: Boolean(d?.rawText && String(d.rawText).trim().length > 0),
    };
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PARSING E VALIDAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════
  
  const workerRef = useRef<Worker | null>(null);
  const workerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) workerRef.current.terminate();
      if (workerTimeoutRef.current) clearTimeout(workerTimeoutRef.current);
    };
  }, []);

  const handleParse = async () => {
    if (isParsing) return; // prevent double-click

    const textareaValue = rawText.trim();
    if (!textareaValue) return;

    setIsParsing(true);
    const t0 = performance.now();

    try {
      const textForParse = textareaValue;

      const dayValidation = validateDayAnchors(textareaValue);
      const inputValidation = validateCoachInput(textareaValue);
      const daysDetected = dayValidation.daysFound.length;

      // Parse via Web Worker — isolado em thread separada com timeout de 8s
      let result: ParseResult;
      try {
        result = await new Promise<ParseResult>((resolve, reject) => {
          // Terminate previous worker if any
          if (workerRef.current) workerRef.current.terminate();
          if (workerTimeoutRef.current) clearTimeout(workerTimeoutRef.current);

          const worker = new Worker(
            new URL('../workers/structuredParser.worker.ts', import.meta.url),
            { type: 'module' }
          );
          workerRef.current = worker;

          // 15s hard timeout — terminates the worker thread
          workerTimeoutRef.current = setTimeout(() => {
            worker.terminate();
            workerRef.current = null;
            reject(new Error('Parser timeout: excedeu 15s. Tente reduzir o texto.'));
          }, 15000);

          worker.onmessage = (event) => {
            clearTimeout(workerTimeoutRef.current!);
            workerTimeoutRef.current = null;
            worker.terminate();
            workerRef.current = null;

            const { success, result: parsed, error } = event.data;
            if (success) {
              resolve(parsed);
            } else {
              reject(new Error(error || 'Erro desconhecido no parser'));
            }
          };

          worker.onerror = (err) => {
            clearTimeout(workerTimeoutRef.current!);
            workerTimeoutRef.current = null;
            worker.terminate();
            workerRef.current = null;
            reject(new Error(`Worker error: ${err.message}`));
          };

          worker.postMessage({ text: textForParse });
        });
      } catch (parseErr) {
        console.error('[VALIDATE_CRASH] Parser threw or timed out:', parseErr);
        const fallbackResult = {
          success: false,
          days: [],
          structureIssues: [{
            severity: 'ERROR' as const,
            message: `Erro no parser: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
            dayIndex: undefined,
            blockIndex: undefined,
          }],
          rawText: textareaValue,
          warnings: [],
          errors: [`${parseErr instanceof Error ? parseErr.message : String(parseErr)}`],
          alerts: [],
          needsDaySelection: false,
        } as ParseResult;
        setParsedResult(fallbackResult, []);
        return;
      }

      // (A) Shape do resultado
      console.log("[VALIDATE_PARSE_END]", {
        success: result?.success,
        days: result?.days?.length,
        durationMs: Math.round(performance.now() - t0),
      });
      
      // Se não detectou dias, assumir SEGUNDA
      if (daysDetected === 0 && (result.days.length === 0 || result.days.every(d => d.blocks.length === 0))) {
        result.days = [{
          day: 'seg' as DayOfWeek,
          blocks: [{
            title: 'Treino',
            type: '' as any,
            format: '',
            isMainWod: false,
            isBenchmark: false,
            optional: false,
            items: [],
            lines: rawText.split('\n').filter(line => line.trim()).map((line, idx) => ({
              id: `fallback-${idx}`,
              text: line.trim(),
              type: 'comment' as const,
            })),
            coachNotes: [],
            instructions: [],
            isAutoGenTitle: true,
            rawLines: rawText.split('\n').filter(line => line.trim()),
          }],
          alerts: [],
        }];
        result.success = true;
        result.warnings.push('Não encontramos os dias. Você pode ajustar abaixo.');
      }
      
      // Aplicar issues de estrutura
      if (inputValidation.issues && inputValidation.issues.length > 0) {
        result.structureIssues = inputValidation.issues;
      }
      
      result.needsDaySelection = false;

      // Converter para DayWorkout[] (fonte única para Preview/Publicar/Atleta)
      const workouts: DayWorkout[] = result.days.map((day) => ({
        day: (day.day || 'seg') as DayOfWeek,
        stimulus: '',
        estimatedTime: 60,
        isRestDay: day.isRestDay || false,
        blocks: day.blocks.map((block, idx) => {
          const parsedLines = block.lines || [];

          const trainingLines = parsedLines
            .filter(l => l.type !== 'comment')
            .map(l => (l.text || '').trim())
            .filter(Boolean);

          const commentLines = parsedLines
            .filter(l => l.type === 'comment')
            .map(l => (l.text || '').trim())
            .filter(Boolean);

          const coachNotes = (Array.isArray(block.coachNotes) && block.coachNotes.length > 0)
            ? block.coachNotes
            : commentLines;

          // ════════════════════════════════════════════════════════════════════════════
          // PRIORIDADE: Usar rawLines para preservar a ordem original do coach
          // (estruturas intercaladas com exercícios, ex: 3 seções de "2 ROUNDS")
          // Fallback para trainingLines se rawLines não estiver disponível
          // ════════════════════════════════════════════════════════════════════════════
          const blockTitleNorm = block.title ? normalizeText(block.title) : '';
          const rawLinesFiltered = Array.isArray(block.rawLines) && block.rawLines.length > 0
            ? block.rawLines
                .filter(l => {
                  const t = l.trim();
                  if (!t) return false;
                  // Excluir linha que é igual ao título do bloco (já exibido como header)
                  if (blockTitleNorm && normalizeText(t) === blockTitleNorm) return false;
                  // Excluir linhas DIA: e BLOCO: (são marcadores de contexto)
                  if (/^DIA:\s*/i.test(t)) return false;
                  if (/^BLOCO:\s*/i.test(t)) return false;
                  // Excluir comentários entre parênteses (já extraídos em coachNotes)
                  if (/^\(.*\)$/.test(t)) return false;
                  // Excluir linhas > (comentários DSL)
                  if (/^>\s/.test(t)) return false;
                  return true;
                })
            : null;
          
          const finalLines = rawLinesFiltered && rawLinesFiltered.length >= trainingLines.length
            ? rawLinesFiltered
            : (trainingLines.length > 0 ? trainingLines : undefined);

          return {
            id: `${day.day || 'new'}-${idx}-${Date.now()}`,
            type: block.type,
            title: block.title,
            content: trainingLines.join('\n'),
            lines: finalLines,
            coachNotes: coachNotes.length > 0 ? coachNotes : undefined,
            isMainWod: block.isMainWod || undefined,
            isBenchmark: block.isBenchmark || undefined,
          };
        }),
      }));

      const durationMs = Math.round(performance.now() - t0);
      if (durationMs > 1000) {
        console.warn(`[VALIDATE_SLOW] Validação demorou ${durationMs}ms`);
      }
      
      if (result.success && result.days.length > 0) {
        // Relatório de Comissionamento Semântico
        const coverage = calculateParsingCoverage(result, exerciseLibrary.map(e => e.name));
        setCoverageReport(coverage);
        setShowCoverageBadge(true);

        // Fuzzy matching de exercícios contra dicionário global
        if (exerciseLibrary.length > 0) {
          const dict = exerciseLibrary.map(ex => ({
            name: ex.name,
            aliases: [] as string[], // aliases já estão no name matching
          }));
          const allTypoWarnings: ExerciseTypoWarning[] = [];
          for (let dayIdx = 0; dayIdx < result.days.length; dayIdx++) {
            const day = result.days[dayIdx];
            for (const block of day.blocks) {
              const blockLines = (block.rawLines || block.lines?.map(l => l.text) || []).filter(Boolean);
              const warnings = detectExerciseTypos(blockLines as string[], dict, block.title || 'Bloco', dayIdx);
              allTypoWarnings.push(...warnings);
            }
          }
          setExerciseTypoWarnings(allTypoWarnings);
        }

        patchDraft({
          parseResult: result,
          parsedDays: workouts,
          editedDays: null,
          restDays: {},
          mode: 'edit',
        });
      } else {
        setParsedResult(result, workouts);
      }
    } catch (err) {
      console.error('[VALIDATE_CRASH] handleParse threw:', err);
      // Mostrar erro sem crashar a UI
      const fallbackResult = {
        success: false,
        days: [],
        structureIssues: [{
          severity: 'ERROR' as const,
          message: `Erro interno ao validar texto: ${err instanceof Error ? err.message : String(err)}`,
          dayIndex: undefined,
          blockIndex: undefined,
        }],
        rawText: textareaValue,
        warnings: [],
        errors: [`Erro interno: ${err instanceof Error ? err.message : String(err)}`],
        alerts: [],
        needsDaySelection: false,
      } as ParseResult;
      setParsedResult(fallbackResult, []);
    } finally {
      setIsParsing(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DE EDIÇÃO (APENAS TELA 1)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const toggleRestDay = (dayIndex: number, dayName?: string) => {
    const newRestDays = { ...restDays, [dayIndex]: !restDays[dayIndex] };
    setRestDays(newRestDays);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // effectiveDays (fonte única pós-edição)
  // - Se existir editedDays: usar editedDays
  // - Senão: usar parsedDays (parse inicial)
  // PROIBIDO: reconversão via parseResult fora da Tela 1
  // ───────────────────────────────────────────────────────────────────────────

  const cloneDays = (days: DayWorkout[]): DayWorkout[] =>
    days.map(d => ({
      ...d,
      blocks: (d.blocks || []).map(b => ({ ...b })),
    }));

  const linesToContent = (lines: any[]): string => {
    return (lines || [])
      .map(l => (typeof l?.text === 'string' ? l.text : ''))
      .join('\n')
      .trim();
  };

  const updateEdited = (updater: (days: DayWorkout[]) => void) => {
    if (!effectiveDays) return;
    const next = cloneDays(effectiveDays);
    updater(next);
    setEditedDays(next);
  };

  const toggleMainWod = (dayIndex: number, blockIndex: number) => {
    if (!parseResult || mode !== 'edit') return;

    // Atualiza estrutura (Tela 1)
    const updated = { ...parseResult };
    const day = updated.days[dayIndex];
    const clickedBlock = day.blocks[blockIndex];

    if (clickedBlock.isMainWod) {
      clickedBlock.isMainWod = false;
    } else {
      day.blocks.forEach((block, idx) => {
        block.isMainWod = idx === blockIndex;
      });
    }

    console.debug('[TextModelImporter] toggleMainWod', { dayIndex, blockIndex });
    updateParseResult(updated);

    // Atualiza fonte efetiva para preview/salvar
    updateEdited((days) => {
      const d = days[dayIndex];
      if (!d) return;
      const clicked = d.blocks?.[blockIndex];
      if (!clicked) return;

      const willUnset = Boolean(clicked.isMainWod);
      d.blocks = d.blocks.map((b, idx) => ({
        ...b,
        isMainWod: willUnset ? undefined : (idx === blockIndex ? true : undefined),
      }));
    });
  };

  const changeBlockType = (dayIndex: number, blockIndex: number, newType: string) => {
    if (!parseResult || mode !== 'edit') return;

    const updated = { ...parseResult };
    updated.days[dayIndex].blocks[blockIndex].type = newType as any;
    updateParseResult(updated);

    updateEdited((days) => {
      const d = days[dayIndex];
      const b = d?.blocks?.[blockIndex];
      if (!b) return;
      b.type = newType as any;
    });
  };

  const changeBlockTitle = (dayIndex: number, blockIndex: number, newTitle: string) => {
    if (!parseResult || mode !== 'edit') return;

    const updated = { ...parseResult };
    updated.days[dayIndex].blocks[blockIndex].title = newTitle;
    updated.days[dayIndex].blocks[blockIndex].isAutoGenTitle = false;
    updateParseResult(updated);

    updateEdited((days) => {
      const d = days[dayIndex];
      const b = d?.blocks?.[blockIndex];
      if (!b) return;
      b.title = newTitle;
    });
  };

  const deleteBlock = (dayIndex: number, blockIndex: number) => {
    if (!parseResult || mode !== 'edit') return;

    const updated = { ...parseResult };
    const day = updated.days[dayIndex];
    const blockToDelete = day.blocks[blockIndex];

    if (blockToDelete.isMainWod) return;

    day.blocks.splice(blockIndex, 1);

    let autoGenCounter = 0;
    day.blocks.forEach((block) => {
      if (block.isAutoGenTitle && block.title.match(/^BLOCO \d+$/)) {
        autoGenCounter++;
        block.title = `BLOCO ${autoGenCounter}`;
      }
    });

    updateParseResult(updated);

    updateEdited((days) => {
      const d = days[dayIndex];
      if (!d?.blocks) return;
      const b = d.blocks[blockIndex];
      if (!b) return;
      if (b.isMainWod) return;
      d.blocks.splice(blockIndex, 1);
    });

    setDeleteConfirm(null);
  };

  const saveBlockLines = (dayIndex: number, blockIndex: number, newLines: any[]) => {
    if (!parseResult || mode !== 'edit') return;

    const updated = { ...parseResult };
    updated.days[dayIndex].blocks[blockIndex].lines = newLines;
    updateParseResult(updated);

    updateEdited((days) => {
      const d = days[dayIndex];
      const b = d?.blocks?.[blockIndex];
      if (!b) return;
      b.content = linesToContent(newLines);
    });
  };

  const scrollToBlock = (dayIndex: number, blockIndex?: number) => {
    setExpandedDayForScroll(`day-${dayIndex}`);
    setTimeout(() => {
      const blockId = blockIndex !== undefined 
        ? `block-${dayIndex}-${blockIndex}` 
        : `day-accordion-${dayIndex}`;
      const element = document.getElementById(blockId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedBlock({ dayIndex, blockIndex });
        setTimeout(() => setHighlightedBlock(null), 3000);
      }
    }, 150);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDAÇÕES
  // ═══════════════════════════════════════════════════════════════════════════
  
  const hasInvalidTitles = parseResult?.days.some((day, idx) => {
    if (restDays[idx]) return false;
    return day.blocks.some(b => {
      const title = b.title?.trim() || '';
      return title === '' || isInvalidBlockTitle(title, b);
    });
  }) ?? false;

  const blocksWithoutCategory = parseResult?.days.reduce((acc, day, dayIdx) => {
    if (restDays[dayIdx]) return acc;
    return acc + day.blocks.filter(b => !b.type).length;
  }, 0) ?? 0;
  
  const hasMissingCategory = blocksWithoutCategory > 0;
  
  const structureErrorCount = parseResult?.structureIssues?.filter(i => i.severity === 'ERROR').length ?? 0;
  const hasStructureErrors = structureErrorCount > 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // MVP0: VALIDAÇÃO DE DRAFT vs PUBLICAÇÃO
  // - Draft: NUNCA bloqueado por validação semântica (apenas warnings)
  // - Publicação: validação dura acontece na aba Programações
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Warnings para exibir (não bloqueiam)
  const structureWarningCount = parseResult?.structureIssues?.length ?? 0;
  const hasStructureWarnings = structureWarningCount > 0;

  // ═══════════════════════════════════════════════════════════════════════════════
  // VALIDAÇÃO OBRIGATÓRIA PARA PREVIEW
  // - Todo bloco deve ter categoria selecionada
  // - Todo dia (não-descanso) deve ter exatamente 1 bloco Principal
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Calcular erros de validação para Preview
  const previewValidation = (() => {
    try {
    if (!parseResult?.days) return { isValid: true, errors: [] as string[], invalidBlocks: [] as { dayIndex: number; blockIndex: number; reason: string }[] };
    
    const errors: string[] = [];
    const invalidBlocks: { dayIndex: number; blockIndex: number; reason: string }[] = [];
    
    parseResult.days.forEach((day, dayIndex) => {
      if (restDays[dayIndex]) return; // Ignorar dias de descanso
      
      // Verificar categoria em cada bloco
      day.blocks.forEach((block, blockIndex) => {
        if (!block.type) {
          invalidBlocks.push({ dayIndex, blockIndex, reason: 'category' });
        }

        // MVP0 REGRA: Preview/Publicação/Atleta NÃO reparseiam e NÃO validam sintaxe.
        // Conflitos de estrutura (EMOM + ROUNDS, etc.) são reportados como issues na EDIÇÃO.
      });
      
      // Verificar bloco Principal (exatamente 1 por dia)
      const mainBlocks = day.blocks.filter(b => b.isMainWod);
      if (mainBlocks.length === 0 && day.blocks.length > 0) {
        // Nenhum bloco principal - marcar todos os blocos do dia como inválidos
        day.blocks.forEach((_, blockIndex) => {
          if (!invalidBlocks.some(ib => ib.dayIndex === dayIndex && ib.blockIndex === blockIndex)) {
            invalidBlocks.push({ dayIndex, blockIndex, reason: 'no_main' });
          }
        });
      } else if (mainBlocks.length > 1) {
        // Múltiplos blocos principais
        day.blocks.forEach((block, blockIndex) => {
          if (block.isMainWod && !invalidBlocks.some(ib => ib.dayIndex === dayIndex && ib.blockIndex === blockIndex)) {
            invalidBlocks.push({ dayIndex, blockIndex, reason: 'multiple_main' });
          }
        });
      }
    });
    
    // Gerar mensagens de erro
    const daysWithoutCategory = new Set(invalidBlocks.filter(ib => ib.reason === 'category').map(ib => ib.dayIndex));
    const daysWithoutMain = new Set(invalidBlocks.filter(ib => ib.reason === 'no_main').map(ib => ib.dayIndex));
    const daysWithMultipleMain = new Set(invalidBlocks.filter(ib => ib.reason === 'multiple_main').map(ib => ib.dayIndex));
    
    if (daysWithoutCategory.size > 0) {
      errors.push(`${daysWithoutCategory.size} dia(s) com blocos sem categoria`);
    }
    if (daysWithoutMain.size > 0) {
      errors.push(`${daysWithoutMain.size} dia(s) sem bloco Principal marcado`);
    }
    if (daysWithMultipleMain.size > 0) {
      errors.push(`${daysWithMultipleMain.size} dia(s) com múltiplos blocos Principal`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      invalidBlocks,
    };
    } catch (err) {
      console.error('[PREVIEW_VALIDATION_CRASH]', err);
      return { isValid: true, errors: [] as string[], invalidBlocks: [] as { dayIndex: number; blockIndex: number; reason: string }[] };
    }
  })();
  
  // Estado para mostrar erros de validação
  const [previewValidationError, setPreviewValidationError] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVEGAÇÃO ENTRE TELAS + GUARDS CENTRALIZADOS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const [isParsingForPreview, setIsParsingForPreview] = useState(false);

  const handleGoToPreview = async () => {
    // GUARD 1: Semana obrigatória
    if (!weekId) {
      setPreviewValidationError('Selecione a semana de referência');
      console.log('[PREVIEW_BLOCKED]', { reason: 'NO_WEEK', weekId: null });
      return;
    }
    
    // GUARD 2: Parse bem-sucedido
    if (!parseResult?.success) {
      setPreviewValidationError('Texto não foi validado');
      console.log('[PREVIEW_BLOCKED]', { reason: 'NO_PARSE', parseResult: null });
      return;
    }
    
    // GUARD 3: Categoria + bloco principal
    if (!previewValidation.isValid) {
      setPreviewValidationError(previewValidation.errors.join('. '));
      console.log('[PREVIEW_BLOCKED]', { 
        reason: 'VALIDATION_ERRORS',
        errors: previewValidation.errors,
        invalidBlocks: previewValidation.invalidBlocks.length 
      });
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PARSING ANTECIPADO: Chamar IA para enriquecer blocos com parsedExercises
    // Isso garante que o Preview mostra tempo e calorias iguais à tela do atleta
    // ═══════════════════════════════════════════════════════════════════════════
    const days = effectiveDays || [];
    if (days.length > 0) {
      setIsParsingForPreview(true);
      try {
        const { parseAndEnrichWorkoutBlocks } = await import('@/hooks/useCoachWorkouts');
        const { enrichedWorkouts } = await parseAndEnrichWorkoutBlocks(days);
        // Atualizar os days com dados enriquecidos
        setEditedDays(enrichedWorkouts);
        console.log('[PREVIEW_ENRICHED]', {
          totalBlocks: enrichedWorkouts.reduce((s, d) => s + d.blocks.length, 0),
          parsedBlocks: enrichedWorkouts.reduce((s, d) => s + d.blocks.filter(b => b.parseStatus === 'completed').length, 0),
        });
      } catch (err) {
        console.warn('[PREVIEW_ENRICH_FAILED]', err);
        // Continuar mesmo sem parsing — preview usará fallback
      } finally {
        setIsParsingForPreview(false);
      }
    }
    
    // LOG OBRIGATÓRIO: Estado completo no momento do preview
    console.log('[PREVIEW_ALLOWED]', {
      weekId: weekId?.label,
      daysWithContent: effectiveDays?.filter(d => d.blocks?.length > 0).length ?? 0,
      missingCategory: previewValidation.invalidBlocks.filter(b => b.reason === 'category').length,
      missingMainWod: previewValidation.invalidBlocks.filter(b => b.reason === 'no_main').length,
      canSave,
      canGoToPreview: true
    });
    
    setPreviewValidationError(null);
    console.debug('[TextModelImporter] Navegando para PREVIEW');
    goToPreview();
  };

  const handleBackToEdit = () => {
    console.debug('[TextModelImporter] Voltando para EDIÇÃO');
    goBackToEditing();
  };

  const handleClear = () => {
    clearDraft();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SALVAR E IR PARA PROGRAMAÇÕES
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSaveAndGoToPrograms = async () => {
    // GUARD: weekId obrigatório
    if (!weekId) {
      setPreviewValidationError('Selecione a semana de referência');
      console.log('[SAVE_BLOCKED]', { reason: 'NO_WEEK' });
      return;
    }
    
    if (!effectiveDays || effectiveDays.length === 0) {
      setPreviewValidationError('Nenhum treino para salvar');
      console.log('[SAVE_BLOCKED]', { reason: 'NO_CONTENT' });
      return;
    }

    const title = programName.trim() || 'Treino semanal';
    const weekStart = weekId.startDate || null;

    // ════════════════════════════════════════════════════════════════════════════
    // AUDITORIA DE COMENTÁRIOS (coachNotes) - OBRIGATÓRIO PARA DEBUG
    // ════════════════════════════════════════════════════════════════════════════
    const coachNotesTotal = effectiveDays.reduce((total, day) => {
      return total + (day.blocks || []).reduce((blockTotal, block) => {
        const notes = block.coachNotes || [];
        return blockTotal + notes.length;
      }, 0);
    }, 0);

    // LOG OBRIGATÓRIO: Estado completo no momento do save
    console.log('[SAVE] coachNotesTotal=', coachNotesTotal);
    console.log('[SAVE_TO_PROGRAMS]', {
      weekId: weekId.label,
      weekStart,
      title,
      daysCount: effectiveDays.length,
      daysWithContent: effectiveDays.filter(d => d.blocks?.length > 0).length,
      coachNotesTotal,
    });

    if (onSaveAndGoToPrograms) {
      const success = await onSaveAndGoToPrograms(effectiveDays, title, weekStart);
      if (success) {
        clearDraft();
      } else {
        toast({
          title: 'Erro ao salvar',
          description: 'Não foi possível salvar o treino. Verifique sua conexão e tente novamente.',
          variant: 'destructive',
        });
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER - AGUARDAR HIDRATAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (!isHydrated) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TELA 1 - IMPORT (COLAR TEXTO)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (mode === 'import') {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              Importar Semana
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Cole o <span className="font-semibold">TREINO DA SEMANA</span> (SEG–DOM). O OUTLIER separa por dia automaticamente.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground space-y-2 p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="font-medium text-foreground">Sintaxe DSL (determinística):</p>
              <div className="grid gap-1.5 mt-2 font-mono">
                <p><span className="font-semibold text-primary">DIA: SEGUNDA</span> — início do dia</p>
                <p><span className="font-semibold text-primary">BLOCO: AQUECIMENTO</span> — início do bloco</p>
                <p><span className="font-semibold">**3 ROUNDS**</span> — estrutura (AMRAP, EMOM, Rounds, For Time)</p>
                <p><span className="font-semibold">- exercício</span> — cada exercício (com métrica)</p>
                <p><span className="font-semibold">(comentário)</span> — observação do coach</p>
              </div>
              <p className="text-[10px] text-amber-600 mt-2 font-sans">
                ⚠️ Texto solto sem <span className="font-mono">( )</span> será marcado como erro de interpretação
              </p>
            </div>

            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Cole aqui o treino da semana inteira (SEGUNDA a DOMINGO)…"
              className="min-h-[45vh] md:min-h-[55vh] text-sm"
            />
            
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 mt-1"
            >
              <Puzzle className="w-3.5 h-3.5" />
              Usar modelo para facilitar sua vida
            </button>

            <RecommendedModelBlock />

            {/* BOTÕES */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleParse}
                disabled={!rawText.trim() || isParsing}
                className="flex-1 min-w-[150px]"
              >
                {isParsing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                {isParsing ? 'Validando...' : 'Validar texto'}
              </Button>
              
              {/* AUTOFORMAT BUTTON - Adiciona hífens automaticamente */}
              {autoFormatPreview.hasChanges && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const formatted = autoFormatDSL(rawText);
                    setRawText(formatted);
                  }}
                  title="Autoformatar adiciona hífen em exercícios dentro de blocos estruturados"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Autoformatar ({autoFormatPreview.changesCount})
                </Button>
              )}
              
              {rawText.trim() && (
                <Button variant="outline" onClick={handleClear}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
            
            {/* Microcopy - Dica de autoformat */}
            {autoFormatPreview.hasChanges && (
              <p className="text-xs text-muted-foreground">
                💡 <strong>Autoformatar</strong> adiciona hífen em exercícios dentro de blocos estruturados (**ROUNDS**, **EMOM**, etc.)
              </p>
            )}
          </CardContent>
        </Card>

        {/* MODAL DE TEMPLATE */}
        <AlertDialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Modelo Determinístico</AlertDialogTitle>
              <AlertDialogDescription>
                Use este modelo para garantir que o sistema interprete corretamente:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="p-3 rounded-lg bg-muted/50 font-mono text-xs whitespace-pre-wrap">
{`DIA: SEGUNDA

BLOCO: AQUECIMENTO
- 500 m Run leve Z2
- 2x10 Air Squats
(Foco na mobilidade)

BLOCO: WOD PRINCIPAL
**FOR TIME**
- 21-15-9
- Thrusters @43/30 kg
- Pull-ups
(Cap 12 min. Manter ritmo.)

DIA: TERÇA

BLOCO: DESCANSO
(Dia de recuperação)`}
            </div>
            <div className="text-xs text-muted-foreground space-y-1 mt-2">
              <p><span className="font-mono font-semibold text-primary">DIA:</span> → início do dia (SEGUNDA, TERÇA, etc.)</p>
              <p><span className="font-mono font-semibold text-primary">BLOCO:</span> → início do bloco</p>
              <p><span className="font-mono font-semibold">**estrutura**</span> → ROUNDS, EMOM, AMRAP, FOR TIME</p>
              <p><span className="font-mono font-semibold">-</span> → cada exercício</p>
              <p><span className="font-mono font-semibold">(...)</span> → comentário do coach</p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                navigator.clipboard.writeText(`DIA: SEGUNDA\n\nBLOCO: AQUECIMENTO\n- 500 m Run leve Z2\n- 2x10 Air Squats\n(Foco na mobilidade)\n\nBLOCO: WOD PRINCIPAL\n**FOR TIME**\n- 21-15-9\n- Thrusters @43/30 kg\n- Pull-ups\n(Cap 12 min. Manter ritmo.)\n\nDIA: TERÇA\n\nBLOCO: DESCANSO\n(Dia de recuperação)`);
                setTemplateCopied(true);
                setTimeout(() => setTemplateCopied(false), 2000);
              }}>
                {templateCopied ? <><CheckCircle className="w-4 h-4 mr-2" />Copiado!</> : <><Copy className="w-4 h-4 mr-2" />Copiar</>}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TELA 2 - EDIÇÃO (BLOCOS PARSEADOS)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (mode === 'edit') {
    // Se não tem parseResult, renderizar tela de import em vez de chamar goBackToImport()
    // CRITICAL: Chamar goBackToImport() aqui causava setState durante render → loop infinito
    if (!parseResult || !parseResult.success) {
      console.log('[UI_DIAG] mode=edit mas sem parseResult, forçando mode=import via effect');
      // Usar useEffect seria ideal, mas como fallback seguro: renderizar null e agendar correção
      setTimeout(() => goBackToImport(), 0);
      return (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {/* HEADER COM BOTÃO VOLTAR */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={goBackToImport} className="h-8 w-8 p-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Edição do Treino
                </CardTitle>
              </div>
              {/* Badge de cobertura — clicável, abre modal de detalhes */}
              {coverageReport && coverageReport.totalExercises > 0 && (
                <>
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-3 py-1 cursor-pointer transition-colors ${
                      coverageReport.successRate === 100
                        ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20'
                    }`}
                    onClick={() => setShowCoverageModal(true)}
                  >
                    {coverageReport.successRate === 100
                      ? '🎯 100% interpretado'
                      : (() => {
                          const newEx = coverageReport.unmatchedLines.filter(l => l.category === 'new_exercise').length;
                          const unint = coverageReport.unmatchedLines.filter(l => l.category === 'uninterpretable').length;
                          const parts: string[] = [];
                          if (newEx > 0) parts.push(`${newEx} exercício${newEx > 1 ? 's' : ''} novo${newEx > 1 ? 's' : ''}`);
                          if (unint > 0) parts.push(`${unint} linha${unint > 1 ? 's' : ''} não interpretada${unint > 1 ? 's' : ''}`);
                          return `⚠️ ${parts.join(' · ')} (${coverageReport.successRate}%)`;
                        })()
                    }
                  </Badge>

                  {/* Modal de detalhes da interpretação */}
                  <Dialog open={showCoverageModal} onOpenChange={setShowCoverageModal}>
                    <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Detalhes da interpretação</DialogTitle>
                        <DialogDescription>
                          O sistema interpretou {coverageReport.recognizedMetrics} de {coverageReport.totalExercises} exercícios ({coverageReport.successRate}%)
                        </DialogDescription>
                      </DialogHeader>

                      {coverageReport.successRate === 100 ? (
                        <div className="flex flex-col items-center gap-3 py-6">
                          <CheckCircle className="h-10 w-10 text-primary" />
                          <p className="text-sm text-center text-foreground/80">
                            Todos os exercícios foram interpretados com sucesso! O sistema consegue estimar tempo e calorias para cada bloco.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Separar por categoria */}
                          {(() => {
                            const newExercises = coverageReport.unmatchedLines.filter(l => l.category === 'new_exercise');
                            const uninterpretable = coverageReport.unmatchedLines.filter(l => l.category === 'uninterpretable');

                            const groupLines = (lines: UnmatchedLine[]) => {
                              const grouped = new Map<string, UnmatchedLine[]>();
                              for (const line of lines) {
                                const key = `Dia ${line.dayIndex + 1} — ${line.blockTitle}`;
                                if (!grouped.has(key)) grouped.set(key, []);
                                grouped.get(key)!.push(line);
                              }
                              return grouped;
                            };

                            return (
                              <>
                                {/* Seção 1: Exercícios Novos (amarelo) */}
                                {newExercises.length > 0 && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Puzzle className="w-4 h-4 text-amber-500" />
                                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                                        Exercícios novos ({newExercises.length})
                                      </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Estes exercícios ainda não estão no nosso dicionário. Sugira para que sejam adicionados.
                                    </p>
                                    {Array.from(groupLines(newExercises).entries()).map(([groupKey, lines]) => (
                                      <div key={groupKey} className="space-y-1.5">
                                        <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                                          {groupKey}
                                        </p>
                                        {lines.map((line, i) => (
                                          <div
                                            key={i}
                                            className="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-amber-500/5 border border-amber-500/10 text-foreground"
                                          >
                                            <span className="flex-1">{line.text}</span>
                                            {suggestedExercises.has(line.text.trim().toLowerCase()) ? (
                                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 shrink-0">
                                                ✓ Enviado
                                              </Badge>
                                            ) : (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="shrink-0 text-xs h-7 px-2"
                                                disabled={suggestSubmitting}
                                                onClick={() => submitSuggestion(line.text.trim(), line.blockTitle)}
                                              >
                                                <Send className="w-3 h-3 mr-1" />
                                                Sugerir
                                              </Button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Seção 2: Linhas Não Interpretadas (vermelho/laranja) */}
                                {uninterpretable.length > 0 && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4 text-destructive" />
                                      <p className="text-sm font-medium text-destructive">
                                        Linhas não interpretadas ({uninterpretable.length})
                                      </p>
                                    </div>
                                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                                      <p className="text-xs text-destructive font-medium">
                                        ⚠️ Recomendamos corrigir estas linhas antes de publicar. O atleta não verá estimativas de tempo/calorias nesses trechos.
                                      </p>
                                      <p className="text-xs text-destructive/80">
                                        💡 Se for um comentário, coloque entre parênteses <strong>( )</strong> ou mova para a seção <strong>[COMENTÁRIO]</strong>.
                                      </p>
                                    </div>
                                    {Array.from(groupLines(uninterpretable).entries()).map(([groupKey, lines]) => (
                                      <div key={groupKey} className="space-y-1.5">
                                        <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                                          {groupKey}
                                        </p>
                                        {lines.map((line, i) => (
                                          <div
                                            key={i}
                                            className="flex flex-col gap-1 text-sm px-3 py-2 rounded-md bg-destructive/5 border border-destructive/10 text-foreground"
                                          >
                                            <span className="font-mono text-xs">{line.text}</span>
                                            {line.suggestion && (
                                              <span className="text-xs text-orange-600 dark:text-orange-400">
                                                💡 Você quis dizer <strong>"{line.suggestion}"</strong>?
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            );
                          })()}

                          <p className="text-xs text-muted-foreground italic">
                            Dica: adicione métricas como repetições, distância ou tempo para que o sistema interprete automaticamente.
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <Button variant="outline" size="sm" onClick={() => setShowCoverageModal(false)}>
                          Entendi
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {/* Badge de precisão do motor movido para Preview */}
            </div>
            <p className="text-sm text-muted-foreground">
              Revise e ajuste os blocos. Defina a categoria e marque o WOD principal.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Erros de estrutura */}
            {parseResult.structureIssues && parseResult.structureIssues.length > 0 && (
              <StructuredErrorDisplay 
                issues={parseResult.structureIssues}
                onScrollToBlock={scrollToBlock}
              />
            )}

            {/* Avisos de typos detectados */}
            {parseResult.typoWarnings && parseResult.typoWarnings.length > 0 && (
              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="w-4 h-4" />
                  Possíveis erros de digitação
                </div>
                {parseResult.typoWarnings.map((tw, idx) => (
                  <p key={idx} className="text-xs text-yellow-700 dark:text-yellow-300">
                    <span className="font-mono bg-yellow-500/15 px-1 rounded">"{tw.line}"</span>
                    {' → Você quis dizer '}
                    <span className="font-semibold">"{tw.suggestion}"</span>?
                    <span className="text-muted-foreground ml-1">(linha {tw.lineNumber})</span>
                  </p>
                ))}
                <p className="text-[10px] text-muted-foreground mt-1">
                  Estes avisos não impedem o salvamento. Corrija se desejar.
                </p>
              </div>
            )}

            {/* Avisos de typos em exercícios (fuzzy match contra dicionário) */}
            {exerciseTypoWarnings.length > 0 && (
              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  <Puzzle className="w-4 h-4" />
                  Exercícios com possível erro de digitação
                </div>
                {exerciseTypoWarnings.map((tw, idx) => (
                  <p key={idx} className="text-xs text-yellow-700 dark:text-yellow-300">
                    <span className="font-mono bg-yellow-500/15 px-1 rounded">"{tw.line}"</span>
                    {' → Você quis dizer '}
                    <span className="font-semibold">"{tw.suggestion}"</span>?
                    <span className="text-muted-foreground ml-1">({tw.blockTitle})</span>
                  </p>
                ))}
                <p className="text-[10px] text-muted-foreground mt-1">
                  Estes avisos não impedem o salvamento. O sistema ainda reconhece o exercício.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="program-name-edit" className="text-base font-semibold text-foreground">
                Nome da Programação
              </Label>
              <Input
                id="program-name-edit"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Ex: Semana de força"
                className="text-lg h-12 font-medium"
              />
            </div>

            {/* Accordion de dias - COM CONTROLES DE EDIÇÃO */}
            <TooltipProvider>
              <Accordion 
                type="single" 
                collapsible 
                className="space-y-4"
                value={expandedDayForScroll || undefined}
                onValueChange={(value) => setExpandedDayForScroll(value || null)}
              >
                {(parseResult.days ?? []).map((day, dayIndex) => {
                  const dayName = day.day ? getDayName(day.day) : 'Dia não definido';
                  const isRestDay = restDays[dayIndex] || false;
                  
                  return (
                    <AccordionItem 
                      key={day.day || `day-${dayIndex}`} 
                      value={`day-${dayIndex}`}
                      className="border border-border/50 rounded-2xl overflow-hidden shadow-sm bg-card"
                    >
                      <AccordionTrigger className="px-5 py-4 min-h-[64px] hover:no-underline hover:bg-muted/40">
                        <div className="flex items-center gap-4 flex-wrap flex-1 text-left">
                          <span className="font-bold text-lg uppercase tracking-wide text-foreground">
                            {dayName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {day.blocks.length} bloco{day.blocks.length !== 1 ? 's' : ''}
                          </span>
                          
                          {isRestDay && (
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 border-2 border-blue-500/30 px-3 py-1">
                              <Moon className="w-4 h-4 mr-1.5" />
                              DESCANSO
                            </Badge>
                          )}
                          
                          <div className="flex-1" />
                          
                          {/* Toggle de descanso */}
                          <div 
                            className="flex items-center gap-2" 
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-xs text-muted-foreground">Descanso</span>
                            <Switch
                              checked={isRestDay}
                              onCheckedChange={() => toggleRestDay(dayIndex, dayName)}
                            />
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5">
                        {isRestDay ? (
                          <div className="p-5 rounded-xl bg-blue-500/10 border-2 border-blue-500/30">
                            <div className="flex items-center gap-3">
                              <Moon className="w-6 h-6 text-blue-500" />
                              <p className="text-sm text-blue-600 font-semibold">
                                🌙 Dia de descanso — {dayName.toUpperCase()}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {day.blocks.map((block, blockIndex) => {
                              // Normalizar título (remover prefixo "BLOCO:" se existir)
                              const rawTitle = block.title?.trim() || '';
                              const normalizedTitle = normalizeBlockTitle(rawTitle);
                              const displayTitle = normalizedTitle || `Bloco ${blockIndex + 1}`;
                              const hasTitleError = !normalizedTitle || isInvalidBlockTitle(block.title, block);
                              
                              // Verificar erros de preview para este bloco
                              const blockPreviewErrors = previewValidation.invalidBlocks.filter(
                                ib => ib.dayIndex === dayIndex && ib.blockIndex === blockIndex
                              );
                              const hasPreviewError = blockPreviewErrors.length > 0;
                              const isMissingCategory = blockPreviewErrors.some(e => e.reason === 'category');
                              const isMissingMain = blockPreviewErrors.some(e => e.reason === 'no_main');
                              const hasMultipleMain = blockPreviewErrors.some(e => e.reason === 'multiple_main');
                              const hasStructureConflict = blockPreviewErrors.some(e => e.reason === 'structure_conflict');
                              
                               const hasBlockLevelError = hasTitleError || !block.type || isMissingCategory || hasStructureConflict;
                               
                               // Verificar se bloco tem NOTEs soltas na zona de treino
                                const hasLooseNotes = block.type !== 'notas' && (block.lines || []).some(
                                  (line: any) => line.kind === 'NOTE' && line.confidence === 'LOW' && (() => {
                                    const t = (line.text || '').trim();
                                    if (/^\(.*\)$/.test(t)) return false;
                                    if (!t || /^[⸻─═\-]{3,}$/.test(t)) return false;
                                    if ((t.match(/[a-zA-ZÀ-ÿ]/g) || []).length < 3) return false;
                                    if (t.startsWith('#')) return false;
                                    return true;
                                  })()
                                );
                               const hasValidationErrors = hasBlockLevelError || hasLooseNotes;
                              
                              // ═══════════════════════════════════════════════════════════
                              // MVP0: REGRA OBRIGATÓRIA DE RENDERIZAÇÃO
                              // Bloco só é renderizado como TREINO se:
                              // - block.lines existir E block.lines.length > 0
                              // Se não tiver linhas de treino, NÃO renderiza como bloco
                              // ═══════════════════════════════════════════════════════════
                              const trainingLines = block.lines || [];
                              const hasExecutableLines = trainingLines.length > 0;
                              
                              // Render check gated behind debug
                              
                              // REGRA: Se não tem linhas executáveis, NÃO renderiza como bloco de treino
                              if (!hasExecutableLines && block.type !== "notas") {
                                return null;
                              }
                              
                              // ═══════════════════════════════════════════════════════════
                              // NOTAS/COMENTÁRIO: Renderização visual discreta
                              // Sem header, sem ações, sem container de bloco padrão
                              // ═══════════════════════════════════════════════════════════
                              if (block.type === "notas") {
                                const commentText = block.coachNotes?.join('\n') || "";
                                if (!commentText.trim()) return null;
                                
                                return (
                                  <div
                                    key={blockIndex}
                                    className="mt-2 ml-2 pl-3 py-2 border-l-2 border-muted-foreground/30 bg-muted/30 rounded-r-md"
                                  >
                                    <div className="flex items-start gap-2">
                                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                        {commentText}
                                      </p>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // ═══════════════════════════════════════════════════════════
                              // TREINO: Bloco funcional completo com header e ações
                              // ═══════════════════════════════════════════════════════════
                              return (
                                <div 
                                  key={blockIndex}
                                  id={`block-${dayIndex}-${blockIndex}`}
                                  className={`p-4 rounded-2xl transition-all ${
                                    block.isMainWod 
                                      ? 'bg-primary/5 ring-1 ring-primary/20 shadow-sm' 
                                      : hasValidationErrors
                                        ? 'bg-amber-500/5 ring-1 ring-amber-500/20'
                                        : 'bg-muted/30'
                                  } ${highlightedBlock?.dayIndex === dayIndex && highlightedBlock?.blockIndex === blockIndex ? 'ring-2 ring-primary' : ''}`}
                                >
                                  {/* Header do bloco COM CONTROLES */}
                                  <div className="flex items-center gap-2 flex-wrap mb-3">
                                    {/* Estrela Principal integrada ao título */}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={() => toggleMainWod(dayIndex, blockIndex)}
                                          className={`flex-shrink-0 transition-colors ${
                                            block.isMainWod
                                              ? 'text-primary'
                                              : 'text-muted-foreground/40 hover:text-muted-foreground'
                                          }`}
                                        >
                                          <Star className={`w-4 h-4 ${block.isMainWod ? 'fill-current' : ''}`} />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Marcar como WOD principal do dia</p>
                                      </TooltipContent>
                                    </Tooltip>

                                    {/* Título editável — ghost input */}
                                    <Input
                                      value={displayTitle}
                                      onChange={(e) => changeBlockTitle(dayIndex, blockIndex, e.target.value)}
                                      className={`h-7 w-[180px] text-sm font-semibold border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:border-input ${hasTitleError ? 'border-amber-500' : ''}`}
                                    />
                                    
                                    {/* Seletor de categoria — discreto */}
                                    <Select
                                      value={block.type || ''}
                                      onValueChange={(value) => changeBlockType(dayIndex, blockIndex, value)}
                                    >
                                      <SelectTrigger className={`h-7 w-[140px] text-xs border-transparent bg-transparent hover:bg-muted/50 ${!block.type ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
                                        <SelectValue placeholder="Categoria" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {BLOCK_TYPE_OPTIONS.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    {/* Labels de erro de validação para Preview */}
                                    {hasPreviewError && (
                                      <div className="flex gap-1 flex-wrap">
                                        {isMissingCategory && (
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-amber-500 text-amber-600 bg-amber-500/10">
                                            Selecione categoria
                                          </Badge>
                                        )}
                                        {isMissingMain && (
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-amber-500 text-amber-600 bg-amber-500/10">
                                            Marque como Principal
                                          </Badge>
                                        )}
                                        {hasMultipleMain && (
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-amber-500 text-amber-600 bg-amber-500/10">
                                            Múltiplos Principal
                                          </Badge>
                                        )}
                                        {hasStructureConflict && (
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-destructive text-destructive bg-destructive/10">
                                            Conflito de estrutura
                                          </Badge>
                                        )}
                                      </div>
                                    )}

                                    <div className="flex-1" />

                                    {/* Menu de ações */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setEditingBlock({ dayIndex, blockIndex })}>
                                          <Pencil className="w-4 h-4 mr-2" />
                                          Editar conteúdo
                                        </DropdownMenuItem>
                                        {!block.isMainWod && (
                                          <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => setDeleteConfirm({ dayIndex, blockIndex })}
                                          >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Excluir bloco
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  {/* Conteúdo do bloco - SEM REPARSE (usa dados já parseados) */}
                                  {(() => {
                                    // ════════════════════════════════════════════════════════════════════════════
                                    // MVP0 REGRA: Usar rawLines (string[]) para preservar ordem do coach
                                    // ParsedBlock.lines é ParsedLine[] que agrupa structures antes de exercises
                                    // rawLines mantém a intercalação original (ex: 2R, ex, ex, 2R, ex, ex)
                                    // ════════════════════════════════════════════════════════════════════════════
                                    const titleNorm = block.title ? normalizeText(block.title) : '';
                                    const filteredRaw = Array.isArray(block.rawLines) && block.rawLines.length > 0
                                      ? block.rawLines.filter((l: string) => {
                                          const t = l.trim();
                                          if (!t) return false;
                                          if (titleNorm && normalizeText(t) === titleNorm) return false;
                                          if (/^DIA:\s*/i.test(t)) return false;
                                          if (/^BLOCO:\s*/i.test(t)) return false;
                                          if (/^\(.*\)$/.test(t)) return false;
                                          if (/^>\s/.test(t)) return false;
                                          return true;
                                        })
                                      : null;
                                    const displayBlock = filteredRaw && filteredRaw.length > 0
                                      ? { lines: filteredRaw, coachNotes: block.coachNotes, content: undefined }
                                      : block;
                                    const displayData = getBlockDisplayDataFromParsed(displayBlock);


                                    // Estado de expansão por bloco (usando key único)
                                    const blockKey = `${dayIndex}-${blockIndex}`;
                                    const isExpanded = expandedBlocks.has(blockKey);
                                    const displayExercises = isExpanded 
                                      ? displayData.exerciseLines 
                                      : displayData.exerciseLines.slice(0, 5);
                                    const hasMore = displayData.exerciseLines.length > 5;
                                    
                                    return (
                                      <div className="text-sm space-y-0.5 text-foreground/80 leading-snug">
                                        {/* Estrutura - Badge visual */}
                                        {displayData.structureDescription && (
                                          <div className="mb-2">
                                            <StructureBadge structure={displayData.structureDescription} />
                                          </div>
                                        )}
                                        
                                        {/* Exercícios (com suporte a badges inline __STRUCT:) */}
                                        {displayExercises.map((line, idx) => {
                                          if (line.startsWith('__STRUCT:')) {
                                            return (
                                              <div key={idx} className="pt-2 pb-1">
                                                <StructureBadge structure={line.slice('__STRUCT:'.length)} />
                                              </div>
                                            );
                                          }
                                          return <p key={idx} className="truncate">{normalizeRestLineForDisplay(line)}</p>;
                                        })}

                                        
                                        {hasMore && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setExpandedBlocks(prev => {
                                                const next = new Set(prev);
                                                if (next.has(blockKey)) {
                                                  next.delete(blockKey);
                                                } else {
                                                  next.add(blockKey);
                                                }
                                                return next;
                                              });
                                            }}
                                            className="text-primary text-xs hover:underline cursor-pointer mt-1"
                                          >
                                            {isExpanded 
                                              ? '▲ Recolher'
                                              : `▼ Ver tudo (+${displayData.exerciseLines.length - 5} linhas)`
                                            }
                                          </button>
                                        )}
                                        
                                        {displayData.exerciseLines.length === 0 && !displayData.structureDescription && (
                                          <p className="text-xs text-muted-foreground/50 italic">Sem linhas de exercício</p>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  
                                  {/* MVP0: Comentário do coach como sub-bloco visual */}
                                  {Array.isArray(block.coachNotes) && block.coachNotes.length > 0 && (
                                    <div className="mt-2 ml-2 pl-3 py-2 border-l-2 border-muted-foreground/30 bg-muted/30 rounded-r-md">
                                      <div className="flex items-start gap-2">
                                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wide">Comentário</span>
                                          {block.coachNotes.map((note, idx) => (
                                            <p key={idx} className="text-xs text-muted-foreground italic truncate">{note}</p>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </TooltipProvider>

            {/* SEMANA DE REFERÊNCIA — abaixo dos blocos */}
            <div className="space-y-2 pt-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                Semana de Referência (obrigatório)
              </Label>
              <WeekPeriodSelector
                selectedWeek={weekId}
                onWeekSelect={(week) => setWeekId(week)}
              />
              {!weekId && (
                <p className="text-xs text-amber-600">
                  ⚠️ Selecione a semana para salvar ou publicar
                </p>
              )}
            </div>

            {/* ALERTA DE ERRO DE VALIDAÇÃO PARA PREVIEW */}
            {previewValidationError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-lg bg-destructive/10 border border-destructive/30"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Não é possível ir para Preview</p>
                    <p className="text-xs text-destructive/80 mt-1">{previewValidationError}</p>
                    <p className="text-xs text-muted-foreground mt-2">Corrija os erros nos blocos destacados acima.</p>
                  </div>
                </div>
              </motion.div>
            )}

          </CardContent>
        </Card>

        {/* STICKY ACTION BAR — Glassmorphism */}
        <div className="sticky bottom-0 z-10 px-4 py-3 -mx-4 backdrop-blur-md bg-background/80 border-t border-border/50">
          <div className="flex gap-3 max-w-full">
            <Button variant="outline" onClick={goBackToImport} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Editar texto
            </Button>
            <Button
              onClick={handleGoToPreview}
              className="flex-1"
              disabled={!parseResult?.success || isParsingForPreview}
            >
              {isParsingForPreview ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {isParsingForPreview ? 'Calculando...' : 'Ver preview'}
            </Button>
          </div>
        </div>

        {/* MODAL DE EDIÇÃO DE BLOCO */}
        <BlockEditorModal
          open={!!editingBlock}
          onOpenChange={(open) => !open && setEditingBlock(null)}
          blockTitle={
            editingBlock && parseResult.days[editingBlock.dayIndex]?.blocks[editingBlock.blockIndex]
              ? parseResult.days[editingBlock.dayIndex].blocks[editingBlock.blockIndex].title
              : ''
          }
          lines={
            editingBlock && parseResult.days[editingBlock.dayIndex]?.blocks[editingBlock.blockIndex]
              ? parseResult.days[editingBlock.dayIndex].blocks[editingBlock.blockIndex].lines || []
              : []
          }
          onSave={(newLines) => {
            if (editingBlock) {
              saveBlockLines(editingBlock.dayIndex, editingBlock.blockIndex, newLines);
            }
            setEditingBlock(null);
          }}
        />

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir bloco?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O bloco será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteConfirm) {
                    deleteBlock(deleteConfirm.dayIndex, deleteConfirm.blockIndex);
                  }
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TELA 2 - PREVIEW (100% READ-ONLY)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (mode === 'preview') {
    const days = effectiveDays || [];
    const blocksTotal = days.reduce((sum, d) => sum + ((d.blocks || []).length), 0);

    // (C) [DIAG_PREVIEW_INPUT] — o que o Preview está usando como fonte
    console.log("[DIAG_PREVIEW_INPUT]", {
      mode,
      weekId: weekId?.label ?? null,
      daysCount: days.length,
      blocksTotal,
      rawTextLen: rawText?.length ?? 0,
      firstDayLabel: days?.[0]?.day ?? null,
      firstBlockTitle: days?.[0]?.blocks?.[0]?.title ?? null,
      firstBlockKeys: days?.[0]?.blocks?.[0]
        ? Object.keys(days[0].blocks[0] as any)
        : null,
      firstBlockContentLen:
        typeof days?.[0]?.blocks?.[0]?.content === 'string'
          ? days[0].blocks[0].content.length
          : 0,
    });

    // (D) [DIAG_RENDER_GUARD] — se Preview estiver vazio, registrar motivo
    if (days.length === 0) {
      console.log('[DIAG_RENDER_GUARD]', {
        reason: 'NO_EFFECTIVE_DAYS',
        conditionValues: {
          parseSuccess: parseResult?.success ?? null,
          parsedDaysCount: draft.parsedDays?.length ?? 0,
          editedDaysCount: draft.editedDays?.length ?? 0,
          weekId: weekId?.label ?? null,
        },
      });
    }

    const restCount = days.reduce((acc, d, idx) => acc + ((d.isRestDay || restDays[idx]) ? 1 : 0), 0);

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBackToEdit} className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="w-5 h-5 text-primary" />
                Preview do Treino
              </CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              Somente leitura
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Confira como o atleta verá o treino. Para editar, volte à tela anterior.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Semana - READ-ONLY */}
          {weekId && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <span className="text-sm">
                Semana: <span className="font-semibold">{weekId.label}</span>
              </span>
            </div>
          )}

          {/* Nome da programação */}
          {programName && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-sm">
                Programação: <span className="font-semibold">{programName}</span>
              </span>
            </div>
          )}

          {/* Nota sobre valores estimados */}
          <p className="text-xs text-muted-foreground/60 text-center">
            Valores estimados para atleta padrão (masculino, 75kg, 170cm). Ao publicar, cada atleta receberá cálculos com seus dados reais.
          </p>

          {/* Lista de dias - UI idêntica à tela do atleta */}
          {days.map((dayWorkout, dayIndex) => {
            const dayName = getDayName(dayWorkout.day);
            const isRestDay = Boolean(dayWorkout.isRestDay || restDays[dayIndex]);

            return (
              <PreviewDayCard
                key={`${dayWorkout.day}-${dayIndex}`}
                dayWorkout={dayWorkout}
                dayName={dayName}
                isRestDay={isRestDay}
              />
            );
          })}

          {/* Resumo */}
          <p className="text-sm text-muted-foreground text-center">
            {days.length} dia(s) • {restCount} de descanso
          </p>



          {/* BOTÕES: VOLTAR E SALVAR */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleBackToEdit} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para edição
            </Button>
            <Button
              onClick={handleSaveAndGoToPrograms}
              className="flex-1"
              disabled={isSaving || !canSave}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar e ir para Programações
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback - se chegou aqui, mode não é 'import', 'edit' nem 'preview'
  // Isso não deveria acontecer após a normalização, mas se acontecer, voltar para import
  console.error('[UI_DIAG] TextModelImporter fallback! mode is:', mode, 'rawMode was:', rawMode);
  
  return (
    <Card className="border-amber-500/50">
      <CardContent className="p-8">
        <div className="text-center space-y-4">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
          <p className="text-amber-600">Estado inesperado detectado. Reiniciando...</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={goBackToImport}>
              Voltar para início
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Recarregar página
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
