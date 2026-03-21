/**
 * CoachProgramsTab - Lista de programações salvas/publicadas do coach
 * 
 * Lê dados do banco (workouts) e exibe com ações:
 * - Ver detalhes (modal com semana completa)
 * - Publicar para atletas (abre modal de seleção)
 * - Arquivar / Despublicar
 * - Excluir
 * 
 * REGRA CRÍTICA: Publicar SEMPRE abre modal de seleção de atletas.
 * NUNCA publicar automaticamente ou para todos os atletas.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Eye,
  Archive,
  Trash2,
  Loader2,
  FileText,
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
  Pencil,
  Copy,
  AlertCircle,
  CheckCircle2,
  Flame,
  Zap,
} from 'lucide-react';
import { useCoachWorkouts, type CoachWorkout, type WorkoutStatus } from '@/hooks/useCoachWorkouts';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DayOfWeek, DayWorkout, WorkoutBlock } from '@/types/outlier';
import { getBlockHeader, getBlockDisplayTitle, getBlockDisplayDataFromParsed, STRUCT_LINE_PREFIX } from '@/utils/blockDisplayUtils';
import { StructureBadge, CategoryChip, ExerciseLine, CommentSubBlock } from '@/components/DSLBlockRenderer';
import { PublishToAthletesModal } from '@/components/PublishToAthletesModal';
import { estimateWorkout, formatEstimatedTime, formatEstimatedKcal } from '@/utils/workoutEstimation';
import { computeBlockMetrics } from '@/utils/computeBlockKcalFromParsed';
import { getBlockTimeMeta } from '@/utils/timeValidation';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LinkedAthlete {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
}

interface CoachProgramsTabProps {
  linkedAthletes: LinkedAthlete[];
  loadingAthletes?: boolean;
  onEditWorkout?: (workout: CoachWorkout) => void;
}

const DAY_NAMES: Record<DayOfWeek, string> = {
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
  dom: 'Domingo',
};

interface StatusBadgeProps {
  status: WorkoutStatus;
  showMicrocopy?: boolean;
}

function StatusBadge({ status, showMicrocopy = false }: StatusBadgeProps) {
  const config = {
    published: {
      icon: CheckCircle2,
      label: 'Publicado',
      microcopy: '✅ Este treino está ativo para o atleta.',
      className: 'bg-green-500/10 text-green-500 border-green-500/20',
    },
    archived: {
      icon: Archive,
      label: 'Arquivado',
      microcopy: '📁 Este treino está arquivado e não está visível.',
      className: 'bg-muted text-muted-foreground border-border',
    },
    draft: {
      icon: Clock,
      label: 'Rascunho',
      microcopy: '📝 Este treino ainda não está visível para o atleta. Revise antes de publicar.',
      className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    },
  };

  const { icon: Icon, label, microcopy, className } = config[status] || config.draft;

  return (
    <div className="flex flex-col gap-1">
      <Badge className={className}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
      {showMicrocopy && (
        <p className="text-xs text-muted-foreground mt-1">{microcopy}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BIOMETRICS PADRÃO PARA PREVIEW DO COACH
// Masculino, 75kg, 170cm — usado APENAS na pré-visualização.
// Ao publicar, o motor recalcula com dados reais de cada atleta.
// ═══════════════════════════════════════════════════════════════════════════════
const COACH_PREVIEW_BIOMETRICS = {
  weightKg: 75,
  sex: 'masculino' as const,
  age: 30,
  heightCm: 170,
  isValid: true,
  missingWeight: false,
};

const COACH_PREVIEW_ATHLETE_CONFIG = {
  peso: 75,
  sexo: 'masculino' as const,
  idade: 30,
  altura: 170,
};

const blockTypeColors: Record<string, string> = {
  aquecimento: 'border-l-amber-500',
  conditioning: 'border-l-primary',
  forca: 'border-l-red-500',
  especifico: 'border-l-purple-500',
  core: 'border-l-blue-500',
  corrida: 'border-l-green-500',
  notas: 'border-l-muted-foreground',
};

interface WorkoutDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: CoachWorkout | null;
}

function WorkoutDetailModal({ open, onOpenChange, workout }: WorkoutDetailModalProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  if (!workout) return null;

  const workoutDays: DayWorkout[] = Array.isArray(workout.workout_json) 
    ? workout.workout_json as DayWorkout[] 
    : [];

  const toggleDay = (day: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(day)) newSet.delete(day);
      else newSet.add(day);
      return newSet;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl lg:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {workout.title}
          </DialogTitle>
          <div className="mt-2">
            <StatusBadge status={workout.status} showMicrocopy />
          </div>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Valores estimados para atleta padrão (masculino, 75kg, 170cm). Ao publicar, cada atleta receberá cálculos com seus dados reais.
          </p>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3">
            {workoutDays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Nenhum treino encontrado nesta programação.</p>
              </div>
            ) : (
              workoutDays.map((dayWorkout) => (
                <DayPreviewCard
                  key={dayWorkout.day}
                  dayWorkout={dayWorkout}
                  isExpanded={expandedDays.has(dayWorkout.day)}
                  onToggle={() => toggleDay(dayWorkout.day)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DayPreviewCard — Card colapsável por dia com UI idêntica à tela do atleta
// ═══════════════════════════════════════════════════════════════════════════════

interface DayPreviewCardProps {
  dayWorkout: DayWorkout;
  isExpanded: boolean;
  onToggle: () => void;
}

function DayPreviewCard({ dayWorkout, isExpanded, onToggle }: DayPreviewCardProps) {
  // Calcular métricas com biometrics padrão (mesmo algoritmo da WeeklyTrainingView)
  const workoutEstimation = useMemo(() => {
    return estimateWorkout(dayWorkout, COACH_PREVIEW_ATHLETE_CONFIG as any, 'pro');
  }, [dayWorkout]);

  const blockMetricsMap = useMemo(() => {
    let sumMinutes = 0;
    let sumKcal = 0;
    const perBlock: Array<{ kcal: number; durationSec: number; visible: boolean; showStats: boolean }> = [];

    dayWorkout.blocks.forEach((block, index) => {
      const displayData = getBlockDisplayDataFromParsed(block);
      if (!displayData.hasContent) {
        perBlock.push({ kcal: 0, durationSec: 0, visible: false, showStats: false });
        return;
      }
      if (block.type === 'notas') {
        perBlock.push({ kcal: 0, durationSec: 0, visible: true, showStats: false });
        return;
      }
      if (block.parseStatus === 'bypassed' || block.parseStatus === 'failed') {
        perBlock.push({ kcal: 0, durationSec: 0, visible: true, showStats: false });
        return;
      }

      const hasParsedData = block.parsedExercises && block.parsedExercises.length > 0 && block.parseStatus === 'completed';
      let kcal = 0;
      let dur = 0;

      if (hasParsedData) {
        const metrics = computeBlockMetrics(
          block.parsedExercises!,
          { pesoKg: 75, sexo: 'masculino' },
          block.content,
          block.title
        );
        kcal = metrics.estimatedKcal || 0;
        dur = metrics.estimatedDurationSec || 0;
      } else {
        const timeMeta = getBlockTimeMeta(block);
        dur = timeMeta.durationSecUsed || 0;
        const blockEst = workoutEstimation?.blocks[index];
        kcal = blockEst?.estimatedKcal || 0;
      }

      const roundedMinutes = Math.round(dur / 60);
      const roundedKcal = Math.round(kcal);
      perBlock.push({ kcal: roundedKcal, durationSec: dur, visible: true, showStats: true });
      sumMinutes += roundedMinutes;
      sumKcal += roundedKcal;
    });

    return { perBlock, totalTime: sumMinutes, totalCalories: sumKcal };
  }, [dayWorkout, workoutEstimation]);

  const { totalTime, totalCalories } = blockMetricsMap;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Day Header (collapsible trigger) */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between bg-secondary/30 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-bold text-sm">
            {DAY_NAMES[dayWorkout.day] || dayWorkout.day}
          </Badge>
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
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Expanded Content — identical to athlete WeeklyTrainingView */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 bg-background">
              {dayWorkout.blocks?.map((block: WorkoutBlock, idx: number) => {
                const displayData = getBlockDisplayDataFromParsed(block);
                if (!displayData.hasContent) return null;

                const blockMet = blockMetricsMap.perBlock[idx] || { kcal: 0, durationSec: 0, showStats: false };
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
                      ${blockTypeColors[block.type] || 'border-l-border'}
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

                    {/* Block Stats */}
                    {block.type !== 'notas' && blockMet.showStats && (
                      <div className="flex items-center gap-4 pt-3 border-t border-border/50 mt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{isEstimated ? '~' : ''}</span>
                          <span className="font-medium text-foreground">
                            {formatEstimatedTime(estimatedMinutes)}
                          </span>
                          {isEstimated && (
                            <span className="text-xs text-muted-foreground/60">(estimado)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="text-orange-500 font-medium">
                            {formatEstimatedKcal(estimatedKcal)}
                          </span>
                        </div>
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

export function CoachProgramsTab({ linkedAthletes, loadingAthletes = false, onEditWorkout }: CoachProgramsTabProps) {
  const { workouts, loading, error, archiveWorkout, deleteWorkout, duplicateAsDraft, refetch } = useCoachWorkouts();
  const { toast } = useToast();
  const [selectedWorkout, setSelectedWorkout] = useState<CoachWorkout | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CoachWorkout | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Estado para modal de publicação
  const [publishTarget, setPublishTarget] = useState<CoachWorkout | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  
  // Estado para republicação
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  /**
   * Formata período da semana para exibição
   * PRIORIDADE:
   * 1. Usar week_start (campo canônico)
   * 2. Fallback: extrair do título (dados legados)
   * 3. Fallback final: calcular da data de criação
   */
  const formatWeekPeriod = (workout: { title: string; created_at: string; week_start?: string | null }) => {
    // PRIORIDADE 1: Usar campo canônico week_start
    if (workout.week_start) {
      const monday = new Date(workout.week_start + 'T12:00:00');
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const formatShort = (d: Date) => d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      
      return `Semana: ${formatShort(monday)} → ${formatShort(sunday)}`;
    }
    
    // FALLBACK 2: Extrair do título (dados legados com [Semana: dd/MM → dd/MM])
    const match = workout.title.match(/\[?Semana:?\s*(\d{2}\/\d{2})\s*[→\-–]\s*(\d{2}\/\d{2})\]?/i);
    if (match) {
      return `Semana: ${match[1]} → ${match[2]}`;
    }
    
    // FALLBACK 3: Calcular da data de criação (menos preciso)
    const date = new Date(workout.created_at);
    const dayOfWeek = date.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const formatShort = (d: Date) => d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
    
    return `Semana: ${formatShort(monday)} → ${formatShort(sunday)}`;
  };

  const handleView = (workout: CoachWorkout) => {
    setSelectedWorkout(workout);
    setShowDetailModal(true);
  };

  // Abre modal de seleção de atletas para publicar
  const handlePublishClick = (workout: CoachWorkout) => {
    setPublishTarget(workout);
    setShowPublishModal(true);
  };

  // Callback quando publicação for bem-sucedida
  const handlePublishSuccess = () => {
    refetch();
    toast({ title: 'Treino publicado para atletas selecionados!' });
  };

  const handleUnpublish = async (id: string) => {
    setIsProcessing(true);
    const success = await archiveWorkout(id);
    setIsProcessing(false);
    if (success) {
      toast({ title: 'Programação arquivada' });
    } else {
      toast({ title: 'Erro ao arquivar', variant: 'destructive' });
    }
  };

  /**
   * REPUBLICAR: Cria rascunho a partir de treino publicado
   * Treino original continua ativo - coach edita o rascunho com segurança
   */
  const handleRepublish = async (workout: CoachWorkout) => {
    setDuplicatingId(workout.id);
    const newId = await duplicateAsDraft(workout.id);
    setDuplicatingId(null);
    
    if (newId) {
      toast({ 
        title: 'Rascunho criado para edição!',
        description: 'O treino original continua ativo. Edite o rascunho e publique quando estiver pronto.',
      });
    } else {
      toast({ title: 'Erro ao criar rascunho', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    const success = await deleteWorkout(deleteTarget.id);
    setIsProcessing(false);
    setDeleteTarget(null);
    if (success) {
      toast({ title: 'Programação excluída' });
    } else {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  if (loading && workouts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <FileText className="w-10 h-10 text-destructive/50" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={refetch}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Group by status
  const published = workouts.filter(w => w.status === 'published');
  const drafts = workouts.filter(w => w.status === 'draft');
  const archived = workouts.filter(w => w.status === 'archived');

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 lg:gap-6">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 lg:p-6 text-center">
          <p className="text-2xl font-bold text-green-500">{published.length}</p>
          <p className="text-xs text-muted-foreground">Publicados</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-500">{drafts.length}</p>
          <p className="text-xs text-muted-foreground">Rascunhos</p>
        </div>
        <div className="bg-muted border border-border rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{archived.length}</p>
          <p className="text-xs text-muted-foreground">Arquivados</p>
        </div>
      </div>

      {/* List */}
      {workouts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/50" />
            <div>
              <p className="text-foreground font-medium">Nenhuma programação salva</p>
              <p className="text-muted-foreground text-sm mt-1">
                Use a aba "Importar" para colar sua planilha e salvar programações.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              Programações Salvas ({workouts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {workouts.map((workout) => {
                    const workoutCount = Array.isArray(workout.workout_json) 
                      ? workout.workout_json.length 
                      : 0;
                    
                    return (
                      <motion.div
                        key={workout.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50 hover:border-border transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {workout.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {workoutCount} dia(s)
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs font-medium text-primary">
                              {formatWeekPeriod(workout)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={workout.status} />
                          
                          <div className="flex gap-1">
                            {/* 👁️ VISUALIZAR - Sempre disponível */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleView(workout)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalhes</TooltipContent>
                            </Tooltip>
                            
                            {/* 🟡 RASCUNHO: ✏️ Editar, 🚀 Publicar, 🗑️ Excluir */}
                            {workout.status === 'draft' && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onEditWorkout?.(workout)}
                                      className="h-8 w-8 p-0 text-amber-500 hover:bg-amber-500/10"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar programação</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handlePublishClick(workout)}
                                      disabled={isProcessing}
                                      className="h-8 w-8 p-0 text-green-500 hover:bg-green-500/10"
                                    >
                                      <Send className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Publicar para atletas</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                            
                            {/* 🟢 PUBLICADO: 👁️ Visualizar, 🔁 Republicar (cria rascunho) */}
                            {workout.status === 'published' && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRepublish(workout)}
                                      disabled={isProcessing || duplicatingId === workout.id}
                                      className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-500/10"
                                    >
                                      {duplicatingId === workout.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Republicar (cria rascunho para edição segura)
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUnpublish(workout.id)}
                                      disabled={isProcessing}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Archive className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Arquivar</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                            
                            {/* 📁 ARQUIVADO: 🚀 Republicar direto */}
                            {workout.status === 'archived' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePublishClick(workout)}
                                    disabled={isProcessing}
                                    className="h-8 w-8 p-0 text-green-500 hover:bg-green-500/10"
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Republicar para atletas</TooltipContent>
                              </Tooltip>
                            )}
                            
                            {/* 🗑️ EXCLUIR - Disponível para TODOS os status */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteTarget(workout)}
                                  disabled={isProcessing}
                                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      <WorkoutDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        workout={selectedWorkout}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir programação?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. A programação "{deleteTarget?.title}" será removida permanentemente.
              {deleteTarget?.status === 'published' && (
                <span className="block mt-2 font-medium text-destructive">
                  ⚠️ Este treino está publicado. Ao excluir, ele também será removido do painel dos atletas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish to Athletes Modal */}
      <PublishToAthletesModal
        open={showPublishModal}
        onOpenChange={setShowPublishModal}
        workouts={publishTarget?.workout_json || []}
        title={publishTarget?.title || ''}
        linkedAthletes={linkedAthletes}
        loadingAthletes={loadingAthletes}
        onSuccess={handlePublishSuccess}
        weekStart={publishTarget?.week_start || null}
        workoutId={publishTarget?.id || null}
      />
    </div>
  );
}
