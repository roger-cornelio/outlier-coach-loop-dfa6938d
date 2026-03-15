/**
 * TargetSplitsTable — Tabela interativa de target splits
 * Input de tempo total alvo → recalcula splits por estação
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ELITE_WEIGHTS, STATION_LABELS, MOCK_CURRENT_PRS, 
  formatEvolutionTime, parseTimeInput 
} from '@/utils/evolutionUtils';
import { Crosshair, Download } from 'lucide-react';

export function TargetSplitsTable() {
  const [targetInput, setTargetInput] = useState('01:08:00');
  const targetSec = useMemo(() => parseTimeInput(targetInput), [targetInput]);

  const stations = Object.keys(ELITE_WEIGHTS);

  const rows = useMemo(() => {
    if (!targetSec || targetSec <= 0) return null;
    return stations.map((key) => {
      const weight = ELITE_WEIGHTS[key];
      const targetSplit = Math.round(targetSec * weight);
      const currentPR = MOCK_CURRENT_PRS[key];
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
  }, [targetSec, stations]);

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
        {/* Input de meta */}
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

        {/* Tabela */}
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

        {/* Export button */}
        <Button variant="outline" size="sm" className="w-full border-border/20 text-muted-foreground" disabled>
          <Download className="w-4 h-4 mr-1" />
          Exportar Target
        </Button>
      </CardContent>
    </Card>
  );
}
