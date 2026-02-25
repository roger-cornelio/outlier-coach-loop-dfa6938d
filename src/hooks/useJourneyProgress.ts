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
        currentLevelLabel: 'OPEN',
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
    
    // STEP 1: Determine current category from official race results
    // Category only changes with a race of the corresponding level
    // Without race → OPEN. PRO race → PRO. ELITE race → ELITE.
    const currentCategory = category; // Already determined from race results
    const currentCategoryRule = levelRules.find(l => l.level_key === currentCategory);
    
    // STEP 2: Check if athlete has achieved OUTLIER status at current category
    const hasEnoughTraining = trainingSessions >= (currentCategoryRule?.training_min_sessions || 200);
    const hasEnoughBenchmarks = benchmarksCompleted >= (currentCategoryRule?.benchmarks_required || 5);
    const isOutlierAtCategory = hasEnoughTraining && hasEnoughBenchmarks;
    
    const isOutlier = isOutlierAtCategory;
    const outlierLevel = isOutlier ? currentCategory : null;
    const outlierTitle = isOutlier ? `ATLETA OUTLIER — ${currentCategory}` : null;
    
    // STEP 3: Determine labels based on outlier status
    // Not yet outlier: "OPEN" → "OUTLIER OPEN" (working towards outlier at current category)
    // Already outlier: "OUTLIER OPEN" → "OUTLIER PRO" (needs PRO race to change category)
    const currentLevelKey = currentCategory;
    const currentLevelIndex = Math.max(0, levelRules.findIndex(l => l.level_key === currentCategory));
    
    let currentLevelLabel: string;
    let targetLevelKey: ExtendedLevelKey;
    let targetLevelLabel: string;
    let targetLevelIndex: number;
    let isAtTop = false;
    
    if (!isOutlierAtCategory) {
      // Working towards OUTLIER at current category
      currentLevelLabel = currentCategory;
      targetLevelKey = currentCategory;
      targetLevelLabel = `OUTLIER ${currentCategory}`;
      targetLevelIndex = currentLevelIndex;
    } else if (currentCategory === 'ELITE') {
      // At top - maintenance mode
      currentLevelLabel = `OUTLIER ${currentCategory}`;
      targetLevelKey = 'ELITE';
      targetLevelLabel = `OUTLIER ELITE`;
      targetLevelIndex = levelRules.length - 1;
      isAtTop = true;
    } else {
      // Already outlier, working towards next category (needs race)
      currentLevelLabel = `OUTLIER ${currentCategory}`;
      const nextCategoryIdx = Math.min(currentLevelIndex + 1, levelRules.length - 1);
      targetLevelKey = (levelRules[nextCategoryIdx]?.level_key || 'ELITE') as ExtendedLevelKey;
      targetLevelLabel = `OUTLIER ${targetLevelKey}`;
      targetLevelIndex = nextCategoryIdx;
    }
    
    // STEP 4: Calculate progress
    // If not yet outlier: progress towards current category requirements
    // If already outlier: progress towards next category requirements (but blocked by race)
    const targetRule = isOutlierAtCategory && !isAtTop
      ? levelRules[Math.min(currentLevelIndex + 1, levelRules.length - 1)]
      : currentCategoryRule;
    
    const targetTrainingReq = targetRule?.training_min_sessions || 200;
    const targetBenchmarksReq = targetRule?.benchmarks_required || 5;
    const targetNeedsRace = !isOutlierAtCategory ? false : true; // Next category always needs race
    
    const trainingProgress = Math.min(1, trainingSessions / targetTrainingReq);
    const benchmarkProgress = Math.min(1, benchmarksCompleted / targetBenchmarksReq);
    const overallProgress = isAtTop ? 1 : (trainingProgress + benchmarkProgress) / 2;
    
    // Missing requirements
    const missingRequirements: string[] = [];
    const treinosRestantes = Math.max(0, targetTrainingReq - trainingSessions);
    const benchmarksRestantes = Math.max(0, targetBenchmarksReq - benchmarksCompleted);
    
    // Race requirement: only for next category (when already outlier)
    const nextCategoryKey = isOutlierAtCategory && !isAtTop ? targetLevelKey : null;
    const categoryIdx = LEVELS_ORDER.indexOf(category);
    const targetIdx = nextCategoryKey ? LEVELS_ORDER.indexOf(nextCategoryKey) : -1;
    const provaNecessaria = isOutlierAtCategory && !isAtTop && categoryIdx < targetIdx;
    
    if (treinosRestantes > 0) missingRequirements.push(`${treinosRestantes} treinos`);
    if (benchmarksRestantes > 0) missingRequirements.push(`${benchmarksRestantes} benchmarks`);
    if (provaNecessaria) missingRequirements.push(`Prova oficial ${targetLevelKey}`);
    
    // Continuous position for ruler
    const continuousPosition = (currentLevelIndex + overallProgress) / levelRules.length;
    
    const targetLevel: TargetLevelProgress = {
      levelKey: targetLevelKey,
      levelOrder: targetRule?.level_order || 0,
      label: targetLevelLabel,
      trainingProgress,
      benchmarkProgress,
      overallProgress,
      isCapped: false,
      capPercent: 100,
      officialRaceRequired: provaNecessaria,
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
      progressToTarget: overallProgress > 0 ? Math.max(1, Math.round(overallProgress * 100)) : 0,
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
