/**
 * useDebugAllowed - Hook para controlar acesso à Debug Bar
 * 
 * Regras:
 * 1. Só permite se profile.email === owner whitelist
 * 2. Só mostra se ?debug=1 na URL OU localStorage.DEBUG_BAR === '1'
 * 3. Reage a mudanças via Ctrl+Shift+D (evento customizado)
 */

import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';

const OWNER_WHITELIST = ['roger.bm2016@gmail.com'];
const DEBUG_STORAGE_KEY = 'DEBUG_BAR';
const DEBUG_TOGGLE_EVENT = 'debug-bar-toggle';

export function useDebugAllowed() {
  const { profile, user } = useAuth();
  const [searchParams] = useSearchParams();
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

  const isAllowed = useMemo(() => {
    // Must be authenticated
    if (!profile?.email) return false;

    // Must be in owner whitelist
    const isOwner = OWNER_WHITELIST.includes(profile.email.toLowerCase());
    if (!isOwner) return false;

    // Must have debug flag enabled
    const debugParam = searchParams.get('debug') === '1';

    return debugParam || debugStorageValue;
  }, [profile?.email, searchParams, debugStorageValue]);

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
    maskValue,
    maskEmail,
    userId: user?.id,
    userEmail: profile?.email,
  };
}
