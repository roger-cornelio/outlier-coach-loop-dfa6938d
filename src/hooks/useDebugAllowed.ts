/**
 * useDebugAllowed - Hook para controlar acesso à Debug Bar
 * 
 * Regras:
 * 1. Owner Mode: profile.email === owner whitelist + debug flag
 * 2. QA Mode: localStorage.QA_DEBUG === '1' (dev/preview OU owner em prod)
 * 3. QA Mode mostra dados limitados/mascarados
 */

import { useMemo, useState, useEffect } from 'react';
import { useAuthSafe } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { useQADebugMode } from '@/hooks/useQADebugMode';

const OWNER_WHITELIST = ['roger.bm2016@gmail.com'];
const DEBUG_STORAGE_KEY = 'DEBUG_BAR';
const DEBUG_TOGGLE_EVENT = 'debug-bar-toggle';

export function useDebugAllowed() {
  const auth = useAuthSafe();
  const profile = auth?.profile;
  const user = auth?.user;
  const [searchParams] = useSearchParams();
  const { isQAActive, deactivateQA } = useQADebugMode(profile?.email);
  
  const [debugStorageValue, setDebugStorageValue] = useState(() => 
    typeof window !== 'undefined' ? localStorage.getItem(DEBUG_STORAGE_KEY) === '1' : false
  );

  // Listen for toggle events from DebugKeyboardToggle
  useEffect(() => {
    const handleToggle = () => {
      setDebugStorageValue(localStorage.getItem(DEBUG_STORAGE_KEY) === '1');
    };

    window.addEventListener(DEBUG_TOGGLE_EVENT, handleToggle);
    return () => window.removeEventListener(DEBUG_TOGGLE_EVENT, handleToggle);
  }, []);

  // Check if user is owner
  const isOwner = useMemo(() => {
    if (!profile?.email) return false;
    return OWNER_WHITELIST.includes(profile.email.toLowerCase());
  }, [profile?.email]);

  // Owner mode: full access with debug flag
  const isOwnerModeActive = useMemo(() => {
    if (!isOwner) return false;
    const debugParam = searchParams.get('debug') === '1';
    return debugParam || debugStorageValue;
  }, [isOwner, searchParams, debugStorageValue]);

  // Final allowed state: owner mode OR QA mode
  const isAllowed = isOwnerModeActive || isQAActive;

  // Determine mode for UI differentiation
  const debugMode: 'owner' | 'qa' | null = isOwnerModeActive ? 'owner' : isQAActive ? 'qa' : null;

  // Helper to mask sensitive data
  const maskValue = (value: string | null | undefined, visibleChars = 4): string => {
    if (!value) return '—';
    if (value.length <= visibleChars * 2) return '****';
    return `${value.slice(0, visibleChars)}...${value.slice(-visibleChars)}`;
  };

  const maskEmail = (email: string | null | undefined): string => {
    if (!email) return '—';
    const [local, domain] = email.split('@');
    if (!domain) return maskValue(email);
    const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***';
    return `${maskedLocal}@${domain}`;
  };

  return {
    isAllowed,
    debugMode,
    isOwner,
    isQAActive,
    deactivateQA,
    maskValue,
    maskEmail,
    userId: user?.id,
    userEmail: profile?.email,
  };
}
