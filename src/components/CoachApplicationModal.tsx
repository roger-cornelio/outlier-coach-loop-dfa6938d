import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { X, User, Mail, Phone, Loader2, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const applicationSchema = z.object({
  full_name: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100, 'Nome muito longo'),
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  contact: z.string().trim().min(3, 'Informe seu WhatsApp ou Instagram').max(100, 'Contato muito longo'),
});

interface CoachApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CoachApplicationModal({ isOpen, onClose }: CoachApplicationModalProps) {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    contact: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isLoggedIn = !!user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataToValidate = isLoggedIn
        ? { ...formData, email: user?.email || formData.email }
        : formData;
      
      const validated = applicationSchema.parse(dataToValidate);
      setErrors({});
      setSubmitting(true);

      // Insert without user_id (nullable now) - works for both logged in and anonymous users
      const insertData: Record<string, unknown> = {
        full_name: validated.full_name,
        email: isLoggedIn ? user?.email : validated.email,
        instagram: validated.contact,
        status: 'pending',
      };

      // Only add auth_user_id if user is logged in
      if (isLoggedIn && user?.id) {
        insertData.auth_user_id = user.id;
      }

      const { error } = await supabase
        .from('coach_applications')
        .insert(insertData as any);

      if (error) {
        console.error('[CoachApplicationModal] Error submitting:', error);
        toast.error('Erro ao enviar. Tente novamente.');
        setSubmitting(false);
        return;
      }

      toast.success('Contato enviado. Aguarde aprovação do admin.');
      setSubmitted(true);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error('[CoachApplicationModal] Unexpected error:', err);
        toast.error('Erro ao enviar. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ full_name: '', email: '', contact: '' });
    setErrors({});
    setSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[520px] bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30 flex-shrink-0">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Deixe seu contato
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* Submitted success */}
              {submitted && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Contato Enviado!
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Em breve entraremos em contato para liberar seu acesso.
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
              {!submitted && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-muted-foreground text-sm mb-4">
                    Entraremos em contato para liberar o acesso ao painel de Coach.
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

                  {/* Contact (WhatsApp/Instagram) - REQUIRED */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      WhatsApp ou Instagram *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={formData.contact}
                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
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
                    disabled={submitting}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
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
  );
}
