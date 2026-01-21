import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useBenchmarkResults } from '@/hooks/useBenchmarkResults';
import type { AthleteStatus } from '@/types/outlier';

// Types matching database tables
interface LevelRule {
  level_key: string;
  level_order: number;
  label: string;
  training_min_sessions: number;
  training_window_days: number;
  benchmarks_required: number;
  official_race_required: boolean;
  cap_without_official_race_percent: number;
}

interface JumpRule {
  jump_key: string;
  is_enabled: boolean;
  race_category: string;
  rank_scope: string;
  rank_top_n: number;
  target_level: string;
}

// Extended level type to include ELITE
export type ExtendedLevelKey = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'OPEN' | 'PRO' | 'ELITE';

// Map AthleteStatus to level key
export function statusToLevelKey(status: AthleteStatus): ExtendedLevelKey {
  const map: Record<AthleteStatus, ExtendedLevelKey> = {
    iniciante: 'BEGINNER',
    intermediario: 'INTERMEDIATE',
    avancado: 'ADVANCED',
    hyrox_open: 'OPEN',
    hyrox_pro: 'PRO',
  };
  return map[status] || 'BEGINNER';
}

// Map level key to AthleteStatus (for display compatibility)
export function levelKeyToStatus(key: ExtendedLevelKey): AthleteStatus | 'elite' {
  const map: Record<ExtendedLevelKey, AthleteStatus | 'elite'> = {
    BEGINNER: 'iniciante',
    INTERMEDIATE: 'intermediario',
    ADVANCED: 'avancado',
    OPEN: 'hyrox_open',
    PRO: 'hyrox_pro',
    ELITE: 'elite',
  };
  return map[key] || 'iniciante';
}

export interface LevelProgress {
  levelKey: ExtendedLevelKey;
  levelOrder: number;
  label: string;
  trainingProgress: number;
  benchmarkProgress: number;
  overallProgress: number;
  isCapped: boolean;
  capPercent: number;
  officialRaceRequired: boolean;
  hasOfficialRace: boolean;
  trainingSessions: number;
  trainingRequired: number;
  trainingWindowDays: number;
  benchmarksCompleted: number;
  benchmarksRequired: number;
}

export interface JourneyPosition {
  // The continuous position on the ruler (0.0 to 1.0)
  continuousPosition: number;
  // Current level index (0-5)
  currentLevelIndex: number;
  // Progress within current level (0-100)
  progressInLevel: number;
  // Current level data
  currentLevel: LevelProgress;
  // All level rules for display
  allLevels: LevelRule[];
  // Jump rules for display
  jumpRules: JumpRule[];
  // Is loading
  loading: boolean;
  // Cap warning
  isCapped: boolean;
  capPercent: number;
  // Absolute level from race (if any)
  absoluteLevelFromRace: ExtendedLevelKey | null;
  // Race info used
  raceInfo: {
    category: string;
    rankInAgeGroup: number;
  } | null;
}

export function useJourneyProgress(): JourneyPosition {
  const [levelRules, setLevelRules] = useState<LevelRule[]>([]);
  const [jumpRules, setJumpRules] = useState<JumpRule[]>([]);
  const [loading, setLoading] = useState(true);
  
  const athleteStatus = useAthleteStatus();
  const { results: benchmarkResults, getOfficialCompetitions } = useBenchmarkResults();
  
  // Fetch rules from database
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const [levelsRes, jumpsRes] = await Promise.all([
          supabase.from('status_level_rules').select('*').order('level_order'),
          supabase.from('status_jump_rules').select('*').eq('is_enabled', true),
        ]);
        
        if (levelsRes.data) setLevelRules(levelsRes.data);
        if (jumpsRes.data) setJumpRules(jumpsRes.data);
      } catch (error) {
        console.error('Error fetching status rules:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRules();
  }, []);
  
  const journeyPosition = useMemo<JourneyPosition>(() => {
    if (loading || levelRules.length === 0) {
      return {
        continuousPosition: 0,
        currentLevelIndex: 0,
        progressInLevel: 0,
        currentLevel: {
          levelKey: 'BEGINNER',
          levelOrder: 1,
          label: 'Iniciante',
          trainingProgress: 0,
          benchmarkProgress: 0,
          overallProgress: 0,
          isCapped: false,
          capPercent: 89,
          officialRaceRequired: false,
          hasOfficialRace: false,
          trainingSessions: 0,
          trainingRequired: 36,
          trainingWindowDays: 90,
          benchmarksCompleted: 0,
          benchmarksRequired: 3,
        },
        allLevels: [],
        jumpRules: [],
        loading: true,
        isCapped: false,
        capPercent: 89,
        absoluteLevelFromRace: null,
        raceInfo: null,
      };
    }
    
    // STEP 2: Determine absolute level from official race
    const officialCompetitions = getOfficialCompetitions();
    let absoluteLevelFromRace: ExtendedLevelKey | null = null;
    let raceInfo: { category: string; rankInAgeGroup: number } | null = null;
    let highestLevelOrder = 0;
    
    if (officialCompetitions.length > 0) {
      // For now, we'll use the validating competition from athleteStatus
      // In a full implementation, you'd check each competition against jump rules
      if (athleteStatus.validatingCompetition) {
        const comp = athleteStatus.validatingCompetition;
        const category = comp.race_category || 'OPEN';
        
        // Simulate rank (in real app, this would come from the competition result)
        // For now, if they have a validating competition, assume they qualify
        const rankInAgeGroup = 15; // Placeholder - would come from actual data
        
        raceInfo = { category, rankInAgeGroup };
        
        // Check each jump rule
        for (const rule of jumpRules) {
          if (rule.race_category === category && rankInAgeGroup <= rule.rank_top_n) {
            const targetLevelRule = levelRules.find(l => l.level_key === rule.target_level);
            if (targetLevelRule && targetLevelRule.level_order > highestLevelOrder) {
              highestLevelOrder = targetLevelRule.level_order;
              absoluteLevelFromRace = rule.target_level as ExtendedLevelKey;
            }
          }
        }
        
        // Special case: PRO wildcard (OPEN top 5 → PRO)
        if (category === 'OPEN' && rankInAgeGroup <= 5) {
          const proRule = levelRules.find(l => l.level_key === 'PRO');
          if (proRule && proRule.level_order > highestLevelOrder) {
            highestLevelOrder = proRule.level_order;
            absoluteLevelFromRace = 'PRO';
          }
        }
      }
    }
    
    // STEP 3: Determine final applied level
    let finalLevelKey: ExtendedLevelKey;
    
    if (absoluteLevelFromRace) {
      finalLevelKey = absoluteLevelFromRace;
    } else {
      // Without race, max level is ADVANCED
      const currentStatusLevel = statusToLevelKey(athleteStatus.status);
      const currentLevelRule = levelRules.find(l => l.level_key === currentStatusLevel);
      const advancedRule = levelRules.find(l => l.level_key === 'ADVANCED');
      
      if (currentLevelRule && advancedRule) {
        finalLevelKey = currentLevelRule.level_order <= advancedRule.level_order 
          ? currentStatusLevel 
          : 'ADVANCED';
      } else {
        finalLevelKey = currentStatusLevel;
      }
    }
    
    // STEP 4: Calculate progress within final level
    const finalLevelRule = levelRules.find(l => l.level_key === finalLevelKey);
    
    if (!finalLevelRule) {
      // Fallback
      return {
        continuousPosition: 0,
        currentLevelIndex: 0,
        progressInLevel: 0,
        currentLevel: {
          levelKey: 'BEGINNER',
          levelOrder: 1,
          label: 'Iniciante',
          trainingProgress: 0,
          benchmarkProgress: 0,
          overallProgress: 0,
          isCapped: false,
          capPercent: 89,
          officialRaceRequired: false,
          hasOfficialRace: false,
          trainingSessions: 0,
          trainingRequired: 36,
          trainingWindowDays: 90,
          benchmarksCompleted: 0,
          benchmarksRequired: 3,
        },
        allLevels: levelRules,
        jumpRules,
        loading: false,
        isCapped: false,
        capPercent: 89,
        absoluteLevelFromRace: null,
        raceInfo: null,
      };
    }
    
    // Count benchmarks completed
    const benchmarksCompleted = benchmarkResults.length;
    
    // Estimate training sessions (in real app, would query workout completions)
    const trainingSessions = athleteStatus.benchmarksUsed * 4; // Rough estimate
    
    // Calculate progress components
    const trainingProgress = Math.min(1, trainingSessions / finalLevelRule.training_min_sessions);
    const benchmarkProgress = Math.min(1, benchmarksCompleted / finalLevelRule.benchmarks_required);
    
    // Calculate overall progress
    let overallProgress = 0.6 * trainingProgress + 0.4 * benchmarkProgress;
    
    // Check if capped
    const hasOfficialRace = officialCompetitions.length > 0;
    let isCapped = false;
    
    if (finalLevelRule.official_race_required && !hasOfficialRace) {
      const cap = finalLevelRule.cap_without_official_race_percent / 100;
      if (overallProgress > cap) {
        overallProgress = cap;
        isCapped = true;
      }
    }
    
    // STEP 5: Convert to continuous position
    const totalLevels = levelRules.length;
    const currentLevelIndex = finalLevelRule.level_order - 1; // 0-based
    const continuousPosition = (currentLevelIndex + overallProgress) / totalLevels;
    
    const currentLevel: LevelProgress = {
      levelKey: finalLevelKey,
      levelOrder: finalLevelRule.level_order,
      label: finalLevelRule.label,
      trainingProgress,
      benchmarkProgress,
      overallProgress,
      isCapped,
      capPercent: finalLevelRule.cap_without_official_race_percent,
      officialRaceRequired: finalLevelRule.official_race_required,
      hasOfficialRace,
      trainingSessions,
      trainingRequired: finalLevelRule.training_min_sessions,
      trainingWindowDays: finalLevelRule.training_window_days,
      benchmarksCompleted,
      benchmarksRequired: finalLevelRule.benchmarks_required,
    };
    
    return {
      continuousPosition,
      currentLevelIndex,
      progressInLevel: Math.round(overallProgress * 100),
      currentLevel,
      allLevels: levelRules,
      jumpRules,
      loading: false,
      isCapped,
      capPercent: finalLevelRule.cap_without_official_race_percent,
      absoluteLevelFromRace,
      raceInfo,
    };
  }, [loading, levelRules, jumpRules, athleteStatus, benchmarkResults, getOfficialCompetitions]);
  
  return journeyPosition;
}
