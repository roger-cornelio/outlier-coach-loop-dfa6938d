/**
 * Testes de regressão: detecção de tempo fixo (AMRAP/EMOM)
 * Cobre apóstrofos curvos, formato invertido, e formato tradicional
 */

import { describe, it, expect } from 'vitest';
import { parseStructureLine } from '../workoutStructures';
import { computeBlockMetrics } from '../computeBlockKcalFromParsed';
import type { ParsedExercise } from '@/types/outlier';

describe('Fixed Time Detection — Curly Apostrophe', () => {
  it('**AMRAP 15\u2019** deve ser reconhecido como FIXED_TIME 15', () => {
    const result = parseStructureLine('**AMRAP 15\u2019**');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('FIXED_TIME');
    expect(result?.value).toBe(15);
  });

  it('**EMOM 10\u2019** deve ser reconhecido como FIXED_TIME 10', () => {
    const result = parseStructureLine('**EMOM 10\u2019**');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('FIXED_TIME');
    expect(result?.value).toBe(10);
  });

  it('AMRAP 15\u2019 (plain) deve ser reconhecido', () => {
    const result = parseStructureLine('AMRAP 15\u2019');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('FIXED_TIME');
    expect(result?.value).toBe(15);
  });

  it('EMOM 10\u2019 (plain) deve ser reconhecido', () => {
    const result = parseStructureLine('EMOM 10\u2019');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('FIXED_TIME');
    expect(result?.value).toBe(10);
  });
});

describe('Fixed Time Detection — Inverted Format', () => {
  it('**15\u2019 AMRAP** deve ser detectado no título pelo motor', () => {
    const exercises: ParsedExercise[] = [{
      slug: 'burpees', name: 'Burpees', movementPatternSlug: 'vertical_push',
      sets: 1, reps: 10,
    }];
    const result = computeBlockMetrics(exercises, { pesoKg: 75 }, undefined, "15\u2019 AMRAP");
    // Deve usar 15 min = 900s como autoridade
    expect(result.estimatedDurationSec).toBe(900);
    expect(result.estimatedKcal).toBeGreaterThan(50);
  });

  it('**10\u2019 EMOM** deve ser detectado no título pelo motor', () => {
    const exercises: ParsedExercise[] = [{
      slug: 'deadlift', name: 'Deadlift', movementPatternSlug: 'hinge',
      sets: 1, reps: 5, loadKg: 100,
    }];
    const result = computeBlockMetrics(exercises, { pesoKg: 75 }, undefined, "10\u2019 EMOM");
    expect(result.estimatedDurationSec).toBe(600);
    expect(result.estimatedKcal).toBeGreaterThan(30);
  });
});

describe('Fixed Time Detection — Traditional Format (regression)', () => {
  it('AMRAP 15 continua funcionando', () => {
    const result = parseStructureLine('**AMRAP 15**');
    expect(result?.type).toBe('FIXED_TIME');
    expect(result?.value).toBe(15);
  });

  it("EMOM 20' continua funcionando", () => {
    const result = parseStructureLine("**EMOM 20'**");
    expect(result?.type).toBe('FIXED_TIME');
    expect(result?.value).toBe(20);
  });
});
