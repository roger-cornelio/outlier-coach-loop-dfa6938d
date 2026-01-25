/**
 * Testes para o sistema de validação e metadados de tempo
 */

import { describe, it, expect } from 'vitest';
import {
  getBlockTimeMeta,
  validateBlockTime,
  validateDayTime,
  validateWeekTime,
  timeSourceToConfidence,
  shouldShowEstimatedLabel,
  getBlockTimeDisplay,
  type TimeMeta,
  type TimeSource,
} from '../timeValidation';
import type { WorkoutBlock, DayWorkout } from '@/types/outlier';

// ============================================
// HELPERS PARA CRIAR FIXTURES
// ============================================

function createBlock(overrides: Partial<WorkoutBlock> = {}): WorkoutBlock {
  return {
    id: 'test-block',
    type: 'conditioning',
    title: 'Test Block',
    content: 'Test content',
    ...overrides,
  };
}

function createDay(blocks: WorkoutBlock[], overrides: Partial<DayWorkout> = {}): DayWorkout {
  return {
    day: 'seg',
    stimulus: 'Test day',
    estimatedTime: 60,
    blocks,
    ...overrides,
  };
}

// ============================================
// TESTES: getBlockTimeMeta
// ============================================

describe('getBlockTimeMeta', () => {
  describe('Regra determinística de prioridade', () => {
    it('retorna CONFIRMED quando durationSec > 0', () => {
      const block = createBlock({ durationSec: 600 });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.source).toBe('CONFIRMED');
      expect(meta.durationSecUsed).toBe(600);
      expect(meta.hadExplicitDurationSec).toBe(true);
    });

    it('retorna ESTIMATED quando apenas durationMinutes > 0', () => {
      const block = createBlock({ durationMinutes: 10 });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.source).toBe('ESTIMATED');
      expect(meta.durationSecUsed).toBe(600);
      expect(meta.hadExplicitDurationSec).toBe(false);
      expect(meta.hadDurationMinutes).toBe(true);
    });

    it('retorna MISSING quando nenhum campo de tempo existe', () => {
      const block = createBlock({});
      const meta = getBlockTimeMeta(block);
      
      expect(meta.source).toBe('MISSING');
      expect(meta.durationSecUsed).toBe(0);
      expect(meta.hadExplicitDurationSec).toBe(false);
      expect(meta.hadDurationMinutes).toBe(false);
    });

    it('prioriza durationSec sobre durationMinutes', () => {
      const block = createBlock({ durationSec: 300, durationMinutes: 10 });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.source).toBe('CONFIRMED');
      expect(meta.durationSecUsed).toBe(300); // 5 min, não 10 min
    });

    it('ignora durationSec = 0', () => {
      const block = createBlock({ durationSec: 0, durationMinutes: 10 });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.source).toBe('ESTIMATED');
      expect(meta.durationSecUsed).toBe(600);
    });

    it('ignora durationMinutes = 0', () => {
      const block = createBlock({ durationMinutes: 0 });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.source).toBe('MISSING');
      expect(meta.durationSecUsed).toBe(0);
    });

    it('ignora valores negativos', () => {
      const block = createBlock({ durationSec: -100, durationMinutes: -5 });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.source).toBe('MISSING');
      expect(meta.durationSecUsed).toBe(0);
    });
  });

  describe('Metadados precisos', () => {
    it('registra hadExplicitDurationSec corretamente', () => {
      const withSec = createBlock({ durationSec: 600 });
      const withoutSec = createBlock({ durationMinutes: 10 });
      
      expect(getBlockTimeMeta(withSec).hadExplicitDurationSec).toBe(true);
      expect(getBlockTimeMeta(withoutSec).hadExplicitDurationSec).toBe(false);
    });

    it('registra hadDurationMinutes corretamente', () => {
      const withMin = createBlock({ durationMinutes: 10 });
      const withoutMin = createBlock({ durationSec: 600 });
      
      expect(getBlockTimeMeta(withMin).hadDurationMinutes).toBe(true);
      expect(getBlockTimeMeta(withoutMin).hadDurationMinutes).toBe(false);
    });

    it('arredonda durationSecUsed corretamente', () => {
      const block = createBlock({ durationMinutes: 10.5 });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.durationSecUsed).toBe(630); // 10.5 * 60 = 630
    });
  });
});

// ============================================
// TESTES: validateBlockTime
// ============================================

describe('validateBlockTime', () => {
  it('retorna null para bloco com durationSec válido', () => {
    const block = createBlock({ durationSec: 600 });
    expect(validateBlockTime(block)).toBeNull();
  });

  it('retorna null para bloco com durationMinutes válido', () => {
    const block = createBlock({ durationMinutes: 10 });
    expect(validateBlockTime(block)).toBeNull();
  });

  it('retorna warning MISSING_DURATION para bloco sem tempo', () => {
    const block = createBlock({ id: 'block-1', title: 'WOD Principal' });
    const warning = validateBlockTime(block);
    
    expect(warning).not.toBeNull();
    expect(warning?.type).toBe('MISSING_DURATION');
    expect(warning?.blockId).toBe('block-1');
    expect(warning?.blockTitle).toBe('WOD Principal');
    expect(warning?.message).toContain('WOD Principal');
  });

  it('não gera warning para blocos do tipo "notas"', () => {
    const block = createBlock({ type: 'notas' });
    expect(validateBlockTime(block)).toBeNull();
  });

  it('retorna warning ZERO_DURATION para durationSec = 0 explícito com durationMinutes = 0', () => {
    // Este caso é edge: ambos definidos como 0
    const block = createBlock({ durationSec: 0, durationMinutes: 0 });
    const warning = validateBlockTime(block);
    
    // Com ambos = 0, source é MISSING, então gera MISSING_DURATION
    expect(warning?.type).toBe('MISSING_DURATION');
  });
});

// ============================================
// TESTES: validateDayTime
// ============================================

describe('validateDayTime', () => {
  it('valida dia com todos os blocos confirmados', () => {
    const blocks = [
      createBlock({ id: 'b1', durationSec: 600 }),
      createBlock({ id: 'b2', durationSec: 900 }),
    ];
    const day = createDay(blocks);
    const result = validateDayTime(day);
    
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.totalBlocks).toBe(2);
    expect(result.confirmedBlocks).toBe(2);
    expect(result.estimatedBlocks).toBe(0);
    expect(result.missingBlocks).toBe(0);
  });

  it('valida dia com blocos estimados', () => {
    const blocks = [
      createBlock({ id: 'b1', durationMinutes: 10 }),
      createBlock({ id: 'b2', durationMinutes: 15 }),
    ];
    const day = createDay(blocks);
    const result = validateDayTime(day);
    
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.estimatedBlocks).toBe(2);
    expect(result.confirmedBlocks).toBe(0);
  });

  it('gera warnings para blocos sem tempo', () => {
    const blocks = [
      createBlock({ id: 'b1', durationSec: 600 }),
      createBlock({ id: 'b2', title: 'Sem tempo' }), // sem duração
    ];
    const day = createDay(blocks);
    const result = validateDayTime(day);
    
    expect(result.isValid).toBe(true); // Warnings não bloqueiam
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe('MISSING_DURATION');
    expect(result.confirmedBlocks).toBe(1);
    expect(result.missingBlocks).toBe(1);
  });

  it('valida dia vazio sem erros', () => {
    const day = createDay([]);
    const result = validateDayTime(day);
    
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.totalBlocks).toBe(0);
  });

  it('conta corretamente mix de tipos', () => {
    const blocks = [
      createBlock({ id: 'b1', durationSec: 600 }), // confirmed
      createBlock({ id: 'b2', durationMinutes: 10 }), // estimated
      createBlock({ id: 'b3' }), // missing
      createBlock({ id: 'b4', type: 'notas' }), // notas (missing mas sem warning)
    ];
    const day = createDay(blocks);
    const result = validateDayTime(day);
    
    expect(result.totalBlocks).toBe(4);
    expect(result.confirmedBlocks).toBe(1);
    expect(result.estimatedBlocks).toBe(1);
    expect(result.missingBlocks).toBe(2); // b3 e b4 (notas)
    expect(result.warnings).toHaveLength(1); // apenas b3, notas não gera warning
  });
});

// ============================================
// TESTES: validateWeekTime
// ============================================

describe('validateWeekTime', () => {
  it('agrega resultados de múltiplos dias', () => {
    const day1 = createDay([
      createBlock({ id: 'b1', durationSec: 600 }),
    ]);
    const day2 = createDay([
      createBlock({ id: 'b2', durationMinutes: 10 }),
      createBlock({ id: 'b3' }), // missing
    ]);
    
    const result = validateWeekTime([day1, day2]);
    
    expect(result.isValid).toBe(true);
    expect(result.totalBlocks).toBe(3);
    expect(result.confirmedBlocks).toBe(1);
    expect(result.estimatedBlocks).toBe(1);
    expect(result.missingBlocks).toBe(1);
    expect(result.warnings).toHaveLength(1);
  });

  it('valida semana vazia sem erros', () => {
    const result = validateWeekTime([]);
    
    expect(result.isValid).toBe(true);
    expect(result.totalBlocks).toBe(0);
    expect(result.warnings).toHaveLength(0);
  });
});

// ============================================
// TESTES: Helpers para UI
// ============================================

describe('timeSourceToConfidence', () => {
  it('mapeia CONFIRMED para high', () => {
    expect(timeSourceToConfidence('CONFIRMED')).toBe('high');
  });

  it('mapeia ESTIMATED para low', () => {
    expect(timeSourceToConfidence('ESTIMATED')).toBe('low');
  });

  it('mapeia MISSING para low', () => {
    expect(timeSourceToConfidence('MISSING')).toBe('low');
  });
});

describe('shouldShowEstimatedLabel', () => {
  it('retorna false para bloco CONFIRMED', () => {
    const block = createBlock({ durationSec: 600 });
    expect(shouldShowEstimatedLabel(block)).toBe(false);
  });

  it('retorna true para bloco ESTIMATED', () => {
    const block = createBlock({ durationMinutes: 10 });
    expect(shouldShowEstimatedLabel(block)).toBe(true);
  });

  it('retorna true para bloco MISSING', () => {
    const block = createBlock({});
    expect(shouldShowEstimatedLabel(block)).toBe(true);
  });
});

describe('getBlockTimeDisplay', () => {
  it('retorna dados corretos para bloco CONFIRMED', () => {
    const block = createBlock({ durationSec: 600 });
    const display = getBlockTimeDisplay(block);
    
    expect(display.minutes).toBe(10);
    expect(display.isEstimated).toBe(false);
    expect(display.source).toBe('CONFIRMED');
  });

  it('retorna dados corretos para bloco ESTIMATED', () => {
    const block = createBlock({ durationMinutes: 15 });
    const display = getBlockTimeDisplay(block);
    
    expect(display.minutes).toBe(15);
    expect(display.isEstimated).toBe(true);
    expect(display.source).toBe('ESTIMATED');
  });

  it('retorna dados corretos para bloco MISSING', () => {
    const block = createBlock({});
    const display = getBlockTimeDisplay(block);
    
    expect(display.minutes).toBe(0);
    expect(display.isEstimated).toBe(true);
    expect(display.source).toBe('MISSING');
  });

  it('arredonda minutos corretamente', () => {
    const block = createBlock({ durationSec: 125 }); // 2.08 min
    const display = getBlockTimeDisplay(block);
    
    expect(display.minutes).toBe(2); // arredondado
  });
});
