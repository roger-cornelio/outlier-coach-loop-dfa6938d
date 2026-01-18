import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HyroxRadarChart } from './HyroxRadarChart';
import { useHyroxMetricScores } from '@/hooks/useHyroxMetricScores';
import { calculateAndSaveHyroxPercentiles, type MetricInput } from '@/utils/hyroxPercentileCalculator';
import { toast } from 'sonner';

interface HyroxAnalysisCardProps {
  /** The benchmark_results.id to use as hyrox_result_id */
  resultId: string;
  /** The total race time in seconds (for generating mock metrics) */
  totalTimeSeconds: number;
  /** Athlete gender (M or F) */
  gender: 'M' | 'F';
  /** Race category (OPEN or PRO) */
  raceCategory?: 'OPEN' | 'PRO' | null;
}

/**
 * Generates estimated metric times from total race time.
 * This is a simplified distribution model for when we don't have
 * individual segment times.
 * 
 * Distribution based on typical HYROX race structure:
 * - 8 x 1km runs (average run time = total_run / 8)
 * - Each station has typical time ranges
 */
function generateMetricsFromTotal(totalSeconds: number): MetricInput[] {
  // Typical distribution percentages (approximate)
  // Total race = 8 runs + 8 stations + transitions
  // Runs ~ 40-45% of total time
  // Stations ~ 45-50% of total time
  // Roxzone (transitions) ~ 8-12% of total time
  
  const runPercent = 0.42;
  const stationPercent = 0.48;
  const roxzonePercent = 0.10;
  
  const totalRunTime = totalSeconds * runPercent;
  const totalStationTime = totalSeconds * stationPercent;
  const totalRoxzone = totalSeconds * roxzonePercent;
  
  // Average per 1km run (8 runs)
  const runAvg = totalRunTime / 8;
  
  // Station time distribution (some stations take longer than others)
  // These are relative weights based on typical performance patterns
  const stationWeights = {
    ski: 0.14,        // ~3-4 min
    sled_push: 0.12,  // ~2-3 min
    sled_pull: 0.10,  // ~1.5-2.5 min
    bbj: 0.14,        // ~3-4 min
    row: 0.14,        // ~3-4 min
    farmers: 0.12,    // ~2-3 min
    sandbag: 0.14,    // ~3-4 min
    wallballs: 0.10   // ~2-3 min
  };
  
  return [
    { metric: 'run_avg', raw_time_sec: Math.round(runAvg) },
    { metric: 'roxzone', raw_time_sec: Math.round(totalRoxzone) },
    { metric: 'ski', raw_time_sec: Math.round(totalStationTime * stationWeights.ski) },
    { metric: 'sled_push', raw_time_sec: Math.round(totalStationTime * stationWeights.sled_push) },
    { metric: 'sled_pull', raw_time_sec: Math.round(totalStationTime * stationWeights.sled_pull) },
    { metric: 'bbj', raw_time_sec: Math.round(totalStationTime * stationWeights.bbj) },
    { metric: 'row', raw_time_sec: Math.round(totalStationTime * stationWeights.row) },
    { metric: 'farmers', raw_time_sec: Math.round(totalStationTime * stationWeights.farmers) },
    { metric: 'sandbag', raw_time_sec: Math.round(totalStationTime * stationWeights.sandbag) },
    { metric: 'wallballs', raw_time_sec: Math.round(totalStationTime * stationWeights.wallballs) }
  ];
}

/**
 * HyroxAnalysisCard - Displays analysis button and radar chart
 * 
 * GUARDRAILS:
 * - Never calculates automatically
 * - Never recalculates if scores exist
 * - Only triggers on explicit user action
 */
export function HyroxAnalysisCard({
  resultId,
  totalTimeSeconds,
  gender,
  raceCategory
}: HyroxAnalysisCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false); // Anti-loop guard
  
  const { 
    scores, 
    loading, 
    hasScores, 
    refresh 
  } = useHyroxMetricScores(resultId);
  
  const division = raceCategory === 'PRO' ? 'HYROX PRO' : 'HYROX';
  
  // Handle generate analysis - explicit user action only
  const handleGenerateAnalysis = async () => {
    // Anti-loop guard
    if (isGeneratingRef.current || isGenerating) {
      console.log('[HYROX_ANALYSIS] Generation already in progress, skipping');
      return;
    }
    
    // Check if already has scores
    if (hasScores) {
      console.log('[HYROX_ANALYSIS] Scores already exist, skipping');
      toast.info('Análise já foi gerada para este resultado');
      return;
    }
    
    isGeneratingRef.current = true;
    setIsGenerating(true);
    
    console.log('[HYROX_ANALYSIS] Starting analysis generation:', {
      resultId,
      totalTimeSeconds,
      gender,
      division
    });
    
    try {
      // Generate metrics from total time
      const metrics = generateMetricsFromTotal(totalTimeSeconds);
      
      console.log('[HYROX_ANALYSIS] Generated metrics:', metrics);
      
      // Call the calculation function (which invokes the edge function)
      const result = await calculateAndSaveHyroxPercentiles(
        resultId,
        division,
        gender,
        metrics
      );
      
      if (result.success) {
        toast.success('Análise gerada com sucesso!');
        // Refresh to load the new scores
        await refresh();
      } else {
        console.error('[HYROX_ANALYSIS] Calculation failed:', result.error);
        toast.error(`Erro ao gerar análise: ${result.error}`);
      }
    } catch (err) {
      console.error('[HYROX_ANALYSIS] Unexpected error:', err);
      toast.error('Erro inesperado ao gerar análise');
    } finally {
      setIsGenerating(false);
      isGeneratingRef.current = false;
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="mt-4 p-4 rounded-lg bg-secondary/30 border border-border">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Verificando análise...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-4">
      <AnimatePresence mode="wait">
        {/* Show radar chart if scores exist */}
        {hasScores && scores && scores.length > 0 ? (
          <motion.div
            key="radar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-secondary/30 border border-border"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h4 className="font-display text-sm">Análise de Performance</h4>
              <div className="ml-auto flex items-center gap-1 text-xs text-status-good">
                <Check className="w-3 h-3" />
                <span>Análise gerada</span>
              </div>
            </div>
            <HyroxRadarChart scores={scores} />
          </motion.div>
        ) : (
          /* Show generate button if no scores */
          <motion.div
            key="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-secondary/30 border border-border"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Análise ainda não gerada
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Gere a análise para visualizar o radar de performance
                </p>
              </div>
              <Button
                onClick={handleGenerateAnalysis}
                disabled={isGenerating}
                className="gap-2"
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    Gerar Análise
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
