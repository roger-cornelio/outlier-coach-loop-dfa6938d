import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Loader2, Check, AlertTriangle, Timer } from 'lucide-react';
import { SplitsTable } from './SplitsTable';
import { LevelBenchmarkComparison } from './LevelBenchmarkComparison';
import { useHyroxMetricScores } from '@/hooks/useHyroxMetricScores';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HyroxAnalysisCardProps {
  resultId: string;
  totalTimeSeconds: number;
  gender: 'M' | 'F';
  raceCategory?: 'OPEN' | 'PRO' | null;
}

interface BenchmarkSplits {
  run_avg_sec: number | null;
  roxzone_sec: number | null;
  ski_sec: number | null;
  sled_push_sec: number | null;
  sled_pull_sec: number | null;
  bbj_sec: number | null;
  row_sec: number | null;
  farmers_sec: number | null;
  sandbag_sec: number | null;
  wallballs_sec: number | null;
}

/**
 * HyroxAnalysisCard - Displays splits table for HYROX analysis
 * 
 * Reads split times directly from benchmark_results columns (scraped from print).
 */
export function HyroxAnalysisCard({
  resultId,
  totalTimeSeconds,
  gender,
  raceCategory
}: HyroxAnalysisCardProps) {
  const [splits, setSplits] = useState<BenchmarkSplits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const division = raceCategory === 'PRO' ? 'HYROX PRO' : 'HYROX';

  const { scores } = useHyroxMetricScores(resultId);

  useEffect(() => {
    async function fetchSplits() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('benchmark_results')
          .select('run_avg_sec, roxzone_sec, ski_sec, sled_push_sec, sled_pull_sec, bbj_sec, row_sec, farmers_sec, sandbag_sec, wallballs_sec')
          .eq('id', resultId)
          .single();

        if (fetchError) throw fetchError;
        setSplits(data as BenchmarkSplits);
      } catch (err: any) {
        console.error('[HYROX_CARD] Error fetching splits:', err);
        setError('Erro ao carregar tempos parciais.');
      } finally {
        setLoading(false);
      }
    }

    fetchSplits();
  }, [resultId]);

  if (loading) {
    return (
      <div className="mt-4 p-4 rounded-lg bg-secondary/30 border border-border">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Carregando tempos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <p className="text-sm text-amber-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="mt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-secondary/30 border border-border"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Timer className="w-5 h-5 text-primary" />
            <h4 className="font-display text-base">Tempos & Parciais</h4>
            <div className="ml-auto flex items-center gap-1 text-xs text-status-good">
              <Check className="w-3 h-3" />
              <span>Pronto</span>
            </div>
          </div>

          {/* Splits Table */}
          {splits && (
            <SplitsTable splits={splits} totalTimeSeconds={totalTimeSeconds} />
          )}

          {/* Level benchmark comparison */}
          {scores && scores.length > 0 && (
            <div className="mt-4">
              <LevelBenchmarkComparison
                hyroxResultId={resultId}
                metricScores={scores}
                division={division}
                gender={gender}
              />
            </div>
          )}
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
