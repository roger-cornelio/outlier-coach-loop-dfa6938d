import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, ChevronRight, Clock, Trophy, Plus, History, Loader2 } from 'lucide-react';
import { useOutlierBenchmarks, type OutlierLevel } from '@/hooks/useOutlierBenchmarks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

function secToDisplay(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h${String(rm).padStart(2, '0')}m`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const levelColors: Record<OutlierLevel, string> = {
  OPEN: 'text-emerald-400',
  PRO: 'text-blue-400',
  ELITE: 'text-amber-400',
};

const levelBg: Record<OutlierLevel, string> = {
  OPEN: 'bg-emerald-500/15 border-emerald-500/30',
  PRO: 'bg-blue-500/15 border-blue-500/30',
  ELITE: 'bg-amber-500/15 border-amber-500/30',
};

export function OutlierBenchmarksCard() {
  const { benchmarks, loading, submitResult, getProgress, getResults, levelSummary } = useOutlierBenchmarks();
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string | null>(null);
  const [resultInput, setResultInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/20">
            <Dumbbell className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-display text-xl">Benchmarks OUTLIER</h3>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  if (benchmarks.length === 0) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/20">
            <Dumbbell className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-display text-xl">Benchmarks OUTLIER</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhum benchmark disponível ainda. Em breve você poderá testar e medir sua evolução.
        </p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!selectedBenchmarkId || !resultInput) return;
    const parts = resultInput.split(':');
    let totalSec: number;
    if (parts.length === 2) {
      totalSec = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else {
      totalSec = parseInt(resultInput);
    }
    if (isNaN(totalSec) || totalSec <= 0) {
      toast.error('Formato inválido. Use m:ss ou segundos.');
      return;
    }
    setSubmitting(true);
    const res = await submitResult(selectedBenchmarkId, totalSec, notesInput || undefined);
    setSubmitting(false);
    if (res) {
      toast.success('Resultado registrado!');
      setSelectedBenchmarkId(null);
      setResultInput('');
      setNotesInput('');
    } else {
      toast.error('Erro ao salvar resultado');
    }
  };

  const completedCount = levelSummary.PRO + levelSummary.ELITE;

  return (
    <div className="card-elevated p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Dumbbell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-xl">Benchmarks OUTLIER</h3>
            <p className="text-xs text-muted-foreground">
              Treinos-teste para medir sua evolução
            </p>
          </div>
        </div>

        {/* Level summary pills */}
        <div className="flex gap-1.5">
          {(['ELITE', 'PRO', 'OPEN'] as OutlierLevel[]).map(lv => (
            <span
              key={lv}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${levelBg[lv]} ${levelColors[lv]}`}
            >
              {levelSummary[lv]} {lv}
            </span>
          ))}
        </div>
      </div>

      {/* Benchmark list */}
      <div className="space-y-2">
        {benchmarks.map(b => {
          const prog = getProgress(b.id);
          const level = (prog?.level_reached || 'OPEN') as OutlierLevel;
          const results = getResults(b.id);
          const isHistoryOpen = showHistory === b.id;

          return (
            <div key={b.id} className="bg-muted/30 border border-border/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{b.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {b.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {prog?.best_seconds && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        Melhor: <span className="font-mono text-foreground">{secToDisplay(prog.best_seconds)}</span>
                      </span>
                    )}
                    <span className={`text-[10px] font-bold ${levelColors[level]}`}>
                      {level}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* History button */}
                  {results.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setShowHistory(isHistoryOpen ? null : b.id)}
                    >
                      <History className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {/* Record result */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setSelectedBenchmarkId(b.id)}>
                        <Plus className="w-3 h-3" />
                        Registrar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Registrar Resultado — {b.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 pt-2">
                        <div>
                          <Label className="text-xs">Tempo (m:ss ou segundos)</Label>
                          <Input
                            value={resultInput}
                            onChange={e => setResultInput(e.target.value)}
                            placeholder="12:30"
                            className="font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Notas (opcional)</Label>
                          <Input
                            value={notesInput}
                            onChange={e => setNotesInput(e.target.value)}
                            placeholder="Condições, sensações..."
                          />
                        </div>
                        <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Salvar Resultado
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* History expand */}
              <AnimatePresence>
                {isHistoryOpen && results.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                      {results.slice(0, 10).map(r => (
                        <div key={r.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="font-mono text-foreground">{secToDisplay(r.result_seconds)}</span>
                          {r.notes && <span className="text-muted-foreground truncate max-w-[120px]">{r.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Journey progress summary */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Benchmarks concluídos (PRO+)</span>
          <span className="font-display font-bold text-primary">
            {completedCount} / {levelSummary.total}
          </span>
        </div>
      </div>
    </div>
  );
}
