import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoachApplication } from '@/hooks/useCoachApplication';
import { useOutlierStore } from '@/store/outlierStore';
import { useToast } from '@/hooks/use-toast';
import { 
  Eye, EyeOff, Mail, Lock, Loader2, User, ArrowLeft, 
  Clock, CheckCircle, XCircle, RefreshCw, UserCog, 
  Instagram, MapPin, Building2, LogOut
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

  const { user, profile, isCoach, loading: authLoading } = useAuth();
  const { application, loading: appLoading, submitApplication, refetch } = useCoachApplication();
  const { setCurrentView } = useOutlierStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // If authenticated and is coach with approved application, redirect to coach panel
  useEffect(() => {
    if (!authLoading && !appLoading && user && isCoach && application?.status === 'approved') {
      setCurrentView('admin');
      navigate('/');
    }
  }, [user, isCoach, application, authLoading, appLoading, navigate, setCurrentView]);

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
        // The useEffect will handle redirection
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
      // 1. Create auth account
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
          toast({
            title: 'Email já cadastrado',
            description: 'Este email já está registrado. Tente fazer login.',
            variant: 'destructive',
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

      // Wait a moment for the profile trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2. Submit coach application
      const success = await submitApplication({
        full_name: name.trim(),
        email: email.trim(),
        instagram: instagram.trim() || undefined,
        box_name: boxName.trim() || undefined,
        city: city.trim() || undefined,
      });

      if (!success) {
        console.error('Error submitting application');
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
        // Force refetch to update UI
        await refetch();
      }

      // Clear form
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
    setIsSubmitting(true);
    try {
      const success = await submitApplication({
        full_name: profile?.name || application?.full_name || '',
        email: profile?.email || application?.email || '',
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
        refetch();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOutAndReturn = async () => {
    await supabase.auth.signOut();
    setMode('login');
  };

  // Loading state
  if (authLoading || appLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(0,0%,3%)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Authenticated user - show status based on application
  if (user) {
    // Check application status first (pending, rejected, approved)
    // IMPORTANT: Only show "athlete access" if there's NO application at all
    
    // Pending application - show waiting screen
    if (application?.status === 'pending') {
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
                Você receberá acesso assim que um administrador aprovar.
              </p>
              <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-4">
                <p><strong>Nome:</strong> {application.full_name}</p>
                <p><strong>Email:</strong> {application.email}</p>
                {application.box_name && <p><strong>Box:</strong> {application.box_name}</p>}
                {application.city && <p><strong>Cidade:</strong> {application.city}</p>}
              </div>
              <button
                onClick={() => navigate('/')}
                className="mt-6 text-primary hover:underline text-sm flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao início
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // Rejected application - show rejection + resubmit option
    if (application?.status === 'rejected') {
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
              {application.rejection_reason && (
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

              <button
                onClick={() => navigate('/')}
                className="mt-4 text-primary hover:underline text-sm flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao início
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // Approved application + coach role - redirect to panel (handled in useEffect)
    if (application?.status === 'approved' && isCoach) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(0,0%,3%)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    // Approved but not coach role yet (edge case - needs re-login)
    if (application?.status === 'approved' && !isCoach) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(0,0%,3%)] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md text-center"
          >
            <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl">
              <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="font-display text-2xl text-foreground mb-4">
                Aprovado!
              </h1>
              <p className="text-muted-foreground mb-6">
                Sua solicitação foi aprovada. Faça logout e login novamente para ativar o acesso de coach.
              </p>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/coach');
                }}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Fazer Login Novamente
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // NO application exists AND user is not coach = show athlete warning
    // This is the ONLY case where we show the "athlete access" message
    if (!application && !isCoach) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(0,0%,3%)] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl text-center">
              <div className="w-16 h-16 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
                <User className="w-8 h-8 text-amber-500" />
              </div>
              <h1 className="font-display text-2xl text-foreground mb-4">
                Acesso de Atleta
              </h1>
              <p className="text-muted-foreground mb-6">
                Você está logado como atleta/usuário. Para acessar como coach, 
                saia e entre com sua conta de coach.
              </p>
              
              <button
                onClick={handleSignOutAndReturn}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Sair e entrar como Coach
              </button>

              <button
                onClick={() => navigate('/')}
                className="mt-4 text-primary hover:underline text-sm flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao início
              </button>
            </div>
          </motion.div>
        </div>
      );
    }
  }

  // Not authenticated - show login/signup tabs
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(0,0%,3%)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <UserCog className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl text-foreground mb-2 tracking-wide">
              PORTAL DO COACH
            </h1>
            <p className="text-muted-foreground text-sm">
              Acesse ou cadastre-se como coach
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full" onValueChange={(v) => setMode(v as AuthMode)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar como Coach</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
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
                  {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Senha</label>
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
                  {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
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
                      className={`w-full pl-10 pr-4 py-3 bg-secondary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        errors.name ? 'border-destructive' : 'border-border'
                      }`}
                      placeholder="Seu nome"
                    />
                  </div>
                  {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
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
                  {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Senha *</label>
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
                  {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground mb-3">Informações adicionais (opcional)</p>
                  
                  <div className="space-y-3">
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="@seu_instagram"
                      />
                    </div>

                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={boxName}
                        onChange={(e) => setBoxName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Nome do seu Box/Academia"
                      />
                    </div>

                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Cidade"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  Cadastrar e Solicitar Acesso
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  Ao se cadastrar, sua conta será criada com acesso básico. 
                  O acesso de coach será liberado após aprovação de um administrador.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <button
            onClick={() => navigate('/')}
            className="mt-6 text-primary hover:underline text-sm flex items-center gap-1 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </button>
        </div>
      </motion.div>
    </div>
  );
}