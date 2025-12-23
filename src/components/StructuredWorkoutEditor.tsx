/**
 * StructuredWorkoutEditor - Editor estruturado de treino completo
 * 
 * MODELO ANTI-BURRO:
 * - Cada bloco deve ter campos obrigatórios preenchidos
 * - Validação bloqueia SALVAR e PUBLICAR se inválido
 * - Mantém compatibilidade com WOD Principal e Benchmark
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Save, Send, AlertTriangle, CheckCircle, Star, Trophy, Trash2, HelpCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  StructuredBlockEditor, 
  StructuredBlock, 
  createEmptyStructuredBlock,
  validateAllBlocks,
  structuredToWorkoutBlock,
  workoutBlockToStructured,
  isBlockValid,
} from './StructuredBlockEditor';
import { WeekPeriodSelector, WeekPeriod } from './WeekPeriodSelector';
import { identifyMainBlock } from '@/utils/mainBlockIdentifier';
import type { DayOfWeek, DayWorkout, WorkoutBlock } from '@/types/outlier';

// ============================================
// TIPOS
// ============================================

interface StructuredDay {
  day: DayOfWeek;
  blocks: StructuredBlock[];
}

interface DayValidation {
  hasMainWod: boolean;
  allBlocksValid: boolean;
  errorCount: number;
  multipleMainBlocks: boolean;
}

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'seg', label: 'Segunda' },
  { value: 'ter', label: 'Terça' },
  { value: 'qua', label: 'Quarta' },
  { value: 'qui', label: 'Quinta' },
  { value: 'sex', label: 'Sexta' },
  { value: 'sab', label: 'Sábado' },
  { value: 'dom', label: 'Domingo' },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

interface StructuredWorkoutEditorProps {
  onSave: (workouts: DayWorkout[], title: string, status: 'draft' | 'published', weekStart: string | null) => Promise<boolean>;
  onPublishToAthletes?: (workouts: DayWorkout[], title: string, weekStart: string | null) => void;
  isSaving?: boolean;
  linkedAthletesCount?: number;
}

export function StructuredWorkoutEditor({
  onSave,
  onPublishToAthletes,
  isSaving = false,
  linkedAthletesCount = 0,
}: StructuredWorkoutEditorProps) {
  // Estado dos dias
  const [days, setDays] = useState<StructuredDay[]>([]);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [showValidation, setShowValidation] = useState(false);
  
  // Metadados
  const [programName, setProgramName] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<WeekPeriod | null>(null);
  
  // Mensagens
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ============================================
  // VALIDAÇÃO GLOBAL
  // ============================================

  const validation = useMemo(() => {
    const dayValidations: Record<DayOfWeek, DayValidation & { multipleMainBlocks: boolean }> = {} as any;
    let totalErrors = 0;
    let daysWithoutMain = 0;
    let daysWithMultipleMain = 0;

    for (const day of days) {
      // Validar todos os blocos
      const blockValidation = validateAllBlocks(day.blocks);
      totalErrors += blockValidation.blockErrors.reduce((sum, b) => sum + b.errors.length, 0);

      // Verificar WOD Principal
      const workoutBlocks = day.blocks.map(structuredToWorkoutBlock);
      const mainBlock = identifyMainBlock(workoutBlocks);
      const manualMainCount = day.blocks.filter(b => b.isMainWod === true).length;
      const hasManualMain = manualMainCount > 0;
      const hasMain = hasManualMain || mainBlock.blockIndex !== -1;
      const multipleMainBlocks = manualMainCount > 1;

      if (multipleMainBlocks) {
        daysWithMultipleMain++;
      }

      if (!hasMain && day.blocks.length > 0) {
        daysWithoutMain++;
      }

      dayValidations[day.day] = {
        hasMainWod: hasMain,
        allBlocksValid: blockValidation.isValid,
        errorCount: blockValidation.blockErrors.reduce((sum, b) => sum + b.errors.length, 0),
        multipleMainBlocks,
      };
    }

    return {
      dayValidations,
      totalErrors,
      daysWithoutMain,
      daysWithMultipleMain,
      hasAnyDay: days.length > 0,
      hasWeek: selectedWeek !== null,
      canSave: days.length > 0 && 
               selectedWeek !== null && 
               totalErrors === 0 && 
               daysWithoutMain === 0,
    };
  }, [days, selectedWeek]);

  // ============================================
  // HANDLERS
  // ============================================

  const addDay = useCallback((dayValue: DayOfWeek) => {
    // Não adicionar se já existe
    if (days.some(d => d.day === dayValue)) return;

    setDays(prev => [
      ...prev,
      {
        day: dayValue,
        blocks: [createEmptyStructuredBlock()],
      },
    ].sort((a, b) => {
      const order = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
      return order.indexOf(a.day) - order.indexOf(b.day);
    }));
  }, [days]);

  const removeDay = useCallback((dayValue: DayOfWeek) => {
    setDays(prev => prev.filter(d => d.day !== dayValue));
  }, []);

  const addBlockToDay = useCallback((dayValue: DayOfWeek) => {
    setDays(prev => prev.map(day => {
      if (day.day !== dayValue) return day;
      const newBlock = createEmptyStructuredBlock();
      setExpandedBlocks(e => new Set([...e, newBlock.id]));
      return {
        ...day,
        blocks: [...day.blocks, newBlock],
      };
    }));
  }, []);

  const removeBlockFromDay = useCallback((dayValue: DayOfWeek, blockId: string) => {
    setDays(prev => prev.map(day => {
      if (day.day !== dayValue) return day;
      return {
        ...day,
        blocks: day.blocks.filter(b => b.id !== blockId),
      };
    }));
  }, []);

  const updateBlock = useCallback((dayValue: DayOfWeek, blockId: string, updates: Partial<StructuredBlock>) => {
    setDays(prev => prev.map(day => {
      if (day.day !== dayValue) return day;
      return {
        ...day,
        blocks: day.blocks.map(block => 
          block.id === blockId ? { ...block, ...updates } : block
        ),
      };
    }));
  }, []);

  const toggleMainWod = useCallback((dayValue: DayOfWeek, blockId: string) => {
    setDays(prev => prev.map(day => {
      if (day.day !== dayValue) return day;
      return {
        ...day,
        blocks: day.blocks.map(block => ({
          ...block,
          isMainWod: block.id === blockId ? !block.isMainWod : false,
        })),
      };
    }));
  }, []);

  const toggleBenchmark = useCallback((dayValue: DayOfWeek, blockId: string) => {
    setDays(prev => prev.map(day => {
      if (day.day !== dayValue) return day;
      return {
        ...day,
        blocks: day.blocks.map(block => 
          block.id === blockId ? { ...block, isBenchmark: !block.isBenchmark } : block
        ),
      };
    }));
  }, []);

  const toggleBlockExpand = useCallback((blockId: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  }, []);

  // ============================================
  // SAVE/PUBLISH
  // ============================================

  const convertToDayWorkouts = useCallback((): DayWorkout[] => {
    return days.map(day => ({
      day: day.day,
      stimulus: '',
      estimatedTime: 60,
      blocks: day.blocks.map(structuredToWorkoutBlock),
    }));
  }, [days]);

  const handleSave = useCallback(async (status: 'draft' | 'published') => {
    setShowValidation(true);
    setError(null);

    if (!validation.canSave) {
      if (!validation.hasWeek) {
        setError('Selecione a semana de referência');
      } else if (validation.totalErrors > 0) {
        setError(`Corrija os ${validation.totalErrors} erro(s) nos blocos antes de salvar`);
      } else if (validation.daysWithoutMain > 0) {
        setError('Defina o WOD Principal em todos os dias');
      } else {
        setError('Adicione pelo menos um dia com blocos');
      }
      return;
    }

    const workouts = convertToDayWorkouts();
    const title = programName.trim() || 'Treino semanal';
    const weekStart = selectedWeek?.startDate || null;

    const success = await onSave(workouts, title, status, weekStart);
    
    if (success) {
      setSuccess(`Treino salvo como ${status === 'published' ? 'publicado' : 'rascunho'}!`);
      // Reset
      setDays([]);
      setProgramName('');
      setSelectedWeek(null);
      setShowValidation(false);
    }
  }, [validation, convertToDayWorkouts, programName, selectedWeek, onSave]);

  const handlePublishToAthletes = useCallback(() => {
    if (!validation.canSave || !onPublishToAthletes) return;
    
    const workouts = convertToDayWorkouts();
    const title = programName.trim() || `Semana ${selectedWeek?.label || ''}`;
    const weekStart = selectedWeek?.startDate || null;
    
    onPublishToAthletes(workouts, title, weekStart);
  }, [validation.canSave, onPublishToAthletes, convertToDayWorkouts, programName, selectedWeek]);

  // ============================================
  // RENDER
  // ============================================

  const availableDays = DAYS.filter(d => !days.some(day => day.day === d.value));

  return (
    <div className="space-y-6">
      {/* Mensagens */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </motion.div>
        )}
        
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-green-500/10 border border-green-500/20"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-sm text-green-500">{success}</p>
            </div>
          </motion.div>
        )}

        {/* Alerta de múltiplos WOD Principal no mesmo dia */}
        {validation.daysWithMultipleMain > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-600">
                Atenção: {validation.daysWithMultipleMain} dia(s) com múltiplos blocos marcados como "Principal". 
                Recomendamos apenas um bloco principal por dia.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy educativa colapsável */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors text-left">
            <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-foreground">Como organizar o treino por dia da semana</span>
            <HelpCircle className="w-4 h-4 text-muted-foreground ml-auto" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 p-4 rounded-lg border border-border bg-muted/30 space-y-4 text-sm text-muted-foreground">
            <p className="text-foreground font-medium">
              No OUTLIER, todo treino precisa estar vinculado a um dia da semana.
            </p>
            
            <div>
              <p className="font-medium text-foreground mb-1">Por quê?</p>
              <p>
                O app ajusta carga, volume e frequência com base na distribuição real dos treinos ao longo da semana.
              </p>
              <p>
                Sem o dia correto, o ajuste do atleta perde precisão.
              </p>
            </div>
            
            <div>
              <p className="font-medium text-foreground mb-1">Como estruturar corretamente:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Primeiro escolha o dia da semana (Seg–Dom)</li>
                <li>Depois adicione os blocos daquele dia</li>
                <li>Cada bloco sempre pertence a um único dia</li>
              </ul>
            </div>
            
            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
              <p className="font-medium text-amber-600 mb-1">Importante:</p>
              <p className="text-amber-600/90">
                Blocos criados fora de um dia não são considerados no ajuste do treino e impedem salvar ou publicar a programação.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Adicionar dia */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg">Criar Treino Estruturado</CardTitle>
            {availableDays.length > 0 && (
              <Select onValueChange={(v) => addDay(v as DayOfWeek)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Adicionar dia" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {availableDays.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {days.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Selecione um dia para começar</p>
            </div>
          ) : (
            <div className="space-y-6">
              {days.map((day) => {
                const dayLabel = DAYS.find(d => d.value === day.day)?.label || day.day;
                const dayValidation = validation.dayValidations[day.day];

                return (
                  <div key={day.day} className="border border-border rounded-lg overflow-hidden">
                    {/* Header do dia */}
                    <div className="p-3 bg-secondary/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{dayLabel}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {day.blocks.length} bloco(s)
                        </span>
                        {dayValidation && dayValidation.multipleMainBlocks && (
                          <span className="text-xs text-amber-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Múltiplos WOD Principal
                          </span>
                        )}
                        {dayValidation && !dayValidation.hasMainWod && day.blocks.length > 0 && (
                          <span className="text-xs text-amber-500 flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Falta WOD Principal
                          </span>
                        )}
                        {dayValidation && dayValidation.errorCount > 0 && (
                          <span className="text-xs text-destructive">
                            {dayValidation.errorCount} erro(s)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addBlockToDay(day.day)}
                          className="h-7 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Bloco
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDay(day.day)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Blocos do dia */}
                    <div className="p-3 space-y-3 bg-background">
                      {day.blocks.map((block) => (
                        <div key={block.id} className="space-y-2">
                          {/* Botões Principal/Benchmark acima do editor */}
                          <div className="flex items-center gap-2 justify-end">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant={block.isMainWod ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => toggleMainWod(day.day, block.id)}
                                    className={`h-7 text-xs ${block.isMainWod ? 'bg-primary' : ''}`}
                                  >
                                    <Star className={`w-3 h-3 mr-1 ${block.isMainWod ? 'fill-current' : ''}`} />
                                    Principal
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Marcar como WOD Principal do dia</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant={block.isBenchmark ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => toggleBenchmark(day.day, block.id)}
                                    className={`h-7 text-xs ${block.isBenchmark ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                                  >
                                    <Trophy className="w-3 h-3 mr-1" />
                                    Benchmark
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Marcar para acompanhar evolução do atleta</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          <StructuredBlockEditor
                            block={block}
                            onChange={(updated) => updateBlock(day.day, block.id, updated)}
                            onRemove={day.blocks.length > 1 ? () => removeBlockFromDay(day.day, block.id) : undefined}
                            showValidation={showValidation}
                            isExpanded={expandedBlocks.has(block.id)}
                            onToggleExpand={() => toggleBlockExpand(block.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurações de salvamento */}
      {days.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Semana */}
            <WeekPeriodSelector
              selectedWeek={selectedWeek}
              onWeekSelect={setSelectedWeek}
            />

            {/* Nome do programa */}
            <div className="space-y-2">
              <Label>Nome do Programa (opcional)</Label>
              <Input
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Ex: Construção Aeróbia"
              />
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-1">
                      <Button
                        onClick={() => handleSave('draft')}
                        disabled={isSaving || !validation.canSave}
                        variant="outline"
                        className="w-full"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Rascunho
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!validation.canSave && (
                    <TooltipContent>
                      <p>
                        {!validation.hasWeek 
                          ? 'Selecione a semana' 
                          : validation.totalErrors > 0 
                            ? 'Corrija os erros nos blocos'
                            : 'Defina WOD Principal em todos os dias'
                        }
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-1">
                      <Button
                        onClick={() => handleSave('published')}
                        disabled={isSaving || !validation.canSave}
                        className="w-full"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Publicar
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!validation.canSave && (
                    <TooltipContent>
                      <p>
                        {!validation.hasWeek 
                          ? 'Selecione a semana' 
                          : validation.totalErrors > 0 
                            ? 'Corrija os erros nos blocos'
                            : 'Defina WOD Principal em todos os dias'
                        }
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              {onPublishToAthletes && linkedAthletesCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-1">
                        <Button
                          onClick={handlePublishToAthletes}
                          disabled={isSaving || !validation.canSave}
                          variant="secondary"
                          className="w-full"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Enviar para Atletas
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {!validation.canSave && (
                      <TooltipContent>
                        <p>Complete todos os campos obrigatórios</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
