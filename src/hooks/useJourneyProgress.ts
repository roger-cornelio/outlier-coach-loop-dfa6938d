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

export interface TargetLevelProgress {
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
  // Current (absolute) level index (0-5)
  currentLevelIndex: number;
  // Target level index (next level or same if ELITE)
  targetLevelIndex: number;
  // Progress towards target level (0-100)
  progressToTarget: number;
  // Current absolute level key
  currentLevelKey: ExtendedLevelKey;
  // Current absolute level label
  currentLevelLabel: string;
  // Target level key (next level or ELITE for maintenance)
  targetLevelKey: ExtendedLevelKey;
  // Target level label
  targetLevelLabel: string;
  // Is at top (ELITE)?
  isAtTop: boolean;
  // Target level progress data
  targetLevel: TargetLevelProgress;
  // All level rules for display
  allLevels: LevelRule[];
  // Jump rules for display
  jumpRules: JumpRule[];
  // Is loading
  loading: boolean;
  // Cap warning (for target level)
  isCapped: boolean;
  capPercent: number;
  // Has official race
  hasOfficialRace: boolean;
  // Absolute level from race (if any)
  absoluteLevelFromRace: ExtendedLevelKey | null;
  // Race info used
  raceInfo: {
    category: string;
    rankInAgeGroup: number;
  } | null;
}

const LEVELS_ORDER: ExtendedLevelKey[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'OPEN', 'PRO', 'ELITE'];

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
    const defaultTarget: TargetLevelProgress = {
      levelKey: 'INTERMEDIATE',
      levelOrder: 2,
      label: 'Intermediário',
      trainingProgress: 0,
      benchmarkProgress: 0,
      overallProgress: 0,
      isCapped: false,
      capPercent: 89,
      officialRaceRequired: false,
      hasOfficialRace: false,
      trainingSessions: 0,
      trainingRequired: 100,
      trainingWindowDays: 180,
      benchmarksCompleted: 0,
      benchmarksRequired: 5,
    };

    if (loading || levelRules.length === 0) {
      return {
        continuousPosition: 0,
        currentLevelIndex: 0,
        targetLevelIndex: 1,
        progressToTarget: 0,
        currentLevelKey: 'BEGINNER',
        currentLevelLabel: 'Iniciante',
        targetLevelKey: 'INTERMEDIATE',
        targetLevelLabel: 'Intermediário',
        isAtTop: false,
        targetLevel: defaultTarget,
        allLevels: [],
        jumpRules: [],
        loading: true,
        isCapped: false,
        capPercent: 89,
        hasOfficialRace: false,
        absoluteLevelFromRace: null,
        raceInfo: null,
      };
    }
    
    // STEP 1: Determine absolute level from official race
    const officialCompetitions = getOfficialCompetitions();
    let absoluteLevelFromRace: ExtendedLevelKey | null = null;
    let raceInfo: { category: string; rankInAgeGroup: number } | null = null;
    let highestLevelOrder = 0;
    
    if (officialCompetitions.length > 0) {
      if (athleteStatus.validatingCompetition) {
        const comp = athleteStatus.validatingCompetition;
        const category = comp.race_category || 'OPEN';
        const rankInAgeGroup = 15; // Placeholder
        
        raceInfo = { category, rankInAgeGroup };
        
        for (const rule of jumpRules) {
          if (rule.race_category === category && rankInAgeGroup <= rule.rank_top_n) {
            const targetLevelRule = levelRules.find(l => l.level_key === rule.target_level);
            if (targetLevelRule && targetLevelRule.level_order > highestLevelOrder) {
              highestLevelOrder = targetLevelRule.level_order;
              absoluteLevelFromRace = rule.target_level as ExtendedLevelKey;
            }
          }
        }
        
        // PRO wildcard
        if (category === 'OPEN' && rankInAgeGroup <= 5) {
          const proRule = levelRules.find(l => l.level_key === 'PRO');
          if (proRule && proRule.level_order > highestLevelOrder) {
            highestLevelOrder = proRule.level_order;
            absoluteLevelFromRace = 'PRO';
          }
        }
      }
    }
    
    // STEP 2: Determine current absolute level
    let currentLevelKey: ExtendedLevelKey;
    
    if (absoluteLevelFromRace) {
      currentLevelKey = absoluteLevelFromRace;
    } else {
      const currentStatusLevel = statusToLevelKey(athleteStatus.status);
      const currentLevelRule = levelRules.find(l => l.level_key === currentStatusLevel);
      const advancedRule = levelRules.find(l => l.level_key === 'ADVANCED');
      
      if (currentLevelRule && advancedRule) {
        currentLevelKey = currentLevelRule.level_order <= advancedRule.level_order 
          ? currentStatusLevel 
          : 'ADVANCED';
      } else {
        currentLevelKey = currentStatusLevel;
      }
    }
    
    const currentLevelRule = levelRules.find(l => l.level_key === currentLevelKey);
    const currentLevelIndex = currentLevelRule ? currentLevelRule.level_order - 1 : 0;
    const currentLevelLabel = currentLevelRule?.label || 'Iniciante';
    
    // STEP 3: Determine target level (NEXT level above current)
    const isAtTop = currentLevelKey === 'ELITE';
    let targetLevelKey: ExtendedLevelKey;
    let targetLevelIndex: number;
    
    if (isAtTop) {
      // ELITE: maintenance mode - target is self
      targetLevelKey = 'ELITE';
      targetLevelIndex = 5;
    } else {
      // Get next level
      targetLevelIndex = currentLevelIndex + 1;
      targetLevelKey = LEVELS_ORDER[targetLevelIndex] || 'ELITE';
    }
    
    const targetLevelRule = levelRules.find(l => l.level_key === targetLevelKey);
    const targetLevelLabel = targetLevelRule?.label || targetLevelKey;
    
    if (!targetLevelRule) {
      return {
        continuousPosition: 0,
        currentLevelIndex,
        targetLevelIndex,
        progressToTarget: 0,
        currentLevelKey,
        currentLevelLabel,
        targetLevelKey,
        targetLevelLabel,
        isAtTop,
        targetLevel: defaultTarget,
        allLevels: levelRules,
        jumpRules,
        loading: false,
        isCapped: false,
        capPercent: 89,
        hasOfficialRace: officialCompetitions.length > 0,
        absoluteLevelFromRace,
        raceInfo,
      };
    }
    
    // STEP 4: Calculate progress towards TARGET level (not current)
    const benchmarksCompleted = benchmarkResults.length;
    const trainingSessions = athleteStatus.benchmarksUsed * 4; // Rough estimate
    const hasOfficialRace = officialCompetitions.length > 0;
    
    // Use TARGET level's requirements
    const trainingProgress = Math.min(1, trainingSessions / targetLevelRule.training_min_sessions);
    const benchmarkProgress = Math.min(1, benchmarksCompleted / targetLevelRule.benchmarks_required);
    
    // Calculate overall progress (60% training + 40% benchmarks)
    let overallProgress = 0.6 * trainingProgress + 0.4 * benchmarkProgress;
    
    // Check if capped (target level requires race but athlete doesn't have one)
    let isCapped = false;
    if (targetLevelRule.official_race_required && !hasOfficialRace) {
      const cap = targetLevelRule.cap_without_official_race_percent / 100;
      if (overallProgress > cap) {
        overallProgress = cap;
        isCapped = true;
      }
    }
    
    // STEP 5: Convert to continuous position on ruler
    // Position = all completed levels + progress within current segment
    const totalLevels = levelRules.length;
    const continuousPosition = (currentLevelIndex + overallProgress) / totalLevels;
    
    const targetLevel: TargetLevelProgress = {
      levelKey: targetLevelKey,
      levelOrder: targetLevelRule.level_order,
      label: targetLevelLabel,
      trainingProgress,
      benchmarkProgress,
      overallProgress,
      isCapped,
      capPercent: targetLevelRule.cap_without_official_race_percent,
      officialRaceRequired: targetLevelRule.official_race_required,
      hasOfficialRace,
      trainingSessions,
      trainingRequired: targetLevelRule.training_min_sessions,
      trainingWindowDays: targetLevelRule.training_window_days,
      benchmarksCompleted,
      benchmarksRequired: targetLevelRule.benchmarks_required,
    };
    
    return {
      continuousPosition,
      currentLevelIndex,
      targetLevelIndex,
      progressToTarget: Math.round(overallProgress * 100),
      currentLevelKey,
      currentLevelLabel,
      targetLevelKey,
      targetLevelLabel,
      isAtTop,
      targetLevel,
      allLevels: levelRules,
      jumpRules,
      loading: false,
      isCapped,
      capPercent: targetLevelRule.cap_without_official_race_percent,
      hasOfficialRace,
      absoluteLevelFromRace,
      raceInfo,
    };
  }, [loading, levelRules, jumpRules, athleteStatus, benchmarkResults, getOfficialCompetitions]);
  
  return journeyPosition;
}
