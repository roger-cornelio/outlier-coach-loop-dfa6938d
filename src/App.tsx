import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SessionRefreshBanner } from "@/components/SessionRefreshBanner";
import { AppGate } from "@/components/AppGate";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CoachAuth from "./pages/CoachAuth";
import CoachDashboard from "./pages/CoachDashboard";
import AdminPortal from "./pages/AdminPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * App component with provider tree
 *
 * CRITICAL: Provider order matters!
 * 1. QueryClientProvider (external, no deps)
 * 2. BrowserRouter (routing)
 * 3. TooltipProvider (UI utils)
 * 4. AppGate + Routes (uses auth via useAppState)
 *
 * NOTE: AuthProvider lives in src/main.tsx and wraps the entire app.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SessionRefreshBanner />
        <AppGate>
          <Routes>
            {/* Main app route (protected) */}
            <Route path="/app" element={<Index />} />

            {/* === LOGIN ROUTES === */}
            {/* USER login */}
            <Route path="/login" element={<Auth context="user" />} />

            {/* ADMIN login - shows admin login screen, then goes to /painel-admin */}
            <Route path="/login/admin" element={<Auth context="admin" />} />

            {/* COACH login - fluxo único e linear */}
            <Route path="/login/coach" element={<CoachAuth />} />

            {/* COACH dashboard - rota oficial do painel do coach */}
            <Route path="/coach/dashboard" element={<CoachDashboard />} />
            
            {/* /coach redireciona para /coach/dashboard automaticamente */}
            <Route path="/coach" element={<Navigate to="/coach/dashboard" replace />} />

            {/* === PROTECTED DASHBOARDS === */}
            {/* Admin dashboard (requires admin role) */}
            <Route path="/painel-admin" element={<AdminPortal />} />

            {/* === REDIRECTS - Normalize legacy routes to /login === */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/auth" element={<Navigate to="/login" replace />} />
            <Route path="/longin" element={<Navigate to="/login" replace />} />

            {/* CATCH-ALL: 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppGate>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);


export default App;
