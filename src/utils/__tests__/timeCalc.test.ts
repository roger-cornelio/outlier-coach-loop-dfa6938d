// src/utils/__tests__/timeCalc.test.ts
// Testes automatizados para validar cálculos de tempo e calorias

import { describe, it, expect } from 'vitest';
import { 
  sumBlocksDurationSec, 
  resolveDisplayedTotalSec, 
  getBlockEffectiveDurationSec,
  type TimeBlock,
  type BlockDurationSource 
} from '../timeCalc';
import { 
  calculateTotalWorkoutDurationSec,
  getBlockDurationSec 
} from '../workoutCalculations';
import { calculateExerciseKcal, type MovementPattern } from '../energyCalculator';
import type { WorkoutBlock } from '@/types/outlier';

// ============================================
// TESTES DA REGRA ÚNICA DETERMINÍSTICA
// ============================================

describe('getBlockEffectiveDurationSec - Regra Única Determinística', () => {
  describe('Prioridade 1: durationSec', () => {
    it('deve usar durationSec quando > 0', () => {
      const block: BlockDurationSource = { durationSec: 600, durationMinutes: 15 };
      expect(getBlockEffectiveDurationSec(block)).toBe(600);
    });

    it('deve ignorar durationMinutes quando durationSec > 0', () => {
      const block: BlockDurationSource = { durationSec: 300, durationMinutes: 20 };
      // durationSec=300 tem prioridade sobre durationMinutes=20 (que seria 1200s)
      expect(getBlockEffectiveDurationSec(block)).toBe(300);
    });

    it('deve arredondar durationSec com decimais', () => {
      const block: BlockDurationSource = { durationSec: 600.7 };
      expect(getBlockEffectiveDurationSec(block)).toBe(601);
    });
  });

  describe('Prioridade 2: durationMinutes * 60', () => {
    it('deve usar durationMinutes quando durationSec não existe', () => {
      const block: BlockDurationSource = { durationMinutes: 10 };
      expect(getBlockEffectiveDurationSec(block)).toBe(600);
    });

    it('deve usar durationMinutes quando durationSec é 0', () => {
      const block: BlockDurationSource = { durationSec: 0, durationMinutes: 15 };
      expect(getBlockEffectiveDurationSec(block)).toBe(900);
    });

    it('deve usar durationMinutes quando durationSec é undefined', () => {
      const block: BlockDurationSource = { durationSec: undefined, durationMinutes: 5 };
      expect(getBlockEffectiveDurationSec(block)).toBe(300);
    });

    it('deve arredondar resultado de durationMinutes * 60', () => {
      const block: BlockDurationSource = { durationMinutes: 7.5 };
      expect(getBlockEffectiveDurationSec(block)).toBe(450);
    });
  });

  describe('Fallback: retornar 0', () => {
    it('deve retornar 0 quando ambos são undefined', () => {
      const block: BlockDurationSource = {};
      expect(getBlockEffectiveDurationSec(block)).toBe(0);
    });

    it('deve retornar 0 quando ambos são 0', () => {
      const block: BlockDurationSource = { durationSec: 0, durationMinutes: 0 };
      expect(getBlockEffectiveDurationSec(block)).toBe(0);
    });

    it('deve retornar 0 quando durationSec é negativo e durationMinutes não existe', () => {
      const block: BlockDurationSource = { durationSec: -100 };
      expect(getBlockEffectiveDurationSec(block)).toBe(0);
    });

    it('deve retornar 0 quando durationMinutes é negativo', () => {
      const block: BlockDurationSource = { durationMinutes: -10 };
      expect(getBlockEffectiveDurationSec(block)).toBe(0);
    });
  });

  describe('Determinismo absoluto', () => {
    it('deve retornar resultado idêntico em múltiplas execuções', () => {
      const block: BlockDurationSource = { durationSec: 1234, durationMinutes: 99 };
      
      const result1 = getBlockEffectiveDurationSec(block);
      const result2 = getBlockEffectiveDurationSec(block);
      const result3 = getBlockEffectiveDurationSec(block);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe(1234);
    });
  });
});

// ============================================
// TESTES EXISTENTES (mantidos)
// ============================================

describe('sumBlocksDurationSec', () => {
  it('deve somar corretamente 3 blocos com durationSec conhecidos', () => {
    const blocks: TimeBlock[] = [
      { id: 'warmup', durationSec: 600 },      // 10 min
      { id: 'conditioning', durationSec: 1800 }, // 30 min
      { id: 'core', durationSec: 300 },          // 5 min
    ];

    const result = sumBlocksDurationSec(blocks);

    // Tempo total = 600 + 1800 + 300 = 2700s = 45 min
    expect(result.totalSec).toBe(2700);
    
    // Cada bloco deve ter seu tempo correto
    expect(result.byBlockSec['warmup']).toBe(600);
    expect(result.byBlockSec['conditioning']).toBe(1800);
    expect(result.byBlockSec['core']).toBe(300);
  });

  it('deve tratar blocos sem durationSec como 0', () => {
    const blocks: TimeBlock[] = [
      { id: 'warmup', durationSec: 600 },
      { id: 'notes' }, // sem durationSec
      { id: 'core', durationSec: 300 },
    ];

    const result = sumBlocksDurationSec(blocks);

    expect(result.totalSec).toBe(900); // 600 + 0 + 300
    expect(result.byBlockSec['notes']).toBe(0);
  });

  it('deve tratar valores negativos ou inválidos como 0', () => {
    const blocks: TimeBlock[] = [
      { id: 'warmup', durationSec: -100 },
      { id: 'conditioning', durationSec: NaN },
      { id: 'core', durationSec: 300 },
    ];

    const result = sumBlocksDurationSec(blocks);

    expect(result.totalSec).toBe(300);
    expect(result.byBlockSec['warmup']).toBe(0);
    expect(result.byBlockSec['conditioning']).toBe(0);
  });
});

describe('resolveDisplayedTotalSec', () => {
  it('deve usar tempo exibido quando dentro da tolerância', () => {
    const blocks: TimeBlock[] = [
      { id: 'warmup', durationSec: 600 },
      { id: 'conditioning', durationSec: 1800 },
    ];

    const result = resolveDisplayedTotalSec({
      blocks,
      displayedTotalSec: 2430, // soma real = 2400, diferença = 30s < 60s
      toleranceSec: 60,
    });

    expect(result.finalTotalSec).toBe(2430);
    expect(result.isMismatch).toBe(false);
    expect(result.realTotalSec).toBe(2400);
  });

  it('deve usar soma real quando fora da tolerância', () => {
    const blocks: TimeBlock[] = [
      { id: 'warmup', durationSec: 600 },
      { id: 'conditioning', durationSec: 1800 },
    ];

    const result = resolveDisplayedTotalSec({
      blocks,
      displayedTotalSec: 3600, // soma real = 2400, diferença = 1200s > 60s
      toleranceSec: 60,
    });

    expect(result.finalTotalSec).toBe(2400); // usa soma real
    expect(result.isMismatch).toBe(true);
    expect(result.realTotalSec).toBe(2400);
  });
});

describe('Physics Engine - Running Calories (ACSM)', () => {
  const distanceCardioPattern: MovementPattern = {
    id: 'test-run',
    name: 'Distance Cardio',
    formula_type: 'metabolic',
    moved_mass_percentage: 0,
    default_distance_meters: 1.0,
    friction_coefficient: null,
    human_efficiency_rate: 0.20,
  };

  it('deve calcular ~412kcal para 80kg correndo 5km (fórmula ACSM: 1.03 × km × kg)', () => {
    const result = calculateExerciseKcal({
      userWeightKg: 80,
      repsOrDistance: 5000, // 5km in meters
      movementPattern: distanceCardioPattern,
    });
    // 1.03 * 5 * 80 = 412
    expect(result.kcal).toBe(412);
  });

  it('deve escalar proporcionalmente com peso e distância', () => {
    const r1 = calculateExerciseKcal({ userWeightKg: 70, repsOrDistance: 10000, movementPattern: distanceCardioPattern });
    expect(r1.kcal).toBe(Math.floor(1.03 * 10 * 70)); // 721

    const r2 = calculateExerciseKcal({ userWeightKg: 60, repsOrDistance: 3000, movementPattern: distanceCardioPattern });
    expect(r2.kcal).toBe(Math.floor(1.03 * 3 * 60)); // 185

    const r3 = calculateExerciseKcal({ userWeightKg: 100, repsOrDistance: 1000, movementPattern: distanceCardioPattern });
    expect(r3.kcal).toBe(Math.floor(1.03 * 1 * 100)); // 103
  });
});

describe('calculateTotalWorkoutDurationSec', () => {
  it('deve calcular tempo total usando blocos com durationSec', () => {
    const blocks = [
      { id: '1', type: 'aquecimento' as const, title: 'Warmup', content: '', durationSec: 600 },
      { id: '2', type: 'conditioning' as const, title: 'WOD', content: '', durationSec: 1800 },
      { id: '3', type: 'core' as const, title: 'Core', content: '', durationSec: 300 },
    ];

    const result = calculateTotalWorkoutDurationSec(blocks);

    expect(result.totalSec).toBe(2700); // 45 min
    expect(result.byBlockSec['1']).toBe(600);
    expect(result.byBlockSec['2']).toBe(1800);
    expect(result.byBlockSec['3']).toBe(300);
  });

  it('deve usar durationMinutes como fallback quando durationSec não existe', () => {
    const blocks = [
      { id: '1', type: 'aquecimento' as const, title: 'Warmup', content: '', durationMinutes: 10 },
      { id: '2', type: 'conditioning' as const, title: 'WOD', content: '', durationMinutes: 30 },
    ];

    const result = calculateTotalWorkoutDurationSec(blocks);

    expect(result.totalSec).toBe(2400); // 40 min
  });
});

describe('Regra de Consistência', () => {
  it('tempo total exibido DEVE ser igual à soma dos blocos', () => {
    const blocks: TimeBlock[] = [
      { id: 'a', durationSec: 600 },
      { id: 'b', durationSec: 1200 },
      { id: 'c', durationSec: 900 },
    ];

    const { totalSec, byBlockSec } = sumBlocksDurationSec(blocks);
    
    // Soma manual dos blocos
    const manualSum = Object.values(byBlockSec).reduce((a, b) => a + b, 0);
    
    // REGRA INVIOLÁVEL: totalSec === soma dos blocos
    expect(totalSec).toBe(manualSum);
    expect(totalSec).toBe(2700);
  });

  // TESTE PRINCIPAL SOLICITADO: 38min + 46min = 84min
  it('DASHBOARD: 2 blocos (38min + 46min) = 84min total', () => {
    const blocks: TimeBlock[] = [
      { id: 'bloco1', durationSec: 38 * 60 },  // 38min = 2280s
      { id: 'bloco2', durationSec: 46 * 60 },  // 46min = 2760s
    ];

    const { totalSec, byBlockSec } = sumBlocksDurationSec(blocks);

    // Tempo total = 84min = 5040s
    expect(totalSec).toBe(84 * 60);
    expect(totalSec).toBe(5040);
    
    // Cada card mostra seu tempo correto
    expect(Math.round(byBlockSec['bloco1'] / 60)).toBe(38);
    expect(Math.round(byBlockSec['bloco2'] / 60)).toBe(46);
    
    // Soma dos cards = total
    const somaCards = byBlockSec['bloco1'] + byBlockSec['bloco2'];
    expect(totalSec).toBe(somaCards);
  });

  it('blocos sem durationSec devem mostrar "—" e ser excluídos do total', () => {
    const blocks: TimeBlock[] = [
      { id: 'warmup', durationSec: 600 },
      { id: 'notes' }, // sem durationSec
      { id: 'conditioning', durationSec: 1200 },
    ];

    const { totalSec, byBlockSec } = sumBlocksDurationSec(blocks);

    expect(totalSec).toBe(1800); // apenas warmup + conditioning
    expect(byBlockSec['notes']).toBe(0);
  });
});
