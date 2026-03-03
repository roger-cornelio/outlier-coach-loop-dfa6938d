/**
 * useTopPercent — computes deterministic Top% from admin-defined thresholds.
 * 
 * Uses level_time_thresholds (elite_seconds = Top5%, pro_cap_seconds = Top10%)
 * and system_params.top_percent_anchors (elite_world_001, open_100).
 * 
 * Piecewise interpolation:
 * - ELITE zone (t <= t_elite_5): lerp 5%→0.01% toward world record
 * - PRO zone (t_elite_5 < t <= t_pro_10): lerp 10%→5%
 * - OPEN zone (t > t_pro_10): lerp 100%→10%
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ─── Math helpers ────────────────────────────────────────────────────────────

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function invLerp(a: number, b: number, v: number): number {
  if (a === b) return 0;
  return clamp01((v - a) / (b - a));
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TopPercentAnchors {
  elite_world_001: number; // seconds — world record / Top 0.01%
  open_100: number;        // seconds — slowest / Top 100%
}

interface ThresholdRow {
  elite_seconds: number;
  pro_cap_seconds: number;
  sex: string;
  age_min: number;
  age_max: number;
  division: string;
}

export interface TopPercentResult {
  /** Computed Top%, or null if data missing */
  topPercent: number | null;
  /** Formatted string like "Top 3%" or null */
  topText: string | null;
  /** Whether to show Top% (only if <= 20) */
  shouldShow: boolean;
  /** Meta ELITE time in seconds, or null */
  metaEliteSeconds: number | null;
  /** Loading state */
  loading: boolean;
}

// ─── Format Top% ─────────────────────────────────────────────────────────────

function formatTopPercent(top: number): string {
  if (top <= 0.01) return 'Top 0,01%';
  if (top < 1) return `Top ${top.toFixed(2).replace('.', ',')}%`;
  if (top < 10) return `Top ${top.toFixed(1).replace('.', ',')}%`;
  return `Top ${Math.round(top)}%`;
}

// ─── Compute piecewise ──────────────────────────────────────────────────────

function computeTopPercent(
  t: number,
  t_elite_5: number,
  t_pro_10: number,
  t_elite_world_001: number,
  t_open_100: number,
): number {
  // ELITE zone: faster than or equal to elite cutoff
  if (t <= t_elite_5) {
    if (t <= t_elite_world_001) return 0.01;
    const u = invLerp(t_elite_5, t_elite_world_001, t);
    return lerp(5.0, 0.01, u);
  }

  // PRO zone: between elite and pro cutoffs
  if (t <= t_pro_10) {
    const u = invLerp(t_pro_10, t_elite_5, t);
    return lerp(10.0, 5.0, u);
  }

  // OPEN zone: slower than pro cutoff
  const u = invLerp(t_open_100, t_pro_10, t);
  return lerp(100.0, 10.0, u);
}

// ─── Cache ───────────────────────────────────────────────────────────────────

let cachedThresholds: ThresholdRow[] | null = null;
let cachedAnchors: Record<string, TopPercentAnchors> | null = null;

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTopPercent(
  lastRaceSeconds: number | null | undefined,
  sex: string,
  age: number | null | undefined,
  division: string = 'INDIVIDUAL',
): TopPercentResult {
  const [thresholds, setThresholds] = useState<ThresholdRow[] | null>(cachedThresholds);
  const [anchors, setAnchors] = useState<Record<string, TopPercentAnchors> | null>(cachedAnchors);
  const [loading, setLoading] = useState(!cachedThresholds || !cachedAnchors);

  useEffect(() => {
    if (cachedThresholds && cachedAnchors) return;

    async function load() {
      const [threshRes, anchorsRes] = await Promise.all([
        supabase
          .from('level_time_thresholds')
          .select('elite_seconds, pro_cap_seconds, sex, age_min, age_max, division')
          .eq('is_active', true)
          .eq('version', 'v1'),
        supabase
          .from('system_params')
          .select('value')
          .eq('key', 'top_percent_anchors')
          .single(),
      ]);

      if (threshRes.data) {
        cachedThresholds = threshRes.data as ThresholdRow[];
        setThresholds(cachedThresholds);
      }

      if (anchorsRes.data?.value && typeof anchorsRes.data.value === 'object') {
        cachedAnchors = anchorsRes.data.value as unknown as Record<string, TopPercentAnchors>;
        setAnchors(cachedAnchors);
      }

      setLoading(false);
    }
    load();
  }, []);

  return useMemo((): TopPercentResult => {
    if (loading) return { topPercent: null, topText: null, shouldShow: false, metaEliteSeconds: null, loading: true };

    // Resolve sex key
    const sexKey = sex === 'feminino' ? 'F' : 'M';
    const genderKey = sex === 'feminino' ? 'feminino' : 'masculino';

    // Find matching threshold row
    const effectiveAge = age ?? 30; // default age bracket
    const row = thresholds?.find(
      (r) =>
        r.sex === sexKey &&
        r.division === division &&
        effectiveAge >= r.age_min &&
        effectiveAge <= r.age_max,
    );

    if (!row) {
      console.warn('missing_admin_threshold', { sex: sexKey, age: effectiveAge, division, reason: 'no matching level_time_thresholds row' });
      return { topPercent: null, topText: null, shouldShow: false, metaEliteSeconds: null, loading: false };
    }

    const t_elite_5 = row.elite_seconds;
    const t_pro_10 = row.pro_cap_seconds;
    const metaEliteSeconds = t_elite_5;

    // Get world-record and open-floor anchors
    const genderAnchors = anchors?.[genderKey];
    if (!genderAnchors) {
      console.warn('missing_admin_threshold', { genderKey, reason: 'no top_percent_anchors for gender' });
      return { topPercent: null, topText: null, shouldShow: false, metaEliteSeconds, loading: false };
    }

    const t_elite_world_001 = genderAnchors.elite_world_001;
    const t_open_100 = genderAnchors.open_100;

    if (!lastRaceSeconds || lastRaceSeconds <= 0) {
      return { topPercent: null, topText: null, shouldShow: false, metaEliteSeconds, loading: false };
    }

    const top = computeTopPercent(lastRaceSeconds, t_elite_5, t_pro_10, t_elite_world_001, t_open_100);

    // Clamp
    const clampedTop = Math.max(0.01, Math.min(100, top));

    // Visibility rule: only show if <= 20%
    const shouldShow = clampedTop <= 20;

    return {
      topPercent: clampedTop,
      topText: formatTopPercent(clampedTop),
      shouldShow,
      metaEliteSeconds,
      loading: false,
    };
  }, [lastRaceSeconds, sex, age, division, thresholds, anchors, loading]);
}
