/**
 * useLogout - Hook de logout global com reset completo
 * 
 * REGRAS:
 * 1. Chama supabase.auth.signOut()
 * 2. Limpa todo o state local (stores, caches)
 * 3. Força reload completo da página para garantir sessão anônima
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOutlierStore } from '@/store/outlierStore';

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const resetToDefaults = useOutlierStore((state) => state.resetToDefaults);

  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      console.log('[useLogout] Iniciando logout...');
      
      // STEP 1: Sign out do Supabase
      await supabase.auth.signOut();
      console.log('[useLogout] supabase.auth.signOut() concluído');
      
      // STEP 2: Reset de todos os stores
      resetToDefaults();
      console.log('[useLogout] Store resetado');
      
      // STEP 3: Limpar localStorage relacionado a auth (opcional, Supabase já faz isso)
      // Mas garantimos limpeza extra
      const keysToRemove = Object.keys(localStorage).filter(
        key => key.includes('supabase') || key.includes('auth') || key.includes('session')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('[useLogout] localStorage limpo');
      
      // STEP 4: Reload forçado para garantir sessão anônima
      // Isso garante que o Preview do Lovable fique em estado anônimo
      console.log('[useLogout] Redirecionando com reload forçado...');
      window.location.href = '/';
      
    } catch (error) {
      console.error('[useLogout] Erro durante logout:', error);
      // Mesmo com erro, força reload para garantir estado limpo
      window.location.href = '/';
    }
  }, [isLoggingOut, resetToDefaults]);

  return { logout, isLoggingOut };
}
