import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "outlier:last_path";

function getNavigationType(): string {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.type || "navigate";
  } catch {
    return "navigate";
  }
}

export function RouteRestoreOnReload() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading: authLoading, user } = useAuth();

  // Persist last visited path (SPA)
  useEffect(() => {
    const fullPath = `${location.pathname}${location.search}`;
    sessionStorage.setItem(STORAGE_KEY, fullPath);
  }, [location.pathname, location.search]);

  // If a hard reload drops us at "/" (infra quirk), restore the last /coach path AFTER auth resolves.
  useEffect(() => {
    if (authLoading) return;

    const navType = getNavigationType();
    if (navType !== "reload") return;

    // Only restore for logged-in users
    if (!user) return;

    // Only restore when we unexpectedly landed on root
    if (location.pathname !== "/") return;

    const lastPath = sessionStorage.getItem(STORAGE_KEY);
    if (!lastPath) return;

    // Only restore coach route (requested behavior)
    if (!lastPath.startsWith("/coach")) return;

    navigate(lastPath, { replace: true });
  }, [authLoading, user, location.pathname, navigate]);

  return null;
}
