/**
 * useTargetTimes — reads admin-configured target times from system_params
 * Falls back to hardcoded defaults from getEliteTargetSeconds
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AthleteStatus } from '@/types/outlier';

interface LevelTargetTimes {
  open: { masculino: number; feminino: number };
  pro: { masculino: number; feminino: number };
  elite: { masculino: number; feminino: number };
}

// Maps athlete status → which level they're targeting (Jornada V1: 3 levels only)
const STATUS_TO_TARGET_LEVEL: Record<string, keyof LevelTargetTimes> = {
  open: 'pro',
  pro: 'elite',
  elite: 'elite',
};

const LEVEL_LABELS: Record<string, string> = {
  open: 'OPEN',
  pro: 'PRO',
  elite: 'ELITE',
};

let cachedTargets: LevelTargetTimes | null = null;

export function useTargetTimes(status: AthleteStatus | string, gender: string) {
  const [targets, setTargets] = useState<LevelTargetTimes | null>(cachedTargets);

  useEffect(() => {
    if (cachedTargets) return;
    
    async function load() {
      const { data } = await supabase
        .from('system_params')
        .select('value')
        .eq('key', 'level_target_times')
        .single();

      if (data?.value && typeof data.value === 'object') {
        cachedTargets = data.value as unknown as LevelTargetTimes;
        setTargets(cachedTargets);
      }
    }
    load();
  }, []);

  return useMemo(() => {
    const targetLevel = STATUS_TO_TARGET_LEVEL[status];
    if (!targetLevel) return null;

    const genderKey = gender === 'feminino' ? 'feminino' : 'masculino';
    
    if (targets?.[targetLevel]?.[genderKey]) {
      return {
        targetSeconds: targets[targetLevel][genderKey],
        targetLabel: LEVEL_LABELS[targetLevel],
      };
    }

    // Fallback defaults
    const DEFAULTS: LevelTargetTimes = {
      open: { masculino: 4200, feminino: 4500 },
      pro: { masculino: 3960, feminino: 4200 },
      elite: { masculino: 3960, feminino: 4200 },
    };

    return {
      targetSeconds: DEFAULTS[targetLevel][genderKey],
      targetLabel: LEVEL_LABELS[targetLevel],
    };
  }, [status, gender, targets]);
}