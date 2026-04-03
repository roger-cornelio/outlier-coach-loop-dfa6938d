import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Loader2, ChevronLeft, ChevronRight, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UnifiedUser, StatusFilter } from "./types";
import { computeUserStatus, computeLeadScore, statusLabels, statusColors, fmtDate } from "./utils";
import { AthleteDetailSheet } from "./AthleteDetailSheet";

const PAGE_SIZE = 30;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativo", label: "Ativos" },
  { value: "inativo", label: "Inativos" },
  { value: "vinculado", label: "Vinculados" },
  { value: "sem_coach", label: "Sem Coach" },
  { value: "suspenso", label: "Suspensos" },
];

type UserRole = "atleta" | "coach" | "admin" | "superadmin";

const roleLabels: Record<UserRole, string> = {
  atleta: "Atleta",
  coach: "Coach",
  admin: "Admin",
  superadmin: "Superadmin",
};

const roleColors: Record<UserRole, string> = {
  atleta: "bg-muted text-muted-foreground",
  coach: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  admin: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  superadmin: "bg-red-500/15 text-red-700 dark:text-red-400",
};

type RoleFilter = "todos" | UserRole;

function getCoachStatus(lastActiveAt: string | null): "ativo" | "inativo" {
  if (!lastActiveAt) return "inativo";
  const daysSince = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= 14 ? "ativo" : "inativo";
}

function getSortPriority(userRole: UserRole, status: string): number {
  if (userRole === "coach") return 0;
  if (userRole === "superadmin" || userRole === "admin") return 1;
  if (status === "inativo") return 2;
  return 3;
}

export function VisaoGeralTab() {
  const [allUsers, setAllUsers] = useState<(UnifiedUser & { userRole: UserRole; coachScore: number | null })[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("todos");
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UnifiedUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<{ userId: string; name: string } | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, coachLinksRes, rolesRes, coachScoresRes] = await Promise.all([
        supabase.from("profiles").select("id, user_id, name, email, sexo, idade, peso, altura, training_level, session_duration, first_setup_completed, status, created_at, last_active_at, coach_id, onboarding_experience, onboarding_goal, onboarding_target_race, unavailable_equipment, equipment_notes").order("created_at", { ascending: false }),
        supabase.from("coach_athletes").select("athlete_id, coach_id, created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("coach_scores").select("coach_id, composite_score, active_athletes_count, admin_rating"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      const profiles = profilesRes.data ?? [];
      const coachLinks = coachLinksRes.data ?? [];
      const userRoles = rolesRes.data ?? [];
      const coachScores = coachScoresRes.data ?? [];

      const scoreMap = new Map<string, number>();
      coachScores.forEach(s => scoreMap.set(s.coach_id, s.composite_score ?? 0));

      const roleMap = new Map<string, UserRole>();
      for (const ur of userRoles) {
        const current = roleMap.get(ur.user_id);
        const priority: Record<string, number> = { superadmin: 4, admin: 3, coach: 2, user: 1 };
        const newPriority = priority[ur.role] ?? 0;
        const currentPriority = current ? (priority[current === "atleta" ? "user" : current] ?? 0) : 0;
        if (newPriority > currentPriority) {
          roleMap.set(ur.user_id, ur.role === "user" ? "atleta" : ur.role as UserRole);
        }
      }

      const coachIds = [...new Set(coachLinks.map(l => l.coach_id))];
      let coachMap = new Map<string, { name: string; email: string }>();
      if (coachIds.length > 0) {
        const { data: coachProfiles } = await supabase.from("profiles").select("user_id, name, email").in("user_id", coachIds);
        (coachProfiles ?? []).forEach(p => coachMap.set(p.user_id, { name: p.name || "—", email: p.email || "" }));
      }

      const linkMap = new Map<string, { coach_id: string; created_at: string }>();
      coachLinks.forEach(l => linkMap.set(l.athlete_id, { coach_id: l.coach_id, created_at: l.created_at }));

      const unified = profiles.map(p => {
        const link = linkMap.get(p.user_id);
        const coach = link ? coachMap.get(link.coach_id) : null;
        const userRole = roleMap.get(p.user_id) ?? "atleta";

        const computedStatus = userRole === "coach"
          ? getCoachStatus(p.last_active_at)
          : computeUserStatus(p.last_active_at, link?.coach_id ?? p.coach_id, p.status);

        return {
          ...p,
          coach_id: link?.coach_id ?? p.coach_id,
          coach_name: coach?.name ?? null,
          coach_email: coach?.email ?? null,
          coach_linked_at: link?.created_at ?? null,
          computedStatus,
          leadScore: computeLeadScore(0, p.first_setup_completed, p.last_active_at, false),
          userRole,
          coachScore: userRole === "coach" ? (scoreMap.get(p.user_id) ?? 0) : null,
        };
      });

      unified.sort((a, b) => {
        const pa = getSortPriority(a.userRole, a.computedStatus);
        const pb = getSortPriority(b.userRole, b.computedStatus);
        if (pa !== pb) return pa - pb;
        // Within coaches, sort by score ascending (worst first)
        if (a.userRole === "coach" && b.userRole === "coach") {
          return (a.coachScore ?? 0) - (b.coachScore ?? 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setAllUsers(unified);
    } catch (err: any) {
      toast.error("Erro ao carregar usuários: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeactivateCoach = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      const { error } = await supabase.rpc("deactivate_coach", { _coach_user_id: deactivateTarget.userId });
      if (error) throw error;
      toast.success(`Coach ${deactivateTarget.name} desativado com sucesso`);
      setDeactivateTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error("Erro ao desativar coach: " + err.message);
    } finally {
      setDeactivating(false);
    }
  };

  const filtered = allUsers.filter(u => {
    if (statusFilter !== "todos" && u.computedStatus !== statusFilter) return false;
    if (roleFilter !== "todos" && u.userRole !== roleFilter) return false;
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.toLowerCase();
      if (!u.name?.toLowerCase().includes(term) && !u.email?.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const coachAthleteCount = new Map<string, number>();
  allUsers.forEach(u => {
    if (u.coach_id) {
      coachAthleteCount.set(u.coach_id, (coachAthleteCount.get(u.coach_id) || 0) + 1);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map(f => (
          <Button key={f.value} variant={statusFilter === f.value ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter(f.value); setPage(0); }}>
            {f.label}
            {f.value !== "todos" && <span className="ml-1 text-xs opacity-70">({allUsers.filter(u => u.computedStatus === f.value).length})</span>}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center mr-1">Tipo:</span>
        {(["todos", "atleta", "coach", "admin", "superadmin"] as RoleFilter[]).map(r => (
          <Button key={r} variant={roleFilter === r ? "default" : "outline"} size="sm" onClick={() => { setRoleFilter(r); setPage(0); }}>
            {r === "todos" ? "Todos" : roleLabels[r]}
            {r !== "todos" && <span className="ml-1 text-xs opacity-70">({allUsers.filter(u => u.userRole === r).length})</span>}
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {filtered.length.toLocaleString("pt-BR")} usuário{filtered.length !== 1 ? "s" : ""}
        </p>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Coach</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Setup</TableHead>
              <TableHead>Último Acesso</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Nenhum usuário encontrado.</TableCell></TableRow>
            ) : (
              paged.map(u => (
                <TableRow key={u.id} className="cursor-pointer" onClick={() => { setSelectedUser(u); setSheetOpen(true); }}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{u.name || "Sem nome"}</span>
                      <p className="text-xs text-muted-foreground">{u.email || "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[u.userRole]}>{roleLabels[u.userRole]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[u.computedStatus]}>{statusLabels[u.computedStatus]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {u.userRole === "coach"
                      ? `${coachAthleteCount.get(u.user_id) || 0} atleta(s)`
                      : u.coach_name || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {u.userRole === "coach"
                      ? <Badge className={
                          (u.coachScore ?? 0) >= 7 ? "bg-green-500/15 text-green-700 dark:text-green-400"
                          : (u.coachScore ?? 0) >= 4 ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                          : "bg-red-500/15 text-red-700 dark:text-red-400"
                        }>
                          {(u.coachScore ?? 0).toFixed(1)} pts
                        </Badge>
                      : u.training_level || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{u.first_setup_completed ? "✅" : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.last_active_at ? fmtDate(u.last_active_at) : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(u.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {u.userRole === "coach" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeactivateTarget({ userId: u.user_id, name: u.name || "Coach" });
                        }}
                      >
                        <ShieldOff className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4 mr-1" /> Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próximo <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      )}

      <AthleteDetailSheet user={selectedUser} open={sheetOpen} onOpenChange={setSheetOpen} />

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Coach</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar <strong>{deactivateTarget?.name}</strong>? Isso irá:
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>Remover a permissão de coach</li>
                <li>Desvincular todos os atletas</li>
                <li>Marcar a aplicação como desativada</li>
              </ul>
              Esta ação não pode ser desfeita facilmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivateCoach} disabled={deactivating} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deactivating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
