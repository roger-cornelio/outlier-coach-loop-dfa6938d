/**
 * TargetSplitsTable — GPS da Prova
 * 17 linhas na sequência cronológica HYROX (8 corridas + 8 estações + Roxzone)
 * Matching robusto via aliases para qualquer variação de escrita do banco
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ELITE_WEIGHTS_INDIVIDUAL, STATION_LABELS, TARGET_SPLITS_ORDER,
  formatEvolutionTime, parseTimeInput, resolveSplitKey,
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

  // Mapeia splits reais do banco para chaves internas usando aliases
  const prSplits = useMemo(() => {
    if (!splits || splits.length === 0) return null;

    const mapped: Record<string, number> = {};

    splits.forEach(s => {
      const sec = timeToSeconds(s.time);
      const key = resolveSplitKey(s.split_name);
      if (key) {
        mapped[key] = sec;
      }
    });

    return Object.keys(mapped).length > 0 ? mapped : null;
  }, [splits]);

  const targetSec = useMemo(() => parseTimeInput(targetInput), [targetInput]);

  const rows = useMemo(() => {
    if (!targetSec || targetSec <= 0 || !prSplits) return null;
    return TARGET_SPLITS_ORDER.map((key) => {
      const weight = ELITE_WEIGHTS_INDIVIDUAL[key];
      const targetSplit = Math.round(targetSec * weight);
      const currentPR = prSplits[key] || 0;
      const diff = currentPR - targetSplit;
      const isRun = key.startsWith('run_');
      return {
        key,
        label: STATION_LABELS[key] || key,
        currentPR,
        targetSplit,
        diff,
        paceNeeded: diff > 0 ? `-${formatEvolutionTime(diff)}` : `+${formatEvolutionTime(Math.abs(diff))}`,
        isAhead: diff <= 0,
        hasPR: currentPR > 0,
        isRun,
      };
    });
  }, [targetSec, prSplits]);

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
          Defina seu tempo-alvo e veja o split necessário em cada estação — sequência oficial HYROX
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
                  <TableRow
                    key={r.key}
                    className={`border-border/10 ${r.isRun ? 'bg-muted/5' : ''}`}
                  >
                    <TableCell className={`text-xs py-2 font-medium ${r.isRun ? 'text-muted-foreground' : ''}`}>
                      {r.label}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-right font-mono text-muted-foreground">
                      {r.hasPR ? formatEvolutionTime(r.currentPR) : '—'}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-right font-mono font-bold text-amber-500">
                      {formatEvolutionTime(r.targetSplit)}
                    </TableCell>
                    <TableCell className={`text-xs py-2 text-right font-mono font-semibold ${
                      !r.hasPR ? 'text-muted-foreground' : r.isAhead ? 'text-emerald-500' : 'text-red-400'
                    }`}>
                      {r.hasPR ? r.paceNeeded : '—'}
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
