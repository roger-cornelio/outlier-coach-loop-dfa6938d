import { supabase } from '@/integrations/supabase/client';

interface ProfileResult {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  coach_id: string | null;
  coach_style: string | null;
  last_active_at: string | null;
  created_at: string;
  // Tri-state no bootstrap (pode vir null/undefined em usuários antigos)
  first_setup_completed?: boolean | null;
  training_level?: string | null;
  session_duration?: string | null;
}

const RETRY_DELAYS = [300, 800, 1500]; // ms

/**
 * Fetches profile directly from profiles table with retry/backoff.
 * Now that RLS is fixed (no recursion), we can query directly.
 */
export async function fetchProfileWithRetry(
  userId: string
): Promise<{ data: ProfileResult | null; error: string | null }> {
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(
          'id, user_id, email, name, coach_id, coach_style, last_active_at, created_at, first_setup_completed, training_level, session_duration'
        )
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        lastError = error.message;
        console.warn(`[fetchProfileWithRetry] Attempt ${attempt + 1} failed:`, error.message);
      } else if (profile) {
        return { data: profile, error: null };
      } else {
        lastError = 'Profile not found';
        console.warn(`[fetchProfileWithRetry] Attempt ${attempt + 1}: profile not found yet`);
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`[fetchProfileWithRetry] Attempt ${attempt + 1} exception:`, lastError);
    }

    // If we have more retries, wait before next attempt
    if (attempt < RETRY_DELAYS.length) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
    }
  }

  // All retries exhausted
  return { data: null, error: lastError || 'Perfil não encontrado após múltiplas tentativas' };
}
