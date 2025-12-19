import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionRefreshBanner } from "@/components/SessionRefreshBanner";
import { GlobalAuthGate } from "@/components/GlobalAuthGate";
import { RouteRestoreOnReload } from "@/components/RouteRestoreOnReload";
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
          <RouteRestoreOnReload />
          <GlobalAuthGate>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/coach" element={<CoachPortal />} />
              <Route path="/admin" element={<AdminPortal />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </GlobalAuthGate>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

