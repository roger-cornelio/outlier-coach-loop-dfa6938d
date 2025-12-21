/**
 * WeekNavigator - Componente para navegação entre semanas
 * 
 * REGRAS:
 * - Semana atual: padrão
 * - Semanas passadas: histórico (read-only)
 * - Semanas futuras: BLOQUEADO para atletas (não podem ver treinos futuros)
 */

import { ChevronLeft, ChevronRight, Calendar, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WeekInfo } from '@/hooks/useAthletePlan';

interface WeekNavigatorProps {
  currentWeek: WeekInfo;
  canNavigateToPast: boolean;
  canNavigateToFuture: boolean;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  isViewingHistory: boolean;
  className?: string;
}

export function WeekNavigator({
  currentWeek,
  canNavigateToPast,
  canNavigateToFuture,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
  isViewingHistory,
  className,
}: WeekNavigatorProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {/* Botão semana anterior */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onPreviousWeek}
        disabled={!canNavigateToPast}
        className="h-8 w-8 p-0"
        title="Semana anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {/* Indicador de semana */}
      <button
        onClick={onCurrentWeek}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
          currentWeek.isCurrent
            ? "bg-primary/10 text-primary border border-primary/20"
            : currentWeek.isFuture
              ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
              : isViewingHistory
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                : "bg-secondary text-foreground border border-border"
        )}
        title={currentWeek.isCurrent ? "Semana atual" : "Clique para voltar à semana atual"}
      >
        {isViewingHistory ? (
          <History className="w-4 h-4" />
        ) : (
          <Calendar className="w-4 h-4" />
        )}
        <span>{currentWeek.label}</span>
        {currentWeek.isCurrent && (
          <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
            ATUAL
          </span>
        )}
        {currentWeek.isFuture && (
          <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">
            PRÓXIMA
          </span>
        )}
        {isViewingHistory && (
          <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded">
            HISTÓRICO
          </span>
        )}
      </button>

      {/* Botão próxima semana - BLOQUEADO para atletas */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onNextWeek}
        disabled={!canNavigateToFuture}
        className="h-8 w-8 p-0"
        title={canNavigateToFuture ? "Próxima semana" : "Treinos futuros não disponíveis"}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
