/**
 * CoachAuth - Fluxo ÚNICO e LINEAR para coaches
 * 
 * FONTE DA VERDADE: RPC get_coach_approval_by_email
 * Retorna: app_exists, approved, has_password, status
 * 
 * LÓGICA DE ROTEAMENTO (após submit):
 * 1. Se !app_exists → /coach-request
 * 2. Se app_exists && status === 'pending' → /coach-pending
 * 3. Se app_exists && status === 'rejected' → modal de rejeição
 * 4. Se app_exists && approved && !has_password → /coach/definir-senha
 * 5. Se app_exists && approved && has_password → tentar login → /coach/dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, Loader2, UserCog } from 'lucide-react';

// ===== SCHEMAS =====
const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100, 'Senha muito longa'),
});

// ===== TYPES =====
type ApprovalResult = {
  app_exists: boolean;
  approved: boolean;
  has_password: boolean;
  status: string;
  application_id: string | null;
};

export default function CoachAuth() {
  // ===== STATE =====
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  const { user, isCoach, loading: authLoading, refreshSession } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // ===== REDIRECT IF ALREADY COACH =====
  useEffect(() => {
    if (!authLoading && user && isCoach) {
      navigate('/coach/dashboard', { replace: true });
    }
  }, [user, isCoach, authLoading, navigate]);

  // ===== RPC: FONTE DA VERDADE =====
  const getCoachApprovalByEmail = async (emailToCheck: string): Promise<ApprovalResult> => {
    const normalizedEmail = emailToCheck.toLowerCase().trim();
    
    const { data, error } = await supabase
      .rpc('get_coach_approval_by_email', { _email: normalizedEmail });

    if (error) {
      console.error('[CoachAuth] RPC error:', error);
      return { app_exists: false, approved: false, has_password: false, status: 'none', application_id: null };
    }

    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    
    if (!row) {
      return { app_exists: false, approved: false, has_password: false, status: 'none', application_id: null };
    }
    
    return {
      app_exists: !!row.app_exists,
      approved: !!row.approved,
      has_password: !!row.has_password,
      status: row.status || 'none',
      application_id: row.application_id,
    };
  };

  // ===== CHECK USER ROLES =====
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
    setRejectionMessage(null);

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
      // STEP 1: Try login first (superadmin/coach bypass)
      const { data: signInData, error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInData?.user) {
        // Login succeeded → check roles
        await refreshSession();
        const roles = await fetchUserRoles(signInData.user.id);
        console.log('[CoachAuth] Login OK, roles:', roles);

        if (roles.includes('coach') || roles.includes('admin') || roles.includes('superadmin')) {
          console.log('[CoachAuth] → /coach/dashboard (has role)');
          navigate('/coach/dashboard', { replace: true });
          return;
        }

        // Logged in but no coach role → deny
        console.log('[CoachAuth] No coach role, signing out');
        await supabase.auth.signOut();
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão de coach.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // STEP 2: Login failed → check approval status via RPC
      const isInvalidCredentials = loginError?.message?.includes('Invalid login credentials');
      
      if (!isInvalidCredentials && loginError) {
        // Non-credential error (network, etc.)
        toast({
          title: 'Erro no login',
          description: loginError.message,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Invalid credentials or no account → check RPC for routing
      const approval = await getCoachApprovalByEmail(normalizedEmail);
      console.log('[CoachAuth] Approval check:', approval);

      if (!approval.app_exists) {
        console.log('[CoachAuth] → /coach-request (no application)');
        navigate(`/coach-request?email=${encodeURIComponent(normalizedEmail)}`, { replace: true });
        setIsSubmitting(false);
        return;
      }

      if (approval.status === 'pending') {
        console.log('[CoachAuth] → /coach-pending');
        navigate('/coach-pending', { replace: true });
        setIsSubmitting(false);
        return;
      }

      if (approval.status === 'rejected') {
        console.log('[CoachAuth] → rejected modal');
        setRejectionMessage('Sua solicitação foi recusada. Entre em contato com o suporte para mais informações.');
        setIsSubmitting(false);
        return;
      }

      if (approval.approved && !approval.has_password) {
        console.log('[CoachAuth] → /coach/definir-senha (approved, no password)');
        navigate(`/coach/definir-senha?email=${encodeURIComponent(normalizedEmail)}`, { replace: true });
        setIsSubmitting(false);
        return;
      }

      // Has account + wrong password
      toast({
        title: 'Senha incorreta',
        description: 'Verifique sua senha e tente novamente.',
        variant: 'destructive',
      });
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

  // ===== LOADING STATE =====
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">

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

        {/* REJECTION MESSAGE */}
        {rejectionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg"
          >
            <p className="text-destructive text-sm text-center">{rejectionMessage}</p>
            <button
              onClick={() => setRejectionMessage(null)}
              className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Tentar outro email
            </button>
          </motion.div>
        )}

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

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                onClick={async () => {
                  const trimmed = email.trim().toLowerCase();
                  if (!trimmed || !trimmed.includes('@')) {
                    toast({ title: 'Digite seu email acima primeiro', variant: 'destructive' });
                    return;
                  }
                  try {
                     const resetOrigin = window.location.origin.includes('lovable.app') || window.location.origin.includes('outlier.run')
                       ? window.location.origin
                       : 'https://app.outlier.run';
                    await supabase.auth.resetPasswordForEmail(trimmed, {
                      redirectTo: `${resetOrigin}/coach/redefinir-senha`,
                    });
                    toast({ title: 'Link de recuperação enviado para seu email' });
                  } catch {
                    toast({ title: 'Erro ao enviar link', variant: 'destructive' });
                  }
                }}
                className="text-muted-foreground/50 hover:text-muted-foreground text-[11px] transition-colors"
              >
                Esqueci minha senha
              </button>
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

        {/* Footer */}
        <motion.div 
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Link
            to="/coach-request"
            className="text-muted-foreground/50 hover:text-muted-foreground text-xs transition-colors"
          >
            Solicitar acesso de Coach
          </Link>
        </motion.div>

        {/* Athlete link */}
        <motion.div 
          className="mt-3 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <Link
            to="/login"
            className="text-muted-foreground/30 hover:text-muted-foreground/50 text-xs transition-colors"
          >
            Sou atleta
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
