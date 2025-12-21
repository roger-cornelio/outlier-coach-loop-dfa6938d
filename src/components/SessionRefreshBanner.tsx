import { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, AlertTriangle } from 'lucide-react';
import { AuthContext } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function SessionRefreshBanner() {
  // Use useContext directly to avoid throwing if provider is missing
  const authCtx = useContext(AuthContext);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Guard: if context not available, render nothing (avoids crash on public routes during HMR)
  if (!authCtx) {
    return null;
  }

  const { sessionExpired, refreshSession, user } = authCtx;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const { error } = await refreshSession();
    setIsRefreshing(false);
    
    if (error) {
      toast.error('Erro ao atualizar sessão. Faça login novamente.');
    } else {
      toast.success('Sessão atualizada com sucesso!');
      setDismissed(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Only show if user is logged in, session is expired, and not dismissed
  if (!user || !sessionExpired || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
      >
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 backdrop-blur-lg shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Sua sessão está prestes a expirar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique em atualizar para continuar conectado.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Atualizando...' : 'Atualizar sessão'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ignorar
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
