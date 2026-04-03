import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, ExternalLink, Loader2, ChevronLeft, ChevronRight, Users, UserPlus, LayoutDashboard, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VisaoGeralTab } from "./crm/VisaoGeralTab";
import { LeadsDiagnosticoTab } from "./crm/LeadsDiagnosticoTab";

const PAGE_SIZE = 30;

function applyPhoneMask(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const formSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(100),
  telefone: z.string().trim().min(14, "Telefone incompleto").max(15).refine((v) => v.replace(/\D/g, "").length >= 10, "Telefone inválido"),
  instagram: z.string().trim().max(60).optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface CrmCliente {
  id: string; nome: string; telefone: string; instagram: string | null; created_at: string;
}

interface DuplaRow {
  id: string; nome: string; categoria: string; race_date: string; race_type: string;
  partner_name: string | null; partner_phone: string | null; partner_instagram: string | null;
  participation_type: string; athlete_name: string; athlete_email: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Clientes Tab (kept) ──
function ClientesTab() {
  const [rows, setRows] = useState<CrmCliente[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      let query = supabase.from("crm_clientes").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
      if (debouncedSearch.trim()) {
        const term = `%${debouncedSearch.trim()}%`;
        query = query.or(`nome.ilike.${term},telefone.ilike.${term}`);
      }
      const { data, count, error } = await query;
      if (error) throw error;
      setRows((data as CrmCliente[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: any) { toast.error("Erro ao carregar clientes: " + err.message); }
    finally { setLoading(false); }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { nome: "", telefone: "", instagram: "" } });

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const instagram = values.instagram ? values.instagram.replace(/^@/, "").trim() || null : null;
      const { error } = await supabase.from("crm_clientes").insert({ nome: values.nome.trim(), telefone: values.telefone.trim(), instagram });
      if (error) throw error;
      toast.success("Cliente cadastrado!");
      form.reset();
      setDialogOpen(false);
      fetchData();
    } catch (err: any) { toast.error("Erro ao salvar: " + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{totalCount.toLocaleString("pt-BR")} registro{totalCount !== 1 ? "s" : ""}</p>
        <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Novo Cadastro</Button>
      </div>
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Telefone</TableHead><TableHead>Instagram</TableHead><TableHead className="text-right">Cadastro</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            : rows.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Nenhum cliente encontrado.</TableCell></TableRow>
            : rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell>{r.telefone}</TableCell>
                <TableCell>{r.instagram ? <a href={`https://instagram.com/${r.instagram}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">@{r.instagram} <ExternalLink className="w-3 h-3" /></a> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{fmtDate(r.created_at)}</TableCell>
              </TableRow>
            ))}
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Cliente / Lead</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="crm-nome">Nome *</Label><Input id="crm-nome" placeholder="Nome completo" {...form.register("nome")} />{form.formState.errors.nome && <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>}</div>
            <div className="space-y-1.5"><Label htmlFor="crm-telefone">Telefone *</Label><Input id="crm-telefone" placeholder="(00) 00000-0000" value={form.watch("telefone")} onChange={(e) => form.setValue("telefone", applyPhoneMask(e.target.value), { shouldValidate: true })} />{form.formState.errors.telefone && <p className="text-xs text-destructive">{form.formState.errors.telefone.message}</p>}</div>
            <div className="space-y-1.5"><Label htmlFor="crm-instagram">Instagram</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span><Input id="crm-instagram" placeholder="usuario" className="pl-8" {...form.register("instagram")} /></div></div>
            <DialogFooter><Button type="submit" disabled={saving} className="w-full sm:w-auto">{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Duplas Tab (kept) ──
function DuplasTab() {
  const [rows, setRows] = useState<DuplaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 300); return () => clearTimeout(t); }, [search]);

  const fetchDuplas = useCallback(async () => {
    setLoading(true);
    try {
      const { data: races, error } = await supabase.from("athlete_races").select("id, nome, categoria, race_date, race_type, partner_name, partner_phone, partner_instagram, participation_type, user_id").eq("participation_type", "DUPLA").order("race_date", { ascending: true });
      if (error) throw error;
      if (!races || races.length === 0) { setRows([]); return; }
      const userIds = [...new Set(races.map(r => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, email").in("user_id", userIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));
      setRows(races.map(r => { const prof = profileMap.get(r.user_id); return { ...r, athlete_name: prof?.name || "—", athlete_email: prof?.email || "—" }; }));
    } catch (err: any) { toast.error("Erro ao carregar duplas: " + err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDuplas(); }, [fetchDuplas]);

  const filtered = debouncedSearch.trim() ? rows.filter(r => { const term = debouncedSearch.toLowerCase(); return r.athlete_name.toLowerCase().includes(term) || r.partner_name?.toLowerCase().includes(term) || r.nome.toLowerCase().includes(term); }) : rows;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{filtered.length} dupla{filtered.length !== 1 ? "s" : ""} cadastrada{filtered.length !== 1 ? "s" : ""}</p>
      <div className="relative w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar por atleta, parceiro ou prova..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Atleta</TableHead><TableHead>Parceiro(a)</TableHead><TableHead>Tel. Parceiro</TableHead><TableHead>Insta Parceiro</TableHead><TableHead>Prova</TableHead><TableHead>Tipo</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Data</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={8} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Nenhuma dupla encontrada.</TableCell></TableRow>
            : filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell><div><span className="font-medium">{r.athlete_name}</span><p className="text-xs text-muted-foreground">{r.athlete_email}</p></div></TableCell>
                <TableCell className="font-medium">{r.partner_name || "—"}</TableCell>
                <TableCell>{r.partner_phone || "—"}</TableCell>
                <TableCell>{r.partner_instagram ? <a href={`https://instagram.com/${r.partner_instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">@{r.partner_instagram.replace(/^@/, "")} <ExternalLink className="w-3 h-3" /></a> : "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={r.nome}>{r.nome}</TableCell>
                <TableCell><Badge variant={r.race_type === "ALVO" ? "default" : "secondary"} className="text-xs">{r.race_type}</Badge></TableCell>
                <TableCell className="text-sm">{r.categoria}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{fmtDate(r.race_date)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Main CRM ──
export function CRMAdmin() {
  return (
    <div className="space-y-6 w-full max-w-full">
      <h2 className="text-xl font-bold text-foreground">CRM</h2>
      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="visao-geral" className="gap-2"><LayoutDashboard className="w-4 h-4" />Visão Geral</TabsTrigger>
          <TabsTrigger value="leads-diagnostico" className="gap-2"><Stethoscope className="w-4 h-4" />Leads Diagnóstico</TabsTrigger>
          <TabsTrigger value="clientes" className="gap-2"><UserPlus className="w-4 h-4" />Clientes / Leads</TabsTrigger>
          <TabsTrigger value="duplas" className="gap-2"><Users className="w-4 h-4" />Duplas em Provas</TabsTrigger>
        </TabsList>
        <TabsContent value="visao-geral" className="mt-4"><VisaoGeralTab /></TabsContent>
        <TabsContent value="leads-diagnostico" className="mt-4"><LeadsDiagnosticoTab /></TabsContent>
        <TabsContent value="clientes" className="mt-4"><ClientesTab /></TabsContent>
        <TabsContent value="duplas" className="mt-4"><DuplasTab /></TabsContent>
      </Tabs>
    </div>
  );
}
