/**
 * CoachProgramsTab - Lista de programações salvas/publicadas do coach
 * 
 * Lê dados do banco (workouts) e exibe com ações:
 * - Ver detalhes (modal com semana completa)
 * - Despublicar (volta para rascunho)
 * - Excluir
 * 
 * REGRA: Apenas dados do banco, nunca preview local.
 */

import { useState } from 'react';
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
  X,
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
}

function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'published':
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <Send className="w-3 h-3 mr-1" />
          Publicado
        </Badge>
      );
    case 'archived':
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          <Archive className="w-3 h-3 mr-1" />
          Arquivado
        </Badge>
      );
    default:
      return (
        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          <Clock className="w-3 h-3 mr-1" />
          Rascunho
        </Badge>
      );
  }
}

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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {workout.title}
          </DialogTitle>
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
                <div key={dayWorkout.day} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleDay(dayWorkout.day)}
                    className="w-full p-3 flex items-center justify-between bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{DAY_NAMES[dayWorkout.day] || dayWorkout.day}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {dayWorkout.blocks?.length || 0} bloco(s)
                      </span>
                    </div>
                    {expandedDays.has(dayWorkout.day) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {expandedDays.has(dayWorkout.day) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 space-y-3 bg-background">
                          {dayWorkout.blocks?.map((block: WorkoutBlock, idx: number) => (
                            <div key={block.id || idx} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                              <span className="text-sm font-medium">{block.title || block.type}</span>
                              <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-background/50 p-2 rounded">
                                {block.content}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function CoachProgramsTab() {
  const { workouts, loading, error, publishWorkout, archiveWorkout, deleteWorkout, refetch } = useCoachWorkouts();
  const { toast } = useToast();
  const [selectedWorkout, setSelectedWorkout] = useState<CoachWorkout | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CoachWorkout | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleView = (workout: CoachWorkout) => {
    setSelectedWorkout(workout);
    setShowDetailModal(true);
  };

  const handlePublish = async (id: string) => {
    setIsProcessing(true);
    const success = await publishWorkout(id);
    setIsProcessing(false);
    if (success) {
      toast({ title: 'Programação publicada!' });
    } else {
      toast({ title: 'Erro ao publicar', variant: 'destructive' });
    }
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
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
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
                            <span className="text-xs text-muted-foreground">
                              {formatDate(workout.updated_at)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={workout.status} />
                          
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(workout)}
                              className="h-8 w-8 p-0"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            {workout.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePublish(workout.id)}
                                disabled={isProcessing}
                                className="h-8 w-8 p-0 text-green-500 hover:bg-green-500/10"
                                title="Publicar"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {workout.status === 'published' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnpublish(workout.id)}
                                disabled={isProcessing}
                                className="h-8 w-8 p-0"
                                title="Arquivar"
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {workout.status === 'archived' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePublish(workout.id)}
                                disabled={isProcessing}
                                className="h-8 w-8 p-0 text-green-500 hover:bg-green-500/10"
                                title="Republicar"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(workout)}
                              disabled={isProcessing}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
    </div>
  );
}
