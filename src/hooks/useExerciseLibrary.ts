/**
 * Hook for searching global + custom exercises with movement patterns.
 * Powers the ExerciseSelector combobox in the coach workout editor.
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MovementPattern } from '@/utils/energyCalculator';

export interface ExerciseOption {
  id: string;
  name: string;
  source: 'global' | 'custom';
  movementPattern: MovementPattern;
  defaultMaleWeightKg?: number | null;
  defaultFemaleWeightKg?: number | null;
}

interface RawMovementPattern {
  id: string;
  name: string;
  formula_type: string;
  moved_mass_percentage: number;
  default_distance_meters: number;
  friction_coefficient: number | null;
  human_efficiency_rate: number;
}

export function useMovementPatterns() {
  return useQuery({
    queryKey: ['movement-patterns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movement_patterns')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data as RawMovementPattern[]).map(row => ({
        ...row,
        formula_type: row.formula_type as MovementPattern['formula_type'],
      })) as MovementPattern[];
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
  });
}

export function useExerciseLibrary(coachUserId?: string) {
  const { data: patterns = [] } = useMovementPatterns();

  const patternMap = useMemo(() => {
    const map = new Map<string, MovementPattern>();
    for (const p of patterns) map.set(p.id, p);
    return map;
  }, [patterns]);

  const { data: globalExercises = [] } = useQuery({
    queryKey: ['global-exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_exercises')
        .select('id, name, movement_pattern_id, default_male_weight_kg, default_female_weight_kg')
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30,
    enabled: patterns.length > 0,
  });

  const { data: customExercises = [], refetch: refetchCustom } = useQuery({
    queryKey: ['custom-exercises', coachUserId],
    queryFn: async () => {
      if (!coachUserId) return [];
      const { data, error } = await supabase
        .from('custom_exercises')
        .select('id, name, movement_pattern_id')
        .eq('coach_id', coachUserId)
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!coachUserId && patterns.length > 0,
  });

  const allExercises = useMemo<ExerciseOption[]>(() => {
    const result: ExerciseOption[] = [];

    for (const ex of globalExercises) {
      const pattern = patternMap.get(ex.movement_pattern_id);
      if (pattern) {
        result.push({
          id: ex.id,
          name: ex.name,
          source: 'global',
          movementPattern: pattern,
          defaultMaleWeightKg: ex.default_male_weight_kg,
          defaultFemaleWeightKg: ex.default_female_weight_kg,
        });
      }
    }

    for (const ex of customExercises) {
      const pattern = patternMap.get(ex.movement_pattern_id);
      if (pattern) {
        result.push({ id: ex.id, name: ex.name, source: 'custom', movementPattern: pattern });
      }
    }

    return result;
  }, [globalExercises, customExercises, patternMap]);

  const createCustomExercise = async (name: string, patternId: string) => {
    if (!coachUserId) throw new Error('Coach ID required');

    const { data, error } = await supabase
      .from('custom_exercises')
      .insert({ coach_id: coachUserId, name, movement_pattern_id: patternId })
      .select('id, name, movement_pattern_id')
      .single();

    if (error) throw error;
    await refetchCustom();

    const pattern = patternMap.get(data.movement_pattern_id);
    return {
      id: data.id,
      name: data.name,
      source: 'custom' as const,
      movementPattern: pattern!,
    };
  };

  return {
    exercises: allExercises,
    patterns,
    createCustomExercise,
    refetchCustom,
  };
}
