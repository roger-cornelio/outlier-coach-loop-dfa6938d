/**
 * useOutlierClassification — Fetches benchmarks and division factors,
 * then classifies the athlete based on their latest race result.
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { classifyAthlete, type ClassificationResult, type ClassificationInput } from '@/utils/outlierClassification';

interface EliteProBenchmark {
  sex: string;
  age_min: number;
  age_max: number;
  elite_pro_seconds: number;
}

interface DivisionFactor {
  division: string;
  factor: number;
}

interface UseOutlierClassificationResult {
  classification: ClassificationResult | null;
  loading: boolean;
  error: string | null;
  /** Re-classify with new input */
  classify: (input: ClassificationInput) => ClassificationResult | null;
  /** Raw data for admin */
  benchmarks: EliteProBenchmark[];
  factors: DivisionFactor[];
}

export function useOutlierClassification(): UseOutlierClassificationResult {
  const { user } = useAuth();
  const [benchmarks, setBenchmarks] = useState<EliteProBenchmark[]>([]);
  const [factors, setFactors] = useState<DivisionFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestRace, setLatestRace] = useState<{
    time_seconds: number;
    sex: string;
    age: number;
    division: string;
  } | null>(null);

  // Load benchmarks, factors, and latest race in parallel
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [benchRes, factorRes, profileRes, raceRes] = await Promise.all([
          supabase.from('benchmarks_elite_pro').select('sex, age_min, age_max, elite_pro_seconds').eq('is_active', true).eq('version', 'v1'),
          supabase.from('division_factors').select('division, factor').eq('is_active', true).eq('version', 'v1'),
          supabase.from('profiles').select('sexo, idade').eq('user_id', user.id).single(),
          supabase.from('benchmark_results')
            .select('time_in_seconds, race_category')
            .eq('user_id', user.id)
            .eq('result_type', 'prova_oficial')
            .order('event_date', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (benchRes.data) setBenchmarks(benchRes.data as unknown as EliteProBenchmark[]);
        if (factorRes.data) setFactors(factorRes.data as unknown as DivisionFactor[]);

        // Build latest race input
        if (raceRes.data?.time_in_seconds && profileRes.data) {
          const sex = profileRes.data.sexo === 'feminino' ? 'F' : 'M';
          const age = profileRes.data.idade || 30;
          // Map race_category to division
          const cat = (raceRes.data.race_category || 'OPEN').toUpperCase();
          let division = 'OPEN';
          if (cat.includes('PRO')) division = 'PRO';
          else if (cat.includes('DOUBLES')) division = 'DOUBLES';
          else if (cat.includes('RELAY')) division = 'RELAY';

          setLatestRace({
            time_seconds: raceRes.data.time_in_seconds,
            sex,
            age,
            division,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // Classify function
  const classify = useMemo(() => {
    return (input: ClassificationInput): ClassificationResult | null => {
      const bench = benchmarks.find(
        b => b.sex === input.sex && input.age >= b.age_min && input.age <= b.age_max
      );
      if (!bench) return null;

      const divFactor = factors.find(f => f.division === input.division);
      const factor = divFactor ? Number(divFactor.factor) : 1.0;

      return classifyAthlete(input.athlete_time_seconds, bench.elite_pro_seconds, factor);
    };
  }, [benchmarks, factors]);

  // Auto-classify latest race
  const classification = useMemo(() => {
    if (!latestRace || benchmarks.length === 0 || factors.length === 0) return null;
    return classify({
      athlete_time_seconds: latestRace.time_seconds,
      sex: latestRace.sex as 'M' | 'F',
      age: latestRace.age,
      division: latestRace.division,
    });
  }, [latestRace, classify]);

  return { classification, loading, error, classify, benchmarks, factors };
}
