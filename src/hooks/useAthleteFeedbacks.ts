import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SessionFeedbackRecord {
  id: string;
  athlete_id: string;
  coach_id: string | null;
  workout_day: string;
  workout_stimulus: string | null;
  session_date: string;
  block_results: any[];
  athlete_comment: string | null;
  ai_feedback: string | null;
  created_at: string;
  // Joined from profiles
  athlete_name?: string | null;
  athlete_email?: string | null;
}

/** Save session feedback (athlete side) */
export function useSaveSessionFeedback() {
  const [isSaving, setIsSaving] = useState(false);

  const saveFeedback = async (params: {
    workoutDay: string;
    workoutStimulus?: string;
    blockResults: any[];
    athleteComment?: string;
    aiFeedback?: string;
    coachProfileId?: string | null;
  }) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('workout_session_feedback' as any)
        .insert({
          athlete_id: user.id,
          coach_id: params.coachProfileId || null,
          workout_day: params.workoutDay,
          workout_stimulus: params.workoutStimulus || null,
          block_results: params.blockResults,
          athlete_comment: params.athleteComment || null,
          ai_feedback: params.aiFeedback || null,
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[useSaveSessionFeedback] Error:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveFeedback, isSaving };
}

/** Fetch feedbacks for coach view */
export function useCoachFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<SessionFeedbackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeedbacks = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get linked athlete IDs
      const { data: links } = await supabase
        .from('coach_athletes')
        .select('athlete_id')
        .eq('coach_id', user.id);

      if (!links || links.length === 0) {
        setFeedbacks([]);
        setIsLoading(false);
        return;
      }

      const athleteIds = links.map(l => l.athlete_id);

      // Fetch feedbacks
      const { data: fbData, error } = await supabase
        .from('workout_session_feedback' as any)
        .select('*')
        .in('athlete_id', athleteIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[useCoachFeedbacks] Error:', error);
        setFeedbacks([]);
        setIsLoading(false);
        return;
      }

      // Get profile names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', athleteIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const enriched: SessionFeedbackRecord[] = (fbData || []).map((fb: any) => ({
        ...fb,
        block_results: fb.block_results || [],
        athlete_name: profileMap.get(fb.athlete_id)?.name || null,
        athlete_email: profileMap.get(fb.athlete_id)?.email || null,
      }));

      setFeedbacks(enriched);
    } catch (err) {
      console.error('[useCoachFeedbacks] Error:', err);
      setFeedbacks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  return { feedbacks, isLoading, refetch: fetchFeedbacks };
}
