/**
 * AthleteWeekDebugBar - Debug bar específica para navegação semanal do atleta
 * 
 * Visível apenas em dev/preview via:
 * - Ctrl + Shift + D (toggle)
 * - ?debug=1 na URL
 * 
 * Mostra em tempo real:
 * - now, currentWeekStart, selectedWeekStart
 * - minWeekStart, maxWeekStart
 * - hasPlanForSelectedWeek
 * - Botões rápidos de navegação
 */

import { useState, useEffect, forwardRef } from 'react';
import { Bug, ChevronLeft, ChevronRight, RotateCcw, Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AthleteWeekDebugBarProps {
  now: string;
  currentWeekStart: string;
  selectedWeekStart: string;
  minWeekStart: string;
  maxWeekStart: string;
  hasPlanForSelectedWeek: boolean;
  plansFoundWeekStarts: string[];
  onGoToPrev: () => void;
  onGoToCurrent: () => void;
  onGoToNext: () => void;
  onReset: () => void;
  canGoToPrev: boolean;
  canGoToNext: boolean;
}

const DEBUG_STORAGE_KEY = 'ATHLETE_WEEK_DEBUG';

export const AthleteWeekDebugBar = forwardRef<HTMLDivElement, AthleteWeekDebugBarProps>(({
  now,
  currentWeekStart,
  selectedWeekStart,
  minWeekStart,
  maxWeekStart,
  hasPlanForSelectedWeek,
  plansFoundWeekStarts,
  onGoToPrev,
  onGoToCurrent,
  onGoToNext,
  onReset,
  canGoToPrev,
  canGoToNext,
}, ref) => {
  const [isVisible, setIsVisible] = useState(() => {
    // Check URL param
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('debug') === '1') return true;
      // Check localStorage
      return localStorage.getItem(DEBUG_STORAGE_KEY) === '1';
    }
    return false;
  });
  const [isExpanded, setIsExpanded] = useState(true);

  // Keyboard shortcut: Ctrl + Shift + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsVisible(prev => {
          const next = !prev;
          localStorage.setItem(DEBUG_STORAGE_KEY, next ? '1' : '0');
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Only show in dev/preview
  if (import.meta.env.PROD && !window.location.search.includes('debug=1')) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  // Format date for display
  const formatDate = (isoDate: string) => {
    try {
      const d = new Date(isoDate + 'T12:00:00');
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return isoDate;
    }
  };

  // Determine which offset is currently selected
  const getSelectedOffset = (): number => {
    if (selectedWeekStart === minWeekStart) return -1;
    if (selectedWeekStart === currentWeekStart) return 0;
    if (selectedWeekStart === maxWeekStart) return 1;
    return 0;
  };

  const selectedOffset = getSelectedOffset();
  const nowDate = new Date();
  const dayOfWeek = nowDate.getDay();
  const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

  return (
    <div 
      ref={ref}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[99999] bg-black/95 border-t-2 border-yellow-500/50 font-mono text-xs",
        isExpanded ? "" : "h-10"
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-yellow-400 hover:bg-yellow-500/10"
      >
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4" />
          <span className="font-bold">ATHLETE WEEK DEBUG</span>
          <span className="text-white/30">|</span>
          <span className="text-cyan-400">
            {dayNames[dayOfWeek]} {nowDate.toLocaleDateString('pt-BR')}
          </span>
          <span className="text-white/30">|</span>
          <span className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold",
            selectedOffset === -1 ? "bg-amber-500 text-black" :
            selectedOffset === 0 ? "bg-green-500 text-black" :
            "bg-blue-500 text-white"
          )}>
            {selectedOffset === -1 ? "ANTERIOR (-1)" : selectedOffset === 0 ? "ATUAL (0)" : "PRÓXIMA (+1)"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-[10px]">Ctrl+Shift+D para fechar</span>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-white/10 space-y-3">
          {/* Data grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <DataItem 
              label="now (ISO)" 
              value={now} 
              subValue={`${dayNames[dayOfWeek]}`}
              color={dayOfWeek === 0 ? "text-orange-400" : "text-cyan-400"}
            />
            <DataItem 
              label="currentWeekStart" 
              value={currentWeekStart} 
              subValue={formatDate(currentWeekStart)}
              color="text-green-400"
            />
            <DataItem 
              label="selectedWeekStart" 
              value={selectedWeekStart} 
              subValue={formatDate(selectedWeekStart)}
              color="text-blue-400"
            />
            <DataItem 
              label="minWeekStart" 
              value={minWeekStart} 
              subValue={formatDate(minWeekStart)}
              color="text-amber-400"
            />
            <DataItem 
              label="maxWeekStart" 
              value={maxWeekStart} 
              subValue={formatDate(maxWeekStart)}
              color="text-purple-400"
            />
            <DataItem 
              label="hasPlan" 
              value={hasPlanForSelectedWeek ? "SIM" : "NÃO"} 
              color={hasPlanForSelectedWeek ? "text-green-400" : "text-red-400"}
            />
          </div>

          {/* Allowed offsets visualization */}
          <div className="flex items-center gap-2">
            <span className="text-white/50">allowedOffsets:</span>
            <div className="flex gap-1">
              {[-1, 0, 1].map(offset => (
                <span 
                  key={offset}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold",
                    selectedOffset === offset 
                      ? "bg-yellow-500 text-black" 
                      : "bg-white/10 text-white/50"
                  )}
                >
                  {offset}
                </span>
              ))}
            </div>
            <span className="text-white/30">|</span>
            <span className="text-white/50">plansFound:</span>
            <span className="text-cyan-400">
              {plansFoundWeekStarts.length > 0 
                ? plansFoundWeekStarts.map(w => formatDate(w)).join(', ')
                : '(nenhum)'}
            </span>
          </div>

          {/* Quick navigation buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <span className="text-white/50 text-[10px] mr-2">NAVEGAÇÃO RÁPIDA:</span>
            
            <Button
              size="sm"
              variant="outline"
              onClick={onGoToPrev}
              disabled={!canGoToPrev}
              className="h-7 text-xs gap-1 bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30 disabled:opacity-30"
            >
              <ChevronLeft className="w-3 h-3" />
              Semana -1
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onGoToCurrent}
              className={cn(
                "h-7 text-xs gap-1",
                selectedOffset === 0 
                  ? "bg-green-500/30 border-green-500 text-green-400"
                  : "bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30"
              )}
            >
              <Calendar className="w-3 h-3" />
              Semana Atual
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onGoToNext}
              disabled={!canGoToNext}
              className="h-7 text-xs gap-1 bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30 disabled:opacity-30"
            >
              Semana +1
              <ChevronRight className="w-3 h-3" />
            </Button>

            <div className="flex-1" />

            <Button
              size="sm"
              variant="outline"
              onClick={onReset}
              className="h-7 text-xs gap-1 bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for data items
function DataItem({ 
  label, 
  value, 
  subValue, 
  color = "text-white" 
}: { 
  label: string; 
  value: string; 
  subValue?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-white/40 text-[10px]">{label}</span>
      <span className={cn("font-medium", color)}>{value}</span>
      {subValue && <span className="text-white/60 text-[10px]">{subValue}</span>}
    </div>
  );
}
