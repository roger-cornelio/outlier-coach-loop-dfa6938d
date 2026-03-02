/**
 * TargetTimesEditor — Admin editor for level time thresholds
 * 
 * Manages level_time_thresholds table: classification by sex, division, and age group.
 * Admins can edit Elite, Elite Cap (+5%), and Pro Cap (+15%) times.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Timer, Target, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface Threshold {
  id: string;
  sex: string;
  division: string;
  age_min: number;
  age_max: number;
  elite_seconds: number;
  elite_cap_seconds: number;
  pro_cap_seconds: number;
}

const AGE_LABELS: Record<string, string> = {
  '16-24': '16–24',
  '25-29': '25–29',
  '30-34': '30–34',
  '35-39': '35–39',
  '40-44': '40–44',
  '45-49': '45–49',
  '50-54': '50–54',
  '55-59': '55–59',
  '60-64': '60–64',
  '65-99': '65+',
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

function ageKey(t: Threshold): string {
  return `${t.age_min}-${t.age_max}`;
}

type TabSex = 'M' | 'F';
type TabDivision = 'INDIVIDUAL' | 'DOUBLES';

export function TargetTimesEditor() {
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSex, setActiveSex] = useState<TabSex>('M');
  const [activeDivision, setActiveDivision] = useState<TabDivision>('INDIVIDUAL');
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('level_time_thresholds')
      .select('*')
      .eq('is_active', true)
      .eq('version', 'v1')
      .order('age_min', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar thresholds');
      console.error(error);
    } else {
      setThresholds((data || []) as unknown as Threshold[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = thresholds.filter(
    t => t.sex === activeSex && t.division === activeDivision
  );

  const handleChange = (id: string, field: keyof Pick<Threshold, 'elite_seconds' | 'elite_cap_seconds' | 'pro_cap_seconds'>, value: string) => {
    const sec = parseTimeInput(value);
    if (sec === null || sec <= 0) return;
    setThresholds(prev =>
      prev.map(t => t.id === id ? { ...t, [field]: sec } : t)
    );
    setDirty(prev => new Set(prev).add(id));
  };

  const handleSave = async () => {
    if (dirty.size === 0) return;
    setSaving(true);

    const toUpdate = thresholds.filter(t => dirty.has(t.id));
    let hasError = false;

    for (const t of toUpdate) {
      const { error } = await supabase
        .from('level_time_thresholds')
        .update({
          elite_seconds: t.elite_seconds,
          elite_cap_seconds: t.elite_cap_seconds,
          pro_cap_seconds: t.pro_cap_seconds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', t.id);

      if (error) {
        console.error('Update error:', error);
        hasError = true;
      }
    }

    if (hasError) {
      toast.error('Erro ao salvar algumas faixas');
    } else {
      toast.success(`${dirty.size} faixa(s) atualizada(s)!`);
      setDirty(new Set());
    }
    setSaving(false);
  };

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
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Target className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">Classificação por Resultado de Prova</h2>
          <p className="text-sm text-muted-foreground">
            Tempos-alvo por categoria, sexo e faixa etária. Definem ELITE, PRO e OPEN.
          </p>
        </div>
      </div>

      {/* Tab: Sex */}
      <div className="flex gap-2">
        {([
          { key: 'M' as TabSex, label: '♂ Masculino', icon: User },
          { key: 'F' as TabSex, label: '♀ Feminino', icon: User },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSex(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSex === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Division */}
      <div className="flex gap-2">
        {([
          { key: 'INDIVIDUAL' as TabDivision, label: 'Individual', icon: User },
          { key: 'DOUBLES' as TabDivision, label: 'Doubles', icon: Users },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveDivision(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeDivision === tab.key
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 inline mr-1.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" /> Elite
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> Elite até (+5%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Pro até (+15%)
        </span>
        <span className="text-muted-foreground/60">OPEN = acima de Pro</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Idade</th>
              <th className="text-center py-2 px-2 text-xs text-yellow-500 font-medium">Elite</th>
              <th className="text-center py-2 px-2 text-xs text-blue-500 font-medium">Elite até</th>
              <th className="text-center py-2 px-2 text-xs text-green-500 font-medium">Pro até</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => {
              const ak = ageKey(t);
              const isDirty = dirty.has(t.id);
              return (
                <motion.tr
                  key={t.id}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`border-b border-border/10 ${isDirty ? 'bg-primary/5' : ''}`}
                >
                  <td className="py-2 px-2 text-muted-foreground font-mono text-xs">
                    {AGE_LABELS[ak] || ak}
                  </td>
                  {(['elite_seconds', 'elite_cap_seconds', 'pro_cap_seconds'] as const).map(field => (
                    <td key={field} className="py-1 px-1">
                      <div className="flex items-center justify-center gap-1">
                        <Timer className="w-3 h-3 text-muted-foreground/50 shrink-0 hidden sm:block" />
                        <input
                          type="text"
                          defaultValue={secondsToHHMMSS(t[field])}
                          onBlur={(e) => handleChange(t.id, field, e.target.value)}
                          className="w-20 bg-muted/20 border border-border/30 rounded px-2 py-1 text-xs font-mono text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground/50 block text-center">
                        {Math.floor(t[field] / 60)}min
                      </span>
                    </td>
                  ))}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma faixa cadastrada para {activeSex === 'M' ? 'Masculino' : 'Feminino'} / {activeDivision}.
        </p>
      )}

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving || dirty.size === 0}
        className="w-full sm:w-auto"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Salvar {dirty.size > 0 ? `(${dirty.size})` : ''}
      </Button>
    </motion.div>
  );
}
