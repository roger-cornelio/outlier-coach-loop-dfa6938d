import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SessionRefreshBanner } from "@/components/SessionRefreshBanner";
import { AppGate } from "@/components/AppGate";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CoachPortal from "./pages/CoachPortal";
import AdminPortal from "./pages/AdminPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * App component with provider tree
 * 
 * CRITICAL: Provider order matters!
 * 1. QueryClientProvider (external, no deps)
 * 2. BrowserRouter (routing, no auth deps)
 * 3. AuthProvider (auth context - MUST wrap everything that uses useAuth)
 * 4. TooltipProvider (UI utils)
 * 5. AppGate + Routes (uses useAuth via useAppState)
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SessionRefreshBanner />
          <AppGate>
            <Routes>
              {/* Main app route (protected) */}
              <Route path="/app" element={<Index />} />
              
              {/* === LOGIN ROUTES (3 entry points) === */}
              {/* USER login */}
              <Route path="/login" element={<Auth context="user" />} />
              
              {/* ADMIN login - shows admin login screen, then goes to /painel-admin */}
              <Route path="/login/admin" element={<Auth context="admin" />} />
              
              {/* COACH portal - has its own login + status screens */}
              <Route path="/coach" element={<CoachPortal />} />
              
              {/* === PROTECTED DASHBOARDS === */}
              {/* Admin dashboard (requires admin role) */}
              <Route path="/painel-admin" element={<AdminPortal />} />
              
              {/* === REDIRECTS - Normalize legacy routes to /login === */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/auth" element={<Navigate to="/login" replace />} />
              <Route path="/longin" element={<Navigate to="/login" replace />} />
              <Route path="/login/coach" element={<Navigate to="/coach" replace />} />
              
              {/* CATCH-ALL: 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppGate>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
