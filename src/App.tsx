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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SessionRefreshBanner />
        <BrowserRouter>
          <AppGate>
            <Routes>
              {/* Main app route (protected) */}
              <Route path="/app" element={<Index />} />
              
              {/* LOGIN ROUTES */}
              {/* /login is the ONLY user login screen */}
              <Route path="/login" element={<Auth context="user" />} />
              
              {/* /coach is the coach portal (login + status screens) */}
              <Route path="/coach" element={<CoachPortal />} />
              
              {/* /painel-admin is the admin dashboard (protected) */}
              <Route path="/painel-admin" element={<AdminPortal />} />
              
              {/* REDIRECTS - Normalize all entry points to /login */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/auth" element={<Navigate to="/login" replace />} />
              <Route path="/longin" element={<Navigate to="/login" replace />} />
              <Route path="/login/coach" element={<Navigate to="/coach" replace />} />
              <Route path="/login/admin" element={<Navigate to="/painel-admin" replace />} />
              
              {/* CATCH-ALL: 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppGate>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
