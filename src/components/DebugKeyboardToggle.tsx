/**
 * DebugKeyboardToggle - Global keyboard shortcuts for debug
 * 
 * Ctrl+Shift+D: Toggle localStorage.DEBUG_BAR for owner only
 * Ctrl+Shift+Q: Open QA activation modal (dev/preview only)
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { QAActivationModal } from '@/components/QAActivationModal';

const OWNER_EMAIL = 'roger.bm2016@gmail.com';
const DEBUG_STORAGE_KEY = 'DEBUG_BAR';
const DEBUG_TOGGLE_EVENT = 'debug-bar-toggle';

export function DebugKeyboardToggle() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [showQAModal, setShowQAModal] = useState(false);

  useEffect(() => {
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

      // Ctrl+Shift+Q - QA modal (dev/preview only)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        
        // Only in dev/preview
        if (import.meta.env.PROD) {
          return;
        }

        setShowQAModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile?.email, toast]);

  return (
    <QAActivationModal 
      isOpen={showQAModal} 
      onClose={() => setShowQAModal(false)} 
    />
  );
}

export { DEBUG_TOGGLE_EVENT };
