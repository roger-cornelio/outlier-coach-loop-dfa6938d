/**
 * WELCOME SCREEN - Seleção de Coach
 * 
 * IMPORTANTE: Esta tela só é exibida para usuários AUTENTICADOS.
 * Usuários anônimos são redirecionados para /auth pelo AppGate.
 */
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import type { CoachStyle } from '@/types/outlier';
import { Flame, Heart, Zap, LogOut, User } from 'lucide-react';
import { getCoachCopy } from '@/config/coachCopy';

// Use centralized copy - pick any coach since selectCoachScreen is the same for all
const screenCopy = getCoachCopy('PULSE').selectCoachScreen;

const coachOptions: { style: CoachStyle; icon: React.ReactNode }[] = [
  { style: 'IRON', icon: <Flame className="w-8 h-8" /> },
  { style: 'PULSE', icon: <Heart className="w-8 h-8" /> },
  { style: 'SPARK', icon: <Zap className="w-8 h-8" /> },
];

export function WelcomeScreen() {
  const { setCoachStyle, setCurrentView, coachStyle } = useOutlierStore();
  const { profile, signOut } = useAuth();

  const handleSelectCoach = (style: CoachStyle) => {
    setCoachStyle(style);
  };

  const handleContinue = () => {
    if (coachStyle) {
      setCurrentView('athleteWelcome');
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso');
  };

  const displayName = profile?.name || profile?.email?.split('@')[0] || 'Atleta';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: 'var(--gradient-glow)' }}
      />

      {/* Top bar - User info and logout */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
        {/* User name display */}
        <motion.div
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 text-sm text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-3 h-3 text-primary" />
          </div>
          <span className="hidden sm:inline max-w-[150px] truncate">{displayName}</span>
        </motion.div>

        {/* Logout Button */}
        <motion.button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </motion.button>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10 max-w-2xl"
      >
        {/* Logo - LOCKED: Do not modify typography, hierarchy, or proportions */}
        <motion.div
          className="mb-3"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Prefix - smaller, regular weight, white */}
          <p className="font-display text-2xl md:text-4xl tracking-widest font-normal text-white mb-1">
            BE THE
          </p>
          {/* Main logo - LOCKED: orange, bold, large - DO NOT MODIFY */}
          <h1 className="font-display text-7xl md:text-9xl tracking-widest font-bold text-gradient-logo">
            OUTLIER
          </h1>
        </motion.div>
        
        <motion.p 
          className="text-xl md:text-2xl font-display text-muted-foreground tracking-wide mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {screenCopy.title}
        </motion.p>
        
        <motion.p 
          className="text-muted-foreground mb-14 max-w-md mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {screenCopy.subtitle}
        </motion.p>

        {/* Coach Selection */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {coachOptions.map((option) => {
            const cardCopy = screenCopy.cards[option.style];
            return (
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
                <h3 className="font-display text-2xl mb-2 tracking-wide">{cardCopy.title}</h3>
                <p className="text-sm text-muted-foreground leading-snug">{cardCopy.description}</p>
              </motion.button>
            );
          })}
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
          {screenCopy.cta}
        </motion.button>
      </motion.div>
    </div>
  );
}
