/**
 * useQADebugMode - Hook para gerenciar QA Debug Mode
 * 
 * Regras:
 * 1. Só ativa em desenvolvimento (import.meta.env.DEV)
 * 2. Requer QA Code correto
 * 3. Expira após 30 minutos
 * 4. Armazena em sessionStorage para persistir apenas na sessão
 */

import { useState, useEffect, useCallback } from 'react';

const QA_STORAGE_KEY = 'QA_DEBUG';
const QA_EXPIRY_KEY = 'QA_DEBUG_EXPIRY';
const QA_TOGGLE_EVENT = 'qa-debug-toggle';
const QA_CODE = 'outlier2024qa'; // Hardcoded QA code
const EXPIRY_MINUTES = 30;

export function useQADebugMode() {
  const [isQAActive, setIsQAActive] = useState(() => checkQAActive());
  
  // Check if QA mode is active and not expired
  function checkQAActive(): boolean {
    if (typeof window === 'undefined') return false;
    
    const qaValue = sessionStorage.getItem(QA_STORAGE_KEY);
    const expiryValue = sessionStorage.getItem(QA_EXPIRY_KEY);
    
    if (qaValue !== '1' || !expiryValue) return false;
    
    const expiry = parseInt(expiryValue, 10);
    if (Date.now() > expiry) {
      // Expired - clean up
      sessionStorage.removeItem(QA_STORAGE_KEY);
      sessionStorage.removeItem(QA_EXPIRY_KEY);
      return false;
    }
    
    return true;
  }

  // Listen for toggle events
  useEffect(() => {
    const handleToggle = () => {
      setIsQAActive(checkQAActive());
    };

    window.addEventListener(QA_TOGGLE_EVENT, handleToggle);
    
    // Also check periodically for expiration
    const interval = setInterval(() => {
      if (isQAActive && !checkQAActive()) {
        setIsQAActive(false);
      }
    }, 60000); // Check every minute

    return () => {
      window.removeEventListener(QA_TOGGLE_EVENT, handleToggle);
      clearInterval(interval);
    };
  }, [isQAActive]);

  // Activate QA mode with code validation
  const activateQA = useCallback((code: string): boolean => {
    // Block in production
    if (import.meta.env.PROD) {
      console.warn('[QA Debug] Cannot activate in production');
      return false;
    }

    if (code !== QA_CODE) {
      return false;
    }

    const expiry = Date.now() + (EXPIRY_MINUTES * 60 * 1000);
    sessionStorage.setItem(QA_STORAGE_KEY, '1');
    sessionStorage.setItem(QA_EXPIRY_KEY, String(expiry));
    
    window.dispatchEvent(new CustomEvent(QA_TOGGLE_EVENT));
    return true;
  }, []);

  // Deactivate QA mode
  const deactivateQA = useCallback(() => {
    sessionStorage.removeItem(QA_STORAGE_KEY);
    sessionStorage.removeItem(QA_EXPIRY_KEY);
    window.dispatchEvent(new CustomEvent(QA_TOGGLE_EVENT));
  }, []);

  // Get remaining time in minutes
  const getRemainingMinutes = useCallback((): number => {
    const expiryValue = sessionStorage.getItem(QA_EXPIRY_KEY);
    if (!expiryValue) return 0;
    
    const expiry = parseInt(expiryValue, 10);
    const remaining = Math.max(0, Math.ceil((expiry - Date.now()) / 60000));
    return remaining;
  }, []);

  // Check if QA mode can be activated (dev/preview only)
  const canActivate = !import.meta.env.PROD;

  return {
    isQAActive,
    activateQA,
    deactivateQA,
    getRemainingMinutes,
    canActivate,
  };
}

export { QA_TOGGLE_EVENT };
