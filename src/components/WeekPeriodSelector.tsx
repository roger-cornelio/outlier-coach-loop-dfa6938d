/**
 * WeekPeriodSelector - Seletor de semana obrigatório para salvar/publicar treinos
 * 
 * REGRA ANTI-BUG:
 * - PROIBIDO salvar treino sem semana definida
 * - Coach deve SEMPRE selecionar manualmente a semana de referência
 * - Nunca aplicar defaults automáticos
 */

import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface WeekPeriod {
  startDate: string; // YYYY-MM-DD (Monday)
  endDate: string;   // YYYY-MM-DD (Sunday)
  label: string;     // "17/02 - 23/02"
}

interface WeekPeriodSelectorProps {
  selectedWeek: WeekPeriod | null;
  onWeekSelect: (week: WeekPeriod | null) => void;
  className?: string;
}

function getWeekPeriod(baseDate: Date): WeekPeriod {
  const monday = startOfWeek(baseDate, { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);
  
  return {
    startDate: format(monday, 'yyyy-MM-dd'),
    endDate: format(sunday, 'yyyy-MM-dd'),
    label: `${format(monday, 'dd/MM', { locale: ptBR })} - ${format(sunday, 'dd/MM', { locale: ptBR })}`,
  };
}

export function WeekPeriodSelector({ selectedWeek, onWeekSelect, className }: WeekPeriodSelectorProps) {
  const [viewOffset, setViewOffset] = useState(0);
  
  // Generate week options (current week + 4 weeks ahead and 1 week back from view offset)
  const weekOptions = useMemo(() => {
    const baseDate = new Date();
    const offsetDate = addWeeks(baseDate, viewOffset);
    const weeks: WeekPeriod[] = [];
    
    for (let i = -1; i <= 4; i++) {
      const weekDate = addWeeks(offsetDate, i);
      weeks.push(getWeekPeriod(weekDate));
    }
    
    return weeks;
  }, [viewOffset]);

  const currentWeekPeriod = getWeekPeriod(new Date());
  
  const isSelected = (week: WeekPeriod) => 
    selectedWeek?.startDate === week.startDate;
  
  const isCurrentWeek = (week: WeekPeriod) => 
    week.startDate === currentWeekPeriod.startDate;

  return (
    <Card className={cn("border-amber-500/30 bg-amber-500/5", className)}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-medium text-foreground text-sm">Semana de Referência (Obrigatório)</p>
            <p className="text-xs text-muted-foreground">
              Selecione a semana para a qual esta programação se aplica. Os dias (Seg-Dom) serão mapeados para as datas reais dessa semana.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewOffset(prev => prev - 1)}
              className="h-8"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            
            {viewOffset !== 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewOffset(0)}
                className="h-8 text-xs text-muted-foreground"
              >
                Voltar para hoje
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewOffset(prev => prev + 1)}
              className="h-8"
            >
              Próxima
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Week Options */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {weekOptions.map((week) => (
              <button
                key={week.startDate}
                onClick={() => onWeekSelect(isSelected(week) ? null : week)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  "hover:border-primary/50 hover:bg-primary/5",
                  isSelected(week) 
                    ? "border-primary bg-primary/10 ring-2 ring-primary/20" 
                    : "border-border bg-background",
                  isCurrentWeek(week) && !isSelected(week) && "border-green-500/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className={cn(
                    "w-4 h-4",
                    isSelected(week) ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    isSelected(week) ? "text-primary" : "text-foreground"
                  )}>
                    {week.label}
                  </span>
                </div>
                {isCurrentWeek(week) && (
                  <span className="text-xs text-green-500 mt-1 block">Semana atual</span>
                )}
              </button>
            ))}
          </div>

          {/* Selected Week Display */}
          {selectedWeek && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Semana selecionada: {selectedWeek.label}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                ({selectedWeek.startDate} → {selectedWeek.endDate})
              </span>
            </div>
          )}

          {!selectedWeek && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">
                Selecione uma semana para continuar
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


