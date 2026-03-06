import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, RotateCcw, Calculator } from "lucide-react";
import { toast } from "sonner";

interface MovementPattern {
  id: string;
  name: string;
  formula_type: string;
  moved_mass_percentage: number;
  default_distance_meters: number;
  friction_coefficient: number | null;
  human_efficiency_rate: number;
  default_seconds_per_rep: number | null;
  updated_at: string;
}

type EditableFields = Pick<MovementPattern, "moved_mass_percentage" | "default_distance_meters" | "friction_coefficient" | "human_efficiency_rate" | "default_seconds_per_rep">;

const patternNamePt: Record<string, string> = {
  'Squat/Vertical Push': 'Agachamento / Empurrar Vertical',
  'Hinge/Deadlift': 'Dobradiça / Levantamento',
  'Pull Vertical': 'Puxada Vertical',
  'Total Body Plyometric': 'Pliométrico Corpo Inteiro',
  'Horizontal Sled Friction': 'Sled Horizontal (Fricção)',
  'Isometric': 'Isométrico',
  'Distance Cardio': 'Cardio Distância',
};

const formulaBadge = (type: string) => {
  switch (type) {
    case "vertical_work":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30">Trabalho Vertical</Badge>;
    case "horizontal_friction":
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30">Fricção Horizontal</Badge>;
    case "metabolic":
      return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/30">Metabólico</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
};

export function MovementPatternsAdmin() {
  const [patterns, setPatterns] = useState<MovementPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, Partial<EditableFields>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchPatterns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("movement_patterns")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar patterns: " + error.message);
    } else {
      setPatterns(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPatterns(); }, []);

  const handleEdit = (id: string, field: keyof EditableFields, value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    setEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: numValue },
    }));
  };

  const hasEdits = (id: string) => !!edits[id] && Object.keys(edits[id]).length > 0;

  const handleSave = async (pattern: MovementPattern) => {
    const changes = edits[pattern.id];
    if (!changes) return;

    setSaving(pattern.id);
    const { error } = await supabase
      .from("movement_patterns")
      .update(changes as any)
      .eq("id", pattern.id);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success(`${pattern.name} atualizado`);
      setEdits(prev => { const next = { ...prev }; delete next[pattern.id]; return next; });
      fetchPatterns();
    }
    setSaving(null);
  };

  const handleReset = (id: string) => {
    setEdits(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const getValue = (pattern: MovementPattern, field: keyof EditableFields) => {
    if (edits[pattern.id]?.[field] !== undefined) return edits[pattern.id][field];
    return pattern[field];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Calculator className="w-5 h-5 text-orange-400" />
          <div>
            <CardTitle className="text-lg">Motor Físico — Padrões de Movimento</CardTitle>
            <CardDescription>Constantes biomecânicas usadas pelo motor de Kcal e estimativa de tempo (TUT).</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Nome</TableHead>
              <TableHead>Fórmula</TableHead>
              <TableHead className="text-right">Massa (%)</TableHead>
              <TableHead className="text-right">Distância (m)</TableHead>
              <TableHead className="text-right">Fricção</TableHead>
              <TableHead className="text-right">Eficiência</TableHead>
              <TableHead className="text-right">TUT (s/rep)</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {patterns.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{patternNamePt[p.name] || p.name}</TableCell>
                <TableCell>{formulaBadge(p.formula_type)}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    step="0.01"
                    className="w-20 ml-auto text-right h-8 text-xs"
                    value={getValue(p, "moved_mass_percentage") ?? ""}
                    onChange={e => handleEdit(p.id, "moved_mass_percentage", e.target.value)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    step="0.01"
                    className="w-20 ml-auto text-right h-8 text-xs"
                    value={getValue(p, "default_distance_meters") ?? ""}
                    onChange={e => handleEdit(p.id, "default_distance_meters", e.target.value)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    step="0.01"
                    className="w-20 ml-auto text-right h-8 text-xs"
                    value={getValue(p, "friction_coefficient") ?? ""}
                    onChange={e => handleEdit(p.id, "friction_coefficient", e.target.value)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    step="0.01"
                    className="w-20 ml-auto text-right h-8 text-xs"
                    value={getValue(p, "human_efficiency_rate") ?? ""}
                    onChange={e => handleEdit(p.id, "human_efficiency_rate", e.target.value)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    step="0.01"
                    className="w-20 ml-auto text-right h-8 text-xs"
                    value={getValue(p, "default_seconds_per_rep") ?? ""}
                    onChange={e => handleEdit(p.id, "default_seconds_per_rep", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    {hasEdits(p.id) && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleReset(p.id)}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          className="h-7 w-7 bg-orange-500 hover:bg-orange-600 text-white"
                          disabled={saving === p.id}
                          onClick={() => handleSave(p)}
                        >
                          {saving === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
