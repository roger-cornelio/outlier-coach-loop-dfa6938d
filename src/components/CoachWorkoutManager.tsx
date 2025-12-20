/**
 * CoachWorkoutManager - UI para gestão de treinos do coach
 * 
 * Funcionalidades:
 * - Lista treinos do coach (vindos do banco)
 * - Mostra: Título | Status | Preço | Ações
 * - Ações: Editar, Publicar, Arquivar, Deletar
 * 
 * REGRAS DE VISIBILIDADE (feedback visual):
 * - Draft → só coach vê
 * - Published + price=0 → atleta vê
 * - Published + price>0 → não aparece para atleta
 * - Archived → não aparece para ninguém
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Eye, 
  EyeOff, 
  Archive, 
  Trash2, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Loader2,
  AlertCircle,
  Send
} from 'lucide-react';
import { useCoachWorkouts, type CoachWorkout, type WorkoutStatus } from '@/hooks/useCoachWorkouts';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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

interface StatusBadgeProps {
  status: WorkoutStatus;
  price: number;
}

function StatusBadge({ status, price }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'published':
        if (price === 0) {
          return {
            icon: Eye,
            label: 'Publicado (Grátis)',
            description: 'Atletas podem ver',
            className: 'bg-green-500/10 text-green-500 border-green-500/20',
          };
        }
        return {
          icon: DollarSign,
          label: `Publicado (R$${price})`,
          description: 'Atletas não veem (pago)',
          className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        };
      case 'archived':
        return {
          icon: Archive,
          label: 'Arquivado',
          description: 'Ninguém vê',
          className: 'bg-muted text-muted-foreground border-border',
        };
      default:
        return {
          icon: Clock,
          label: 'Rascunho',
          description: 'Só você vê',
          className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  );
}

interface WorkoutCardProps {
  workout: CoachWorkout;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

function WorkoutCard({ workout, onPublish, onArchive, onDelete, isLoading }: WorkoutCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const workoutCount = workout.workout_json?.length || 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-card border border-border/50 rounded-lg p-4 hover:border-border transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <h3 className="font-medium text-foreground truncate">{workout.title}</h3>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span>{workoutCount} treinos</span>
              <span>•</span>
              <span>Atualizado: {formatDate(workout.updated_at)}</span>
            </div>

            <StatusBadge status={workout.status} price={workout.price} />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {workout.status === 'draft' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPublish(workout.id)}
                disabled={isLoading}
                className="text-green-600 border-green-600/30 hover:bg-green-500/10"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Publicar
              </Button>
            )}

            {workout.status === 'published' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onArchive(workout.id)}
                disabled={isLoading}
              >
                <Archive className="w-3.5 h-3.5 mr-1" />
                Arquivar
              </Button>
            )}

            {workout.status === 'archived' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPublish(workout.id)}
                disabled={isLoading}
                className="text-green-600 border-green-600/30 hover:bg-green-500/10"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                Republicar
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </motion.div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O treino "{workout.title}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(workout.id);
                setShowDeleteConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CoachWorkoutManager() {
  const { workouts, loading, error, publishWorkout, archiveWorkout, deleteWorkout, refetch } = useCoachWorkouts();
  const { toast } = useToast();

  const handlePublish = async (id: string) => {
    const success = await publishWorkout(id);
    if (success) {
      toast({
        title: 'Treino publicado!',
        description: 'Atletas agora podem ver este treino.',
      });
    } else {
      toast({
        title: 'Erro ao publicar',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async (id: string) => {
    const success = await archiveWorkout(id);
    if (success) {
      toast({
        title: 'Treino arquivado',
        description: 'O treino não está mais visível para atletas.',
      });
    } else {
      toast({
        title: 'Erro ao arquivar',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteWorkout(id);
    if (success) {
      toast({
        title: 'Treino deletado',
        description: 'O treino foi removido permanentemente.',
      });
    } else {
      toast({
        title: 'Erro ao deletar',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
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
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <FileText className="w-12 h-12 text-muted-foreground/50" />
        <div>
          <p className="text-foreground font-medium">Nenhum treino salvo</p>
          <p className="text-muted-foreground text-sm mt-1">
            Crie treinos na aba "Planilha" e salve para visualizá-los aqui.
          </p>
        </div>
      </div>
    );
  }

  // Group by status for better organization
  const drafts = workouts.filter(w => w.status === 'draft');
  const published = workouts.filter(w => w.status === 'published');
  const archived = workouts.filter(w => w.status === 'archived');

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-500">{drafts.length}</p>
          <p className="text-xs text-muted-foreground">Rascunhos</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-500">{published.length}</p>
          <p className="text-xs text-muted-foreground">Publicados</p>
        </div>
        <div className="bg-muted border border-border rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{archived.length}</p>
          <p className="text-xs text-muted-foreground">Arquivados</p>
        </div>
      </div>

      {/* Visibility Legend */}
      <div className="bg-secondary/30 border border-border/50 rounded-lg p-3">
        <p className="text-xs font-medium text-foreground mb-2">Legenda de visibilidade:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Rascunho = só você vê</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Publicado grátis = atletas veem</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span>Arquivado = ninguém vê</span>
          </div>
        </div>
      </div>

      {/* Workout List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onPublish={handlePublish}
              onArchive={handleArchive}
              onDelete={handleDelete}
              isLoading={loading}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}