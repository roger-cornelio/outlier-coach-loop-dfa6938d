import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'coach' | 'user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);

  // Computed properties
  const isAdmin = role === 'admin';
  const isCoach = role === 'coach';
  const canManageWorkouts = role === 'admin' || role === 'coach';

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role check with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            checkUserRole(session.user.id);
          }, 0);
        } else {
          setRole('user');
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
    try {
      // Check for admin first, then coach
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error checking user role:', error);
        setRole('user');
      } else if (roles && roles.length > 0) {
        // Prioritize admin over coach - cast to string for comparison
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
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Always clear local state, even if server returns an error
    // (e.g., session already expired/doesn't exist)
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('SignOut error (session may already be invalid):', error);
    }
    
    // Clear state regardless of server response
    setSession(null);
    setUser(null);
    setRole('user');
    
    return { error: null };
  };

  return {
    user,
    session,
    role,
    isAdmin,
    isCoach,
    canManageWorkouts,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
