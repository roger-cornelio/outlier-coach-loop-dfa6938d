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
import { normalizeRestLineForDisplay } from '@/utils/blockDisplayUtils';
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
    mode,
    rawText,
    weekId,
    parseResult,
    restDays,
    programName,
    workoutsToSave,
    canGoToPreview,
    canSave,
    setRawText,
    setWeekId,
    setParsedResult,
    updateParseResult,
    setRestDays,
    setProgramName,
    goToPreview,
    goBackToEditing,
    clearDraft,
  } = useCoachDraft();

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
    const textareaValue = rawText.trim();
    if (!textareaValue) return;
    
    const dayValidation = validateDayAnchors(textareaValue);
    const inputValidation = validateCoachInput(textareaValue);
    const daysDetected = dayValidation.daysFound.length;
    
    // Parse o texto
    const result = parseStructuredText(textareaValue);
    
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
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DE EDIÇÃO (APENAS TELA 1)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const toggleRestDay = (dayIndex: number, dayName?: string) => {
    const newRestDays = { ...restDays, [dayIndex]: !restDays[dayIndex] };
    setRestDays(newRestDays);
  };

  const toggleMainWod = (dayIndex: number, blockIndex: number) => {
    if (!parseResult || mode !== 'edit') return;
    
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
  };

  const changeBlockType = (dayIndex: number, blockIndex: number, newType: string) => {
    if (!parseResult || mode !== 'edit') return;
    
    const updated = { ...parseResult };
    updated.days[dayIndex].blocks[blockIndex].type = newType as any;
    updateParseResult(updated);
  };

  const changeBlockTitle = (dayIndex: number, blockIndex: number, newTitle: string) => {
    if (!parseResult || mode !== 'edit') return;
    
    const updated = { ...parseResult };
    updated.days[dayIndex].blocks[blockIndex].title = newTitle;
    updated.days[dayIndex].blocks[blockIndex].isAutoGenTitle = false;
    updateParseResult(updated);
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
    setDeleteConfirm(null);
  };

  const saveBlockLines = (dayIndex: number, blockIndex: number, newLines: any[]) => {
    if (!parseResult || mode !== 'edit') return;
    const updated = { ...parseResult };
    updated.days[dayIndex].blocks[blockIndex].lines = newLines;
    updateParseResult(updated);
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

  const canSaveAndGoToPreview = parseResult?.success && 
    !hasInvalidTitles &&
    !hasMissingCategory &&
    !hasStructureErrors &&
    weekId !== null;

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
    if (!workoutsToSave || !weekId) return;
    
    const title = programName.trim() || 'Treino semanal';
    const weekStart = weekId.startDate || null;
    
    console.debug('[TextModelImporter] Salvando e indo para Programações', {
      title,
      weekStart,
      daysCount: workoutsToSave.length,
    });
    
    if (onSaveAndGoToPrograms) {
      const success = await onSaveAndGoToPrograms(workoutsToSave, title, weekStart);
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
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TELA 1 - EDIÇÃO
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (mode === 'edit') {
    return (
      <div className="space-y-4">
        {/* ÁREA DE TEXTO */}
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
              <p className="font-medium text-foreground">Estrutura esperada:</p>
              <div className="grid gap-1.5 mt-2">
                <p><span className="font-medium">SEGUNDA</span> — início do dia</p>
                <p><span className="font-medium">Aquecimento / Força / WOD</span> — nome do bloco</p>
                <p><span className="font-medium">⸻</span> — separador entre blocos (opcional)</p>
              </div>
            </div>

            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Cole aqui o treino da semana inteira (SEGUNDA a DOMINGO)…"
              className="min-h-[180px] text-sm"
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
              <Label htmlFor="program-name">Nome da Programação (opcional)</Label>
              <Input
                id="program-name"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Ex: Semana de força"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleParse}
                disabled={!rawText.trim()}
                variant="outline"
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

        {/* PREVIEW DE EDIÇÃO - COM CONTROLES */}
        {parseResult && parseResult.success && (
          <Card className="border-green-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Edição do Treino
              </CardTitle>
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
                            
                            {/* Toggle de descanso - APENAS NA EDIÇÃO */}
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
                                
                                return (
                                  <div 
                                    key={blockIndex}
                                    id={`block-${dayIndex}-${blockIndex}`}
                                    className={`p-4 rounded-xl border-2 ${
                                      block.isMainWod 
                                        ? 'border-primary/50 bg-primary/5' 
                                        : hasTitleError || !block.type
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
                                      
                                      {/* Botão WOD Principal */}
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant={block.isMainWod ? "default" : "outline"}
                                            size="sm"
                                            className={`h-7 px-2 text-xs ${block.isMainWod ? 'bg-primary' : ''}`}
                                            onClick={() => toggleMainWod(dayIndex, blockIndex)}
                                          >
                                            <Star className={`w-3 h-3 mr-1 ${block.isMainWod ? 'fill-current' : ''}`} />
                                            Principal
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{block.isMainWod ? 'Desmarcar WOD principal' : 'Marcar como WOD principal'}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      
                                      {/* Dropdown de categoria */}
                                      <Select
                                        value={block.type || ''}
                                        onValueChange={(value) => changeBlockType(dayIndex, blockIndex, value)}
                                      >
                                        <SelectTrigger className={`h-7 w-[140px] text-xs ${!block.type ? 'border-amber-500 bg-amber-500/10' : ''}`}>
                                          <SelectValue placeholder="Categoria *" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {BLOCK_TYPE_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      
                                      {/* Menu de ações */}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                            <MoreVertical className="w-4 h-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => setEditingBlock({ dayIndex, blockIndex })}>
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Editar linhas
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={() => setDeleteConfirm({ dayIndex, blockIndex })}
                                            className="text-destructive"
                                            disabled={block.isMainWod}
                                          >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Excluir
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                    
                                    {/* Conteúdo do bloco */}
                                    {block.lines && block.lines.length > 0 && (
                                      <div className="text-sm space-y-1 pl-2 border-l-2 border-border">
                                        {block.lines.slice(0, 5).map((line) => (
                                          <p key={line.id} className="text-foreground/80">
                                            {normalizeRestLineForDisplay(line.text)}
                                          </p>
                                        ))}
                                        {block.lines.length > 5 && (
                                          <p className="text-muted-foreground text-xs">
                                            +{block.lines.length - 5} linhas...
                                          </p>
                                        )}
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

              {/* BANNER DE VALIDAÇÃO */}
              {!canSaveAndGoToPreview && (
                <div className="p-4 bg-amber-500/95 border-2 border-amber-600 rounded-lg">
                  <h3 className="text-base font-bold text-amber-950 flex items-center gap-2 mb-2">
                    ⚠️ Corrija antes de continuar
                  </h3>
                  {hasMissingCategory && (
                    <p className="text-sm text-amber-900">
                      Falta definir a categoria de {blocksWithoutCategory} bloco{blocksWithoutCategory > 1 ? 's' : ''}.
                    </p>
                  )}
                  {hasInvalidTitles && !hasMissingCategory && (
                    <p className="text-sm text-amber-900">
                      Corrija os blocos com problemas de título.
                    </p>
                  )}
                  {hasStructureErrors && !hasMissingCategory && !hasInvalidTitles && (
                    <p className="text-sm text-amber-900">
                      Corrija os erros de estrutura indicados acima.
                    </p>
                  )}
                  {!weekId && !hasMissingCategory && !hasInvalidTitles && !hasStructureErrors && (
                    <p className="text-sm text-amber-900">
                      Selecione a semana de referência.
                    </p>
                  )}
                </div>
              )}

              {/* BOTÃO ÚNICO: SALVAR E IR PARA PREVIEW */}
              <Button 
                onClick={handleGoToPreview} 
                className="w-full"
                size="lg"
                disabled={!canSaveAndGoToPreview}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Salvar e ir para preview
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Modais */}
        <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir bloco?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteConfirm && deleteBlock(deleteConfirm.dayIndex, deleteConfirm.blockIndex)}
                className="bg-destructive"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {editingBlock && parseResult && (
          <BlockEditorModal
            open={true}
            onOpenChange={(open) => !open && setEditingBlock(null)}
            blockTitle={parseResult.days[editingBlock.dayIndex].blocks[editingBlock.blockIndex].title}
            lines={parseResult.days[editingBlock.dayIndex].blocks[editingBlock.blockIndex].lines || []}
            onSave={(newLines) => saveBlockLines(editingBlock.dayIndex, editingBlock.blockIndex, newLines)}
          />
        )}

        {/* Modal de template */}
        <AlertDialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
          <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-primary" />
                📋 Modelo recomendado
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className="bg-muted/50 rounded-lg p-4 text-xs font-mono whitespace-pre-wrap border">
{`SEGUNDA-FEIRA

Aquecimento
- 500m Run
- 3 Rounds: 15 Bom Dia, 20 Avanços

⸻

WOD
- EMOM 30'
  Min 1: 10 Burpee
  Min 2: 15 Wall Balls

⸻

TERÇA-FEIRA

Força
- 5x5 Back Squat

⸻

QUINTA-FEIRA

Descanso`}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                navigator.clipboard.writeText(`SEGUNDA-FEIRA\n\nAquecimento\n- 500m Run\n\n⸻\n\nWOD\n- For Time: 21-15-9 Thrusters, Pull-ups\n\n⸻\n\nTERÇA-FEIRA\n\nDescanso`);
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
  // TELA 2 - PREVIEW (100% READ-ONLY)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (mode === 'preview') {
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

          {/* Lista de dias - SEM CONTROLES */}
          {parseResult?.days.map((day, dayIndex) => {
            const dayName = day.day ? getDayName(day.day) : 'Dia';
            const isRestDay = restDays[dayIndex] || false;
            
            return (
              <div key={dayIndex} className="border rounded-lg overflow-hidden">
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
                    {day.blocks.map((block, blockIndex) => (
                      <div 
                        key={blockIndex}
                        className={`p-3 rounded-lg border ${block.isMainWod ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
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
                        {block.lines && block.lines.length > 0 && (
                          <div className="text-sm space-y-1 text-foreground/80">
                            {block.lines.map((line) => (
                              <p key={line.id}>{normalizeRestLineForDisplay(line.text)}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Resumo */}
          <p className="text-sm text-muted-foreground text-center">
            {parseResult?.days.length || 0} dia(s) • {Object.values(restDays).filter(Boolean).length} de descanso
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

  // Fallback
  return null;
}
