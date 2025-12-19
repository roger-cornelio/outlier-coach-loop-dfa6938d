/**
 * CoachPortal - "DUMB" page that renders based on AppState
 * 
 * NO automatic redirects to "/" for authenticated users.
 * Rendering is purely based on state from useAppState.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { fetchProfileWithRetry } from '@/utils/fetchProfileWithRetry';
import { useAuth } from '@/hooks/useAuth';
import { useAppState } from '@/hooks/useAppState';
import { useCoachApplication } from '@/hooks/useCoachApplication';
import { useOutlierStore } from '@/store/outlierStore';
import { useToast } from '@/hooks/use-toast';
import { 
  Eye, EyeOff, Mail, Lock, Loader2, ArrowLeft, 
  Clock, CheckCircle, XCircle, RefreshCw, UserCog, 
  Instagram, MapPin, Building2, User, ShieldCheck, ArrowRight
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AuthMode = 'login' | 'signup';

const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100, 'Senha muito longa'),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(100, 'Senha muito longa'),
  instagram: z.string().trim().max(100, 'Instagram muito longo').optional(),
  boxName: z.string().trim().max(100, 'Nome do box muito longo').optional(),
  city: z.string().trim().max(100, 'Cidade muito longa').optional(),
});

export default function CoachPortal() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [instagram, setInstagram] = useState('');
  const [boxName, setBoxName] = useState('');
  const [city, setCity] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailAlreadyRegistered, setEmailAlreadyRegistered] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('login');
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const { profile } = useAuth();
  const { state, user, isAdmin, isSuperAdmin, isCoach } = useAppState();
  const { application, submitting: appSubmitting, submitApplication, refetch } = useCoachApplication();
  const { setCurrentView } = useOutlierStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // ===== FORM VALIDATION =====
  const validateForm = () => {
    try {
      if (mode === 'login') {
        loginSchema.parse({ email, password });
      } else {
        signupSchema.parse({ name, email, password, instagram, boxName, city });
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          const field = error.path[0] as string;
          fieldErrors[field] = error.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  // ===== AUTH HANDLERS =====
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
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
          description: 'Verificando status da sua conta...',
        });
        await refetch();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupAsCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const redirectUrl = `${window.location.origin}/coach`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { name: name.trim() },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setEmailAlreadyRegistered(true);
          setActiveTab('login');
          toast({
            title: 'Esse email já tem conta',
            description: 'Faça login para solicitar acesso como coach.',
          });
        } else {
          toast({
            title: 'Erro no cadastro',
            description: signUpError.message,
            variant: 'destructive',
          });
        }
        return;
      }

      if (!signUpData.user) {
        toast({
          title: 'Erro',
          description: 'Não foi possível criar a conta.',
          variant: 'destructive',
        });
        return;
      }

      const { data: newProfile, error: profileError } = await fetchProfileWithRetry(signUpData.user.id);

      if (profileError || !newProfile?.id) {
        console.error('Error fetching profile after signup:', profileError);
        toast({
          title: 'Conta criada!',
          description: 'Sua conta foi criada, mas houve um problema ao buscar seu perfil. Faça login para continuar.',
          variant: 'destructive',
        });
        return;
      }

      const success = await submitApplication({
        full_name: name.trim(),
        email: email.trim(),
        instagram: instagram.trim() || undefined,
        box_name: boxName.trim() || undefined,
        city: city.trim() || undefined,
      });

      if (!success) {
        toast({
          title: 'Conta criada!',
          description: 'Sua conta foi criada, mas houve um problema ao enviar a solicitação de coach. Tente reenviar depois.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Solicitação enviada!',
          description: 'Sua conta foi criada e a solicitação de coach foi enviada. Aguarde a aprovação do administrador.',
        });
        await refetch();
      }

      setName('');
      setEmail('');
      setPassword('');
      setInstagram('');
      setBoxName('');
      setCity('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!user?.email) {
      toast({
        title: 'Sessão inválida',
        description: 'Faça login novamente.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await submitApplication({
        full_name: profile?.name || application?.full_name || '',
        email: user.email,
        instagram: application?.instagram || instagram.trim() || undefined,
        box_name: application?.box_name || boxName.trim() || undefined,
        city: application?.city || city.trim() || undefined,
      });

      if (!success) {
        toast({
          title: 'Erro',
          description: 'Não foi possível reenviar a solicitação.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Solicitação reenviada!',
          description: 'Aguarde a aprovação do administrador.',
        });
        await refetch();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitApplicationForLoggedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.email) {
      toast({
        title: 'Sessão inválida',
        description: 'Faça login novamente.',
        variant: 'destructive',
      });
      return;
    }

    if (!profile) {
      toast({
        title: 'Erro',
        description: 'Perfil não encontrado. Tente recarregar a página.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await submitApplication({
        full_name: name.trim() || profile.name || '',
        email: user.email,
        instagram: instagram.trim() || undefined,
        box_name: boxName.trim() || undefined,
        city: city.trim() || undefined,
      });

      if (!success) {
        toast({
          title: 'Erro',
          description: 'Não foi possível enviar a solicitação.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Solicitação enviada!',
          description: 'Aguarde a aprovação do administrador.',
        });
        await refetch();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== RENDER BASED ON STATE (no redirects) =====
  
  // STATE: loading - already handled by AppGate, but safety check
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(0,0%,3%)] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Carregando status...</p>
      </div>
    );
  }

  // STATE: admin - show admin card with link to /admin
  if (state === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(0,0%,3%)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto bg-yellow-500/10 rounded-full flex items-center justify-center mb-6">
              <ShieldCheck className="w-8 h-8 text-yellow-500" />
            </div>
            <h1 className="font-display text-2xl text-foreground mb-4">
              Você é {isSuperAdmin ? 'SUPERADMIN' : 'ADMIN'}
            </h1>
            <p className="text-muted-foreground mb-6">
              Você já possui acesso administrativo ao sistema.
            </p>
            <button
              onClick={() => navigate('/admin')}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Ir para Painel do Admin
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // STATE: coach_pending - show pending screen
  if (state === 'coach_pending') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(0,0%,3%)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="font-display text-2xl text-foreground mb-4">
              Aguardando Aprovação
            </h1>
            <p className="text-muted-foreground mb-6">
              Sua solicitação para se tornar coach está em análise.
            </p>
            <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-4">
              <p><strong>Nome:</strong> {application?.full_name}</p>
              <p><strong>Email:</strong> {application?.email}</p>
              {application?.box_name && <p><strong>Box:</strong> {application.box_name}</p>}
              {application?.city && <p><strong>Cidade:</strong> {application.city}</p>}
            </div>
            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={() => navigate('/')}
                className="text-primary hover:underline text-sm flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao início
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Sair e usar outra conta
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // STATE: coach_rejected - show rejection + resubmit option
  if (state === 'coach_rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(0,0%,3%)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="font-display text-2xl text-foreground mb-4">
              Solicitação Recusada
            </h1>
            {application?.rejection_reason && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-destructive">
                  <strong>Motivo:</strong> {application.rejection_reason}
                </p>
              </div>
            )}
            <p className="text-muted-foreground mb-6">
              Você pode reenviar a solicitação para nova análise.
            </p>
            <button
              onClick={handleResubmit}
              disabled={isSubmitting}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              Reenviar Solicitação
            </button>
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={() => navigate('/')}
                className="text-primary hover:underline text-sm flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao início
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Sair e usar outra conta
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // STATE: coach_approved - show coach hub (NO redirect to "/")
  if (state === 'coach_approved') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(0,0%,3%)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="font-display text-2xl text-foreground mb-3">Central do Coach</h1>
            <p className="text-muted-foreground mb-6">
              Seu acesso de coach está ativo. Escolha para onde ir.
            </p>
            <div className="grid gap-3">
              <button
                onClick={() => {
                  setCurrentView('coachPerformance');
                  navigate('/');
                }}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Ver Performance
              </button>
              <button
                onClick={() => {
                  setCurrentView('dashboard');
                  navigate('/');
                }}
                className="w-full py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Ir para o App
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Sair
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // STATE: athlete (authenticated but no application) - show access restricted screen
  if (state === 'athlete' && user) {
    if (!showApplicationForm) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(0,0%,3%)] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl text-center">
              <div className="w-16 h-16 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
                <UserCog className="w-8 h-8 text-amber-500" />
              </div>
              <h1 className="font-display text-2xl text-foreground mb-4">
                Acesso restrito ao Coach
              </h1>
              <p className="text-muted-foreground mb-6">
                Este painel é exclusivo para coaches.
                <br />
                Para liberar esse acesso, solicite autorização como coach.
              </p>
              <div className="grid gap-3">
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <UserCog className="w-5 h-5" />
                  Solicitar acesso como Coach
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Voltar para treinos
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    // Show application form when user clicked "Solicitar acesso"
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(0,0%,3%)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl">
            <button
              onClick={() => setShowApplicationForm(false)}
              className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <UserCog className="w-8 h-8 text-primary" />
              </div>
              <h1 className="font-display text-2xl text-foreground mb-2">
                Solicitar Acesso de Coach
              </h1>
              <p className="text-muted-foreground text-sm">
                Complete os dados abaixo para solicitar acesso
              </p>
            </div>

            <form onSubmit={handleSubmitApplicationForLoggedUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={name || profile?.name || ''}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Instagram</label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="@seuinstagram"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Box/Afiliado</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={boxName}
                    onChange={(e) => setBoxName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Nome do box"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cidade</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Sua cidade"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || appSubmitting}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {(isSubmitting || appSubmitting) ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : null}
                Enviar Solicitação
              </button>
            </form>

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={() => navigate('/')}
                className="text-primary hover:underline text-sm flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao início
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Sair e usar outra conta
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // STATE: anon - show login/signup form
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(0,0%,3%)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-foreground mb-2">Portal do Coach</h1>
          <p className="text-muted-foreground">Acesse ou cadastre-se para gerenciar atletas</p>
        </div>

        <div className="bg-card border border-border/50 p-6 rounded-2xl shadow-2xl">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {emailAlreadyRegistered && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-500">
                    Esse email já está cadastrado. Faça login para continuar.
                  </p>
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Entrar
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignupAsCoach} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Nome completo *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Seu nome"
                      required
                    />
                  </div>
                  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Senha *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Instagram</label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="@seuinstagram"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Box/Afiliado</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={boxName}
                      onChange={(e) => setBoxName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Nome do box"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Cidade</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Sua cidade"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Cadastrar e Solicitar Acesso
                </button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-muted-foreground text-sm mt-6">
          Quer usar como atleta?{' '}
          <button onClick={() => navigate('/')} className="text-primary hover:underline">
            Ir para o app
          </button>
        </p>
      </motion.div>
    </div>
  );
}
