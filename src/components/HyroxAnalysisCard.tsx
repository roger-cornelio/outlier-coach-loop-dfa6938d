import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Loader2, Check, AlertTriangle } from 'lucide-react';
import { HyroxRadarChart } from './HyroxRadarChart';
import { useHyroxMetricScores } from '@/hooks/useHyroxMetricScores';

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
 * HyroxAnalysisCard - Displays radar chart for HYROX analysis
 * 
 * GUARDRAILS:
 * - Does NOT trigger calculation (that happens in AddResultModal)
 * - Never recalculates if scores exist
 * - Only displays loading/chart/error states
 * - Polls for scores when they don't exist yet (waiting for auto-generation)
 */
export function HyroxAnalysisCard({
  resultId,
  totalTimeSeconds,
  gender,
  raceCategory
}: HyroxAnalysisCardProps) {
  const [generationFailed, setGenerationFailed] = useState(false);
  const pollCountRef = useRef(0);
  const maxPolls = 10; // Max polling attempts (10 x 2s = 20s max wait)
  
  const { 
    scores, 
    loading, 
    hasScores, 
    refresh 
  } = useHyroxMetricScores(resultId);
  
  // Poll for scores if they don't exist yet (waiting for auto-generation)
  useEffect(() => {
    // Don't poll if loading, already has scores, or generation failed
    if (loading || hasScores || generationFailed) {
      return;
    }
    
    // Don't poll indefinitely
    if (pollCountRef.current >= maxPolls) {
      console.log('[HYROX_ANALYSIS_CARD] Max polls reached, marking as failed');
      setGenerationFailed(true);
      return;
    }
    
    // Poll every 2 seconds
    const pollTimer = setTimeout(() => {
      pollCountRef.current += 1;
      console.log('[HYROX_ANALYSIS_CARD] Polling for scores, attempt:', pollCountRef.current);
      refresh();
    }, 2000);
    
    return () => clearTimeout(pollTimer);
  }, [loading, hasScores, generationFailed, refresh]);
  
  // Reset poll count when resultId changes
  useEffect(() => {
    pollCountRef.current = 0;
    setGenerationFailed(false);
  }, [resultId]);
  
  // Loading state (initial fetch)
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
        ) : generationFailed ? (
          /* Show error state if generation failed */
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-500">
                  Não foi possível gerar a análise automaticamente
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verifique se as faixas de percentil estão configuradas no sistema.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Show generating state (waiting for auto-generation) */
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
                  Gerando análise...
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
