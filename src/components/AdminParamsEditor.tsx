import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowLeft, Save, RotateCcw, Eye, AlertTriangle, CheckCircle, 
  History, Copy, Download, Upload, Settings2, ChevronDown, ChevronUp,
  ShieldAlert, LogIn, AlertCircle, Clock, Layers, Database, FileJson
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getActiveParams,
  setActiveParams,
  loadHistory,
  reloadParams,
  validateParams,
  DEFAULT_PARAMS,
  OutlierParamsConfig,
  ValidationResult
} from '@/config/outlierParams';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { FriendlyParamsEditor } from '@/components/FriendlyParamsEditor';
import type { AthleteLevel } from '@/types/outlier';

const LEVEL_LABELS: Record<string, string> = {
  open: 'OPEN',
  pro: 'PRO',
  elite: 'ELITE',
};

const BUCKET_LABELS: Record<string, string> = {
  elite: 'ELITE',
  strong: 'STRONG',
  ok: 'OK',
  tough: 'TOUGH',
  dnf: 'DNF',
};

interface ParamDiff {
  path: string;
  oldValue: string | number;
  newValue: string | number;
}

function formatTimeFromSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseTimeToSeconds(time: string): number {
  const parts = time.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return parseInt(time) || 0;
}

function generateDiff(oldParams: OutlierParamsConfig, newParams: OutlierParamsConfig): ParamDiff[] {
  const diffs: ParamDiff[] = [];
  
  // Compare benchmark time ranges
  const oldRanges = oldParams.benchmark.defaultTimeRangesByLevel;
  const newRanges = newParams.benchmark.defaultTimeRangesByLevel;
  
  for (const level of ['open', 'pro', 'elite'] as const) {
    const oldRange = oldRanges[level];
    const newRange = newRanges[level];
    if (oldRange && newRange) {
      if (oldRange.min !== newRange.min || oldRange.max !== newRange.max) {
        diffs.push({
          path: `benchmark.${LEVEL_LABELS[level]}`,
          oldValue: `${formatTimeFromSeconds(oldRange.min)} - ${formatTimeFromSeconds(oldRange.max)}`,
          newValue: `${formatTimeFromSeconds(newRange.min)} - ${formatTimeFromSeconds(newRange.max)}`,
        });
      }
    }
  }
  
  // Compare scoring buckets
  const oldBuckets = oldParams.benchmark.scoringBuckets;
  const newBuckets = newParams.benchmark.scoringBuckets;
  for (const bucket of ['elite', 'strong', 'ok', 'tough', 'dnf'] as const) {
    if (oldBuckets[bucket] !== newBuckets[bucket]) {
      diffs.push({
        path: `scoringBuckets.${BUCKET_LABELS[bucket]}`,
        oldValue: oldBuckets[bucket],
        newValue: newBuckets[bucket],
      });
    }
  }
  
  // Compare level multipliers
  const oldMult = oldParams.estimation.levelMultipliers;
  const newMult = newParams.estimation.levelMultipliers;
  for (const level of ['open', 'pro', 'elite'] as AthleteLevel[]) {
    if (oldMult[level] !== newMult[level]) {
      diffs.push({
        path: `levelMultipliers.${LEVEL_LABELS[level]}`,
        oldValue: oldMult[level],
        newValue: newMult[level],
      });
    }
  }
  
  // Compare WOD type factors
  const wodTypes = ['engine', 'strength', 'skill', 'mixed', 'hyrox', 'benchmark'] as const;
  for (const type of wodTypes) {
    const oldFactor = oldParams.estimation.wodTypeFactors[type];
    const newFactor = newParams.estimation.wodTypeFactors[type];
    if (oldFactor && newFactor) {
      if (oldFactor.baseMinutes !== newFactor.baseMinutes) {
        diffs.push({
          path: `wodTypeFactors.${type}.baseMinutes`,
          oldValue: oldFactor.baseMinutes,
          newValue: newFactor.baseMinutes,
        });
      }
    }
  }
  
  return diffs;
}

export function AdminParamsEditor() {
  const { setCurrentView } = useOutlierStore();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [activeParams, setActiveParamsState] = useState<OutlierParamsConfig>(getActiveParams());
  const [editedParams, setEditedParams] = useState<OutlierParamsConfig>(getActiveParams());
  const [jsonText, setJsonText] = useState(JSON.stringify(getActiveParams(), null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [history, setHistory] = useState<OutlierParamsConfig[]>([]);
  const [notes, setNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [selectedHistoryVersion, setSelectedHistoryVersion] = useState<OutlierParamsConfig | null>(null);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [], warnings: [] });
  const [expandedSections, setExpandedSections] = useState<string[]>(['benchmark', 'estimation']);
  
  // Load data
  useEffect(() => {
    const params = getActiveParams();
    setActiveParamsState(params);
    setEditedParams(params);
    setJsonText(JSON.stringify(params, null, 2));
    setHistory(loadHistory());
  }, []);
  
  // Sync JSON with guided editor
  const syncJsonFromGuided = useCallback((params: OutlierParamsConfig) => {
    setJsonText(JSON.stringify(params, null, 2));
    setJsonError(null);
    const result = validateParams(params);
    setValidation(result);
  }, []);
  
  // Sync guided from JSON
  const syncGuidedFromJson = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      setEditedParams(parsed);
      setJsonError(null);
      const result = validateParams(parsed);
      setValidation(result);
    } catch (e) {
      setJsonError('JSON inválido: ' + (e as Error).message);
    }
  }, []);
  
  // Handlers for guided fields
  const updateTimeRange = (level: string, field: 'min' | 'max', value: string) => {
    const seconds = parseTimeToSeconds(value);
    setEditedParams(prev => ({
      ...prev,
      benchmark: {
        ...prev.benchmark,
        defaultTimeRangesByLevel: {
          ...prev.benchmark.defaultTimeRangesByLevel,
          [level]: {
            ...prev.benchmark.defaultTimeRangesByLevel[level as AthleteLevel],
            [field]: seconds,
          },
        },
      },
    }));
  };
  
  const updateScoringBucket = (bucket: string, value: number) => {
    setEditedParams(prev => ({
      ...prev,
      benchmark: {
        ...prev.benchmark,
        scoringBuckets: {
          ...prev.benchmark.scoringBuckets,
          [bucket]: value,
        },
      },
    }));
  };
  
  const updateLevelMultiplier = (level: string, value: number) => {
    setEditedParams(prev => ({
      ...prev,
      estimation: {
        ...prev.estimation,
        levelMultipliers: {
          ...prev.estimation.levelMultipliers,
          [level]: value,
        },
      },
    }));
  };
  
  const updateWodTypeFactor = (wodType: string, field: 'baseMinutes' | 'variancePercent', value: number) => {
    setEditedParams(prev => ({
      ...prev,
      estimation: {
        ...prev.estimation,
        wodTypeFactors: {
          ...prev.estimation.wodTypeFactors,
          [wodType]: {
            ...prev.estimation.wodTypeFactors[wodType as keyof typeof prev.estimation.wodTypeFactors],
            [field]: value,
          },
        },
      },
    }));
  };
  
  // REMOVED: updateModalityMet - METs foram removidos (Motor Físico agora é a fonte de Kcal)
  
  // Sync JSON when guided changes
  useEffect(() => {
    syncJsonFromGuided(editedParams);
  }, [editedParams, syncJsonFromGuided]);
  
  // Calculate diff
  const diff = useMemo(() => generateDiff(activeParams, editedParams), [activeParams, editedParams]);
  const hasChanges = diff.length > 0;
  
  // Generate new version name
  const generateVersionName = () => {
    const now = new Date();
    const base = activeParams.version.replace(/^v/, '');
    const parts = base.split('.');
    if (parts.length >= 2) {
      const minor = parseInt(parts[1]) || 0;
      return `v${parts[0]}.${minor + 1}`;
    }
    return `v${base}.1`;
  };
  
  // Save handler
  const handleSave = () => {
    if (!validation.isValid) {
      toast.error('Corrija os erros antes de salvar');
      return;
    }
    if (notes.trim().length < 5) {
      toast.error('Descreva o que mudou (mínimo 5 caracteres)');
      return;
    }
    setShowConfirmSave(true);
  };
  
  const confirmSave = () => {
    const newParams: OutlierParamsConfig = {
      ...editedParams,
      version: generateVersionName(),
      updatedAt: new Date().toISOString(),
      notes: notes.trim(),
      isActive: true,
    };
    
    setActiveParams(newParams);
    setActiveParamsState(newParams);
    setEditedParams(newParams);
    setHistory(loadHistory());
    setNotes('');
    setShowConfirmSave(false);
    toast.success(`Versão ${newParams.version} salva e ativada`);
  };
  
  // Restore version
  const handleRestoreVersion = (version: OutlierParamsConfig) => {
    const restored: OutlierParamsConfig = {
      ...version,
      version: generateVersionName(),
      updatedAt: new Date().toISOString(),
      notes: `Restaurado de ${version.version}`,
      isActive: true,
    };
    
    setActiveParams(restored);
    setActiveParamsState(restored);
    setEditedParams(restored);
    setHistory(loadHistory());
    setShowHistoryModal(false);
    setSelectedHistoryVersion(null);
    toast.success(`Versão restaurada como ${restored.version}`);
  };
  
  // Reset to defaults
  const handleResetDefaults = () => {
    setEditedParams(DEFAULT_PARAMS);
    setNotes('Reset para valores padrão');
    toast.info('Parâmetros resetados para valores padrão (não salvo ainda)');
  };
  
  // Export JSON
  const handleExport = (params: OutlierParamsConfig) => {
    const blob = new Blob([JSON.stringify(params, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outlier-params-${params.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Auth checks
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card-elevated p-8 rounded-xl text-center">
          <p className="text-muted-foreground">Verificando acesso…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card-elevated p-8 rounded-xl text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-primary/60" />
          </div>
          <h1 className="font-display text-2xl text-foreground mb-2">Área restrita</h1>
          <p className="text-muted-foreground mb-6">
            Faça login com uma conta de administrador.
          </p>
          <button
            onClick={() => navigate('/auth?next=params')}
            className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Fazer login
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card-elevated p-8 rounded-xl text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-destructive/60" />
          </div>
          <h1 className="font-display text-2xl text-foreground mb-2">Acesso negado</h1>
          <p className="text-muted-foreground mb-6">
            Apenas administradores podem editar parâmetros do sistema.
          </p>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="w-full px-6 py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView('admin')}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-wide flex items-center gap-2">
                  <Settings2 className="w-6 h-6" />
                  PARÂMETROS DO SISTEMA
                </h1>
                <p className="text-sm text-muted-foreground">
                  Single source of truth — todas as regras do MVP
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistoryModal(true)}
              >
                <History className="w-4 h-4 mr-1" />
                Histórico
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefaults}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Warning banner for global params */}
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-500">Atenção: Parâmetros globais</p>
              <p className="text-xs text-muted-foreground mt-1">
                Alterações aqui afetam TODOS os cálculos do sistema: benchmarks, estimativas de tempo, calorias, classificações e progressão.
              </p>
            </div>
          </div>
        </div>
        
        {/* Main Tabs: Database Params vs Local JSON */}
        <Tabs defaultValue="database" className="mb-6">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Parâmetros do Sistema
            </TabsTrigger>
            <TabsTrigger value="local" className="flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              Editor Local (JSON)
            </TabsTrigger>
          </TabsList>
          
          {/* Database Parameters Tab - Friendly UI */}
          <TabsContent value="database">
            <div className="card-elevated rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Configurações do Sistema
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure os parâmetros do sistema de forma intuitiva.
                    Todas as alterações são auditadas e impactam cálculos futuros.
                  </p>
                </div>
              </div>
              
              <FriendlyParamsEditor />
            </div>
          </TabsContent>
          
          {/* Local JSON Editor Tab */}
          <TabsContent value="local">
            {/* Percentile Bands Section - Separate from global params */}
            <div className="mb-6 card-elevated rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold flex items-center gap-2">
                      📊 Calibração de Percentis
                      <Badge variant="outline" className="text-xs font-mono">
                        percentile_set_id: v1
                      </Badge>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Modelo estatístico versionado — NÃO é um parâmetro global
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                {/* Info banner specific to percentile bands */}
                <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 mb-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-sky-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-sky-500">Alterações impactam apenas novos resultados.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Resultados históricos permanecem inalterados. Cada resultado armazena a versão do modelo utilizada no momento do registro.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">
                    Edição de percentile_bands disponível via banco de dados.
                  </p>
                  <p className="text-xs mt-1">
                    Tabela: <code className="bg-muted px-1 py-0.5 rounded">percentile_bands</code> • 
                    Versão ativa: <code className="bg-muted px-1 py-0.5 rounded">v1</code>
                  </p>
                </div>
              </div>
            </div>
        
        {/* Active Version Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-6 rounded-xl mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  Ativa
                </Badge>
                <span className="font-mono text-lg font-bold">{activeParams.version}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Atualizado em {new Date(activeParams.updatedAt).toLocaleString('pt-BR')}
              </p>
              {activeParams.notes && (
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="text-foreground/70">Notas:</span> {activeParams.notes}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport(activeParams)}
              >
                <Download className="w-4 h-4 mr-1" />
                Exportar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newParams = { ...activeParams, version: generateVersionName() };
                  setEditedParams(newParams);
                  toast.info('Duplicado como nova versão (edite e salve)');
                }}
              >
                <Copy className="w-4 h-4 mr-1" />
                Duplicar
              </Button>
            </div>
          </div>
        </motion.div>
        
        {/* Validation Status */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="mb-6 space-y-2">
            {validation.errors.map((error, i) => (
              <div key={i} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            ))}
            {validation.warnings.map((warning, i) => (
              <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-amber-500">{warning}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Editor Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Guided Editor */}
          <div className="card-elevated rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <h2 className="font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Edição Guiada
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Campos mais usados com validação
              </p>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto">
              <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections}>
                {/* Benchmark Section */}
                <AccordionItem value="benchmark">
                  <AccordionTrigger className="text-sm font-medium">
                    🏆 Benchmark — Faixas de Tempo por Nível
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {(['open', 'pro', 'elite'] as const).map((level) => {
                        const range = editedParams.benchmark.defaultTimeRangesByLevel[level];
                        return (
                          <div key={level} className="grid grid-cols-3 gap-2 items-center">
                            <Label className="text-xs">{LEVEL_LABELS[level]}</Label>
                            <Input
                              type="text"
                              placeholder="mm:ss"
                              value={range ? formatTimeFromSeconds(range.min) : ''}
                              onChange={(e) => updateTimeRange(level, 'min', e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                            <Input
                              type="text"
                              placeholder="mm:ss"
                              value={range ? formatTimeFromSeconds(range.max) : ''}
                              onChange={(e) => updateTimeRange(level, 'max', e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        );
                      })}
                      <p className="text-xs text-muted-foreground pt-2">
                        Formato: minutos:segundos (ex: 14:30)
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* Scoring Buckets */}
                <AccordionItem value="scoring">
                  <AccordionTrigger className="text-sm font-medium">
                    📊 Scoring Buckets (ELITE/STRONG/OK/TOUGH)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {(['elite', 'strong', 'ok', 'tough', 'dnf'] as const).map((bucket) => (
                        <div key={bucket} className="grid grid-cols-2 gap-2 items-center">
                          <Label className="text-xs">{BUCKET_LABELS[bucket]}</Label>
                          <Input
                            type="number"
                            value={editedParams.benchmark.scoringBuckets[bucket]}
                            onChange={(e) => updateScoringBucket(bucket, parseInt(e.target.value) || 0)}
                            className="h-8 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* Level Multipliers */}
                <AccordionItem value="estimation">
                  <AccordionTrigger className="text-sm font-medium">
                    ⏱️ Multiplicadores de Nível (Estimativa)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {(['open', 'pro', 'elite'] as AthleteLevel[]).map((level) => (
                        <div key={level} className="grid grid-cols-2 gap-2 items-center">
                          <Label className="text-xs">{LEVEL_LABELS[level]}</Label>
                          <Input
                            type="number"
                            step="0.05"
                            value={editedParams.estimation.levelMultipliers[level]}
                            onChange={(e) => updateLevelMultiplier(level, parseFloat(e.target.value) || 1)}
                            className="h-8 text-xs"
                          />
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground pt-2">
                        Valores maiores = tempo maior estimado (OPEN demora mais)
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* WOD Type Factors */}
                <AccordionItem value="wodtypes">
                  <AccordionTrigger className="text-sm font-medium">
                    🔥 Fatores por Tipo de WOD
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {(['engine', 'strength', 'skill', 'mixed', 'hyrox', 'benchmark'] as const).map((type) => {
                        const factor = editedParams.estimation.wodTypeFactors[type];
                        return (
                          <div key={type} className="grid grid-cols-3 gap-2 items-center">
                            <Label className="text-xs capitalize">{type}</Label>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={factor?.baseMinutes || 15}
                                onChange={(e) => updateWodTypeFactor(type, 'baseMinutes', parseInt(e.target.value) || 15)}
                                className="h-8 text-xs"
                              />
                              <span className="text-xs text-muted-foreground">min</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={factor?.variancePercent || 0.15}
                                onChange={(e) => updateWodTypeFactor(type, 'variancePercent', parseFloat(e.target.value) || 0.15)}
                                className="h-8 text-xs"
                              />
                              <span className="text-xs text-muted-foreground">var</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* Info: Motor Físico agora cuida de Kcal */}
                <AccordionItem value="energy-info">
                  <AccordionTrigger className="text-sm font-medium">
                    ⚡ Gasto Calórico (Motor Físico)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
                      <p className="text-sm font-medium text-sky-500 mb-1">Motor Físico ativo</p>
                      <p className="text-xs text-muted-foreground">
                        O cálculo de Kcal é gerido exclusivamente pela aba <strong>Motor Físico</strong>, 
                        utilizando constantes biomecânicas da tabela <code className="bg-muted px-1 py-0.5 rounded">movement_patterns</code>.
                        METs por modalidade foram removidos desta seção.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
          
          {/* JSON Editor */}
          <div className="card-elevated rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <h2 className="font-semibold flex items-center gap-2">
                {'{ }'} Editor JSON
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Edição avançada — sincronizado com campos guiados
              </p>
            </div>
            <div className="p-4">
              <Textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  syncGuidedFromJson(e.target.value);
                }}
                className="font-mono text-xs h-[520px] resize-none"
                placeholder="JSON dos parâmetros..."
              />
              {jsonError && (
                <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive">{jsonError}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Preview / Diff */}
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 card-elevated rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Pré-visualização de Mudanças ({diff.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
            
            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {diff.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                      <span className="text-muted-foreground">{d.path}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-destructive/70 line-through">{d.oldValue}</span>
                        <span className="text-foreground">→</span>
                        <span className="text-emerald-400">{d.newValue}</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        
        {/* Save Section */}
        <div className="mt-6 card-elevated rounded-xl p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
              <Label className="text-sm font-medium">Notas da versão *</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Descreva o que mudou (mínimo 5 caracteres)"
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || !validation.isValid || notes.trim().length < 5}
              className="w-full sm:w-auto"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar como nova versão
            </Button>
          </div>
          {!hasChanges && (
            <p className="text-xs text-muted-foreground mt-2">
              Nenhuma alteração detectada
            </p>
          )}
        </div>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Confirm Save Dialog */}
      <Dialog open={showConfirmSave} onOpenChange={setShowConfirmSave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar salvamento</DialogTitle>
            <DialogDescription>
              Você está prestes a criar a versão <strong>{generateVersionName()}</strong> com {diff.length} alteração(ões).
              Esta versão será ativada imediatamente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-60 overflow-y-auto">
            {diff.map((d, i) => (
              <div key={i} className="flex items-center justify-between py-1 text-sm">
                <span className="text-muted-foreground">{d.path}</span>
                <span className="text-emerald-400">{d.newValue}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmSave(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmSave}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar e Ativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de Versões
            </DialogTitle>
            <DialogDescription>
              Últimas 10 versões salvas. Clique para visualizar ou restaurar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma versão anterior encontrada
              </p>
            ) : (
              <div className="space-y-2">
                {history.slice().reverse().map((version, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedHistoryVersion?.version === version.version
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedHistoryVersion(version)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold">{version.version}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(version.updatedAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExport(version);
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {version.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{version.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryModal(false)}>
              Fechar
            </Button>
            {selectedHistoryVersion && (
              <Button onClick={() => handleRestoreVersion(selectedHistoryVersion)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Restaurar {selectedHistoryVersion.version}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
