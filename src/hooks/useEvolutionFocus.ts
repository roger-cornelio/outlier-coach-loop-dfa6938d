/**
 * useEvolutionFocus - Hook para identificar os focos de evolução do atleta
 * 
 * FONTE DE VERDADE: hyrox_metric_scores (frozen scores)
 * - Lê scores existentes do resultado mais recente
 * - Identifica as 2-3 métricas mais fracas (menor percentil)
 * - Retorna texto descritivo para exibição no dashboard
 * 
 * GUARDRAILS:
 * - Nunca calcula scores - apenas lê snapshots frozen
 * - Nunca mostra números crus - apenas diagnóstico textual
 * - Limita a 3 pontos de melhoria
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { type CalculatedScore } from '@/utils/hyroxPercentileCalculator';

// Labels amigáveis e emojis para as métricas HYROX
const METRIC_CONFIG: Record<string, { label: string; emoji: string }> = {
  run_avg: { label: 'Run', emoji: '🏃' },
  roxzone: { label: 'Roxzone', emoji: '⏱️' },
  ski: { label: 'Ski Erg', emoji: '⛷️' },
  sled_push: { label: 'Sled Push', emoji: '🛷' },
  sled_pull: { label: 'Sled Pull', emoji: '🛷' },
  bbj: { label: 'Burpee BJ', emoji: '💥' },
  row: { label: 'Row', emoji: '🚣' },
  farmers: { label: 'Farmers Carry', emoji: '🏋️' },
  sandbag: { label: 'Sandbag Lunges', emoji: '🎒' },
  wallballs: { label: 'Wall Balls', emoji: '🏐' }
};

// Descrições baseadas no percentil
function getWeaknessDescription(metric: string, percentile: number): string {
  const config = METRIC_CONFIG[metric];
  const label = config?.label || metric;
  
  if (percentile < 25) {
    return `${label} — força abaixo do esperado`;
  } else if (percentile < 40) {
    return `${label} — espaço para melhoria`;
  } else if (percentile < 50) {
    return `${label} — próximo da média, foco em consistência`;
  }
  return `${label} — manter intensidade`;
}

export interface EvolutionFocusPoint {
  metric: string;
  label: string;
  percentile: number;
  description: string;
  emoji: string;
}

export interface EvolutionFocusResult {
  focusPoints: EvolutionFocusPoint[];
  loading: boolean;
  hasData: boolean;
  lastResultDate: string | null;
}

export function useEvolutionFocus(): EvolutionFocusResult {
  const { user } = useAuth();
  const [scores, setScores] = useState<CalculatedScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastResultDate, setLastResultDate] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeakMetrics() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // 1. Buscar o resultado HYROX mais recente do atleta
        const { data: latestResult, error: resultError } = await supabase
          .from('benchmark_results')
          .select('id, created_at')
          .eq('user_id', user.id)
          .in('result_type', ['simulado', 'prova_oficial'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (resultError || !latestResult) {
          console.log('[EvolutionFocus] No HYROX results found');
          setLoading(false);
          return;
        }

        setLastResultDate(latestResult.created_at);

        // 2. Buscar scores frozen deste resultado
        const { data: metricScores, error: scoresError } = await supabase
          .from('hyrox_metric_scores')
          .select('metric, raw_time_sec, percentile_value, data_source')
          .eq('hyrox_result_id', latestResult.id);

        if (scoresError || !metricScores || metricScores.length === 0) {
          console.log('[EvolutionFocus] No metric scores found for result:', latestResult.id);
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
        console.error('[EvolutionFocus] Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchWeakMetrics();
  }, [user?.id]);

  // Calcular os 2-3 pontos de foco (métricas mais fracas)
  const focusPoints = useMemo((): EvolutionFocusPoint[] => {
    if (scores.length === 0) return [];

    // Ordenar por percentil (menor = mais fraco)
    const sorted = [...scores].sort((a, b) => a.percentile_value - b.percentile_value);

    // Pegar apenas as 2-3 mais fracas
    const weakest = sorted.slice(0, 3);

    // Filtrar apenas as que realmente são pontos de melhoria (< 50 percentil)
    const actualWeaknesses = weakest.filter(s => s.percentile_value < 50);

    // Se não há fraquezas significativas, mostrar as 2 menores mesmo assim
    const toShow = actualWeaknesses.length > 0 
      ? actualWeaknesses.slice(0, 2) 
      : weakest.slice(0, 2);

    return toShow.map(score => {
      const config = METRIC_CONFIG[score.metric];
      
      // Usar emoji específico da estação HYROX
      const emoji = config?.emoji || '🟡';

      return {
        metric: score.metric,
        label: config?.label || score.metric,
        percentile: score.percentile_value,
        description: getWeaknessDescription(score.metric, score.percentile_value),
        emoji
      };
    });
  }, [scores]);

  return {
    focusPoints,
    loading,
    hasData: scores.length > 0,
    lastResultDate
  };
}
