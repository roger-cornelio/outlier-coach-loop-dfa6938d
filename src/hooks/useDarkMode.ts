/**
 * useDarkMode
 * 
 * Gerencia o modo escuro com persistência no localStorage.
 * Respeita preferência do sistema como default.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

function getStorageKey(userId?: string) {
  return userId ? `outlier_dark_mode_${userId}` : 'outlier_dark_mode';
}

export function useDarkMode() {
  const { user } = useAuth();
  const storageKey = getStorageKey(user?.id);

  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return stored === 'true';
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(storageKey, String(isDark));
    } catch {}
  }, [isDark, storageKey]);

  const toggle = useCallback(() => setIsDark((prev) => !prev), []);

  return { isDark, toggle };
}
