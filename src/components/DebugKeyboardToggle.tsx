/**
 * DebugKeyboardToggle - Global keyboard shortcut for debug toggle
 * 
 * Ctrl+Shift+D toggles localStorage.DEBUG_BAR for owner only
 * Works on any route when authenticated as owner
 */

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const OWNER_EMAIL = 'roger.bm2016@gmail.com';
const DEBUG_STORAGE_KEY = 'DEBUG_BAR';
const DEBUG_TOGGLE_EVENT = 'debug-bar-toggle';

export function DebugKeyboardToggle() {
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile?.email, toast]);

  return null;
}

export { DEBUG_TOGGLE_EVENT };
