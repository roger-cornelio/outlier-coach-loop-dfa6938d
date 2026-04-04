import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Loader2, ExternalLink, Trash2, MessageCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DiagnosticLeadRow } from "./types";
import { fmtDate } from "./utils";

interface ExtendedLeadRow extends DiagnosticLeadRow {
  telefone?: string | null;
  total_time_seconds?: number | null;
  notified?: boolean;
}

function formatTime(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function isRecentLead(createdAt: string): boolean {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  return new Date(createdAt).getTime() > twoHoursAgo;
}

export function LeadsDiagnosticoTab() {
  const [rows, setRows] = useState<ExtendedLeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ExtendedLeadRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: leads, error } = await supabase
        .from("diagnostic_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!leads || leads.length === 0) { setRows([]); return; }

      const userIds = [...new Set(leads.map(l => l.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

      setRows(leads.map(l => {
        const prof = profileMap.get(l.user_id);
        return { ...l, profile_name: prof?.name ?? null, profile_email: prof?.email ?? null } as ExtendedLeadRow;
      }));
    } catch (err: any) {
      toast.error("Erro ao carregar leads: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("diagnostic_leads").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Lead removido com sucesso");
      setRows(prev => prev.filter(r => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error("Erro ao apagar lead: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = debouncedSearch.trim()
    ? rows.filter(r => {
        const term = debouncedSearch.toLowerCase();
        return r.athlete_name_searched.toLowerCase().includes(term) || r.profile_name?.toLowerCase().includes(term) || r.event_name?.toLowerCase().includes(term);
      })
    : rows;

  const convertedCount = rows.filter(r => r.converted).length;
  const recentCount = rows.filter(r => isRecentLead(r.created_at)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {rows.length} lead{rows.length !== 1 ? "s" : ""} · {convertedCount} convertido{convertedCount !== 1 ? "s" : ""}
        </p>
        {recentCount > 0 && (
          <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 animate-pulse">
            🔥 {recentCount} novo{recentCount !== 1 ? "s" : ""} (últimas 2h)
          </Badge>
        )}
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou evento..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome Buscado</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Divisão</TableHead>
              <TableHead>Tempo</TableHead>
              <TableHead>Converteu</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">Nenhum lead encontrado.</TableCell></TableRow>
            ) : (
              filtered.map(r => {
                const isNew = isRecentLead(r.created_at);
                const digits = r.telefone ? cleanPhone(r.telefone) : "";
                const whatsappNumber = digits.startsWith("55") ? digits : `55${digits}`;
                
                return (
                  <TableRow key={r.id} className={isNew ? "bg-orange-500/5" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isNew && <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Novo (últimas 2h)" />}
                        {r.athlete_name_searched}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.profile_name ? (
                        <div>
                          <span className="text-sm">{r.profile_name}</span>
                          <p className="text-xs text-muted-foreground">{r.profile_email}</p>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {digits.length >= 10 ? (
                        <a
                          href={`https://wa.me/${whatsappNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline text-sm font-medium"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          {r.telefone}
                        </a>
                      ) : r.telefone ? (
                        <span className="text-sm">{r.telefone}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{r.event_name || "—"}</TableCell>
                    <TableCell className="text-sm">{r.division || "—"}</TableCell>
                    <TableCell>
                      {r.total_time_seconds ? (
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {formatTime(r.total_time_seconds)}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={r.converted ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}>
                        {r.converted ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.result_url ? (
                        <a href={r.result_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{fmtDate(r.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(r)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar o lead "{deleteTarget?.athlete_name_searched}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
