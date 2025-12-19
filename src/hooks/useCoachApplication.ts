import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEvents } from './useEvents';

export type ApplicationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface CoachApplication {
  id: string;
  user_id: string;
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
  const { user, profile, isCoach } = useAuth();
  const { trackEvent } = useEvents();
  const [application, setApplication] = useState<CoachApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status: ApplicationStatus = isCoach 
    ? 'approved' 
    : (application?.status as ApplicationStatus) || 'none';

  // Fetch user's application using profile.id (from RPC, no profiles table query)
  const fetchApplication = useCallback(async () => {
    // Need profile.id to query coach_applications (FK to profiles.id)
    if (!profile?.id) {
      console.log('[fetchApplication] No profile.id yet, skipping');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[fetchApplication] Fetching for profile.id:', profile.id);
      
      // Get most recent application for this user
      const { data, error: fetchError } = await supabase
        .from('coach_applications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('[fetchApplication] Error:', fetchError);
        setError('Erro ao carregar solicitação');
      } else {
        console.log('[fetchApplication] Result:', data?.status || 'none');
        setApplication(data as CoachApplication | null);
      }
    } catch (err) {
      console.error('[fetchApplication] Exception:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  // Submit application - accepts optional profileId for cases where hook's profile isn't updated yet
  const submitApplication = async (
    formData: CoachApplicationFormData, 
    overrideProfileId?: string
  ): Promise<boolean> => {
    const targetProfileId = overrideProfileId || profile?.id;
    
    console.log('[submitApplication] Starting with:', {
      targetProfileId,
      authUserId: user?.id,
      email: formData.email,
    });

    if (!targetProfileId) {
      setError('Usuário não autenticado');
      console.error('[submitApplication] No profile ID available');
      return false;
    }

    try {
      setSubmitting(true);
      setError(null);

      const applicationData = {
        user_id: targetProfileId,
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

      console.log('[submitApplication] Upserting:', applicationData);

      // Upsert (insert or update if exists)
      const { data, error: upsertError } = await supabase
        .from('coach_applications')
        .upsert(applicationData as any, { onConflict: 'user_id' })
        .select()
        .single();

      if (upsertError) {
        console.error('[submitApplication] Upsert error:', upsertError);
        
        // If duplicate error, fetch existing application instead of showing error
        if (upsertError.code === '23505' || upsertError.message.includes('duplicate')) {
          console.log('[submitApplication] Duplicate detected, fetching existing...');
          await fetchApplication();
          // Check if we got a pending application
          if (application?.status === 'pending') {
            console.log('[submitApplication] Already pending, treating as success');
            return true;
          }
        }
        
        // Show real error message for debugging
        setError(`Erro: ${upsertError.message}`);
        return false;
      }

      console.log('[submitApplication] Success:', data);
      
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

  // Approve application
  const approveApplication = async (applicationId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error: rpcError } = await supabase
        .rpc('approve_coach_application', {
          _application_id: applicationId,
          _admin_id: user.id,
        });

      if (rpcError) {
        console.error('Error approving application:', rpcError);
        setError('Erro ao aprovar solicitação');
        return false;
      }

      // Track event
      trackEvent('coach_application_approved', {
        application_id: applicationId,
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
