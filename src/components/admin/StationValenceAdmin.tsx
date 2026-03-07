import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Save, RotateCcw, Grid3X3 } from 'lucide-react';

interface StationValence {
  id: string;
  station_key: string;
  station_label: string;
  cardio: number;
  forca: number;
  potencia: number;
  anaerobica: number;
  core: number;
  eficiencia: number;
  sort_order: number;
}

const VALENCE_COLUMNS = [
  { key: 'cardio', label: 'Cardio' },
  { key: 'forca', label: 'Força' },
  { key: 'potencia', label: 'Potência' },
  { key: 'anaerobica', label: 'Anaeróbica' },
  { key: 'core', label: 'Core' },
  { key: 'eficiencia', label: 'Eficiência' },
] as const;

type ValenceKey = typeof VALENCE_COLUMNS[number]['key'];

function ValenceCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const colors = [
    'bg-muted text-muted-foreground',
    'bg-amber-500/20 text-amber-400',
    'bg-orange-500/25 text-orange-400',
    'bg-primary/30 text-primary',
  ];

  return (
    <button
      onClick={() => onChange((value + 1) % 4)}
      className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${colors[value]} hover:ring-2 hover:ring-primary/40`}
      title={`Clique para alterar (atual: ${value})`}
    >
      {value}
    </button>
  );
}

export function StationValenceAdmin() {
  const { user } = useAuth();
  const [rows, setRows] = useState<StationValence[]>([]);
  const [original, setOriginal] = useState<StationValence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('station_valence_weights')
      .select('*')
      .order('sort_order');

    if (error) {
      toast.error('Erro ao carregar matriz: ' + error.message);
    } else {
      const typed = (data || []) as unknown as StationValence[];
      setRows(typed);
      setOriginal(JSON.parse(JSON.stringify(typed)));
    }
    setLoading(false);
  }

  function handleChange(id: string, key: ValenceKey, value: number) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [key]: value } : r));
  }

  function hasChanges() {
    return JSON.stringify(rows) !== JSON.stringify(original);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);

    const changed = rows.filter((r, i) => JSON.stringify(r) !== JSON.stringify(original[i]));

    try {
      for (const row of changed) {
        const { error } = await supabase
          .from('station_valence_weights')
          .update({
            cardio: row.cardio,
            forca: row.forca,
            potencia: row.potencia,
            anaerobica: row.anaerobica,
            core: row.core,
            eficiencia: row.eficiencia,
            updated_by: user.id,
          })
          .eq('id', row.id);

        if (error) throw error;
      }

      toast.success(`${changed.length} estação(ões) atualizada(s)`);
      await loadData();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Grid3X3 className="w-5 h-5" />
            Matriz de Pesos: Estações vs. Valências Fisiológicas
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Escala 0 a 3 — clique na célula para alternar o valor
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges() && (
            <button
              onClick={() => setRows(JSON.parse(JSON.stringify(original)))}
              className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desfazer
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges() || saving}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estação / Exercício</th>
              {VALENCE_COLUMNS.map(col => (
                <th key={col.key} className="px-3 py-3 text-center font-medium text-muted-foreground">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{row.station_label}</td>
                {VALENCE_COLUMNS.map(col => (
                  <td key={col.key} className="px-3 py-3 text-center">
                    <div className="flex justify-center">
                      <ValenceCell
                        value={row[col.key]}
                        onChange={(v) => handleChange(row.id, col.key, v)}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
