/**
 * useCoachOverview - Hook for coach overview dashboard data
 * Uses the coach_athlete_overview view for lightweight queries
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AthleteOverview {
  coach_id: string;
  athlete_id: string;
  athlete_name: string | null;
  athlete_email: string;
  sexo: string | null;
  account_status: string;
  last_active_at: string | null;
  peso: number | null;
  altura: number | null;
  training_level: string | null;
  days_inactive: number;
  workouts_last_7_days: number;
  has_plan_this_week: number;
  total_benchmarks: number;
}

export type RiskLevel = 'high_performance' | 'attention' | 'churn_risk';

export function classifyRisk(athlete: AthleteOverview): RiskLevel {
  // Churn risk: 4+ days inactive OR zero workouts in 7 days with a plan
  if (athlete.days_inactive >= 4 || (athlete.workouts_last_7_days === 0 && athlete.has_plan_this_week > 0)) {
    return 'churn_risk';
  }
  // Attention: 2-3 days inactive OR low workout count
  if (athlete.days_inactive >= 2 || (athlete.workouts_last_7_days <= 1 && athlete.total_benchmarks > 0)) {
    return 'attention';
  }
  return 'high_performance';
}

export function useCoachOverview() {
  const [athletes, setAthletes] = useState<AthleteOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setAthletes([]);
        setError('Usuário não autenticado');
        return;
      }

      // Query the view directly via RPC-free approach
      const { data, error: queryError } = await supabase
        .from('coach_athlete_overview' as any)
        .select('*')
        .eq('coach_id', user.id);

      if (queryError) {
        console.error('[useCoachOverview] Query error:', queryError);
        setError(queryError.message);
        setAthletes([]);
        return;
      }

      setAthletes((data as AthleteOverview[]) || []);
    } catch (err) {
      console.error('[useCoachOverview] Error:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Classify and sort: worst first
  const sortedAthletes = useMemo(() => {
    const riskOrder: Record<RiskLevel, number> = { churn_risk: 0, attention: 1, high_performance: 2 };
    return [...athletes].sort((a, b) => {
      const riskA = classifyRisk(a);
      const riskB = classifyRisk(b);
      if (riskOrder[riskA] !== riskOrder[riskB]) return riskOrder[riskA] - riskOrder[riskB];
      return b.days_inactive - a.days_inactive;
    });
  }, [athletes]);

  // KPI counts
  const kpis = useMemo(() => {
    let highPerformance = 0;
    let attention = 0;
    let churnRisk = 0;
    for (const a of athletes) {
      const risk = classifyRisk(a);
      if (risk === 'high_performance') highPerformance++;
      else if (risk === 'attention') attention++;
      else churnRisk++;
    }
    return { highPerformance, attention, churnRisk, total: athletes.length };
  }, [athletes]);

  return {
    athletes: sortedAthletes,
    kpis,
    loading,
    error,
    refetch: fetchOverview,
  };
}
