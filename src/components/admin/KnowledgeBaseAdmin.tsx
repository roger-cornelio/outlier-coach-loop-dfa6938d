import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  BookOpen,
  Loader2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  "Biomechanics",
  "Pacing Strategy",
  "Concurrent Training",
  "Nutrition",
  "Transition/Fatigue",
  "General",
] as const;

const STATIONS = [
  "Running",
  "SkiErg",
  "Sled Push",
  "Sled Pull",
  "Burpee Broad Jump",
  "Rowing",
  "Farmers Carry",
  "Sandbag Lunges",
  "Wall Balls",
  "General",
] as const;

interface Article {
  id: string;
  title: string;
  author_or_source: string | null;
  category: string;
  target_station: string;
  key_takeaways: string | null;
  full_summary: string | null;
  publication_year: number | null;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  title: "",
  author_or_source: "",
  category: "General",
  target_station: "General",
  key_takeaways: "",
  full_summary: "",
  publication_year: new Date().getFullYear(),
};

export function KnowledgeBaseAdmin() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStation, setFilterStation] = useState<string>("all");

  const fetchArticles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scientific_articles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar artigos", description: error.message, variant: "destructive" });
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const filtered = articles.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      a.title.toLowerCase().includes(q) ||
      (a.author_or_source || "").toLowerCase().includes(q) ||
      (a.key_takeaways || "").toLowerCase().includes(q);
    const matchesCat = filterCategory === "all" || a.category === filterCategory;
    const matchesStation = filterStation === "all" || a.target_station === filterStation;
    return matchesSearch && matchesCat && matchesStation;
  });

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setView("form");
  };

  const openEdit = (article: Article) => {
    setEditingId(article.id);
    setForm({
      title: article.title,
      author_or_source: article.author_or_source || "",
      category: article.category,
      target_station: article.target_station,
      key_takeaways: article.key_takeaways || "",
      full_summary: article.full_summary || "",
      publication_year: article.publication_year || new Date().getFullYear(),
    });
    setView("form");
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      author_or_source: form.author_or_source.trim() || null,
      category: form.category,
      target_station: form.target_station,
      key_takeaways: form.key_takeaways.trim() || null,
      full_summary: form.full_summary.trim() || null,
      publication_year: form.publication_year || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("scientific_articles").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("scientific_articles").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Artigo atualizado" : "Artigo criado" });
      setView("list");
      fetchArticles();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("scientific_articles").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Artigo excluído" });
      fetchArticles();
    }
    setDeleteTarget(null);
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {view === "list" ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Knowledge Base</h2>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {articles.length} artigos
                </span>
              </div>
              <Button onClick={openNew} size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Novo Artigo
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, autor ou palavra-chave..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStation} onValueChange={setFilterStation}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Estação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Estações</SelectItem>
                  {STATIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">
                  {articles.length === 0
                    ? "Nenhum artigo cadastrado ainda."
                    : "Nenhum artigo encontrado com esses filtros."}
                </p>
              </div>
            ) : (
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30">
                      <TableHead>Título</TableHead>
                      <TableHead className="hidden md:table-cell">Categoria</TableHead>
                      <TableHead className="hidden md:table-cell">Estação</TableHead>
                      <TableHead className="hidden lg:table-cell">Ano</TableHead>
                      <TableHead className="text-right w-28">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((article) => (
                      <TableRow key={article.id} className="group">
                        <TableCell>
                          <div>
                            <span className="font-medium text-sm">{article.title}</span>
                            {article.author_or_source && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {article.author_or_source}
                              </p>
                            )}
                            <div className="flex gap-1.5 mt-1 md:hidden">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                {article.category}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                {article.target_station}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {article.category}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {article.target_station}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {article.publication_year || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(article)}
                              className="h-8 w-8"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(article)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Form header */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setView("list")} className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-bold">
                {editingId ? "Editar Artigo" : "Novo Artigo"}
              </h2>
            </div>

            <div className="grid gap-5 max-w-3xl">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Effect of concurrent training on HYROX performance"
                />
              </div>

              {/* Author + Year row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="author">Autor / Fonte</Label>
                  <Input
                    id="author"
                    value={form.author_or_source}
                    onChange={(e) => setForm((f) => ({ ...f, author_or_source: e.target.value }))}
                    placeholder="Ex: Journal of Sports Science"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="year">Ano de Publicação</Label>
                  <Input
                    id="year"
                    type="number"
                    min={1900}
                    max={2099}
                    value={form.publication_year}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, publication_year: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>

              {/* Category + Station row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Estação Alvo</Label>
                  <Select
                    value={form.target_station}
                    onValueChange={(v) => setForm((f) => ({ ...f, target_station: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Key Takeaways */}
              <div className="space-y-1.5">
                <Label htmlFor="takeaways">Key Takeaways</Label>
                <Textarea
                  id="takeaways"
                  value={form.key_takeaways}
                  onChange={(e) => setForm((f) => ({ ...f, key_takeaways: e.target.value }))}
                  placeholder="• Finding 1&#10;• Finding 2&#10;• Finding 3"
                  className="min-h-[140px] font-mono text-sm"
                />
              </div>

              {/* Full Summary */}
              <div className="space-y-1.5">
                <Label htmlFor="summary">Full Summary / Extracted Text</Label>
                <Textarea
                  id="summary"
                  value={form.full_summary}
                  onChange={(e) => setForm((f) => ({ ...f, full_summary: e.target.value }))}
                  placeholder="Detailed analysis or full extracted text of the article..."
                  className="min-h-[240px] font-mono text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? "Salvar Alterações" : "Criar Artigo"}
                </Button>
                <Button variant="ghost" onClick={() => setView("list")}>
                  Cancelar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Artigo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.title}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
