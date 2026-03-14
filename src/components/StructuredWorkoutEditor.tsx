/**
 * StructuredWorkoutEditor - Editor estruturado de treino completo
 *
 * MODELO ANTI-BURRO:
 * - Cada bloco deve ter campos obrigatórios preenchidos
 * - Validação bloqueia SALVAR e PUBLICAR se inválido
 * - Mantém compatibilidade com WOD Principal
 *
 * REGRA MVP0: Benchmark só pode ser definido por ADMIN.
 * Coach não vê, não marca, não salva isBenchmark.
 */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Save, Send, AlertTriangle, CheckCircle, Star, Trash2, HelpCircle, Calendar, Moon, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import {
  StructuredBlockEditor,
  StructuredBlock,
  createEmptyStructuredBlock,
  validateAllBlocks,
  structuredToWorkoutBlock,
  workoutBlockToStructured,
  isBlockValid,
} from "./StructuredBlockEditor";
import { WeekPeriodSelector, WeekPeriod } from "./WeekPeriodSelector";
import { StructuredEditorDebugBar } from "./StructuredEditorDebugBar";
import { identifyMainBlock } from "@/utils/mainBlockIdentifier";
import type { DayOfWeek, DayWorkout, WorkoutBlock } from "@/types/outlier";
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";
import { useAuth } from "@/hooks/useAuth";

// ============================================
// TIPOS
// ============================================

interface StructuredDay {
  day: DayOfWeek;
  blocks: StructuredBlock[];
  isRestDay?: boolean; // MVP0: Dia de descanso não exige WOD Principal
}

interface DayValidation {
  hasMainWod: boolean;
  allBlocksValid: boolean;
  errorCount: number;
  multipleMainBlocks: boolean;
}

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "seg", label: "Segunda" },
  { value: "ter", label: "Terça" },
  { value: "qua", label: "Quarta" },
  { value: "qui", label: "Quinta" },
  { value: "sex", label: "Sexta" },
  { value: "sab", label: "Sábado" },
  { value: "dom", label: "Domingo" },
];

// Day names map for display
const DAY_NAMES: Record<DayOfWeek, string> = {
  seg: "Segunda",
  ter: "Terça",
  qua: "Quarta",
  qui: "Quinta",
  sex: "Sexta",
  sab: "Sábado",
  dom: "Domingo",
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

interface StructuredWorkoutEditorProps {
  onSave: (
    workouts: DayWorkout[],
    title: string,
    status: "draft" | "published",
    weekStart: string | null,
  ) => Promise<boolean>;
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
  // ============================================
  // EXERCISE LIBRARY (physics-based)
  // ============================================
  const { user } = useAuth();
  const { exercises: libExercises, patterns: libPatterns, createCustomExercise } = useExerciseLibrary(user?.id);
  const exerciseLibrary = useMemo(() => ({
    exercises: libExercises,
    patterns: libPatterns,
    createCustomExercise,
  }), [libExercises, libPatterns, createCustomExercise]);

  // ============================================
  // ESTADO INICIAL: Criar Day 1 (Segunda) automaticamente
  // FIX MVP0: Editor nunca pode iniciar vazio/sumido
  // ============================================

  // Função para criar estado inicial (usada no useState e no reset)
  const createFreshInitialState = () => {
    const firstBlock = createEmptyStructuredBlock();
    return {
      days: [
        {
          day: "seg" as DayOfWeek,
          blocks: [firstBlock],
          isRestDay: false,
        },
      ] as StructuredDay[],
      expandedBlockId: firstBlock.id,
    };
  };

  // Criar estado inicial UMA VEZ (memo para evitar re-criação)
  const [initialState] = useState(createFreshInitialState);

  // Estado dos dias - inicializa com Day 1 para o editor nunca ficar vazio
  const [days, setDays] = useState<StructuredDay[]>(initialState.days);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set([initialState.expandedBlockId]));
  const [showValidation, setShowValidation] = useState(false);

  // Metadados
  const [programName, setProgramName] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<WeekPeriod | null>(null);

  // Mensagens
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Debug: ID do dia selecionado (para DebugBar)
  const selectedDayId = days.length > 0 ? days[0].day : null;

  // ============================================
  // VALIDAÇÃO GLOBAL
  // ============================================

  const validation = useMemo(() => {
    const dayValidations: Record<DayOfWeek, DayValidation & { multipleMainBlocks: boolean; isRestDay: boolean; missingCategory: boolean }> =
      {} as any;
    let totalErrors = 0;
    let daysWithoutMain = 0;
    let daysWithMultipleMain = 0;
    let daysWithMissingCategory = 0;

    for (const day of days) {
      // MVP0: Dias de descanso NÃO exigem WOD Principal e NÃO contam erros de validação de WOD
      const isRestDay = day.isRestDay === true;

      // Validar todos os blocos
      const blockValidation = validateAllBlocks(day.blocks);
      totalErrors += blockValidation.blockErrors.reduce((sum, b) => sum + b.errors.length, 0);

      // Verificar se todos os blocos têm categoria/tipo (OBRIGATÓRIO para dias não-descanso)
      const blocksWithoutCategory = isRestDay ? 0 : day.blocks.filter((b) => !b.type).length;
      const hasMissingCategory = blocksWithoutCategory > 0;
      if (hasMissingCategory) {
        daysWithMissingCategory++;
      }

      // Verificar WOD Principal - APENAS para dias de treino (não descanso)
      const workoutBlocks = day.blocks.map(structuredToWorkoutBlock);
      const mainBlock = identifyMainBlock(workoutBlocks);
      const manualMainCount = day.blocks.filter((b) => b.isMainWod === true).length;
      const hasManualMain = manualMainCount > 0;
      const hasMain = hasManualMain || mainBlock.blockIndex !== -1;
      const multipleMainBlocks = manualMainCount > 1;

      // MVP0: Só contar problemas de WOD para dias que NÃO são descanso
      if (!isRestDay) {
        if (multipleMainBlocks) {
          daysWithMultipleMain++;
        }

        if (!hasMain && day.blocks.length > 0) {
          daysWithoutMain++;
        }
      }

      dayValidations[day.day] = {
        hasMainWod: isRestDay ? true : hasMain, // Descanso sempre "tem" WOD (não precisa)
        allBlocksValid: blockValidation.isValid,
        errorCount: blockValidation.blockErrors.reduce((sum, b) => sum + b.errors.length, 0),
        multipleMainBlocks: isRestDay ? false : multipleMainBlocks,
        isRestDay,
        missingCategory: hasMissingCategory,
      };
    }

    // ════════════════════════════════════════════════════════════════════════════
    // REGRA DE PUBLICAÇÃO SEMANAL (V3):
    // - Permite 1-7 dias com conteúdo (não exige semana completa)
    // - Dias vazios NÃO bloqueiam publicação
    // - Bloqueia APENAS se:
    //   (A) Semana vazia (0 dias com conteúdo) → anti-acidente
    //   (B) Qualquer dia com conteúdo tem bloco sem categoria (exceto descanso)
    //   (C) Qualquer dia não-descanso não tem bloco Principal
    // ════════════════════════════════════════════════════════════════════════════

    // Contar dias com conteúdo (pelo menos 1 bloco)
    const daysWithContent = days.filter((d) => d.blocks.length > 0);
    const daysEmpty = days.filter((d) => d.blocks.length === 0);

    // Erros APENAS em dias com conteúdo (incluindo categoria + principal)
    const errorsInContentDays = Object.entries(dayValidations)
      .filter(([dayKey, val]) => {
        const dayData = days.find((d) => d.day === dayKey);
        return dayData && dayData.blocks.length > 0 && !val.isRestDay;
      })
      .reduce((sum, [, val]) => {
        let count = val.errorCount;
        if (!val.hasMainWod) count++;
        if (val.multipleMainBlocks) count++;
        if (val.missingCategory) count++;
        return sum + count;
      }, 0);

    // Pode salvar/publicar se:
    // - Tem pelo menos 1 dia com conteúdo (não vazio)
    // - Semana selecionada
    // - Nenhum erro nos dias com conteúdo
    const canPublish = daysWithContent.length >= 1 && selectedWeek !== null && errorsInContentDays === 0;

    // Log de diagnóstico (apenas em debug)
    if (import.meta.env?.DEV && import.meta.env?.VITE_DEBUG_PARSER === 'true') {
      console.log("[PUBLISH_GUARD]", {
        daysWithContent: daysWithContent.length,
        daysEmpty: daysEmpty.length,
        errorsInContentDays,
        daysWithMissingCategory,
        daysWithoutMain,
        canPublish,
      });
    }

    return {
      dayValidations,
      totalErrors,
      daysWithoutMain,
      daysWithMultipleMain,
      daysWithMissingCategory,
      hasAnyDay: days.length > 0,
      hasWeek: selectedWeek !== null,
      canSave: canPublish, // Usa a nova lógica
      daysWithContent: daysWithContent.length,
      daysEmpty: daysEmpty.length,
      errorsInContentDays,
    };
  }, [days, selectedWeek]);

  // ============================================
  // HANDLERS
  // ============================================

  const addDay = useCallback(
    (dayValue: DayOfWeek) => {
      // Não adicionar se já existe
      if (days.some((d) => d.day === dayValue)) return;

      setDays((prev) =>
        [
          ...prev,
          {
            day: dayValue,
            blocks: [createEmptyStructuredBlock()],
          },
        ].sort((a, b) => {
          const order = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
          return order.indexOf(a.day) - order.indexOf(b.day);
        }),
      );
    },
    [days],
  );

  const removeDay = useCallback((dayValue: DayOfWeek) => {
    setDays((prev) => prev.filter((d) => d.day !== dayValue));
  }, []);

  const addBlockToDay = useCallback((dayValue: DayOfWeek) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.day !== dayValue) return day;
        const newBlock = createEmptyStructuredBlock();
        setExpandedBlocks((e) => new Set([...e, newBlock.id]));
        return {
          ...day,
          blocks: [...day.blocks, newBlock],
        };
      }),
    );
  }, []);

  const removeBlockFromDay = useCallback((dayValue: DayOfWeek, blockId: string) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.day !== dayValue) return day;
        return {
          ...day,
          blocks: day.blocks.filter((b) => b.id !== blockId),
        };
      }),
    );
  }, []);

  const updateBlock = useCallback((dayValue: DayOfWeek, blockId: string, updates: Partial<StructuredBlock>) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.day !== dayValue) return day;
        return {
          ...day,
          blocks: day.blocks.map((block) => (block.id === blockId ? { ...block, ...updates } : block)),
        };
      }),
    );
  }, []);

  const toggleMainWod = useCallback((dayValue: DayOfWeek, blockId: string) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.day !== dayValue) return day;
        // MVP0: Não permitir marcar Principal em dia de descanso
        if (day.isRestDay) return day;
        return {
          ...day,
          blocks: day.blocks.map((block) => ({
            ...block,
            isMainWod: block.id === blockId ? !block.isMainWod : false,
          })),
        };
      }),
    );
  }, []);

  // MVP0: Toggle dia de descanso
  const toggleRestDay = useCallback((dayValue: DayOfWeek) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.day !== dayValue) return day;
        const newIsRestDay = !day.isRestDay;
        return {
          ...day,
          isRestDay: newIsRestDay,
          // MVP0: Se marcar como descanso, limpar isMainWod de todos os blocos
          blocks: newIsRestDay ? day.blocks.map((block) => ({ ...block, isMainWod: false })) : day.blocks,
        };
      }),
    );
  }, []);

  // REGRA MVP0: Benchmark removido do Coach - apenas Admin pode definir
  // toggleBenchmark foi removido intencionalmente

  const toggleBlockExpand = useCallback((blockId: string) => {
    setExpandedBlocks((prev) => {
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
    return days.map((day) => ({
      day: day.day,
      stimulus: "",
      estimatedTime: 60,
      blocks: day.blocks.map(structuredToWorkoutBlock),
      isRestDay: day.isRestDay || false, // MVP0: Preservar flag de descanso
    }));
  }, [days]);

  const handleSave = useCallback(
    async (status: "draft" | "published") => {
      setShowValidation(true);
      setError(null);

      // Log de diagnóstico no clique de publicar
      const reason = !validation.hasWeek
        ? "NO_WEEK"
        : (validation.daysWithContent ?? 0) === 0
          ? "EMPTY_WEEK"
          : (validation.errorsInContentDays ?? 0) > 0
            ? "HAS_ERRORS"
            : "OK";

      console.log("[PUBLISH_CLICK]", {
        canPublish: validation.canSave,
        reason,
        status,
      });

      if (!validation.canSave) {
        if (!validation.hasWeek) {
          setError("Selecione a semana de referência");
        } else if ((validation.daysWithContent ?? 0) === 0) {
          // T0: Semana vazia - anti-acidente
          setError("Adicione pelo menos 1 dia de treino para publicar a semana.");
        } else if ((validation.daysWithMissingCategory ?? 0) > 0) {
          // Categoria obrigatória
          setError(`${validation.daysWithMissingCategory} dia(s) com blocos sem categoria selecionada.`);
        } else if ((validation.daysWithoutMain ?? 0) > 0) {
          // WOD Principal obrigatório
          setError(`${validation.daysWithoutMain} dia(s) sem bloco Principal marcado.`);
        } else if ((validation.daysWithMultipleMain ?? 0) > 0) {
          // Múltiplos principais
          setError(`${validation.daysWithMultipleMain} dia(s) com múltiplos blocos Principal.`);
        } else if ((validation.errorsInContentDays ?? 0) > 0) {
          // Outros erros
          setError(`Corrija os erros nos dias com conteúdo antes de ${status === "published" ? "publicar" : "salvar"}`);
        } else {
          setError("Verifique os dias com conteúdo");
        }
        return;
      }

      const workouts = convertToDayWorkouts();
      const title = programName.trim() || "Treino semanal";
      const weekStart = selectedWeek?.startDate || null;

      const success = await onSave(workouts, title, status, weekStart);

      if (success) {
        setSuccess(`Treino salvo como ${status === "published" ? "publicado" : "rascunho"}!`);
        // Reset - reiniciar com Day 1 para o editor nunca ficar vazio
        const freshState = createFreshInitialState();
        setDays(freshState.days);
        setExpandedBlocks(new Set([freshState.expandedBlockId]));
        setProgramName("");
        setSelectedWeek(null);
        setShowValidation(false);
      }
    },
    [validation, convertToDayWorkouts, programName, selectedWeek, onSave],
  );

  const handlePublishToAthletes = useCallback(() => {
    if (!validation.canSave || !onPublishToAthletes) return;

    const workouts = convertToDayWorkouts();
    const title = programName.trim() || `Semana ${selectedWeek?.label || ""}`;
    const weekStart = selectedWeek?.startDate || null;

    onPublishToAthletes(workouts, title, weekStart);
  }, [validation.canSave, onPublishToAthletes, convertToDayWorkouts, programName, selectedWeek]);

  // ============================================
  // RENDER
  // ============================================

  const availableDays = DAYS.filter((d) => !days.some((day) => day.day === d.value));

  // Total de blocos para debug
  const totalBlocks = days.reduce((acc, day) => acc + day.blocks.length, 0);

  return (
    <div className="space-y-6 pb-16">
      {" "}
      {/* pb-16 para dar espaço à DebugBar */}
      {/* DEBUG BAR TEMPORÁRIA */}
      <StructuredEditorDebugBar
        mode="edit"
        isStructured={true}
        daysCount={days.length}
        selectedDayId={selectedDayId}
        editorRendered={days.length > 0}
        blocksCount={totalBlocks}
      />
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

        {/* Alerta de blocos sem categoria */}
        {validation.daysWithMissingCategory > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">
                {validation.daysWithMissingCategory} dia(s) com blocos sem categoria. Selecione a categoria de cada bloco.
              </p>
            </div>
          </motion.div>
        )}

        {/* Alerta de dias sem WOD Principal */}
        {validation.daysWithoutMain > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">
                {validation.daysWithoutMain} dia(s) sem bloco Principal. Marque um bloco como Principal em cada dia.
              </p>
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
              <p>Sem o dia correto, o ajuste do atleta perde precisão.</p>
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
                Blocos criados fora de um dia não são considerados no ajuste do treino e impedem salvar ou publicar a
                programação.
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
                const dayLabel = DAYS.find((d) => d.value === day.day)?.label || day.day;
                const dayValidation = validation.dayValidations[day.day];

                // REGRA: Dia SEMPRE renderizado, erros afetam APENAS estilo visual e publicação
                return (
                  <div key={day.day} className="border border-border rounded-lg overflow-hidden">
                    {/* Header do dia */}
                    <div className="p-3 bg-secondary/30 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{dayLabel}</Badge>
                        <span className="text-sm text-muted-foreground">{day.blocks.length} bloco(s)</span>

                        {/* MVP0: Badge de descanso */}
                        {day.isRestDay && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 border border-blue-500/30">
                            <Moon className="w-3 h-3 mr-1" />
                            DESCANSO
                          </Badge>
                        )}

                        {/* Alertas - NÃO mostrar para dias de descanso */}
                        {!day.isRestDay && dayValidation && dayValidation.multipleMainBlocks && (
                          <span className="text-xs text-amber-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Múltiplos WOD Principal
                          </span>
                        )}
                        {!day.isRestDay && dayValidation && !dayValidation.hasMainWod && day.blocks.length > 0 && (
                          <span className="text-xs text-amber-500 flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Falta WOD Principal
                          </span>
                        )}
                        {dayValidation && dayValidation.errorCount > 0 && (
                          <span className="text-xs text-destructive">{dayValidation.errorCount} erro(s)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* MVP0: Toggle descanso */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Descanso</span>
                                <Switch
                                  checked={day.isRestDay || false}
                                  onCheckedChange={() => toggleRestDay(day.day)}
                                  className="data-[state=checked]:bg-blue-500"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Dias de descanso não possuem WOD principal.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

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
                      {/* MVP0: Mensagem para dia de descanso — Copy padronizada Coach/Admin */}
                      {day.isRestDay && (
                        <div className="p-5 rounded-xl bg-blue-500/10 border-2 border-blue-500/30 space-y-3">
                          <div className="flex items-center gap-3">
                            <Moon className="w-6 h-6 text-blue-500" />
                            <p className="text-sm text-blue-600 font-semibold">
                              🌙 Dia de descanso — {DAY_NAMES[day.day].toUpperCase()}
                            </p>
                          </div>
                          <p className="text-sm text-foreground/80">Este dia está marcado como descanso.</p>
                          <p className="text-sm text-muted-foreground">
                            O treino não será considerado ativo, mas o atleta pode executar e registrar normalmente.
                          </p>
                          <p className="text-xs text-blue-500/80 pt-2 border-t border-blue-500/20">
                            💡 Para tornar o treino obrigatório, desative o descanso deste dia.
                          </p>
                        </div>
                      )}

                      {day.blocks.map((block) => {
                        // [RENDER_BLOCK] Log obrigatório - bloco SEMPRE renderizado
                        console.log(
                          `[RENDER_BLOCK] title="${
                            (block.title || "").replace(/^[=<>-]+\s*/, "") || "Bloco"
                          }" rendered=true`,
                        );

                        // ═══════════════════════════════════════════════════════════
                        // NOTAS/COMENTÁRIO: Renderização visual discreta
                        // Sem header, sem ações, sem container de bloco padrão
                        // ═══════════════════════════════════════════════════════════
                        if (block.type === "notas") {
                          const commentText = block.coachNotes || "";
                          if (!commentText.trim()) return null;
                          
                          return (
                            <div
                              key={block.id}
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
                          <div key={block.id} className="space-y-2">
                            {/* Botões Principal/Benchmark acima do editor */}
                            {/* MVP0: Ocultar botão Principal para dias de descanso */}
                            {!day.isRestDay && (
                              <div className="flex items-center gap-2 justify-end">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant={block.isMainWod ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => toggleMainWod(day.day, block.id)}
                                        className={`h-7 text-xs ${block.isMainWod ? "bg-primary" : ""}`}
                                      >
                                        <Star className={`w-3 h-3 mr-1 ${block.isMainWod ? "fill-current" : ""}`} />
                                        Principal
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Marcar como WOD Principal do dia</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {/* REGRA MVP0: Benchmark removido do Coach - apenas Admin pode definir */}
                              </div>
                            )}

                            <StructuredBlockEditor
                              block={block}
                              onChange={(updated) => updateBlock(day.day, block.id, updated)}
                              onRemove={day.blocks.length > 1 ? () => removeBlockFromDay(day.day, block.id) : undefined}
                              showValidation={showValidation}
                              isExpanded={expandedBlocks.has(block.id)}
                              onToggleExpand={() => toggleBlockExpand(block.id)}
                              exerciseLibrary={exerciseLibrary}
                            />
                          </div>
                        );
                      })}
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
            <WeekPeriodSelector selectedWeek={selectedWeek} onWeekSelect={setSelectedWeek} />

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
                        onClick={() => handleSave("draft")}
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
                          ? "Selecione a semana"
                          : (validation.daysWithContent ?? 0) === 0
                            ? "Adicione pelo menos 1 dia de treino"
                            : (validation.errorsInContentDays ?? 0) > 0
                              ? "Corrija os erros nos dias com conteúdo"
                              : "Verifique os dias com conteúdo"}
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
                        onClick={() => handleSave("published")}
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
                          ? "Selecione a semana"
                          : (validation.daysWithContent ?? 0) === 0
                            ? "Adicione pelo menos 1 dia de treino"
                            : (validation.errorsInContentDays ?? 0) > 0
                              ? "Corrija os erros nos dias com conteúdo"
                              : "Verifique os dias com conteúdo"}
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
