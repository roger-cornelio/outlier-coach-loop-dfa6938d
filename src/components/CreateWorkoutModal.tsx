/**
 * CreateWorkoutModal - Modal para criação de treino pelo coach
 */

import { useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Dumbbell } from 'lucide-react';

const workoutSchema = z.object({
  title: z.string().trim().min(3, 'Título deve ter no mínimo 3 caracteres').max(100, 'Título muito longo'),
  description: z.string().trim().max(500, 'Descrição muito longa').optional(),
});

interface CreateWorkoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateWorkoutModal({ open, onOpenChange, onSuccess }: CreateWorkoutModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setErrors({});
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const result = workoutSchema.safeParse({ title, description });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!profile?.id) {
      toast({
        title: 'Erro',
        description: 'Perfil não encontrado. Faça login novamente.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const workoutData = {
        coach_id: profile.id,
        title: title.trim(),
        status: 'draft' as const,
        price: 0,
        workout_json: {
          description: description.trim() || null,
          blocks: [],
          created_by: 'coach',
        },
      };

      console.log('[CreateWorkoutModal] Creating workout:', workoutData);

      const { data, error } = await supabase
        .from('workouts')
        .insert(workoutData)
        .select()
        .single();

      if (error) {
        console.error('[CreateWorkoutModal] Insert error:', error);
        toast({
          title: 'Erro ao criar treino',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      console.log('[CreateWorkoutModal] Workout created:', data);
      
      toast({
        title: 'Treino criado!',
        description: 'O treino foi salvo como rascunho.',
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error('[CreateWorkoutModal] Error:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o treino. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            Novo Treino
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: WOD Segunda-feira"
              className={errors.title ? 'border-destructive' : ''}
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="text-destructive text-xs">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo ou detalhes do treino..."
              rows={3}
              className={errors.description ? 'border-destructive' : ''}
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="text-destructive text-xs">{errors.description}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Treino
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
