/**
 * TESTE E2E: Cálculo de Cardio — Motor de Produção vs Referência Científica vs Experiência Humana
 * 
 * Cenários testados com valores de referência humana (experiência real):
 * - 400m corrida (~75kg): ~31 kcal, ~2:24 min
 * - 1000m remo (~75kg): ~77 kcal, ~4:00 min
 * - 1000m ski erg (~75kg): ~77 kcal, ~4:40 min
 * - 30min corrida contínua Z2 (~75kg): ~386 kcal (com multiplicador zona)
 * - Assault Bike 20min (~75kg): MET-based, ~198 kcal
 * - 5km corrida (~75kg): ~386 kcal, ~30:00 min
 * - 2000m remo (~75kg): ~154 kcal, ~8:00 min
 * - 500m ski erg (~75kg): ~38 kcal, ~2:20 min
 */

import { describe, it, expect } from 'vitest';
import { computeBlockMetrics } from '../computeBlockKcalFromParsed';
import type { ParsedExercise } from '@/types/outlier';

const ATHLETE_75KG = { pesoKg: 75 };

// Tolerância: ±15% do valor esperado humano
function withinTolerance(actual: number, expected: number, tolerancePct = 0.15): boolean {
  const lower = expected * (1 - tolerancePct);
  const upper = expected * (1 + tolerancePct);
  return actual >= lower && actual <= upper;
}

describe('Cardio Calculation — Distance-Based (ACSM)', () => {
  it('400m corrida: ~31 kcal, ~144s', () => {
    const exercises: ParsedExercise[] = [{
      slug: 'running', name: 'Running', movementPatternSlug: 'distance_cardio',
      sets: 1, distanceMeters: 400,
    }];
    const result = computeBlockMetrics(exercises, ATHLETE_75KG);
    // ACSM: 1.03 * 0.4 * 75 = 30.9 kcal
    expect(withinTolerance(result.estimatedKcal!, 31)).toBe(true);
    // Pace 6:00/km → 400m = 144s
    expect(withinTolerance(result.estimatedDurationSec!, 144, 0.20)).toBe(true);
  });

  it('1000m remo: ~77 kcal, ~240s', () => {
    const exercises: ParsedExercise[] = [{
      slug: 'rowing', name: 'Rowing', movementPatternSlug: 'distance_cardio',
      sets: 1, distanceMeters: 1000,
    }];
    const result = computeBlockMetrics(exercises, ATHLETE_75KG);
    // ACSM: 1.03 * 1.0 * 75 = 77.25 kcal
    expect(withinTolerance(result.estimatedKcal!, 77)).toBe(true);
    // Pace 2:00/500m → 1000m = 240s
    expect(withinTolerance(result.estimatedDurationSec!, 240, 0.20)).toBe(true);
  });

  it('1000m ski erg: ~77 kcal, ~280s', () => {
    const exercises: ParsedExercise[] = [{
      slug: 'ski_erg', name: 'Ski Erg', movementPatternSlug: 'distance_cardio',
      sets: 1, distanceMeters: 1000,
    }];
    const result = computeBlockMetrics(exercises, ATHLETE_75KG);
    expect(withinTolerance(result.estimatedKcal!, 77)).toBe(true);
    // Pace 2:20/500m → 1000m = 280s
    expect(withinTolerance(result.estimatedDurationSec!, 280, 0.20)).toBe(true);
  });

  it('5km corrida: ~386 kcal, ~1800s', () => {
    const exercises: ParsedExercise[] = [{
      slug: 'running', name: 'Running', movementPatternSlug: 'distance_cardio',
      sets: 1, distanceMeters: 5000,
    }];
    const result = computeBlockMetrics(exercises, ATHLETE_75KG);
    // ACSM: 1.03 * 5.0 * 75 = 386.25 kcal
    expect(withinTolerance(result.estimatedKcal!, 386)).toBe(true);
    expect(withinTolerance(result.estimatedDurationSec!, 1800, 0.20)).toBe(true);
  });

  it('2000m remo: ~154 kcal, ~480s', () => {
    const exercises: ParsedExercise[] = [{
      slug: 'rowing', name: 'Rowing', movementPatternSlug: 'distance_cardio',
      sets: 1, distanceMeters: 2000,
    }];
    const result = computeBlockMetrics(exercises, ATHLETE_75KG);
    expect(withinTolerance(result.estimatedKcal!, 154)).toBe(true);
    expect(withinTolerance(result.estimatedDurationSec!, 480, 0.20)).toBe(true);
  });
});

describe('Cardio Calculation — Time-Based (Duration → Distance → ACSM)', () => {
  it('30min corrida contínua Z2: ~386 kcal (com Z2 multiplier 0.85)', () => {
    const exercises: ParsedExercise[] = [{
      slug: 'running', name: 'Running', movementPatternSlug: 'distance_cardio',
      sets: 1, durationSeconds: 1800, intensityType: 'zone', intensityValue: 2,
    }];
    const result = computeBlockMetrics(exercises, ATHLETE_75KG);
    // 30min @ 6:00/km = 5km → ACSM: 1.03*5*75=386 * Z2(0.85) = ~328 kcal
    expect(withinTolerance(result.estimatedKcal!, 328, 0.15)).toBe(true);
    expect(result.estimatedDurationSec).toBe(1800);
  });

  it('20min remo contínuo: ~258 kcal', () => {
    const exercises: ParsedExercise[] = [{
      slug: 'rowing', name: 'Rowing', movementPatternSlug: 'distance_cardio',
      sets: 1, durationSeconds: 1200,
    }];
    const result = computeBlockMetrics(exercises, ATHLETE_75KG);
    // 20min @ 250m/min = 5km → ACSM: 1.03*5*75=386 kcal
    expect(withinTolerance(result.estimatedKcal!, 386, 0.15)).toBe(true);
    expect(result.estimatedDurationSec).toBe(1200);
  });
});

describe('Cardio Calculation — Machine/Cal-Based (MET preserved)', () => {
  it('20min assault bike: MET-based ~198 kcal', () => {
    const exercises: ParsedExercise[] = [{
      slug: 'assault_bike', name: 'Assault Bike', movementPatternSlug: 'assault_bike',
      sets: 1, durationSeconds: 1200,
    }];
    const result = computeBlockMetrics(exercises, ATHLETE_75KG);
    // MET 8.5 * 75 * (20/60) = 212.5 kcal
    expect(withinTolerance(result.estimatedKcal!, 212, 0.15)).toBe(true);
    expect(result.estimatedDurationSec).toBe(1200);
  });
});

describe('Cardio Calculation — Mixed block (rounds with distance cardio)', () => {
  it('3 rounds: 400m run + 21 KB swings → cardio uses ACSM', () => {
    const exercises: ParsedExercise[] = [
      { slug: 'running', name: 'Running', movementPatternSlug: 'distance_cardio', sets: 1, distanceMeters: 400 },
      { slug: 'kb_swings', name: 'KB Swings', movementPatternSlug: 'hinge', sets: 1, reps: 21, loadKg: 24 },
    ];
    const blockContent = '**3 ROUNDS**\n400m Run\n21 KB Swings (24kg)';
    const result = computeBlockMetrics(exercises, ATHLETE_75KG, blockContent);
    // Run: ACSM 1.03*0.4*75=31 kcal × 3 rounds = 93 kcal
    // KB: vertical_work calculation × 3 rounds
    expect(result.estimatedKcal!).toBeGreaterThan(90);
  });
});

describe('Cardio Calculation — Legacy compatibility', () => {
  it('cardio genérico sem slug específico mantém MET', () => {
    const exercises: ParsedExercise[] = [{
      slug: 'generic_cardio', name: 'Cardio Genérico', movementPatternSlug: 'cardio',
      sets: 1, durationSeconds: 600,
    }];
    const result = computeBlockMetrics(exercises, ATHLETE_75KG);
    // MET 7.0 * 75 * (10/60) = 87.5
    expect(withinTolerance(result.estimatedKcal!, 87, 0.15)).toBe(true);
  });

  it('isometric mantém MET', () => {
    const exercises: ParsedExercise[] = [{
      slug: 'plank', name: 'Plank', movementPatternSlug: 'isometric',
      sets: 3, durationSeconds: 60,
    }];
    const result = computeBlockMetrics(exercises, ATHLETE_75KG);
    // Isometric MET-based, small kcal
    expect(result.estimatedKcal!).toBeGreaterThan(0);
    expect(result.estimatedKcal!).toBeLessThan(30);
  });
});
