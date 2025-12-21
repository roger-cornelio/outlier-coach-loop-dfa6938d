/**
 * CoachAuth - Fluxo ÚNICO e LINEAR para coaches
 * 
 * FLUXO:
 * 1. Tela de login (email + senha) + link discreto "Solicitar acesso"
 * 2. Ao tentar login:
 *    a) Email NÃO aprovado → abre modal "Deixe seu contato" → salva como pendente
 *    b) Email APROVADO mas sem conta → abre tela "Defina sua senha"
 *    c) Email APROVADO com conta → login normal → redireciona para /coach/dashboard
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

// Removed setPasswordSchema - now handled by /coach/definir-senha

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  // ===== REDIRECT IF ALREADY COACH (user_roles is source of truth) =====
  useEffect(() => {
    if (!authLoading && user && isCoach) {
      console.log('[CoachAuth] REDIRECT → /coach/dashboard | Reason: isCoach=true (user_roles)');
      navigate('/coach/dashboard', { replace: true });
    }
  }, [user, isCoach, authLoading, navigate]);

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

  const runPostAuthDecision = useCallback(
    async (emailForUi: string) => {
      console.log('[CoachAuth] post-auth decision START');

      // (a) getSession
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[CoachAuth] getSession error:', sessionError);
      }

      const authedUserId = sessionData.session?.user?.id;
      console.log('[CoachAuth] post-auth session:', {
        hasSession: !!sessionData.session,
        userId: authedUserId || 'null',
      });

      if (!authedUserId) {
        return;
      }

      // (b) refresh + refetch roles/profile (ensures role sync runs)
      await refreshSession();

      const roleNames = await fetchUserRoles(authedUserId);
      console.log('[CoachAuth] post-auth roles loaded:', roleNames);

      // (c) decide route ONLY by user_roles
      if (roleNames.includes('coach')) {
        console.log('[CoachAuth] DECISION: allow → /coach/dashboard');
        navigate('/coach/dashboard', { replace: true });
        return;
      }

      console.log('[CoachAuth] DECISION: deny (no coach role) → signOut + open contact modal');
      await supabase.auth.signOut();
      setContactEmail(emailForUi);
      setFlowState('contact_modal');
    },
    [fetchUserRoles, navigate, refreshSession]
  );

  // ===== CHECK IF EMAIL HAS COACH ROLE (source of truth: user_roles via profile email) =====
  const checkCoachRoleByEmail = async (emailToCheck: string): Promise<boolean> => {
    const normalizedEmail = emailToCheck.toLowerCase().trim();

    // Find profile with this email, then check user_roles
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!profile?.user_id) {
      return false;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.user_id);

    return (roles || []).some((r) => String(r.role) === 'coach');
  };

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
      // STEP 1: Check if email has coach role (source of truth)
      const hasCoachRole = await checkCoachRoleByEmail(normalizedEmail);
      console.log('[CoachAuth] hasCoachRole for', normalizedEmail, ':', hasCoachRole);

      if (!hasCoachRole) {
        // No coach role → show contact modal
        console.log('[CoachAuth] No coach role → contact modal');
        setContactEmail(normalizedEmail);
        setFlowState('contact_modal');
        setIsSubmitting(false);
        return;
      }

      // STEP 2: Coach role exists → try login
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (loginError) {
        console.log('[CoachAuth] Login error:', loginError.message);

        // If credentials invalid but role exists → needs to set password
        if (loginError.message.includes('Invalid login credentials')) {
          console.log('[CoachAuth] Coach role exists but login failed → redirect to set password');
          navigate(`/coach/definir-senha?email=${encodeURIComponent(normalizedEmail)}`, { replace: true });
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

      // STEP 3: Login successful → verify roles and redirect
      await runPostAuthDecision(normalizedEmail);
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

  // handleSetPassword removed - now handled by /coach/definir-senha

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
      // FONTE DA VERDADE: user_roles (não coach_applications)
      const hasCoachRole = await checkCoachRoleByEmail(normalizedEmail);
      
      if (hasCoachRole) {
        // Já é coach aprovado → redirecionar para login/definir senha
        toast({
          title: 'Acesso já aprovado',
          description: 'Seu acesso já foi aprovado. Faça login ou defina sua senha.',
        });
        setFlowState('login');
        setEmail(normalizedEmail);
        setIsSubmitting(false);
        return;
      }

      // (a) Check for existing application for this email (apenas para evitar duplicatas)
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

      // (b) If pending → don't insert, show toast (apenas para evitar duplicatas, não para gate)
      if (existing?.status === 'pending') {
        toast({
          title: 'Solicitação já existe',
          description: 'Sua solicitação já está em análise. Aguarde a aprovação.',
        });
        setIsSubmitting(false);
        return;
      }

      // (c) If rejected → update existing to pending (reopen)
      if (existing?.status === 'rejected') {
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

      // (d) No existing → create new
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
    setConfirmPassword('');
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

  // set_password screen removed - now using /coach/definir-senha route

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
          transition={{ delay: 0.7 }}
        >
          <button
            onClick={() => {
              setContactEmail(email);
              setFlowState('contact_modal');
            }}
            className="text-muted-foreground/50 hover:text-muted-foreground text-xs transition-colors"
          >
            Ainda não tem acesso? Solicitar acesso
          </button>

          <div className="mt-4">
            <Link
              to="/login"
              className="text-muted-foreground/30 hover:text-muted-foreground/50 text-xs transition-colors flex items-center gap-1 justify-center"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* ===== CONTACT MODAL ===== */}
      <AnimatePresence>
        {(flowState === 'contact_modal' || flowState === 'contact_sent') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={resetToLogin}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[400px] bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Deixe seu contato
                </h2>
                <button
                  onClick={resetToLogin}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Success State */}
                {flowState === 'contact_sent' && (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Contato Enviado!
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Aguarde aprovação do admin. Você receberá acesso em breve.
                    </p>
                    <button
                      onClick={resetToLogin}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
                    >
                      Fechar
                    </button>
                  </div>
                )}

                {/* Form State */}
                {flowState === 'contact_modal' && (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <p className="text-muted-foreground text-sm mb-4">
                      Preencha seus dados para solicitar acesso como Coach.
                    </p>

                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Nome Completo *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 bg-secondary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                            errors.full_name ? 'border-destructive' : 'border-border'
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
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Email *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 bg-secondary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                            errors.email ? 'border-destructive' : 'border-border'
                          }`}
                          placeholder="seu@email.com"
                        />
                      </div>
                      {errors.email && (
                        <p className="text-destructive text-xs mt-1">{errors.email}</p>
                      )}
                    </div>

                    {/* Contact */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        WhatsApp ou Instagram *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className={`w-full pl-10 pr-4 py-2.5 bg-secondary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                            errors.contact ? 'border-destructive' : 'border-border'
                          }`}
                          placeholder="(11) 99999-9999 ou @seuinsta"
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
                      className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Enviar contato
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
