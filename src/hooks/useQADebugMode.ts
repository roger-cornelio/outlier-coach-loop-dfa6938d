/**
 * useQADebugMode - Hook para gerenciar QA Debug Mode
 * 
 * Regras:
 * 1. Persiste em localStorage (sem expiração)
 * 2. Requer QA Code correto para ativar
 * 3. Só pode ser ativado por owner (whitelist) OU em ambiente dev/preview
 * 4. Toggle manual: liga/desliga quando o usuário quiser
 */

import { useState, useEffect, useCallback } from 'react';

const QA_STORAGE_KEY = 'QA_DEBUG';
const QA_TOGGLE_EVENT = 'qa-debug-toggle';
const QA_CODE = 'outlier2024qa';
const OWNER_WHITELIST = ['roger.bm2016@gmail.com', 'roger.cornelio@capitalgrupo.com.br'];

export function useQADebugMode(userEmail?: string | null) {
  const [isQAActive, setIsQAActive] = useState(() => checkQAActive());
  
  // Check if QA mode is active
  function checkQAActive(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(QA_STORAGE_KEY) === '1';
  }

  // Check if user can activate QA mode
  const canActivate = useCallback((): boolean => {
    // Always allow in dev/preview
    if (!import.meta.env.PROD) return true;
    
    // In production, only allow whitelisted emails
    if (userEmail && OWNER_WHITELIST.includes(userEmail.toLowerCase())) {
      return true;
    }
    
    return false;
  }, [userEmail]);

  // Listen for toggle events
  useEffect(() => {
    const handleToggle = () => {
      setIsQAActive(checkQAActive());
    };

    window.addEventListener(QA_TOGGLE_EVENT, handleToggle);
    // Also listen to storage events for cross-tab sync
    window.addEventListener('storage', handleToggle);

    return () => {
      window.removeEventListener(QA_TOGGLE_EVENT, handleToggle);
      window.removeEventListener('storage', handleToggle);
    };
  }, []);

  // Activate QA mode with code validation
  const activateQA = useCallback((code: string, email?: string | null): boolean => {
    const effectiveEmail = email || userEmail;
    
    // Check if can activate
    if (!import.meta.env.PROD) {
      // Dev/preview: just validate code
    } else {
      // Production: must be whitelisted email
      if (!effectiveEmail || !OWNER_WHITELIST.includes(effectiveEmail.toLowerCase())) {
        console.warn('[QA Debug] Cannot activate: not authorized');
        return false;
      }
    }

    if (code !== QA_CODE) {
      return false;
    }

    localStorage.setItem(QA_STORAGE_KEY, '1');
    window.dispatchEvent(new CustomEvent(QA_TOGGLE_EVENT));
    return true;
  }, [userEmail]);

  // Deactivate QA mode
  const deactivateQA = useCallback(() => {
    localStorage.removeItem(QA_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(QA_TOGGLE_EVENT));
  }, []);

  return {
    isQAActive,
    activateQA,
    deactivateQA,
    canActivate: canActivate(),
  };
}

export { QA_TOGGLE_EVENT };
