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
import { Crosshair, Lock, Map } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RacePlanCard, type RacePlanRow } from './RacePlanCard';

interface TargetSplitsTableProps {
  splits?: Split[];
  finishTime?: string | null;
  title?: string;
  prColumnLabel?: string;
  targetColumnLabel?: string;
  emptyMessage?: string;
  /** Warning banner shown above the table */
  warningMessage?: string;
}

export function TargetSplitsTable({ splits, finishTime, title, prColumnLabel, targetColumnLabel, emptyMessage, warningMessage }: TargetSplitsTableProps) {
  const initialTarget = finishTime || '01:08:00';
  const [targetInput, setTargetInput] = useState(initialTarget);
  const [showPlanModal, setShowPlanModal] = useState(false);

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

  const finishTimeSec = useMemo(() => finishTime ? parseTimeInput(finishTime) : null, [finishTime]);

  const totals = useMemo(() => {
    if (!rows) return null;
    const totalTarget = rows.reduce((s, r) => s + r.targetSplit, 0);
    const officialPR = finishTimeSec || rows.reduce((s, r) => s + r.currentPR, 0);
    const diff = officialPR - totalTarget;
    const hasAnyPR = rows.some(r => r.hasPR);
    return { totalPR: officialPR, totalTarget, diff, hasAnyPR };
  }, [rows, finishTimeSec]);

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
          {title || 'Target Splits'}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {finishTime
            ? `Sua prova atual: ${finishTime} · Defina seu tempo-alvo abaixo`
            : 'Defina seu tempo-alvo e veja o split necessário em cada estação'}
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
                  <TableHead className="text-xs h-9 text-right">Última Prova</TableHead>
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
                {totals && (
                  <TableRow className="border-t-2 border-border/30 bg-muted/10">
                    <TableCell className="text-xs py-2 font-bold">Total</TableCell>
                    <TableCell className="text-xs py-2 text-right font-mono font-bold text-foreground">
                      {totals.hasAnyPR ? formatEvolutionTime(totals.totalPR) : '—'}
                    </TableCell>
                    <TableCell className="text-xs py-2 text-right font-mono font-bold text-amber-500">
                      {formatEvolutionTime(totals.totalTarget)}
                    </TableCell>
                    <TableCell className={`text-xs py-2 text-right font-mono font-bold ${
                      !totals.hasAnyPR ? 'text-muted-foreground' : totals.diff <= 0 ? 'text-emerald-500' : 'text-red-400'
                    }`}>
                      {totals.hasAnyPR ? (totals.diff > 0 ? `-${formatEvolutionTime(totals.diff)}` : `+${formatEvolutionTime(Math.abs(totals.diff))}`) : '—'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            Insira um tempo válido no formato HH:MM:SS
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full border-border/20 gap-2"
          onClick={() => {
            if (!rows) return;
            const planRows: RacePlanRow[] = rows.map(r => ({
              key: r.key,
              label: r.label,
              targetSplit: r.targetSplit,
              isRun: r.isRun,
            }));
            const totalT = planRows.reduce((s, r) => s + r.targetSplit, 0);
            localStorage.setItem('outlier_race_plan', JSON.stringify({
              targetTime: targetInput,
              rows: planRows,
              totalTarget: totalT,
            }));
            setShowPlanModal(true);
          }}
          disabled={!rows}
        >
          <Map className="w-4 h-4" />
          Gerar Plano de Prova
        </Button>

        {/* Plan Modal */}
        <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
          <DialogContent className="max-w-md p-4 bg-background">
            <DialogHeader>
              <DialogTitle className="text-base">Plano de Prova</DialogTitle>
            </DialogHeader>
            {rows && (
              <RacePlanCard
                targetTime={targetInput}
                rows={rows.map(r => ({ key: r.key, label: r.label, targetSplit: r.targetSplit, isRun: r.isRun }))}
                totalTarget={rows.reduce((s, r) => s + r.targetSplit, 0)}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
