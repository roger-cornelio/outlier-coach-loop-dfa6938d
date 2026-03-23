/**
 * CoachSpreadsheetTab - Aba IMPORTAR/CRIAR do Coach
 * 
 * REGRAS ANTI-BUG:
 * 1. Preview = estado local (parsedWorkouts)
 * 2. Nunca depende do banco para renderizar preview
 * 3. "Publicar para Atletas" usa preview local como fonte
 * 4. OBRIGATÓRIO: semana de referência antes de salvar/publicar
 * 5. WOD Principal: máximo 1 por dia
 * 6. MODO ESTRUTURADO: bloqueia salvar/publicar se bloco inválido
 * 
 * REGRA MVP0: Benchmark só pode ser definido por ADMIN.
 * Coach não vê, não marca, não salva isBenchmark.
 */

import { useState, useMemo } from 'react';
import type { CoachWorkout } from '@/hooks/useCoachWorkouts';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useCoachWorkouts } from '@/hooks/useCoachWorkouts';
import { 
  FileText, Sparkles, AlertCircle, Trash2, CheckCircle, ChevronDown, ChevronUp, 
  Save, Zap, Dumbbell, Info, Send, Upload, Star, AlertTriangle, PenTool
} from 'lucide-react';
import { DayOfWeek, DayWorkout, WorkoutBlock } from '@/types/outlier';
import { PublishToAthletesModal } from './PublishToAthletesModal';
import { WeekPeriod } from './WeekPeriodSelector';
import { StructuredWorkoutEditor } from './StructuredWorkoutEditor';
import { TextModelImporter } from './TextModelImporter';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { WorkoutParseValidationModal } from '@/components/WorkoutParseValidationModal';
import { useCoachDraft } from '@/hooks/useCoachDraft';
import { getActiveParams } from '@/config/outlierParams';
import { identifyMainBlock } from '@/utils/mainBlockIdentifier';
import { getBlockDisplayTitle, getBlockCategoryLabel, normalizeRestLineForDisplay } from '@/utils/blockDisplayUtils';
import { normalizeText } from '@/utils/structuredTextParser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getMainBlockCopy, getUIConceptsCopy } from '@/config/workoutConceptsCopy';

const DAY_PATTERNS: { pattern: RegExp; day: DayOfWeek }[] = [
  { pattern: /segunda|seg\b|monday|mon\b/i, day: 'seg' },
  { pattern: /terça|ter[cç]a|ter\b|tuesday|tue\b/i, day: 'ter' },
  { pattern: /quarta|qua\b|wednesday|wed\b/i, day: 'qua' },
  { pattern: /quinta|qui\b|thursday|thu\b/i, day: 'qui' },
  { pattern: /sexta|sex\b|friday|fri\b/i, day: 'sex' },
  { pattern: /s[aá]bado|sab\b|saturday|sat\b/i, day: 'sab' },
  { pattern: /domingo|dom\b|sunday|sun\b/i, day: 'dom' },
];

const BLOCK_PATTERNS: { pattern: RegExp; type: WorkoutBlock['type'] }[] = [
  { pattern: /aquecimento|warm[- ]?up|🔥/i, type: 'aquecimento' },
  { pattern: /conditioning|condicionamento|⚡/i, type: 'conditioning' },
  { pattern: /for[cç]a|strength|💪/i, type: 'forca' },
  { pattern: /espec[ií]fico|specific|hyrox|🛷/i, type: 'especifico' },
  { pattern: /core|abdominal|🎯/i, type: 'core' },
  { pattern: /corrida|running|run|🏃/i, type: 'corrida' },
  { pattern: /notas?|notes?|obs|📝/i, type: 'notas' },
];

const DAY_NAMES: Record<DayOfWeek, string> = {
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
  dom: 'Domingo',
};


function parseSpreadsheet(text: string): DayWorkout[] {
  const lines = text.split('\n');
  const workouts: DayWorkout[] = [];
  
  let currentDay: DayOfWeek | null = null;
  let currentBlocks: WorkoutBlock[] = [];
  let currentBlockType: WorkoutBlock['type'] | null = null;
  let currentBlockContent: string[] = [];
  let currentBlockTitle = '';

  const saveCurrentBlock = () => {
    if (currentBlockType && currentBlockContent.length > 0) {
      currentBlocks.push({
        id: `${currentDay}-${currentBlockType}-${currentBlocks.length}`,
        type: currentBlockType,
        title: currentBlockTitle || currentBlockType.toUpperCase(),
        content: currentBlockContent.join('\n').trim(),
        isMainWod: currentBlockType === 'conditioning' || currentBlockType === 'especifico',
      });
    }
    currentBlockContent = [];
    currentBlockTitle = '';
  };

  const saveCurrentDay = () => {
    saveCurrentBlock();
    if (currentDay && currentBlocks.length > 0) {
      workouts.push({
        day: currentDay,
        stimulus: '',
        estimatedTime: 60,
        blocks: [...currentBlocks],
      });
    }
    currentBlocks = [];
    currentBlockType = null;
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    const dayMatch = DAY_PATTERNS.find(p => p.pattern.test(trimmedLine));
    if (dayMatch && (trimmedLine.length < 50 || /^[📅🗓️]/.test(trimmedLine))) {
      saveCurrentDay();
      currentDay = dayMatch.day;
      continue;
    }

    const blockMatch = BLOCK_PATTERNS.find(p => p.pattern.test(trimmedLine));
    if (blockMatch && trimmedLine.length < 80) {
      saveCurrentBlock();
      currentBlockType = blockMatch.type;
      currentBlockTitle = trimmedLine;
      continue;
    }

    if (currentDay && currentBlockType && trimmedLine) {
      currentBlockContent.push(trimmedLine);
    } else if (currentDay && !currentBlockType && trimmedLine) {
      currentBlockType = 'conditioning';
      currentBlockTitle = 'TREINO';
      currentBlockContent.push(trimmedLine);
    }
  }

  saveCurrentDay();
  return workouts;
}

interface LinkedAthlete {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
}

interface CoachSpreadsheetTabProps {
  linkedAthletes: LinkedAthlete[];
  loadingAthletes?: boolean;
  initialWorkout?: CoachWorkout | null;
  onClearInitialWorkout?: () => void;
  onSavedGoToPrograms?: () => void;
}

export function CoachSpreadsheetTab({ linkedAthletes, loadingAthletes = false, initialWorkout, onClearInitialWorkout, onSavedGoToPrograms }: CoachSpreadsheetTabProps) {
  const { profile } = useAuth();
  const { saveWorkout: saveToDb, forceSaveWorkout, gatekeeperResult, clearGatekeeperResult } = useCoachWorkouts();
  const { clearDraft } = useCoachDraft();

  // Estado para dados pendentes do Gatekeeper (para retry/bypass)
  const [pendingGatekeeperSave, setPendingGatekeeperSave] = useState<{
    title: string;
    workouts: DayWorkout[];
    weekStart: string | null;
  } | null>(null);
  
  // ESTADO LOCAL APENAS - nunca depende do banco
  const [spreadsheetText, setSpreadsheetText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [parsedWorkouts, setParsedWorkouts] = useState<DayWorkout[] | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<DayOfWeek>>(new Set());
  const [programName, setProgramName] = useState('');
  const [programStatus, setProgramStatus] = useState<'draft' | 'published'>('draft');
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [savedWorkoutId, setSavedWorkoutId] = useState<string | null>(null);
  
  // OBRIGATÓRIO: Semana de referência
  const [selectedWeek, setSelectedWeek] = useState<WeekPeriod | null>(null);

  // Validação: cada dia deve ter exatamente 1 WOD principal
  const mainWodValidation = useMemo(() => {
    if (!parsedWorkouts) return { isValid: true, missingDays: [] };
    
    const missingDays: string[] = [];
    
    for (const workout of parsedWorkouts) {
      // Verificar se há WOD principal definido (manual ou auto)
      const hasManualMain = workout.blocks.some(b => b.isMainWod === true);
      const autoMain = identifyMainBlock(workout.blocks);
      
      if (!hasManualMain && autoMain.blockIndex === -1) {
        missingDays.push(DAY_NAMES[workout.day]);
      }
    }
    
    return {
      isValid: missingDays.length === 0,
      missingDays,
    };
  }, [parsedWorkouts]);

  // Validação: não pode salvar/publicar sem semana E sem WOD principal em todos os dias
  const canSaveOrPublish = useMemo(() => {
    return selectedWeek !== null && 
           parsedWorkouts !== null && 
           parsedWorkouts.length > 0 &&
           mainWodValidation.isValid;
  }, [selectedWeek, parsedWorkouts, mainWodValidation.isValid]);

  const handleClearWorkouts = () => {
    setSpreadsheetText('');
    setParsedWorkouts(null);
    setProgramName('');
    setProgramStatus('draft');
    setSelectedWeek(null);
    setSuccess(null);
    setError(null);
  };

  // Toggle WOD principal para um bloco específico (máximo 1 por dia)
  const toggleMainWod = (dayIndex: number, blockIndex: number) => {
    if (!parsedWorkouts) return;
    
    const updated = [...parsedWorkouts];
    const day = updated[dayIndex];
    const clickedBlock = day.blocks[blockIndex];
    
    // Se já está marcado como principal manual, remove
    if (clickedBlock.isMainWod === true) {
      clickedBlock.isMainWod = undefined;
    } else {
      // Remove marcação de todos os outros blocos do dia
      day.blocks.forEach((block, idx) => {
        if (idx === blockIndex) {
          block.isMainWod = true;
        } else {
          block.isMainWod = undefined;
        }
      });
    }
    
    setParsedWorkouts(updated);
  };

  const processSpreadsheet = async () => {
    if (!spreadsheetText.trim()) {
      setError('Cole a planilha semanal no campo de texto.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const parsed = parseSpreadsheet(spreadsheetText);

    if (parsed.length === 0) {
      setError('Não foi possível identificar treinos. Verifique se os dias da semana estão identificados.');
      setIsProcessing(false);
      return;
    }

    setParsedWorkouts(parsed);
    setExpandedDays(new Set(parsed.map(w => w.day)));
    setIsProcessing(false);
    setSuccess(`${parsed.length} dia(s) identificados. Revise abaixo e salve.`);
  };

  const toggleDayExpanded = (day: DayOfWeek) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(day)) newSet.delete(day);
      else newSet.add(day);
      return newSet;
    });
  };

  // REGRA MVP0: Benchmark removido do Coach - apenas Admin pode definir
  // toggleBlockBenchmark foi removido intencionalmente

  const saveWorkouts = async () => {
    if (!parsedWorkouts) return;
    
    setIsSavingToDb(true);
    setError(null);
    
    try {
      // Título limpo - default "Treino semanal" se vazio
      const title = programName.trim() || "Treino semanal";
      const status = programStatus === 'published' ? 'published' : 'draft';
      
      // CAMPO CANÔNICO: week_start é a segunda-feira da semana selecionada
      const weekStart = selectedWeek?.startDate || null;
      
      const workoutId = await saveToDb(title, parsedWorkouts, status, 0, weekStart);
      
      if (workoutId) {
        setSuccess(`${parsedWorkouts.length} dia(s) salvos! ${status === 'published' ? '(Publicado)' : '(Rascunho)'}`);
        // Limpa preview após salvar com sucesso
        setParsedWorkouts(null);
        setSpreadsheetText('');
        setProgramName('');
        setSelectedWeek(null);
      } else {
        // CENÁRIO 2/3: Se Gatekeeper bloqueou, salvar dados pendentes para bypass
        setPendingGatekeeperSave({ 
          title, 
          workouts: parsedWorkouts, 
          weekStart: selectedWeek?.startDate || null 
        });
      }
    } catch (err) {
      console.error('[CoachSpreadsheetTab] Error saving:', err);
      setError('Erro ao salvar treino');
    } finally {
      setIsSavingToDb(false);
    }
  };

  // Handler para o editor estruturado
  const handleStructuredSave = async (
    workouts: DayWorkout[], 
    title: string, 
    status: 'draft' | 'published', 
    weekStart: string | null
  ): Promise<boolean> => {
    try {
      const workoutId = await saveToDb(title, workouts, status, 0, weekStart);
      return !!workoutId;
    } catch (err) {
      console.error('[CoachSpreadsheetTab] Error saving structured:', err);
      return false;
    }
  };

  // Handler para abrir modal de publicação - PRIMEIRO salva workout na tabela workouts
  const handleOpenPublishModal = async () => {
    if (!parsedWorkouts || !selectedWeek) return;
    
    setIsSavingToDb(true);
    setError(null);
    
    try {
      const title = programName.trim() || `Treino semanal`;
      const weekStart = selectedWeek.startDate;
      
      // Salvar como PUBLISHED (status final após publicar para atletas)
      const workoutId = await saveToDb(title, parsedWorkouts, 'published', 0, weekStart);
      
      if (workoutId) {
        console.log('[CoachSpreadsheetTab] Workout saved with ID:', workoutId, 'status: published');
        setSavedWorkoutId(workoutId);
        setShowPublishModal(true);
      } else {
        setError('Erro ao salvar treino no banco.');
      }
    } catch (err) {
      console.error('[CoachSpreadsheetTab] Error saving before publish:', err);
      setError('Erro ao salvar treino');
    } finally {
      setIsSavingToDb(false);
    }
  };

  return (
    <>
    <Tabs defaultValue="import" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="import" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Colar Treino
        </TabsTrigger>
        <TabsTrigger value="structured" className="flex items-center gap-2">
          <PenTool className="w-4 h-4" />
          Criar Estruturado
        </TabsTrigger>
      </TabsList>

      {/* ABA ESTRUTURADA - MODELO ANTI-BURRO */}
      <TabsContent value="structured" className="space-y-6">
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Modo Estruturado (Recomendado)</p>
                <p className="text-muted-foreground">
                  Crie treinos com campos obrigatórios validados. Impossível salvar com erros.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <StructuredWorkoutEditor
          onSave={handleStructuredSave}
          isSaving={isSavingToDb}
          linkedAthletesCount={linkedAthletes.length}
        />
      </TabsContent>

      {/* ABA TEXTO MODELO */}
      <TabsContent value="import" className="space-y-6">
        <ErrorBoundary
          fallbackTitle="Erro no editor de treino"
          onClearDraft={clearDraft}
        >
        <TextModelImporter
          isSaving={isSavingToDb}
          initialWorkout={initialWorkout}
          onClearInitialWorkout={onClearInitialWorkout}
          onSaveAndGoToPrograms={async (workouts, title, weekStart) => {
            setIsSavingToDb(true);
            try {
              const workoutId = await saveToDb(title, workouts, 'draft', 0, weekStart);
              if (workoutId) {
                setSuccess('Treino salvo como rascunho! Veja na aba Programações.');
                setParsedWorkouts(null);
                setSpreadsheetText('');
                setProgramName('');
                setSelectedWeek(null);
                return true;
              }
              // Se workoutId é null, verificar se Gatekeeper bloqueou
              if (!workoutId) {
                // Salvar dados pendentes para retry/bypass
                setPendingGatekeeperSave({ title, workouts, weekStart });
              }
              return false;
            } catch (err) {
              console.error('[CoachSpreadsheetTab] Error saving:', err);
              setError('Erro ao salvar treino');
              return false;
            } finally {
              setIsSavingToDb(false);
            }
          }}
        />
        </ErrorBoundary>

      {/* Errors/Success */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
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
      </AnimatePresence>

      {/* Preview dos treinos parseados - FONTE LOCAL */}
      {parsedWorkouts && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Dumbbell className="w-5 h-5 text-primary" />
                Preview da Semana ({parsedWorkouts.length} dias)
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setParsedWorkouts(null)}>
                  Voltar
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={handleOpenPublishModal}
                        className="flex items-center gap-1.5"
                        disabled={linkedAthletes.length === 0 || !selectedWeek || isSavingToDb}
                      >
                        <Send className="w-4 h-4" />
                        {isSavingToDb ? 'Salvando...' : 'Publicar para Atletas'}
                      </Button>
                    </TooltipTrigger>
                    {(linkedAthletes.length === 0 || !selectedWeek) && (
                      <TooltipContent>
                        {!selectedWeek 
                          ? <p>Selecione a semana de referência primeiro</p>
                          : <p>Vincule atletas primeiro na aba Atletas</p>
                        }
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lista de dias */}
            <div className="space-y-3">
              {parsedWorkouts.map((workout, dayIndex) => (
                <div key={workout.day} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleDayExpanded(workout.day)}
                    className="w-full p-3 flex items-center justify-between bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{DAY_NAMES[workout.day]}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {workout.blocks.length} bloco(s)
                      </span>
                    </div>
                    {expandedDays.has(workout.day) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {expandedDays.has(workout.day) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 space-y-3 bg-background">
                          {/* MVP0 PREVIEW 100% READ-ONLY: Sem callout de ação */}
                          
                          {workout.blocks.map((block, blockIndex) => {
                            const mainBlockCopy = getMainBlockCopy();
                            const mainBlockResult = identifyMainBlock(workout.blocks);
                            const isMainBlock = mainBlockResult.blockIndex === blockIndex;
                            
                            // ═══════════════════════════════════════════════════════════
                            // MVP0: REGRA OBRIGATÓRIA DE RENDERIZAÇÃO
                            // Bloco só é renderizado se block.lines tiver linhas executáveis
                            // ═══════════════════════════════════════════════════════════
                            const lines = (block as any).lines as
                              | { id: string; text: string; type: string }[]
                              | undefined;
                            const exerciseLines = lines?.filter((l) => l.type === 'exercise') || [];
                            
                            // REGRA: Se não tem linhas executáveis, NÃO renderiza como bloco
                            if (exerciseLines.length === 0) {
                              return null;
                            }
                            
                            return (
                            <div key={block.id} className={`p-3 rounded-lg border ${
                              isMainBlock 
                                ? 'bg-primary/10 border-primary/30' 
                                : 'bg-secondary/20 border-border/50'
                            }`}>
                              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium">{getBlockDisplayTitle(block, blockIndex)}</span>
                                  <span className="text-xs text-muted-foreground">
                                    • {getBlockCategoryLabel(block)}
                                  </span>
                                  {isMainBlock && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                                      {mainBlockCopy.icon} {mainBlockCopy.manualLabel}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* ================================================
                                  LEGACY GUARD RAIL:
                                  block.instruction / block.instructions are DEPRECATED.
                                  Source of truth is block.lines.
                                  Do NOT render/use instruction(s) anywhere.
                                  ================================================ */}

                              {/* DEV GUARD: Log legacy fields if present (dev only) */}
                              {(() => {
                                if (import.meta.env.DEV) {
                                  const legacyInstruction = (block as any).instruction;
                                  const legacyInstructions = (block as any).instructions;
                                  if (legacyInstruction || (legacyInstructions && legacyInstructions.length > 0)) {
                                    console.debug('[LEGACY] instruction(s) present but ignored', { 
                                      blockIndex, 
                                      title: block.title,
                                      hasInstruction: !!legacyInstruction,
                                      hasInstructions: !!(legacyInstructions && legacyInstructions.length > 0)
                                    });
                                  }
                                }
                                return null;
                              })()}

                              {/* Preview do bloco - FONTE ÚNICA: block.lines */}
                              {(() => {
                                const lines = (block as any).lines as
                                  | { id: string; text: string; type: string }[]
                                  | undefined;

                                if (!lines || lines.length === 0) return null;

                                const normalizedTitle = normalizeText(block.title ?? '');
                                const normalizedCategory = normalizeText(block.type ?? '');

                                const exerciseLines = lines.filter((l) => l.type === 'exercise');
                                const commentLines = lines.filter((l) => {
                                  if (l.type !== 'comment') return false;
                                  const trimmed = l.text?.trim();
                                  if (!trimmed) return false; // Remove linhas vazias
                                  const normalized = normalizeText(l.text);
                                  if (normalizedTitle && normalized === normalizedTitle) return false;
                                  if (normalizedCategory && normalized === normalizedCategory) return false;
                                  return true;
                                });

                                // [UI_BLOCK] Log obrigatório
                                console.log("[UI_BLOCK]", {
                                  title: block.title,
                                  hasTraining: exerciseLines.length,
                                  hasComment: commentLines.length,
                                });

                                return (
                                  <div className="mt-2 space-y-3">
                                    {/* CAIXA 1: TREINO - SEMPRE VISÍVEL */}
                                    <div className="text-sm text-foreground space-y-1 pl-2 border-l-2 border-primary/40">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                                        Treino
                                      </p>
                                      {exerciseLines.length > 0 ? (
                                        exerciseLines.map((line) => (
                                          <p key={line.id}>{normalizeRestLineForDisplay(line.text)}</p>
                                        ))
                                      ) : (
                                        <p className="text-xs text-muted-foreground/50 italic">Sem conteúdo de treino.</p>
                                      )}
                                    </div>

                                    {/* CAIXA 2: COMENTÁRIO DO COACH - SEMPRE VISÍVEL */}
                                    <div className="text-xs text-muted-foreground p-2 rounded bg-muted/30 border border-border/40 space-y-1">
                                      <span className="text-xs font-medium text-muted-foreground/70">💬 Comentário do Coach</span>
                                      {commentLines.length > 0 ? (
                                        commentLines.map((line) => (
                                          <p key={line.id} className="italic">{normalizeRestLineForDisplay(line.text)}</p>
                                        ))
                                      ) : (
                                        <p className="text-muted-foreground/50 italic">Sem comentário.</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                            })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* MVP0 PREVIEW 100% READ-ONLY: Semana apenas exibição */}
            {selectedWeek && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">
                    Semana: <span className="font-semibold">{selectedWeek.label}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Erro de WOD Principal faltando */}
            {!mainWodValidation.isValid && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      WOD Principal não definido
                    </p>
                    <p className="text-xs text-destructive/80 mt-1">
                      {mainWodValidation.missingDays.map(day => 
                        getMainBlockCopy().missingError(day)
                      ).join('\n')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Configurações de salvamento */}
            <div className="pt-4 border-t border-border space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="programName">{getUIConceptsCopy().programNameLabel}</Label>
                  <Input
                    id="programName"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="Ex: Construção Aeróbia"
                  />
                  <p className="text-xs text-muted-foreground">
                    {getUIConceptsCopy().programNameSuggestion}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Status ao Salvar</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={programStatus === 'draft' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProgramStatus('draft')}
                      className="flex-1"
                      disabled={!canSaveOrPublish}
                    >
                      Rascunho
                    </Button>
                    <Button
                      variant={programStatus === 'published' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProgramStatus('published')}
                      className="flex-1"
                      disabled={!canSaveOrPublish}
                    >
                      Publicar
                    </Button>
                  </div>
                </div>
              </div>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        onClick={saveWorkouts}
                        disabled={isSavingToDb || !canSaveOrPublish}
                        className="w-full"
                      >
                        {isSavingToDb ? (
                          <>
                            <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Salvar {parsedWorkouts?.length || 0} dia(s)
                          </>
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!canSaveOrPublish && (
                    <TooltipContent>
                      {!selectedWeek 
                        ? <p>Selecione a semana de referência para salvar</p>
                        : !mainWodValidation.isValid
                          ? <p>Defina WOD Principal em todos os dias</p>
                          : <p>Adicione treinos para salvar</p>
                      }
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de publicar para atletas - usa preview local */}
      <PublishToAthletesModal
        open={showPublishModal}
        onOpenChange={(open) => {
          setShowPublishModal(open);
          if (!open) setSavedWorkoutId(null);
        }}
        workouts={parsedWorkouts || []}
        title={programName || (selectedWeek ? `Semana ${selectedWeek.label}` : `Semana ${new Date().toLocaleDateString('pt-BR')}`)}
        linkedAthletes={linkedAthletes}
        loadingAthletes={loadingAthletes}
        weekStart={selectedWeek?.startDate || null}
        workoutId={savedWorkoutId}
        onSuccess={() => {
          // MVP0: Limpar draft após publish com sucesso
          setParsedWorkouts(null);
          setSpreadsheetText('');
          setProgramName('');
          setSelectedWeek(null);
          setSavedWorkoutId(null);
          setSuccess('Treino publicado com sucesso!');
        }}
      />
      </TabsContent>
    </Tabs>

      {/* Gatekeeper Validation Modal */}
      <WorkoutParseValidationModal
        open={!!gatekeeperResult && !gatekeeperResult.success}
        errorType={gatekeeperResult?.errorType || 'parse_failure'}
        failedBlocks={gatekeeperResult?.failedBlocks || []}
        onClose={() => {
          clearGatekeeperResult();
          setPendingGatekeeperSave(null);
        }}
        onForceBypass={async () => {
          if (pendingGatekeeperSave) {
            setIsSavingToDb(true);
            try {
              const { title, workouts, weekStart } = pendingGatekeeperSave;
              const workoutId = await forceSaveWorkout(title, workouts, 'draft', 0, weekStart);
              if (workoutId) {
                setSuccess('Treino salvo com estimativas! Veja na aba Programações.');
                clearDraft();
                setParsedWorkouts(null);
                setSpreadsheetText('');
                setProgramName('');
                setSelectedWeek(null);
                onSavedGoToPrograms?.();
              }
            } catch (err) {
              console.error('[CoachSpreadsheetTab] Bypass save error:', err);
            } finally {
              setIsSavingToDb(false);
            }
          }
          clearGatekeeperResult();
          setPendingGatekeeperSave(null);
        }}
      />
    </>
  );
}
