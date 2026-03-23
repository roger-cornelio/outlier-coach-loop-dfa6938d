import { useMemo, useCallback } from 'react';
import { useAthletePlan } from '@/hooks/useAthletePlan';

const LAST_SEEN_KEY = 'outlier_last_seen_plan_ts';

function getLastSeen(): number {
  try {
    return Number(localStorage.getItem(LAST_SEEN_KEY) || '0');
  } catch {
    return 0;
  }
}

export function useNewPlanIndicator() {
  const { plans } = useAthletePlan();

  const hasNewPlan = useMemo(() => {
    if (!plans.length) return false;
    const lastSeen = getLastSeen();
    return plans.some(p => {
      if (!p.published_at) return false;
      return new Date(p.published_at).getTime() > lastSeen;
    });
  }, [plans]);

  const markAsSeen = useCallback(() => {
    try {
      localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
    } catch { /* silent */ }
  }, []);

  return { hasNewPlan, markAsSeen };
}
