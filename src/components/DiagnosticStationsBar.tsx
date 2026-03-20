/**
 * DiagnosticStationsBars - Barras horizontais para as 9 estações HYROX
 * 
 * FONTE DE VERDADE: tempos_splits (dados reais da última prova)
 * Fallback: hyrox_metric_scores (quando splits não disponíveis)
 */

import { motion } from 'framer-motion';
import { type CalculatedScore } from '@/utils/hyroxPercentileCalculator';
import { type SplitTime } from '@/hooks/useDiagnosticScores';

interface DiagnosticStationsBarsProps {
  scores: CalculatedScore[];
  /** Real split times from tempos_splits — source of truth */
  splitTimes?: SplitTime[];
}

// Mapeamento split_name → station key
const SPLIT_NAME_TO_KEY: Record<string, string> = {
  'Running 1': 'run_1',
  'Running 2': 'run_2',
  'Running 3': 'run_3',
  'Running 4': 'run_4',
  'Running 5': 'run_5',
  'Running 6': 'run_6',
  'Running 7': 'run_7',
  'Running 8': 'run_8',
  'Ski Erg': 'ski',
  'Sled Push': 'sled_push',
  'Sled Pull': 'sled_pull',
  'Burpees Broad Jump': 'bbj',
  'Rowing': 'row',
  'Farmers Carry': 'farmers',
  'Sandbag Lunges': 'sandbag',
  'Wall Balls': 'wallballs',
  'Roxzone': 'roxzone',
};

// 9 estações HYROX (nomes oficiais) — Run usa média real dos 8 trechos
const STATIONS = [
  { key: 'run_avg', label: 'Run', isRunAvg: true },
  { key: 'ski', label: 'SkiErg', isRunAvg: false },
  { key: 'sled_push', label: 'Sled Push', isRunAvg: false },
  { key: 'sled_pull', label: 'Sled Pull', isRunAvg: false },
  { key: 'bbj', label: 'Burpee Broad Jump', isRunAvg: false },
  { key: 'row', label: 'Row', isRunAvg: false },
  { key: 'farmers', label: 'Farmers Carry', isRunAvg: false },
  { key: 'sandbag', label: 'Sandbag Lunges', isRunAvg: false },
  { key: 'wallballs', label: 'Wall Balls', isRunAvg: false },
] as const;

/** Format seconds to MM:SS or HH:MM:SS */
function formatTimeSec(sec: number): string {
  if (!sec || sec <= 0) return '—';
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.round(sec % 60);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Determine bar color based on relative position (lower = worse for time-based) */
function getBarColor(normalizedValue: number): string {
  if (normalizedValue < 25) return 'hsl(var(--destructive))';
  if (normalizedValue < 40) return 'hsl(var(--chart-2))';
  return 'hsl(var(--primary))';
}

export function DiagnosticStationsBars({ scores, splitTimes }: DiagnosticStationsBarsProps) {
  // Build lookup from real splits
  const splitMap = new Map<string, number>();
  if (splitTimes && splitTimes.length > 0) {
    for (const s of splitTimes) {
      const key = SPLIT_NAME_TO_KEY[s.split_name];
      if (key) splitMap.set(key, s.time_sec);
    }
  }

  // Calculate run average from real splits if available
  const runKeys = ['run_1', 'run_2', 'run_3', 'run_4', 'run_5', 'run_6', 'run_7', 'run_8'];
  const runTimes = runKeys.map(k => splitMap.get(k)).filter((v): v is number => v != null && v > 0);
  const realRunAvgSec = runTimes.length > 0
    ? Math.round(runTimes.reduce((a, b) => a + b, 0) / runTimes.length)
    : 0;

  // Fallback: hyrox_metric_scores
  const scoreMap = new Map<string, CalculatedScore>();
  scores.forEach(s => scoreMap.set(s.metric, s));

  // Build bar data: prioritize real splits, fallback to metric scores
  const barsData = STATIONS.map(station => {
    let rawTimeSec = 0;
    let percentile = 0;

    if (station.isRunAvg) {
      // Run: use average of real splits
      rawTimeSec = realRunAvgSec;
      if (!rawTimeSec) {
        const score = scoreMap.get('run_avg');
        rawTimeSec = score?.raw_time_sec ?? 0;
        percentile = score?.percentile_value ?? 0;
      } else {
        percentile = scoreMap.get('run_avg')?.percentile_value ?? 50;
      }
    } else {
      // Station: use real split time first
      const realTime = splitMap.get(station.key);
      if (realTime && realTime > 0) {
        rawTimeSec = realTime;
        percentile = scoreMap.get(station.key)?.percentile_value ?? 50;
      } else {
        const score = scoreMap.get(station.key);
        rawTimeSec = score?.raw_time_sec ?? 0;
        percentile = score?.percentile_value ?? 0;
      }
    }

    return {
      ...station,
      value: percentile,
      rawTimeSec,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-4"
    >
      <p className="text-xs text-muted-foreground text-center">
        Análise detalhada por estação da última prova.
      </p>
      
      <div className="space-y-2.5">
        {barsData.map((station, index) => (
          <motion.div
            key={station.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.03 * index }}
            className="flex items-center gap-3"
          >
            <span className="text-xs text-muted-foreground w-32 sm:w-36 truncate">
              {station.label}
            </span>
            
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-4 bg-muted/20 rounded-r-md overflow-hidden">
                {station.value > 0 ? (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${station.value}%` }}
                    transition={{ 
                      duration: 0.5, 
                      delay: 0.08 + (0.03 * index),
                      ease: 'easeOut' 
                    }}
                    className="h-full rounded-r-md"
                    style={{ backgroundColor: getBarColor(station.value) }}
                  />
                ) : (
                  <div className="h-full w-full bg-muted/5 rounded-r-md" />
                )}
              </div>
              
              <span className="text-[10px] tabular-nums text-muted-foreground shrink-0 min-w-[42px] text-right">
                {station.rawTimeSec > 0
                  ? formatTimeSec(station.rawTimeSec)
                  : station.value > 0
                    ? `${station.value}%`
                    : '—'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
