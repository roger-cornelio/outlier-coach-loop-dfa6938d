import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExerciseSuggestion {
  id: string;
  coach_id: string;
  exercise_name: string;
  context_block_title: string | null;
  status: string;
  movement_pattern_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

/**
 * Hook para coaches submeterem sugestões de exercícios
 */
export function useExerciseSuggestionSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const submitSuggestion = useCallback(async (exerciseName: string, blockTitle?: string) => {
    const trimmed = exerciseName.trim();
    if (!trimmed || submitted.has(trimmed.toLowerCase())) return false;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { error } = await supabase.from('exercise_suggestions').insert({
        coach_id: user.id,
        exercise_name: trimmed,
        context_block_title: blockTitle || null,
      } as any);

      if (error) throw error;

      setSubmitted(prev => new Set(prev).add(trimmed.toLowerCase()));
      toast({ title: 'Sugestão enviada', description: `"${trimmed}" foi enviado para revisão.` });
      return true;
    } catch (err: any) {
      toast({ title: 'Erro ao enviar sugestão', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [submitted, toast]);

  return { submitSuggestion, submitting, submitted };
}

/**
 * Hook para admin gerenciar sugestões
 */
export function useExerciseSuggestionsAdmin() {
  const [suggestions, setSuggestions] = useState<ExerciseSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exercise_suggestions')
        .select('*')
        .order('created_at', { ascending: false }) as any;

      if (error) throw error;
      setSuggestions(data || []);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar sugestões', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const approveSuggestion = useCallback(async (id: string, movementPatternId: string, exerciseName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const normalizedName = exerciseName.trim().toLowerCase();

      // 1. Find all pending suggestions with the same exercise name
      const duplicateIds = suggestions
        .filter(s => s.status === 'pending' && s.exercise_name.trim().toLowerCase() === normalizedName)
        .map(s => s.id);

      // Ensure the clicked one is included
      if (!duplicateIds.includes(id)) duplicateIds.push(id);

      // 2. Approve all matching suggestions
      const { error: updateErr } = await supabase
        .from('exercise_suggestions')
        .update({
          status: 'approved',
          movement_pattern_id: movementPatternId,
          reviewed_by: user?.id,
          reviewed_at: now,
        } as any)
        .in('id', duplicateIds) as any;

      if (updateErr) throw updateErr;

      // 3. Insert into global_exercises (only once)
      const { error: insertErr } = await supabase
        .from('global_exercises')
        .insert({
          name: exerciseName,
          movement_pattern_id: movementPatternId,
        });

      if (insertErr) throw insertErr;

      const count = duplicateIds.length;
      toast({
        title: 'Exercício aprovado',
        description: count > 1
          ? `"${exerciseName}" adicionado ao sistema (${count} sugestões aprovadas).`
          : `"${exerciseName}" adicionado ao sistema.`,
      });
      await fetchSuggestions();
    } catch (err: any) {
      toast({ title: 'Erro ao aprovar', description: err.message, variant: 'destructive' });
    }
  }, [toast, fetchSuggestions, suggestions]);

  const rejectSuggestion = useCallback(async (id: string, reason?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('exercise_suggestions')
        .update({
          status: 'rejected',
          admin_notes: reason || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq('id', id) as any;

      if (error) throw error;

      toast({ title: 'Sugestão rejeitada' });
      await fetchSuggestions();
    } catch (err: any) {
      toast({ title: 'Erro ao rejeitar', description: err.message, variant: 'destructive' });
    }
  }, [toast, fetchSuggestions]);

  return { suggestions, loading, fetchSuggestions, approveSuggestion, rejectSuggestion };
}
