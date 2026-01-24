/**
 * Hook: useWeeklyEvolution
 * 
 * Retorna dados de evolução semanal do atleta para o gráfico de evolução
 * Usa dados já existentes de benchmark_results + hyrox_metric_scores
 * 
 * Regras:
 * - Janela fixa: últimas 4-6 semanas
 * - Métrica: média de percentis ou score agregado
 * - Não criar nova lógica de scoring
 */

import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WeeklyEvolutionPoint {
  week: string;
  weekLabel: string;
  score: number;
  benchmarks: number;
}

interface EvolutionTrend {
  direction: 'improving' | 'stable' | 'declining';
  text: string;
}

interface UseWeeklyEvolutionResult {
  data: WeeklyEvolutionPoint[];
  loading: boolean;
  hasData: boolean;
  trend: EvolutionTrend;
  diagnosticText: string;
}

// Gerar diagnóstico textual baseado na tendência
function generateDiagnosticText(
  data: WeeklyEvolutionPoint[],
  trend: EvolutionTrend
): string {
  if (data.length === 0) {
    return 'Lance seu primeiro simulado ou prova para ver sua evolução.';
  }

  if (data.length === 1) {
    return 'Primeira semana registrada. Continue treinando para visualizar sua evolução.';
  }

  // Calcular variação recente
  const recentWeeks = data.slice(-3);
  const latestScore = recentWeeks[recentWeeks.length - 1]?.score || 0;
  const previousScore = recentWeeks[0]?.score || latestScore;
  const variation = latestScore - previousScore;

  // Diagnósticos baseados em tendência real
  if (trend.direction === 'improving') {
    if (variation > 10) {
      return 'Evolução consistente nas últimas semanas. Progressão mantida.';
    }
    return 'Tendência positiva detectada. O plano está funcionando.';
  }

  if (trend.direction === 'declining') {
    if (Math.abs(variation) > 10) {
      return 'Queda pontual detectada. Volume controlado nesta semana.';
    }
    return 'Estabilidade recente. Ajustes já aplicados no plano.';
  }

  // Estável
  return 'Consistência mantida. Foco em consolidar ganhos.';
}

// Calcular tendência baseada nos últimos pontos
function calculateTrend(data: WeeklyEvolutionPoint[]): EvolutionTrend {
  if (data.length < 2) {
    return { direction: 'stable', text: 'Dados insuficientes' };
  }

  const recentWeeks = data.slice(-4);
  if (recentWeeks.length < 2) {
    return { direction: 'stable', text: 'Estável' };
  }

  const first = recentWeeks[0].score;
  const last = recentWeeks[recentWeeks.length - 1].score;
  const diff = last - first;
  const percentChange = first > 0 ? (diff / first) * 100 : 0;

  if (percentChange > 5) {
    return { direction: 'improving', text: 'Em evolução' };
  }
  if (percentChange < -5) {
    return { direction: 'declining', text: 'Atenção necessária' };
  }
  return { direction: 'stable', text: 'Estável' };
}

export function useWeeklyEvolution(): UseWeeklyEvolutionResult {
  const { user } = useAuth();
  const [rawData, setRawData] = useState<WeeklyEvolutionPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    async function fetchEvolutionData() {
      setLoading(true);

      try {
        // Buscar resultados de benchmark com percentis calculados
        // Priorizar hyrox_metric_scores (dados congelados)
        const { data: metricScores, error: scoresError } = await supabase
          .from('hyrox_metric_scores')
          .select(`
            percentile_value,
            created_at,
            hyrox_result_id
          `)
          .order('created_at', { ascending: true });

        if (scoresError) {
          console.error('[useWeeklyEvolution] Error fetching scores:', scoresError);
        }

        // Fallback: usar benchmark_results diretamente se não há metric_scores
        const { data: benchmarks, error: benchError } = await supabase
          .from('benchmark_results')
          .select('id, created_at, score, bucket, result_type')
          .eq('user_id', user.id)
          .in('result_type', ['simulado', 'prova_oficial'])
          .order('created_at', { ascending: true });

        if (benchError) {
          console.error('[useWeeklyEvolution] Error fetching benchmarks:', benchError);
          setLoading(false);
          return;
        }

        // Agrupar por semana
        const weeklyData: Record<string, { scores: number[]; count: number; date: Date }> = {};

        // Usar metric_scores se disponível (mais preciso)
        if (metricScores && metricScores.length > 0) {
          // Agrupar percentis por semana
          metricScores.forEach((score) => {
            const date = new Date(score.created_at);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay() + 1); // Segunda-feira
            weekStart.setHours(0, 0, 0, 0);
            const weekKey = weekStart.toISOString().split('T')[0];

            if (!weeklyData[weekKey]) {
              weeklyData[weekKey] = { scores: [], count: 0, date: weekStart };
            }
            weeklyData[weekKey].scores.push(score.percentile_value);
            weeklyData[weekKey].count++;
          });
        } else if (benchmarks && benchmarks.length > 0) {
          // Fallback: usar bucket para estimar score
          const bucketToScore: Record<string, number> = {
            'ELITE': 90,
            'STRONG': 75,
            'OK': 50,
            'TOUGH': 30,
            'DNF': 10,
          };

          benchmarks.forEach((b) => {
            const date = new Date(b.created_at);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay() + 1);
            weekStart.setHours(0, 0, 0, 0);
            const weekKey = weekStart.toISOString().split('T')[0];

            if (!weeklyData[weekKey]) {
              weeklyData[weekKey] = { scores: [], count: 0, date: weekStart };
            }

            const score = b.score ?? bucketToScore[b.bucket || 'OK'] ?? 50;
            weeklyData[weekKey].scores.push(Number(score));
            weeklyData[weekKey].count++;
          });
        }

        // Converter para array e calcular médias
        const points: WeeklyEvolutionPoint[] = Object.entries(weeklyData)
          .map(([week, data]) => ({
            week,
            weekLabel: `${data.date.getDate()}/${data.date.getMonth() + 1}`,
            score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
            benchmarks: data.count,
          }))
          .sort((a, b) => a.week.localeCompare(b.week))
          .slice(-6); // Últimas 6 semanas

        setRawData(points);
      } catch (err) {
        console.error('[useWeeklyEvolution] Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvolutionData();
  }, [user?.id]);

  const trend = useMemo(() => calculateTrend(rawData), [rawData]);
  const diagnosticText = useMemo(() => generateDiagnosticText(rawData, trend), [rawData, trend]);

  return {
    data: rawData,
    loading,
    hasData: rawData.length > 0,
    trend,
    diagnosticText,
  };
}
