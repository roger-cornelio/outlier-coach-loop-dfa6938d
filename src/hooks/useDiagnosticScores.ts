/**
 * useDiagnosticScores - Hook para buscar scores da última prova para diagnóstico
 * 
 * FONTE DE VERDADE: 
 * - hyrox_metric_scores (frozen scores) para percentis/radar
 * - tempos_splits (real split times) para barras de estação
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { type CalculatedScore } from '@/utils/hyroxPercentileCalculator';

export interface PerfilFisiologico {
  vo2_max?: number;
  limiar_lactato?: string;
  critical_speed_m_s?: number;
  radar?: Record<string, number>;
}

export interface SplitTime {
  split_name: string;
  time: string;
  time_sec: number;
}

export interface DiagnosticScoresResult {
  scores: CalculatedScore[];
  loading: boolean;
  hasData: boolean;
  lastResultId: string | null;
  lastResultDate: string | null;
  perfilFisiologico: PerfilFisiologico | null;
  /** Real split times from tempos_splits (source of truth for station bars) */
  splitTimes: SplitTime[];
}

/** Convert "MM:SS" or "HH:MM:SS" to total seconds */
function timeToSec(t: string): number {
  if (!t || typeof t !== 'string') return 0;
  const parts = t.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export function useDiagnosticScores(): DiagnosticScoresResult {
  const { user } = useAuth();
  const [scores, setScores] = useState<CalculatedScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastResultId, setLastResultId] = useState<string | null>(null);
  const [lastResultDate, setLastResultDate] = useState<string | null>(null);
  const [perfilFisiologico, setPerfilFisiologico] = useState<PerfilFisiologico | null>(null);
  const [splitTimes, setSplitTimes] = useState<SplitTime[]>([]);

  useEffect(() => {
    async function fetchDiagnosticData() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // 1. Buscar o resultado HYROX mais recente do atleta
        const { data: latestResult, error: resultError } = await supabase
          .from('benchmark_results')
          .select('id, created_at, event_name')
          .eq('user_id', user.id)
          .in('result_type', ['simulado', 'prova_oficial'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (resultError || !latestResult) {
          console.log('[DiagnosticScores] No HYROX results found');
          setLoading(false);
          return;
        }

        setLastResultId(latestResult.id);
        setLastResultDate(latestResult.created_at);

        // 2. Buscar scores frozen deste resultado
        const { data: metricScores, error: scoresError } = await supabase
          .from('hyrox_metric_scores')
          .select('metric, raw_time_sec, percentile_value, data_source')
          .eq('hyrox_result_id', latestResult.id);

        if (scoresError || !metricScores || metricScores.length === 0) {
          console.log('[DiagnosticScores] No metric scores found for result:', latestResult.id);
          setLoading(false);
          return;
        }

        const typedScores: CalculatedScore[] = metricScores.map(s => ({
          metric: s.metric,
          raw_time_sec: s.raw_time_sec,
          percentile_value: s.percentile_value,
          percentile_set_id_used: '',
          data_source: (s.data_source as 'real' | 'estimated') || 'estimated'
        }));

        setScores(typedScores);

        // 3. Fetch perfil_fisiologico + tempos_splits from diagnostico_resumo
        const { data: resumoData } = await supabase
          .from('diagnostico_resumo')
          .select('id, perfil_fisiologico')
          .eq('atleta_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (resumoData?.perfil_fisiologico) {
          setPerfilFisiologico(resumoData.perfil_fisiologico as unknown as PerfilFisiologico);
        }

        // 4. Fetch real split times from tempos_splits (source of truth for bars)
        if (resumoData?.id) {
          const { data: splitsData } = await supabase
            .from('tempos_splits')
            .select('split_name, time')
            .eq('resumo_id', resumoData.id);

          if (splitsData && splitsData.length > 0) {
            const mapped: SplitTime[] = splitsData.map(s => ({
              split_name: s.split_name,
              time: s.time,
              time_sec: timeToSec(s.time),
            }));
            setSplitTimes(mapped);
          }
        }
      } catch (err) {
        console.error('[DiagnosticScores] Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDiagnosticData();
  }, [user?.id]);

  return {
    scores,
    loading,
    hasData: scores.length > 0,
    lastResultId,
    lastResultDate,
    perfilFisiologico,
    splitTimes,
  };
}
