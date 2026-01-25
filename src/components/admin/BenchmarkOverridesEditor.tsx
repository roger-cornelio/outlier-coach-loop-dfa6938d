import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Pencil, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ============ Types ============
interface BenchmarkOverride {
  id: string;
  tier: string;
  gender: string;
  age_group: string;
  metric: string;
  override_sec: number;
  version: string;
  is_active: boolean;
}

// ============ Constants ============
const METRICS = [
  { key: 'run_avg', label: 'Run (avg)' },
  { key: 'roxzone', label: 'Roxzone' },
  { key: 'ski', label: 'Ski Erg' },
  { key: 'sled_push', label: 'Sled Push' },
  { key: 'sled_pull', label: 'Sled Pull' },
  { key: 'bbj', label: 'Burpee BJ' },
  { key: 'row', label: 'Row' },
  { key: 'farmers', label: 'Farmers' },
  { key: 'sandbag', label: 'Sandbag' },
  { key: 'wallballs', label: 'Wall Balls' },
];

const TIERS = [
  { key: 'hyrox_pro', label: 'HYROX PRO' },
  { key: 'hyrox_open', label: 'HYROX OPEN' },
  { key: 'avancado', label: 'Avançado' },
  { key: 'intermediario', label: 'Intermediário' },
  { key: 'iniciante', label: 'Iniciante' },
];

const GENDERS = [
  { key: 'M', label: 'Masculino' },
  { key: 'F', label: 'Feminino' },
];

const AGE_GROUPS = [
  '16-24', '25-29', '30-34', '35-39', '40-44', 
  '45-49', '50-54', '55-59', '60-64', '65-69', '70+'
];

// ============ Helpers ============
function formatSecondsToMMSS(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseMMSSToSeconds(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  // Handle pure number input
  if (/^\d+$/.test(value.trim())) {
    return parseInt(value.trim(), 10);
  }
  
  // Handle MM:SS format
  const match = value.match(/^(\d+):(\d{1,2})$/);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    if (secs >= 60) return null;
    return mins * 60 + secs;
  }
  
  return null;
}

// ============ Component ============
export function BenchmarkOverridesEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overrides, setOverrides] = useState<BenchmarkOverride[]>([]);
  
  // New override form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTier, setNewTier] = useState('iniciante');
  const [newGender, setNewGender] = useState('M');
  const [newAgeGroup, setNewAgeGroup] = useState('30-34');
  const [newMetric, setNewMetric] = useState('run_avg');
  const [newValue, setNewValue] = useState('');
  
  useEffect(() => {
    fetchOverrides();
  }, []);
  
  async function fetchOverrides() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('benchmark_overrides')
        .select('*')
        .eq('version', 'v1')
        .eq('is_active', true)
        .order('tier')
        .order('gender')
        .order('age_group')
        .order('metric');
      
      if (error) throw error;
      setOverrides(data || []);
    } catch (err) {
      console.error('Error fetching overrides:', err);
      toast.error('Erro ao carregar overrides');
    } finally {
      setLoading(false);
    }
  }
  
  async function addOverride() {
    const valueSec = parseMMSSToSeconds(newValue);
    if (!valueSec || valueSec <= 0) {
      toast.error('Valor inválido. Use formato mm:ss');
      return;
    }
    
    // Check if already exists
    const exists = overrides.find(o => 
      o.tier === newTier && 
      o.gender === newGender && 
      o.age_group === newAgeGroup && 
      o.metric === newMetric
    );
    
    if (exists) {
      toast.error('Já existe um override para essa combinação');
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('benchmark_overrides')
        .insert({
          tier: newTier,
          gender: newGender,
          age_group: newAgeGroup,
          metric: newMetric,
          override_sec: valueSec,
          version: 'v1',
        });
      
      if (error) throw error;
      
      toast.success('Override adicionado');
      setShowAddForm(false);
      setNewValue('');
      fetchOverrides();
    } catch (err) {
      console.error('Error adding override:', err);
      toast.error('Erro ao adicionar');
    } finally {
      setSaving(false);
    }
  }
  
  async function deleteOverride(id: string) {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('benchmark_overrides')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Override removido');
      fetchOverrides();
    } catch (err) {
      console.error('Error deleting override:', err);
      toast.error('Erro ao remover');
    } finally {
      setSaving(false);
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pencil className="w-5 h-5 text-orange-500" />
              Correções Manuais de Referência
            </CardTitle>
            <CardDescription>
              Sobrescreva valores derivados para combinações específicas. Correções manuais têm prioridade sobre a derivação automática.
            </CardDescription>
          </div>
          <Button 
            onClick={() => setShowAddForm(!showAddForm)} 
            variant="outline" 
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Correção
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Form */}
        {showAddForm && (
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-4">
            <h4 className="text-sm font-medium">Adicionar Correção de Referência</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tier</label>
                <Select value={newTier} onValueChange={setNewTier}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[200]">
                    {TIERS.map(t => (
                      <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Gênero</label>
                <Select value={newGender} onValueChange={setNewGender}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[200]">
                    {GENDERS.map(g => (
                      <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Faixa Etária</label>
                <Select value={newAgeGroup} onValueChange={setNewAgeGroup}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[200]">
                    {AGE_GROUPS.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Métrica</label>
                <Select value={newMetric} onValueChange={setNewMetric}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[200]">
                    {METRICS.map(m => (
                      <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tempo (mm:ss)</label>
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="5:30"
                  className="bg-background/50"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancelar
              </Button>
              <Button onClick={addOverride} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Adicionar
              </Button>
            </div>
          </div>
        )}
        
        {/* Overrides Table */}
        {overrides.length === 0 ? (
          <Alert className="bg-secondary/30">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Nenhuma correção configurada. Todos os valores de referência são derivados automaticamente da base técnica.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead>Tier</TableHead>
                  <TableHead>Gênero</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Métrica</TableHead>
                  <TableHead className="text-center">Tempo</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map(o => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        {TIERS.find(t => t.key === o.tier)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{GENDERS.find(g => g.key === o.gender)?.label}</TableCell>
                    <TableCell>{o.age_group}</TableCell>
                    <TableCell>{METRICS.find(m => m.key === o.metric)?.label}</TableCell>
                    <TableCell className="text-center font-mono">
                      {formatSecondsToMMSS(o.override_sec)}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover correção?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O valor passará a ser calculado automaticamente pela derivação da base técnica.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteOverride(o.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
