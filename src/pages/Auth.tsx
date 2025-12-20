import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, Loader2, User, ArrowLeft, Shield, UserCog } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot-password';
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
});

const forgotSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
});

export default function Auth({ context = 'user' }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [resetSent, setResetSent] = useState(false);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);

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
  }, [initialMode, context]);

  // Lock coach/admin login to "login" mode (no signup)
  useEffect(() => {
    if (context !== 'user') {
      setMode('login');
    }
  }, [context]);

  // REDIRECT BASED ON CONTEXT (entry route), NOT role guessing
  useEffect(() => {
    if (!user || authLoading) return;

    // Reset access denied state on user change
    setAccessDenied(null);

    // CONTEXT: ADMIN - only allow if user is admin
    if (context === 'admin') {
      if (isAdmin) {
        navigate('/painel-admin');
      } else {
        // Block access - show restricted message, do NOT redirect to user flow
        setAccessDenied('Acesso restrito. Sua conta não possui permissão de administrador.');
      }
      return;
    }

    // CONTEXT: COACH - redirect to coach portal, let it handle states
    if (context === 'coach') {
      navigate('/coach');
      return;
    }

    // CONTEXT: USER (default) - normal athlete flow
    // If admin accessing /login, redirect to /painel-admin
    if (isAdmin) {
      navigate('/painel-admin');
      return;
    }
    
    // If coach accessing /login, redirect to coach portal
    if (isCoach) {
      navigate('/coach');
      return;
    }

    // Default: go to main app
    setCurrentView('dashboard');
    navigate('/app');
  }, [user, authLoading, isAdmin, isCoach, context, navigate, setCurrentView]);

  const validateForm = () => {
    try {
      if (mode === 'login') {
        loginSchema.parse({ email, password });
      } else if (mode === 'signup') {
        signupSchema.parse({ name, email, password });
      } else {
        forgotSchema.parse({ email });
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: { name?: string; email?: string; password?: string } = {};
        err.errors.forEach((error) => {
          if (error.path[0] === 'name') fieldErrors.name = error.message;
          if (error.path[0] === 'email') fieldErrors.email = error.message;
          if (error.path[0] === 'password') fieldErrors.password = error.message;
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
          if (error.message.includes('Invalid login credentials')) {
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
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
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
          toast({
            title: 'Conta criada!',
            description: 'Você já pode fazer login.',
          });
          setMode('login');
          setName('');
          setPassword('');
        }
      } else if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login?mode=reset`,
        });

        if (error) {
          toast({
            title: 'Erro',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          setResetSent(true);
          toast({
            title: 'Email enviado!',
            description: 'Verifique sua caixa de entrada para redefinir a senha.',
          });
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
    <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ background: 'var(--gradient-glow)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm z-10"
      >
          {/* Branding Section - Above the card - MORE PROMINENT */}
          <div className="text-center mb-12">
            {/* Logo */}
            <motion.div
              className="mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight text-foreground">
                {context === 'user' ? 'OUTLIER' : context === 'coach' ? 'COACH' : 'ADMIN'}
              </h1>
              {context !== 'user' && (
                <span className="text-xs uppercase tracking-[0.3em] text-primary mt-1 block">
                  {context === 'coach' ? 'Portal' : 'Painel'}
                </span>
              )}
            </motion.div>
            
            {/* Tagline - More prominent */}
            <motion.p 
              className="text-xl md:text-2xl font-display text-foreground tracking-wide mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {context === 'user'
                ? 'Consistência vira resultado.'
                : context === 'coach'
                  ? 'Gerencie seus atletas.'
                  : 'Performance escalada.'
              }
            </motion.p>
            
            {/* Support line */}
            <motion.p 
              className="text-sm text-muted-foreground max-w-xs mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {context === 'user'
                ? 'Entre para treinar com direção e acompanhar sua evolução.'
                : context === 'coach'
                  ? 'Faça login para acessar o portal.'
                  : 'Acesso restrito para administradores.'
              }
            </motion.p>
          </div>

        {/* Login Card - Smaller and more compact */}
        <motion.div 
          className="bg-card border border-border/50 px-5 py-5 rounded-xl shadow-2xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Card Header - Mode indicator (minimal for user context) */}
          <div className="text-center mb-4">
            {/* Context Badge - only for non-user */}
            {context !== 'user' && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
                {context === 'admin' && <Shield className="w-3 h-3" />}
                {context === 'coach' && <UserCog className="w-3 h-3" />}
                {context === 'admin' ? 'Painel Admin' : 'Portal do Coach'}
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              {mode === 'login' && 'Acesse sua conta'}
              {mode === 'signup' && 'Crie sua conta'}
              {mode === 'forgot-password' && 'Recuperar senha'}
            </p>
          </div>

          {/* Forgot Password Success */}
          {mode === 'forgot-password' && resetSent ? (
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
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Name field (signup only) */}
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Nome
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 bg-secondary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${
                          errors.name ? 'border-destructive' : 'border-border'
                        }`}
                        placeholder="Seu nome"
                      />
                    </div>
                    {errors.name && (
                      <p className="text-destructive text-sm mt-1">{errors.name}</p>
                    )}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 bg-secondary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${
                        errors.email ? 'border-destructive' : 'border-border'
                      }`}
                      placeholder="seu@email.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Password (not for forgot-password) */}
                {mode !== 'forgot-password' && (
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-10 pr-12 py-2.5 bg-secondary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${
                          errors.password ? 'border-destructive' : 'border-border'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-destructive text-sm mt-1">{errors.password}</p>
                    )}
                  </div>
                )}

                {/* Forgot password link (login only) */}
                {mode === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => switchMode('forgot-password')}
                      className="text-muted-foreground hover:text-primary text-sm transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-display text-base tracking-wider hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
                >
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {mode === 'login' && (
                    context === 'user'
                      ? 'ENTRAR'
                      : context === 'coach'
                        ? 'ENTRAR COMO COACH'
                        : 'ENTRAR COMO ADMIN'
                  )}
                  {mode === 'signup' && 'CRIAR CONTA'}
                  {mode === 'forgot-password' && 'ENVIAR EMAIL'}
                </button>

                {/* Coach note */}
                {mode === 'login' && context === 'coach' && (
                  <p className="text-xs text-muted-foreground/70 text-center">
                    Se você ainda não foi aprovado, você verá o status após entrar.
                  </p>
                )}

                {/* Admin note */}
                {mode === 'login' && context === 'admin' && (
                  <p className="text-xs text-muted-foreground/50 text-center italic">
                    Área restrita. Tentativas de acesso são monitoradas.
                  </p>
                )}

                {/* Divider */}
                {mode === 'login' && (
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-3 text-muted-foreground/60">ou</span>
                    </div>
                  </div>
                )}

                {/* Social Sign-in Buttons */}
                {mode === 'login' && (
                  <div className="space-y-3">
                    {/* Google */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isSubmitting}
                      className="w-full py-3 bg-white text-gray-800 rounded-lg font-medium hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center justify-center gap-3 border border-gray-200"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Entrar com Google
                    </button>

                    {/* Apple */}
                    <button
                      type="button"
                      onClick={handleAppleSignIn}
                      disabled={isSubmitting}
                      className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-900 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      Entrar com Apple
                    </button>
                  </div>
                )}
              </form>

              {/* Toggle between modes */}
              <div className="mt-5 text-center space-y-3">
                {mode === 'login' && (
                  <>
                    {context === 'user' && (
                      <button
                        onClick={() => switchMode('signup')}
                        className="text-muted-foreground hover:text-primary text-sm transition-colors"
                      >
                        Não tem conta? <span className="text-primary font-medium">Criar conta</span>
                      </button>
                    )}
                    
                    {/* Admin/Coach access links - only show on user context */}
                    {context === 'user' && (
                      <div className="pt-3 border-t border-border/30">
                        <p className="text-xs text-muted-foreground/60 mb-2">Entrar como:</p>
                        <div className="flex items-center justify-center gap-3">
                          <Link
                            to="/login/admin"
                            className="text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            Admin
                          </Link>
                          <span className="text-muted-foreground/40">·</span>
                          <Link
                            to="/coach"
                            className="text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            Coach
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Back to user login - show on admin/coach context */}
                    {context !== 'user' && (
                      <div className="pt-3 border-t border-border/30">
                        <Link
                          to="/login"
                          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 justify-center"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          Voltar para login de usuário
                        </Link>
                      </div>
                    )}
                  </>
                )}
                {mode === 'signup' && (
                  <button
                    onClick={() => switchMode('login')}
                    className="text-muted-foreground hover:text-primary text-sm transition-colors"
                  >
                    Já tem conta? <span className="text-primary font-medium">Fazer login</span>
                  </button>
                )}
                {mode === 'forgot-password' && (
                  <button
                    onClick={() => switchMode('login')}
                    className="text-muted-foreground hover:text-primary text-sm flex items-center gap-1 mx-auto transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao login
                  </button>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
