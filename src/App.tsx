import { useEffect } from "react";
import { initAutoFlush } from "@/lib/offlineQueue";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SessionRefreshBanner } from "@/components/SessionRefreshBanner";
import { AppGate } from "@/components/AppGate";
import { DebugKeyboardToggle } from "@/components/DebugKeyboardToggle";
import { GlobalDebugBar } from "@/components/GlobalDebugBar";
import { SuperadminBadge } from "@/components/SuperadminBadge";
import { OfflineQueueIndicator } from "@/components/OfflineQueueIndicator";
import { useParamsSync } from "@/hooks/useParamsSync";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CoachAuth from "./pages/CoachAuth";
import CoachSetPassword from "./pages/CoachSetPassword";
import CoachResetPassword from "./pages/CoachResetPassword";
import CoachPending from "./pages/CoachPending";
import CoachRequest from "./pages/CoachRequest";
import CoachDashboard from "./pages/CoachDashboard";
import AdminPortal from "./pages/AdminPortal";
import Nutricao from "./pages/Nutricao";
import MedicinaDoEsporte from "./pages/MedicinaDoEsporte";
import ProvaAlvo from "./pages/ProvaAlvo";
import ImportarProva from "./pages/ImportarProva";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import DiagnosticoGratuito from "./pages/DiagnosticoGratuito";

const queryClient = new QueryClient();

const LAST_ROUTE_KEY = "outlier_last_route";

const EXCLUDED_LAST_ROUTES = new Set([
  "/",
  "/auth",
  "/longin",
  "/login",
  "/login/admin",
  "/login/coach",
  "/coach-request",
  "/coach-pending",
  "/coach/definir-senha",
  "/coach/redefinir-senha",
  "/coach",
  "/diagnostico-gratuito",
]);

function shouldPersistLastRoute(pathname: string) {
  if (EXCLUDED_LAST_ROUTES.has(pathname)) return false;
  if (pathname.startsWith("/login")) return false;
  return true;
}

function LastRoutePersistor() {
  const location = useLocation();

  useEffect(() => {
    if (!shouldPersistLastRoute(location.pathname)) return;

    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    try {
      localStorage.setItem(LAST_ROUTE_KEY, fullPath);
    } catch {
      // silent
    }
  }, [location.pathname, location.search, location.hash]);

  return null;
}

function ParamsSyncProvider({ children }: { children: React.ReactNode }) {
  useParamsSync();
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <LastRoutePersistor />
      <TooltipProvider>
        <AuthProvider>
          <ParamsSyncProvider>
          <Toaster />
          <Sonner />
          <SessionRefreshBanner />
          <DebugKeyboardToggle />
          <ErrorBoundary fallbackTitle="Algo deu errado">
          <AppGate>
            <Routes>
              {/* Main app route (protected) */}
              <Route path="/app" element={<Index />} />

              {/* === LOGIN ROUTES === */}
              <Route path="/login" element={<Auth context="user" />} />
              <Route path="/login/admin" element={<Auth context="admin" />} />
              <Route path="/login/coach" element={<CoachAuth />} />

              {/* === COACH ROUTES === */}
              <Route path="/coach/definir-senha" element={<CoachSetPassword />} />
              <Route path="/coach/redefinir-senha" element={<CoachResetPassword />} />
              <Route path="/coach/dashboard" element={<CoachDashboard />} />
              <Route path="/coach" element={<Navigate to="/coach/dashboard" replace />} />
              <Route path="/coach-pending" element={<CoachPending />} />
              <Route path="/coach-request" element={<CoachRequest />} />

              {/* === PROTECTED DASHBOARDS === */}
              <Route path="/painel-admin" element={<AdminPortal />} />
              <Route path="/nutricao" element={<Nutricao />} />
              <Route path="/medicina-do-esporte" element={<MedicinaDoEsporte />} />
              <Route path="/prova-alvo" element={<ProvaAlvo />} />
              <Route path="/importar-prova" element={<ImportarProva />} />
              

              {/* === PUBLIC PAGES === */}
              <Route path="/diagnostico-gratuito" element={<DiagnosticoGratuito />} />

              {/* === REDIRECTS === */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Navigate to="/login" replace />} />
              <Route path="/longin" element={<Navigate to="/login" replace />} />

              {/* CATCH-ALL */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppGate>
          </ErrorBoundary>
          
          {/* Global Debug Bar - rendered OUTSIDE AppGate, at root level */}
          <GlobalDebugBar />
          <SuperadminBadge />
          </ParamsSyncProvider>
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
