/**
 * DebugKeyboardToggle - Global keyboard shortcuts for debug
 * 
 * Ctrl+Shift+D: Toggle localStorage.DEBUG_BAR for owner only
 * Ctrl+Shift+Q: Toggle QA mode - if inactive opens modal, if active toggles visibility
 */

import { useEffect, useState } from 'react';
import { useAuthSafe } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { QAActivationModal } from '@/components/QAActivationModal';
import { useQADebugMode } from '@/hooks/useQADebugMode';

const OWNER_EMAIL = 'roger.bm2016@gmail.com';
const DEBUG_STORAGE_KEY = 'DEBUG_BAR';
const DEBUG_TOGGLE_EVENT = 'debug-bar-toggle';

export function DebugKeyboardToggle() {
  const auth = useAuthSafe();
  const profile = auth?.profile;
  const { toast } = useToast();
  const [showQAModal, setShowQAModal] = useState(false);
  
  const { isQAActive, deactivateQA, canActivate } = useQADebugMode(profile?.email);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D - Owner debug toggle
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();

        if (!profile?.email || profile.email.toLowerCase() !== OWNER_EMAIL) {
          return;
        }

        const currentValue = localStorage.getItem(DEBUG_STORAGE_KEY);
        
        if (currentValue === '1') {
          localStorage.removeItem(DEBUG_STORAGE_KEY);
          toast({ title: "Debug OFF", description: "Debug bar desativada", duration: 2000 });
        } else {
          localStorage.setItem(DEBUG_STORAGE_KEY, '1');
          toast({ title: "Debug ON", description: "Debug bar ativada", duration: 2000 });
        }

        window.dispatchEvent(new CustomEvent(DEBUG_TOGGLE_EVENT));
      }

      // Ctrl+Shift+Q - QA toggle
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        
        if (!canActivate) {
          toast({ title: "QA Mode indisponível", description: "Não autorizado para este ambiente/usuário", duration: 2000 });
          return;
        }

        if (isQAActive) {
          deactivateQA();
          toast({ title: "QA Mode Desativado", description: "Debug bar QA removida", duration: 2000 });
        } else {
          setShowQAModal(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile?.email, toast, isQAActive, deactivateQA, canActivate]);

  return (
    <QAActivationModal 
      isOpen={showQAModal} 
      onClose={() => setShowQAModal(false)} 
    />
  );
}

export { DEBUG_TOGGLE_EVENT };
