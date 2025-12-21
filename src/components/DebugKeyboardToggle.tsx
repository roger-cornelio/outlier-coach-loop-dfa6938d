/**
 * DebugKeyboardToggle - Global keyboard shortcuts for debug
 * 
 * Ctrl+Shift+D: Toggle localStorage.DEBUG_BAR for owner only
 * Ctrl+Shift+Q: Toggle QA mode - if inactive opens modal, if active toggles visibility
 * 
 * NOTA: Desativado em /app (dashboard do atleta) para evitar re-renders
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { QAActivationModal } from '@/components/QAActivationModal';
import { useQADebugMode } from '@/hooks/useQADebugMode';

const OWNER_EMAIL = 'roger.bm2016@gmail.com';
const DEBUG_STORAGE_KEY = 'DEBUG_BAR';
const DEBUG_TOGGLE_EVENT = 'debug-bar-toggle';

export function DebugKeyboardToggle() {
  const location = useLocation();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [showQAModal, setShowQAModal] = useState(false);
  
  // Desativar em rotas de atleta para evitar re-renders
  const isAthleteRoute = location.pathname === '/app' || location.pathname.startsWith('/app/');
  
  // Só chamar useQADebugMode se NÃO for rota de atleta
  const qaMode = useQADebugMode(isAthleteRoute ? null : profile?.email);
  const { isQAActive, deactivateQA, canActivate } = isAthleteRoute 
    ? { isQAActive: false, deactivateQA: () => {}, canActivate: false }
    : qaMode;

  useEffect(() => {
    // Não registrar atalhos em rotas de atleta
    if (isAthleteRoute) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D - Owner debug toggle
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();

        // Only allow for owner
        if (!profile?.email || profile.email.toLowerCase() !== OWNER_EMAIL) {
          return;
        }

        const currentValue = localStorage.getItem(DEBUG_STORAGE_KEY);
        
        if (currentValue === '1') {
          localStorage.removeItem(DEBUG_STORAGE_KEY);
          toast({
            title: "Debug OFF",
            description: "Debug bar desativada",
            duration: 2000,
          });
        } else {
          localStorage.setItem(DEBUG_STORAGE_KEY, '1');
          toast({
            title: "Debug ON",
            description: "Debug bar ativada",
            duration: 2000,
          });
        }

        // Dispatch custom event to notify useDebugAllowed
        window.dispatchEvent(new CustomEvent(DEBUG_TOGGLE_EVENT));
      }

      // Ctrl+Shift+Q - QA toggle
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        
        // Check if user can activate
        if (!canActivate) {
          toast({
            title: "QA Mode indisponível",
            description: "Não autorizado para este ambiente/usuário",
            duration: 2000,
          });
          return;
        }

        if (isQAActive) {
          // If QA is active, deactivate it
          deactivateQA();
          toast({
            title: "QA Mode Desativado",
            description: "Debug bar QA removida",
            duration: 2000,
          });
        } else {
          // If QA is inactive, open activation modal
          setShowQAModal(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile?.email, toast, isQAActive, deactivateQA, canActivate, isAthleteRoute]);

  // Não renderizar modal em rotas de atleta
  if (isAthleteRoute) return null;

  return (
    <QAActivationModal 
      isOpen={showQAModal} 
      onClose={() => setShowQAModal(false)} 
    />
  );
}

export { DEBUG_TOGGLE_EVENT };
