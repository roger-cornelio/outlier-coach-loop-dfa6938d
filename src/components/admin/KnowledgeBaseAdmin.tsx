import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Upload,
  FileUp,
  X,
  ExternalLink,
  Tag,
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

// Analysis criteria available in the app
const ANALYSIS_CRITERIA = [
  { key: "radar_diagnostico", label: "Radar Diagnóstico" },
  { key: "pacing_strategy", label: "Estratégia de Pacing" },
  { key: "transition_analysis", label: "Análise de Transições" },
  { key: "running_performance", label: "Performance de Corrida" },
  { key: "station_technique", label: "Técnica de Estações" },
  { key: "concurrent_training", label: "Treino Concorrente" },
  { key: "nutrition_fueling", label: "Nutrição / Abastecimento" },
  { key: "fatigue_management", label: "Gestão de Fadiga" },
  { key: "benchmark_comparison", label: "Comparação de Benchmarks" },
  { key: "race_prediction", label: "Predição de Prova" },
  { key: "periodization", label: "Periodização" },
  { key: "recovery", label: "Recuperação" },
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
  file_url: string | null;
  file_path: string | null;
  criteria_tags: string[];
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
  criteria_tags: [] as string[],
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStation, setFilterStation] = useState<string>("all");

  // Criteria assignment modal
  const [criteriaTarget, setCriteriaTarget] = useState<Article | null>(null);
  const [criteriaSelection, setCriteriaSelection] = useState<string[]>([]);
  const [savingCriteria, setSavingCriteria] = useState(false);

  const fetchArticles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scientific_articles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar artigos", description: error.message, variant: "destructive" });
    } else {
      setArticles(
        (data || []).map((a: any) => ({
          ...a,
          criteria_tags: Array.isArray(a.criteria_tags) ? a.criteria_tags : [],
        }))
      );
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

  const uploadAndParse = async (file: File) => {
    setUploading(true);
    setUploadProgress("Enviando arquivo...");

    try {
      // Upload to storage
      const ext = file.name.split(".").pop() || "pdf";
      const path = `articles/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("scientific-articles")
        .upload(path, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("scientific-articles")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;
      setFileUrl(publicUrl);
      setFilePath(path);

      setUploadProgress("Analisando conteúdo...");

      // Call edge function to parse
      const { data: parseData, error: parseError } = await supabase.functions.invoke(
        "parse-scientific-article",
        { body: { file_url: publicUrl, file_name: file.name } }
      );

      if (parseError) throw parseError;

      if (parseData) {
        setForm({
          title: parseData.title || file.name.replace(/\.[^/.]+$/, ""),
          author_or_source: parseData.author_or_source || "",
          category: CATEGORIES.includes(parseData.category) ? parseData.category : "General",
          target_station: STATIONS.includes(parseData.target_station) ? parseData.target_station : "General",
          key_takeaways: parseData.key_takeaways || "",
          full_summary: parseData.full_summary || "",
          publication_year: parseData.publication_year || new Date().getFullYear(),
          criteria_tags: [],
        });
        setView("form");
        toast({ title: "Documento analisado com sucesso!" });
      }
    } catch (err: any) {
      console.error("Upload/parse error:", err);
      toast({
        title: "Erro ao processar documento",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadAndParse(file);
    },
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAndParse(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFileUrl(null);
    setFilePath(null);
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
      criteria_tags: article.criteria_tags || [],
    });
    setFileUrl(article.file_url || null);
    setFilePath(article.file_path || null);
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
      file_url: fileUrl,
      file_path: filePath,
      criteria_tags: form.criteria_tags,
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
      setFileUrl(null);
      setFilePath(null);
      fetchArticles();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    // Delete file from storage if exists
    if (deleteTarget.file_path) {
      await supabase.storage.from("scientific-articles").remove([deleteTarget.file_path]);
    }

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

  const openCriteriaModal = (article: Article) => {
    setCriteriaTarget(article);
    setCriteriaSelection(article.criteria_tags || []);
  };

  const saveCriteria = async () => {
    if (!criteriaTarget) return;
    setSavingCriteria(true);
    const { error } = await supabase
      .from("scientific_articles")
      .update({ criteria_tags: criteriaSelection, updated_at: new Date().toISOString() })
      .eq("id", criteriaTarget.id);

    if (error) {
      toast({ title: "Erro ao salvar critérios", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Critérios atualizados" });
      fetchArticles();
    }
    setCriteriaTarget(null);
    setSavingCriteria(false);
  };

  const toggleCriteria = (key: string) => {
    setCriteriaSelection((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleFormCriteria = (key: string) => {
    setForm((f) => ({
      ...f,
      criteria_tags: f.criteria_tags.includes(key)
        ? f.criteria_tags.filter((k) => k !== key)
        : [...f.criteria_tags, key],
    }));
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
      {/* Upload overlay */}
      {uploading && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border border-border p-8 rounded-2xl shadow-2xl text-center max-w-sm">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm font-medium">{uploadProgress}</p>
            <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos...</p>
          </div>
        </div>
      )}

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
                <h2 className="text-lg font-bold">Base de Conhecimento</h2>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {articles.length} artigos
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  Importar Documento
                </Button>
                <Button onClick={openNew} size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Novo Manual
                </Button>
              </div>
            </div>

            {/* Drag-and-drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer",
                dragOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border/50 hover:border-primary/40 hover:bg-secondary/30"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp
                className={cn(
                  "w-8 h-8 mx-auto mb-2 transition-colors",
                  dragOver ? "text-primary" : "text-muted-foreground"
                )}
              />
              <p className="text-sm font-medium">
                Arraste um documento aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOCX, TXT — a IA vai extrair as informações automaticamente
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              className="hidden"
              onChange={handleFileSelect}
            />

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
                    ? "Nenhum artigo cadastrado ainda. Arraste um documento acima para começar."
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
                      <TableHead className="hidden lg:table-cell">Critérios</TableHead>
                      <TableHead className="hidden lg:table-cell">Ano</TableHead>
                      <TableHead className="text-right w-36">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((article) => (
                      <TableRow key={article.id} className="group">
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm">{article.title}</span>
                              {article.file_url && (
                                <a
                                  href={article.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-primary"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            {article.author_or_source && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {article.author_or_source}
                              </p>
                            )}
                            <div className="flex gap-1.5 mt-1 md:hidden flex-wrap">
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
                        <TableCell className="hidden lg:table-cell">
                          {article.criteria_tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {article.criteria_tags.slice(0, 2).map((tag) => {
                                const label = ANALYSIS_CRITERIA.find((c) => c.key === tag)?.label || tag;
                                return (
                                  <span
                                    key={tag}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-accent/50 text-accent-foreground"
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                              {article.criteria_tags.length > 2 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                  +{article.criteria_tags.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground italic">
                              Só biblioteca
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {article.publication_year || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openCriteriaModal(article)}
                              className="h-8 w-8"
                              title="Atribuir critérios"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </Button>
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setView("list");
                  setFileUrl(null);
                  setFilePath(null);
                }}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-bold">
                {editingId ? "Editar Artigo" : "Novo Artigo"}
              </h2>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver documento
                </a>
              )}
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

              {/* Author + Year */}
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

              {/* Category + Station */}
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
                <Label htmlFor="takeaways">Principais Achados</Label>
                <Textarea
                  id="takeaways"
                  value={form.key_takeaways}
                  onChange={(e) => setForm((f) => ({ ...f, key_takeaways: e.target.value }))}
                  placeholder="• Achado 1&#10;• Achado 2&#10;• Achado 3"
                  className="min-h-[140px] font-mono text-sm"
                />
              </div>

              {/* Full Summary */}
              <div className="space-y-1.5">
                <Label htmlFor="summary">Resumo Completo / Texto Extraído</Label>
                <Textarea
                  id="summary"
                  value={form.full_summary}
                  onChange={(e) => setForm((f) => ({ ...f, full_summary: e.target.value }))}
                  placeholder="Análise detalhada ou texto completo do artigo..."
                  className="min-h-[240px] font-mono text-sm"
                />
              </div>

              {/* Criteria tags */}
              <div className="space-y-2">
                <Label>Critérios de Análise (opcional)</Label>
                <p className="text-xs text-muted-foreground">
                  Selecione em quais análises do app este artigo deve ser usado como referência.
                  Se nenhum critério for selecionado, o artigo ficará apenas na biblioteca.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {ANALYSIS_CRITERIA.map((c) => (
                    <label
                      key={c.key}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                        form.criteria_tags.includes(c.key)
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-primary/30"
                      )}
                    >
                      <Checkbox
                        checked={form.criteria_tags.includes(c.key)}
                        onCheckedChange={() => toggleFormCriteria(c.key)}
                      />
                      <span className="text-sm">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? "Salvar Alterações" : "Criar Artigo"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setView("list");
                    setFileUrl(null);
                    setFilePath(null);
                  }}
                >
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

      {/* Criteria assignment modal */}
      <Dialog open={!!criteriaTarget} onOpenChange={() => setCriteriaTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Critérios de Análise
            </DialogTitle>
            <DialogDescription className="text-left">
              Selecione em quais análises o artigo <strong>"{criteriaTarget?.title}"</strong> deve ser utilizado pela IA.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 max-h-80 overflow-y-auto py-2">
            {ANALYSIS_CRITERIA.map((c) => (
              <label
                key={c.key}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                  criteriaSelection.includes(c.key)
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-primary/30"
                )}
              >
                <Checkbox
                  checked={criteriaSelection.includes(c.key)}
                  onCheckedChange={() => toggleCriteria(c.key)}
                />
                <span className="text-sm">{c.label}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCriteriaTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={saveCriteria} disabled={savingCriteria}>
              {savingCriteria && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
