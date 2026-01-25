/**
 * Testes para o sistema de validação e metadados de tempo
 * 
 * COMPORTAMENTO ATUALIZADO:
 * - Nunca há MISSING: blocos sem tempo explícito usam default por tipo
 * - source é sempre CONFIRMED ou ESTIMATED
 * - usedDefaultByType indica se o default foi usado
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
  getDefaultDurationSecByType,
  DEFAULT_DURATION_SEC_BY_TYPE,
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
// TESTES: DEFAULT_DURATION_SEC_BY_TYPE
// ============================================

describe('DEFAULT_DURATION_SEC_BY_TYPE', () => {
  it('define defaults para todos os tipos de bloco', () => {
    expect(DEFAULT_DURATION_SEC_BY_TYPE.aquecimento).toBe(10 * 60);
    expect(DEFAULT_DURATION_SEC_BY_TYPE.conditioning).toBe(20 * 60);
    expect(DEFAULT_DURATION_SEC_BY_TYPE.forca).toBe(15 * 60);
    expect(DEFAULT_DURATION_SEC_BY_TYPE.core).toBe(10 * 60);
    expect(DEFAULT_DURATION_SEC_BY_TYPE.corrida).toBe(15 * 60);
    expect(DEFAULT_DURATION_SEC_BY_TYPE.especifico).toBe(15 * 60);
    expect(DEFAULT_DURATION_SEC_BY_TYPE.notas).toBe(5 * 60);
  });
});

describe('getDefaultDurationSecByType', () => {
  it('retorna default correto para tipo conhecido', () => {
    expect(getDefaultDurationSecByType('aquecimento')).toBe(600);
    expect(getDefaultDurationSecByType('conditioning')).toBe(1200);
    expect(getDefaultDurationSecByType('forca')).toBe(900);
  });

  it('retorna fallback para tipo desconhecido', () => {
    expect(getDefaultDurationSecByType('unknown')).toBe(15 * 60);
  });

  it('retorna fallback para undefined', () => {
    expect(getDefaultDurationSecByType(undefined)).toBe(15 * 60);
  });
});

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
      expect(meta.usedDefaultByType).toBe(false);
    });

    it('retorna ESTIMATED quando apenas durationMinutes > 0', () => {
      const block = createBlock({ durationMinutes: 10 });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.source).toBe('ESTIMATED');
      expect(meta.durationSecUsed).toBe(600);
      expect(meta.hadExplicitDurationSec).toBe(false);
      expect(meta.hadDurationMinutes).toBe(true);
      expect(meta.usedDefaultByType).toBe(false);
    });

    it('retorna ESTIMATED com default por tipo quando nenhum campo existe', () => {
      const block = createBlock({ type: 'conditioning' });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.source).toBe('ESTIMATED');
      expect(meta.durationSecUsed).toBe(20 * 60); // default para conditioning
      expect(meta.hadExplicitDurationSec).toBe(false);
      expect(meta.hadDurationMinutes).toBe(false);
      expect(meta.usedDefaultByType).toBe(true);
    });

    it('prioriza durationSec sobre durationMinutes', () => {
      const block = createBlock({ durationSec: 300, durationMinutes: 10 });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.source).toBe('CONFIRMED');
      expect(meta.durationSecUsed).toBe(300); // 5 min, não 10 min
      expect(meta.usedDefaultByType).toBe(false);
    });

    it('ignora durationSec = 0 e usa durationMinutes', () => {
      const block = createBlock({ durationSec: 0, durationMinutes: 10 });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.source).toBe('ESTIMATED');
      expect(meta.durationSecUsed).toBe(600);
      expect(meta.usedDefaultByType).toBe(false);
    });

    it('ignora durationMinutes = 0 e usa default por tipo', () => {
      const block = createBlock({ type: 'aquecimento', durationMinutes: 0 });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.source).toBe('ESTIMATED');
      expect(meta.durationSecUsed).toBe(10 * 60); // default aquecimento
      expect(meta.usedDefaultByType).toBe(true);
    });

    it('ignora valores negativos e usa default por tipo', () => {
      const block = createBlock({ type: 'core', durationSec: -100, durationMinutes: -5 });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.source).toBe('ESTIMATED');
      expect(meta.durationSecUsed).toBe(10 * 60); // default core
      expect(meta.usedDefaultByType).toBe(true);
    });
  });

  describe('Defaults por tipo de bloco', () => {
    it('usa default correto para aquecimento', () => {
      const block = createBlock({ type: 'aquecimento' });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.durationSecUsed).toBe(10 * 60);
      expect(meta.usedDefaultByType).toBe(true);
    });

    it('usa default correto para conditioning', () => {
      const block = createBlock({ type: 'conditioning' });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.durationSecUsed).toBe(20 * 60);
    });

    it('usa default correto para forca', () => {
      const block = createBlock({ type: 'forca' });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.durationSecUsed).toBe(15 * 60);
    });

    it('usa default correto para notas', () => {
      const block = createBlock({ type: 'notas' });
      const meta = getBlockTimeMeta(block);
      
      expect(meta.durationSecUsed).toBe(5 * 60);
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

    it('durationSecUsed nunca é zero', () => {
      // Mesmo sem tempo explícito, usa default
      const block = createBlock({});
      const meta = getBlockTimeMeta(block);
      
      expect(meta.durationSecUsed).toBeGreaterThan(0);
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

  it('retorna warning DURATION_ESTIMATED_DEFAULT para bloco sem tempo explícito', () => {
    const block = createBlock({ id: 'block-1', title: 'WOD Principal', type: 'conditioning' });
    const warning = validateBlockTime(block);
    
    expect(warning).not.toBeNull();
    expect(warning?.type).toBe('DURATION_ESTIMATED_DEFAULT');
    expect(warning?.blockId).toBe('block-1');
    expect(warning?.blockTitle).toBe('WOD Principal');
    expect(warning?.blockType).toBe('conditioning');
    expect(warning?.defaultAppliedSec).toBe(20 * 60);
    expect(warning?.message).toContain('WOD Principal');
    expect(warning?.message).toContain('20 min');
  });

  it('não gera warning para blocos do tipo "notas" mesmo sem tempo', () => {
    const block = createBlock({ type: 'notas' });
    expect(validateBlockTime(block)).toBeNull();
  });

  it('usa default por tipo e gera warning quando ambos campos são 0', () => {
    const block = createBlock({ type: 'aquecimento', durationSec: 0, durationMinutes: 0 });
    const warning = validateBlockTime(block);
    
    expect(warning?.type).toBe('DURATION_ESTIMATED_DEFAULT');
    expect(warning?.defaultAppliedSec).toBe(10 * 60);
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
    expect(result.defaultBlocks).toBe(0);
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
    expect(result.defaultBlocks).toBe(0);
  });

  it('gera warnings para blocos que usaram default', () => {
    const blocks = [
      createBlock({ id: 'b1', durationSec: 600 }),
      createBlock({ id: 'b2', title: 'Sem tempo', type: 'conditioning' }), // usa default
    ];
    const day = createDay(blocks);
    const result = validateDayTime(day);
    
    expect(result.isValid).toBe(true); // Warnings não bloqueiam
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe('DURATION_ESTIMATED_DEFAULT');
    expect(result.confirmedBlocks).toBe(1);
    expect(result.estimatedBlocks).toBe(1); // usa default = estimado
    expect(result.defaultBlocks).toBe(1);
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
      createBlock({ id: 'b3', type: 'forca' }), // usa default = estimated
      createBlock({ id: 'b4', type: 'notas' }), // usa default, sem warning
    ];
    const day = createDay(blocks);
    const result = validateDayTime(day);
    
    expect(result.totalBlocks).toBe(4);
    expect(result.confirmedBlocks).toBe(1);
    expect(result.estimatedBlocks).toBe(3); // b2, b3, b4 (todos estimados)
    expect(result.defaultBlocks).toBe(2); // b3 e b4 usaram default
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
      createBlock({ id: 'b3', type: 'conditioning' }), // usa default
    ]);
    
    const result = validateWeekTime([day1, day2]);
    
    expect(result.isValid).toBe(true);
    expect(result.totalBlocks).toBe(3);
    expect(result.confirmedBlocks).toBe(1);
    expect(result.estimatedBlocks).toBe(2);
    expect(result.defaultBlocks).toBe(1);
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

  it('retorna true para bloco que usa default', () => {
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

  it('retorna dados corretos para bloco com default', () => {
    const block = createBlock({ type: 'conditioning' });
    const display = getBlockTimeDisplay(block);
    
    expect(display.minutes).toBe(20); // default conditioning = 20 min
    expect(display.isEstimated).toBe(true);
    expect(display.source).toBe('ESTIMATED');
  });

  it('arredonda minutos corretamente', () => {
    const block = createBlock({ durationSec: 125 }); // 2.08 min
    const display = getBlockTimeDisplay(block);
    
    expect(display.minutes).toBe(2); // arredondado
  });

  it('nunca retorna minutes = 0 para blocos com tipo', () => {
    const block = createBlock({ type: 'aquecimento' });
    const display = getBlockTimeDisplay(block);
    
    expect(display.minutes).toBeGreaterThan(0);
  });
});
