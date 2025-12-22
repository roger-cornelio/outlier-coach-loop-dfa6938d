import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from './useEvents';

export type ApplicationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface CoachApplication {
  id: string;
  user_id: string;
  auth_user_id: string; // New: references auth.uid() directly
  full_name: string | null;
  email: string | null;
  instagram: string | null;
  box_name: string | null;
  city: string | null;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
}

export interface CoachApplicationFormData {
  full_name: string;
  email: string;
  instagram?: string;
  box_name?: string;
  city?: string;
}

export function useCoachApplication() {
  const { user, profile, isCoach, loading: authLoading } = useAuth();
  const { trackEvent } = useEvents();
  const [application, setApplication] = useState<CoachApplication | null>(null);
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status: ApplicationStatus = isCoach 
    ? 'approved' 
    : (application?.status as ApplicationStatus) || 'none';

  // Compute loading state:
  // - If auth is still loading, we're loading (don't know if user exists)
  // - If user exists but we haven't fetched yet or are fetching, we're loading
  // - If no user and auth is done, we're not loading (nothing to fetch)
  const loading = authLoading || (user !== null && fetchState !== 'done');

  // Fetch user's application using auth.uid() directly (via auth_user_id column)
  const fetchApplication = useCallback(async () => {
    // Use auth.uid() directly - no dependency on profile
    if (!user?.id) {
      setFetchState('idle');
      return;
    }

    try {
      setFetchState('loading');
      
      // Get most recent application for this user using auth_user_id
      const { data, error: fetchError } = await supabase
        .from('coach_applications')
        .select('*')
        .eq('auth_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('[fetchApplication] Error:', fetchError);
        setError('Erro ao carregar solicitação');
      } else {
        setApplication(data as CoachApplication | null);
      }
    } catch (err) {
      console.error('[fetchApplication] Exception:', err);
    } finally {
      setFetchState('done');
    }
  }, [user?.id]);

  // Reset state when user changes (logout/login)
  useEffect(() => {
    if (!user?.id) {
      // User logged out or not yet loaded - reset state
      setApplication(null);
      setFetchState('idle');
    }
  }, [user?.id]);

  // Trigger fetch when user becomes available
  useEffect(() => {
    if (user?.id && fetchState === 'idle') {
      fetchApplication();
    }
  }, [user?.id, fetchState, fetchApplication]);

  // Submit application - now uses auth_user_id directly
  const submitApplication = async (
    formData: CoachApplicationFormData
  ): Promise<boolean> => {
    if (!user?.id) {
      setError('Usuário não autenticado');
      return false;
    }

    try {
      setSubmitting(true);
      setError(null);

      const applicationData = {
        auth_user_id: user.id, // Primary key for RLS
        user_id: profile?.id || null, // Keep for compatibility (nullable now)
        full_name: formData.full_name,
        email: formData.email,
        instagram: formData.instagram || null,
        box_name: formData.box_name || null,
        city: formData.city || null,
        message: null,
        status: 'pending',
        created_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null,
        rejection_reason: null,
      };

      // Upsert using auth_user_id as the conflict key
      const { data, error: upsertError } = await supabase
        .from('coach_applications')
        .upsert(applicationData as any, { onConflict: 'auth_user_id' })
        .select()
        .single();

      if (upsertError) {
        console.error('[submitApplication] Upsert error:', upsertError);
        
        // If duplicate error, fetch existing application instead of showing error
        if (upsertError.code === '23505' || upsertError.message.includes('duplicate')) {
          await fetchApplication();
          // Check if we got a pending application
          if (application?.status === 'pending') {
            return true;
          }
        }
        
        // Show real error message for debugging
        setError(`Erro: ${upsertError.message}`);
        return false;
      }

      // Immediately set application as pending (optimistic update)
      setApplication(data as CoachApplication);
      
      // Track event
      trackEvent('coach_application_submitted', {
        application_id: data?.id,
      });

      // Refetch to ensure sync
      await fetchApplication();

      return true;
    } catch (err) {
      console.error('[submitApplication] Exception:', err);
      setError('Erro inesperado');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    application,
    status,
    loading,
    submitting,
    error,
    submitApplication,
    refetch: fetchApplication,
  };
}

// Hook for admin to manage applications
export function useCoachApplicationsAdmin() {
  const { user, isAdmin } = useAuth();
  const { trackEvent } = useEvents();
  const [applications, setApplications] = useState<CoachApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all applications (admin only)
  const fetchApplications = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('coach_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching applications:', fetchError);
        setError('Erro ao carregar solicitações');
      } else {
        setApplications((data || []) as CoachApplication[]);
      }
    } catch (err) {
      console.error('Error in fetchApplications:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Approve application - creates user without password + grants coach role
  const approveApplication = async (applicationId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Get application details
      const app = applications.find((a) => a.id === applicationId);
      if (!app) {
        setError('Solicitação não encontrada');
        return false;
      }

      // Call edge function to create user + grant role
      const { data: createData, error: createError } = await supabase.functions.invoke(
        'create-coach-user',
        {
          body: {
            email: app.email,
            full_name: app.full_name,
            application_id: applicationId,
          },
        }
      );

      if (createError || !createData?.success) {
        console.error('[approveApplication] Error creating coach user:', createError || createData?.error);
        setError('Erro ao criar usuário coach');
        return false;
      }

      // Track event
      trackEvent('coach_application_approved', {
        application_id: applicationId,
        user_id: createData.user_id,
      });

      // Refresh list
      await fetchApplications();
      return true;
    } catch (err) {
      console.error('Error in approveApplication:', err);
      return false;
    }
  };

  // Reject application
  const rejectApplication = async (applicationId: string, reason?: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error: rpcError } = await supabase
        .rpc('reject_coach_application', {
          _application_id: applicationId,
          _admin_id: user.id,
          _reason: reason || null,
        });

      if (rpcError) {
        console.error('Error rejecting application:', rpcError);
        setError('Erro ao rejeitar solicitação');
        return false;
      }

      // Track event
      trackEvent('coach_application_rejected', {
        application_id: applicationId,
        reason,
      });

      // Refresh list
      await fetchApplications();
      return true;
    } catch (err) {
      console.error('Error in rejectApplication:', err);
      return false;
    }
  };

  return {
    applications,
    loading,
    error,
    approveApplication,
    rejectApplication,
    refetch: fetchApplications,
  };
}
