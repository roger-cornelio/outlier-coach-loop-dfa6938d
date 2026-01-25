/**
 * Testes para workoutSerialization.ts
 * Valida que durationSec é persistido corretamente no JSON de treinos
 */

import { describe, it, expect } from 'vitest';
import { 
  normalizeBlockForPersistence,
  normalizeDayWorkoutForPersistence,
  normalizeWorkoutsForPersistence,
  blockHasDuration,
} from '../workoutSerialization';
import type { WorkoutBlock, DayWorkout } from '@/types/outlier';

describe('normalizeBlockForPersistence', () => {
  describe('Bloco com durationMinutes sem durationSec', () => {
    it('deve calcular e adicionar durationSec', () => {
      const block: WorkoutBlock = {
        id: 'block_1',
        type: 'conditioning',
        title: 'WOD Principal',
        content: '3 rounds for time',
        durationMinutes: 10,
      };

      const result = normalizeBlockForPersistence(block);

      expect(result.durationSec).toBe(600);
      expect(result.durationMinutes).toBe(10);
    });

    it('deve arredondar durationSec corretamente', () => {
      const block: WorkoutBlock = {
        id: 'block_1',
        type: 'aquecimento',
        title: 'Warmup',
        content: 'Mobilidade',
        durationMinutes: 7.5, // 7.5 * 60 = 450
      };

      const result = normalizeBlockForPersistence(block);

      expect(result.durationSec).toBe(450);
    });
  });

  describe('Bloco com durationSec já definido', () => {
    it('deve manter durationSec existente se consistente', () => {
      const block: WorkoutBlock = {
        id: 'block_1',
        type: 'forca',
        title: 'Strength',
        content: 'Deadlift 5x5',
        durationMinutes: 20,
        durationSec: 1200,
      };

      const result = normalizeBlockForPersistence(block);

      expect(result.durationSec).toBe(1200);
    });

    it('deve corrigir durationSec se inconsistente com durationMinutes', () => {
      const block: WorkoutBlock = {
        id: 'block_1',
        type: 'conditioning',
        title: 'WOD',
        content: 'AMRAP 15',
        durationMinutes: 15,
        durationSec: 500, // Inconsistente! Deveria ser 900
      };

      const result = normalizeBlockForPersistence(block);

      expect(result.durationSec).toBe(900); // Corrigido para 15 * 60
    });
  });

  describe('Bloco sem duração definida', () => {
    it('deve manter bloco sem durationSec se não tem durationMinutes', () => {
      const block: WorkoutBlock = {
        id: 'block_1',
        type: 'notas',
        title: 'Observações',
        content: 'Lembre de alongar',
      };

      const result = normalizeBlockForPersistence(block);

      expect(result.durationSec).toBeUndefined();
      expect(result.durationMinutes).toBeUndefined();
    });
  });

  describe('Compatibilidade com dados antigos', () => {
    it('bloco antigo sem durationSec deve receber durationSec calculado', () => {
      // Simula bloco legado que só tem durationMinutes
      const legacyBlock: WorkoutBlock = {
        id: 'legacy_block',
        type: 'especifico',
        title: 'HYROX Station',
        content: 'Wall Balls + Burpees',
        durationMinutes: 25,
        // durationSec não existe em dados antigos
      };

      const result = normalizeBlockForPersistence(legacyBlock);

      expect(result.durationSec).toBe(1500); // 25 * 60
      expect(result.durationMinutes).toBe(25); // Mantido
    });
  });
});

describe('normalizeDayWorkoutForPersistence', () => {
  it('deve normalizar todos os blocos de um dia', () => {
    const dayWorkout: DayWorkout = {
      day: 'seg',
      stimulus: 'Engine',
      estimatedTime: 60,
      blocks: [
        {
          id: 'block_1',
          type: 'aquecimento',
          title: 'Warmup',
          content: 'Mobilidade',
          durationMinutes: 10,
        },
        {
          id: 'block_2',
          type: 'conditioning',
          title: 'WOD',
          content: 'For Time',
          durationMinutes: 30,
        },
        {
          id: 'block_3',
          type: 'core',
          title: 'Core',
          content: 'Planks',
          durationMinutes: 5,
        },
      ],
    };

    const result = normalizeDayWorkoutForPersistence(dayWorkout);

    expect(result.blocks[0].durationSec).toBe(600);
    expect(result.blocks[1].durationSec).toBe(1800);
    expect(result.blocks[2].durationSec).toBe(300);
  });
});

describe('normalizeWorkoutsForPersistence', () => {
  it('deve normalizar múltiplos dias de treino', () => {
    const workouts: DayWorkout[] = [
      {
        day: 'seg',
        stimulus: 'Força',
        estimatedTime: 45,
        blocks: [
          { id: '1', type: 'forca', title: 'Squat', content: '5x5', durationMinutes: 45 },
        ],
      },
      {
        day: 'qua',
        stimulus: 'Engine',
        estimatedTime: 50,
        blocks: [
          { id: '2', type: 'conditioning', title: 'WOD', content: 'AMRAP', durationMinutes: 20 },
          { id: '3', type: 'corrida', title: 'Run', content: '5km', durationMinutes: 30 },
        ],
      },
    ];

    const result = normalizeWorkoutsForPersistence(workouts);

    expect(result[0].blocks[0].durationSec).toBe(2700);
    expect(result[1].blocks[0].durationSec).toBe(1200);
    expect(result[1].blocks[1].durationSec).toBe(1800);
  });
});

describe('blockHasDuration', () => {
  it('deve retornar true se tem durationSec', () => {
    const block: WorkoutBlock = {
      id: '1',
      type: 'conditioning',
      title: 'WOD',
      content: '',
      durationSec: 600,
    };

    expect(blockHasDuration(block)).toBe(true);
  });

  it('deve retornar true se tem durationMinutes', () => {
    const block: WorkoutBlock = {
      id: '1',
      type: 'conditioning',
      title: 'WOD',
      content: '',
      durationMinutes: 10,
    };

    expect(blockHasDuration(block)).toBe(true);
  });

  it('deve retornar false se não tem duração', () => {
    const block: WorkoutBlock = {
      id: '1',
      type: 'notas',
      title: 'Notes',
      content: '',
    };

    expect(blockHasDuration(block)).toBe(false);
  });
});

describe('Formato esperado de bloco salvo', () => {
  it('deve gerar bloco no formato especificado', () => {
    const block: WorkoutBlock = {
      id: 'block_1',
      type: 'conditioning',
      title: 'WOD Principal',
      content: '3 rounds for time:\n- 10 Burpees\n- 20 Wall Balls',
      durationMinutes: 10,
    };

    const result = normalizeBlockForPersistence(block);

    // Formato esperado conforme especificação
    expect(result).toEqual({
      id: 'block_1',
      type: 'conditioning',
      title: 'WOD Principal',
      content: '3 rounds for time:\n- 10 Burpees\n- 20 Wall Balls',
      durationMinutes: 10,
      durationSec: 600,
    });
  });
});
