/**
 * WELCOME SCREEN - LAYOUT OFICIAL ATIVO
 * Versão: 1.0.0 (GLOBAL)
 * Status: APROVADO E VIGENTE
 * Data: 2025-12-18
 * 
 * Elementos fixos:
 * - Logo OUTLIER (laranja)
 * - Slogan "Be the Outlier"
 * - 3 cards de coach (IRON, PULSE, SPARK)
 * - CTA "PRONTO PARA PERFORMAR" (laranja com glow)
 * 
 * NÃO MODIFICAR SEM APROVAÇÃO EXPLÍCITA
 */
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import type { CoachStyle } from '@/types/outlier';
import { Flame, Heart, Zap, UserCog, Shield, Clock, LogOut } from 'lucide-react';

const coachOptions: { style: CoachStyle; icon: React.ReactNode; title: string; description: string }[] = [
  {
    style: 'IRON',
    icon: <Flame className="w-8 h-8" />,
    title: 'IRON',
    description: 'Direto. Exigente. Sem desculpas.',
  },
  {
    style: 'PULSE',
    icon: <Heart className="w-8 h-8" />,
    title: 'PULSE',
    description: 'Humano. Consistente. Confiável.',
  },
  {
    style: 'SPARK',
    icon: <Zap className="w-8 h-8" />,
    title: 'SPARK',
    description: 'Leve. Energético. Inspirador.',
  },
];

export function WelcomeScreen() {
  const { setCoachStyle, setCurrentView, coachStyle } = useOutlierStore();
  const { user, canManageWorkouts, isAdmin, isCoach, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSelectCoach = (style: CoachStyle) => {
    setCoachStyle(style);
  };

  const handleContinue = () => {
    if (coachStyle) {
      setCurrentView('config');
    }
  };

  const handleCoachAccess = () => {
    if (authLoading) return;

    // If logged in and is coach or admin, go to admin panel
    if (user && canManageWorkouts) {
      setCurrentView('admin');
      return;
    }

    // If logged in but waiting for approval (has user role only)
    if (user && !canManageWorkouts) {
      toast.info('Aguardando aprovação do administrador para acessar como coach.');
      return;
    }

    // Not logged in - go to auth page
    navigate('/auth?next=coach');
  };

  const handleAdminAccess = () => {
    if (authLoading) return;

    if (user && isAdmin) {
      setCurrentView('userManagement');
      return;
    }

    if (user && !isAdmin) {
      toast.error('Acesso restrito: apenas administradores');
      return;
    }

    navigate('/auth?next=userManagement');
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso');
  };

  // Determine coach button state
  const getCoachButtonState = () => {
    if (!user) {
      return { label: 'Coach', variant: 'default' as const };
    }
    if (canManageWorkouts) {
      return { label: 'Painel Coach', variant: 'active' as const };
    }
    return { label: 'Aguardando...', variant: 'pending' as const };
  };

  const coachButtonState = getCoachButtonState();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: 'var(--gradient-glow)' }}
      />

      {/* Top buttons container */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
        {/* Admin Button - always visible for admin login/access */}
        <motion.button
          onClick={handleAdminAccess}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm border ${
            isAdmin
              ? 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'
              : 'bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground border-transparent'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          <Shield className="w-4 h-4" />
          <span className="hidden sm:inline">Admin</span>
        </motion.button>

        {/* Coach Button */}
        <motion.button
          onClick={handleCoachAccess}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm ${
            coachButtonState.variant === 'active'
              ? 'bg-green-500/20 hover:bg-green-500/30 text-green-500 border border-green-500/30'
              : coachButtonState.variant === 'pending'
              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 cursor-default'
              : 'bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {coachButtonState.variant === 'pending' ? (
            <Clock className="w-4 h-4" />
          ) : (
            <UserCog className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{coachButtonState.label}</span>
        </motion.button>

        {/* Logout Button - only if logged in */}
        {user && (
          <motion.button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
        )}
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10 max-w-2xl"
      >
        {/* Logo */}
        <motion.h1 
          className="font-display text-7xl md:text-9xl tracking-widest font-bold text-gradient mb-3"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          OUTLIER
        </motion.h1>
        
        <motion.p 
          className="text-xl md:text-2xl font-display text-muted-foreground tracking-wide mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Be the Outlier. Treine para ser fora da curva.
        </motion.p>
        
        <motion.p 
          className="text-muted-foreground mb-14 max-w-md mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Seu programa de treinamento HYROX personalizado. 
          Escolha seu estilo de coach e comece a jornada.
        </motion.p>

        {/* Coach Selection */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {coachOptions.map((option) => (
            <motion.button
              key={option.style}
              onClick={() => handleSelectCoach(option.style)}
              className={`
                card-elevated p-7 text-left transition-all duration-300
                ${coachStyle === option.style 
                  ? 'border-primary ring-2 ring-primary/50 shadow-xl shadow-primary/25 scale-[1.03]' 
                  : 'hover:border-muted-foreground/50 opacity-70 hover:opacity-100 shadow-md'
                }
              `}
              whileHover={{ scale: coachStyle === option.style ? 1.03 : 1.04 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`
                mb-4 inline-flex p-3.5 rounded-xl transition-all duration-300
                ${coachStyle === option.style 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/40' 
                  : 'bg-secondary text-foreground'
                }
              `}>
                {option.icon}
              </div>
              <h3 className="font-display text-2xl mb-2 tracking-wide">{option.title}</h3>
              <p className="text-sm text-muted-foreground leading-snug">{option.description}</p>
            </motion.button>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.button
          onClick={handleContinue}
          disabled={!coachStyle}
          className={`
            font-display text-xl tracking-widest px-16 py-6 rounded-xl
            transition-all duration-300
            ${coachStyle 
              ? 'bg-primary text-primary-foreground hover:brightness-110 shadow-xl shadow-primary/40 ring-2 ring-primary/40' 
              : 'bg-muted text-muted-foreground cursor-not-allowed'
            }
          `}
          whileHover={coachStyle ? { scale: 1.05 } : {}}
          whileTap={coachStyle ? { scale: 0.95 } : {}}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          PRONTO PARA PERFORMAR
        </motion.button>
      </motion.div>
    </div>
  );
}
