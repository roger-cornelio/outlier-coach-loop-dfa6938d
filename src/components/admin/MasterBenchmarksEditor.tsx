import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Crown, Clock, Users, Calendar, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ============ Types ============
interface BenchmarkMaster {
  id: string;
  run_avg_sec: number;
  roxzone_sec: number;
  ski_sec: number;
  sled_push_sec: number;
  sled_pull_sec: number;
  bbj_sec: number;
  row_sec: number;
  farmers_sec: number;
  sandbag_sec: number;
  wallballs_sec: number;
  version: string;
}

interface BenchmarkDelta {
  id: string;
  delta_type: string;
  delta_key: string;
  run_avg_delta: number;
  roxzone_delta: number;
  ski_delta: number;
  sled_push_delta: number;
  sled_pull_delta: number;
  bbj_delta: number;
  row_delta: number;
  farmers_delta: number;
  sandbag_delta: number;
  wallballs_delta: number;
  version: string;
}

// ============ Constants ============
const METRICS = [
  { key: 'run_avg', label: 'Run (avg)', masterKey: 'run_avg_sec', deltaKey: 'run_avg_delta' },
  { key: 'roxzone', label: 'Roxzone', masterKey: 'roxzone_sec', deltaKey: 'roxzone_delta' },
  { key: 'ski', label: 'Ski Erg', masterKey: 'ski_sec', deltaKey: 'ski_delta' },
  { key: 'sled_push', label: 'Sled Push', masterKey: 'sled_push_sec', deltaKey: 'sled_push_delta' },
  { key: 'sled_pull', label: 'Sled Pull', masterKey: 'sled_pull_sec', deltaKey: 'sled_pull_delta' },
  { key: 'bbj', label: 'Burpee BJ', masterKey: 'bbj_sec', deltaKey: 'bbj_delta' },
  { key: 'row', label: 'Row', masterKey: 'row_sec', deltaKey: 'row_delta' },
  { key: 'farmers', label: 'Farmers', masterKey: 'farmers_sec', deltaKey: 'farmers_delta' },
  { key: 'sandbag', label: 'Sandbag', masterKey: 'sandbag_sec', deltaKey: 'sandbag_delta' },
  { key: 'wallballs', label: 'Wall Balls', masterKey: 'wallballs_sec', deltaKey: 'wallballs_delta' },
] as const;

const TIER_ORDER = [
  { key: 'hyrox_pro', label: 'HYROX PRO', description: 'Base (0)' },
  { key: 'hyrox_open', label: 'HYROX OPEN', description: '+30s' },
  { key: 'avancado', label: 'Avançado', description: '+60s' },
  { key: 'intermediario', label: 'Intermediário', description: '+120s' },
  { key: 'iniciante', label: 'Iniciante', description: '+180s' },
];

const GENDER_ORDER = [
  { key: 'M', label: 'Masculino', description: 'Base (0)' },
  { key: 'F', label: 'Feminino', description: 'Variável por métrica' },
];

const AGE_GROUPS = [
  { key: '16-24', label: '16-24', description: '-5s' },
  { key: '25-29', label: '25-29', description: 'Base (0)' },
  { key: '30-34', label: '30-34', description: '+10s' },
  { key: '35-39', label: '35-39', description: '+20s' },
  { key: '40-44', label: '40-44', description: '+30s' },
  { key: '45-49', label: '45-49', description: '+45s' },
  { key: '50-54', label: '50-54', description: '+60s' },
  { key: '55-59', label: '55-59', description: '+75s' },
  { key: '60+', label: '60+', description: '+90s' },
];

// ============ DEFAULT VALUES ============
// Tier defaults (all metrics use same values)
const DEFAULT_TIER_DELTAS: Record<string, number> = {
  'hyrox_pro': 0,
  'hyrox_open': 30,
  'avancado': 60,
  'intermediario': 120,
  'iniciante': 180,
};

// Gender defaults (per metric for female)
const DEFAULT_GENDER_DELTAS: Record<string, Record<string, number>> = {
  'M': {
    run_avg: 0, roxzone: 0, ski: 0, sled_push: 0, sled_pull: 0,
    bbj: 0, row: 0, farmers: 0, sandbag: 0, wallballs: 0,
  },
  'F': {
    run_avg: 15, roxzone: 10, ski: 15, sled_push: 20, sled_pull: 20,
    bbj: 15, row: 15, farmers: 15, sandbag: 15, wallballs: 15,
  },
};

// Age group defaults (all metrics use same values)
const DEFAULT_AGE_DELTAS: Record<string, number> = {
  '16-24': -5,
  '25-29': 0,
  '30-34': 10,
  '35-39': 20,
  '40-44': 30,
  '45-49': 45,
  '50-54': 60,
  '55-59': 75,
  '60+': 90,
};

// Helper to get default delta value
function getDefaultDelta(deltaType: string, deltaKey: string, metricKey: string): number {
  if (deltaType === 'tier') {
    return DEFAULT_TIER_DELTAS[deltaKey] ?? 0;
  }
  if (deltaType === 'gender') {
    return DEFAULT_GENDER_DELTAS[deltaKey]?.[metricKey] ?? 0;
  }
  if (deltaType === 'age_group') {
    return DEFAULT_AGE_DELTAS[deltaKey] ?? 0;
  }
  return 0;
}

// ============ Helpers ============
function formatSecondsToMMSS(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '';
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseMMSSToSeconds(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  const isNegative = value.trim().startsWith('-');
  const cleanValue = value.trim().replace(/^-/, '');
  
  // Handle pure number input
  if (/^\d+$/.test(cleanValue)) {
    const num = parseInt(cleanValue, 10);
    return isNegative ? -num : num;
  }
  
  // Handle MM:SS format
  const match = cleanValue.match(/^(\d+):(\d{1,2})$/);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    if (secs >= 60) return null;
    const total = mins * 60 + secs;
    return isNegative ? -total : total;
  }
  
  return null;
}

function formatDelta(seconds: number): string {
  if (seconds === 0) return '±0';
  return seconds > 0 ? `+${formatSecondsToMMSS(seconds)}` : formatSecondsToMMSS(seconds);
}

// ============ Component ============
export function MasterBenchmarksEditor() {
  const [activeTab, setActiveTab] = useState('master');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Master data
  const [master, setMaster] = useState<BenchmarkMaster | null>(null);
  const [editedMaster, setEditedMaster] = useState<Record<string, string>>({});
  
  // Delta data
  const [tierDeltas, setTierDeltas] = useState<Record<string, BenchmarkDelta>>({});
  const [genderDeltas, setGenderDeltas] = useState<Record<string, BenchmarkDelta>>({});
  const [ageDeltas, setAgeDeltas] = useState<Record<string, BenchmarkDelta>>({});
  const [editedDeltas, setEditedDeltas] = useState<Record<string, Record<string, string>>>({});
  
  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);
  
  async function fetchAllData() {
    setLoading(true);
    try {
      // Fetch master
      const { data: masterData, error: masterError } = await supabase
        .from('benchmark_master')
        .select('*')
        .eq('version', 'v1')
        .eq('is_active', true)
        .maybeSingle();
      
      if (masterError) throw masterError;
      
      if (masterData) {
        setMaster(masterData);
        // Initialize edited values
        const initial: Record<string, string> = {};
        METRICS.forEach(m => {
          initial[m.key] = formatSecondsToMMSS(masterData[m.masterKey as keyof BenchmarkMaster] as number);
        });
        setEditedMaster(initial);
      }
      
      // Fetch deltas
      const { data: deltasData, error: deltasError } = await supabase
        .from('benchmark_deltas')
        .select('*')
        .eq('version', 'v1')
        .eq('is_active', true);
      
      if (deltasError) throw deltasError;
      
      const tierMap: Record<string, BenchmarkDelta> = {};
      const genderMap: Record<string, BenchmarkDelta> = {};
      const ageMap: Record<string, BenchmarkDelta> = {};
      const editedMap: Record<string, Record<string, string>> = {};
      
      // Process fetched deltas
      (deltasData || []).forEach(d => {
        const deltaId = `${d.delta_type}_${d.delta_key}`;
        editedMap[deltaId] = {};
        METRICS.forEach(m => {
          editedMap[deltaId][m.key] = String(d[m.deltaKey as keyof BenchmarkDelta] || 0);
        });
        
        if (d.delta_type === 'tier') {
          tierMap[d.delta_key] = d;
        } else if (d.delta_type === 'gender') {
          genderMap[d.delta_key] = d;
        } else if (d.delta_type === 'age_group') {
          ageMap[d.delta_key] = d;
        }
      });
      
      // Apply DEFAULT values for missing entries
      // Tier defaults
      TIER_ORDER.forEach(tier => {
        const deltaId = `tier_${tier.key}`;
        if (!editedMap[deltaId]) {
          editedMap[deltaId] = {};
          METRICS.forEach(m => {
            editedMap[deltaId][m.key] = String(getDefaultDelta('tier', tier.key, m.key));
          });
        }
      });
      
      // Gender defaults
      GENDER_ORDER.forEach(g => {
        const deltaId = `gender_${g.key}`;
        if (!editedMap[deltaId]) {
          editedMap[deltaId] = {};
          METRICS.forEach(m => {
            editedMap[deltaId][m.key] = String(getDefaultDelta('gender', g.key, m.key));
          });
        }
      });
      
      // Age group defaults
      AGE_GROUPS.forEach(age => {
        const deltaId = `age_group_${age.key}`;
        if (!editedMap[deltaId]) {
          editedMap[deltaId] = {};
          METRICS.forEach(m => {
            editedMap[deltaId][m.key] = String(getDefaultDelta('age_group', age.key, m.key));
          });
        }
      });
      
      setTierDeltas(tierMap);
      setGenderDeltas(genderMap);
      setAgeDeltas(ageMap);
      setEditedDeltas(editedMap);
      
    } catch (err) {
      console.error('Error fetching benchmark data:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }
  
  // Save master values
  async function saveMaster() {
    if (!master) return;
    setSaving(true);
    try {
      const updates: Record<string, number> = {};
      
      for (const metric of METRICS) {
        const value = parseMMSSToSeconds(editedMaster[metric.key]);
        if (value === null || value <= 0) {
          toast.error(`Valor inválido para ${metric.label}`);
          setSaving(false);
          return;
        }
        updates[metric.masterKey] = value;
      }
      
      const { error } = await supabase
        .from('benchmark_master')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', master.id);
      
      if (error) throw error;
      
      toast.success('Base Master atualizada com sucesso');
      fetchAllData();
    } catch (err) {
      console.error('Error saving master:', err);
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }
  
  // Save deltas for a specific type
  async function saveDeltas(deltaType: 'tier' | 'gender' | 'age_group') {
    setSaving(true);
    try {
      let deltaMap: Record<string, BenchmarkDelta>;
      let items: typeof TIER_ORDER;
      
      if (deltaType === 'tier') {
        deltaMap = tierDeltas;
        items = TIER_ORDER;
      } else if (deltaType === 'gender') {
        deltaMap = genderDeltas;
        items = GENDER_ORDER;
      } else {
        deltaMap = ageDeltas;
        items = AGE_GROUPS;
      }
      
      for (const item of items) {
        const deltaId = `${deltaType}_${item.key}`;
        const existing = deltaMap[item.key];
        
        const deltaValues: Record<string, number> = {};
        for (const metric of METRICS) {
          const value = parseInt(editedDeltas[deltaId]?.[metric.key] || '0', 10);
          deltaValues[metric.deltaKey] = isNaN(value) ? 0 : value;
        }
        
        if (existing) {
          // Update existing record
          const { error } = await supabase
            .from('benchmark_deltas')
            .update({
              ...deltaValues,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          
          if (error) throw error;
        } else {
          // Insert new record with current values (from defaults or edited)
          const { error } = await supabase
            .from('benchmark_deltas')
            .insert({
              delta_type: deltaType,
              delta_key: item.key,
              version: 'v1',
              is_active: true,
              ...deltaValues,
            });
          
          if (error) throw error;
        }
      }
      
      toast.success('Deltas atualizados com sucesso');
      fetchAllData();
    } catch (err) {
      console.error('Error saving deltas:', err);
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }
  
  // Handle master value change
  function handleMasterChange(metricKey: string, value: string) {
    setEditedMaster(prev => ({ ...prev, [metricKey]: value }));
  }
  
  // Handle delta value change
  function handleDeltaChange(deltaType: string, deltaKey: string, metricKey: string, value: string) {
    const deltaId = `${deltaType}_${deltaKey}`;
    setEditedDeltas(prev => ({
      ...prev,
      [deltaId]: {
        ...prev[deltaId],
        [metricKey]: value,
      },
    }));
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Base de Referência do Sistema
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Referência técnica que define o radar, a régua de estações e os níveis HYROX
          </p>
        </div>
      </div>
      
      {/* Info Banner */}
      <Alert className="bg-primary/5 border-primary/20">
        <Info className="w-4 h-4 text-primary" />
        <AlertDescription className="text-sm">
          Esta base define os tempos e referências técnicas que o sistema utiliza para calcular o radar fisiológico, 
          a régua de estações e os níveis de status. Não representa desempenho individual, mas sim o padrão técnico 
          a partir do qual todos os deltas são aplicados.
        </AlertDescription>
      </Alert>
      
      {/* Helper Text */}
      <p className="text-xs text-muted-foreground/70 italic">
        Os valores definidos aqui funcionam como ponto zero de referência, ajustado por tier, gênero e idade. 
        Esta tabela não é um ranking nem comparação direta entre atletas — todos os indicadores do sistema (radar, régua, status) são derivados desta base.
      </p>
      
      {/* Formula Reference */}
      <Alert className="bg-secondary/30 border-border/50">
        <AlertDescription className="text-xs text-muted-foreground">
          <strong>Fórmula de Derivação:</strong> Referência Final = Base PRO M + Delta Tier + Delta Gênero + Delta Idade
        </AlertDescription>
      </Alert>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="master" className="gap-2">
            <Crown className="w-4 h-4" />
            Base Master
          </TabsTrigger>
          <TabsTrigger value="tiers" className="gap-2">
            <Clock className="w-4 h-4" />
            Deltas Tier
          </TabsTrigger>
          <TabsTrigger value="gender" className="gap-2">
            <Users className="w-4 h-4" />
            Deltas Gênero
          </TabsTrigger>
          <TabsTrigger value="age" className="gap-2">
            <Calendar className="w-4 h-4" />
            Deltas Idade
          </TabsTrigger>
        </TabsList>
        
        {/* Master Tab */}
        <TabsContent value="master">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="w-5 h-5 text-amber-500" />
                Base Master: Referência PRO Masculino
              </CardTitle>
              <CardDescription>
                Ponto zero do sistema — tempos de referência técnica para PRO masculino faixa 25-29. 
                Todos os indicadores do Outlier (radar, régua, status) são derivados desta base.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {METRICS.map(metric => (
                  <div key={metric.key} className="space-y-1">
                    <label className="text-xs text-muted-foreground">{metric.label}</label>
                    <Input
                      value={editedMaster[metric.key] || ''}
                      onChange={(e) => handleMasterChange(metric.key, e.target.value)}
                      placeholder="0:00"
                      className="text-center h-10 bg-background/50"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={saveMaster} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Base Master
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tier Deltas Tab */}
        <TabsContent value="tiers">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-blue-500" />
                Ajustes por Tier (segundos)
              </CardTitle>
              <CardDescription>
                Segundos adicionados à base de referência para cada nível HYROX. Define a escala de progressão entre níveis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground font-medium px-2">
                <div>Tier</div>
                {METRICS.slice(0, 5).map(m => (
                  <div key={m.key} className="text-center">{m.label}</div>
                ))}
              </div>
              
              {TIER_ORDER.map(tier => {
                const deltaId = `tier_${tier.key}`;
                return (
                  <div key={tier.key} className="grid grid-cols-6 gap-2 items-center p-2 rounded-lg bg-secondary/30">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{tier.label}</span>
                      <span className="text-xs text-muted-foreground">{tier.description}</span>
                    </div>
                    {METRICS.slice(0, 5).map(metric => (
                      <Input
                        key={metric.key}
                        value={editedDeltas[deltaId]?.[metric.key] || '0'}
                        onChange={(e) => handleDeltaChange('tier', tier.key, metric.key, e.target.value)}
                        className="text-center h-8 bg-background/50 text-sm"
                        disabled={tier.key === 'hyrox_pro'}
                      />
                    ))}
                  </div>
                );
              })}
              
              {/* Second row of metrics */}
              <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground font-medium px-2 pt-4">
                <div>Tier</div>
                {METRICS.slice(5).map(m => (
                  <div key={m.key} className="text-center">{m.label}</div>
                ))}
              </div>
              
              {TIER_ORDER.map(tier => {
                const deltaId = `tier_${tier.key}`;
                return (
                  <div key={`${tier.key}-2`} className="grid grid-cols-6 gap-2 items-center p-2 rounded-lg bg-secondary/30">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{tier.label}</span>
                    </div>
                    {METRICS.slice(5).map(metric => (
                      <Input
                        key={metric.key}
                        value={editedDeltas[deltaId]?.[metric.key] || '0'}
                        onChange={(e) => handleDeltaChange('tier', tier.key, metric.key, e.target.value)}
                        className="text-center h-8 bg-background/50 text-sm"
                        disabled={tier.key === 'hyrox_pro'}
                      />
                    ))}
                  </div>
                );
              })}
              
              <div className="flex justify-end pt-4">
                <Button onClick={() => saveDeltas('tier')} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Deltas Tier
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Gender Deltas Tab */}
        <TabsContent value="gender">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-pink-500" />
                Ajustes por Gênero (segundos)
              </CardTitle>
              <CardDescription>
                Correção aplicada para atletas femininas em relação à base masculina. Normaliza a referência entre gêneros.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground font-medium px-2">
                <div>Gênero</div>
                {METRICS.slice(0, 5).map(m => (
                  <div key={m.key} className="text-center">{m.label}</div>
                ))}
              </div>
              
              {GENDER_ORDER.map(g => {
                const deltaId = `gender_${g.key}`;
                return (
                  <div key={g.key} className="grid grid-cols-6 gap-2 items-center p-2 rounded-lg bg-secondary/30">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{g.label}</span>
                      <span className="text-xs text-muted-foreground">{g.description}</span>
                    </div>
                    {METRICS.slice(0, 5).map(metric => (
                      <Input
                        key={metric.key}
                        value={editedDeltas[deltaId]?.[metric.key] || '0'}
                        onChange={(e) => handleDeltaChange('gender', g.key, metric.key, e.target.value)}
                        className="text-center h-8 bg-background/50 text-sm"
                        disabled={g.key === 'M'}
                      />
                    ))}
                  </div>
                );
              })}
              
              {/* Second row */}
              <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground font-medium px-2 pt-4">
                <div>Gênero</div>
                {METRICS.slice(5).map(m => (
                  <div key={m.key} className="text-center">{m.label}</div>
                ))}
              </div>
              
              {GENDER_ORDER.map(g => {
                const deltaId = `gender_${g.key}`;
                return (
                  <div key={`${g.key}-2`} className="grid grid-cols-6 gap-2 items-center p-2 rounded-lg bg-secondary/30">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{g.label}</span>
                    </div>
                    {METRICS.slice(5).map(metric => (
                      <Input
                        key={metric.key}
                        value={editedDeltas[deltaId]?.[metric.key] || '0'}
                        onChange={(e) => handleDeltaChange('gender', g.key, metric.key, e.target.value)}
                        className="text-center h-8 bg-background/50 text-sm"
                        disabled={g.key === 'M'}
                      />
                    ))}
                  </div>
                );
              })}
              
              <div className="flex justify-end pt-4">
                <Button onClick={() => saveDeltas('gender')} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Deltas Gênero
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Age Deltas Tab */}
        <TabsContent value="age">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-green-500" />
                Ajustes por Faixa Etária (segundos)
              </CardTitle>
              <CardDescription>
                Correção aplicada por faixa etária oficial HYROX. Normaliza a referência para comparações justas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Simplified view - just run_avg as example */}
              <Alert className="bg-secondary/50 border-border/50">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  Valores aplicados a todas as métricas proporcionalmente. Edite Run (avg) como referência.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {AGE_GROUPS.map(age => {
                  const deltaId = `age_group_${age.key}`;
                  const isBase = age.key === '25-29' || age.key === '30-34';
                  return (
                    <div key={age.key} className="p-3 rounded-lg bg-secondary/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{age.label}</span>
                        {isBase && <Badge variant="outline" className="text-xs">Base</Badge>}
                      </div>
                      <Input
                        value={editedDeltas[deltaId]?.['run_avg'] || '0'}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Apply same delta to all metrics for this age group
                          METRICS.forEach(m => {
                            handleDeltaChange('age_group', age.key, m.key, value);
                          });
                        }}
                        className="text-center h-8 bg-background/50 text-sm"
                        placeholder="0"
                        disabled={isBase}
                      />
                      <p className="text-xs text-muted-foreground text-center">{age.description}</p>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={() => saveDeltas('age_group')} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Deltas Idade
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Preview Section */}
      <DerivedPreview 
        master={master} 
        tierDeltas={tierDeltas} 
        genderDeltas={genderDeltas} 
        ageDeltas={ageDeltas} 
      />
    </div>
  );
}

// ============ Derived Preview Component ============
interface DerivedPreviewProps {
  master: BenchmarkMaster | null;
  tierDeltas: Record<string, BenchmarkDelta>;
  genderDeltas: Record<string, BenchmarkDelta>;
  ageDeltas: Record<string, BenchmarkDelta>;
}

function DerivedPreview({ master, tierDeltas, genderDeltas, ageDeltas }: DerivedPreviewProps) {
  const [previewTier, setPreviewTier] = useState('intermediario');
  const [previewGender, setPreviewGender] = useState('F');
  const [previewAge, setPreviewAge] = useState('35-39');
  
  if (!master) return null;
  
  // Calculate derived values
  const derivedValues: Record<string, number> = {};
  
  METRICS.forEach(metric => {
    const baseValue = master[metric.masterKey as keyof BenchmarkMaster] as number || 0;
    const tierDelta = tierDeltas[previewTier]?.[metric.deltaKey as keyof BenchmarkDelta] as number || 0;
    const genderDelta = genderDeltas[previewGender]?.[metric.deltaKey as keyof BenchmarkDelta] as number || 0;
    const ageDelta = ageDeltas[previewAge]?.[metric.deltaKey as keyof BenchmarkDelta] as number || 0;
    
    derivedValues[metric.key] = baseValue + tierDelta + genderDelta + ageDelta;
  });
  
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-primary" />
          Simulador de Referência
        </CardTitle>
        <CardDescription>
          Visualize como a referência técnica é calculada para uma combinação específica de tier, gênero e idade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Tier</label>
            <select 
              value={previewTier} 
              onChange={(e) => setPreviewTier(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {TIER_ORDER.map(t => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Gênero</label>
            <select 
              value={previewGender} 
              onChange={(e) => setPreviewGender(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {GENDER_ORDER.map(g => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Faixa Etária</label>
            <select 
              value={previewAge} 
              onChange={(e) => setPreviewAge(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {AGE_GROUPS.map(a => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {TIER_ORDER.find(t => t.key === previewTier)?.label}
            </Badge>
            <Badge variant="outline">
              {GENDER_ORDER.find(g => g.key === previewGender)?.label}
            </Badge>
            <Badge variant="outline">
              {previewAge}
            </Badge>
          </div>
          
          <div className="grid grid-cols-5 gap-2">
            {METRICS.map(metric => (
              <div key={metric.key} className="text-center p-2 rounded bg-background/50">
                <div className="text-xs text-muted-foreground">{metric.label}</div>
                <div className="text-sm font-mono font-medium text-primary">
                  {formatSecondsToMMSS(derivedValues[metric.key])}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
