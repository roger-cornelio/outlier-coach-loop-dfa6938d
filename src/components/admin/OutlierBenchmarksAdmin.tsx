import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Loader2, Dumbbell, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

interface Benchmark {
  id: string;
  name: string;
  description: string | null;
  category: string;
  difficulty_weight: number;
  expected_minutes: number | null;
  is_active: boolean;
}

interface TargetRow {
  id?: string;
  benchmark_id: string;
  sex: string;
  age_group: string;
  division: string;
  level: string;
  target_seconds: number;
  version: string;
}

const CATEGORIES = ['run', 'strength', 'mixed', 'engine'];
const LEVELS = ['OPEN', 'PRO', 'ELITE'];
const SEXES = ['M', 'F'];
const AGE_GROUPS = ['16-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65+'];
const DIVISIONS = ['PRO', 'OPEN'];

function secToMMSS(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function mmssToSec(v: string): number | null {
  const parts = v.split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0]);
    const s = parseInt(parts[1]);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  const n = parseInt(v);
  return isNaN(n) ? null : n;
}

// Extracted component to avoid useState inside .map()
function TargetLevelInput({ level, targets, selectedBenchmark, targetSex, targetAge, targetDiv, saving, onSave }: {
  level: string;
  targets: TargetRow[];
  selectedBenchmark: string;
  targetSex: string;
  targetAge: string;
  targetDiv: string;
  saving: boolean;
  onSave: (level: string, seconds: number) => void;
}) {
  const [val, setVal] = useState('');

  useEffect(() => {
    const found = targets.find(t =>
      t.benchmark_id === selectedBenchmark &&
      t.sex === targetSex &&
      t.age_group === targetAge &&
      t.division === targetDiv &&
      t.level === level
    );
    setVal(found ? secToMMSS(found.target_seconds) : '');
  }, [selectedBenchmark, targetSex, targetAge, targetDiv, targets, level]);

  const levelColors: Record<string, string> = {
    OPEN: 'border-emerald-500/30',
    PRO: 'border-blue-500/30',
    ELITE: 'border-amber-500/30',
  };

  return (
    <div className={`bg-muted/20 border ${levelColors[level] || ''} rounded-lg p-3`}>
      <Label className="text-xs font-bold">{level}</Label>
      <Input
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder="m:ss"
        className="mt-1 font-mono text-sm"
      />
      <Button
        variant="outline"
        size="sm"
        className="mt-2 w-full gap-1"
        disabled={saving || !val}
        onClick={() => {
          const sec = mmssToSec(val);
          if (sec) onSave(level, sec);
          else toast.error('Formato inválido. Use m:ss ou segundos');
        }}
      >
        <Save className="w-3 h-3" />
        Salvar
      </Button>
    </div>
  );
}

export function OutlierBenchmarksAdmin() {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('mixed');
  const [newDifficulty, setNewDifficulty] = useState(5);
  const [newExpectedMin, setNewExpectedMin] = useState('');

  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null);
  const [targetSex, setTargetSex] = useState('M');
  const [targetAge, setTargetAge] = useState('25-29');
  const [targetDiv, setTargetDiv] = useState('PRO');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [bResp, tResp] = await Promise.all([
      supabase.from('benchmark_outlier_master').select('*').order('category'),
      supabase.from('benchmark_outlier_targets').select('*'),
    ]);
    if (bResp.data) setBenchmarks(bResp.data as unknown as Benchmark[]);
    if (tResp.data) setTargets(tResp.data as unknown as TargetRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const addBenchmark = async () => {
    if (!newName.trim()) { toast.error('Nome obrigatório'); return; }
    setSaving(true);
    const { error } = await supabase.from('benchmark_outlier_master').insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      category: newCategory,
      difficulty_weight: newDifficulty,
      expected_minutes: newExpectedMin ? parseInt(newExpectedMin) : null,
    } as any);
    if (error) { toast.error(error.message); } else {
      toast.success('Benchmark criado');
      setNewName(''); setNewDesc(''); setNewExpectedMin('');
      await loadData();
    }
    setSaving(false);
  };

  const deleteBenchmark = async (id: string) => {
    if (!confirm('Apagar benchmark e todas as metas?')) return;
    const { error } = await supabase.from('benchmark_outlier_master').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Removido'); await loadData(); }
  };

  const saveTarget = async (level: string, seconds: number) => {
    if (!selectedBenchmark) return;
    setSaving(true);
    const existing = targets.find(t =>
      t.benchmark_id === selectedBenchmark &&
      t.sex === targetSex &&
      t.age_group === targetAge &&
      t.division === targetDiv &&
      t.level === level
    );
    if (existing?.id) {
      await supabase.from('benchmark_outlier_targets').update({ target_seconds: seconds } as any).eq('id', existing.id);
    } else {
      await supabase.from('benchmark_outlier_targets').insert({
        benchmark_id: selectedBenchmark,
        sex: targetSex,
        age_group: targetAge,
        division: targetDiv,
        level,
        target_seconds: seconds,
      } as any);
    }
    await loadData();
    setSaving(false);
    toast.success(`Meta ${level} salva`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="list">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="gap-2">
            <Dumbbell className="w-4 h-4" />
            Benchmarks
          </TabsTrigger>
          <TabsTrigger value="targets" className="gap-2">
            <Target className="w-4 h-4" />
            Metas por Nível
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: List / Create benchmarks */}
        <TabsContent value="list" className="space-y-6">
          <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
            <h3 className="font-display text-sm font-bold text-primary">Novo Benchmark</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="3km Run Test" />
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Duração esperada (min)</Label>
                <Input type="number" value={newExpectedMin} onChange={e => setNewExpectedMin(e.target.value)} placeholder="15" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Teste de corrida de 3km" />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs">Dificuldade (1-10): {newDifficulty}</Label>
              <input
                type="range" min={1} max={10} value={newDifficulty}
                onChange={e => setNewDifficulty(Number(e.target.value))}
                className="flex-1"
              />
            </div>
            <Button onClick={addBenchmark} disabled={saving} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Criar Benchmark
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Dificuldade</TableHead>
                <TableHead>Duração (min)</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benchmarks.map(b => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{b.name}</div>
                      {b.description && <div className="text-xs text-muted-foreground">{b.description}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {b.category}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{b.difficulty_weight}/10</TableCell>
                  <TableCell className="font-mono text-sm">{b.expected_minutes ?? '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteBenchmark(b.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {benchmarks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum benchmark criado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Tab 2: Targets per level */}
        <TabsContent value="targets" className="space-y-4">
          <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
            <h3 className="font-display text-sm font-bold text-primary">Definir Metas</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Benchmark</Label>
                <Select value={selectedBenchmark ?? ''} onValueChange={setSelectedBenchmark}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {benchmarks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Sexo</Label>
                <Select value={targetSex} onValueChange={setTargetSex}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEXES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Faixa Etária</Label>
                <Select value={targetAge} onValueChange={setTargetAge}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AGE_GROUPS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Divisão</Label>
                <Select value={targetDiv} onValueChange={setTargetDiv}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedBenchmark && (
              <div className="grid grid-cols-3 gap-4 pt-2">
                {LEVELS.map(level => (
                  <TargetLevelInput
                    key={level}
                    level={level}
                    targets={targets}
                    selectedBenchmark={selectedBenchmark}
                    targetSex={targetSex}
                    targetAge={targetAge}
                    targetDiv={targetDiv}
                    saving={saving}
                    onSave={saveTarget}
                  />
                ))}
              </div>
            )}
          </div>

          {targets.length > 0 && (
            <div className="bg-card border border-border/50 rounded-xl p-4">
              <h3 className="font-display text-sm font-bold text-muted-foreground mb-3">
                Metas cadastradas ({targets.length})
              </h3>
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Benchmark</TableHead>
                      <TableHead className="text-xs">Sexo</TableHead>
                      <TableHead className="text-xs">Idade</TableHead>
                      <TableHead className="text-xs">Div</TableHead>
                      <TableHead className="text-xs">Nível</TableHead>
                      <TableHead className="text-xs">Meta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targets.slice(0, 50).map(t => {
                      const bName = benchmarks.find(b => b.id === t.benchmark_id)?.name || '?';
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs">{bName}</TableCell>
                          <TableCell className="text-xs">{t.sex}</TableCell>
                          <TableCell className="text-xs">{t.age_group}</TableCell>
                          <TableCell className="text-xs">{t.division}</TableCell>
                          <TableCell className="text-xs font-bold">{t.level}</TableCell>
                          <TableCell className="font-mono text-xs">{secToMMSS(t.target_seconds)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
