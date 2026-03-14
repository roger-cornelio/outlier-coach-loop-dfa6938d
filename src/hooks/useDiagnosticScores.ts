/**
 * useDiagnosticScores - Hook para buscar scores da última prova para diagnóstico
 * 
 * FONTE DE VERDADE: hyrox_metric_scores (frozen scores)
 * - Lê scores existentes do resultado mais recente
 * - Retorna dados prontos para visualização no radar
 * 
 * GUARDRAILS:
 * - Nunca calcula scores - apenas lê snapshots frozen
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

export interface DiagnosticScoresResult {
  scores: CalculatedScore[];
  loading: boolean;
  hasData: boolean;
  lastResultId: string | null;
  lastResultDate: string | null;
  perfilFisiologico: PerfilFisiologico | null;
}

export function useDiagnosticScores(): DiagnosticScoresResult {
  const { user } = useAuth();
  const [scores, setScores] = useState<CalculatedScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastResultId, setLastResultId] = useState<string | null>(null);
  const [lastResultDate, setLastResultDate] = useState<string | null>(null);
  const [perfilFisiologico, setPerfilFisiologico] = useState<PerfilFisiologico | null>(null);

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

        // Transformar para o tipo esperado
        const typedScores: CalculatedScore[] = metricScores.map(s => ({
          metric: s.metric,
          raw_time_sec: s.raw_time_sec,
          percentile_value: s.percentile_value,
          percentile_set_id_used: '',
          data_source: (s.data_source as 'real' | 'estimated') || 'estimated'
        }));

        setScores(typedScores);
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
    lastResultDate
  };
}
