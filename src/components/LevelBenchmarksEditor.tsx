import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertTriangle, Target } from 'lucide-react';
import { toast } from 'sonner';

interface LevelBenchmark {
  id: string;
  division: string;
  gender: string;
  level: string;
  metric: string;
  avg_sec: number;
  p25_sec: number | null;
  p75_sec: number | null;
  benchmark_set_id: string;
  is_active: boolean;
}

const METRICS = [
  { key: 'run_avg', label: 'Corrida (média)' },
  { key: 'roxzone', label: 'Roxzone' },
  { key: 'ski', label: 'Ski Erg' },
  { key: 'sled_push', label: 'Sled Push' },
  { key: 'sled_pull', label: 'Sled Pull' },
  { key: 'bbj', label: 'Burpee BJ' },
  { key: 'row', label: 'Remo' },
  { key: 'farmers', label: 'Farmers' },
  { key: 'sandbag', label: 'Sandbag' },
  { key: 'wallballs', label: 'Wall Balls' },
];

const LEVELS = [
  { key: 'iniciante', label: 'Iniciante' },
  { key: 'intermediario', label: 'Intermediário' },
  { key: 'avancado', label: 'Avançado' },
  { key: 'hyrox_open', label: 'HYROX OPEN' },
  { key: 'hyrox_pro', label: 'HYROX PRO' },
];

// Division values that match the database
const DIVISIONS = [
  { key: 'HYROX PRO', label: 'HYROX PRO' },
  { key: 'HYROX', label: 'HYROX (OPEN)' },
];

const GENDERS = [
  { key: 'M', label: 'Masculino' },
  { key: 'F', label: 'Feminino' },
];

function formatSecondsToMMSS(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseMMSSToSeconds(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  // Handle pure number input (assume seconds if small, minutes if large)
  if (/^\d+$/.test(value.trim())) {
    const num = parseInt(value.trim(), 10);
    return num;
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

export function LevelBenchmarksEditor() {
  const [division, setDivision] = useState('HYROX PRO');
  const [gender, setGender] = useState('F');
  const [level, setLevel] = useState('iniciante');
  const [benchmarks, setBenchmarks] = useState<LevelBenchmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, { avg: string; p25: string; p75: string }>>({});

  useEffect(() => {
    fetchBenchmarks();
  }, [division, gender, level]);

  async function fetchBenchmarks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('performance_level_benchmarks')
        .select('*')
        .eq('division', division)
        .eq('gender', gender)
        .eq('level', level)
        .eq('is_active', true)
        .eq('benchmark_set_id', 'v1');

      if (error) throw error;

      setBenchmarks(data || []);
      
      // Initialize edit values
      const initial: Record<string, { avg: string; p25: string; p75: string }> = {};
      (data || []).forEach(b => {
        initial[b.metric] = {
          avg: formatSecondsToMMSS(b.avg_sec),
          p25: formatSecondsToMMSS(b.p25_sec),
          p75: formatSecondsToMMSS(b.p75_sec),
        };
      });
      setEditedValues(initial);
    } catch (err) {
      console.error('Error fetching benchmarks:', err);
      toast.error('Erro ao carregar benchmarks');
    } finally {
      setLoading(false);
    }
  }

  function handleValueChange(metric: string, field: 'avg' | 'p25' | 'p75', value: string) {
    setEditedValues(prev => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [field]: value,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const metric of METRICS) {
        const values = editedValues[metric.key];
        if (!values) continue;

        const avgSec = parseMMSSToSeconds(values.avg);
        const p25Sec = parseMMSSToSeconds(values.p25);
        const p75Sec = parseMMSSToSeconds(values.p75);

        if (avgSec === null || avgSec <= 0) {
          toast.error(`Tempo médio inválido para ${metric.label}`);
          continue;
        }

        // Validate p25 < avg < p75
        if (p25Sec !== null && p25Sec > avgSec) {
          toast.error(`${metric.label}: p25 deve ser menor que a média`);
          continue;
        }
        if (p75Sec !== null && p75Sec < avgSec) {
          toast.error(`${metric.label}: p75 deve ser maior que a média`);
          continue;
        }

        const existing = benchmarks.find(b => b.metric === metric.key);

        if (existing) {
          const { error } = await supabase
            .from('performance_level_benchmarks')
            .update({
              avg_sec: avgSec,
              p25_sec: p25Sec,
              p75_sec: p75Sec,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('performance_level_benchmarks')
            .insert({
              division,
              gender,
              level,
              metric: metric.key,
              avg_sec: avgSec,
              p25_sec: p25Sec,
              p75_sec: p75Sec,
              benchmark_set_id: 'v1',
            });

          if (error) throw error;
        }
      }

      toast.success('Benchmarks salvos com sucesso');
      fetchBenchmarks();
    } catch (err) {
      console.error('Error saving benchmarks:', err);
      toast.error('Erro ao salvar benchmarks');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Benchmarks por Nível (v1)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning Banner */}
        <Alert variant="default" className="bg-amber-500/10 border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <AlertDescription className="text-amber-200">
            Estas referências são usadas apenas para comparação visual. Não alteram percentis históricos.
          </AlertDescription>
        </Alert>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Divisão</label>
            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-[200]">
                {DIVISIONS.map(d => (
                  <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Gênero</label>
            <Select value={gender} onValueChange={setGender}>
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

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Nível</label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-[200]">
                {LEVELS.map(l => (
                  <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metrics Editor */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-3 text-sm font-medium text-muted-foreground px-2">
              <div>Métrica</div>
              <div className="text-center">Média (mm:ss)</div>
              <div className="text-center">P25 (mm:ss)</div>
              <div className="text-center">P75 (mm:ss)</div>
            </div>
            
            {METRICS.map(metric => {
              const values = editedValues[metric.key] || { avg: '', p25: '', p75: '' };
              const hasData = benchmarks.some(b => b.metric === metric.key);
              
              return (
                <div 
                  key={metric.key} 
                  className="grid grid-cols-4 gap-3 items-center p-2 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{metric.label}</span>
                    {hasData && (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                        v1
                      </Badge>
                    )}
                  </div>
                  <Input
                    value={values.avg}
                    onChange={(e) => handleValueChange(metric.key, 'avg', e.target.value)}
                    placeholder="0:00"
                    className="text-center bg-background/50 h-9"
                  />
                  <Input
                    value={values.p25}
                    onChange={(e) => handleValueChange(metric.key, 'p25', e.target.value)}
                    placeholder="0:00"
                    className="text-center bg-background/50 h-9"
                  />
                  <Input
                    value={values.p75}
                    onChange={(e) => handleValueChange(metric.key, 'p75', e.target.value)}
                    placeholder="0:00"
                    className="text-center bg-background/50 h-9"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
