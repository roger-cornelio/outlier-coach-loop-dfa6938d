import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type EventName = 
  | 'app_opened'
  | 'workout_generated'
  | 'workout_viewed'
  | 'workout_completed'
  | 'benchmark_completed'
  | 'coach_analytics_viewed'
  | 'admin_params_saved'
  | 'params_version_activated'
  | 'coach_application_submitted'
  | 'coach_application_approved'
  | 'coach_application_rejected';

interface UseEventsReturn {
  trackEvent: (eventName: EventName, properties?: Record<string, unknown>) => Promise<void>;
}

export function useEvents(): UseEventsReturn {
  const { user, profile } = useAuth();
  const hasTrackedAppOpened = useRef(false);

  // Track app_opened on mount (once per session)
  useEffect(() => {
    if (user && profile?.id && !hasTrackedAppOpened.current) {
      hasTrackedAppOpened.current = true;
      trackAppOpened(profile.id);
    }
  }, [user, profile?.id]);

  const trackEvent = useCallback(async (
    eventName: EventName, 
    properties: Record<string, unknown> = {}
  ) => {
    if (!profile?.id) {
      console.warn('[useEvents] Cannot track event - no profile id');
      return;
    }

    try {
      // Use raw query since types haven't been regenerated yet
      const { error } = await supabase
        .from('events')
        .insert({
          user_id: profile.id,
          event_name: eventName,
          properties,
        } as any);

      if (error) {
        console.error('[useEvents] Error tracking event:', error);
      }
    } catch (err) {
      console.error('[useEvents] Exception tracking event:', err);
    }
  }, [profile?.id]);

  return { trackEvent };
}

// Separate function for app_opened to also update last_active_at
async function trackAppOpened(profileId: string) {
  try {
    // Track event (use any since types haven't been regenerated)
    await supabase
      .from('events')
      .insert({
        user_id: profileId,
        event_name: 'app_opened',
        properties: { timestamp: new Date().toISOString() },
      } as any);

    // Update last_active_at
    await supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', profileId);

  } catch (err) {
    console.error('[useEvents] Error tracking app_opened:', err);
  }
}
