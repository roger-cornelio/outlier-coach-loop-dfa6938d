/**
 * TESTES DE SANIDADE - Motor Determinístico HYROX
 * ================================================
 * 
 * Validam determinismo, linearidade, snapshot, fallback e warnings.
 * Nenhum destes testes altera UI ou regras do motor.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateHyroxCalories,
  calculateBlockCaloriesHyrox,
  createCalorieMeta,
  calculateWorkoutKcalWarnings,
  HYROX_FACTORS,
  FALLBACK_ARCHETYPES,
  type CalculateCaloriesInput,
  type CalorieCalculationMeta,
} from '@/utils/hyroxCalorieEngine';

// ============================================
// HELPERS DE TESTE
// ============================================

function createInput(overrides: Partial<CalculateCaloriesInput>): CalculateCaloriesInput {
  return {
    weightKg: 70,
    durationSec: 600, // 10 minutos
    content: '',
    lines: [],
    ...overrides,
  };
}

function createWorkoutBlock(content: string, durationSec: number = 600) {
  return {
    id: 'test-block',
    type: 'conditioning' as const,
    title: 'Test Block',
    content,
    durationSec,
  };
}

// ============================================
// 1) DETERMINISMO ABSOLUTO
// ============================================

describe('Motor HYROX - Determinismo Absoluto', () => {
  it('deve retornar resultado idêntico em 3 execuções consecutivas', () => {
    const input = createInput({
      lines: ['- 50 Wall Balls 20/14 lb'],
      durationSec: 600,
    });

    const result1 = calculateHyroxCalories(input);
    const result2 = calculateHyroxCalories(input);
    const result3 = calculateHyroxCalories(input);

    // kcal idêntico
    expect(result1.kcal).toBe(result2.kcal);
    expect(result2.kcal).toBe(result3.kcal);

    // resolution idêntica
    expect(result1.resolution).toBe(result2.resolution);
    expect(result2.resolution).toBe(result3.resolution);

    // keysUsed idênticas
    expect(result1.keysUsed).toEqual(result2.keysUsed);
    expect(result2.keysUsed).toEqual(result3.keysUsed);

    // exerciseSnapshots idênticos
    expect(result1.exerciseSnapshots).toEqual(result2.exerciseSnapshots);
    expect(result2.exerciseSnapshots).toEqual(result3.exerciseSnapshots);
  });

  it('deve gerar kcalMeta idêntico em execuções repetidas', () => {
    const input = createInput({
      lines: ['- 1000m SkiErg'],
      durationSec: 300,
    });

    const result1 = calculateHyroxCalories(input);
    const result2 = calculateHyroxCalories(input);

    const meta1 = createCalorieMeta(result1);
    const meta2 = createCalorieMeta(result2);

    expect(meta1.resolution).toBe(meta2.resolution);
    expect(meta1.keysUsed).toEqual(meta2.keysUsed);
    expect(meta1.fallbackPercentage).toBe(meta2.fallbackPercentage);
    expect(meta1.exerciseSnapshots).toEqual(meta2.exerciseSnapshots);
  });
});

// ============================================
// 2) LINEARIDADE COM PESO
// ============================================

describe('Motor HYROX - Linearidade com Peso', () => {
  it('kcal deve escalar proporcionalmente com peso para estação HYROX', () => {
    const input70 = createInput({
      weightKg: 70,
      lines: ['- 50 Wall Balls 20/14 lb'],
      durationSec: 600,
    });

    const input80 = createInput({
      weightKg: 80,
      lines: ['- 50 Wall Balls 20/14 lb'],
      durationSec: 600,
    });

    const result70 = calculateHyroxCalories(input70);
    const result80 = calculateHyroxCalories(input80);

    // Proporção deve ser exata: kcal_80 / kcal_70 == 80/70
    const expectedRatio = 80 / 70;
    const actualRatio = result80.kcal / result70.kcal;

    // Tolerância mínima por arredondamento
    expect(actualRatio).toBeCloseTo(expectedRatio, 1);

    // Ambos devem ter resolution EXACT_TABLE
    expect(result70.resolution).toBe('EXACT_TABLE');
    expect(result80.resolution).toBe('EXACT_TABLE');

    // factorKey deve ser WALLBALL
    expect(result70.keysUsed).toContain('WALLBALL');
    expect(result80.keysUsed).toContain('WALLBALL');
  });

  it('corrida também deve escalar com peso', () => {
    const input60 = createInput({
      weightKg: 60,
      lines: ['- 2 km Run'],
    });

    const input90 = createInput({
      weightKg: 90,
      lines: ['- 2 km Run'],
    });

    const result60 = calculateHyroxCalories(input60);
    const result90 = calculateHyroxCalories(input90);

    // Fórmula: kcal = peso * km * 1.0
    // 60kg * 2km = 120 kcal
    // 90kg * 2km = 180 kcal
    expect(result60.kcal).toBe(120);
    expect(result90.kcal).toBe(180);

    const expectedRatio = 90 / 60;
    const actualRatio = result90.kcal / result60.kcal;
    expect(actualRatio).toBeCloseTo(expectedRatio, 2);
  });
});

// ============================================
// 3) LINEARIDADE COM TEMPO (ESTAÇÕES)
// ============================================

describe('Motor HYROX - Linearidade com Tempo', () => {
  it('kcal deve dobrar quando durationSec dobra para estação HYROX', () => {
    const input600 = createInput({
      weightKg: 70,
      lines: ['- Sled Push 50m'],
      durationSec: 600, // 10 min
    });

    const input1200 = createInput({
      weightKg: 70,
      lines: ['- Sled Push 50m'],
      durationSec: 1200, // 20 min
    });

    const result600 = calculateHyroxCalories(input600);
    const result1200 = calculateHyroxCalories(input1200);

    // kcal_1200 deve ser ~2x kcal_600
    const ratio = result1200.kcal / result600.kcal;
    expect(ratio).toBeCloseTo(2.0, 1);

    // Ambos resolution=EXACT_TABLE
    expect(result600.resolution).toBe('EXACT_TABLE');
    expect(result1200.resolution).toBe('EXACT_TABLE');
  });

  it('SkiErg com diferentes tempos deve escalar linearmente', () => {
    const weight = 80;
    const factor = HYROX_FACTORS.SKIERG; // 0.095

    const result300 = calculateHyroxCalories(createInput({
      weightKg: weight,
      lines: ['- 1000m SkiErg'],
      durationSec: 300, // 5 min
    }));

    const result900 = calculateHyroxCalories(createInput({
      weightKg: weight,
      lines: ['- 1000m SkiErg'],
      durationSec: 900, // 15 min
    }));

    // 300s = 5min, 900s = 15min → ratio 3x
    expect(result900.kcal / result300.kcal).toBeCloseTo(3.0, 1);
  });
});

// ============================================
// 4) CORRIDA USA KM (NÃO DEPENDE DE DURATION)
// ============================================

describe('Motor HYROX - Corrida por Distância', () => {
  it('kcal de corrida deve depender apenas de km, não de durationSec', () => {
    const weight = 75;
    const distanceKm = 1;

    const result300 = calculateHyroxCalories(createInput({
      weightKg: weight,
      lines: ['- 1 km Run'],
      durationSec: 300,
    }));

    const result600 = calculateHyroxCalories(createInput({
      weightKg: weight,
      lines: ['- 1 km Run'],
      durationSec: 600,
    }));

    const result1200 = calculateHyroxCalories(createInput({
      weightKg: weight,
      lines: ['- 1 km Run'],
      durationSec: 1200,
    }));

    // Fórmula: kcal = peso_kg * distancia_km * 1.0
    const expectedKcal = weight * distanceKm * HYROX_FACTORS.RUN;

    expect(result300.kcal).toBe(expectedKcal);
    expect(result600.kcal).toBe(expectedKcal);
    expect(result1200.kcal).toBe(expectedKcal);

    // Todos devem ter resolution=EXACT_TABLE e factorKey="RUN"
    expect(result300.resolution).toBe('EXACT_TABLE');
    expect(result300.keysUsed).toContain('RUN');
    expect(result300.exerciseSnapshots[0].factorKey).toBe('RUN');
  });

  it('corrida com metros deve converter para km corretamente', () => {
    const weight = 80;

    const result = calculateHyroxCalories(createInput({
      weightKg: weight,
      lines: ['- 500m Run'],
    }));

    // 500m = 0.5km → kcal = 80 * 0.5 * 1.0 = 40
    expect(result.kcal).toBe(40);
    expect(result.resolution).toBe('EXACT_TABLE');
  });
});

// ============================================
// 5) FALLBACK GERA SNAPSHOT CORRETO
// ============================================

describe('Motor HYROX - Fallback com Snapshot', () => {
  it('Bench Press com PSE deve usar fallback STRENGTH_BAR', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- Bench Press 5x5 PSE 9'],
      durationSec: 600,
    }));

    expect(result.resolution).toBe('ARCHETYPE_FALLBACK');
    expect(result.usedFallback).toBe(true);
    expect(result.keysUsed).toContain('STRENGTH_BAR');

    // Snapshot deve ter archetypeKey
    const snapshot = result.exerciseSnapshots[0];
    expect(snapshot.archetypeKey).toBe('STRENGTH_BAR');
    expect(snapshot.resolution).toBe('ARCHETYPE_FALLBACK');

    // PSE 9 deve gerar multiplier
    // mult = clamp(0.85, 1.15, 0.70 + 0.05 * 9) = clamp(0.85, 1.15, 1.15) = 1.15
    expect(snapshot.pseUsed).toBe(9);
    expect(snapshot.multiplierUsed).toBeCloseTo(1.15, 2);
  });

  it('Dumbbell deve usar fallback STRENGTH_DUMB', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- Dumbbell Rows 4x12'],
      durationSec: 480,
    }));

    expect(result.resolution).toBe('ARCHETYPE_FALLBACK');
    expect(result.keysUsed).toContain('STRENGTH_DUMB');

    const snapshot = result.exerciseSnapshots[0];
    expect(snapshot.archetypeKey).toBe('STRENGTH_DUMB');
    expect(snapshot.factorUsed).toBeCloseTo(FALLBACK_ARCHETYPES.STRENGTH_DUMB, 3);
  });

  it('Pull-up deve usar fallback BODYWEIGHT', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 75,
      lines: ['- 50 Pull-ups'],
      durationSec: 600,
    }));

    expect(result.resolution).toBe('ARCHETYPE_FALLBACK');
    expect(result.keysUsed).toContain('BODYWEIGHT');

    const snapshot = result.exerciseSnapshots[0];
    expect(snapshot.archetypeKey).toBe('BODYWEIGHT');
  });

  it('Plank deve usar fallback CORE', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- Plank 3x1min'],
      durationSec: 300,
    }));

    expect(result.keysUsed).toContain('CORE');
    expect(result.exerciseSnapshots[0].archetypeKey).toBe('CORE');
  });

  it('exercício desconhecido deve usar MIXED_UNKNOWN', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- Exercício inventado 5x10'],
      durationSec: 600,
    }));

    expect(result.resolution).toBe('ARCHETYPE_FALLBACK');
    expect(result.keysUsed).toContain('MIXED_UNKNOWN');
  });
});

// ============================================
// 6) PSE NÃO AFETA HYROX CORE
// ============================================

describe('Motor HYROX - PSE não afeta HYROX core', () => {
  it('Wall Ball com e sem PSE deve ter mesmo kcal', () => {
    const baseInput = {
      weightKg: 70,
      durationSec: 600,
    };

    const resultWithPSE = calculateHyroxCalories(createInput({
      ...baseInput,
      lines: ['- 50 Wall Balls PSE 9'],
    }));

    const resultWithoutPSE = calculateHyroxCalories(createInput({
      ...baseInput,
      lines: ['- 50 Wall Balls'],
    }));

    // Mesmo kcal
    expect(resultWithPSE.kcal).toBe(resultWithoutPSE.kcal);

    // Ambos EXACT_TABLE
    expect(resultWithPSE.resolution).toBe('EXACT_TABLE');
    expect(resultWithoutPSE.resolution).toBe('EXACT_TABLE');

    // Snapshot não deve ter multiplierUsed para HYROX core
    expect(resultWithPSE.exerciseSnapshots[0].multiplierUsed).toBeUndefined();
    expect(resultWithoutPSE.exerciseSnapshots[0].multiplierUsed).toBeUndefined();
  });

  it('SkiErg com PSE alto deve ignorar PSE no cálculo', () => {
    const input1 = createInput({
      weightKg: 80,
      lines: ['- 1000m SkiErg PSE 10'],
      durationSec: 300,
    });

    const input2 = createInput({
      weightKg: 80,
      lines: ['- 1000m SkiErg PSE 5'],
      durationSec: 300,
    });

    const result1 = calculateHyroxCalories(input1);
    const result2 = calculateHyroxCalories(input2);

    expect(result1.kcal).toBe(result2.kcal);
    expect(result1.resolution).toBe('EXACT_TABLE');
  });

  it('Burpees HYROX não devem aplicar multiplicador PSE', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- 80 Burpee Broad Jumps PSE 9'],
      durationSec: 600,
    }));

    expect(result.resolution).toBe('EXACT_TABLE');
    expect(result.keysUsed).toContain('BURPEE');
    expect(result.exerciseSnapshots[0].multiplierUsed).toBeUndefined();
  });
});

// ============================================
// 7) WARNING HIGH_FALLBACK_USAGE
// ============================================

describe('Motor HYROX - HIGH_FALLBACK_USAGE Warning', () => {
  it('deve gerar warning quando >30% dos blocos usam fallback', () => {
    // 2 blocos com fallback
    const fallbackBlock1 = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- Bench Press 5x5'],
      durationSec: 400,
    }));

    const fallbackBlock2 = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- Dumbbell Rows 4x12'],
      durationSec: 400,
    }));

    // 1 bloco HYROX
    const hyroxBlock = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- 50 Wall Balls'],
      durationSec: 600,
    }));

    const metaFallback1 = createCalorieMeta(fallbackBlock1);
    const metaFallback2 = createCalorieMeta(fallbackBlock2);
    const metaHyrox = createCalorieMeta(hyroxBlock);

    // 2/3 = 66% fallback → deve ter warning
    const warningsHigh = calculateWorkoutKcalWarnings([metaFallback1, metaFallback2, metaHyrox]);
    expect(warningsHigh).toContain('HIGH_FALLBACK_USAGE');

    // 1/3 = 33% fallback → deve ter warning (>30%)
    const warnings33 = calculateWorkoutKcalWarnings([metaFallback1, metaHyrox, metaHyrox]);
    expect(warnings33).toContain('HIGH_FALLBACK_USAGE');

    // 1/4 = 25% fallback → NÃO deve ter warning
    const warningsLow = calculateWorkoutKcalWarnings([metaFallback1, metaHyrox, metaHyrox, metaHyrox]);
    expect(warningsLow).not.toContain('HIGH_FALLBACK_USAGE');
  });

  it('treino 100% HYROX não deve gerar warning', () => {
    const block1 = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- 1 km Run'],
    }));

    const block2 = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- 50 Wall Balls'],
      durationSec: 600,
    }));

    const block3 = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- 1000m SkiErg'],
      durationSec: 300,
    }));

    const meta1 = createCalorieMeta(block1);
    const meta2 = createCalorieMeta(block2);
    const meta3 = createCalorieMeta(block3);

    const warnings = calculateWorkoutKcalWarnings([meta1, meta2, meta3]);
    expect(warnings).not.toContain('HIGH_FALLBACK_USAGE');
  });

  it('treino 100% fallback deve gerar warning', () => {
    const block1 = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- Bench Press 5x5'],
      durationSec: 600,
    }));

    const block2 = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- Dumbbell Rows 4x12'],
      durationSec: 480,
    }));

    const meta1 = createCalorieMeta(block1);
    const meta2 = createCalorieMeta(block2);

    const warnings = calculateWorkoutKcalWarnings([meta1, meta2]);
    expect(warnings).toContain('HIGH_FALLBACK_USAGE');
  });
});

// ============================================
// 8) SNAPSHOT MÍNIMO SEMPRE PRESENTE
// ============================================

describe('Motor HYROX - Snapshot Mínimo', () => {
  it('bloco HYROX deve ter kcalMeta completo', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- 50 Wall Balls'],
      durationSec: 600,
    }));

    const meta = createCalorieMeta(result);

    // Campos obrigatórios
    expect(meta.resolution).toBeDefined();
    expect(meta.keysUsed).toBeDefined();
    expect(meta.factorSnapshot).toBeDefined();
    expect(meta.exerciseSnapshots).toBeDefined();
    expect(meta.fallbackPercentage).toBeDefined();

    // Snapshot do exercício
    const snapshot = result.exerciseSnapshots[0];
    expect(snapshot.factorKey).toBe('WALLBALL');
    expect(snapshot.factorUsed).toBe(HYROX_FACTORS.WALLBALL);
    expect(snapshot.resolution).toBe('EXACT_TABLE');
    expect(snapshot.kcalContribution).toBeGreaterThan(0);

    // Em EXACT_TABLE, archetypeKey não deve existir
    expect(snapshot.archetypeKey).toBeUndefined();
  });

  it('bloco RUN deve ter snapshot com factorKey=RUN', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 75,
      lines: ['- 1 km Run'],
    }));

    const snapshot = result.exerciseSnapshots[0];
    expect(snapshot.factorKey).toBe('RUN');
    expect(snapshot.factorUsed).toBe(HYROX_FACTORS.RUN);
    expect(snapshot.resolution).toBe('EXACT_TABLE');
    expect(snapshot.archetypeKey).toBeUndefined();
  });

  it('bloco fallback deve ter archetypeKey preenchido', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- Bench Press 5x5'],
      durationSec: 600,
    }));

    const snapshot = result.exerciseSnapshots[0];
    expect(snapshot.archetypeKey).toBeDefined();
    expect(snapshot.archetypeKey).toBe('STRENGTH_BAR');
    expect(snapshot.resolution).toBe('ARCHETYPE_FALLBACK');
  });

  it('factorSnapshot deve conter todos os fatores HYROX e fallback', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- 50 Wall Balls'],
      durationSec: 600,
    }));

    const meta = createCalorieMeta(result);

    // Fatores HYROX
    expect(meta.factorSnapshot.RUN).toBe(HYROX_FACTORS.RUN);
    expect(meta.factorSnapshot.SKIERG).toBe(HYROX_FACTORS.SKIERG);
    expect(meta.factorSnapshot.ROW).toBe(HYROX_FACTORS.ROW);
    expect(meta.factorSnapshot.WALLBALL).toBe(HYROX_FACTORS.WALLBALL);
    expect(meta.factorSnapshot.BURPEE).toBe(HYROX_FACTORS.BURPEE);
    expect(meta.factorSnapshot.SLED_PUSH).toBe(HYROX_FACTORS.SLED_PUSH);
    expect(meta.factorSnapshot.SLED_PULL).toBe(HYROX_FACTORS.SLED_PULL);
    expect(meta.factorSnapshot.LUNGE).toBe(HYROX_FACTORS.LUNGE);
    expect(meta.factorSnapshot.FARMER).toBe(HYROX_FACTORS.FARMER);
    expect(meta.factorSnapshot.SANDBAG).toBe(HYROX_FACTORS.SANDBAG);

    // Fatores fallback
    expect(meta.factorSnapshot.STRENGTH_BAR).toBe(FALLBACK_ARCHETYPES.STRENGTH_BAR);
    expect(meta.factorSnapshot.STRENGTH_DUMB).toBe(FALLBACK_ARCHETYPES.STRENGTH_DUMB);
    expect(meta.factorSnapshot.BODYWEIGHT).toBe(FALLBACK_ARCHETYPES.BODYWEIGHT);
    expect(meta.factorSnapshot.CORE).toBe(FALLBACK_ARCHETYPES.CORE);
    expect(meta.factorSnapshot.MIXED_UNKNOWN).toBe(FALLBACK_ARCHETYPES.MIXED_UNKNOWN);
  });
});

// ============================================
// CASOS EDGE / VALIDAÇÃO DE ERROS
// ============================================

describe('Motor HYROX - Casos Edge', () => {
  it('peso zero deve retornar erro', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 0,
      lines: ['- 50 Wall Balls'],
    }));

    expect(result.resolution).toBe('error');
    expect(result.error).toBeDefined();
    expect(result.kcal).toBe(0);
  });

  it('linhas vazias devem retornar erro', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: [],
      content: '',
    }));

    expect(result.resolution).toBe('error');
    expect(result.error).toContain('Nenhuma linha');
  });

  it('linha ambígua com "+" deve gerar warning', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- Wall Ball + Burpees'],
      durationSec: 600,
    }));

    expect(result.warnings.some(w => w.includes('ambígua'))).toBe(true);
  });

  it('corrida sem distância detectável deve gerar warning', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- Run at easy pace'],
      durationSec: 600,
    }));

    expect(result.warnings.some(w => w.includes('distância'))).toBe(true);
  });

  it('estação HYROX sem tempo deve gerar warning', () => {
    const result = calculateHyroxCalories(createInput({
      weightKg: 70,
      lines: ['- 50 Wall Balls'],
      durationSec: 0,
    }));

    expect(result.warnings.some(w => w.includes('Tempo do bloco'))).toBe(true);
  });
});

// ============================================
// INTEGRAÇÃO COM WorkoutBlock
// ============================================

describe('Motor HYROX - Integração calculateBlockCaloriesHyrox', () => {
  it('deve calcular corretamente para WorkoutBlock com durationSec', () => {
    const block = createWorkoutBlock('- 50 Wall Balls', 600);
    const result = calculateBlockCaloriesHyrox(block, 70);

    expect(result.kcal).toBeGreaterThan(0);
    expect(result.resolution).toBe('EXACT_TABLE');
    expect(result.keysUsed).toContain('WALLBALL');
  });

  it('deve usar durationMinutes como fallback', () => {
    const block = {
      id: 'test-block',
      type: 'conditioning' as const,
      title: 'Test Block',
      content: '- 50 Wall Balls',
      durationMinutes: 10, // 10 min = 600 sec
    };

    const result = calculateBlockCaloriesHyrox(block, 70);
    expect(result.kcal).toBeGreaterThan(0);
  });
});
