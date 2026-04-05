/**
 * MetricsLegend — Legenda consultiva de cores das métricas
 * 
 * Dialog acessível por botão próximo ao badge de cobertura.
 * Mostra cada tipo de métrica com o badge real colorido + exemplos de formato + dicas.
 */

import { Palette, Lightbulb } from 'lucide-react';
import { SEMANTIC_COLORS, type SemanticType } from '@/utils/lineSemanticExtractor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LegendItem {
  type: SemanticType;
  example: string;
  formats: string;
  tip: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  {
    type: 'reps',
    example: '5×10',
    formats: '5x10, 4×8, 3 rounds, 10 reps, 30 cal, 25/20 cal',
    tip: 'Use "×" ou "x" entre séries e reps. Para calorias, adicione "cal" após o número.',
  },
  {
    type: 'load',
    example: '60kg',
    formats: '60kg, 32/24kg, 70%, 60lb, @80kg, @75%, @3010',
    tip: 'Sempre inclua a unidade (kg, lb ou %). Use @ para tempo sob tensão (ex: @3010).',
  },
  {
    type: 'duration',
    example: '5min',
    formats: '5min, 30seg, 1:30, 12:00, 45", 5\', 1\'30"',
    tip: 'Use "min", "seg" ou formato MM:SS. Aspas simples (\') = minutos, duplas (") = segundos.',
  },
  {
    type: 'intensity',
    example: 'Z2',
    formats: 'Z1-Z5, PSE 7, RPE 8, FC 150, zona 3, max',
    tip: 'Use Z1 a Z5 para zonas de treino. PSE/RPE seguidos do número.',
  },
  {
    type: 'cadence',
    example: 'pace 5:00',
    formats: 'pace 5:00, pace 4:30/km, 80 rpm, 25 km/h, 07:15–05:36',
    tip: 'Use "pace" antes do valor. Faixas como 07:15–05:36 são detectadas em linhas de cardio.',
  },
  {
    type: 'distance',
    example: '400m',
    formats: '400m, 1000m, 5km, 1.5km',
    tip: 'Sempre inclua "m" ou "km" após o número.',
  },
  {
    type: 'hyrox_load',
    example: '(carga Pro)',
    formats: '(carga pro), (carga open)',
    tip: 'Escreva entre parênteses para indicar carga específica HYROX.',
  },
  {
    type: 'parenthetical',
    example: '(nota)',
    formats: '(unilateral), (cada lado), (com pausa)',
    tip: 'Qualquer texto entre parênteses que não seja carga HYROX vira nota.',
  },
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
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">📖 Legenda de Métricas</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            O sistema lê o texto do treino e identifica automaticamente cada tipo de métrica, destacando com a cor correspondente. Compare as cores abaixo com os trechos do treino para verificar se interpretou corretamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {LEGEND_ITEMS.map((item) => {
            const colors = SEMANTIC_COLORS[item.type];
            return (
              <div key={item.type} className="space-y-1">
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[11px] px-2 py-0.5 font-medium min-w-[80px] justify-center shrink-0',
                      colors.bg,
                      colors.text,
                      colors.border,
                    )}
                  >
                    {item.example}
                  </Badge>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold">{colors.label}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{item.formats}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/80 pl-[92px] leading-tight italic">
                  💡 {item.tip}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 rounded-md bg-muted/50 border border-border/50">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[11px] text-muted-foreground space-y-1">
              <p className="font-medium text-foreground/80">Como melhorar a interpretação</p>
              <p>• Sempre use unidade após números: <span className="font-mono">60kg</span>, não apenas <span className="font-mono">60</span></p>
              <p>• Para pace, escreva <span className="font-mono">pace 5:00</span> em vez de só <span className="font-mono">5:00</span></p>
              <p>• Zonas de treino: use <span className="font-mono">Z1</span> a <span className="font-mono">Z5</span> (letra maiúscula + número)</p>
              <p>• Se a cor de um trecho parecer errada, reformule para o formato sugerido acima</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
