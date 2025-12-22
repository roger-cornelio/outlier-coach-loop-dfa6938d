import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SUPERADMIN_EMAILS } from "@/config/superadminEmails";
import { fetchProfileWithRetry } from "@/utils/fetchProfileWithRetry";
import { useOutlierStore } from "@/store/outlierStore";

export type UserRole = "superadmin" | "admin" | "coach" | "user";

export interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
  coach_id: string | null;
  coach_style: string | null;
  first_setup_completed: boolean;
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
  /** Carregamento do perfil (separado do auth/roles) */
  profileLoading: boolean;
  /** True quando já tentamos carregar o perfil (mesmo se vier null) */
  profileLoaded: boolean;
  sessionExpired: boolean;
  updateProfileOptimistic: (patch: Partial<UserProfile>) => void;
  /** Recarrega o perfil do banco de dados */
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: unknown | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: unknown | null }>;
  signOut: () => Promise<{ error: null }>;
  refreshSession: () => Promise<{ error: unknown | null }>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Profile status (separado): usado para decidir onboarding SEM flicker
  // 'missing' = profile não existe no banco (usuário novo, precisa de onboarding)
  const [profileStatus, setProfileStatus] = useState<'idle' | 'loading' | 'loaded' | 'missing'>('idle');
  const profileLoading = profileStatus === 'loading';
  const profileLoaded = profileStatus === 'loaded' || profileStatus === 'missing';

  // Track previous user ID to detect user changes
  const previousUserIdRef = useRef<string | null>(null);
  
  // ANTI-LOOP: Track if we already fetched profile for this user
  const profileFetchedForUserRef = useRef<string | null>(null);
  
  const resetToDefaults = useOutlierStore((state) => state.resetToDefaults);
  const resetUserPreferencesOnly = useOutlierStore((state) => state.resetUserPreferencesOnly);

  // Computed properties - PRIORITY: superadmin > admin > coach > user
  const isSuperAdmin = role === "superadmin";
  const isAdmin = role === "admin" || role === "superadmin";
  const isCoach = role === "coach";
  const canManageWorkouts = role === "admin" || role === "coach" || role === "superadmin";

  // ============================================
  // REGRA FUNDAMENTAL: Profile not found NÃO é erro de auth
  // Se session existe mas profile não, usuário continua logado
  // ============================================
  
  // BACKFILL: Silently set first_setup_completed = true for users
  // who have config data but missing the flag
  const backfillFirstSetupCompleted = useCallback(async (
    userId: string,
    profileData: { training_level: string | null; session_duration: string | null; first_setup_completed: boolean | null }
  ) => {
    // Só executar backfill se:
    // 1. first_setup_completed é null/undefined/false
    // 2. E existe training_level OU session_duration (dados de config)
    const needsBackfill = 
      !profileData.first_setup_completed && 
      (profileData.training_level || profileData.session_duration);
    
    if (!needsBackfill) return;
    
    console.log('[useAuth] Backfill: Setting first_setup_completed=true for user with existing config data');
    
    try {
      await supabase
        .from('profiles')
        .update({ first_setup_completed: true })
        .eq('user_id', userId);
    } catch (err) {
      console.error('[useAuth] Backfill error (non-blocking):', err);
    }
  }, []);
  
  const fetchProfile = useCallback(async (userId: string) => {
    // ANTI-LOOP: Se já buscamos para este usuário, não buscar novamente
    if (profileFetchedForUserRef.current === userId) {
      console.log('[useAuth] Profile already fetched for this user, skipping');
      return;
    }
    
    setProfileStatus('loading');
    try {
      const { data, error } = await fetchProfileWithRetry(userId);

      if (error) {
        // CRÍTICO: Error fetching profile NÃO causa logout
        // Apenas marca como missing para trigger de onboarding
        console.warn("[useAuth] Profile fetch error (NOT logging out):", error);
        setProfile(null);
        setProfileStatus('missing');
      } else if (data) {
        const profileData = data as UserProfile & { training_level?: string | null; session_duration?: string | null };
        
        // === BACKFILL para usuários antigos ===
        // Executa em background, não bloqueia o fluxo
        backfillFirstSetupCompleted(userId, {
          training_level: profileData.training_level ?? null,
          session_duration: profileData.session_duration ?? null,
          first_setup_completed: profileData.first_setup_completed,
        });
        
        // REGRA: first_setup_completed nunca pode ser null no estado local
        // Força boolean para garantir decisões corretas
        const normalizedProfile: UserProfile = {
          ...profileData,
          first_setup_completed: !!profileData.first_setup_completed,
        };
        
        setProfile(normalizedProfile);
        setProfileStatus('loaded');
      } else {
        // Profile não existe = usuário novo, precisa onboarding
        // CRÍTICO: NÃO fazer logout, apenas marcar status
        console.log("[useAuth] Profile not found - user needs onboarding (NOT logging out)");
        setProfile(null);
        setProfileStatus('missing');
      }
      
      // Mark as fetched for this user
      profileFetchedForUserRef.current = userId;
    } catch (err) {
      // CRÍTICO: Exceção NÃO causa logout
      console.error("[useAuth] Exception in fetchProfile (NOT logging out):", err);
      setProfile(null);
      setProfileStatus('missing');
      profileFetchedForUserRef.current = userId;
    }
  }, [backfillFirstSetupCompleted]);

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

      // 3. Sync coach role from approved applications
      // This handles the case where a lead got approved before creating an account
      await supabase.rpc("sync_coach_role_on_login", {
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

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // CRITICAL: Ignore redundant events for same session state
      // This prevents loops from TOKEN_REFRESHED or other events
      
      setSession(session);
      setUser(session?.user ?? null);
      setSessionExpired(false);

      // If initial check already ran, handle subsequent auth changes
      if (initialCheckDone) {
        if (session?.user) {
          // Check if this is a DIFFERENT user than before
          const isNewUser = previousUserIdRef.current !== null && 
                           previousUserIdRef.current !== session.user.id;
          
          // ANTI-LOOP: If same user, skip fetching again
          if (!isNewUser && previousUserIdRef.current === session.user.id) {
            setLoading(false);
            return;
          }
          
          if (isNewUser) {
            // Reset profile fetch tracker for new user
            profileFetchedForUserRef.current = null;
            resetToDefaults();
          }
          
          previousUserIdRef.current = session.user.id;
          
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
              setLoading(false);
            }
          }, 0);
        } else {
          // User signed out - reset store completamente
          resetToDefaults();
          previousUserIdRef.current = null;
          profileFetchedForUserRef.current = null;

          setRole("user");
          setProfile(null);
          setProfileStatus('idle');
          setLoading(false);
        }
      }
      // If initial check hasn't run yet, let getSession handle loading state
    });

    // THEN check for existing session (runs once on mount)
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Check if this is a different user than what was previously stored
          const storedUserId = previousUserIdRef.current;
          if (storedUserId !== null && storedUserId !== session.user.id) {
            profileFetchedForUserRef.current = null;
            resetToDefaults();
          }
          
          previousUserIdRef.current = session.user.id;
          
          // loading is already true from initial state
          const email = session.user.email || "";
          await syncRolesOnBootstrap(session.user.id, email);
          await Promise.all([
            checkUserRole(session.user.id),
            fetchProfile(session.user.id),
          ]);
        } else {
          previousUserIdRef.current = null;
          profileFetchedForUserRef.current = null;
          setProfileStatus('idle');
        }
      } catch (err) {
        // CRITICAL: Session init error does NOT cause logout
        console.error("[useAuth] Error initializing session:", err);
      } finally {
        // Mark initial check as done BEFORE setting loading=false
        initialCheckDone = true;
        setLoading(false);
      }
    };

    initSession();

    return () => subscription.unsubscribe();
  // ANTI-LOOP: Removed baseWorkouts from deps - it was causing re-runs
  }, [checkUserRole, fetchProfile, syncRolesOnBootstrap, resetToDefaults]);

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
    setProfileStatus('idle');
    setRole("user");
    setSessionExpired(false);
    setLoading(false);
    
    // Reset profile fetch tracker
    profileFetchedForUserRef.current = null;

    return { error: null };
  }, []);

  const updateProfileOptimistic = useCallback((patch: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

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
      profileLoading,
      profileLoaded,
      sessionExpired,
      updateProfileOptimistic,
      refreshProfile,
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
      profileLoading,
      profileLoaded,
      sessionExpired,
      updateProfileOptimistic,
      refreshProfile,
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
