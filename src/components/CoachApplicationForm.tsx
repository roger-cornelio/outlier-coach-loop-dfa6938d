import { useState } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useCoachApplication } from '@/hooks/useCoachApplication';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Instagram, 
  MapPin, 
  Building2, 
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  AlertCircle,
  Lock,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';

const applicationSchema = z.object({
  full_name: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  email: z.string().trim().email('Email inválido').max(255),
  telefone: z.string().trim().min(8, 'Telefone inválido').max(20, 'Telefone muito longo'),
  instagram: z.string().trim().max(50).optional(),
  box_name: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
});

export function CoachApplicationForm() {
  const { profile, user } = useAuth();
  const { application, status, loading, submitting, submitApplication } = useCoachApplication();
  
  // Email comes directly from authenticated user - use user.email only
  const userEmail = user?.email || '';
  
  const [formData, setFormData] = useState({
    full_name: profile?.name || '',
    telefone: '',
    instagram: '',
    box_name: '',
    city: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill form when application exists (for resubmission)
  useState(() => {
    if (application && status === 'rejected') {
      setFormData({
        full_name: application.full_name || profile?.name || '',
        telefone: '',
        instagram: application.instagram || '',
        box_name: application.box_name || '',
        city: application.city || '',
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Block submit if no authenticated email
    if (!user?.email) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }

    try {
      const validated = applicationSchema.parse({ ...formData, email: user.email });
      setErrors({});

      const success = await submitApplication({
        full_name: validated.full_name,
        email: user.email, // Always use user.email directly from auth
        instagram: validated.instagram,
        box_name: validated.box_name,
        city: validated.city,
      });

      if (success) {
        // Insert into CRM
        await supabase.from('crm_clientes').insert({
          nome: validated.full_name,
          telefone: validated.telefone,
          instagram: validated.instagram || null,
        });
        
        toast.success('Solicitação enviada!', {
          description: 'Aguarde a aprovação do administrador.',
        });
      } else {
        toast.error('Erro ao enviar solicitação');
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
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Already approved - show success state
  if (status === 'approved') {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">
            Você é um Coach!
          </h3>
          <p className="text-muted-foreground">
            Sua conta tem acesso ao painel de coach.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Pending - show waiting state
  if (status === 'pending') {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="pt-6 text-center">
          <Clock className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">
            Aguardando Aprovação
          </h3>
          <p className="text-muted-foreground mb-4">
            Sua solicitação foi enviada em{' '}
            {application?.created_at
              ? new Date(application.created_at).toLocaleDateString('pt-BR')
              : ''}
          </p>
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
            Pendente
          </Badge>
        </CardContent>
      </Card>
    );
  }

  // Rejected - show reason and allow resubmission
  if (status === 'rejected') {
    return (
      <div className="space-y-6">
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Solicitação Não Aprovada
                </h3>
                {application?.rejection_reason && (
                  <p className="text-muted-foreground mb-2">
                    <strong>Motivo:</strong> {application.rejection_reason}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Você pode enviar uma nova solicitação abaixo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resubmission form */}
        <ApplicationFormFields
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          submitting={submitting}
          onSubmit={handleSubmit}
          buttonText="Reenviar Solicitação"
          userEmail={userEmail}
        />
      </div>
    );
  }

  // No application yet - show form
  return (
    <ApplicationFormFields
      formData={formData}
      setFormData={setFormData}
      errors={errors}
      submitting={submitting}
      onSubmit={handleSubmit}
      buttonText="Enviar Solicitação"
      userEmail={userEmail}
    />
  );
}

// Separate form fields component for reuse
function ApplicationFormFields({
  formData,
  setFormData,
  errors,
  submitting,
  onSubmit,
  buttonText,
  userEmail,
}: {
  formData: {
    full_name: string;
    telefone: string;
    instagram: string;
    box_name: string;
    city: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  errors: Record<string, string>;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  buttonText: string;
  userEmail: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Solicitar Acesso como Coach
        </CardTitle>
        <CardDescription>
          Preencha o formulário para solicitar acesso ao painel de coach.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
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
              <p className="text-destructive text-sm mt-1">{errors.full_name}</p>
            )}
          </div>

          {/* Email - Read Only from authenticated user */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={userEmail}
                readOnly
                disabled
                className="w-full pl-10 pr-10 py-2.5 bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed"
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Este é o email da sua conta e não pode ser alterado
            </p>
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Telefone (WhatsApp) *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className={`w-full pl-10 pr-4 py-2.5 bg-secondary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  errors.telefone ? 'border-destructive' : 'border-border'
                }`}
                placeholder="(11) 99999-9999"
              />
            </div>
            {errors.telefone && (
              <p className="text-destructive text-sm mt-1">{errors.telefone}</p>
            )}
          </div>
          {/* Instagram */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Instagram
            </label>
            <div className="relative">
              <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="@seuinsta"
              />
            </div>
          </div>

          {/* Box/Gym Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Box / Academia
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={formData.box_name}
                onChange={(e) => setFormData({ ...formData, box_name: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Nome do box ou academia"
              />
            </div>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Cidade
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Sua cidade"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {buttonText}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
