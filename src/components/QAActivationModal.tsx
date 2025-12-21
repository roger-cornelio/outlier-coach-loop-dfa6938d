/**
 * QAActivationModal - Modal para ativar QA Debug Mode
 * 
 * Solicita código QA e ativa o modo de debug para testes
 * Sem expiração - toggle manual
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bug, Lock } from 'lucide-react';
import { useQADebugMode } from '@/hooks/useQADebugMode';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface QAActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QAActivationModal({ isOpen, onClose }: QAActivationModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const { profile } = useAuth();
  const { activateQA, canActivate } = useQADebugMode(profile?.email);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!canActivate) {
      setError('QA Mode não disponível para este usuário');
      return;
    }

    const success = activateQA(code.trim(), profile?.email);
    
    if (success) {
      toast({
        title: 'QA Mode Ativado',
        description: 'Debug bar visível. Use Ctrl+Shift+Q ou botão para desativar.',
        duration: 3000,
      });
      setCode('');
      onClose();
    } else {
      setError('Código QA inválido');
    }
  };

  const handleClose = () => {
    setCode('');
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-amber-500" />
                <span className="font-medium text-sm">Ativar QA Debug Mode</span>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {!canActivate ? (
                <div className="text-center py-4">
                  <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    QA Debug Mode não está disponível para este usuário.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Digite o código QA para ativar a Debug Bar. 
                    Sem expiração - desative manualmente quando quiser.
                  </p>
                  
                  <div>
                    <input
                      type="password"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Código QA"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      autoFocus
                    />
                    {error && (
                      <p className="mt-1 text-xs text-destructive">{error}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!code.trim()}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-muted disabled:text-muted-foreground text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Ativar QA Mode
                  </button>
                </>
              )}
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
