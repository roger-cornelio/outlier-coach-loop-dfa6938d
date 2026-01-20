import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Dot
} from 'recharts';
import { AlertCircle } from 'lucide-react';
import { HYROX_METRICS, type CalculatedScore } from '@/utils/hyroxPercentileCalculator';

/**
 * Color configuration for HYROX metrics
 * - run_avg: exclusive orange (running focus)
 * - roxzone: exclusive purple (transition zone)
 * - stations: default teal
 */
const METRIC_COLORS: Record<string, string> = {
  run_avg: 'hsl(25, 95%, 53%)',      // Orange - exclusive for running
  roxzone: 'hsl(270, 70%, 60%)',     // Purple - exclusive for roxzone
  // All 8 stations share the default color
  ski: 'hsl(173, 80%, 40%)',
  sled_push: 'hsl(173, 80%, 40%)',
  sled_pull: 'hsl(173, 80%, 40%)',
  bbj: 'hsl(173, 80%, 40%)',
  row: 'hsl(173, 80%, 40%)',
  farmers: 'hsl(173, 80%, 40%)',
  sandbag: 'hsl(173, 80%, 40%)',
  wallballs: 'hsl(173, 80%, 40%)'
};

/**
 * Human-readable labels for HYROX metrics
 * "Roxzone Time" is the official label from HYROX workout summaries
 */
const METRIC_LABELS: Record<string, string> = {
  run_avg: 'Corrida',
  roxzone: 'Roxzone Time',
  ski: 'Ski Erg',
  sled_push: 'Sled Push',
  sled_pull: 'Sled Pull',
  bbj: 'Burpee BJ',
  row: 'Remo',
  farmers: 'Farmers',
  sandbag: 'Sandbag',
  wallballs: 'Wall Balls'
};

interface RadarDataPoint {
  metric: string;
  label: string;
  percentile: number | null;
  raw_time_sec: number | null;
  color: string;
  /** Whether this metric was estimated (vs real athlete-provided data) */
  isEstimated: boolean;
}

interface HyroxRadarChartProps {
  /**
   * Frozen scores from hyrox_metric_scores table.
   * NEVER recalculate - these are immutable snapshots.
   */
  scores: CalculatedScore[] | null;
  
  /**
   * Show loading state
   */
  loading?: boolean;
  
  /**
   * Optional className for container
   */
  className?: string;
}

/**
 * Custom dot component with dynamic color per metric
 * Estimated metrics have reduced opacity and dashed appearance
 */
function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  
  if (payload?.percentile === null || payload?.percentile === undefined) {
    return null; // Don't render dot for missing metrics
  }
  
  const color = payload?.color || METRIC_COLORS.ski;
  const isEstimated = payload?.isEstimated === true;
  
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={isEstimated ? 4 : 5}
      fill={color}
      stroke="hsl(var(--background))"
      strokeWidth={2}
      fillOpacity={isEstimated ? 0.6 : 1}
    />
  );
}

/**
 * Custom tooltip for radar chart
 * Shows "Estimado pelo sistema" indicator for estimated metrics
 */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) {
    return null;
  }
  
  const data = payload[0]?.payload as RadarDataPoint;
  
  if (!data) return null;
  
  const hasData = data.percentile !== null && data.percentile !== undefined;
  
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-semibold text-sm" style={{ color: data.color }}>
        {data.label}
      </p>
      {hasData ? (
        <>
          <p className="text-lg font-bold text-foreground">
            Percentil {data.percentile}
          </p>
          {data.raw_time_sec !== null && (
            <p className="text-xs text-muted-foreground">
              Tempo: {formatTime(data.raw_time_sec)}
            </p>
          )}
          {data.isEstimated && (
            <p className="text-xs text-amber-500 italic mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Estimado pelo sistema
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Sem dados
        </p>
      )}
    </div>
  );
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * HYROX Radar Chart Component
 * 
 * Displays a 10-axis radar chart using ONLY frozen data from hyrox_metric_scores.
 * 
 * CRITICAL GUARDRAILS:
 * - NEVER recalculates percentiles
 * - NEVER queries percentile_bands
 * - NEVER triggers calculate-hyrox-percentiles
 * - Uses null for missing metrics (graceful degradation)
 * - Domain fixed at 0-100
 */
export function HyroxRadarChart({ scores, loading, className }: HyroxRadarChartProps) {
  // Transform frozen scores into radar data points
  // IMMUTABILITY GUARD: Only reads from provided scores, never calculates
  const radarData = useMemo<RadarDataPoint[]>(() => {
    console.log('[RADAR_CHART] Building data from frozen scores:', scores?.length || 0);
    
    // Create a lookup map from frozen scores
    const scoreMap = new Map<string, CalculatedScore>();
    if (scores) {
      for (const score of scores) {
        scoreMap.set(score.metric, score);
      }
    }
    
    // Build radar data for all 10 metrics
    // Missing metrics get null (not calculated, not fetched)
    return HYROX_METRICS.map((metric) => {
      const frozenScore = scoreMap.get(metric);
      
      return {
        metric,
        label: METRIC_LABELS[metric] || metric,
        // Use frozen percentile or null (NEVER calculate)
        percentile: frozenScore?.percentile_value ?? null,
        raw_time_sec: frozenScore?.raw_time_sec ?? null,
        color: METRIC_COLORS[metric] || METRIC_COLORS.ski,
        // Track if this metric was estimated
        isEstimated: frozenScore?.data_source === 'estimated'
      };
    });
  }, [scores]);
  
  // Check if we have any data to show
  const hasAnyData = radarData.some(d => d.percentile !== null);
  
  // Check if any metrics are estimated (for the warning message)
  const hasEstimatedMetrics = radarData.some(d => d.isEstimated && d.percentile !== null);
  
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-80 ${className || ''}`}>
        <div className="animate-pulse text-muted-foreground">
          Carregando análise...
        </div>
      </div>
    );
  }
  
  if (!hasAnyData) {
    return (
      <div className={`flex flex-col items-center justify-center h-80 text-center ${className || ''}`}>
        <div className="text-muted-foreground text-sm">
          Nenhuma análise disponível
        </div>
        <p className="text-xs text-muted-foreground/70 mt-2 max-w-xs">
          Execute a análise do resultado para visualizar o radar de performance.
        </p>
      </div>
    );
  }
  
  // Convert null to 0 for recharts (it requires numbers)
  // But the visual will show as "sem dados" via CustomDot/Tooltip
  const chartData = radarData.map(d => ({
    ...d,
    percentile: d.percentile ?? 0
  }));
  
  return (
    <div className={`w-full h-80 ${className || ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
          <PolarGrid 
            stroke="hsl(var(--border))" 
            strokeOpacity={0.5}
          />
          <PolarAngleAxis
            dataKey="label"
            tick={{ 
              fill: 'hsl(var(--muted-foreground))', 
              fontSize: 11,
              fontWeight: 500
            }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ 
              fill: 'hsl(var(--muted-foreground))', 
              fontSize: 10 
            }}
            tickCount={5}
            axisLine={false}
          />
          <Radar
            name="Percentil"
            dataKey="percentile"
            stroke="hsl(173, 80%, 40%)"
            fill="hsl(173, 80%, 40%)"
            fillOpacity={0.25}
            strokeWidth={2}
            dot={<CustomDot />}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: METRIC_COLORS.run_avg }}
          />
          <span className="text-muted-foreground">Corrida</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: METRIC_COLORS.roxzone }}
          />
          <span className="text-muted-foreground">Roxzone Time</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: METRIC_COLORS.ski }}
          />
          <span className="text-muted-foreground">Estações</span>
        </div>
      </div>
      
      {/* Estimated metrics warning */}
      {hasEstimatedMetrics && (
        <div className="flex items-start gap-2 mt-4 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Algumas métricas foram estimadas automaticamente com base no seu resultado geral.
            Passe o mouse sobre os pontos para ver quais métricas são estimativas.
          </p>
        </div>
      )}
    </div>
  );
}
