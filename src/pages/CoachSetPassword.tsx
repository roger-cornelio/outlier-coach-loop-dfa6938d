/**
 * CoachSetPassword - Tela para coach aprovado definir senha
 * 
 * Regras:
 * - Só chega aqui se o email tem role=coach mas ainda não tem senha definida
 * - Ao definir senha, loga automaticamente e vai para /coach/dashboard
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

const passwordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100, 'Senha muito longa'),
  confirmPassword: z.string().min(6, 'Confirme sua senha').max(100, 'Senha muito longa'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export default function CoachSetPassword() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  
  const [email] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user, isCoach, loading: authLoading, refreshSession } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // If already logged in as coach, redirect
  useEffect(() => {
    if (!authLoading && user && isCoach) {
      navigate('/coach/dashboard', { replace: true });
    }
  }, [user, isCoach, authLoading, navigate]);

  // If no email param, redirect back
  useEffect(() => {
    if (!emailParam) {
      navigate('/login/coach', { replace: true });
    }
  }, [emailParam, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Try to login with the new password (user was created with temp password)
      // First, update the password via admin API through edge function
      const { data: updateData, error: updateError } = await supabase.functions.invoke(
        'update-coach-password',
        {
          body: { email: email.toLowerCase().trim(), password },
        }
      );

      if (updateError || !updateData?.success) {
        console.error('[CoachSetPassword] Update password error:', updateError || updateData?.error);
        toast({
          title: 'Erro ao definir senha',
          description: updateData?.error || 'Tente novamente.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Now login with the new password
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (loginError) {
        console.error('[CoachSetPassword] Login error:', loginError);
        toast({
          title: 'Erro ao entrar',
          description: 'Senha definida, mas falha no login. Tente novamente.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Success - refresh and redirect
      await refreshSession();
      toast({
        title: 'Conta ativada!',
        description: 'Bem-vindo ao painel de Coach.',
      });
      navigate('/coach/dashboard', { replace: true });
    } catch (err) {
      console.error('[CoachSetPassword] Error:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a conta. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,4%)] to-[hsl(0,0%,2%)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, hsl(var(--primary) / 0.15), transparent 60%)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xs z-10"
      >
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="font-display text-2xl text-foreground mb-2">
            Acesso Aprovado!
          </h1>
          <p className="text-muted-foreground text-sm">
            Seu acesso como coach foi aprovado. Defina sua senha para entrar.
          </p>
          <p className="text-primary text-sm mt-2 font-medium">
            {email}
          </p>
        </div>

        {/* Set Password Form */}
        <div className="bg-card/40 backdrop-blur-sm border border-border/20 px-4 py-4 rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-8 pr-10 py-2.5 bg-background/50 border rounded text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 ${
                    errors.password ? 'border-destructive/50' : 'border-border/30'
                  }`}
                  placeholder="Mínimo 6 caracteres"
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
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-8 pr-10 py-2.5 bg-background/50 border rounded text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 ${
                    errors.confirmPassword ? 'border-destructive/50' : 'border-border/30'
                  }`}
                  placeholder="Repita a senha"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-destructive text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 bg-primary text-primary-foreground rounded font-display text-sm font-semibold tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              ATIVAR CONTA
            </button>
          </form>

          {/* Back to login */}
          <Link
            to="/login/coach"
            className="w-full mt-3 text-center text-muted-foreground/60 hover:text-muted-foreground text-xs transition-colors flex items-center justify-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Voltar
          </Link>
        </div>
      </motion.div>
    </div>
  );
}