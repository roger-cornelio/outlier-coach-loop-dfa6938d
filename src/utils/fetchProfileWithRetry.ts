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
 * Gets profile.id using RPC function (SECURITY DEFINER - bypasses RLS)
 * Then constructs profile data from auth user metadata to avoid profiles table RLS recursion
 */
export async function fetchProfileWithRetry(
  userId: string,
  userEmail?: string,
  userName?: string
): Promise<{ data: ProfileResult | null; error: string | null }> {
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      // Use RPC function to get profile.id (bypasses RLS via SECURITY DEFINER)
      const { data: profileId, error: rpcError } = await supabase
        .rpc('get_profile_id', { _user_id: userId });

      if (rpcError) {
        lastError = rpcError.message;
        console.warn(`[fetchProfileWithRetry] Attempt ${attempt + 1} RPC failed:`, rpcError.message);
      } else if (profileId) {
        // Success - construct profile from available data
        // We use auth data to avoid querying profiles table directly
        const profile: ProfileResult = {
          id: profileId,
          user_id: userId,
          email: userEmail || '',
          name: userName || null,
          coach_id: null,
          last_active_at: null,
          created_at: new Date().toISOString(),
        };
        return { data: profile, error: null };
      } else {
        lastError = 'Profile ID not found';
        console.warn(`[fetchProfileWithRetry] Attempt ${attempt + 1}: profile ID not found yet`);
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
