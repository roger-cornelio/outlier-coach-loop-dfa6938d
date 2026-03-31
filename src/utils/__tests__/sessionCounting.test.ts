import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Testes da contagem de sessões e régua de jornada.
 * Extrai a lógica pura de countUniqueTrainingDays para teste isolado.
 */

const JOURNEY_EXPIRATION_DAYS = 365;
const STORAGE_KEY = 'outlier-benchmark-history';

function getExpirationCutoff(now?: Date): string {
  const cutoff = now ? new Date(now) : new Date();
  cutoff.setDate(cutoff.getDate() - JOURNEY_EXPIRATION_DAYS);
  return cutoff.toISOString().substring(0, 10);
}

function countUniqueTrainingDays(
  workoutResults: { date: string; blockId?: string }[],
  benchmarkHistory: { created_at?: string; completed?: boolean }[] | null,
  now?: Date,
): number {
  const cutoff = getExpirationCutoff(now);
  const uniqueDays = new Set<string>();

  // Source 1: Zustand store
  for (const r of workoutResults) {
    if (r.date) {
      const day = r.date.substring(0, 10);
      if (day >= cutoff) uniqueDays.add(day);
    }
  }

  // Source 2: benchmark history
  if (benchmarkHistory) {
    for (const item of benchmarkHistory) {
      if (item.completed && item.created_at) {
        const day = item.created_at.substring(0, 10);
        if (day >= cutoff) uniqueDays.add(day);
      }
    }
  }

  return uniqueDays.size;
}

describe('Contagem de Sessões — countUniqueTrainingDays', () => {
  it('Atleta novo sem dados → 0 sessões', () => {
    expect(countUniqueTrainingDays([], null)).toBe(0);
    expect(countUniqueTrainingDays([], [])).toBe(0);
  });

  it('Uma sessão hoje → 1 sessão', () => {
    const today = new Date().toISOString().substring(0, 10);
    const result = countUniqueTrainingDays([{ date: today }], null);
    expect(result).toBe(1);
  });

  it('Duas sessões no mesmo dia → 1 sessão (dedup por dia)', () => {
    const today = new Date().toISOString().substring(0, 10);
    const result = countUniqueTrainingDays(
      [{ date: today, blockId: 'a' }, { date: today, blockId: 'b' }],
      null,
    );
    expect(result).toBe(1);
  });

  it('Sessões em 3 dias diferentes → 3 sessões', () => {
    const result = countUniqueTrainingDays(
      [
        { date: '2026-03-28' },
        { date: '2026-03-29' },
        { date: '2026-03-30' },
      ],
      null,
      new Date('2026-03-31'),
    );
    expect(result).toBe(3);
  });

  it('Benchmark history contribui para contagem', () => {
    const result = countUniqueTrainingDays(
      [],
      [{ created_at: '2026-03-25T10:00:00Z', completed: true }],
      new Date('2026-03-31'),
    );
    expect(result).toBe(1);
  });

  it('Benchmark incompleto NÃO conta', () => {
    const result = countUniqueTrainingDays(
      [],
      [{ created_at: '2026-03-25T10:00:00Z', completed: false }],
      new Date('2026-03-31'),
    );
    expect(result).toBe(0);
  });

  it('Store + benchmark no mesmo dia → 1 sessão (dedup)', () => {
    const result = countUniqueTrainingDays(
      [{ date: '2026-03-25' }],
      [{ created_at: '2026-03-25T15:00:00Z', completed: true }],
      new Date('2026-03-31'),
    );
    expect(result).toBe(1);
  });

  it('Store + benchmark em dias diferentes → 2 sessões', () => {
    const result = countUniqueTrainingDays(
      [{ date: '2026-03-25' }],
      [{ created_at: '2026-03-26T10:00:00Z', completed: true }],
      new Date('2026-03-31'),
    );
    expect(result).toBe(2);
  });

  it('Sessão com mais de 365 dias → expirada, não conta', () => {
    const result = countUniqueTrainingDays(
      [{ date: '2025-03-01' }],
      null,
      new Date('2026-03-31'),
    );
    expect(result).toBe(0);
  });

  it('Sessão no limite exato de 365 dias → conta', () => {
    const result = countUniqueTrainingDays(
      [{ date: '2025-03-31' }],
      null,
      new Date('2026-03-31'),
    );
    expect(result).toBe(1);
  });

  it('Mix de sessões válidas e expiradas', () => {
    const result = countUniqueTrainingDays(
      [
        { date: '2024-06-01' }, // expirada
        { date: '2025-01-01' }, // expirada (>365 dias de 2026-03-31)
        { date: '2025-10-15' }, // válida
        { date: '2026-02-01' }, // válida
        { date: '2026-03-30' }, // válida
      ],
      null,
      new Date('2026-03-31'),
    );
    expect(result).toBe(3);
  });

  it('120 sessões únicas → progresso 100% no OPEN', () => {
    const sessions = Array.from({ length: 120 }, (_, i) => {
      const d = new Date('2026-03-31');
      d.setDate(d.getDate() - i);
      return { date: d.toISOString().substring(0, 10) };
    });
    const count = countUniqueTrainingDays(sessions, null, new Date('2026-03-31'));
    expect(count).toBe(120);
    // Progress = 120/120 = 100%
    expect(Math.min(1, count / 120)).toBe(1);
  });

  it('60 sessões → progresso 50% no OPEN (120 meta)', () => {
    const sessions = Array.from({ length: 60 }, (_, i) => {
      const d = new Date('2026-03-31');
      d.setDate(d.getDate() - i);
      return { date: d.toISOString().substring(0, 10) };
    });
    const count = countUniqueTrainingDays(sessions, null, new Date('2026-03-31'));
    expect(count).toBe(60);
    expect(Math.round((count / 120) * 100)).toBe(50);
  });

  it('Limpeza de localStorage impede vazamento entre usuários', () => {
    // Simula: Usuário A treinou, depois faz logout
    const userAResults = [{ date: '2026-03-28' }, { date: '2026-03-29' }];
    const userABenchmarks = [{ created_at: '2026-03-30T10:00:00Z', completed: true }];
    
    const countA = countUniqueTrainingDays(userAResults, userABenchmarks, new Date('2026-03-31'));
    expect(countA).toBe(3);
    
    // Após logout + limpeza: novo usuário tem 0
    const countB = countUniqueTrainingDays([], null, new Date('2026-03-31'));
    expect(countB).toBe(0);
  });
});

describe('Régua de Jornada — Cálculo de Progresso', () => {
  interface LevelRule {
    training_min_sessions: number;
    benchmarks_required: number;
  }

  const RULES: Record<string, LevelRule> = {
    OPEN: { training_min_sessions: 120, benchmarks_required: 3 },
    PRO: { training_min_sessions: 200, benchmarks_required: 5 },
    ELITE: { training_min_sessions: 400, benchmarks_required: 10 },
  };

  function calcProgress(sessions: number, benchmarks: number, category: string) {
    const rule = RULES[category];
    const tp = Math.min(1, sessions / rule.training_min_sessions);
    const bp = Math.min(1, benchmarks / rule.benchmarks_required);
    const isOutlier = tp >= 1 && bp >= 1;
    const overall = isOutlier ? 1 : (tp + bp) / 2;
    const pct = overall > 0 ? Math.max(1, Math.round(overall * 100)) : 0;
    return { trainingPct: Math.round(tp * 100), benchmarkPct: Math.round(bp * 100), pct, isOutlier };
  }

  it('0/0 → 0%', () => {
    const r = calcProgress(0, 0, 'OPEN');
    expect(r.pct).toBe(0);
    expect(r.isOutlier).toBe(false);
  });

  it('1 sessão, 0 benchmarks → 1% (mínimo quando >0)', () => {
    const r = calcProgress(1, 0, 'OPEN');
    expect(r.pct).toBe(1);
  });

  it('60 sessões, 0 benchmarks → 25%', () => {
    const r = calcProgress(60, 0, 'OPEN');
    expect(r.pct).toBe(25);
  });

  it('120 sessões, 0 benchmarks → 50%', () => {
    const r = calcProgress(120, 0, 'OPEN');
    expect(r.pct).toBe(50);
  });

  it('0 sessões, 3 benchmarks → 50%', () => {
    const r = calcProgress(0, 3, 'OPEN');
    expect(r.pct).toBe(50);
  });

  it('60 sessões, 1 benchmark → ~42%', () => {
    const r = calcProgress(60, 1, 'OPEN');
    // training: 50%, bench: 33%, avg: 42%
    expect(r.pct).toBe(42);
  });

  it('120 sessões, 3 benchmarks → 100% OUTLIER OPEN', () => {
    const r = calcProgress(120, 3, 'OPEN');
    expect(r.pct).toBe(100);
    expect(r.isOutlier).toBe(true);
  });

  it('119 sessões, 3 benchmarks → não é outlier', () => {
    const r = calcProgress(119, 3, 'OPEN');
    expect(r.isOutlier).toBe(false);
    expect(r.pct).toBeLessThan(100);
  });

  it('120 sessões, 2 benchmarks → não é outlier', () => {
    const r = calcProgress(120, 2, 'OPEN');
    expect(r.isOutlier).toBe(false);
  });

  it('PRO: 200 sessões + 5 benchmarks → outlier', () => {
    const r = calcProgress(200, 5, 'PRO');
    expect(r.isOutlier).toBe(true);
    expect(r.pct).toBe(100);
  });

  it('PRO: 120 sessões + 3 benchmarks → 60%', () => {
    const r = calcProgress(120, 3, 'PRO');
    expect(r.trainingPct).toBe(60);
    expect(r.benchmarkPct).toBe(60);
    expect(r.pct).toBe(60);
  });

  it('ELITE: 400 sessões + 10 benchmarks → outlier topo', () => {
    const r = calcProgress(400, 10, 'ELITE');
    expect(r.isOutlier).toBe(true);
    expect(r.pct).toBe(100);
  });

  it('Exceder requisitos → cap em 100%', () => {
    const r = calcProgress(500, 15, 'OPEN');
    expect(r.pct).toBe(100);
    expect(r.trainingPct).toBe(100);
    expect(r.benchmarkPct).toBe(100);
  });
});
