/**
 * MetricsLegend — Legenda consultiva de cores das métricas
 * 
 * Dialog acessível por botão no toolbar do editor.
 * Mostra cada tipo de métrica com o badge real colorido + exemplos de formato.
 */

import { Palette } from 'lucide-react';
import { SEMANTIC_COLORS, type SemanticType } from '@/utils/lineSemanticExtractor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LegendItem {
  type: SemanticType;
  example: string;
  description: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  { type: 'reps',          example: '5×10',        description: 'reps, rounds, séries, cal' },
  { type: 'load',          example: '60kg',        description: 'kg, lb, %, @tempo' },
  { type: 'duration',      example: '5min',        description: 'min, seg, MM:SS, \', "' },
  { type: 'intensity',     example: 'Z2',          description: 'Z1-Z5, PSE, RPE, FC, max' },
  { type: 'cadence',       example: 'pace 5:00',   description: 'pace, rpm, km/h, min/km' },
  { type: 'distance',      example: '400m',        description: 'm, km' },
  { type: 'hyrox_load',    example: '(carga Pro)', description: 'carga pro, open' },
  { type: 'parenthetical', example: '(nota)',      description: 'texto entre parênteses' },
];

export function MetricsLegend() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground">
          <Palette className="w-3.5 h-3.5" />
          Legenda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">📖 Legenda de Métricas</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Compare as cores abaixo com os trechos do treino para verificar se o parser interpretou corretamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {LEGEND_ITEMS.map((item) => {
            const colors = SEMANTIC_COLORS[item.type];
            return (
              <div key={item.type} className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[11px] px-2 py-0.5 font-medium min-w-[80px] justify-center',
                    colors.bg,
                    colors.text,
                    colors.border,
                  )}
                >
                  {item.example}
                </Badge>
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{colors.label}</span>
                  <span className="text-[10px] text-muted-foreground">{item.description}</span>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
