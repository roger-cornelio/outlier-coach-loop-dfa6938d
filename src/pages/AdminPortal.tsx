import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminSpreadsheet } from "@/components/AdminSpreadsheet";
import { AdminParamsEditor } from "@/components/AdminParamsEditor";
import { UserManagement } from "@/components/UserManagement";
import { CoachPerformance } from "@/components/CoachPerformance";
import { CoachApplicationsAdmin } from "@/components/CoachApplicationsAdmin";
import { AdminAllowlistManager } from "@/components/AdminAllowlistManager";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Shield } from "lucide-react";

export type AdminView = "spreadsheet" | "params" | "users" | "coachPerformance" | "coachApplications" | "allowlist";

const AdminPortal = () => {
  const [adminView, setAdminView] = useState<AdminView>("spreadsheet");
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // SECURITY: Redirect non-admins to home
  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !isAdmin) {
      navigate("/");
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Block render if not admin (while redirect happens)
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Acesso restrito</p>
        </div>
      </div>
    );
  }

  const renderAdminView = () => {
    switch (adminView) {
      case "params":
        return <AdminParamsEditor />;
      case "users":
        return <UserManagement />;
      case "coachPerformance":
        return <CoachPerformance />;
      case "coachApplications":
        return <CoachApplicationsAdmin />;
      case "allowlist":
        return <AdminAllowlistManager />;
      case "spreadsheet":
      default:
        return <AdminSpreadsheet />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)]">
      {/* Admin Header */}
      <div className="bg-primary/10 border-b border-primary/20 py-2">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary tracking-wider uppercase">
            Admin Panel
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={adminView}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-screen"
        >
          {renderAdminView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AdminPortal;
