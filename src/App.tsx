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
import CoachSetPassword from "./pages/CoachSetPassword";
import CoachPending from "./pages/CoachPending";
import CoachRequest from "./pages/CoachRequest";
import CoachDashboard from "./pages/CoachDashboard";
import AdminPortal from "./pages/AdminPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
            <Route path="/login" element={<Auth context="user" />} />
            <Route path="/login/admin" element={<Auth context="admin" />} />
            <Route path="/login/coach" element={<CoachAuth />} />

            {/* === COACH ROUTES === */}
            <Route path="/coach/definir-senha" element={<CoachSetPassword />} />
            <Route path="/coach/dashboard" element={<CoachDashboard />} />
            <Route path="/coach" element={<Navigate to="/coach/dashboard" replace />} />
            <Route path="/coach-pending" element={<CoachPending />} />
            <Route path="/coach-request" element={<CoachRequest />} />

            {/* === PROTECTED DASHBOARDS === */}
            <Route path="/painel-admin" element={<AdminPortal />} />

            {/* === REDIRECTS === */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/auth" element={<Navigate to="/login" replace />} />
            <Route path="/longin" element={<Navigate to="/login" replace />} />

            {/* CATCH-ALL */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppGate>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
