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

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, AlertCircle, CheckCircle, Eye, Trash2, 
  AlertTriangle, Star, Loader2, Moon, MoreVertical, Pencil, 
  Puzzle, Copy, ArrowLeft, ArrowRight, Save
} from 'lucide-react';
import { BlockEditorModal } from './BlockEditorModal';
import { WeekPeriodSelector, type WeekPeriod } from './WeekPeriodSelector';
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
  parseStructuredText, 
  parsedToDayWorkouts,
  getDayName,
  isInvalidBlockTitle,
  normalizeText,
  validateDayAnchors,
  validateCoachInput,
  type ParseResult 
} from '@/utils/structuredTextParser';
import { normalizeRestLineForDisplay, separateBlockContent } from '@/utils/blockDisplayUtils';
import type { DayOfWeek, DayWorkout } from '@/types/outlier';
import { BLOCK_CATEGORIES } from '@/utils/categoryValidation';
import { StructuredErrorDisplay, RecommendedModelBlock } from './StructuredErrorDisplay';
import { useCoachDraft, type DraftMode } from '@/hooks/useCoachDraft';

interface TextModelImporterProps {
  onSaveAndGoToPrograms?: (workouts: DayWorkout[], title: string, weekStart: string | null) => Promise<boolean>;
  isSaving?: boolean;
}

const BLOCK_TYPE_OPTIONS = BLOCK_CATEGORIES.map(cat => ({
  value: cat.value,
  label: cat.label,
}));

export function TextModelImporter({ onSaveAndGoToPrograms, isSaving = false }: TextModelImporterProps) {
  // ═══════════════════════════════════════════════════════════════════════════
  // HOOK DE DRAFT PERSISTENTE (ÚNICA FONTE DE VERDADE)
  // ═══════════════════════════════════════════════════════════════════════════
  const {
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ dayIndex: number; blockIndex: number } | null>(null);
  const [editingBlock, setEditingBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);
  const [expandedDayForScroll, setExpandedDayForScroll] = useState<string | null>(null);
  const [highlightedBlock, setHighlightedBlock] = useState<{ dayIndex: number; blockIndex?: number } | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateCopied, setTemplateCopied] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // PARSING E VALIDAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleParse = () => {
    console.log('[VALIDATE_CLICK] mode=import');
    
    const textareaValue = rawText.trim();
    if (!textareaValue) return;

    // (1) NO INPUT (Textarea) — fonte de verdade
    console.log("[RAW_TEXT_TAG_COUNTS]", {
      treino: (textareaValue.match(/\[TREINO\]/gi) || []).length,
      comentario: (textareaValue.match(/\[COMENT[ÁA]RIO\]/gi) || []).length,
    });
    console.log("[RAW_TEXT_FIRST_300]", textareaValue.slice(0, 300));
    console.log(
      "[RAW_TEXT_HAS_FENCE_MARKERS]",
      /\[TREINO\]|\[COMENT[ÁA]RIO\]/i.test(textareaValue)
    );

    // (2) TEXTO PARA PARSE — logo ANTES de parseStructuredText(...)
    const textForParse = textareaValue;
    console.log("[TEXT_FOR_PARSE_TAG_COUNTS]", {
      treino: (textForParse.match(/\[TREINO\]/gi) || []).length,
      comentario: (textForParse.match(/\[COMENT[ÁA]RIO\]/gi) || []).length,
    });
    console.log("[TEXT_FOR_PARSE_DIFF_HINT]", textareaValue !== textForParse);

    const dayValidation = validateDayAnchors(textareaValue);
    const inputValidation = validateCoachInput(textareaValue);
    const daysDetected = dayValidation.daysFound.length;

    // Parse o texto
    const result = parseStructuredText(textForParse);
    
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
    
    // Converter para DayWorkout[]
    const workouts = parsedToDayWorkouts(result);
    
    console.debug('[TextModelImporter] handleParse → days=', result.days.length);
    setParsedResult(result, workouts);
    
    // Log de resultado da validação
    console.log('[VALIDATE_RESULT] success=' + result.success);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // REGRA: Validar + Avançar automaticamente
    // Se parsing bem-sucedido E semana selecionada → PREVIEW direto
    // Se parsing bem-sucedido MAS sem semana → EDIT (para selecionar semana)
    // Se parsing falhou → permanece em import
    // ═══════════════════════════════════════════════════════════════════════════
    if (result.success && result.days.length > 0) {
      if (weekId !== null) {
        // Semana já selecionada → PREVIEW automático
        console.log('[MODE_CHANGE] import → preview (reason=validate_success)');
        goToPreview();
      } else {
        // Precisa selecionar semana → EDIT
        console.log('[MODE_CHANGE] import → edit (reason=validate_success_needs_week)');
        goToEdit();
      }
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
  
  // Draft pode ser salvo mesmo com warnings semânticos
  // Requisitos mínimos: texto parseado + semana selecionada
  const canSaveAndGoToPreview = parseResult?.success && weekId !== null;

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVEGAÇÃO ENTRE TELAS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleGoToPreview = () => {
    if (!canSaveAndGoToPreview) return;
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
    if (!effectiveDays || !weekId) return;

    const title = programName.trim() || 'Treino semanal';
    const weekStart = weekId.startDate || null;

    console.debug('[TextModelImporter] Salvando e indo para Programações (effectiveDays)', {
      title,
      weekStart,
      daysCount: effectiveDays.length,
    });

    if (onSaveAndGoToPrograms) {
      const success = await onSaveAndGoToPrograms(effectiveDays, title, weekStart);
      if (success) {
        clearDraft();
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
              <p className="font-medium text-foreground">Estrutura determinística:</p>
              <div className="grid gap-1.5 mt-2 font-mono">
                <p><span className="font-semibold">SEGUNDA</span> — início do dia</p>
                <p><span className="font-semibold">Nome do Bloco</span> — título do treino</p>
                <p><span className="font-semibold text-primary">= TREINO</span> — início do treino</p>
                <p><span className="font-semibold text-primary">- item</span> — exercício (com métrica)</p>
                <p><span className="font-semibold text-primary">&gt; COMENTÁRIO</span> — observação</p>
              </div>
            </div>

            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Cole aqui o treino da semana inteira (SEGUNDA a DOMINGO)…"
              className="min-h-[200px] text-sm"
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

            {/* SELETOR DE SEMANA - OBRIGATÓRIO */}
            <WeekPeriodSelector
              selectedWeek={weekId}
              onWeekSelect={(week) => setWeekId(week)}
            />

            {/* NOME DA PROGRAMAÇÃO */}
            <div className="space-y-2">
              <Label htmlFor="program-name-import">Nome da Programação (opcional)</Label>
              <Input
                id="program-name-import"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Ex: Semana de força"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleParse}
                disabled={!rawText.trim()}
                className="flex-1 min-w-[150px]"
              >
                <Eye className="w-4 h-4 mr-2" />
                Validar texto
              </Button>
              
              {rawText.trim() && (
                <Button variant="outline" onClick={handleClear}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
            
            {rawText.trim() && !weekId && (
              <p className="text-xs text-amber-600 text-center">
                ⚠️ Selecione a semana de referência para continuar
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
{`SEGUNDA

Aquecimento

= TREINO
- 500 m Run leve Z2
- 2x10 Air Squats

> COMENTÁRIO
> Foco na mobilidade


WOD

= TREINO
- For Time: 21-15-9
- Thrusters @43/30 kg
- Pull-ups

> COMENTÁRIO
> Cap 12 min. Manter ritmo.


TERÇA

Descanso`}
            </div>
            <div className="text-xs text-muted-foreground space-y-1 mt-2">
              <p><span className="font-mono font-semibold">=</span> TREINO → início do bloco</p>
              <p><span className="font-mono font-semibold">-</span> item → cada exercício</p>
              <p><span className="font-mono font-semibold">&gt;</span> comentário → observação do coach</p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                navigator.clipboard.writeText(`SEGUNDA\n\nAquecimento\n\n= TREINO\n- 500 m Run leve Z2\n- 2x10 Air Squats\n\n> COMENTÁRIO\n> Foco na mobilidade\n\n\nWOD\n\n= TREINO\n- For Time: 21-15-9\n- Thrusters @43/30 kg\n- Pull-ups\n\n> COMENTÁRIO\n> Cap 12 min. Manter ritmo.\n\n\nTERÇA\n\nDescanso`);
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
    // Se não tem parseResult, voltar para import
    if (!parseResult || !parseResult.success) {
      console.log('[UI_DIAG] mode=edit mas sem parseResult, voltando para import');
      goBackToImport();
      return null;
    }

    return (
      <div className="space-y-4">
        {/* HEADER COM BOTÃO VOLTAR */}
        <Card className="border-green-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={goBackToImport} className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Edição do Treino
              </CardTitle>
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

            {/* Semana selecionada */}
            {weekId && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">
                    Semana: <span className="font-semibold">{weekId.label}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Accordion de dias - COM CONTROLES DE EDIÇÃO */}
            <TooltipProvider>
              <Accordion 
                type="single" 
                collapsible 
                className="space-y-4"
                value={expandedDayForScroll || undefined}
                onValueChange={(value) => setExpandedDayForScroll(value || null)}
              >
                {parseResult.days.map((day, dayIndex) => {
                  const dayName = day.day ? getDayName(day.day) : 'Dia não definido';
                  const isRestDay = restDays[dayIndex] || false;
                  
                  return (
                    <AccordionItem 
                      key={day.day || `day-${dayIndex}`} 
                      value={`day-${dayIndex}`}
                      className="border-2 border-border rounded-2xl overflow-hidden shadow-md bg-card"
                    >
                      <AccordionTrigger className="px-5 py-5 min-h-[72px] hover:no-underline hover:bg-secondary/30">
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
                              const displayTitle = block.title?.trim() || `Bloco ${blockIndex + 1}`;
                              const hasTitleError = !block.title?.trim() || isInvalidBlockTitle(block.title, block);
                              const hasValidationErrors = hasTitleError || !block.type;
                              
                              // [RENDER_CHECK] Log obrigatório - render NUNCA depende de errors
                              console.log("[RENDER_CHECK]", {
                                day: dayName,
                                blockTitle: displayTitle,
                                trainingLines: (block.lines || []).length,
                                validationErrors: hasValidationErrors ? 1 : 0,
                              });
                              // [RENDER_BLOCK] Bloco sempre renderizado
                              console.log(`[RENDER_BLOCK] title="${displayTitle}" rendered=true`);
                              
                              // REGRA: Erros afetam APENAS estilo visual, NUNCA condicionam render
                              return (
                                <div 
                                  key={blockIndex}
                                  id={`block-${dayIndex}-${blockIndex}`}
                                  className={`p-4 rounded-xl border-2 ${
                                    block.isMainWod 
                                      ? 'border-primary/50 bg-primary/5' 
                                      : hasValidationErrors
                                        ? 'border-amber-500/50 bg-amber-500/5'
                                        : 'border-border bg-card'
                                  } ${highlightedBlock?.dayIndex === dayIndex && highlightedBlock?.blockIndex === blockIndex ? 'ring-2 ring-primary' : ''}`}
                                >
                                  {/* Header do bloco COM CONTROLES */}
                                  <div className="flex items-center gap-2 flex-wrap mb-3">
                                    {/* Título editável */}
                                    <Input
                                      value={displayTitle}
                                      onChange={(e) => changeBlockTitle(dayIndex, blockIndex, e.target.value)}
                                      className={`h-8 w-[200px] text-sm font-semibold ${hasTitleError ? 'border-amber-500' : ''}`}
                                    />
                                    
                                    {/* Seletor de categoria */}
                                    <Select
                                      value={block.type || ''}
                                      onValueChange={(value) => changeBlockType(dayIndex, blockIndex, value)}
                                    >
                                      <SelectTrigger className={`h-8 w-[160px] text-xs ${!block.type ? 'border-amber-500' : ''}`}>
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
                                    
                                    {/* Badge WOD Principal */}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={() => toggleMainWod(dayIndex, blockIndex)}
                                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                                            block.isMainWod
                                              ? 'bg-primary text-primary-foreground'
                                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                          }`}
                                        >
                                          <Star className={`w-3 h-3 ${block.isMainWod ? 'fill-current' : ''}`} />
                                          Principal
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Marcar como WOD principal do dia</p>
                                      </TooltipContent>
                                    </Tooltip>

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

                                  {/* Conteúdo do bloco (preview) */}
                                  <div className="text-sm space-y-1 text-foreground/80">
                                    {(block.lines || []).slice(0, 5).map((line, idx) => (
                                      <p key={idx} className="truncate">
                                        {normalizeRestLineForDisplay(typeof line === 'string' ? line : line?.text || '')}
                                      </p>
                                    ))}
                                    {(block.lines || []).length > 5 && (
                                      <p className="text-muted-foreground text-xs">
                                        ... +{(block.lines || []).length - 5} linhas
                                      </p>
                                    )}
                                  </div>
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

            {/* BOTÕES DE NAVEGAÇÃO */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={goBackToImport} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Editar texto
              </Button>
              <Button
                onClick={handleGoToPreview}
                className="flex-1"
                disabled={!canSaveAndGoToPreview}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Ver preview
              </Button>
            </div>

            {!weekId && (
              <p className="text-xs text-amber-600 text-center">
                ⚠️ Volte e selecione a semana de referência para continuar
              </p>
            )}
          </CardContent>
        </Card>

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

          {/* Lista de dias - SOMENTE effectiveDays */}
          {days.map((dayWorkout, dayIndex) => {
            const dayName = getDayName(dayWorkout.day);
            const isRestDay = Boolean(dayWorkout.isRestDay || restDays[dayIndex]);

            // [RENDER_CHECK] Log obrigatório - dia SEMPRE renderizado
            console.log("[RENDER_CHECK]", {
              day: dayName,
              blocksCount: (dayWorkout.blocks || []).length,
              isRestDay,
            });

            // REGRA: Dia SEMPRE renderizado, independente de erros
            return (
              <div key={`${dayWorkout.day}-${dayIndex}`} className="border rounded-lg overflow-hidden">
                <div className="p-4 bg-secondary/30 flex items-center gap-3">
                  <span className="font-bold text-lg uppercase">{dayName}</span>
                  {isRestDay && (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-600">
                      <Moon className="w-3 h-3 mr-1" />
                      Descanso
                    </Badge>
                  )}
                </div>

                {!isRestDay && (
                  <div className="p-4 space-y-3">
                    {(dayWorkout.blocks || []).map((block, blockIndex) => (
                      <div
                        key={block.id || blockIndex}
                        className={`p-3 rounded-lg border ${block.isMainWod ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
                      >
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-medium">{block.title}</span>
                          {block.isMainWod && (
                            <Badge variant="default" className="text-xs">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Principal
                            </Badge>
                          )}
                          {block.type && (
                            <Badge variant="outline" className="text-xs">
                              {BLOCK_TYPE_OPTIONS.find(o => o.value === block.type)?.label || block.type}
                            </Badge>
                          )}
                        </div>

                        {/* SEPARAÇÃO DETERMINÍSTICA: TREINO vs COMENTÁRIO */}
                        {(() => {
                          const { exerciseLines, commentLines } = separateBlockContent(block.content || '');
                          
                          // [UI_BLOCK] Log obrigatório
                          console.log("[UI_BLOCK]", {
                            title: block.title,
                            hasTraining: exerciseLines.length,
                            hasComment: commentLines.length,
                          });

                          return (
                            <div className="space-y-3">
                              {/* CAIXA 1: TREINO - SEMPRE VISÍVEL */}
                              <div className="text-sm space-y-1 text-foreground/80 pl-2 border-l-2 border-primary/40">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                                  Treino
                                </p>
                                {exerciseLines.length > 0 ? (
                                  exerciseLines.map((line, idx) => (
                                    <p key={`${block.id || blockIndex}-ex-${idx}`}>{normalizeRestLineForDisplay(line)}</p>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground/50 italic">Sem conteúdo de treino.</p>
                                )}
                              </div>

                              {/* CAIXA 2: COMENTÁRIO DO COACH - SEMPRE VISÍVEL */}
                              <div className="text-xs text-muted-foreground p-2 rounded bg-muted/30 border border-border/40 space-y-1">
                                <span className="text-xs font-medium text-muted-foreground/70">💬 Comentário do Coach</span>
                                {commentLines.length > 0 ? (
                                  commentLines.map((line, idx) => (
                                    <p key={`${block.id || blockIndex}-cm-${idx}`} className="italic">{normalizeRestLineForDisplay(line)}</p>
                                  ))
                                ) : (
                                  <p className="text-muted-foreground/50 italic">Sem comentário.</p>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
