/**
 * ClassificationAdminEditor — Admin editor for benchmarks_elite_pro and division_factors.
 * 
 * Two sections:
 * 1. Elite PRO benchmarks by sex/age
 * 2. Division factors (multipliers)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Timer, Sliders, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface Benchmark {
  id: string;
  sex: string;
  age_min: number;
  age_max: number;
  elite_pro_seconds: number;
}

interface Factor {
  id: string;
  division: string;
  factor: number;
}

const AGE_LABELS: Record<string, string> = {
  '16-24': '16–24', '25-29': '25–29', '30-34': '30–34', '35-39': '35–39',
  '40-44': '40–44', '45-49': '45–49', '50-54': '50–54', '55-59': '55–59',
  '60-64': '60–64', '65-99': '65+',
};

function secondsToHHMMSS(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseTimeInput(input: string): number | null {
  const parts = input.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

type TabSex = 'M' | 'F';

export function ClassificationAdminEditor() {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSex, setActiveSex] = useState<TabSex>('M');
  const [dirtyBench, setDirtyBench] = useState<Set<string>>(new Set());
  const [dirtyFactor, setDirtyFactor] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const [bRes, fRes] = await Promise.all([
      supabase.from('benchmarks_elite_pro').select('*').eq('is_active', true).eq('version', 'v1').order('age_min'),
      supabase.from('division_factors').select('*').eq('is_active', true).eq('version', 'v1').order('division'),
    ]);
    if (bRes.data) setBenchmarks(bRes.data as unknown as Benchmark[]);
    if (fRes.data) setFactors(fRes.data as unknown as Factor[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredBench = benchmarks.filter(b => b.sex === activeSex);

  const handleBenchChange = (id: string, value: string) => {
    const sec = parseTimeInput(value);
    if (sec === null || sec <= 0) return;
    setBenchmarks(prev => prev.map(b => b.id === id ? { ...b, elite_pro_seconds: sec } : b));
    setDirtyBench(prev => new Set(prev).add(id));
  };

  const handleFactorChange = (id: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0 || num > 2) return;
    setFactors(prev => prev.map(f => f.id === id ? { ...f, factor: num } : f));
    setDirtyFactor(prev => new Set(prev).add(id));
  };

  const handleSave = async () => {
    setSaving(true);
    let hasError = false;

    // Save benchmarks
    for (const b of benchmarks.filter(b => dirtyBench.has(b.id))) {
      const { error } = await supabase
        .from('benchmarks_elite_pro')
        .update({ elite_pro_seconds: b.elite_pro_seconds, updated_at: new Date().toISOString() })
        .eq('id', b.id);
      if (error) hasError = true;
    }

    // Save factors
    for (const f of factors.filter(f => dirtyFactor.has(f.id))) {
      const { error } = await supabase
        .from('division_factors')
        .update({ factor: f.factor, updated_at: new Date().toISOString() })
        .eq('id', f.id);
      if (error) hasError = true;
    }

    if (hasError) {
      toast.error('Erro ao salvar alguns valores');
    } else {
      const total = dirtyBench.size + dirtyFactor.size;
      toast.success(`${total} valor(es) atualizado(s)!`);
      setDirtyBench(new Set());
      setDirtyFactor(new Set());
    }
    setSaving(false);
  };

  const totalDirty = dirtyBench.size + dirtyFactor.size;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Section 1: Elite PRO Benchmarks */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Timer className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-base font-display font-bold text-foreground">Benchmarks Elite PRO</h3>
            <p className="text-xs text-muted-foreground">
              Tempo base de referência por sexo e faixa etária. Fator 1.00 = divisão PRO.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {(['M', 'F'] as TabSex[]).map(s => (
            <button
              key={s}
              onClick={() => setActiveSex(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSex === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {s === 'M' ? '♂ Masculino' : '♀ Feminino'}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Idade</th>
                <th className="text-center py-2 px-2 text-xs text-primary font-medium">Elite PRO (base)</th>
                <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">≈ minutos</th>
              </tr>
            </thead>
            <tbody>
              {filteredBench.map((b, i) => {
                const ak = `${b.age_min}-${b.age_max}`;
                return (
                  <tr key={b.id} className={`border-b border-border/10 ${dirtyBench.has(b.id) ? 'bg-primary/5' : ''}`}>
                    <td className="py-2 px-2 text-muted-foreground font-mono text-xs">{AGE_LABELS[ak] || ak}</td>
                    <td className="py-1 px-1 text-center">
                      <input
                        type="text"
                        defaultValue={secondsToHHMMSS(b.elite_pro_seconds)}
                        onBlur={e => handleBenchChange(b.id, e.target.value)}
                        className="w-24 bg-muted/20 border border-border/30 rounded px-2 py-1 text-xs font-mono text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td className="py-2 px-2 text-center text-[10px] text-muted-foreground">
                      {Math.floor(b.elite_pro_seconds / 60)}min
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Division Factors */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Sliders className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-base font-display font-bold text-foreground">Fatores de Divisão</h3>
            <p className="text-xs text-muted-foreground">
              Multiplicador aplicado ao benchmark base. PRO = 1.00, OPEN = 1.03 (+3%), DOUBLES = 0.94 (−6%).
            </p>
          </div>
        </div>

        <div className="grid gap-3 max-w-md">
          {factors.map(f => (
            <div key={f.id} className={`flex items-center gap-3 bg-card/60 border border-border/30 rounded-lg p-3 ${dirtyFactor.has(f.id) ? 'bg-primary/5' : ''}`}>
              <span className="text-sm font-mono font-bold text-foreground w-20">{f.division}</span>
              <span className="text-xs text-muted-foreground">×</span>
              <input
                type="text"
                defaultValue={f.factor.toString()}
                onBlur={e => handleFactorChange(f.id, e.target.value)}
                className="w-20 bg-muted/20 border border-border/30 rounded px-2 py-1 text-sm font-mono text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[10px] text-muted-foreground">
                {f.factor === 1 ? '(referência)' : f.factor > 1 ? `(+${Math.round((f.factor - 1) * 100)}%)` : `(${Math.round((f.factor - 1) * 100)}%)`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Classification Logic Summary */}
      <div className="bg-muted/10 border border-border/20 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-sm mb-2">Lógica de Classificação</p>
        <p>1. <code className="text-primary">elite_adjusted = elite_pro × fator_divisão</code></p>
        <p>2. <code className="text-primary">gap = (tempo_atleta − elite_adjusted) / elite_adjusted</code></p>
        <p>3. Gap ≤ 5% → <span className="text-yellow-400 font-bold">ELITE</span> · Gap ≤ 15% → <span className="text-blue-400 font-bold">PRO</span> · Gap {'>'} 15% → <span className="text-emerald-400 font-bold">OPEN</span></p>
      </div>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving || totalDirty === 0}
        className="w-full sm:w-auto"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Salvar {totalDirty > 0 ? `(${totalDirty})` : ''}
      </Button>
    </motion.div>
  );
}
