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
  unavailable_equipment: string[] | null;
  equipment_notes: string | null;
  onboarding_experience: string | null;
  onboarding_goal: string | null;
  onboarding_target_race: string | null;
  session_duration: string | null;
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

      // Query the view via raw SQL since it's not in generated types
      const { data, error: queryError } = await supabase
        .rpc('get_coach_overview' as any, { _coach_id: user.id });

      if (queryError) {
        // Fallback: query coach_athletes + profiles directly
        console.warn('[useCoachOverview] View query failed, using fallback:', queryError.message);
        const { data: links } = await supabase
          .from('coach_athletes')
          .select('athlete_id')
          .eq('coach_id', user.id);
        
        if (!links || links.length === 0) {
          setAthletes([]);
          return;
        }

        const athleteIds = links.map(l => l.athlete_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, email, sexo, status, last_active_at, peso, altura, training_level, created_at, session_duration, onboarding_experience, onboarding_goal, onboarding_target_race, unavailable_equipment, equipment_notes')
          .in('user_id', athleteIds);

        const fallbackAthletes: AthleteOverview[] = (profiles || []).map(p => ({
          coach_id: user.id,
          athlete_id: p.user_id,
          athlete_name: p.name,
          athlete_email: p.email,
          sexo: p.sexo,
          account_status: p.status || 'active',
          last_active_at: p.last_active_at,
          peso: p.peso ? Number(p.peso) : null,
          altura: p.altura,
          training_level: p.training_level,
          unavailable_equipment: null,
          equipment_notes: null,
          onboarding_experience: null,
          onboarding_goal: null,
          onboarding_target_race: null,
          session_duration: (p as any).session_duration ?? null,
          days_inactive: p.last_active_at 
            ? Math.floor((Date.now() - new Date(p.last_active_at).getTime()) / 86400000)
            : Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000),
          workouts_last_7_days: 0,
          has_plan_this_week: 0,
          total_benchmarks: 0,
        }));

        setAthletes(fallbackAthletes);
        return;
      }

      setAthletes((data as unknown as AthleteOverview[]) || []);
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
