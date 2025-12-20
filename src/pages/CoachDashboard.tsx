/**
 * CoachDashboard - Painel exclusivo do Coach
 * 
 * Esta página renderiza o CoachPerformance diretamente,
 * sem passar pelo fluxo de atleta (/app).
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/hooks/useAppState';
import { CoachPerformance } from '@/components/CoachPerformance';
import { Loader2 } from 'lucide-react';

export default function CoachDashboard() {
  const { state, isCoach } = useAppState();
  const navigate = useNavigate();

  // Proteção: apenas coach, admin ou superadmin podem acessar
  useEffect(() => {
    if (state === 'loading') return;
    
    // Se não é coach/admin/superadmin, redireciona para login
    if (!isCoach && state !== 'admin' && state !== 'superadmin') {
      console.log('[CoachDashboard] Acesso negado - redirecionando para /coach');
      navigate('/coach', { replace: true });
    }
  }, [state, isCoach, navigate]);

  // Loading
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Acesso negado (será redirecionado pelo useEffect)
  if (!isCoach && state !== 'admin' && state !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)]">
      <CoachPerformance />
    </div>
  );
}
