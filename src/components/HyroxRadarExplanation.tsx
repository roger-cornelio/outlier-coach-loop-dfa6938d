import { useState, useEffect, useMemo } from 'react';
import { Info, AlertTriangle, CheckCircle2, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { type CalculatedScore, HYROX_METRICS } from '@/utils/hyroxPercentileCalculator';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Human-readable labels for HYROX metrics
 */
const METRIC_LABELS: Record<string, string> = {
  run_avg: 'Run (avg)',
  roxzone: 'Roxzone Time',
  ski: 'Ski Erg',
  sled_push: 'Sled Push',
  sled_pull: 'Sled Pull',
  bbj: 'Burpee Broad Jump',
  row: 'Row',
  farmers: 'Farmers Carry',
  sandbag: 'Sandbag Lunges',
  wallballs: 'Wall Balls'
};

interface PercentileBandDisplay {
  p10: number;
  p50: number;
  p90: number;
}

interface MetricRow {
  metric: string;
  label: string;
  rawTimeSec: number | null;
  percentile: number | null;
  source: 'real' | 'estimated' | null;
  band: PercentileBandDisplay | null;
  bandMissing: boolean;
}

interface HyroxRadarExplanationProps {
  /**
   * Frozen scores from hyrox_metric_scores
   */
  scores: CalculatedScore[] | null;
  
  /**
   * Division used for fetching bands (e.g., 'HYROX', 'HYROX PRO')
   */
  division: string;
  
  /**
   * Gender for band lookup
   */
  gender: 'M' | 'F';
}

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * HyroxRadarExplanation - Shows how each radar axis was calculated
 * 
 * User-friendly table displaying:
 * - Metric name (human readable)
 * - Time used (mm:ss)
 * - Source (Medido or Estimado with tooltip)
 * - Reference v1 (p10–p90 range with highlighted p50)
 * - Final percentile (0-100 or — if missing)
 */
export function HyroxRadarExplanation({ 
  scores, 
  division, 
  gender 
}: HyroxRadarExplanationProps) {
  const [bands, setBands] = useState<Record<string, PercentileBandDisplay>>({});
  const [bandsLoading, setBandsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Fetch bands for display (read-only, never recalculates)
  useEffect(() => {
    async function fetchBands() {
      setBandsLoading(true);
      try {
        const { data, error } = await supabase
          .from('percentile_bands')
          .select('metric, p10_sec, p50_sec, p90_sec')
          .eq('percentile_set_id', 'v1')
          .eq('is_active', true)
          .eq('division', division)
          .eq('gender', gender);

        if (error) {
          console.error('[RADAR_EXPLAIN] Error fetching bands:', error);
          return;
        }

        const bandMap: Record<string, PercentileBandDisplay> = {};
        for (const b of data || []) {
          bandMap[b.metric] = {
            p10: b.p10_sec,
            p50: b.p50_sec,
            p90: b.p90_sec
          };
        }
        setBands(bandMap);
      } finally {
        setBandsLoading(false);
      }
    }

    fetchBands();
  }, [division, gender]);

  // Build table rows
  const rows = useMemo<MetricRow[]>(() => {
    const scoreMap = new Map<string, CalculatedScore>();
    if (scores) {
      for (const s of scores) {
        scoreMap.set(s.metric, s);
      }
    }

    return HYROX_METRICS.map((metric) => {
      const score = scoreMap.get(metric);
      const band = bands[metric];

      return {
        metric,
        label: METRIC_LABELS[metric] || metric,
        rawTimeSec: score?.raw_time_sec ?? null,
        percentile: score?.percentile_value ?? null,
        source: score?.data_source ?? null,
        band: band || null,
        bandMissing: !band && !bandsLoading
      };
    });
  }, [scores, bands, bandsLoading]);

  // Count real vs estimated
  const realCount = rows.filter(r => r.source === 'real').length;
  const estimatedCount = rows.filter(r => r.source === 'estimated').length;
  const missingBandCount = rows.filter(r => r.bandMissing).length;

  if (!scores || scores.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="mt-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
        >
          <Info className="w-4 h-4" />
          <span>Como o Radar foi calculado</span>
          <span className="text-xs">({expanded ? 'ocultar' : 'ver detalhes'})</span>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
                {/* Summary */}
                <div className="flex flex-wrap gap-3 mb-4 text-xs">
                  {realCount > 0 && (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{realCount} tempos medidos</span>
                    </div>
                  )}
                  {estimatedCount > 0 && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Calculator className="w-3 h-3" />
                      <span>{estimatedCount} tempos estimados</span>
                    </div>
                  )}
                  {missingBandCount > 0 && (
                    <div className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{missingBandCount} sem referência</span>
                    </div>
                  )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 pr-2 font-medium">Métrica</th>
                        <th className="pb-2 pr-2 font-medium">Tempo</th>
                        <th className="pb-2 pr-2 font-medium">Fonte</th>
                        <th className="pb-2 pr-2 font-medium">Referência v1</th>
                        <th className="pb-2 text-right font-medium">Percentil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr 
                          key={row.metric} 
                          className="border-b border-border/50 last:border-0"
                        >
                          {/* Metric name */}
                          <td className="py-2.5 pr-2 font-medium text-foreground">
                            {row.label}
                          </td>

                          {/* Time used */}
                          <td className="py-2.5 pr-2 font-mono text-foreground">
                            {formatTime(row.rawTimeSec)}
                          </td>

                          {/* Source with tooltip for estimated */}
                          <td className="py-2.5 pr-2">
                            {row.source === 'real' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                Medido
                              </span>
                            ) : row.source === 'estimated' ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 cursor-help">
                                    <Calculator className="w-3 h-3" />
                                    Estimado
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px] text-center">
                                  <p className="text-xs">
                                    Estimado a partir do tempo total porque esta métrica não foi informada.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Reference v1 band: show p10–p90 range with highlighted p50 */}
                          <td className="py-2.5 pr-2">
                            {row.bandMissing ? (
                              <span className="text-muted-foreground italic text-[10px]">
                                Sem referência v1
                              </span>
                            ) : row.band ? (
                              <span className="font-mono text-muted-foreground text-[11px]">
                                {formatTime(row.band.p10)} – 
                                <span className="font-semibold text-foreground mx-1">
                                  {formatTime(row.band.p50)}
                                </span>
                                – {formatTime(row.band.p90)}
                              </span>
                            ) : bandsLoading ? (
                              <span className="text-muted-foreground">...</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Percentile - show — if band missing */}
                          <td className="py-2.5 text-right font-semibold">
                            {row.bandMissing ? (
                              <span className="text-muted-foreground">—</span>
                            ) : row.percentile !== null ? (
                              <span 
                                className={
                                  row.percentile >= 75 ? 'text-emerald-600 dark:text-emerald-400' :
                                  row.percentile >= 50 ? 'text-primary' :
                                  row.percentile >= 25 ? 'text-amber-600 dark:text-amber-400' :
                                  'text-muted-foreground'
                                }
                              >
                                {row.percentile}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legend - simpler, user-friendly */}
                <div className="mt-4 pt-3 border-t border-border text-[10px] text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Referência v1:</span>
                    <span>tempo rápido – <span className="font-semibold text-foreground">médio</span> – tempo lento</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
