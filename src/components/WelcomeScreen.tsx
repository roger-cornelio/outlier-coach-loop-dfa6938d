/**
 * WELCOME SCREEN - Tela pós-cadastro
 * 
 * IMPORTANTE: Esta tela só é exibida para usuários AUTENTICADOS
 * que ainda não completaram o setup (first_setup_completed !== true).
 * 
 * Mostra "BE THE OUTLIER" + CTA "ACESSE SEU DIAGNÓSTICO"
 * que salva o setup e direciona para o dashboard.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { useCoachStylePersistence } from '@/hooks/useCoachStylePersistence';
import { LogOut, User, Loader2, ArrowRight } from 'lucide-react';
import { OutlierWordmark } from '@/components/ui/OutlierWordmark';

export function WelcomeScreen() {
  const { setCurrentView } = useOutlierStore();
  const { profile, signOut } = useAuth();
  const { saveCoachStyle } = useCoachStylePersistence();
  const [isSaving, setIsSaving] = useState(false);

  const handleAccessDiagnostic = async () => {
    setIsSaving(true);

    // Salvar estilo padrão (PULSE) e marcar setup como completo
    const result = await saveCoachStyle('PULSE');

    if (result.success) {
      console.log(`[NAV][WelcomeScreen] from_view=welcome to_view=dashboard reason=user_clicked_access_diagnostic ts=${new Date().toISOString()}`);
      setCurrentView('dashboard');
    } else {
      toast.error('Erro ao iniciar. Tente novamente.');
      console.error('[WelcomeScreen] Failed to save:', result.error);
    }

    setIsSaving(false);
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
        {/* Logo */}
        <motion.div
          className="mb-12"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="font-display text-2xl md:text-4xl tracking-widest font-normal text-white mb-1">
            BE THE
          </p>
          <OutlierWordmark size="hero" />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          className="text-lg md:text-xl text-muted-foreground mb-4 max-w-md mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Seu diagnóstico de performance está pronto.
        </motion.p>

        <motion.p
          className="text-sm text-muted-foreground/70 mb-14 max-w-sm mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Descubra seu nível, seus pontos fortes e o que precisa evoluir.
        </motion.p>

        {/* CTA Button */}
        <div className="flex justify-center w-full">
          <motion.button
            onClick={handleAccessDiagnostic}
            disabled={isSaving}
            className={`
              font-display text-xl tracking-widest px-16 py-6 rounded-xl
              transition-all duration-300 flex items-center justify-center gap-3
              ${!isSaving
                ? 'bg-primary text-primary-foreground hover:brightness-110 shadow-xl shadow-primary/40 ring-2 ring-primary/40'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
              }
            `}
            whileHover={!isSaving ? { scale: 1.05 } : {}}
            whileTap={!isSaving ? { scale: 0.95 } : {}}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
            {isSaving ? 'CARREGANDO...' : 'ACESSE SEU DIAGNÓSTICO'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
