import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, Loader2, User, ArrowLeft } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot-password';

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

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [resetSent, setResetSent] = useState(false);

  const { user, canManageWorkouts, isAdmin, isCoach, loading: authLoading } = useAuth();
  const { setCurrentView } = useOutlierStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const next = searchParams.get('next');
  const initialMode = searchParams.get('mode');

  // Set initial mode from query param
  useEffect(() => {
    if (initialMode === 'signup') {
      setMode('signup');
    }
  }, [initialMode]);

  // REDIRECT PRIORITY AFTER LOGIN: ADMIN > COACH > ATHLETE
  useEffect(() => {
    if (!user || authLoading) return;

    // Handle specific next redirects
    if (next === 'userManagement') {
      if (isAdmin) {
        setCurrentView('userManagement');
        navigate('/');
      } else {
        toast({
          title: 'Acesso negado',
          description: 'Sua conta não tem permissão de administrador.',
          variant: 'destructive',
        });
        // Fall through to priority redirect
      }
    }

    // PRIORITY 1: ADMIN - always goes to admin panel
    if (isAdmin) {
      setCurrentView('admin');
      navigate('/');
      return;
    }

    // PRIORITY 2: COACH - goes to coach panel (admin view)
    if (isCoach) {
      setCurrentView('admin');
      navigate('/');
      return;
    }

    // PRIORITY 3: ATHLETE (default) - goes to dashboard
    setCurrentView('dashboard');
    navigate('/');
  }, [user, authLoading, isAdmin, isCoach, next, navigate, setCurrentView, toast]);

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
          redirectTo: `${window.location.origin}/auth?mode=reset`,
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl text-foreground mb-2 tracking-wide">
              OUTLIER
            </h1>
            <p className="text-muted-foreground">
              {mode === 'login' && 'Entre na sua conta'}
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
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name field (signup only) */}
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 bg-secondary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${
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
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 bg-secondary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${
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
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-10 pr-12 py-3 bg-secondary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${
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
                      className="text-primary hover:underline text-sm"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {mode === 'login' && 'Entrar'}
                  {mode === 'signup' && 'Criar conta'}
                  {mode === 'forgot-password' && 'Enviar email'}
                </button>
              </form>

              {/* Toggle */}
              <div className="mt-6 text-center space-y-2">
                {mode === 'login' && (
                  <button
                    onClick={() => switchMode('signup')}
                    className="text-primary hover:underline text-sm"
                  >
                    Não tem conta? Cadastre-se
                  </button>
                )}
                {mode === 'signup' && (
                  <button
                    onClick={() => switchMode('login')}
                    className="text-primary hover:underline text-sm"
                  >
                    Já tem conta? Faça login
                  </button>
                )}
                {mode === 'forgot-password' && (
                  <button
                    onClick={() => switchMode('login')}
                    className="text-primary hover:underline text-sm flex items-center gap-1 mx-auto"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao login
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
