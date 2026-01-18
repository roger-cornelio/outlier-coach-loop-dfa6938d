import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Loader2, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { HyroxRadarChart } from './HyroxRadarChart';
import { HyroxRadarExplanation } from './HyroxRadarExplanation';
import { useHyroxMetricScores } from '@/hooks/useHyroxMetricScores';
import { 
  calculateAndSaveHyroxPercentiles, 
  hasExistingScores,
  type MetricInput 
} from '@/utils/hyroxPercentileCalculator';
import { Button } from '@/components/ui/button';

interface HyroxAnalysisCardProps {
  /** The benchmark_results.id to use as hyrox_result_id */
  resultId: string;
  /** The total race time in seconds */
  totalTimeSeconds: number;
  /** Athlete gender (M or F) */
  gender: 'M' | 'F';
  /** Race category (OPEN or PRO) */
  raceCategory?: 'OPEN' | 'PRO' | null;
}

/**
 * Generates estimated metric times from total race time.
 * These serve as FALLBACK when real times are not available.
 * The edge function will prioritize REAL times from benchmark_results columns.
 */
function generateMetricsFromTotal(totalSeconds: number): MetricInput[] {
  const runPercent = 0.42;
  const stationPercent = 0.48;
  const roxzonePercent = 0.10;
  
  const totalRunTime = totalSeconds * runPercent;
  const totalStationTime = totalSeconds * stationPercent;
  const totalRoxzone = totalSeconds * roxzonePercent;
  
  const runAvg = totalRunTime / 8;
  
  const stationWeights = {
    ski: 0.14,
    sled_push: 0.12,
    sled_pull: 0.10,
    bbj: 0.14,
    row: 0.14,
    farmers: 0.12,
    sandbag: 0.14,
    wallballs: 0.10
  };
  
  return [
    { metric: 'run_avg', raw_time_sec: Math.round(runAvg), data_source: 'estimated' as const },
    { metric: 'roxzone', raw_time_sec: Math.round(totalRoxzone), data_source: 'estimated' as const },
    { metric: 'ski', raw_time_sec: Math.round(totalStationTime * stationWeights.ski), data_source: 'estimated' as const },
    { metric: 'sled_push', raw_time_sec: Math.round(totalStationTime * stationWeights.sled_push), data_source: 'estimated' as const },
    { metric: 'sled_pull', raw_time_sec: Math.round(totalStationTime * stationWeights.sled_pull), data_source: 'estimated' as const },
    { metric: 'bbj', raw_time_sec: Math.round(totalStationTime * stationWeights.bbj), data_source: 'estimated' as const },
    { metric: 'row', raw_time_sec: Math.round(totalStationTime * stationWeights.row), data_source: 'estimated' as const },
    { metric: 'farmers', raw_time_sec: Math.round(totalStationTime * stationWeights.farmers), data_source: 'estimated' as const },
    { metric: 'sandbag', raw_time_sec: Math.round(totalStationTime * stationWeights.sandbag), data_source: 'estimated' as const },
    { metric: 'wallballs', raw_time_sec: Math.round(totalStationTime * stationWeights.wallballs), data_source: 'estimated' as const }
  ];
}

type AnalysisState = 
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'generating' }
  | { status: 'polling'; attempt: number }
  | { status: 'success' }
  | { status: 'error'; message: string; canRetry: boolean };

/**
 * HyroxAnalysisCard - Displays radar chart for HYROX analysis
 * 
 * DETERMINISTIC FLOW:
 * 1. On mount, check if scores exist
 * 2. If scores exist -> show radar
 * 3. If no scores -> trigger generation
 * 4. After generation -> poll for max 20s
 * 5. If poll timeout or error -> show error with retry button
 * 
 * REAL > ESTIMATED:
 * The edge function will use REAL times from benchmark_results columns
 * when available, falling back to ESTIMATED from total time.
 */
export function HyroxAnalysisCard({
  resultId,
  totalTimeSeconds,
  gender,
  raceCategory
}: HyroxAnalysisCardProps) {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: 'checking' });
  const pollCountRef = useRef(0);
  const hasTriedGeneration = useRef(false);
  const maxPolls = 10;
  
  const { 
    scores, 
    loading, 
    hasScores, 
    refresh 
  } = useHyroxMetricScores(resultId);

  // Calculate division for explanation component
  const division = raceCategory === 'PRO' ? 'HYROX PRO' : 'HYROX';

  /**
   * Triggers analysis generation via edge function
   */
  const triggerAnalysis = useCallback(async () => {
    console.log('[HYROX_CARD] Triggering analysis for:', resultId);
    setAnalysisState({ status: 'generating' });
    hasTriedGeneration.current = true;
    
    try {
      // Double-check idempotency
      const alreadyExists = await hasExistingScores(resultId);
      if (alreadyExists) {
        console.log('[HYROX_CARD] Scores already exist, refreshing...');
        await refresh();
        return;
      }

      // Generate estimated metrics as FALLBACK
      // Edge function will use REAL times from DB when available
      const metrics = generateMetricsFromTotal(totalTimeSeconds);

      console.log('[HYROX_CARD] Calling edge function:', { resultId, division, gender });

      const result = await calculateAndSaveHyroxPercentiles(
        resultId,
        division,
        gender,
        metrics
      );

      if (result.success) {
        console.log('[HYROX_CARD] Generation successful, starting poll');
        pollCountRef.current = 0;
        setAnalysisState({ status: 'polling', attempt: 0 });
        refresh();
      } else {
        console.error('[HYROX_CARD] Generation failed:', result.error);
        
        // Determine error message based on error type
        let message = 'Não foi possível gerar a análise.';
        let canRetry = true;
        
        if (result.errorCode === 'BANDS_NOT_FOUND' || result.missing_bands?.length) {
          message = 'Faixas de percentil não configuradas para esta categoria/gênero.';
          canRetry = false;
        } else if (result.errorCode === 'AUTH_ERROR') {
          message = 'Sessão expirada. Faça login novamente.';
          canRetry = false;
        } else if (result.errorCode === 'RESULT_NOT_FOUND') {
          message = 'Resultado não encontrado no banco de dados.';
          canRetry = false;
        }
        
        setAnalysisState({ status: 'error', message, canRetry });
      }
    } catch (err) {
      console.error('[HYROX_CARD] Unexpected error:', err);
      setAnalysisState({ 
        status: 'error', 
        message: 'Erro inesperado ao gerar análise.', 
        canRetry: true 
      });
    }
  }, [resultId, totalTimeSeconds, gender, division, refresh]);

  /**
   * Main effect: orchestrates the analysis flow
   */
  useEffect(() => {
    // Reset state when resultId changes
    hasTriedGeneration.current = false;
    pollCountRef.current = 0;
    setAnalysisState({ status: 'checking' });
  }, [resultId]);

  useEffect(() => {
    // Skip if still loading initial data
    if (loading) return;

    // If scores exist, we're done
    if (hasScores && scores && scores.length > 0) {
      setAnalysisState({ status: 'success' });
      return;
    }

    // Handle different states
    if (analysisState.status === 'checking') {
      // First check completed, no scores found
      if (!hasTriedGeneration.current) {
        // Auto-trigger generation
        triggerAnalysis();
      }
      return;
    }

    if (analysisState.status === 'polling') {
      // Continue polling
      if (pollCountRef.current >= maxPolls) {
        console.log('[HYROX_CARD] Polling timeout reached');
        setAnalysisState({ 
          status: 'error', 
          message: 'Tempo esgotado aguardando análise.', 
          canRetry: true 
        });
        return;
      }

      const pollTimer = setTimeout(() => {
        pollCountRef.current += 1;
        console.log('[HYROX_CARD] Polling attempt:', pollCountRef.current);
        setAnalysisState({ status: 'polling', attempt: pollCountRef.current });
        refresh();
      }, 2000);

      return () => clearTimeout(pollTimer);
    }
  }, [loading, hasScores, scores, analysisState.status, triggerAnalysis, refresh]);

  /**
   * Manual retry handler
   */
  const handleRetry = () => {
    hasTriedGeneration.current = false;
    pollCountRef.current = 0;
    setAnalysisState({ status: 'checking' });
    refresh();
  };
  
  // Loading/Checking state
  if (loading || analysisState.status === 'checking') {
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
        {/* Success: Show radar chart */}
        {analysisState.status === 'success' && scores && scores.length > 0 ? (
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
            
            {/* TAREFA 2: Explanation table */}
            <HyroxRadarExplanation 
              scores={scores}
              division={division}
              gender={gender}
            />
          </motion.div>
        ) : analysisState.status === 'error' ? (
          /* Error state with retry option */
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-amber-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-500">
                  {analysisState.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verifique se as configurações estão corretas no sistema.
                </p>
                {analysisState.canRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="mt-3 gap-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Tentar novamente
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* Generating/Polling state */
          <motion.div
            key="generating"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-secondary/30 border border-border"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">
                  {analysisState.status === 'generating' 
                    ? 'Gerando análise...'
                    : `Aguardando análise... (${analysisState.status === 'polling' ? analysisState.attempt : 0}/${maxPolls})`
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  O radar de performance será exibido automaticamente
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
