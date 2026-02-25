import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useBenchmarkResults } from '@/hooks/useBenchmarkResults';
import { useOutlierStore } from '@/store/outlierStore';
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

// Extended level type
export type ExtendedLevelKey = 'OPEN' | 'PRO' | 'ELITE';

// Map AthleteStatus to level key
export function statusToLevelKey(status: AthleteStatus): ExtendedLevelKey {
  const map: Record<AthleteStatus, ExtendedLevelKey> = {
    open: 'OPEN',
    pro: 'PRO',
    elite: 'ELITE',
  };
  return map[status] || 'OPEN';
}

// Map level key to AthleteStatus
export function levelKeyToStatus(key: ExtendedLevelKey): AthleteStatus {
  const map: Record<ExtendedLevelKey, AthleteStatus> = {
    OPEN: 'open',
    PRO: 'pro',
    ELITE: 'elite',
  };
  return map[key] || 'open';
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
  continuousPosition: number;
  currentLevelIndex: number;
  targetLevelIndex: number;
  progressToTarget: number;
  currentLevelKey: ExtendedLevelKey;
  currentLevelLabel: string;
  targetLevelKey: ExtendedLevelKey;
  targetLevelLabel: string;
  isAtTop: boolean;
  targetLevel: TargetLevelProgress;
  allLevels: LevelRule[];
  jumpRules: any[];
  loading: boolean;
  isCapped: boolean;
  capPercent: number;
  hasOfficialRace: boolean;
  absoluteLevelFromRace: ExtendedLevelKey | null;
  raceInfo: null;
  // New fields for Jornada OUTLIER V1
  trainingSessions: number;
  isOutlier: boolean;
  outlierTitle: string | null;
  outlierLevel: ExtendedLevelKey | null;
  category: ExtendedLevelKey;
  missingRequirements: string[];
  nextRequirements: {
    treinosRestantes: number;
    benchmarksRestantes: number;
    provaNecessaria: boolean;
  };
}

const LEVELS_ORDER: ExtendedLevelKey[] = ['OPEN', 'PRO', 'ELITE'];

/**
 * Count unique training days from workoutResults (max 1 per day).
 * Benchmark results are excluded (they don't count as training).
 */
function countUniqueTrainingDays(workoutResults: { date: string; blockId?: string }[]): number {
  const uniqueDays = new Set<string>();
  for (const r of workoutResults) {
    if (r.date) {
      const day = r.date.substring(0, 10); // YYYY-MM-DD
      uniqueDays.add(day);
    }
  }
  return uniqueDays.size;
}

/**
 * Count unique benchmark IDs completed.
 */
function countUniqueBenchmarks(benchmarkResults: { benchmark_id?: string }[]): number {
  const uniqueIds = new Set<string>();
  for (const r of benchmarkResults) {
    if (r.benchmark_id) {
      uniqueIds.add(r.benchmark_id);
    }
  }
  return uniqueIds.size;
}

/**
 * Determine category from official race results.
 * Without a race → OPEN.
 */
function determineCategoryFromRace(
  officialCompetitions: { race_category?: string; time_in_seconds?: number }[]
): ExtendedLevelKey {
  if (officialCompetitions.length === 0) return 'OPEN';
  
  // Find best category from official results
  let bestCategory: ExtendedLevelKey = 'OPEN';
  const categoryOrder: Record<string, number> = { OPEN: 0, PRO: 1, ELITE: 2 };
  
  for (const comp of officialCompetitions) {
    const cat = (comp.race_category?.toUpperCase() || 'OPEN') as ExtendedLevelKey;
    if (LEVELS_ORDER.includes(cat) && (categoryOrder[cat] || 0) > (categoryOrder[bestCategory] || 0)) {
      bestCategory = cat;
    }
  }
  
  return bestCategory;
}

export function useJourneyProgress(): JourneyPosition {
  const [levelRules, setLevelRules] = useState<LevelRule[]>([]);
  const [loading, setLoading] = useState(true);
  
  const athleteStatus = useAthleteStatus();
  const { results: benchmarkResults, getOfficialCompetitions } = useBenchmarkResults();
  const { workoutResults } = useOutlierStore();
  
  // Fetch rules from database
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const levelsRes = await supabase
          .from('status_level_rules')
          .select('*')
          .order('level_order');
        
        if (levelsRes.data) {
          const activeLevelKeys = ['OPEN', 'PRO', 'ELITE'];
          setLevelRules(
            levelsRes.data
              .filter(l => activeLevelKeys.includes(l.level_key))
              .sort((a, b) => a.level_order - b.level_order)
          );
        }
      } catch (error) {
        console.error('Error fetching status rules:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRules();
  }, []);
  
  const journeyPosition = useMemo<JourneyPosition>(() => {
    // Count training sessions (unique days, max 1/day)
    const trainingSessions = countUniqueTrainingDays(workoutResults);
    
    // Count unique benchmarks completed
    const benchmarksCompleted = countUniqueBenchmarks(benchmarkResults);
    
    // Determine category from official race
    const officialCompetitions = getOfficialCompetitions();
    const hasOfficialRace = officialCompetitions.length > 0;
    const category = determineCategoryFromRace(officialCompetitions);
    
    const defaultTarget: TargetLevelProgress = {
      levelKey: 'OPEN',
      levelOrder: 1,
      label: 'OPEN',
      trainingProgress: 0,
      benchmarkProgress: 0,
      overallProgress: 0,
      isCapped: false,
      capPercent: 100,
      officialRaceRequired: false,
      hasOfficialRace,
      trainingSessions,
      trainingRequired: 120,
      trainingWindowDays: 99999,
      benchmarksCompleted,
      benchmarksRequired: 3,
    };

    if (loading || levelRules.length === 0) {
      return {
        continuousPosition: 0,
        currentLevelIndex: 0,
        targetLevelIndex: 0,
        progressToTarget: 0,
        currentLevelKey: 'OPEN',
        currentLevelLabel: 'OUTLIER OPEN',
        targetLevelKey: 'OPEN',
        targetLevelLabel: 'OUTLIER OPEN',
        isAtTop: false,
        targetLevel: defaultTarget,
        allLevels: [],
        jumpRules: [],
        loading: true,
        isCapped: false,
        capPercent: 100,
        hasOfficialRace,
        absoluteLevelFromRace: hasOfficialRace ? category : null,
        raceInfo: null,
        trainingSessions,
        isOutlier: false,
        outlierTitle: null,
        outlierLevel: null,
        category,
        missingRequirements: [],
        nextRequirements: { treinosRestantes: 120, benchmarksRestantes: 3, provaNecessaria: false },
      };
    }
    
    // STEP 1: Find the highest OUTLIER level the athlete has achieved
    // For each level, check: training + benchmarks + race (if required, except OPEN)
    let outlierLevel: ExtendedLevelKey | null = null;
    
    for (const levelKey of LEVELS_ORDER) {
      const rule = levelRules.find(l => l.level_key === levelKey);
      if (!rule) continue;
      
      const hasEnoughTraining = trainingSessions >= rule.training_min_sessions;
      const hasEnoughBenchmarks = benchmarksCompleted >= rule.benchmarks_required;
      
      // OPEN doesn't need a race. PRO/ELITE need race AND category >= level
      const needsRace = rule.official_race_required && levelKey !== 'OPEN';
      const categoryIndex = LEVELS_ORDER.indexOf(category);
      const levelIndex = LEVELS_ORDER.indexOf(levelKey);
      const hasRequiredRace = !needsRace || (hasOfficialRace && categoryIndex >= levelIndex);
      
      if (hasEnoughTraining && hasEnoughBenchmarks && hasRequiredRace) {
        outlierLevel = levelKey;
      }
    }
    
    const isOutlier = outlierLevel !== null;
    const outlierTitle = isOutlier ? `ATLETA OUTLIER — ${outlierLevel}` : null;
    
    // STEP 2: Determine the "current" displayed level = outlier level or category-based
    const currentLevelKey = outlierLevel || statusToLevelKey(athleteStatus.status);
    const currentLevelIndex = Math.max(0, levelRules.findIndex(l => l.level_key === currentLevelKey));
    const currentLevelRule = levelRules.find(l => l.level_key === currentLevelKey);
    const currentLevelLabel = `OUTLIER ${currentLevelRule?.label || currentLevelKey}`;
    
    // STEP 3: Determine target level (next above current)
    const isAtTop = currentLevelKey === 'ELITE';
    let targetLevelKey: ExtendedLevelKey;
    let targetLevelIndex: number;
    
    if (isAtTop) {
      targetLevelKey = 'ELITE';
      targetLevelIndex = levelRules.length - 1;
    } else {
      targetLevelIndex = Math.min(currentLevelIndex + 1, levelRules.length - 1);
      targetLevelKey = (levelRules[targetLevelIndex]?.level_key || 'ELITE') as ExtendedLevelKey;
    }
    
    const targetLevelRule = levelRules.find(l => l.level_key === targetLevelKey);
    const targetLevelLabel = `OUTLIER ${targetLevelRule?.label || targetLevelKey}`;
    
    // STEP 4: Calculate progress towards target level
    const targetTrainingReq = targetLevelRule?.training_min_sessions || 120;
    const targetBenchmarksReq = targetLevelRule?.benchmarks_required || 3;
    const targetNeedsRace = (targetLevelRule?.official_race_required || false) && targetLevelKey !== 'OPEN';
    
    const trainingProgress = Math.min(1, trainingSessions / targetTrainingReq);
    const benchmarkProgress = Math.min(1, benchmarksCompleted / targetBenchmarksReq);
    
    // Simple average of training + benchmarks (race is boolean requirement, not progress)
    const overallProgress = (trainingProgress + benchmarkProgress) / 2;
    
    // Missing requirements for target level
    const missingRequirements: string[] = [];
    const treinosRestantes = Math.max(0, targetTrainingReq - trainingSessions);
    const benchmarksRestantes = Math.max(0, targetBenchmarksReq - benchmarksCompleted);
    const categoryIdx = LEVELS_ORDER.indexOf(category);
    const targetIdx = LEVELS_ORDER.indexOf(targetLevelKey);
    const provaNecessaria = targetNeedsRace && (!hasOfficialRace || categoryIdx < targetIdx);
    
    if (treinosRestantes > 0) missingRequirements.push(`${treinosRestantes} treinos`);
    if (benchmarksRestantes > 0) missingRequirements.push(`${benchmarksRestantes} benchmarks`);
    if (provaNecessaria) missingRequirements.push(`Prova oficial ${targetLevelKey}`);
    
    // STEP 5: Continuous position for ruler
    const continuousPosition = (currentLevelIndex + overallProgress) / levelRules.length;
    
    const targetLevel: TargetLevelProgress = {
      levelKey: targetLevelKey,
      levelOrder: targetLevelRule?.level_order || 0,
      label: targetLevelLabel,
      trainingProgress,
      benchmarkProgress,
      overallProgress,
      isCapped: false, // No more CAP system
      capPercent: 100,
      officialRaceRequired: targetNeedsRace,
      hasOfficialRace,
      trainingSessions,
      trainingRequired: targetTrainingReq,
      trainingWindowDays: 99999,
      benchmarksCompleted,
      benchmarksRequired: targetBenchmarksReq,
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
      jumpRules: [],
      loading: false,
      isCapped: false,
      capPercent: 100,
      hasOfficialRace,
      absoluteLevelFromRace: hasOfficialRace ? category : null,
      raceInfo: null,
      trainingSessions,
      isOutlier,
      outlierTitle,
      outlierLevel,
      category,
      missingRequirements,
      nextRequirements: { treinosRestantes, benchmarksRestantes, provaNecessaria },
    };
  }, [loading, levelRules, athleteStatus, benchmarkResults, getOfficialCompetitions, workoutResults]);
  
  return journeyPosition;
}
