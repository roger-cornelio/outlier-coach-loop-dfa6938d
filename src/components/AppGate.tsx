/**
 * AppGate - BLINDAGEM DEFINITIVA
 * 
 * REGRA IMUTÁVEL: Rotas públicas são processadas PRIMEIRO,
 * antes de qualquer verificação de state/role.
 * 
 * ROTAS PÚBLICAS (sempre acessíveis):
 * - /login, /login/admin, /login/coach
 * - /coach-request, /coach-pending, /coach/definir-senha
 * 
 * ROTAS PROTEGIDAS (requerem auth + role):
 * - /coach/dashboard (requer coach)
 * - /painel-admin (requer admin)
 * - /app (requer user autenticado)
 * 
 * AppGate NÃO decide destino de coach - apenas allow/deny.
 * CoachAuth.tsx é o ÚNICO lugar autorizado a decidir fluxo.
 */

import { ReactNode } from 'react';
import { useLocation, Navigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';

interface AppGateProps {
  children: ReactNode;
}

// Rotas públicas - NUNCA bloquear, NUNCA redirecionar
const PUBLIC_ROUTES = [
  '/login',
  '/login/admin', 
  '/login/coach',
  '/coach-request',
  '/coach-pending',
  '/coach/definir-senha',
];

export function AppGate({ children }: AppGateProps) {
  const location = useLocation();
  const { state, loading, profileLoading } = useAppState();
  const pathname = location.pathname;

  console.log('[AppGate] state:', state, '| pathname:', pathname);

  // ===== REGRA 0: ROTAS PÚBLICAS - SEMPRE PERMITIR =====
  // Processado ANTES de loading/state para evitar flicker
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  
  if (isPublicRoute) {
    // Exceção: usuário já autenticado em /login → redirecionar para destino apropriado
    if (pathname === '/login' && state !== 'anon' && state !== 'loading' && !loading) {
      if (state === 'admin' || state === 'superadmin') {
        return <Navigate to="/painel-admin" replace />;
      }
      if (state === 'coach') {
        return <Navigate to="/coach/dashboard" replace />;
      }
      // Atleta autenticado
      return <Navigate to="/app" replace />;
    }
    
    // Exceção: coach já autenticado em /login/coach → dashboard
    if (pathname === '/login/coach' && state === 'coach' && !loading) {
      return <Navigate to="/coach/dashboard" replace />;
    }
    
    // Exceção: admin já autenticado em /login/admin → painel
    if (pathname === '/login/admin' && (state === 'admin' || state === 'superadmin') && !loading) {
      return <Navigate to="/painel-admin" replace />;
    }
    
    // Para TODAS as outras rotas públicas: SEMPRE renderizar children
    // Isso inclui /coach-request, /coach-pending, /coach/definir-senha
    // NÃO verificar state, NÃO redirecionar, NÃO bloquear
    return <>{children}</>;
  }

  // ===== REGRA 1: LOADING - mostrar loader apenas para rotas protegidas =====
  if (loading || profileLoading || state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // ===== REGRA 2: SUPERADMIN - acesso irrestrito =====
  if (state === 'superadmin') {
    return <>{children}</>;
  }

  // ===== REGRA 3: ROTAS PROTEGIDAS - verificar auth =====
  
  // /painel-admin - requer admin
  if (pathname.startsWith('/painel-admin')) {
    if (state === 'anon') {
      return <Navigate to="/login/admin" replace />;
    }
    if (state !== 'admin') {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
          <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl text-center max-w-md">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl text-foreground mb-4">Acesso Restrito</h1>
            <p className="text-muted-foreground mb-6">
              Você não possui permissão de administrador.
            </p>
            <Link
              to="/login/admin"
              className="inline-block w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
            >
              Voltar ao login
            </Link>
          </div>
        </div>
      );
    }
    return <>{children}</>;
  }

  // /coach/dashboard - requer coach (ÚNICA rota coach protegida)
  if (pathname === '/coach/dashboard' || pathname === '/coach') {
    if (state === 'anon') {
      return <Navigate to="/login/coach" replace />;
    }
    // Após excluir anon, restam: athlete, coach, admin (superadmin já passou)
    // Bloquear apenas athlete
    if (state === 'athlete') {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
          <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl text-center max-w-md">
            <div className="w-16 h-16 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl text-foreground mb-4">Área de Coach</h1>
            <p className="text-muted-foreground mb-6">
              Esta área é restrita para coaches.
            </p>
            <Link
              to="/login/coach"
              className="inline-block w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
            >
              Entrar como Coach
            </Link>
          </div>
        </div>
      );
    }
    // coach ou admin passam
    return <>{children}</>;
  }

  // /app - requer usuário autenticado (não coach)
  if (pathname === '/app') {
    if (state === 'anon') {
      return <Navigate to="/login" replace />;
    }
    // Coach não pode acessar app de atleta
    if (state === 'coach') {
      return <Navigate to="/coach/dashboard" replace />;
    }
    return <>{children}</>;
  }

  // Qualquer outra rota protegida não listada - redirecionar anon para login
  if (state === 'anon') {
    return <Navigate to="/login" replace />;
  }

  // ===== REGRA FINAL: Permitir acesso =====
  return <>{children}</>;
}
