/**
 * TargetTimesEditor — Admin editor for level target times
 * 
 * Allows admins to configure target race times per level and gender.
 * These times are shown to athletes as "Meta de resultado" in their dashboard.
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Timer, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface LevelTargetTimes {
  open: { masculino: number; feminino: number };
  pro: { masculino: number; feminino: number };
  elite: { masculino: number; feminino: number };
}

const DEFAULT_TARGETS: LevelTargetTimes = {
  open: { masculino: 4200, feminino: 4500 },
  pro: { masculino: 3960, feminino: 4200 },
  elite: { masculino: 3960, feminino: 4200 },
};

const LEVEL_LABELS: Record<string, string> = {
  open: 'OPEN',
  pro: 'PRO',
  elite: 'ELITE',
};

function secondsToMMSS(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function mmssToSeconds(input: string): number | null {
  const parts = input.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

export function TargetTimesEditor() {
  const [targets, setTargets] = useState<LevelTargetTimes>(DEFAULT_TARGETS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('system_params')
        .select('value')
        .eq('key', 'level_target_times')
        .single();

      if (data?.value && typeof data.value === 'object') {
        setTargets(data.value as unknown as LevelTargetTimes);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleTimeChange = (level: string, gender: string, value: string) => {
    const sec = mmssToSeconds(value);
    if (sec === null || sec <= 0) return;
    setTargets(prev => ({
      ...prev,
      [level]: { ...prev[level as keyof LevelTargetTimes], [gender]: sec },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('system_params')
      .update({ value: JSON.parse(JSON.stringify(targets)) })
      .eq('key', 'level_target_times');

    if (error) {
      toast.error('Erro ao salvar metas de tempo');
    } else {
      toast.success('Metas de tempo atualizadas!');
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
      <div className="flex items-center gap-3 mb-2">
        <Target className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">Metas de Resultado</h2>
          <p className="text-sm text-muted-foreground">
            Tempos-alvo exibidos para atletas na tela de dashboard. Definem a meta de prova baseada no nível.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {(['open', 'pro', 'elite'] as const).map(level => (
          <div key={level} className="bg-card/60 border border-border/30 rounded-xl p-4">
            <h3 className="font-display font-bold text-foreground mb-3 tracking-wider">
              {LEVEL_LABELS[level]}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {(['masculino', 'feminino'] as const).map(gender => (
                <div key={gender}>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                    {gender === 'masculino' ? '♂ Masculino' : '♀ Feminino'}
                  </label>
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      defaultValue={secondsToMMSS(targets[level][gender])}
                      onBlur={(e) => handleTimeChange(level, gender, e.target.value)}
                      placeholder="MM:SS"
                      className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    {Math.floor(targets[level][gender] / 60)} min
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full sm:w-auto"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Salvar Metas
      </Button>
    </motion.div>
  );
}