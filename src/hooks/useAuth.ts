import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SUPERADMIN_EMAILS } from '@/config/superadminEmails';

export type UserRole = 'superadmin' | 'admin' | 'coach' | 'user';

export interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
  coach_id: string | null;
  last_active_at: string | null;
  created_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Computed properties - PRIORITY: superadmin > admin > coach > user
  const isSuperAdmin = role === 'superadmin';
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isCoach = role === 'coach';
  const canManageWorkouts = role === 'admin' || role === 'coach' || role === 'superadmin';

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      setProfile(null);
    }
  }, []);

  const syncRolesOnBootstrap = useCallback(async (userId: string, email: string) => {
    try {
      // Check if email is in default superadmin list (frontend check for faster UX)
      const isSuperadminEmail = DEFAULT_SUPERADMIN_EMAILS.includes(email.toLowerCase());
      
      // 1. Ensure superadmin role for fixed emails
      await supabase.rpc('ensure_superadmin_role', { 
        _user_id: userId, 
        _email: email 
      });

      // 2. Sync admin role from allowlist
      await supabase.rpc('sync_admin_role_from_allowlist', { 
        _user_id: userId, 
        _email: email 
      });
      
      return isSuperadminEmail;
    } catch (err) {
      console.error('Error syncing roles on bootstrap:', err);
      return false;
    }
  }, []);

  const checkUserRole = useCallback(async (userId: string) => {
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error checking user role:', error);
        setRole('user');
      } else if (roles && roles.length > 0) {
        const roleNames = roles.map(r => String(r.role));
        // Priority: superadmin > admin > coach > user
        if (roleNames.includes('superadmin')) {
          setRole('superadmin');
        } else if (roleNames.includes('admin')) {
          setRole('admin');
        } else if (roleNames.includes('coach')) {
          setRole('coach');
        } else {
          setRole('user');
        }
      } else {
        setRole('user');
      }
    } catch (err) {
      console.error('Error in checkUserRole:', err);
      setRole('user');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        setSessionExpired(true);
        return { error };
      }
      
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        setSessionExpired(false);
        
        if (data.session.user) {
          const email = data.session.user.email || '';
          await syncRolesOnBootstrap(data.session.user.id, email);
          await Promise.all([
            checkUserRole(data.session.user.id),
            fetchProfile(data.session.user.id),
          ]);
        }
      }
      
      return { error: null };
    } catch (err) {
      console.error('Error in refreshSession:', err);
      setSessionExpired(true);
      return { error: err };
    }
  }, [checkUserRole, fetchProfile, syncRolesOnBootstrap]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setSessionExpired(false);
        
        // Defer role and profile check with setTimeout to avoid deadlock
        if (session?.user) {
          const email = session.user.email || '';
          setTimeout(async () => {
            await syncRolesOnBootstrap(session.user.id, email);
            await Promise.all([
              checkUserRole(session.user.id),
              fetchProfile(session.user.id),
            ]);
          }, 0);
        } else {
          setRole('user');
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const email = session.user.email || '';
        await syncRolesOnBootstrap(session.user.id, email);
        await Promise.all([
          checkUserRole(session.user.id),
          fetchProfile(session.user.id),
        ]);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkUserRole, fetchProfile, syncRolesOnBootstrap]);

  // Check session expiration periodically
  useEffect(() => {
    if (!session) return;

    const checkExpiration = () => {
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expiresAtMs = expiresAt * 1000;
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        // If session expires in less than 5 minutes, mark as expired
        if (expiresAtMs - now < fiveMinutes) {
          setSessionExpired(true);
        }
      }
    };

    // Check immediately and then every minute
    checkExpiration();
    const interval = setInterval(checkExpiration, 60 * 1000);

    return () => clearInterval(interval);
  }, [session]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: name ? { name } : undefined,
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Always clear local state, even if server returns an error
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('SignOut error (session may already be invalid):', error);
    }
    
    // Clear state regardless of server response
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole('user');
    setSessionExpired(false);
    
    return { error: null };
  };

  return {
    user,
    session,
    profile,
    role,
    isSuperAdmin,
    isAdmin,
    isCoach,
    canManageWorkouts,
    loading,
    sessionExpired,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };
}
