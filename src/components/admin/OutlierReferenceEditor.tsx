/**
 * OutlierReferenceEditor — Unified admin editor for the OUTLIER reference system.
 * 
 * Uses multiplicative factors: Ref = Base × FatorTier × FatorSexo × FatorIdade × FatorDivisão
 * 
 * Tables: outlier_base_master, outlier_factors, outlier_reference_overrides
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Crown, Sliders, Users, Calendar, Zap, Info, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { motion } from 'framer-motion';

// ============ Types ============
interface BaseMaster {
  id: string;
  station_key: string;
  base_seconds: number;
}

interface Factor {
  id: string;
  factor_type: string;
  factor_key: string;
  factor_value: number;
}

interface Override {
  id: string;
  sex: string;
  age_group: string;
  division: string;
  tier: string;
  station_key: string;
  override_seconds: number;
}

// ============ Constants ============
const STATIONS = [
  { key: 'run_avg_1k', label: 'Run 1km (avg)' },
  { key: 'roxzone_total', label: 'Roxzone Total' },
  { key: 'skierg_1000', label: 'SkiErg 1000m' },
  { key: 'sled_push', label: 'Sled Push' },
  { key: 'sled_pull', label: 'Sled Pull' },
  { key: 'burpee_bj', label: 'Burpee Broad Jump' },
  { key: 'row_1000', label: 'Row 1000m' },
  { key: 'farmers', label: 'Farmers Carry' },
  { key: 'sandbag', label: 'Sandbag Lunges' },
  { key: 'wall_balls', label: 'Wall Balls' },
];

const FACTOR_SECTIONS = [
  {
    type: 'division',
    label: 'Divisão',
    icon: <Zap className="w-4 h-4" />,
    description: 'Fator aplicado conforme a divisão da prova (PRO/OPEN)',
    keys: [
      { key: 'PRO', label: 'PRO', desc: '×1.00 (base)' },
      { key: 'OPEN', label: 'OPEN', desc: '×0.97' },
    ],
  },
  {
    type: 'sex',
    label: 'Sexo',
    icon: <Users className="w-4 h-4" />,
    description: 'Fator de correção por sexo biológico',
    keys: [
      { key: 'M', label: 'Masculino', desc: '×1.00 (base)' },
      { key: 'F', label: 'Feminino', desc: '×1.12' },
    ],
  },
  {
    type: 'age',
    label: 'Idade',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Fator de correção por faixa etária',
    keys: [
      { key: '16-24', label: '16–24', desc: '×0.985' },
      { key: '25-29', label: '25–29', desc: '×1.000 (base)' },
      { key: '30-34', label: '30–34', desc: '×1.010' },
      { key: '35-39', label: '35–39', desc: '×1.025' },
      { key: '40-44', label: '40–44', desc: '×1.050' },
      { key: '45-49', label: '45–49', desc: '×1.080' },
      { key: '50-54', label: '50–54', desc: '×1.115' },
      { key: '55-59', label: '55–59', desc: '×1.155' },
      { key: '60-64', label: '60–64', desc: '×1.205' },
      { key: '65+', label: '65+', desc: '×1.260' },
    ],
  },
  {
    type: 'tier',
    label: 'Tier',
    icon: <Crown className="w-4 h-4" />,
    description: 'Fator de correção por nível de classificação',
    keys: [
      { key: 'ELITE', label: 'ELITE', desc: '×1.00' },
      { key: 'PRO', label: 'PRO', desc: '×1.08' },
      { key: 'OPEN', label: 'OPEN', desc: '×1.20' },
    ],
  },
];

// ============ Helpers ============
function secToMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseMMSS(val: string): number | null {
  const clean = val.trim();
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);
  const m = clean.match(/^(\d+):(\d{1,2})$/);
  if (m) {
    const secs = parseInt(m[2], 10);
    if (secs >= 60) return null;
    return parseInt(m[1], 10) * 60 + secs;
  }
  return null;
}

// ============ Component ============
export function OutlierReferenceEditor() {
  const [tab, setTab] = useState('master');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data
  const [bases, setBases] = useState<BaseMaster[]>([]);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);

  // Edit states
  const [editedBases, setEditedBases] = useState<Record<string, string>>({});
  const [editedFactors, setEditedFactors] = useState<Record<string, string>>({});
  const [dirtyBases, setDirtyBases] = useState<Set<string>>(new Set());
  const [dirtyFactors, setDirtyFactors] = useState<Set<string>>(new Set());

  // Override form
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [newOverride, setNewOverride] = useState({
    sex: 'M', age_group: '25-29', division: 'PRO', tier: 'ELITE', station_key: 'run_avg_1k', value: '',
  });

  // Simulation
  const [simSex, setSimSex] = useState('M');
  const [simAge, setSimAge] = useState('25-29');
  const [simDiv, setSimDiv] = useState('PRO');
  const [simTier, setSimTier] = useState('PRO');

  const load = useCallback(async () => {
    setLoading(true);
    const [bRes, fRes, oRes] = await Promise.all([
      supabase.from('outlier_base_master').select('*').eq('version', 'v1'),
      supabase.from('outlier_factors').select('*').eq('version', 'v1'),
      supabase.from('outlier_reference_overrides').select('*').eq('version', 'v1'),
    ]);

    const bData = (bRes.data || []) as unknown as BaseMaster[];
    const fData = (fRes.data || []) as unknown as Factor[];
    const oData = (oRes.data || []) as unknown as Override[];

    setBases(bData);
    setFactors(fData);
    setOverrides(oData);

    // Init edit states
    const eb: Record<string, string> = {};
    bData.forEach(b => { eb[b.station_key] = secToMMSS(b.base_seconds); });
    setEditedBases(eb);

    const ef: Record<string, string> = {};
    fData.forEach(f => { ef[`${f.factor_type}_${f.factor_key}`] = f.factor_value.toString(); });
    setEditedFactors(ef);

    setDirtyBases(new Set());
    setDirtyFactors(new Set());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Factor lookup helper
  const getFactor = useCallback((type: string, key: string): number => {
    const f = factors.find(f => f.factor_type === type && f.factor_key === key);
    return f ? Number(f.factor_value) : 1;
  }, [factors]);

  // Simulation results
  // Run has 8 legs in HYROX — base stores avg per 1km, total contribution = avg × 8
  const RUN_LEGS = 8;

  const simResults = useMemo(() => {
    return STATIONS.map(st => {
      const base = bases.find(b => b.station_key === st.key);
      if (!base) return { ...st, ref: 0, isOverride: false };
      const ref = Math.round(
        base.base_seconds * getFactor('tier', simTier) * getFactor('sex', simSex) *
        getFactor('age', simAge) * getFactor('division', simDiv)
      );

      // Check override
      const ov = overrides.find(o =>
        o.sex === simSex && o.age_group === simAge && o.division === simDiv &&
        o.tier === simTier && o.station_key === st.key
      );
      return { ...st, ref: ov ? ov.override_seconds : ref, isOverride: !!ov } as { key: string; label: string; ref: number; isOverride: boolean };
    });
  }, [bases, factors, overrides, simSex, simAge, simDiv, simTier, getFactor]);

  // Total considering run_avg_1k × 8
  const simTotal = useMemo(() => {
    return simResults.reduce((s, r) => {
      const contribution = r.key === 'run_avg_1k' ? r.ref * RUN_LEGS : r.ref;
      return s + contribution;
    }, 0);
  }, [simResults]);

  const baseTotal = useMemo(() => {
    return bases.reduce((s, b) => {
      const contribution = b.station_key === 'run_avg_1k' ? b.base_seconds * RUN_LEGS : b.base_seconds;
      return s + contribution;
    }, 0);
  }, [bases]);

  // Save bases
  const saveBases = async () => {
    setSaving(true);
    let ok = true;
    for (const b of bases.filter(b => dirtyBases.has(b.station_key))) {
      const sec = parseMMSS(editedBases[b.station_key] || '');
      if (!sec || sec <= 0) { toast.error(`Valor inválido: ${b.station_key}`); setSaving(false); return; }
      const { error } = await supabase
        .from('outlier_base_master')
        .update({ base_seconds: sec } as any)
        .eq('id', b.id);
      if (error) ok = false;
    }
    if (ok) {
      toast.success(`${dirtyBases.size} estação(ões) atualizada(s)`);
      setDirtyBases(new Set());
    } else { toast.error('Erro ao salvar'); }
    setSaving(false);
    load();
  };

  // Save factors
  const saveFactors = async () => {
    setSaving(true);
    let ok = true;
    for (const f of factors.filter(f => dirtyFactors.has(`${f.factor_type}_${f.factor_key}`))) {
      const val = parseFloat(editedFactors[`${f.factor_type}_${f.factor_key}`] || '1');
      if (isNaN(val) || val <= 0 || val > 3) { toast.error(`Valor inválido: ${f.factor_key}`); setSaving(false); return; }
      const { error } = await supabase
        .from('outlier_factors')
        .update({ factor_value: val } as any)
        .eq('id', f.id);
      if (error) ok = false;
    }
    if (ok) {
      toast.success(`${dirtyFactors.size} fator(es) atualizado(s)`);
      setDirtyFactors(new Set());
    } else { toast.error('Erro ao salvar'); }
    setSaving(false);
    load();
  };

  // Add override
  const addOverride = async () => {
    const sec = parseMMSS(newOverride.value);
    if (!sec || sec <= 0) { toast.error('Tempo inválido'); return; }
    const exists = overrides.find(o =>
      o.sex === newOverride.sex && o.age_group === newOverride.age_group &&
      o.division === newOverride.division && o.tier === newOverride.tier &&
      o.station_key === newOverride.station_key
    );
    if (exists) { toast.error('Override já existe para essa combinação'); return; }
    setSaving(true);
    const { error } = await supabase.from('outlier_reference_overrides').insert({
      version: 'v1', sex: newOverride.sex, age_group: newOverride.age_group,
      division: newOverride.division, tier: newOverride.tier,
      station_key: newOverride.station_key, override_seconds: sec,
    } as any);
    if (error) { toast.error('Erro ao adicionar'); } else {
      toast.success('Override adicionado');
      setShowOverrideForm(false);
      setNewOverride(prev => ({ ...prev, value: '' }));
    }
    setSaving(false);
    load();
  };

  const deleteOverride = async (id: string) => {
    const { error } = await supabase.from('outlier_reference_overrides').delete().eq('id', id);
    if (error) toast.error('Erro'); else { toast.success('Removido'); load(); }
  };

  const handleBaseChange = (key: string, val: string) => {
    setEditedBases(prev => ({ ...prev, [key]: val }));
    setDirtyBases(prev => new Set(prev).add(key));
  };

  const handleFactorChange = (type: string, key: string, val: string) => {
    const fk = `${type}_${key}`;
    setEditedFactors(prev => ({ ...prev, [fk]: val }));
    setDirtyFactors(prev => new Set(prev).add(fk));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          Base de Referência OUTLIER
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Referência técnica multiplicativa: <code className="text-primary text-xs">Ref = Base × Tier × Sexo × Idade × Divisão</code>
        </p>
      </div>

      {/* Formula */}
      <Alert className="bg-primary/5 border-primary/20">
        <Info className="w-4 h-4 text-primary" />
        <AlertDescription className="text-xs">
          <strong>Base Master:</strong> PRO Masculino 25–29 por estação. Todos os indicadores (radar, régua, classificação) são derivados multiplicando a base pelos fatores.
        </AlertDescription>
      </Alert>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="master" className="gap-1 text-xs">
            <Crown className="w-3.5 h-3.5" /> Base Master
          </TabsTrigger>
          <TabsTrigger value="factors" className="gap-1 text-xs">
            <Sliders className="w-3.5 h-3.5" /> Fatores
          </TabsTrigger>
          <TabsTrigger value="overrides" className="gap-1 text-xs">
            <Pencil className="w-3.5 h-3.5" /> Correções
          </TabsTrigger>
          <TabsTrigger value="simulation" className="gap-1 text-xs">
            <Zap className="w-3.5 h-3.5" /> Simulação
          </TabsTrigger>
        </TabsList>

        {/* ===== BASE MASTER ===== */}
        <TabsContent value="master" className="space-y-4">
          <div className="bg-card/60 border border-border/30 rounded-xl p-4">
            <h3 className="text-sm font-bold mb-1">PRO Masculino 25–29 — Tempo Base por Estação</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Ponto zero do sistema. Os fatores são multiplicados sobre estes valores.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {STATIONS.map(st => {
                const isDirty = dirtyBases.has(st.key);
                return (
                  <div key={st.key} className={`space-y-1 ${isDirty ? 'bg-primary/5 rounded p-1' : ''}`}>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{st.label}</label>
                    <Input
                      value={editedBases[st.key] || ''}
                      onChange={e => handleBaseChange(st.key, e.target.value)}
                      className="bg-muted/20 border-border/30 text-center font-mono text-sm h-9"
                      placeholder="m:ss"
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={saveBases} disabled={saving || dirtyBases.size === 0} size="sm" className="gap-2">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salvar Base {dirtyBases.size > 0 ? `(${dirtyBases.size})` : ''}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ===== FACTORS ===== */}
        <TabsContent value="factors" className="space-y-4">
          {FACTOR_SECTIONS.map(section => (
            <div key={section.type} className="bg-card/60 border border-border/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                {section.icon}
                <h3 className="text-sm font-bold">{section.label}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{section.description}</p>
              <div className="grid gap-2">
                {section.keys.map(k => {
                  const fk = `${section.type}_${k.key}`;
                  const isDirty = dirtyFactors.has(fk);
                  return (
                    <div key={k.key} className={`flex items-center gap-3 ${isDirty ? 'bg-primary/5 rounded' : ''} p-2`}>
                      <span className="text-sm font-mono font-bold w-16">{k.label}</span>
                      <span className="text-xs text-muted-foreground">×</span>
                      <Input
                        value={editedFactors[fk] ?? '1'}
                        onChange={e => handleFactorChange(section.type, k.key, e.target.value)}
                        className="w-24 bg-muted/20 border-border/30 text-center font-mono text-sm h-8"
                      />
                      <span className="text-[10px] text-muted-foreground">{k.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button onClick={saveFactors} disabled={saving || dirtyFactors.size === 0} size="sm" className="gap-2">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar Fatores {dirtyFactors.size > 0 ? `(${dirtyFactors.size})` : ''}
            </Button>
          </div>
        </TabsContent>

        {/* ===== OVERRIDES ===== */}
        <TabsContent value="overrides" className="space-y-4">
          <div className="bg-card/60 border border-border/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-orange-500" />
                  Correções Manuais
                </h3>
                <p className="text-xs text-muted-foreground">
                  Sobrescreve o valor derivado para combinações específicas.
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowOverrideForm(!showOverrideForm)}>
                <Plus className="w-3.5 h-3.5" /> Nova
              </Button>
            </div>

            {showOverrideForm && (
              <div className="p-3 bg-secondary/30 border border-border/50 rounded-lg mb-4 space-y-3">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Sexo</label>
                    <Select value={newOverride.sex} onValueChange={v => setNewOverride(p => ({ ...p, sex: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background border-border z-[200]">
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="F">F</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Idade</label>
                    <Select value={newOverride.age_group} onValueChange={v => setNewOverride(p => ({ ...p, age_group: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background border-border z-[200]">
                        {FACTOR_SECTIONS.find(s => s.type === 'age')!.keys.map(k => (
                          <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Divisão</label>
                    <Select value={newOverride.division} onValueChange={v => setNewOverride(p => ({ ...p, division: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background border-border z-[200]">
                        <SelectItem value="PRO">PRO</SelectItem>
                        <SelectItem value="OPEN">OPEN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Tier</label>
                    <Select value={newOverride.tier} onValueChange={v => setNewOverride(p => ({ ...p, tier: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background border-border z-[200]">
                        <SelectItem value="ELITE">ELITE</SelectItem>
                        <SelectItem value="PRO">PRO</SelectItem>
                        <SelectItem value="OPEN">OPEN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Estação</label>
                    <Select value={newOverride.station_key} onValueChange={v => setNewOverride(p => ({ ...p, station_key: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background border-border z-[200]">
                        {STATIONS.map(s => (
                          <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Tempo</label>
                    <Input
                      value={newOverride.value}
                      onChange={e => setNewOverride(p => ({ ...p, value: e.target.value }))}
                      placeholder="m:ss"
                      className="h-8 text-xs font-mono text-center"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowOverrideForm(false)}>Cancelar</Button>
                  <Button size="sm" onClick={addOverride} disabled={saving} className="gap-1">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Adicionar
                  </Button>
                </div>
              </div>
            )}

            {overrides.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Nenhuma correção manual. Todos os valores são derivados da fórmula.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground">
                      <th className="text-left py-1 px-2">Estação</th>
                      <th className="text-center py-1 px-2">Sexo</th>
                      <th className="text-center py-1 px-2">Idade</th>
                      <th className="text-center py-1 px-2">Divisão</th>
                      <th className="text-center py-1 px-2">Tier</th>
                      <th className="text-center py-1 px-2">Tempo</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {overrides.map(o => (
                      <tr key={o.id} className="border-b border-border/10">
                        <td className="py-1.5 px-2 font-mono">{STATIONS.find(s => s.key === o.station_key)?.label || o.station_key}</td>
                        <td className="py-1.5 px-2 text-center">{o.sex}</td>
                        <td className="py-1.5 px-2 text-center">{o.age_group}</td>
                        <td className="py-1.5 px-2 text-center"><Badge variant="outline" className="text-[10px]">{o.division}</Badge></td>
                        <td className="py-1.5 px-2 text-center"><Badge variant="outline" className="text-[10px]">{o.tier}</Badge></td>
                        <td className="py-1.5 px-2 text-center font-mono text-primary">{secToMMSS(o.override_seconds)}</td>
                        <td className="py-1.5 px-1">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-1 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="w-3 h-3" /></button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover correção?</AlertDialogTitle>
                                <AlertDialogDescription>O valor voltará a ser derivado da fórmula.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteOverride(o.id)} className="bg-destructive text-destructive-foreground">Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ===== SIMULATION ===== */}
        <TabsContent value="simulation" className="space-y-4">
          <div className="bg-card/60 border border-border/30 rounded-xl p-4">
            <h3 className="text-sm font-bold mb-3">Simulação de Referência Final</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Veja o tempo de referência calculado para qualquer combinação de atleta.
            </p>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Sexo</label>
                <Select value={simSex} onValueChange={setSimSex}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background border-border z-[200]">
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Idade</label>
                <Select value={simAge} onValueChange={setSimAge}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background border-border z-[200]">
                    {FACTOR_SECTIONS.find(s => s.type === 'age')!.keys.map(k => (
                      <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Divisão</label>
                <Select value={simDiv} onValueChange={setSimDiv}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background border-border z-[200]">
                    <SelectItem value="PRO">PRO</SelectItem>
                    <SelectItem value="OPEN">OPEN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Tier</label>
                <Select value={simTier} onValueChange={setSimTier}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background border-border z-[200]">
                    <SelectItem value="ELITE">ELITE</SelectItem>
                    <SelectItem value="PRO">PRO</SelectItem>
                    <SelectItem value="OPEN">OPEN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-xs text-muted-foreground">
                    <th className="text-left py-2 px-2">Estação</th>
                    <th className="text-center py-2 px-2">Base</th>
                    <th className="text-center py-2 px-2">Referência Final</th>
                    <th className="text-center py-2 px-2">Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {simResults.map(sr => {
                    const base = bases.find(b => b.station_key === sr.key);
                    return (
                      <tr key={sr.key} className="border-b border-border/10">
                        <td className="py-2 px-2 font-mono text-xs">{sr.label}</td>
                        <td className="py-2 px-2 text-center text-xs text-muted-foreground font-mono">
                          {base ? secToMMSS(base.base_seconds) : '—'}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-primary">
                          {sr.ref > 0 ? secToMMSS(sr.ref) : '—'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {sr.isOverride ? (
                            <Badge variant="outline" className="text-[10px] text-orange-400 border-orange-400/30">override</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">derivado</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/30 bg-muted/10">
                    <td className="py-2 px-2 font-bold text-xs">TOTAL <span className="text-muted-foreground font-normal">(run ×8)</span></td>
                    <td className="py-2 px-2 text-center font-mono text-xs text-muted-foreground">
                      {secToMMSS(baseTotal)}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-primary">
                      {secToMMSS(simTotal)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Formula breakdown */}
          <div className="bg-muted/10 border border-border/20 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground text-sm mb-2">Fórmula Aplicada</p>
            <p><code className="text-primary">Ref = Base × {getFactor('tier', simTier).toFixed(2)} (tier) × {getFactor('sex', simSex).toFixed(2)} (sexo) × {getFactor('age', simAge).toFixed(3)} (idade) × {getFactor('division', simDiv).toFixed(2)} (divisão)</code></p>
            <p className="mt-1">Multiplicador total: <span className="text-primary font-bold">
              ×{(getFactor('tier', simTier) * getFactor('sex', simSex) * getFactor('age', simAge) * getFactor('division', simDiv)).toFixed(4)}
            </span></p>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
