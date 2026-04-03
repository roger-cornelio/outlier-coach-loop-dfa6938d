import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, Loader2, User, ArrowLeft, Shield, UserCog, UserPlus, AlertCircle, Phone } from 'lucide-react';
import { CoachApplicationModal } from '@/components/CoachApplicationModal';
import { QAActivationModal } from '@/components/QAActivationModal';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';
type AuthContext = 'user' | 'coach' | 'admin';

interface AuthProps {
  context?: AuthContext;
}

const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100, 'Senha muito longa'),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100, 'Senha muito longa'),
  sexo: z.enum(['masculino', 'feminino'], { required_error: 'Selecione o sexo' }),
  telefone: z.string().trim().min(8, 'Telefone inválido').max(20, 'Telefone muito longo'),
});

const forgotSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100, 'Senha muito longa'),
  confirmPassword: z.string().min(6, 'Confirme a senha'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export default function Auth({ context = 'user' }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sexo, setSexo] = useState<'masculino' | 'feminino' | ''>('');
  const [telefone, setTelefone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string; sexo?: string; telefone?: string }>({});
  const [resetSent, setResetSent] = useState(false);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showQAModal, setShowQAModal] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const sessionInitialized = useRef(false);
  
  // Hidden QA trigger - 5 clicks on logo
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handleLogoClick = () => {
    // Only in dev/preview
    if (import.meta.env.PROD) return;
    
    logoClickCount.current += 1;
    
    // Reset timer on each click
    if (logoClickTimer.current) {
      clearTimeout(logoClickTimer.current);
    }
    
    // Check if 5 clicks
    if (logoClickCount.current >= 5) {
      logoClickCount.current = 0;
      setShowQAModal(true);
    }
    
    // Reset after 2 seconds of no clicks
    logoClickTimer.current = setTimeout(() => {
      logoClickCount.current = 0;
    }, 2000);
  };

  const { user, canManageWorkouts, isAdmin, isCoach, loading: authLoading } = useAuth();
  const { setCurrentView } = useOutlierStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const initialMode = searchParams.get('mode');

  // Set initial mode from query param (only for user context)
  useEffect(() => {
    if (context !== 'user') return;
    if (initialMode === 'signup') {
      setMode('signup');
    }
    // Detect password reset mode from URL
    if (initialMode === 'reset') {
      setMode('reset-password');
      setIsPasswordResetMode(true);
    }
  }, [initialMode, context]);

  // Listen for PASSWORD_RECOVERY event from Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AUTH][Auth.tsx] event=${event} hasSession=${!!session} ts=${new Date().toISOString()}`);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[AUTH][Auth.tsx] PASSWORD_RECOVERY event detected - showing reset form');
        setMode('reset-password');
        setIsPasswordResetMode(true);
        setSessionReady(true);
        setSessionError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Establish session for password reset flow
  // Supabase sends tokens via hash (#access_token=...) or code (?code=...)
  useEffect(() => {
    const initializeResetSession = async () => {
      // Only run once and only for reset mode
      if (sessionInitialized.current) return;
      if (initialMode !== 'reset') return;
      
      sessionInitialized.current = true;
      console.log('[AUTH][Auth.tsx] Initializing reset session...');
      
      try {
        // First check if we already have a session
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession) {
          console.log('[AUTH][Auth.tsx] Session already exists - ready for password reset');
          setSessionReady(true);
          setSessionError(null);
          return;
        }
        
        // Check for PKCE code in URL query params
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
          console.log('[AUTH][Auth.tsx] Found code param - exchanging for session');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('[AUTH][Auth.tsx] Code exchange failed:', error.message);
            setSessionError('Link expirado ou inválido. Solicite um novo link de recuperação.');
            return;
          }
          
          if (data.session) {
            console.log('[AUTH][Auth.tsx] Session established via code exchange');
            setSessionReady(true);
            setSessionError(null);
            return;
          }
        }
        
        // Check for tokens in URL hash (implicit flow)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          console.log('[AUTH][Auth.tsx] Found tokens in hash - setting session');
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error('[AUTH][Auth.tsx] setSession failed:', error.message);
              setSessionError('Link expirado ou inválido. Solicite um novo link de recuperação.');
              return;
            }
            
            if (data.session) {
              console.log('[AUTH][Auth.tsx] Session established via hash tokens');
              // Clean up hash from URL
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
              setSessionReady(true);
              setSessionError(null);
              return;
            }
          }
        }
        
        // Wait a bit for onAuthStateChange to fire (Supabase client handles token automatically)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Final check
        const { data: { session: finalSession } } = await supabase.auth.getSession();
        if (finalSession) {
          console.log('[AUTH][Auth.tsx] Session found after wait');
          setSessionReady(true);
          setSessionError(null);
          return;
        }
        
        // No session established
        console.error('[AUTH][Auth.tsx] Could not establish session for password reset');
        setSessionError('Não foi possível validar o link. Por favor, solicite um novo link de recuperação.');
        
      } catch (err) {
        console.error('[AUTH][Auth.tsx] Error initializing reset session:', err);
        setSessionError('Erro ao validar link de recuperação. Tente novamente.');
      }
    };
    
    if (initialMode === 'reset') {
      initializeResetSession();
    }
  }, [initialMode]);

  // Lock coach/admin login to "login" mode (no signup)
  useEffect(() => {
    if (context !== 'user') {
      setMode('login');
    }
  }, [context]);

  // REDIRECT BASED ON CONTEXT (entry route), NOT role guessing
  // CRITICAL: DO NOT redirect if user is in password reset mode
  useEffect(() => {
    if (!user || authLoading) return;
    
    // BLOCK REDIRECT if in password reset mode - user must complete reset first
    if (isPasswordResetMode || mode === 'reset-password') {
      console.log(`[GATE][Auth] BLOCKING redirect - user is in password reset mode ts=${new Date().toISOString()}`);
      return;
    }

    // Reset access denied state on user change
    setAccessDenied(null);

    // ========== DEBUG LOG ==========
    console.log(`[GATE][Auth] context=${context} isAdmin=${isAdmin} isCoach=${isCoach} userId=${user?.id} ts=${new Date().toISOString()}`);
    // ================================

    // CONTEXT: ADMIN - only allow if user is admin
    if (context === 'admin') {
      if (isAdmin) {
        console.log(`[NAV][Auth] from=/login/admin to=/painel-admin reason=admin_authenticated ts=${new Date().toISOString()}`);
        navigate('/painel-admin');
      } else {
        // Block access - show restricted message, do NOT redirect to user flow
        setAccessDenied('Acesso restrito. Sua conta não possui permissão de administrador.');
      }
      return;
    }

    // CONTEXT: COACH - validate coach role before allowing access
    if (context === 'coach') {
      if (isCoach) {
        console.log(`[NAV][Auth] from=/login/coach to=/coach/dashboard reason=coach_authenticated ts=${new Date().toISOString()}`);
        navigate('/coach/dashboard');
      } else {
        // Block access - user is logged in but NOT a coach
        setAccessDenied('coach_not_approved');
      }
      return;
    }

    // CONTEXT: USER (default) - normal athlete flow
    // Check for redirect param first
    const redirectParam = searchParams.get('redirect');

    // If admin accessing /login, redirect to /painel-admin
    if (isAdmin) {
      console.log(`[NAV][Auth] from=/login to=/painel-admin reason=admin_at_user_login ts=${new Date().toISOString()}`);
      navigate('/painel-admin');
      return;
    }
    
    // If coach accessing /login, redirect to coach portal
    if (isCoach) {
      console.log(`[NAV][Auth] from=/login to=/coach/dashboard reason=coach_at_user_login ts=${new Date().toISOString()}`);
      navigate('/coach/dashboard');
      return;
    }

    // If redirect param exists, go there (used by diagnostic gate flow)
    if (redirectParam && redirectParam.startsWith('/')) {
      console.log(`[NAV][Auth] from=/login to=${redirectParam} reason=redirect_param ts=${new Date().toISOString()}`);
      navigate(redirectParam);
      return;
    }

    // Default: go to main app
    console.log(`[NAV][Auth] from=/login to=/app reason=athlete_authenticated_going_to_app ts=${new Date().toISOString()}`);
    setCurrentView('dashboard');
    navigate('/app');
  }, [user, authLoading, isAdmin, isCoach, context, navigate, setCurrentView, isPasswordResetMode, mode]);

  const validateForm = () => {
    try {
      if (mode === 'login') {
        loginSchema.parse({ email, password });
      } else if (mode === 'signup') {
        signupSchema.parse({ name, email, password, sexo: sexo || undefined, telefone });
      } else if (mode === 'reset-password') {
        resetPasswordSchema.parse({ password, confirmPassword });
      } else {
        forgotSchema.parse({ email });
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: { name?: string; email?: string; password?: string; confirmPassword?: string; sexo?: string; telefone?: string } = {};
        err.errors.forEach((error) => {
          if (error.path[0] === 'name') fieldErrors.name = error.message;
          if (error.path[0] === 'email') fieldErrors.email = error.message;
          if (error.path[0] === 'password') fieldErrors.password = error.message;
          if (error.path[0] === 'confirmPassword') fieldErrors.confirmPassword = error.message;
          if (error.path[0] === 'sexo') fieldErrors.sexo = error.message;
          if (error.path[0] === 'telefone') fieldErrors.telefone = error.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes('rate limit')) {
            toast({
              title: 'Muitas tentativas',
              description: 'Nossos servidores estão processando muitas requisições. Aguarde alguns minutos e tente novamente.',
              variant: 'destructive',
            });
          } else if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Erro no login',
              description: 'Email ou senha incorretos.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Erro no login',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Login realizado!',
            description: 'Bem-vindo de volta.',
          });
        }
      } else if (mode === 'signup') {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              name: name.trim(),
              sexo: sexo,
            },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes('rate limit')) {
            toast({
              title: 'Muitas tentativas',
              description: 'Nossos servidores estão processando muitos cadastros. Aguarde alguns minutos e tente novamente.',
              variant: 'destructive',
            });
          } else if (error.message.includes('already registered')) {
            toast({
              title: 'Email já cadastrado',
              description: 'Este email já está registrado. Tente fazer login.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Erro no cadastro',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          // Auto-confirm ativo: usuário já está logado automaticamente
          // O useEffect de onAuthStateChange cuidará do redirect
          toast({
            title: 'Conta criada!',
            description: 'Entrando no app...',
          });
        }
      } else if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login?mode=reset`,
        });

        if (error) {
          if (error.message.toLowerCase().includes('rate limit')) {
            toast({
              title: 'Muitas tentativas',
              description: 'Nossos servidores estão processando muitas requisições. Aguarde alguns minutos e tente novamente.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Erro',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          setResetSent(true);
          toast({
            title: 'Email enviado!',
            description: 'Verifique sua caixa de entrada para redefinir a senha.',
          });
        }
      } else if (mode === 'reset-password') {
        // Verify session exists before updating password
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast({
            title: 'Sessão expirada',
            description: 'Por favor, solicite um novo link de recuperação de senha.',
            variant: 'destructive',
          });
          setSessionError('Sessão expirada. Solicite um novo link de recuperação.');
          setSessionReady(false);
          return;
        }
        
        // Update password using Supabase Auth
        const { error } = await supabase.auth.updateUser({
          password: password,
        });

        if (error) {
          toast({
            title: 'Erro ao redefinir senha',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          setResetSuccess(true);
          setIsPasswordResetMode(false);
          toast({
            title: 'Senha redefinida!',
            description: 'Sua senha foi alterada com sucesso.',
          });
          
          // Sign out and redirect to login after a short delay
          setTimeout(async () => {
            await supabase.auth.signOut();
            setMode('login');
            setPassword('');
            setConfirmPassword('');
            setResetSuccess(false);
            navigate('/login', { replace: true });
          }, 2000);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
    setResetSent(false);
    setConfirmPassword('');
  };

  // Google OAuth sign-in with context-aware redirect
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      // Build redirect URL based on context
      const redirectPath = context === 'admin' 
        ? '/login/admin' 
        : context === 'coach' 
          ? '/login/coach' 
          : '/login';
      
      const redirectUrl = `${window.location.origin}${redirectPath}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        toast({
          title: 'Erro ao entrar com Google',
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar login com Google.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Apple OAuth sign-in with context-aware redirect
  const handleAppleSignIn = async () => {
    setIsSubmitting(true);
    try {
      const redirectPath = context === 'admin' 
        ? '/login/admin' 
        : context === 'coach' 
          ? '/login/coach' 
          : '/login';
      
      const redirectUrl = `${window.location.origin}${redirectPath}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        toast({
          title: 'Erro ao entrar com Apple',
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Apple sign-in error:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar login com Apple.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get context-specific UI text
  const getContextLabel = () => {
    switch (context) {
      case 'admin': return 'Painel Admin';
      case 'coach': return 'Portal do Coach';
      default: return null;
    }
  };

  // ACCESS DENIED SCREEN - Coach context (user is not coach)
  if (accessDenied === 'coach_not_approved') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: 'var(--gradient-glow)' }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md z-10"
        >
          <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
              <UserCog className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="font-display text-2xl text-foreground mb-4">
              Acesso de Coach não encontrado
            </h1>
            <p className="text-muted-foreground mb-6">
              Sua conta não possui permissão de Coach. Entre como Atleta ou solicite acesso de Coach.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/login"
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
              >
                Entrar como Atleta
              </Link>
              <button
                onClick={() => setShowApplicationModal(true)}
                className="w-full py-3 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Solicitar acesso de Coach
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setAccessDenied(null);
                }}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors mt-2"
              >
                Sair e usar outra conta
              </button>
            </div>
          </div>
        </motion.div>
        
        {/* Coach Application Modal */}
        <CoachApplicationModal 
          isOpen={showApplicationModal} 
          onClose={() => setShowApplicationModal(false)} 
        />
      </div>
    );
  }

  // ACCESS DENIED SCREEN (for admin context when user is not admin)
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: 'var(--gradient-glow)' }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md z-10"
        >
          <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="font-display text-2xl text-foreground mb-4">
              Acesso Restrito
            </h1>
            <p className="text-muted-foreground mb-6">
              {accessDenied}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setAccessDenied(null);
                }}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Sair e usar outra conta
              </button>
              <Link
                to="/login"
                className="text-muted-foreground hover:text-primary text-sm transition-colors"
              >
                Voltar para login de usuário
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Back to landing */}
      <Link
        to="/"
        className="absolute top-5 left-5 z-20 flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar
      </Link>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md md:max-w-xl z-10 flex flex-col items-center"
      >
        {/* HERO BRANDING - Maximum emphasis */}
        <div className="text-center mb-8 sm:mb-12">
          {/* Logo - Conditional: OUTLIER for user, text for coach/admin */}
          <motion.div 
            className="mb-3"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {context === 'user' ? (
              <OutlierWordmark size="hero" onClick={handleLogoClick} />
            ) : (
              <h1 
                className="font-display text-6xl sm:text-7xl md:text-9xl tracking-widest font-bold text-gradient-logo cursor-default select-none"
                onClick={handleLogoClick}
              >
                {context === 'coach' ? 'COACH' : 'ADMIN'}
              </h1>
            )}
          </motion.div>
          
          {/* Tagline - White, clear typography */}
          <motion.p 
            className="text-sm md:text-base font-medium text-white tracking-[0.25em] uppercase mt-6"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {context === 'user'
              ? 'CONSISTÊNCIA GERA RESULTADO.'
              : context === 'coach'
                ? 'PORTAL DO COACH'
                : 'PAINEL ADMINISTRATIVO'
            }
          </motion.p>
        </div>

        {/* LOGIN CARD - Minimal, translucent */}
        <motion.div 
          className="w-full bg-card/40 backdrop-blur-sm border border-border/20 px-4 py-4 rounded-lg"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {/* Context Badge - Only for non-user */}
          {context !== 'user' && (
            <div className="flex justify-center mb-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                {context === 'admin' && <Shield className="w-2.5 h-2.5" />}
                {context === 'coach' && <UserCog className="w-2.5 h-2.5" />}
                {context === 'admin' ? 'Admin' : 'Coach'}
              </div>
            </div>
          )}

          {/* Password Reset Success */}
          {mode === 'reset-password' && resetSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-foreground font-medium">Senha redefinida com sucesso!</p>
              <p className="text-muted-foreground text-sm">
                Redirecionando para o login...
              </p>
            </div>
          ) : mode === 'reset-password' ? (
            /* Password Reset Form */
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-foreground font-medium">Redefinir Senha</h2>
                <p className="text-muted-foreground text-xs mt-1">Digite sua nova senha abaixo</p>
              </div>
              
              {/* Session Error State */}
              {sessionError ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-destructive text-sm font-medium">Link inválido ou expirado</p>
                      <p className="text-muted-foreground text-xs mt-1">{sessionError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot-password');
                      setIsPasswordResetMode(false);
                      setSessionError(null);
                      navigate('/login', { replace: true });
                    }}
                    className="w-full py-2.5 bg-primary text-primary-foreground rounded font-display text-sm font-semibold tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    SOLICITAR NOVO LINK
                  </button>
                </div>
              ) : !sessionReady ? (
                /* Loading State - Establishing session */
                <div className="text-center space-y-4 py-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground text-sm">Validando link de recuperação...</p>
                </div>
              ) : (
                /* Password Reset Form - Session Ready */
                <form onSubmit={handleSubmit} className="space-y-2.5">
                  {/* New Password */}
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-8 pr-10 py-2 bg-background/50 border rounded text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 ${
                          errors.password ? 'border-destructive/50' : 'border-border/30'
                        }`}
                        placeholder="Nova senha"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-destructive text-xs mt-1">{errors.password}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full pl-8 pr-3 py-2 bg-background/50 border rounded text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 ${
                          errors.confirmPassword ? 'border-destructive/50' : 'border-border/30'
                        }`}
                        placeholder="Confirmar senha"
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-destructive text-xs mt-1">{errors.confirmPassword}</p>
                    )}
                  </div>

                  <p className="text-muted-foreground/60 text-xs">
                    Mínimo de 6 caracteres
                  </p>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !sessionReady}
                    className="w-full mt-1 py-2.5 bg-primary text-primary-foreground rounded font-display text-sm font-semibold tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    SALVAR NOVA SENHA
                  </button>
                </form>
              )}
            </div>
          ) : mode === 'forgot-password' && resetSent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground">
                Enviamos um email para <strong>{email}</strong> com instruções para redefinir sua senha.
              </p>
              <button
                onClick={() => switchMode('login')}
                className="text-primary hover:underline text-sm"
              >
                Voltar ao login
              </button>
            </div>
          ) : (
            <>
              {/* Form - Compact */}
              <form onSubmit={handleSubmit} className="space-y-2.5">
                {/* Name field (signup only) */}
                {mode === 'signup' && (
                  <div>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full pl-8 pr-3 py-2 bg-background/50 border rounded text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 ${
                          errors.name ? 'border-destructive/50' : 'border-border/30'
                        }`}
                        placeholder="Nome"
                      />
                    </div>
                    {errors.name && (
                      <p className="text-destructive text-xs mt-1">{errors.name}</p>
                    )}
                  </div>
                )}

                {/* Sex selection (signup only) */}
                {mode === 'signup' && (
                  <div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSexo('masculino')}
                        className={`flex-1 py-2 rounded text-sm font-medium transition-colors border ${
                          sexo === 'masculino'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background/50 text-muted-foreground border-border/30 hover:border-primary/50'
                        }`}
                      >
                        Masculino
                      </button>
                      <button
                        type="button"
                        onClick={() => setSexo('feminino')}
                        className={`flex-1 py-2 rounded text-sm font-medium transition-colors border ${
                          sexo === 'feminino'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background/50 text-muted-foreground border-border/30 hover:border-primary/50'
                        }`}
                      >
                        Feminino
                      </button>
                    </div>
                    {errors.sexo && (
                      <p className="text-destructive text-xs mt-1">{errors.sexo}</p>
                    )}
                  </div>
                )}
                <div>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-8 pr-3 py-2 bg-background/50 border rounded text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 ${
                        errors.email ? 'border-destructive/50' : 'border-border/30'
                      }`}
                      placeholder="Email"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Password (not for forgot-password) */}
                {mode !== 'forgot-password' && (
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-8 pr-10 py-2 bg-background/50 border rounded text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 ${
                          errors.password ? 'border-destructive/50' : 'border-border/30'
                        }`}
                        placeholder="Senha"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-destructive text-xs mt-1">{errors.password}</p>
                    )}
                  </div>
                )}

                {/* Submit Button - Only element with strong color */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-1 py-2.5 bg-primary text-primary-foreground rounded font-display text-sm font-semibold tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === 'login' && 'ENTRAR'}
                  {mode === 'signup' && 'CRIAR CONTA'}
                  {mode === 'forgot-password' && 'ENVIAR'}
                </button>
              </form>

              {/* Request Coach Access - Only on coach login screen */}
              {context === 'coach' && (
                <div className="mt-4 pt-4 border-t border-border/20">
                  <button
                    type="button"
                    onClick={() => setShowApplicationModal(true)}
                    className="w-full py-2.5 bg-secondary/50 text-foreground rounded font-display text-sm font-medium tracking-wide hover:bg-secondary/70 transition-colors flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Solicitar acesso de Coach
                  </button>
                </div>
              )}

              {/* Secondary actions - Low hierarchy */}
              {mode === 'login' && (
                <div className="mt-3 pt-3 border-t border-border/10 space-y-2.5">
                  {/* Social login - Compact with official icons, above forgot password */}
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isSubmitting}
                      className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-white/90 transition-all disabled:opacity-50 shadow-sm"
                      aria-label="Entrar com Google"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={handleAppleSignIn}
                      disabled={isSubmitting}
                      className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-white/90 transition-all disabled:opacity-50 shadow-sm"
                      aria-label="Entrar com Apple"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#000000">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                    </button>
                  </div>

                  {/* Forgot password - Secondary, below social logins */}
                  <button
                    type="button"
                    onClick={() => switchMode('forgot-password')}
                    className="w-full text-center text-muted-foreground/60 hover:text-muted-foreground text-xs transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Footer links - Very low hierarchy */}
        <motion.div 
          className="mt-6 text-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {mode === 'login' && context === 'user' && (
            <>
              <button
                onClick={() => switchMode('signup')}
                className="text-muted-foreground/70 hover:text-foreground text-sm transition-colors"
              >
                Criar conta
              </button>
              <div className="flex items-center justify-center gap-4">
                <Link to="/login/admin" className="text-sm text-primary hover:text-primary/80 transition-colors">
                  Admin
                </Link>
                <span className="text-muted-foreground/30">·</span>
                <Link to="/login/coach" className="text-sm text-primary hover:text-primary/80 transition-colors">
                  Coach
                </Link>
              </div>
            </>
          )}
          {mode === 'login' && context !== 'user' && (
            <Link
              to="/login"
              className="text-muted-foreground/30 hover:text-muted-foreground/50 text-xs transition-colors flex items-center gap-1 justify-center"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar
            </Link>
          )}
          {mode === 'signup' && (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => switchMode('login')}
                className="text-muted-foreground/30 hover:text-muted-foreground/50 text-xs transition-colors"
              >
                Já tem conta? Entrar
              </button>
              {context === 'user' && (
                <Link
                  to="/"
                  className="text-muted-foreground/30 hover:text-muted-foreground/50 text-xs flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Voltar ao início
                </Link>
              )}
            </div>
          )}
          {mode === 'forgot-password' && !resetSent && (
            <button
              onClick={() => switchMode('login')}
              className="text-muted-foreground/30 hover:text-muted-foreground/50 text-xs flex items-center gap-1 mx-auto transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar
            </button>
          )}
        </motion.div>
      </motion.div>
      
      {/* Coach Application Modal */}
      {context === 'coach' && (
        <CoachApplicationModal 
          isOpen={showApplicationModal} 
          onClose={() => setShowApplicationModal(false)} 
        />
      )}
      
      {/* QA Debug Activation Modal - dev/preview only */}
      <QAActivationModal 
        isOpen={showQAModal} 
        onClose={() => setShowQAModal(false)} 
      />
    </div>
  );
}
