import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminParamsEditor } from "@/components/AdminParamsEditor";
import { UserManagement } from "@/components/UserManagement";
import { ServiceQualityDashboard } from "@/components/admin/ServiceQualityDashboard";
import { CoachApplicationsAdmin } from "@/components/CoachApplicationsAdmin";
import { EventReviewAdmin } from "@/components/admin/EventReviewAdmin";


import { OutlierReferenceEditor } from "@/components/admin/OutlierReferenceEditor";
import { BenchmarkOverridesEditor } from "@/components/admin/BenchmarkOverridesEditor";
import { AthleteStatusAdmin } from "@/components/admin/AthleteStatusAdmin";
import { ClassificationAdminEditor } from "@/components/admin/ClassificationAdminEditor";
import { OutlierBenchmarksAdmin } from "@/components/admin/OutlierBenchmarksAdmin";
import { KnowledgeBaseAdmin } from "@/components/admin/KnowledgeBaseAdmin";
import { MovementPatternsAdmin } from "@/components/admin/MovementPatternsAdmin";
import { StationValenceAdmin } from "@/components/admin/StationValenceAdmin";
import { CRMAdmin } from "@/components/admin/CRMAdmin";
import { ExerciseSuggestionsAdmin } from "@/components/admin/ExerciseSuggestionsAdmin";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { BusinessMetricsDashboard } from "@/components/admin/BusinessMetricsDashboard";
import DemoLevelUp from "@/pages/DemoLevelUp";
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
  
  Activity,
  ArrowLeft,
  Dumbbell,
  Crown,
  Medal,
  Gauge,
  BookOpen,
  Calculator,
  Grid3X3,
  Contact,
  Lightbulb,
  BarChart3,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminView = "params" | "users" | "coachPerformance" | "coachApplications" | "masterBenchmarks" | "athleteStatus" | "classification" | "outlierBenchmarks" | "eventReview" | "knowledgeBase" | "movementPatterns" | "stationValence" | "demoLevelUp" | "crm" | "exerciseSuggestions" | "analytics" | "businessMetrics";

interface NavItem {
  id: AdminView;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: "businessMetrics",
    label: "Métricas",
    icon: <TrendingUp className="w-5 h-5" />,
    description: "LTV, churn, funil e conversão"
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: <BarChart3 className="w-5 h-5" />,
    description: "DAU, retenção e eventos"
  },
  {
    id: "crm",
    label: "CRM",
    icon: <Contact className="w-5 h-5" />,
    description: "Clientes e leads"
  },
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
    id: "coachPerformance", 
    label: "Qualidade", 
    icon: <Activity className="w-5 h-5" />,
    description: "Atendimento dos coaches"
  },
  { 
    id: "masterBenchmarks", 
    label: "Base de Referência", 
    icon: <Crown className="w-5 h-5" />,
    description: "Referência técnica do sistema"
  },
  {
    id: "classification",
    label: "Classificação",
    icon: <Gauge className="w-5 h-5" />,
    description: "Benchmarks elite + fatores de divisão"
  },
  {
    id: "outlierBenchmarks",
    label: "Benchmarks OUTLIER",
    icon: <Dumbbell className="w-5 h-5" />,
    description: "Treinos-teste de progressão"
  },
  { 
    id: "athleteStatus", 
    label: "Jornada", 
    icon: <Medal className="w-5 h-5" />,
    description: "Requisitos treino/benchmarks"
  },
  {
    id: "eventReview",
    label: "Provas",
    icon: <Target className="w-5 h-5" />,
    description: "Fila de revisão de provas"
  },
  {
    id: "exerciseSuggestions",
    label: "Sugestões",
    icon: <Lightbulb className="w-5 h-5" />,
    description: "Exercícios sugeridos por coaches"
  },
  {
    id: "knowledgeBase",
    label: "Base Científica",
    icon: <BookOpen className="w-5 h-5" />,
    description: "Artigos e conhecimento para IA"
  },
  {
    id: "movementPatterns",
    label: "Motor Físico",
    icon: <Calculator className="w-5 h-5" />,
    description: "Constantes biomecânicas do motor de Kcal"
  },
  {
    id: "stationValence",
    label: "Matriz Valências",
    icon: <Grid3X3 className="w-5 h-5" />,
    description: "Pesos estações vs. valências fisiológicas"
  },
  { 
    id: "params", 
    label: "Parâmetros", 
    icon: <Settings2 className="w-5 h-5" />,
    description: "Configurações do sistema"
  },
  {
    id: "demoLevelUp",
    label: "Demo Level Up",
    icon: <Shield className="w-5 h-5" />,
    description: "Simular modais de progressão"
  },
];

const AdminPortal = () => {
  const [adminView, setAdminView] = useState<AdminView>("businessMetrics");
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
        return <ServiceQualityDashboard />;
      case "coachApplications":
        return <CoachApplicationsAdmin />;
      case "masterBenchmarks":
        return (
          <div className="space-y-6">
            <OutlierReferenceEditor />
          </div>
        );
      case "outlierBenchmarks":
        return <OutlierBenchmarksAdmin />;
      case "athleteStatus":
        return <AthleteStatusAdmin />;
      case "classification":
        return <ClassificationAdminEditor />;
      case "eventReview":
        return <EventReviewAdmin />;
      case "knowledgeBase":
        return <KnowledgeBaseAdmin />;
      case "movementPatterns":
        return <MovementPatternsAdmin />;
      case "stationValence":
        return <StationValenceAdmin />;
      case "crm":
        return <CRMAdmin />;
      case "exerciseSuggestions":
        return <ExerciseSuggestionsAdmin />;
      case "demoLevelUp":
        return <DemoLevelUp />;
      case "analytics":
        return <AnalyticsDashboard />;
      case "businessMetrics":
        return <BusinessMetricsDashboard />;
      default:
        return <AthleteStatusAdmin />;
    }
  };

  const currentNavItem = navItems.find(item => item.id === adminView);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(0,0%,6%)] to-[hsl(0,0%,3%)] flex">
      {/* Mobile sidebar overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 z-40 transition-opacity md:hidden",
          !sidebarCollapsed ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarCollapsed(true)}
      />
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 h-full bg-card/50 backdrop-blur-xl border-r border-border/50 z-50 transition-all duration-300 flex flex-col",
          // Mobile: hidden when collapsed, full overlay when open
          "md:translate-x-0",
          sidebarCollapsed ? "-translate-x-full md:translate-x-0 md:w-16" : "translate-x-0 w-64"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border/50">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-display text-lg font-bold tracking-wide text-primary">
                ADMIN
                {profile?.name && <span className="text-muted-foreground font-normal text-sm ml-1">· {profile.name}</span>}
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
        <div className="flex-1 overflow-y-auto">
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
        </div>

      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 transition-all duration-300",
          // Mobile: no margin (sidebar is overlay)
          "ml-0",
          // Desktop: margin based on sidebar state
          sidebarCollapsed ? "md:ml-16" : "md:ml-64"
        )}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-14 sm:h-16 bg-background/80 backdrop-blur-lg border-b border-border/50 flex items-center px-3 sm:px-6">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors md:hidden mr-2"
          >
            <Shield className="w-5 h-5 text-primary" />
          </button>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary hidden md:block" />
            <div>
              <h1 className="font-display text-base sm:text-xl font-bold tracking-wide">
                {currentNavItem?.label.toUpperCase() || "ADMIN PANEL"}
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                {currentNavItem?.description}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="ml-auto flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-xs sm:text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </header>

        {/* Content Area */}
        <div className="p-3 sm:p-6">
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
