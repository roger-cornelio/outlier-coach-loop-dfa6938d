/**
 * WELCOME SCREEN - LAYOUT OFICIAL ATIVO
 * Versão: 1.1.0 (GLOBAL - FINAL)
 * Status: APROVADO E VIGENTE
 * Data: 2025-12-18
 * 
 * Elementos fixos:
 * - Logo OUTLIER (LARANJA FIXO - text-gradient-logo)
 * - Slogan "Be the Outlier"
 * - 3 cards de coach (IRON, PULSE, SPARK)
 * - CTA "PRONTO PARA PERFORMAR" (laranja com glow)
 * 
 * VERSÃO FINAL APROVADA - NÃO MODIFICAR
 */
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import type { CoachStyle } from '@/types/outlier';
import { Flame, Heart, Zap, UserCog, Shield, LogOut, User, UserPlus } from 'lucide-react';

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
  const { user, profile, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSelectCoach = (style: CoachStyle) => {
    setCoachStyle(style);
  };

  const handleContinue = () => {
    // If not logged in, redirect to auth
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (coachStyle) {
      setCurrentView('config');
    }
  };

  const handleCoachAccess = () => {
    navigate('/coach');
  };

  const handleAdminAccess = () => {
    if (authLoading) return;
    if (user && isAdmin) {
      setCurrentView('userManagement');
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso');
  };

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: 'var(--gradient-glow)' }}
      />

      {/* Top buttons container */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
        {/* Coach Portal Button - always visible */}
        <motion.button
          onClick={handleCoachAccess}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-500 border border-green-500/30 transition-all text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          <UserCog className="w-4 h-4" />
          <span className="hidden sm:inline">Painel do Coach</span>
        </motion.button>

        {!user ? (
          /* Not logged in: show login/signup buttons */
          <>
            <motion.button
              onClick={() => navigate('/auth')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              <User className="w-4 h-4" />
              <span>Entrar</span>
            </motion.button>
            <motion.button
              onClick={() => navigate('/auth?mode=signup')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <UserPlus className="w-4 h-4" />
              <span>Criar conta</span>
            </motion.button>
          </>
        ) : (
          /* Logged in: show user info, role buttons, logout */
          <>
            {/* User name display */}
            <motion.div
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 text-sm text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-3 h-3 text-primary" />
              </div>
              <span className="hidden sm:inline max-w-[120px] truncate">{displayName}</span>
            </motion.div>

            {/* Admin Button - only if admin */}
            {isAdmin && (
              <motion.button
                onClick={handleAdminAccess}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-all text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </motion.button>
            )}

            {/* Logout Button */}
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
          </>
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
          className="font-display text-7xl md:text-9xl tracking-widest font-bold text-gradient-logo mb-3"
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
