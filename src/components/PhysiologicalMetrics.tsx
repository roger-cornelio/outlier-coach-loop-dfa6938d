/**
 * PhysiologicalMetrics - Parâmetros fisiológicos mensuráveis
 * 
 * Exibe VO₂ Max e Limiar de Lactato de forma técnica e premium,
 * separado do radar de valências competitivas.
 * 
 * REGRAS:
 * - Não usar gráficos
 * - Não usar cores de julgamento
 * - Valores legíveis mas não dominantes
 * - Layout limpo e técnico
 */

import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PhysiologicalMetricsProps {
  vo2Max?: number | null;
  vo2MaxSource?: 'estimated' | 'measured';
  lactateThreshold?: number | null; // in seconds per km
  lactateThresholdPercent?: number | null; // as % of VO2
}

/**
 * Formata segundos em pace (min:ss / km)
 */
function formatPace(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PhysiologicalMetrics({
  vo2Max = null,
  vo2MaxSource = 'estimated',
  lactateThreshold = null,
  lactateThresholdPercent = null,
}: PhysiologicalMetricsProps) {
  // Se não há dados, não renderiza
  if (!vo2Max && !lactateThreshold && !lactateThresholdPercent) {
    return null;
  }

  return (
    <div className="mt-6 pt-5 border-t border-border/30">
      <h4 className="text-xs font-medium text-muted-foreground tracking-wider mb-4 uppercase">
        Parâmetros Fisiológicos
      </h4>
      
      <div className="grid grid-cols-2 gap-4">
        {/* VO₂ Max */}
        {vo2Max && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">VO₂ Max</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  Capacidade máxima do sistema aeróbico.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold text-foreground tabular-nums">
                {vo2Max}
              </span>
              <span className="text-xs text-muted-foreground">ml/kg/min</span>
            </div>
            <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
              {vo2MaxSource === 'measured' ? 'medido' : 'estimado'}
            </span>
          </div>
        )}

        {/* Limiar de Lactato */}
        {(lactateThreshold || lactateThresholdPercent) && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Limiar de Lactato</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  Intensidade máxima mantida por períodos prolongados.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-baseline gap-1.5">
              {lactateThreshold ? (
                <>
                  <span className="text-xl font-semibold text-foreground tabular-nums">
                    {formatPace(lactateThreshold)}
                  </span>
                  <span className="text-xs text-muted-foreground">/ km</span>
                </>
              ) : lactateThresholdPercent ? (
                <>
                  <span className="text-xl font-semibold text-foreground tabular-nums">
                    {lactateThresholdPercent}%
                  </span>
                  <span className="text-xs text-muted-foreground">VO₂</span>
                </>
              ) : null}
            </div>
            <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
              ritmo sustentável
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
