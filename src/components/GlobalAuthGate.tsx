import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function GlobalAuthGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { loading: authLoading } = useAuth();

  const isCoachPath = location.pathname.startsWith("/coach");

  // CRITICAL: While auth is resolving, DO NOT render routes that may redirect.
  // This prevents global guards from navigating away before session/user is known.
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {isCoachPath ? "Carregando status..." : "Carregando..."}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
