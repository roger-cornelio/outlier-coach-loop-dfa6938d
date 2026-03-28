/**
 * CoachRequest - Tela para solicitar acesso como coach
 */

import { useState } from 'react';
import { useNavigate, Link, useSearchParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Loader2, ArrowLeft, CheckCircle, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const requestSchema = z.object({
  full_name: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100, 'Nome muito longo'),
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  contact: z.string().trim().min(3, 'Informe seu WhatsApp ou Instagram').max(100, 'Contato muito longo'),
});

export default function CoachRequest() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(emailParam);
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const navigate = useNavigate();
  const { isCoach, loading: authLoading } = useAuth();

  if (!authLoading && isCoach) {
    return <Navigate to="/coach/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = requestSchema.safeParse({ full_name: fullName, email, contact });
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
      const normalizedEmail = email.toLowerCase().trim();
      
      const { data, error } = await supabase.rpc('submit_coach_application', {
        _full_name: fullName.trim(),
        _email: normalizedEmail,
        _contact: contact.trim(),
      });

      if (error) {
        console.error('[CoachRequest] submit error:', error);
        toast({
          title: 'Erro ao enviar',
          description: error.message.includes('invalid_') ? 'Verifique os campos.' : 'Tente novamente.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const row = Array.isArray(data) && data.length > 0 ? data[0] : null;

      if (!row) {
        toast({
          title: 'Erro',
          description: 'Resposta inesperada. Tente novamente.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // If already approved, redirect to set password
      if (row.approved) {
        toast({
          title: 'Acesso já aprovado!',
          description: 'Defina sua senha para entrar.',
        });
        navigate(`/coach/definir-senha?email=${encodeURIComponent(normalizedEmail)}`, { replace: true });
        return;
      }

      // If application already exists
      if (!row.created) {
        const st = String(row.out_status).toLowerCase();
        if (st === 'pending') {
          toast({
            title: 'Solicitação já registrada',
            description: 'Aguarde a aprovação do admin.',
          });
          navigate('/coach-pending', { replace: true });
        } else if (st === 'rejected') {
          toast({
            title: 'Solicitação recusada anteriormente',
            description: 'Fale com o suporte para mais informações.',
            variant: 'destructive',
          });
        }
        setIsSubmitting(false);
        return;
      }

      // New application created successfully
      setSubmitted(true);
    } catch (err) {
      console.error('[CoachRequest] error:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,4%)] to-[hsl(0,0%,2%)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 30%, hsl(var(--primary) / 0.15), transparent 60%)' }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm z-10 text-center"
        >
          <div className="w-20 h-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>

          <h1 className="font-display text-2xl text-foreground mb-3">
            Solicitação Enviada!
          </h1>
          
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            Você receberá uma notificação assim que sua solicitação for analisada.
          </p>

          <Link
            to="/login/coach"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded font-display text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Login
          </Link>
        </motion.div>
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl text-foreground mb-2">
            Solicitar Acesso
          </h1>
          <p className="text-muted-foreground text-sm">
            Preencha seus dados para solicitar acesso como coach.
          </p>
        </div>

        {/* Form */}
        <div className="bg-card/40 backdrop-blur-sm border border-border/20 px-4 py-4 rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Name */}
            <div>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full pl-8 pr-3 py-2.5 bg-background/50 border rounded text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 ${
                    errors.full_name ? 'border-destructive/50' : 'border-border/30'
                  }`}
                  placeholder="Nome completo"
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-8 pr-3 py-2.5 bg-background/50 border rounded text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 ${
                    errors.email ? 'border-destructive/50' : 'border-border/30'
                  }`}
                  placeholder="Email"
                />
              </div>
              {errors.email && (
                <p className="text-destructive text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Contact */}
            <div>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className={`w-full pl-8 pr-3 py-2.5 bg-background/50 border rounded text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 ${
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
              className="w-full mt-2 py-2.5 bg-primary text-primary-foreground rounded font-display text-sm font-semibold tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              ENVIAR
            </button>
          </form>

          {/* Back link */}
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
