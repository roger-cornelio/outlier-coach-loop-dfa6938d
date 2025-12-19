import { supabase } from '@/integrations/supabase/client';

interface ProfileResult {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  coach_id: string | null;
  last_active_at: string | null;
  created_at: string;
}

const RETRY_DELAYS = [300, 800, 1500]; // ms

/**
 * Fetches user profile with retry/backoff to handle race conditions
 * after signup when the trigger might not have created the profile yet.
 */
export async function fetchProfileWithRetry(
  userId: string
): Promise<{ data: ProfileResult | null; error: string | null }> {
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        lastError = error.message;
        console.warn(`[fetchProfileWithRetry] Attempt ${attempt + 1} failed:`, error.message);
      } else if (data) {
        // Success - profile found
        return { data, error: null };
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
