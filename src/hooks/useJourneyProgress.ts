import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
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

/** Expiration window: 12 months (365 days) */
const JOURNEY_EXPIRATION_DAYS = 365;
const STORAGE_KEY = 'outlier-benchmark-history';

function getExpirationCutoff(): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - JOURNEY_EXPIRATION_DAYS);
  return cutoff.toISOString().substring(0, 10);
}

/**
 * Count unique training days from store + localStorage (max 1 per day).
 * Only counts sessions within the last 12 months.
 */
function countUniqueTrainingDays(workoutResults: { date: string; blockId?: string }[]): number {
  const cutoff = getExpirationCutoff();
  const uniqueDays = new Set<string>();

  // Source 1: Zustand store
  for (const r of workoutResults) {
    if (r.date) {
      const day = r.date.substring(0, 10);
      if (day >= cutoff) uniqueDays.add(day);
    }
  }

  // Source 2: localStorage (persists across sessions)
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const items: { created_at?: string; completed?: boolean }[] = JSON.parse(stored);
      for (const item of items) {
        if (item.completed && item.created_at) {
          const day = item.created_at.substring(0, 10);
          if (day >= cutoff) uniqueDays.add(day);
        }
      }
    }
  } catch { /* noop */ }

  return uniqueDays.size;
}

/**
 * Determine category from validated official classification.
 * Without valid official race classification → OPEN.
 */
function determineCategoryFromAthleteStatus(
  athleteStatus: ReturnType<typeof useAthleteStatus>
): ExtendedLevelKey {
  if (athleteStatus.statusSource !== 'prova_oficial' || !athleteStatus.validatingCompetition) {
    return 'OPEN';
  }

  return statusToLevelKey(athleteStatus.status);
}

export function useJourneyProgress(): JourneyPosition {
  const [levelRules, setLevelRules] = useState<LevelRule[]>([]);
  const [outlierBenchmarksCompleted, setOutlierBenchmarksCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const athleteStatus = useAthleteStatus();
  const { user } = useAuth();
  const { workoutResults } = useOutlierStore();
  
  // Fetch rules and OUTLIER benchmark count from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [levelsRes, benchRes] = await Promise.all([
          supabase
            .from('status_level_rules')
            .select('*')
            .order('level_order'),
          // Count unique OUTLIER benchmarks from the correct table
          user?.id
            ? supabase
                .from('benchmark_outlier_progress')
                .select('benchmark_id')
                .eq('athlete_id', user.id)
            : Promise.resolve({ data: null }),
        ]);
        
        if (levelsRes.data) {
          const activeLevelKeys = ['OPEN', 'PRO', 'ELITE'];
          setLevelRules(
            levelsRes.data
              .filter(l => activeLevelKeys.includes(l.level_key))
              .sort((a, b) => a.level_order - b.level_order)
          );
        }

        if (benchRes.data) {
          // Count unique benchmark_ids with progress
          const uniqueIds = new Set(benchRes.data.map((r: any) => r.benchmark_id));
          setOutlierBenchmarksCompleted(uniqueIds.size);
        }
      } catch (error) {
        console.error('Error fetching status rules:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user?.id]);
  
  const journeyPosition = useMemo<JourneyPosition>(() => {
    // Count training sessions (unique days, max 1/day)
    const trainingSessions = countUniqueTrainingDays(workoutResults);
    
    // Use OUTLIER benchmarks from benchmark_outlier_progress (correct source)
    const benchmarksCompleted = outlierBenchmarksCompleted;
    
    // Determine category from validated official classification
    const hasOfficialRace = athleteStatus.statusSource === 'prova_oficial' && !!athleteStatus.validatingCompetition;
    const category = determineCategoryFromAthleteStatus(athleteStatus);
    
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
    // When outlier at current category: show 100% achieved, target = current category OUTLIER
    // The ruler only adjusts to next category when category changes via official race
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
      // At absolute top - ELITE OUTLIER achieved
      currentLevelLabel = `OUTLIER ${currentCategory}`;
      targetLevelKey = 'ELITE';
      targetLevelLabel = `OUTLIER ELITE`;
      targetLevelIndex = levelRules.length - 1;
      isAtTop = true;
    } else {
      // Outlier achieved at current category — show 100% achieved
      // Target stays at current category (already conquered)
      currentLevelLabel = `OUTLIER ${currentCategory}`;
      targetLevelKey = currentCategory;
      targetLevelLabel = `OUTLIER ${currentCategory}`;
      targetLevelIndex = currentLevelIndex;
    }
    
    // STEP 4: Calculate progress
    // When outlier at current category: 100% (achieved!)
    // When not outlier: progress towards current category requirements
    const targetRule = currentCategoryRule;
    
    const targetTrainingReq = targetRule?.training_min_sessions || 200;
    const targetBenchmarksReq = targetRule?.benchmarks_required || 5;
    
    const trainingProgress = Math.min(1, trainingSessions / targetTrainingReq);
    const benchmarkProgress = Math.min(1, benchmarksCompleted / targetBenchmarksReq);
    const overallProgress = (isOutlierAtCategory || isAtTop) ? 1 : (trainingProgress + benchmarkProgress) / 2;
    
    // Missing requirements
    const missingRequirements: string[] = [];
    const treinosRestantes = Math.max(0, targetTrainingReq - trainingSessions);
    const benchmarksRestantes = Math.max(0, targetBenchmarksReq - benchmarksCompleted);
    
    // When already outlier, show what's needed for next level (race)
    const nextCategoryIdx = Math.min(currentLevelIndex + 1, levelRules.length - 1);
    const nextCategoryKey = isOutlierAtCategory && !isAtTop
      ? (levelRules[nextCategoryIdx]?.level_key || 'ELITE') as ExtendedLevelKey
      : null;
    const provaNecessaria = isOutlierAtCategory && !isAtTop;
    
    if (treinosRestantes > 0) missingRequirements.push(`${treinosRestantes} treinos`);
    if (benchmarksRestantes > 0) missingRequirements.push(`${benchmarksRestantes} benchmarks`);
    if (provaNecessaria && nextCategoryKey) missingRequirements.push(`Prova oficial ${nextCategoryKey}`);
    
    // Continuous position for ruler
    const continuousPosition = levelRules.length > 1
      ? (currentLevelIndex + overallProgress) / (levelRules.length - 1)
      : 0;
    
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
  }, [loading, levelRules, athleteStatus, outlierBenchmarksCompleted, workoutResults]);
  
  return journeyPosition;
}
