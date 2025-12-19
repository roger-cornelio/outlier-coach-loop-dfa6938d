import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'coach' | 'user';

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

  // Computed properties
  const isAdmin = role === 'admin';
  const isCoach = role === 'coach';
  const canManageWorkouts = role === 'admin' || role === 'coach';

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
        if (roleNames.includes('admin')) {
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
  }, [checkUserRole, fetchProfile]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setSessionExpired(false);
        
        // Defer role and profile check with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            Promise.all([
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        Promise.all([
          checkUserRole(session.user.id),
          fetchProfile(session.user.id),
        ]);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkUserRole, fetchProfile]);

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
