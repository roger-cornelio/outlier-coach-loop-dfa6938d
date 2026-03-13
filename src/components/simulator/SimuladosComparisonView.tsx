import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Sparkles, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatTime } from './simulatorConstants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

interface SplitData {
  phase: number;
  label: string;
  time_seconds: number;
  type: string;
}

interface SimulationRecord {
  id: string;
  created_at: string;
  division: string;
  total_time: number;
  roxzone_time: number;
  splits_data: SplitData[];
  coach_insights?: string | null;
}

interface Props {
  simulations: SimulationRecord[];
  onBack: () => void;
  onSimulationUpdated: () => void;
}

function formatDelta(seconds: number): string {
  const prefix = seconds > 0 ? '+' : seconds < 0 ? '-' : '';
  return `${prefix}${formatTime(Math.abs(seconds))}`;
}

export function SimuladosComparisonView({ simulations, onBack, onSimulationUpdated }: Props) {
  const sorted = useMemo(
    () => [...simulations].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [simulations]
  );

  const [selectedA, setSelectedA] = useState<string>('');
  const [selectedB, setSelectedB] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Auto-select: A = oldest, B = newest
  useEffect(() => {
    if (sorted.length >= 2) {
      setSelectedA(sorted[0].id);
      setSelectedB(sorted[sorted.length - 1].id);
    } else if (sorted.length === 1) {
      setSelectedA(sorted[0].id);
      setSelectedB('');
    }
  }, [sorted]);

  const simA = simulations.find((s) => s.id === selectedA);
  const simB = selectedB ? simulations.find((s) => s.id === selectedB) : null;
  const isComparison = !!simA && !!simB;

  // Load cached insights when in individual mode
  useEffect(() => {
    if (simA && !simB && simA.coach_insights) {
      setAnalysis(simA.coach_insights);
    } else {
      setAnalysis('');
    }
  }, [selectedA, selectedB, simA]);

  // Build aligned rows by label
  const alignedRows = useMemo(() => {
    if (!simA) return [];
    const splitsA = (simA.splits_data || []) as SplitData[];
    const splitsB = simB ? ((simB.splits_data || []) as SplitData[]) : [];

    const mapA = new Map<string, SplitData>();
    const mapB = new Map<string, SplitData>();
    const orderedLabels: string[] = [];

    for (const s of splitsA) {
      mapA.set(s.label, s);
      if (!orderedLabels.includes(s.label)) orderedLabels.push(s.label);
    }
    for (const s of splitsB) {
      mapB.set(s.label, s);
      if (!orderedLabels.includes(s.label)) orderedLabels.push(s.label);
    }

    return orderedLabels.map((label, i) => ({
      index: i + 1,
      label,
      timeA: mapA.get(label)?.time_seconds ?? null,
      timeB: mapB.get(label)?.time_seconds ?? null,
      type: mapA.get(label)?.type || mapB.get(label)?.type || 'station',
    }));
  }, [simA, simB]);

  const handleGenerate = async () => {
    if (!simA) return;

    // Cache check for individual mode
    if (!simB && simA.coach_insights) {
      setAnalysis(simA.coach_insights);
      return;
    }

    setLoading(true);
    setAnalysis('');

    try {
      const bodyA = {
        division: simA.division,
        date: format(new Date(simA.created_at), 'dd/MM/yyyy', { locale: ptBR }),
        total_time: simA.total_time,
        roxzone_time: simA.roxzone_time,
        splits: simA.splits_data,
      };

      const bodyB = simB
        ? {
            division: simB.division,
            date: format(new Date(simB.created_at), 'dd/MM/yyyy', { locale: ptBR }),
            total_time: simB.total_time,
            roxzone_time: simB.roxzone_time,
            splits: simB.splits_data,
          }
        : undefined;

      const { data, error } = await supabase.functions.invoke('generate-simulado-comparison', {
        body: { simulado_a: bodyA, simulado_b: bodyB },
      });

      if (error) throw error;

      const text = data?.analysis || 'Não foi possível gerar o diagnóstico.';
      setAnalysis(text);

      // Cache for individual mode
      if (!simB) {
        await supabase
          .from('simulations')
          .update({ coach_insights: text } as any)
          .eq('id', simA.id);
        onSimulationUpdated();
      }
    } catch (err: any) {
      console.error('Error generating comparison:', err);
      if (err?.status === 429) {
        toast.error('Muitas requisições. Aguarde um momento.');
      } else if (err?.status === 402) {
        toast.error('Créditos insuficientes.');
      } else {
        toast.error('Erro ao gerar diagnóstico. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const optionLabel = (sim: SimulationRecord) =>
    `${sim.division} — ${format(new Date(sim.created_at), 'dd/MM/yyyy', { locale: ptBR })} — ${formatTime(sim.total_time)}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-bold">Comparar Simulados</h2>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Simulado Base (A)
          </label>
          <Select value={selectedA} onValueChange={(v) => setSelectedA(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar simulado..." />
            </SelectTrigger>
            <SelectContent>
              {simulations.map((sim) => (
                <SelectItem key={sim.id} value={sim.id} disabled={sim.id === selectedB}>
                  {optionLabel(sim)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Simulado Comparativo (B)
          </label>
          <Select value={selectedB} onValueChange={(v) => setSelectedB(v === '__none__' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="(opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum (modo individual)</SelectItem>
              {simulations.map((sim) => (
                <SelectItem key={sim.id} value={sim.id} disabled={sim.id === selectedA}>
                  {optionLabel(sim)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comparison Table */}
      {simA && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">#</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Fase</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Tempo A</th>
                    {isComparison && (
                      <>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Tempo B</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Δ</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {alignedRows.map((row) => {
                    const delta = row.timeA != null && row.timeB != null ? row.timeB - row.timeA : null;
                    const deltaColor =
                      delta != null && delta < 0
                        ? 'text-green-500'
                        : delta != null && delta > 0
                          ? 'text-red-500'
                          : 'text-muted-foreground';

                    return (
                      <tr
                        key={row.label}
                        className={`border-t border-border/50 ${row.type === 'run' ? 'bg-blue-500/5' : ''}`}
                      >
                        <td className="py-1.5 px-3 text-muted-foreground text-xs">{row.index}</td>
                        <td className="py-1.5 px-3 text-xs font-medium">{row.label}</td>
                        <td className="py-1.5 px-3 text-right font-mono text-xs">
                          {row.timeA != null ? formatTime(row.timeA) : '—'}
                        </td>
                        {isComparison && (
                          <>
                            <td className="py-1.5 px-3 text-right font-mono text-xs">
                              {row.timeB != null ? formatTime(row.timeB) : '—'}
                            </td>
                            <td className={`py-1.5 px-3 text-right font-mono font-bold text-xs ${deltaColor}`}>
                              {delta != null ? (
                                <span className="inline-flex items-center gap-1">
                                  {delta < 0 ? <TrendingDown className="w-3 h-3" /> : delta > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                  {formatDelta(delta)}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}

                  {/* Summary rows */}
                  <tr className="border-t-2 border-border bg-muted/30 font-bold">
                    <td className="py-2 px-3 text-xs" colSpan={1}></td>
                    <td className="py-2 px-3 text-xs">Total</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-primary">
                      {formatTime(simA.total_time)}
                    </td>
                    {isComparison && simB && (
                      <>
                        <td className="py-2 px-3 text-right font-mono text-xs text-primary">
                          {formatTime(simB.total_time)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono text-xs ${
                            simB.total_time - simA.total_time < 0
                              ? 'text-green-500'
                              : simB.total_time - simA.total_time > 0
                                ? 'text-red-500'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {formatDelta(simB.total_time - simA.total_time)}
                        </td>
                      </>
                    )}
                  </tr>
                  <tr className="border-t border-border/50 bg-muted/30 font-bold">
                    <td className="py-2 px-3 text-xs" colSpan={1}></td>
                    <td className="py-2 px-3 text-xs">Roxzone</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-accent">
                      {formatTime(simA.roxzone_time)}
                    </td>
                    {isComparison && simB && (
                      <>
                        <td className="py-2 px-3 text-right font-mono text-xs text-accent">
                          {formatTime(simB.roxzone_time)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono text-xs ${
                            simB.roxzone_time - simA.roxzone_time < 0
                              ? 'text-green-500'
                              : simB.roxzone_time - simA.roxzone_time > 0
                                ? 'text-red-500'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {formatDelta(simB.roxzone_time - simA.roxzone_time)}
                        </td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Generate Button */}
      {simA && (
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full gap-2"
          size="lg"
        >
          <Sparkles className="w-4 h-4" />
          {loading ? 'Gerando Diagnóstico...' : '✨ Gerar Diagnóstico de Evolução'}
        </Button>
      )}

      {/* Loading skeleton */}
      {loading && (
        <Card className="p-6 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-6 w-2/3 mt-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </Card>
      )}

      {/* Analysis result */}
      {analysis && !loading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h3: ({ children }) => (
                    <h3 className="text-orange-500 text-base font-bold mt-4 mb-2">{children}</h3>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-orange-400 font-semibold">{children}</strong>
                  ),
                  p: ({ children }) => (
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="text-muted-foreground text-sm space-y-1 mb-3 list-disc pl-4">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="text-muted-foreground text-sm">{children}</li>
                  ),
                }}
              >
                {analysis}
              </ReactMarkdown>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
