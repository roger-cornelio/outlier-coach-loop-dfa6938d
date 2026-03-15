/**
 * TargetSplitsTable — Tabela interativa de target splits
 * Input de tempo total alvo → recalcula splits por estação
 * Conectado aos dados reais de tempos_splits
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ELITE_WEIGHTS, STATION_LABELS, 
  formatEvolutionTime, parseTimeInput 
} from '@/utils/evolutionUtils';
import { type Split, timeToSeconds } from '@/components/diagnostico/types';
import { Crosshair, Download, Lock } from 'lucide-react';

interface TargetSplitsTableProps {
  splits?: Split[];
  finishTime?: string | null;
}

export function TargetSplitsTable({ splits, finishTime }: TargetSplitsTableProps) {
  const initialTarget = finishTime || '01:08:00';
  const [targetInput, setTargetInput] = useState(initialTarget);

  // Derive real PRs from splits
  const prSplits = useMemo(() => {
    if (!splits || splits.length === 0) return null;

    const mapped: Record<string, number> = {};
    let runTotal = 0;

    splits.forEach(s => {
      const sec = timeToSeconds(s.time);
      const name = s.split_name;

      if (name.startsWith('Running')) runTotal += sec;
      else if (name === 'Ski Erg') mapped.ski = sec;
      else if (name === 'Sled Push') mapped.sled_push = sec;
      else if (name === 'Sled Pull') mapped.sled_pull = sec;
      else if (name === 'Burpee Broad Jump') mapped.bbj = sec;
      else if (name === 'Rowing') mapped.row = sec;
      else if (name === 'Farmers Carry') mapped.farmers = sec;
      else if (name === 'Sandbag Lunges') mapped.sandbag = sec;
      else if (name === 'Wall Balls') mapped.wall_balls = sec;
      else if (name === 'Roxzone') mapped.roxzone = sec;
    });

    mapped.run_total = runTotal;
    return mapped;
  }, [splits]);

  // Update targetInput when finishTime prop changes
  useMemo(() => {
    if (finishTime) setTargetInput(finishTime);
  }, [finishTime]);

  const targetSec = useMemo(() => parseTimeInput(targetInput), [targetInput]);
  const stations = Object.keys(ELITE_WEIGHTS);

  const rows = useMemo(() => {
    if (!targetSec || targetSec <= 0 || !prSplits) return null;
    return stations.map((key) => {
      const weight = ELITE_WEIGHTS[key];
      const targetSplit = Math.round(targetSec * weight);
      const currentPR = prSplits[key] || 0;
      const diff = currentPR - targetSplit;
      return {
        key,
        label: STATION_LABELS[key],
        currentPR,
        targetSplit,
        diff,
        paceNeeded: diff > 0 ? `-${formatEvolutionTime(diff)}` : `+${formatEvolutionTime(Math.abs(diff))}`,
        isAhead: diff <= 0,
      };
    });
  }, [targetSec, stations, prSplits]);

  if (!prSplits) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/20">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Lock className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Aguardando diagnóstico. Importe uma prova para liberar a inteligência do Target Splits.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Crosshair className="w-5 h-5 text-amber-500" />
          Target Splits
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Defina seu tempo-alvo e veja o split necessário em cada estação
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Tempo-alvo:</label>
          <Input
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="HH:MM:SS"
            className="max-w-[140px] font-mono text-center text-sm bg-muted/10 border-border/20"
          />
          {targetSec && (
            <span className="text-xs text-muted-foreground">
              = {formatEvolutionTime(targetSec)}
            </span>
          )}
        </div>

        {rows ? (
          <div className="rounded-lg border border-border/15 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/10 hover:bg-transparent">
                  <TableHead className="text-xs h-9">Estação</TableHead>
                  <TableHead className="text-xs h-9 text-right">PR Atual</TableHead>
                  <TableHead className="text-xs h-9 text-right">Target</TableHead>
                  <TableHead className="text-xs h-9 text-right">Diferença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.key} className="border-border/10">
                    <TableCell className="text-xs py-2 font-medium">{r.label}</TableCell>
                    <TableCell className="text-xs py-2 text-right font-mono text-muted-foreground">
                      {formatEvolutionTime(r.currentPR)}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-right font-mono font-bold text-amber-500">
                      {formatEvolutionTime(r.targetSplit)}
                    </TableCell>
                    <TableCell className={`text-xs py-2 text-right font-mono font-semibold ${r.isAhead ? 'text-emerald-500' : 'text-red-400'}`}>
                      {r.paceNeeded}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            Insira um tempo válido no formato HH:MM:SS
          </p>
        )}

        <Button variant="outline" size="sm" className="w-full border-border/20 text-muted-foreground" disabled>
          <Download className="w-4 h-4 mr-1" />
          Exportar Target
        </Button>
      </CardContent>
    </Card>
  );
}
