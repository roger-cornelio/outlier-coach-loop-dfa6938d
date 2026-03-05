import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Pure logic extraction from useJourneyProgress for testing.
 * Tests the core journey progress calculation without React hooks.
 */

type ExtendedLevelKey = 'OPEN' | 'PRO' | 'ELITE';

interface LevelRule {
  level_key: string;
  level_order: number;
  label: string;
  training_min_sessions: number;
  benchmarks_required: number;
  official_race_required: boolean;
}

// Simulated admin-defined rules (matching screenshot)
const LEVEL_RULES: LevelRule[] = [
  { level_key: 'OPEN', level_order: 1, label: 'HYROX OPEN', training_min_sessions: 120, benchmarks_required: 3, official_race_required: false },
  { level_key: 'PRO', level_order: 2, label: 'HYROX PRO', training_min_sessions: 200, benchmarks_required: 5, official_race_required: true },
  { level_key: 'ELITE', level_order: 3, label: 'HYROX ELITE', training_min_sessions: 400, benchmarks_required: 10, official_race_required: true },
];

const JOURNEY_EXPIRATION_DAYS = 365;

/**
 * Core calculation logic matching useJourneyProgress (with 12-month expiration)
 */
function calculateJourney(
  trainingSessions: number,
  benchmarksCompleted: number,
  category: ExtendedLevelKey,
  hasOfficialRace: boolean,
) {
  const levelRules = LEVEL_RULES;
  const currentCategory = category;
  const currentCategoryRule = levelRules.find(l => l.level_key === currentCategory)!;
  const currentLevelIndex = Math.max(0, levelRules.findIndex(l => l.level_key === currentCategory));

  const hasEnoughTraining = trainingSessions >= currentCategoryRule.training_min_sessions;
  const hasEnoughBenchmarks = benchmarksCompleted >= currentCategoryRule.benchmarks_required;
  const isOutlierAtCategory = hasEnoughTraining && hasEnoughBenchmarks;

  let targetLevelKey: ExtendedLevelKey;
  let targetLevelLabel: string;
  let isAtTop = false;

  if (!isOutlierAtCategory) {
    targetLevelKey = currentCategory;
    targetLevelLabel = `OUTLIER ${currentCategory}`;
  } else if (currentCategory === 'ELITE') {
    targetLevelKey = 'ELITE';
    targetLevelLabel = 'OUTLIER ELITE';
    isAtTop = true;
  } else {
    targetLevelKey = currentCategory;
    targetLevelLabel = `OUTLIER ${currentCategory}`;
  }

  const targetTrainingReq = currentCategoryRule.training_min_sessions;
  const targetBenchmarksReq = currentCategoryRule.benchmarks_required;

  const trainingProgress = Math.min(1, trainingSessions / targetTrainingReq);
  const benchmarkProgress = Math.min(1, benchmarksCompleted / targetBenchmarksReq);
  const overallProgress = (isOutlierAtCategory || isAtTop) ? 1 : (trainingProgress + benchmarkProgress) / 2;
  const progressPercent = overallProgress > 0 ? Math.max(1, Math.round(overallProgress * 100)) : 0;

  const nextCategoryIdx = Math.min(currentLevelIndex + 1, levelRules.length - 1);
  const nextCategoryKey = isOutlierAtCategory && !isAtTop
    ? levelRules[nextCategoryIdx].level_key as ExtendedLevelKey
    : null;
  const provaNecessaria = isOutlierAtCategory && !isAtTop;

  return {
    currentCategory,
    isOutlier: isOutlierAtCategory,
    targetLevelKey,
    targetLevelLabel,
    isAtTop,
    targetTrainingReq,
    targetBenchmarksReq,
    trainingProgress: Math.round(trainingProgress * 100),
    benchmarkProgress: Math.round(benchmarkProgress * 100),
    progressPercent,
    nextCategoryKey,
    provaNecessaria,
  };
}

/**
 * Simulate the 12-month expiration filter.
 * Given training dates and a "now" date, returns only valid sessions.
 */
function filterValidSessions(
  sessionDates: string[],
  nowDate: Date,
): string[] {
  const cutoff = new Date(nowDate);
  cutoff.setDate(cutoff.getDate() - JOURNEY_EXPIRATION_DAYS);
  const cutoffStr = cutoff.toISOString().substring(0, 10);
  return sessionDates.filter(d => d >= cutoffStr);
}

describe('Jornada OUTLIER V1 — Fluxo de Progressão', () => {
  it('Cenário 1: 120 treinos + 3 benchmarks + sem prova → 100% OPEN OUTLIER', () => {
    const result = calculateJourney(120, 3, 'OPEN', false);

    expect(result.currentCategory).toBe('OPEN');
    expect(result.isOutlier).toBe(true);
    expect(result.progressPercent).toBe(100);
    expect(result.targetLevelKey).toBe('OPEN');
    expect(result.targetLevelLabel).toBe('OUTLIER OPEN');
    expect(result.provaNecessaria).toBe(true);
    expect(result.nextCategoryKey).toBe('PRO');
  });

  it('Cenário 2: Mesmos treinos/benchmarks + prova PRO → régua ajusta para requisitos PRO', () => {
    const result = calculateJourney(120, 3, 'PRO', true);

    expect(result.currentCategory).toBe('PRO');
    expect(result.isOutlier).toBe(false);
    expect(result.targetLevelKey).toBe('PRO');
    expect(result.targetLevelLabel).toBe('OUTLIER PRO');
    expect(result.targetTrainingReq).toBe(200);
    expect(result.targetBenchmarksReq).toBe(5);
    expect(result.trainingProgress).toBe(60);
    expect(result.benchmarkProgress).toBe(60);
    expect(result.progressPercent).toBe(60);
  });

  it('Cenário 3: Completa requisitos PRO → 100% PRO OUTLIER, precisa prova ELITE', () => {
    const result = calculateJourney(200, 5, 'PRO', true);

    expect(result.isOutlier).toBe(true);
    expect(result.progressPercent).toBe(100);
    expect(result.targetLevelKey).toBe('PRO');
    expect(result.targetLevelLabel).toBe('OUTLIER PRO');
    expect(result.provaNecessaria).toBe(true);
    expect(result.nextCategoryKey).toBe('ELITE');
  });

  it('Cenário 4: Prova ELITE + requisitos parciais → progresso com requisitos ELITE', () => {
    const result = calculateJourney(250, 7, 'ELITE', true);

    expect(result.currentCategory).toBe('ELITE');
    expect(result.isOutlier).toBe(false);
    expect(result.targetLevelKey).toBe('ELITE');
    expect(result.targetLevelLabel).toBe('OUTLIER ELITE');
    expect(result.targetTrainingReq).toBe(400);
    expect(result.targetBenchmarksReq).toBe(10);
    expect(result.trainingProgress).toBe(63);
    expect(result.benchmarkProgress).toBe(70);
  });

  it('Cenário 5: ELITE OUTLIER completo → topo, 100%', () => {
    const result = calculateJourney(400, 10, 'ELITE', true);

    expect(result.isOutlier).toBe(true);
    expect(result.isAtTop).toBe(true);
    expect(result.progressPercent).toBe(100);
  });

  it('Cenário 6: Sem treinos nem benchmarks → 0%', () => {
    const result = calculateJourney(0, 0, 'OPEN', false);

    expect(result.isOutlier).toBe(false);
    expect(result.progressPercent).toBe(0);
    expect(result.targetTrainingReq).toBe(120);
    expect(result.targetBenchmarksReq).toBe(3);
  });

  it('Cenário 7: Transição OPEN OUTLIER → PRO via prova', () => {
    const before = calculateJourney(120, 3, 'OPEN', false);
    expect(before.isOutlier).toBe(true);
    expect(before.progressPercent).toBe(100);

    const after = calculateJourney(120, 3, 'PRO', true);
    expect(after.isOutlier).toBe(false);
    expect(after.targetTrainingReq).toBe(200);
    expect(after.trainingProgress).toBe(60);
    expect(after.benchmarkProgress).toBe(60);
    expect(after.progressPercent).toBe(60);
  });
});

describe('Jornada OUTLIER — Expiração de 12 meses', () => {
  it('Cenário 8: Treinos dentro de 12 meses são contados', () => {
    const now = new Date('2026-03-05');
    const sessions = [
      '2025-06-01', // ~9 months ago — valid
      '2025-09-15', // ~6 months ago — valid
      '2026-01-10', // ~2 months ago — valid
    ];
    const valid = filterValidSessions(sessions, now);
    expect(valid.length).toBe(3);
  });

  it('Cenário 9: Treinos com mais de 12 meses são descartados', () => {
    const now = new Date('2026-03-05');
    const sessions = [
      '2024-12-01', // ~15 months ago — expired
      '2025-01-15', // ~14 months ago — expired
      '2025-06-01', // ~9 months ago — valid
      '2026-01-10', // ~2 months ago — valid
    ];
    const valid = filterValidSessions(sessions, now);
    expect(valid.length).toBe(2);
  });

  it('Cenário 10: Todos os treinos expirados → régua zera, mas categoria mantém', () => {
    const now = new Date('2026-03-05');
    const sessions = [
      '2024-06-01', // ~21 months ago
      '2024-09-01', // ~18 months ago
    ];
    const valid = filterValidSessions(sessions, now);
    expect(valid.length).toBe(0);

    // With 0 valid sessions, progress is 0 but category stays PRO
    const result = calculateJourney(0, 0, 'PRO', true);
    expect(result.currentCategory).toBe('PRO');
    expect(result.progressPercent).toBe(0);
    expect(result.isOutlier).toBe(false);
  });

  it('Cenário 11: Treino no limite exato de 365 dias é incluído', () => {
    const now = new Date('2026-03-05');
    const sessions = [
      '2025-03-05', // exactly 365 days ago — should be included (>= cutoff)
      '2025-03-04', // 366 days ago — expired
    ];
    const valid = filterValidSessions(sessions, now);
    expect(valid.length).toBe(1);
    expect(valid[0]).toBe('2025-03-05');
  });

  it('Cenário 12: Atleta perde Outlier quando treinos expiram, mas mantém categoria', () => {
    // Before: OPEN OUTLIER with 120 training sessions
    const resultBefore = calculateJourney(120, 3, 'OPEN', false);
    expect(resultBefore.isOutlier).toBe(true);
    expect(resultBefore.progressPercent).toBe(100);

    // After: 80 sessions expired, only 40 remain valid
    const resultAfter = calculateJourney(40, 3, 'OPEN', false);
    expect(resultAfter.isOutlier).toBe(false);
    expect(resultAfter.currentCategory).toBe('OPEN'); // Category preserved
    expect(resultAfter.progressPercent).toBeLessThan(100);
  });
});
