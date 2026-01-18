import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Edit2, 
  Check, 
  X, 
  Clock, 
  User, 
  ChevronDown, 
  ChevronRight,
  AlertTriangle,
  Database,
  RefreshCw,
  Info,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useSystemParams, type SystemParam } from '@/hooks/useSystemParams';
import { supabase } from '@/integrations/supabase/client';

interface ParamValueDisplayProps {
  value: any;
  compact?: boolean;
}

function ParamValueDisplay({ value, compact }: ParamValueDisplayProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }
  
  if (typeof value === 'boolean') {
    return (
      <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
        {value ? 'true' : 'false'}
      </Badge>
    );
  }
  
  if (typeof value === 'number') {
    return <span className="font-mono text-sm">{value}</span>;
  }
  
  if (typeof value === 'string') {
    if (compact && value.length > 50) {
      return <span className="text-sm">{value.substring(0, 50)}…</span>;
    }
    return <span className="text-sm">{value}</span>;
  }
  
  if (typeof value === 'object') {
    const json = JSON.stringify(value, null, 2);
    if (compact) {
      const preview = JSON.stringify(value);
      return (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
          {preview.length > 40 ? preview.substring(0, 40) + '…' : preview}
        </code>
      );
    }
    return (
      <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto max-w-md">
        {json}
      </pre>
    );
  }
  
  return <span>{String(value)}</span>;
}

interface EditParamDialogProps {
  param: SystemParam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (key: string, value: any) => Promise<boolean>;
}

function EditParamDialog({ param, open, onOpenChange, onSave }: EditParamDialogProps) {
  const [editValue, setEditValue] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingValue, setPendingValue] = useState<any>(null);

  // Reset when param changes or dialog opens
  useEffect(() => {
    if (open && param) {
      setEditValue(JSON.stringify(param.value, null, 2));
      setJsonError(null);
      setShowConfirm(false);
      setPendingValue(null);
    }
  }, [open, param]);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && param) {
      setEditValue(JSON.stringify(param.value, null, 2));
      setJsonError(null);
    }
    onOpenChange(isOpen);
  };

  const handlePreSave = () => {
    if (!param) return;

    try {
      const parsed = JSON.parse(editValue);
      setPendingValue(parsed);
      setShowConfirm(true);
    } catch (e) {
      setJsonError('JSON inválido: ' + (e as Error).message);
    }
  };

  const handleConfirmSave = async () => {
    if (!param || pendingValue === null) return;

    setSaving(true);
    setShowConfirm(false);
    
    const success = await onSave(param.key, pendingValue);
    
    if (success) {
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-medium">Parâmetro "{param.key}" atualizado</span>
          <span className="text-xs text-muted-foreground">
            Alteração aplicada. Impacta cálculos futuros.
          </span>
        </div>,
        { duration: 5000 }
      );
      onOpenChange(false);
    } else {
      toast.error('Erro ao salvar parâmetro');
    }
    
    setSaving(false);
    setPendingValue(null);
  };

  if (!param) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              Editar Parâmetro
            </DialogTitle>
            <DialogDescription>
              {param.description || `Editando: ${param.key}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Admin-only warning */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-500">
                    Edição restrita a administradores
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Esta alteração será auditada e afetará cálculos futuros.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Chave</Label>
              <code className="block mt-1 text-sm font-mono bg-muted px-2 py-1 rounded">
                {param.key}
              </code>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Badge variant="outline" className="mt-1 capitalize">
                {param.category}
              </Badge>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Valor (JSON)</Label>
              <Textarea
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  setJsonError(null);
                }}
                className="mt-1 font-mono text-sm h-40 resize-none"
                placeholder="Valor em formato JSON"
              />
              {jsonError && (
                <p className="text-xs text-destructive mt-1">{jsonError}</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <Button onClick={handlePreSave} disabled={saving}>
              <Check className="w-4 h-4 mr-1" />
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmar alteração
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Você está prestes a alterar o parâmetro <code className="bg-muted px-1 rounded">{param.key}</code>.
                </p>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Esta alteração afetará <strong>todos os cálculos futuros</strong> do sistema.
                    Benchmarks e resultados existentes não serão recalculados.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Confirmar e Aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface SystemParamsTableProps {
  /** Optional: show only specific categories */
  categories?: string[];
}

/**
 * System Parameters Table
 * 
 * Displays parameters from the database with audit info (updated_at, updated_by).
 * Only visible to admins (RLS enforced).
 * 
 * GUARDRAILS:
 * - Separate from percentile_bands (statistical model)
 * - Never shows secrets (those are in Project Secrets)
 * - All edits are audited
 */
export function SystemParamsTable({ categories: filterCategories }: SystemParamsTableProps) {
  const { params, categories, loading, error, canEdit, refresh, updateParam } = useSystemParams();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['benchmark', 'estimation']);
  const [editingParam, setEditingParam] = useState<SystemParam | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  // Filter categories if specified
  const displayCategories = filterCategories 
    ? categories.filter(c => filterCategories.includes(c.name))
    : categories;

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => 
      prev.includes(name) 
        ? prev.filter(c => c !== name)
        : [...prev, name]
    );
  };

  const handleEdit = (param: SystemParam) => {
    setEditingParam(param);
    setShowEditDialog(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch user names for updated_by
  const fetchUserName = async (userId: string) => {
    if (userNames[userId]) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', userId)
        .single();
      
      if (data) {
        setUserNames(prev => ({
          ...prev,
          [userId]: data.name || data.email || userId.substring(0, 8)
        }));
      }
    } catch {
      // Ignore errors
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground flex items-center gap-2">
          <Database className="w-4 h-4" />
          Carregando parâmetros…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (params.length === 0) {
    return (
      <div className="text-center py-12">
        <Database className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground text-sm">
          Nenhum parâmetro encontrado no banco de dados.
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Os parâmetros do sistema estão atualmente em configuração local.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Conceptual Separation Banner - Percentiles are NOT here */}
      <div className="p-4 rounded-lg bg-sky-500/10 border border-sky-500/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-sky-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-sky-500">
              Percentis NÃO são configurados aqui
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Percentis fazem parte de um modelo estatístico versionado separado. 
              Para calibrar percentis, acesse a seção{' '}
              <span className="font-medium text-foreground">"Calibração de Percentis (v1)"</span>{' '}
              na aba "Editor Local".
            </p>
          </div>
        </div>
      </div>

      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {params.length} parâmetro(s) em {displayCategories.length} categoria(s)
        </div>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Atualizar
        </Button>
      </div>

      {/* Categories */}
      {displayCategories.map((category) => (
        <div key={category.name} className="card-elevated rounded-lg overflow-hidden">
          {/* Category Header */}
          <button
            onClick={() => toggleCategory(category.name)}
            className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {expandedCategories.includes(category.name) ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="font-medium text-sm">{category.label}</span>
              <Badge variant="secondary" className="text-xs">
                {category.params.length}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {category.description}
            </span>
          </button>

          {/* Category Content */}
          <AnimatePresence>
            {expandedCategories.includes(category.name) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Parâmetro</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="w-[150px]">Atualizado</TableHead>
                      <TableHead className="w-[120px]">Por</TableHead>
                      {canEdit && <TableHead className="w-[80px]">Ação</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {category.params.map((param) => {
                      // Fetch user name if needed
                      if (param.updated_by && !userNames[param.updated_by]) {
                        fetchUserName(param.updated_by);
                      }

                      return (
                        <TableRow key={param.id}>
                          <TableCell>
                            <div>
                              <code className="text-xs font-mono">{param.key}</code>
                              {param.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {param.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <ParamValueDisplay value={param.value} compact />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatDate(param.updated_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {param.updated_by ? (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="w-3 h-3" />
                                <span className="truncate max-w-[80px]">
                                  {userNames[param.updated_by] || param.updated_by.substring(0, 8)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                          {canEdit && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(param)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* Edit Dialog */}
      <EditParamDialog
        param={editingParam}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={updateParam}
      />
    </div>
  );
}
