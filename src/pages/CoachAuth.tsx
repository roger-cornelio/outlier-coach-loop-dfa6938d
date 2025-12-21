/**
 * CoachAuth - Fluxo ÚNICO e LINEAR para coaches
 * 
 * FLUXO:
 * 1. Tela de login (email + senha)
 * 2. Ao tentar login:
 *    a) Login OK + user_roles=coach → /coach/dashboard
 *    b) Login FALHOU por credenciais + email aprovado (coach_applications.status='approved') → /coach/definir-senha
 *    c) Login FALHOU + email NÃO aprovado → modal "Deixe seu contato"
 * 
 * FONTE DE VERDADE:
 * - user_roles (quando user_id existe)
 * - coach_applications.status='approved' (quando user_id não existe ainda)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowLeft, UserCog, X, User, Phone, Send, CheckCircle } from 'lucide-react';

// ===== SCHEMAS =====
const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100, 'Senha muito longa'),
});

const contactSchema = z.object({
  full_name: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100, 'Nome muito longo'),
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  contact: z.string().trim().min(3, 'Informe seu WhatsApp ou Instagram').max(100, 'Contato muito longo'),
});

// ===== TYPES =====
type CoachFlowState = 
  | 'login'           // Tela inicial de login
  | 'contact_modal'   // Modal "Deixe seu contato" (email não aprovado)
  | 'contact_sent';   // Confirmação de envio

export default function CoachAuth() {
  // ===== STATE =====
  const [flowState, setFlowState] = useState<CoachFlowState>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Contact form
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const { user, isCoach, role, loading: authLoading, refreshSession } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Debug log for troubleshooting
  console.log('[CoachAuth] DEBUG:', {
    userId: user?.id || 'null',
    email: user?.email || 'null',
    role,
    isCoach,
    authLoading,
    flowState,
  });

  // ===== REDIRECT IF ALREADY COACH (user_roles is source of truth for logged-in users) =====
  useEffect(() => {
    if (!authLoading && user && isCoach) {
      console.log('[CoachAuth] REDIRECT → /coach/dashboard | Reason: isCoach=true (user_roles)');
      navigate('/coach/dashboard', { replace: true });
    }
  }, [user, isCoach, authLoading, navigate]);

  // ===== CHECK IF EMAIL IS APPROVED (coach_applications.status='approved') =====
  // This is used BEFORE account exists - pre-account source of truth
  const checkEmailApproved = async (emailToCheck: string): Promise<boolean> => {
    const normalizedEmail = emailToCheck.toLowerCase().trim();
    
    const { data, error } = await supabase
      .from('coach_applications')
      .select('status')
      .eq('email', normalizedEmail)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[CoachAuth] checkEmailApproved error:', error);
      return false;
    }

    return !!data;
  };

  // ===== CHECK USER ROLES (for logged-in user) =====
  const fetchUserRoles = useCallback(async (userId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('[CoachAuth] fetchUserRoles error:', error);
      return [];
    }

    return (data || []).map((r) => String(r.role));
  }, []);

  // ===== HANDLE LOGIN =====
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // STEP 1: Try to login
      const { data: signInData, error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (loginError) {
        console.log('[CoachAuth] Login error:', loginError.message);

        // Login failed - check if email is approved (pre-account source of truth)
        if (loginError.message.includes('Invalid login credentials')) {
          const isApproved = await checkEmailApproved(normalizedEmail);
          console.log('[CoachAuth] Email approved?', isApproved);

          if (isApproved) {
            // Email is approved but no account or wrong password
            // → redirect to set password page
            console.log('[CoachAuth] Approved email, redirecting to /coach/definir-senha');
            navigate(`/coach/definir-senha?email=${encodeURIComponent(normalizedEmail)}`, { replace: true });
          } else {
            // Not approved → show contact modal
            console.log('[CoachAuth] Not approved, showing contact modal');
            setContactEmail(normalizedEmail);
            setFlowState('contact_modal');
          }
        } else {
          toast({
            title: 'Erro no login',
            description: loginError.message,
            variant: 'destructive',
          });
        }
        setIsSubmitting(false);
        return;
      }

      // STEP 2: Login successful → verify user_roles
      const userId = signInData.user?.id;
      if (!userId) {
        console.error('[CoachAuth] No user ID after login');
        setIsSubmitting(false);
        return;
      }

      await refreshSession();
      const roles = await fetchUserRoles(userId);
      console.log('[CoachAuth] User roles:', roles);

      if (roles.includes('coach')) {
        console.log('[CoachAuth] User has coach role, redirecting to dashboard');
        navigate('/coach/dashboard', { replace: true });
      } else {
        // Logged in but no coach role → deny access
        console.log('[CoachAuth] No coach role, signing out');
        await supabase.auth.signOut();
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão de coach.',
          variant: 'destructive',
        });
        setContactEmail(normalizedEmail);
        setFlowState('contact_modal');
      }
    } catch (err) {
      console.error('[CoachAuth] Login error:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer login. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== HANDLE CONTACT SUBMIT (smart upsert - no duplicates) =====
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const result = contactSchema.safeParse({
      full_name: contactName,
      email: contactEmail,
      contact: contactPhone,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const normalizedEmail = contactEmail.toLowerCase().trim();

    try {
      // Check if email is already approved
      const isApproved = await checkEmailApproved(normalizedEmail);
      
      if (isApproved) {
        // Already approved → redirect to set password
        toast({
          title: 'Acesso já aprovado!',
          description: 'Defina sua senha para entrar.',
        });
        navigate(`/coach/definir-senha?email=${encodeURIComponent(normalizedEmail)}`, { replace: true });
        setIsSubmitting(false);
        return;
      }

      // Check for existing application
      const { data: existing, error: fetchErr } = await supabase
        .from('coach_applications')
        .select('id, status')
        .eq('email', normalizedEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchErr) {
        console.error('[CoachAuth] fetch existing error:', fetchErr);
      }

      // Handle existing applications
      if (existing) {
        if (existing.status === 'pending') {
          toast({
            title: 'Solicitação já existe',
            description: 'Sua solicitação já está em análise. Aguarde a aprovação.',
          });
          setIsSubmitting(false);
          return;
        }

        if (existing.status === 'rejected') {
          // Reopen rejected application
          const { error: updateErr } = await supabase
            .from('coach_applications')
            .update({
              full_name: contactName.trim(),
              instagram: contactPhone.trim(),
              status: 'pending',
              rejection_reason: null,
              reviewed_at: null,
              reviewed_by: null,
            })
            .eq('id', existing.id);

          if (updateErr) {
            console.error('[CoachAuth] update rejected error:', updateErr);
            toast({
              title: 'Erro ao reenviar',
              description: 'Tente novamente.',
              variant: 'destructive',
            });
          } else {
            setFlowState('contact_sent');
          }
          setIsSubmitting(false);
          return;
        }
      }

      // No existing → create new application
      const { error: insertErr } = await supabase
        .from('coach_applications')
        .insert({
          full_name: contactName.trim(),
          email: normalizedEmail,
          instagram: contactPhone.trim(),
          status: 'pending',
        });

      if (insertErr) {
        // Handle race condition: unique constraint violation
        if (insertErr.code === '23505') {
          toast({
            title: 'Solicitação já existe',
            description: 'Sua solicitação já está em análise. Aguarde a aprovação.',
          });
        } else {
          console.error('[CoachAuth] Contact submit error:', insertErr);
          toast({
            title: 'Erro ao enviar',
            description: 'Tente novamente.',
            variant: 'destructive',
          });
        }
      } else {
        setFlowState('contact_sent');
      }
    } catch (err) {
      console.error('[CoachAuth] Contact submit error:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== RESET TO LOGIN =====
  const resetToLogin = () => {
    setFlowState('login');
    setPassword('');
    setContactName('');
    setContactPhone('');
    setErrors({});
  };

  // ===== LOADING STATE =====
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ===== RENDER: LOGIN SCREEN =====
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,4%)] to-[hsl(0,0%,2%)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, hsl(var(--primary) / 0.15), transparent 60%)' }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-xs z-10 flex flex-col items-center"
      >
        {/* HERO BRANDING */}
        <div className="text-center mb-12">
          <motion.h1 
            className="font-display text-7xl md:text-9xl tracking-widest font-bold text-gradient-logo mb-3"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            COACH
          </motion.h1>
          
          <motion.p 
            className="text-sm md:text-base font-medium text-white tracking-[0.25em] uppercase mt-6"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            PORTAL DO COACH
          </motion.p>
        </div>

        {/* LOGIN CARD */}
        <motion.div 
          className="w-full bg-card/40 backdrop-blur-sm border border-border/20 px-4 py-4 rounded-lg"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {/* Context Badge */}
          <div className="flex justify-center mb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
              <UserCog className="w-2.5 h-2.5" />
              Coach
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-2.5">
            {/* Email */}
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

            {/* Password */}
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-1 py-2.5 bg-primary text-primary-foreground rounded font-display text-sm font-semibold tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              ENTRAR
            </button>
          </form>
        </motion.div>

        {/* Footer - Discrete link */}
        <motion.div 
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <button
            onClick={() => {
              setContactEmail(email);
              setFlowState('contact_modal');
            }}
            className="text-muted-foreground/50 hover:text-muted-foreground text-xs transition-colors"
          >
            Solicitar acesso de Coach
          </button>
        </motion.div>

        {/* Back to user login */}
        <motion.div 
          className="mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <Link
            to="/login"
            className="text-muted-foreground/40 hover:text-muted-foreground text-xs flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Voltar
          </Link>
        </motion.div>
      </motion.div>

      {/* ===== CONTACT MODAL ===== */}
      <AnimatePresence>
        {flowState === 'contact_modal' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && resetToLogin()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-card border border-border/30 rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
                <h3 className="font-display font-semibold text-foreground">
                  Solicitar Acesso
                </h3>
                <button
                  onClick={resetToLogin}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleContactSubmit} className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Deixe seu contato para solicitar acesso ao painel de coach.
                </p>

                {/* Name */}
                <div>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className={`w-full pl-8 pr-3 py-2 bg-background/50 border rounded text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 ${
                        errors.full_name ? 'border-destructive/50' : 'border-border/30'
                      }`}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  {errors.full_name && (
                    <p className="text-destructive text-xs mt-1">{errors.full_name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className={`w-full pl-8 pr-3 py-2 bg-background/50 border rounded text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 ${
                        errors.email ? 'border-destructive/50' : 'border-border/30'
                      }`}
                      placeholder="Seu email"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Contact (WhatsApp/Instagram) */}
                <div>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className={`w-full pl-8 pr-3 py-2 bg-background/50 border rounded text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 ${
                        errors.contact ? 'border-destructive/50' : 'border-border/30'
                      }`}
                      placeholder="WhatsApp ou Instagram"
                    />
                  </div>
                  {errors.contact && (
                    <p className="text-destructive text-xs mt-1">{errors.contact}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded font-display text-sm font-semibold tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  ENVIAR
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== CONTACT SENT CONFIRMATION ===== */}
      <AnimatePresence>
        {flowState === 'contact_sent' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-card border border-border/30 rounded-lg p-6 text-center"
            >
              <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                Solicitação Enviada!
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sua solicitação foi recebida. Entraremos em contato em breve.
              </p>
              <button
                onClick={resetToLogin}
                className="px-6 py-2 bg-primary text-primary-foreground rounded font-display text-sm font-semibold tracking-widest hover:brightness-110 transition-all"
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
