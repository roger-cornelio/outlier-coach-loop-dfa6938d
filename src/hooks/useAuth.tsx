import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SUPERADMIN_EMAILS } from "@/config/superadminEmails";
import { fetchProfileWithRetry } from "@/utils/fetchProfileWithRetry";

export type UserRole = "superadmin" | "admin" | "coach" | "user";

export interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
  coach_id: string | null;
  last_active_at: string | null;
  created_at: string;
}

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isCoach: boolean;
  canManageWorkouts: boolean;
  loading: boolean;
  sessionExpired: boolean;
  signIn: (email: string, password: string) => Promise<{ error: unknown | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: unknown | null }>;
  signOut: () => Promise<{ error: null }>;
  refreshSession: () => Promise<{ error: unknown | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Computed properties - PRIORITY: superadmin > admin > coach > user
  const isSuperAdmin = role === "superadmin";
  const isAdmin = role === "admin" || role === "superadmin";
  const isCoach = role === "coach";
  const canManageWorkouts = role === "admin" || role === "coach" || role === "superadmin";

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await fetchProfileWithRetry(userId);

      if (error) {
        console.error("Error fetching profile after retries:", error);
        setProfile(null);
      } else if (data) {
        setProfile(data as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("Error in fetchProfile:", err);
      setProfile(null);
    }
  }, []);

  const syncRolesOnBootstrap = useCallback(async (userId: string, email: string) => {
    try {
      // Check if email is in default superadmin list (frontend check for faster UX)
      const isSuperadminEmail = DEFAULT_SUPERADMIN_EMAILS.includes(email.toLowerCase());

      // 1. Ensure superadmin role for fixed emails
      await supabase.rpc("ensure_superadmin_role", {
        _user_id: userId,
        _email: email,
      });

      // 2. Sync admin role from allowlist
      await supabase.rpc("sync_admin_role_from_allowlist", {
        _user_id: userId,
        _email: email,
      });

      return isSuperadminEmail;
    } catch (err) {
      console.error("Error syncing roles on bootstrap:", err);
      return false;
    }
  }, []);

  const checkUserRole = useCallback(async (userId: string) => {
    try {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.error("Error checking user role:", error);
        setRole("user");
      } else if (roles && roles.length > 0) {
        const roleNames = roles.map((r) => String(r.role));
        // Priority: superadmin > admin > coach > user
        if (roleNames.includes("superadmin")) {
          setRole("superadmin");
        } else if (roleNames.includes("admin")) {
          setRole("admin");
        } else if (roleNames.includes("coach")) {
          setRole("coach");
        } else {
          setRole("user");
        }
      } else {
        setRole("user");
      }
    } catch (err) {
      console.error("Error in checkUserRole:", err);
      setRole("user");
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error("Error refreshing session:", error);
        setSessionExpired(true);
        return { error };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        setSessionExpired(false);

        if (data.session.user) {
          const email = data.session.user.email || "";
          await syncRolesOnBootstrap(data.session.user.id, email);
          await Promise.all([
            checkUserRole(data.session.user.id),
            fetchProfile(data.session.user.id),
          ]);
        }
      }

      return { error: null };
    } catch (err) {
      console.error("Error in refreshSession:", err);
      setSessionExpired(true);
      return { error: err };
    }
  }, [checkUserRole, fetchProfile, syncRolesOnBootstrap]);

  useEffect(() => {
    // Track if initial session check is done
    let initialCheckDone = false;

    console.log('[DEBUG useAuth] useEffect mount - setting up auth listener');

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[DEBUG useAuth] onAuthStateChange:', event, '| session:', !!session, '| initialCheckDone:', initialCheckDone);
      // CRITICAL: Keep loading=true during auth state changes until fully resolved
      // Only the initial getSession or this handler will set loading=false
      
      setSession(session);
      setUser(session?.user ?? null);
      setSessionExpired(false);

      // If initial check already ran, handle subsequent auth changes
      if (initialCheckDone) {
        if (session?.user) {
          // Keep loading true while we fetch roles/profile
          setLoading(true);
          const email = session.user.email || "";
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(async () => {
            try {
              await syncRolesOnBootstrap(session.user.id, email);
              await Promise.all([
                checkUserRole(session.user.id),
                fetchProfile(session.user.id),
              ]);
            } finally {
              console.log('[DEBUG useAuth] onAuthStateChange - setting loading=false after roles/profile');
              setLoading(false);
            }
          }, 0);
        } else {
          // User signed out
          setRole("user");
          setProfile(null);
          console.log('[DEBUG useAuth] onAuthStateChange - setting loading=false (signed out)');
          setLoading(false);
        }
      }
      // If initial check hasn't run yet, let getSession handle loading state
    });

    // THEN check for existing session (runs once on mount)
    const initSession = async () => {
      console.log('[DEBUG useAuth] initSession START - loading is true');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('[DEBUG useAuth] getSession result:', !!session, '| user:', session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // loading is already true from initial state
          const email = session.user.email || "";
          console.log('[DEBUG useAuth] initSession - syncing roles for:', email);
          await syncRolesOnBootstrap(session.user.id, email);
          await Promise.all([
            checkUserRole(session.user.id),
            fetchProfile(session.user.id),
          ]);
          console.log('[DEBUG useAuth] initSession - roles/profile DONE');
        }
      } catch (err) {
        console.error("Error initializing session:", err);
      } finally {
        // Mark initial check as done BEFORE setting loading=false
        initialCheckDone = true;
        console.log('[DEBUG useAuth] initSession FINALLY - setting loading=false');
        setLoading(false);
      }
    };

    initSession();

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

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
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
  }, []);

  const signOut = useCallback(async () => {
    // Always clear local state, even if server returns an error
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("SignOut error (session may already be invalid):", error);
    }

    // Clear state regardless of server response
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole("user");
    setSessionExpired(false);
    setLoading(false);

    return { error: null };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
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
    }),
    [
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
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
