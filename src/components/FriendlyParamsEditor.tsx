import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Target, 
  Settings2, 
  TrendingUp, 
  Percent,
  ChevronDown,
  ChevronRight,
  Save,
  AlertTriangle,
  Info,
  ShieldCheck,
  RefreshCw,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { useSystemParams, type SystemParam } from '@/hooks/useSystemParams';
import { cn } from '@/lib/utils';

// ============================================
// FORMATTERS & PARSERS
// ============================================

/** Converts seconds to mm:ss string */
function secondsToMMSS(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** Converts mm:ss string to seconds */
function mmssToSeconds(mmss: string): number | null {
  const match = mmss.match(/^(\d{1,3}):(\d{2})$/);
  if (!match) return null;
  const mins = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);
  if (secs >= 60) return null;
  return mins * 60 + secs;
}

// ============================================
// FIELD DEFINITIONS
// ============================================

interface FieldDefinition {
  key: string;
  label: string;
  type: 'time' | 'toggle' | 'number' | 'percent' | 'select';
  description?: string;
  /** For nested values like {min: 1080, max: 1500} */
  nestedKey?: 'min' | 'max';
  /** For select type */
  options?: { value: string; label: string }[];
  /** Suffix to show after number inputs */
  suffix?: string;
  /** Min value for number inputs */
  min?: number;
  /** Max value for number inputs */
  max?: number;
}

interface SectionDefinition {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  fields: FieldDefinition[];
}

const SECTIONS: SectionDefinition[] = [
  {
    id: 'scoring',
    title: 'Classificação de Performance',
    description: 'Pontuações atribuídas a cada faixa de desempenho (scoring buckets)',
    icon: <Target className="w-5 h-5" />,
    fields: [
      { key: 'benchmark.scoringBuckets', label: 'Elite', type: 'number', nestedKey: 'elite' as any, suffix: 'pts', min: 0, max: 100, description: 'Pontuação para desempenho Elite' },
      { key: 'benchmark.scoringBuckets', label: 'Strong', type: 'number', nestedKey: 'strong' as any, suffix: 'pts', min: 0, max: 100, description: 'Pontuação para desempenho Strong' },
      { key: 'benchmark.scoringBuckets', label: 'OK', type: 'number', nestedKey: 'ok' as any, suffix: 'pts', min: 0, max: 100, description: 'Pontuação para desempenho OK' },
      { key: 'benchmark.scoringBuckets', label: 'Tough', type: 'number', nestedKey: 'tough' as any, suffix: 'pts', min: 0, max: 100, description: 'Pontuação para desempenho Tough' },
      { key: 'benchmark.scoringBuckets', label: 'DNF', type: 'number', nestedKey: 'dnf' as any, suffix: 'pts', min: 0, max: 100, description: 'Pontuação para DNF (não finalizou)' },
    ]
  },
  {
    id: 'thresholds',
    title: 'Limiares de Classificação',
    description: 'Percentuais para definir as faixas de desempenho',
    icon: <Percent className="w-5 h-5" />,
    fields: [
      { key: 'benchmark.bucketThresholds', label: 'Limiar Elite', type: 'number', nestedKey: 'elitePercent' as any, suffix: '%', min: 0, max: 100, description: 'Percentual abaixo do mínimo para ser Elite' },
      { key: 'benchmark.bucketThresholds', label: 'Limiar Strong', type: 'number', nestedKey: 'strongPercent' as any, suffix: '%', min: 0, max: 100, description: 'Percentual até a média para ser Strong' },
      { key: 'benchmark.bucketThresholds', label: 'Limiar OK', type: 'number', nestedKey: 'okPercent' as any, suffix: '%', min: 0, max: 100, description: 'Percentual até o máximo para ser OK' },
    ]
  },
  {
    id: 'rules',
    title: 'Regras de Prioridade',
    description: 'Configurações de comportamento do sistema de benchmarks',
    icon: <Settings2 className="w-5 h-5" />,
    fields: [
      { key: 'benchmark.allowCoachOverride', label: 'Permitir treinador sobrescrever benchmarks', type: 'toggle', description: 'Se ativo, o coach pode definir faixas de tempo manualmente' },
      { key: 'benchmark.coachOverridePriority', label: 'Prioridade quando coach define valores', type: 'select',
        options: [
          { value: '"coach_wins"', label: 'Coach tem prioridade' },
          { value: '"app_wins"', label: 'Sistema tem prioridade' },
          { value: '"merge"', label: 'Mesclar valores' },
        ],
        description: 'Como resolver conflitos entre valores do coach e do sistema'
      },
      { key: 'benchmark.enabledOnlyForBenchmark', label: 'Tempos de referência apenas para benchmarks', type: 'toggle', description: 'Se ativo, WODs comuns não exibem faixas de tempo de referência' },
    ]
  },
  {
    id: 'estimation',
    title: 'Estimativas de Tempo',
    description: 'Parâmetros para estimar duração de treinos por nível e tipo de WOD',
    icon: <TrendingUp className="w-5 h-5" />,
    fields: [
      { key: 'estimation.enableAthleteTimeEstimate', label: 'Habilitar estimativa de tempo', type: 'toggle', description: 'Se ativo, o sistema calcula tempo estimado para cada atleta' },
      { key: 'estimation.defaultSessionCapMinutes', label: 'Duração máxima de sessão', type: 'number', suffix: 'min', min: 30, max: 180, description: 'Limite máximo para estimativa de tempo de treino' },
      { key: 'estimation.minEstimateSeconds', label: 'Estimativa mínima', type: 'time', description: 'Menor tempo possível de estimativa' },
      { key: 'estimation.maxEstimateSeconds', label: 'Estimativa máxima', type: 'time', description: 'Maior tempo possível de estimativa' },
    ]
  },
  {
    id: 'progression',
    title: 'Progressão & Evolução',
    description: 'Thresholds de nível, validação de consistência e decaimento temporal',
    icon: <TrendingUp className="w-5 h-5" />,
    fields: [
      { key: 'progression.levelThresholds', label: 'Score mín. OPEN', type: 'number', nestedKey: 'open' as any, suffix: 'pts', min: 0, max: 100, description: 'Score mínimo para nível OPEN' },
      { key: 'progression.levelThresholds', label: 'Score mín. PRO', type: 'number', nestedKey: 'pro' as any, suffix: 'pts', min: 0, max: 100, description: 'Score mínimo para nível PRO' },
      { key: 'progression.levelThresholds', label: 'Score mín. ELITE', type: 'number', nestedKey: 'elite' as any, suffix: 'pts', min: 0, max: 100, description: 'Score mínimo para nível ELITE' },
      { key: 'progression.temporalDecay', label: 'Meia-vida (dias)', type: 'number', nestedKey: 'halfLifeDays' as any, suffix: 'dias', min: 7, max: 365, description: 'Dias para benchmark antigo perder metade do peso' },
      { key: 'progression.temporalDecay', label: 'Peso mínimo', type: 'number', nestedKey: 'minWeight' as any, suffix: 'x', min: 0, max: 1, description: 'Menor peso possível para benchmarks antigos' },
      { key: 'progression.consistencyValidation', label: 'Semanas Strong mín.', type: 'number', nestedKey: 'minStrongWeeks' as any, suffix: 'sem', min: 1, max: 12, description: 'Semanas mínimas com performance Strong+ para subir' },
      { key: 'progression.consistencyValidation', label: 'Ratio Strong mín.', type: 'number', nestedKey: 'minStrongRatio' as any, suffix: 'x', min: 0, max: 1, description: 'Proporção mínima de benchmarks Strong+ (0-1)' },
    ]
  },
];

// ============================================
// FIELD INPUT COMPONENTS
// ============================================

interface FieldInputProps {
  field: FieldDefinition;
  value: any;
  onChange: (newValue: any) => void;
  disabled?: boolean;
}

function TimeInput({ field, value, onChange, disabled }: FieldInputProps) {
  // Handle nested values
  const currentSeconds = field.nestedKey && typeof value === 'object' 
    ? value?.[field.nestedKey] 
    : value;
  
  const [localValue, setLocalValue] = useState(
    typeof currentSeconds === 'number' ? secondsToMMSS(currentSeconds) : '00:00'
  );

  useEffect(() => {
    if (typeof currentSeconds === 'number') {
      setLocalValue(secondsToMMSS(currentSeconds));
    }
  }, [currentSeconds]);

  const handleBlur = () => {
    const seconds = mmssToSeconds(localValue);
    if (seconds !== null) {
      if (field.nestedKey && typeof value === 'object') {
        onChange({ ...value, [field.nestedKey]: seconds });
      } else {
        onChange(seconds);
      }
    } else {
      // Reset to valid value
      setLocalValue(typeof currentSeconds === 'number' ? secondsToMMSS(currentSeconds) : '00:00');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="mm:ss"
        className="w-24 font-mono text-center"
        disabled={disabled}
      />
      <span className="text-xs text-muted-foreground">mm:ss</span>
    </div>
  );
}

function NumberInput({ field, value, onChange, disabled }: FieldInputProps) {
  // Handle nested values
  const currentValue = field.nestedKey && typeof value === 'object' 
    ? value?.[field.nestedKey] 
    : value;
  
  const numValue = typeof currentValue === 'number' ? currentValue : 0;

  const handleChange = (newNum: number) => {
    if (field.nestedKey && typeof value === 'object') {
      onChange({ ...value, [field.nestedKey]: newNum });
    } else {
      onChange(newNum);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={numValue}
        onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
        min={field.min}
        max={field.max}
        step={field.suffix === 'x' ? 0.1 : 1}
        className="w-24 font-mono text-center"
        disabled={disabled}
      />
      {field.suffix && (
        <span className="text-xs text-muted-foreground">{field.suffix}</span>
      )}
    </div>
  );
}

function ToggleInput({ field, value, onChange, disabled }: FieldInputProps) {
  // Parse string 'true'/'false' from DB
  const boolValue = value === true || value === 'true';

  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={boolValue}
        onCheckedChange={(checked) => onChange(checked)}
        disabled={disabled}
      />
      <span className={cn(
        "text-sm",
        boolValue ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
      )}>
        {boolValue ? 'Ativo' : 'Inativo'}
      </span>
    </div>
  );
}

function SelectInput({ field, value, onChange, disabled }: FieldInputProps) {
  // value comes as JSON string like '"coach_wins"'
  const strValue = typeof value === 'string' ? value : JSON.stringify(value);

  return (
    <Select
      value={strValue}
      onValueChange={(val) => onChange(JSON.parse(val))}
      disabled={disabled}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Selecione..." />
      </SelectTrigger>
      <SelectContent>
        {field.options?.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function FriendlyParamsEditor() {
  const { params, loading, error, canEdit, refresh, updateParam, getParam } = useSystemParams();
  const [expandedSections, setExpandedSections] = useState<string[]>(['benchmark-times', 'rules']);
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Build a map of param key -> value for quick lookup
  const paramsMap = useMemo(() => {
    const map = new Map<string, any>();
    params.forEach(p => map.set(p.key, p.value));
    return map;
  }, [params]);

  // Get current value (pending change or DB value)
  const getValue = (key: string): any => {
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key);
    }
    return paramsMap.get(key);
  };

  // Handle field change
  const handleFieldChange = (key: string, value: any) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  };

  // Toggle section
  const toggleSection = (id: string) => {
    setExpandedSections(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  // Save all pending changes
  const handleSave = async () => {
    if (pendingChanges.size === 0) return;

    setSaving(true);
    let successCount = 0;

    for (const [key, value] of pendingChanges) {
      const success = await updateParam(key, value);
      if (success) successCount++;
    }

    if (successCount === pendingChanges.size) {
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-medium">Configuração atualizada</span>
          <span className="text-xs text-muted-foreground">
            {successCount} parâmetro(s) alterado(s). Impacta cálculos futuros.
          </span>
        </div>,
        { duration: 5000 }
      );
      setPendingChanges(new Map());
    } else {
      toast.error(`Erro ao salvar ${pendingChanges.size - successCount} parâmetro(s)`);
    }

    setSaving(false);
    setShowConfirmDialog(false);
  };

  // Render field based on type
  const renderField = (field: FieldDefinition) => {
    const value = getValue(field.key);
    const isChanged = pendingChanges.has(field.key);

    const inputProps: FieldInputProps = {
      field,
      value,
      onChange: (newValue) => handleFieldChange(field.key, newValue),
      disabled: !canEdit || saving,
    };

    return (
      <div 
        key={`${field.key}-${field.nestedKey || ''}`}
        className={cn(
          "flex items-center justify-between py-3 px-4 rounded-lg transition-colors",
          isChanged ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/30"
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">{field.label}</Label>
            {isChanged && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/50">
                modificado
              </Badge>
            )}
          </div>
          {field.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
          )}
        </div>
        <div className="flex-shrink-0 ml-4">
          {field.type === 'time' && <TimeInput {...inputProps} />}
          {field.type === 'number' && <NumberInput {...inputProps} />}
          {field.type === 'percent' && <NumberInput {...inputProps} />}
          {field.type === 'toggle' && <ToggleInput {...inputProps} />}
          {field.type === 'select' && <SelectInput {...inputProps} />}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Carregando configurações…
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
        <Settings2 className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground text-sm">
          Nenhum parâmetro encontrado no banco de dados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scope clarification banner */}
      <div className="p-4 rounded-lg bg-sky-500/10 border border-sky-500/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-sky-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-sky-500">
              Regras do Jogo &amp; Gamificação
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Esta seção gerencia <strong>scoring</strong>, <strong>estimativas de tempo</strong> e <strong>regras de prioridade</strong>.
              Outros domínios têm abas dedicadas:
            </p>
            <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside space-y-0.5">
              <li><strong>Motor Físico</strong> → Calorias e constantes biomecânicas</li>
              <li><strong>Jornada</strong> → Progressão de nível e regras de status</li>
              <li><strong>Classificação</strong> → Benchmarks HYROX e fatores de divisão</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Admin Notice */}
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-500" />
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Apenas administradores podem editar estas configurações. Alterações são auditadas.
          </p>
        </div>
      </div>

      {/* Header with Save and Refresh */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {pendingChanges.size > 0 && (
            <span className="text-amber-600 font-medium">
              {pendingChanges.size} alteração(ões) pendente(s)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refresh} disabled={saving}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Atualizar
          </Button>
          {pendingChanges.size > 0 && (
            <Button 
              onClick={() => setShowConfirmDialog(true)} 
              disabled={saving}
              className="gap-1"
            >
              <Save className="w-4 h-4" />
              Salvar {pendingChanges.size} alteração(ões)
            </Button>
          )}
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <Card key={section.id} className="overflow-hidden">
          <CardHeader 
            className="cursor-pointer hover:bg-muted/30 transition-colors py-4"
            onClick={() => toggleSection(section.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-primary">{section.icon}</div>
                <div>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {section.description}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {section.fields.length} campos
                </Badge>
                {expandedSections.includes(section.id) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>

          <AnimatePresence>
            {expandedSections.includes(section.id) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0 pb-4 px-4">
                  <div className="space-y-2">
                    {section.fields.map(renderField)}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      ))}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmar alterações
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Você está prestes a alterar <strong>{pendingChanges.size} parâmetro(s)</strong> do sistema.
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
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} disabled={saving}>
              {saving ? (
                <>Salvando…</>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Confirmar e Aplicar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
