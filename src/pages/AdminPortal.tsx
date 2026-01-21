import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminParamsEditor } from "@/components/AdminParamsEditor";
import { UserManagement } from "@/components/UserManagement";
import { CoachPerformance } from "@/components/CoachPerformance";
import { CoachApplicationsAdmin } from "@/components/CoachApplicationsAdmin";
import { AdminAllowlistManager } from "@/components/AdminAllowlistManager";
import { CoachWorkoutManager } from "@/components/CoachWorkoutManager";
import { MasterBenchmarksEditor } from "@/components/admin/MasterBenchmarksEditor";
import { BenchmarkOverridesEditor } from "@/components/admin/BenchmarkOverridesEditor";
import { AthleteStatusAdmin } from "@/components/admin/AthleteStatusAdmin";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  Shield, 
  Users, 
  UserPlus, 
  Settings2, 
  Target,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Activity,
  ArrowLeft,
  Dumbbell,
  Crown,
  Medal
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminView = "params" | "users" | "coachPerformance" | "coachApplications" | "allowlist" | "workouts" | "masterBenchmarks" | "athleteStatus";

interface NavItem {
  id: AdminView;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const navItems: NavItem[] = [
  { 
    id: "users", 
    label: "Usuários", 
    icon: <Users className="w-5 h-5" />,
    description: "Gestão de usuários"
  },
  { 
    id: "coachApplications", 
    label: "Solicitações", 
    icon: <UserPlus className="w-5 h-5" />,
    description: "Aprovar coaches"
  },
  { 
    id: "workouts", 
    label: "Treinos", 
    icon: <Dumbbell className="w-5 h-5" />,
    description: "Gerenciar treinos salvos"
  },
  { 
    id: "coachPerformance", 
    label: "Performance", 
    icon: <Activity className="w-5 h-5" />,
    description: "Métricas de atletas"
  },
  { 
    id: "masterBenchmarks", 
    label: "Benchmarks", 
    icon: <Crown className="w-5 h-5" />,
    description: "Sistema de derivação"
  },
  { 
    id: "athleteStatus", 
    label: "Status Atleta", 
    icon: <Medal className="w-5 h-5" />,
    description: "Regras de nível"
  },
  { 
    id: "allowlist", 
    label: "Admins", 
    icon: <UserCog className="w-5 h-5" />,
    description: "Lista de admins"
  },
  { 
    id: "params", 
    label: "Parâmetros", 
    icon: <Settings2 className="w-5 h-5" />,
    description: "Configurações do sistema"
  },
];

const AdminPortal = () => {
  const [adminView, setAdminView] = useState<AdminView>("users");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, isAdmin, profile, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  // SECURITY: Do NOT redirect non-admins - show access denied instead
  // This prevents fallback to user flow confusion

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Redirect unauthenticated users to admin login
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login/admin", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Show loading while checking auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Block render if not admin - show access restricted, do NOT redirect to user flow
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="font-display text-2xl text-foreground mb-4">
              Acesso Restrito
            </h1>
            <p className="text-muted-foreground mb-6">
              Sua conta não possui permissão de administrador.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/login/admin");
                }}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Sair e usar outra conta
              </button>
              <Link
                to="/login"
                className="text-muted-foreground hover:text-primary text-sm transition-colors flex items-center gap-1 justify-center"
              >
                <ArrowLeft className="w-3 h-3" />
                Voltar ao login de atleta
              </Link>
            </div>
          </div>
        </motion.div>
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
      case "workouts":
        return <CoachWorkoutManager />;
      case "masterBenchmarks":
        return (
          <div className="space-y-6">
            <MasterBenchmarksEditor />
            <BenchmarkOverridesEditor />
          </div>
        );
      case "athleteStatus":
        return <AthleteStatusAdmin />;
      case "allowlist":
      default:
        return <AdminAllowlistManager />;
    }
  };

  const currentNavItem = navItems.find(item => item.id === adminView);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 h-full bg-card/50 backdrop-blur-xl border-r border-border/50 z-50 transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border/50">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-display text-lg font-bold tracking-wide text-primary">
                ADMIN
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setAdminView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200",
                adminView === item.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!sidebarCollapsed && (
                <div className="text-left">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className={cn(
                    "text-xs",
                    adminView === item.id ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {item.description}
                  </div>
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border/50">
          {!sidebarCollapsed && (
            <div className="mb-3 px-3">
              <div className="text-sm font-medium truncate">{profile?.name || profile?.email}</div>
              <div className="text-xs text-muted-foreground">Superadmin</div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors",
              sidebarCollapsed && "justify-center"
            )}
            title={sidebarCollapsed ? "Sair" : undefined}
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && <span className="text-sm">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-16 bg-background/80 backdrop-blur-lg border-b border-border/50 flex items-center px-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <h1 className="font-display text-xl font-bold tracking-wide">
                {currentNavItem?.label.toUpperCase() || "ADMIN PANEL"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {currentNavItem?.description}
              </p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={adminView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderAdminView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default AdminPortal;
