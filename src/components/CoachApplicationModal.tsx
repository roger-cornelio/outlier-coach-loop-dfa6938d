import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoachApplication } from '@/hooks/useCoachApplication';
import { X, User, Mail, Instagram, MessageSquare, Loader2, Send, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const applicationSchema = z.object({
  full_name: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100, 'Nome muito longo'),
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  contact: z.string().trim().max(100, 'Contato muito longo').optional(),
  message: z.string().trim().max(500, 'Mensagem muito longa').optional(),
});

interface CoachApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CoachApplicationModal({ isOpen, onClose }: CoachApplicationModalProps) {
  const { user, profile } = useAuth();
  const { application, status, submitting: hookSubmitting, submitApplication } = useCoachApplication();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    contact: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // If user is logged in, use the hook's application status
  const isLoggedIn = !!user;
  const hasExistingApplication = isLoggedIn && (status === 'pending' || status === 'approved');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToValidate = isLoggedIn
        ? { ...formData, email: user?.email || formData.email }
        : formData;
      
      const validated = applicationSchema.parse(dataToValidate);
      setErrors({});
      setSubmitting(true);

      if (isLoggedIn) {
        // Use the hook for logged-in users
        const success = await submitApplication({
          full_name: validated.full_name,
          email: user?.email || validated.email,
          instagram: validated.contact || undefined,
        });

        if (success) {
          toast.success('Solicitação enviada!', {
            description: 'Aguarde a aprovação do administrador.',
          });
          setSubmitted(true);
        } else {
          toast.error('Erro ao enviar solicitação');
        }
      } else {
        // For non-logged users, create a temporary application record
        // They'll need to create an account later
        const { error } = await supabase
          .from('coach_applications')
          .insert({
            full_name: validated.full_name,
            email: validated.email,
            instagram: validated.contact || null,
            message: validated.message || null,
            status: 'pending',
            // user_id will be null for non-authenticated requests
            // This requires the DB to allow null user_id
          } as any);

        if (error) {
          console.error('Error submitting application:', error);
          // If RLS blocks, suggest creating account first
          if (error.code === '42501' || error.message.includes('policy')) {
            toast.error('Crie uma conta primeiro', {
              description: 'Faça login abaixo e depois solicite acesso de Coach.',
            });
          } else {
            toast.error('Erro ao enviar', {
              description: error.message,
            });
          }
          setSubmitting(false);
          return;
        }

        toast.success('Solicitação enviada!', {
          description: 'Aguarde a aprovação do administrador.',
        });
        setSubmitted(true);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ full_name: '', email: '', contact: '', message: '' });
    setErrors({});
    setSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md bg-card border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Solicitar Acesso de Coach
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {/* Already has pending application */}
              {hasExistingApplication && status === 'pending' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto bg-yellow-500/10 rounded-full flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Aguardando Aprovação
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Sua solicitação foi enviada em{' '}
                    {application?.created_at
                      ? new Date(application.created_at).toLocaleDateString('pt-BR')
                      : ''}
                  </p>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Already approved */}
              {hasExistingApplication && status === 'approved' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Você já é Coach!
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Faça login para acessar o painel de coach.
                  </p>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Submitted success */}
              {submitted && !hasExistingApplication && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Solicitação Enviada!
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Aguarde a aprovação do administrador. Você receberá uma notificação quando sua solicitação for processada.
                  </p>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Form */}
              {!submitted && !hasExistingApplication && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-muted-foreground text-sm mb-4">
                    Preencha o formulário abaixo para solicitar acesso ao painel de Coach.
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
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
                        value={isLoggedIn ? (user?.email || '') : formData.email}
                        onChange={(e) => !isLoggedIn && setFormData({ ...formData, email: e.target.value })}
                        readOnly={isLoggedIn}
                        disabled={isLoggedIn}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                          isLoggedIn ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-secondary'
                        } ${errors.email ? 'border-destructive' : 'border-border'}`}
                        placeholder="seu@email.com"
                      />
                    </div>
                    {isLoggedIn && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Email da sua conta logada
                      </p>
                    )}
                    {errors.email && (
                      <p className="text-destructive text-xs mt-1">{errors.email}</p>
                    )}
                  </div>

                  {/* Contact (Instagram/WhatsApp) */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Instagram ou WhatsApp
                    </label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={formData.contact}
                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="@seuinsta ou (11) 99999-9999"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Mensagem
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={3}
                        className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        placeholder="Conte um pouco sobre você e sua experiência como coach..."
                      />
                    </div>
                    {errors.message && (
                      <p className="text-destructive text-xs mt-1">{errors.message}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting || hookSubmitting}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {(submitting || hookSubmitting) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Enviar Solicitação
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
