/**
 * Testes para o sistema de estruturas de treino
 * Valida parsing de **ROUNDS**, **EMOM**, **AMRAP**, **FOR TIME**
 */

import { describe, it, expect } from 'vitest';
import {
  isWrappedStructure,
  parseStructureLine,
  validateStructures,
  parseBlockStructures,
  getRoundsMultiplier,
  getFixedTimeMinutes,
  isForTime,
  calculateBlockTimeFromStructures,
  getStructureDescription,
} from '../workoutStructures';

describe('workoutStructures', () => {
  describe('isWrappedStructure', () => {
    it('deve reconhecer linhas entre ** **', () => {
      expect(isWrappedStructure('**3 ROUNDS**')).toBe(true);
      expect(isWrappedStructure('**EMOM 30**')).toBe(true);
      expect(isWrappedStructure('**FOR TIME**')).toBe(true);
    });

    it('não deve reconhecer linhas sem ** **', () => {
      expect(isWrappedStructure('3 ROUNDS')).toBe(false);
      expect(isWrappedStructure('EMOM 30')).toBe(false);
      expect(isWrappedStructure('For Time')).toBe(false);
    });
  });

  describe('parseStructureLine', () => {
    it('deve parsear **N ROUNDS** como MULTIPLIER', () => {
      const result = parseStructureLine('**3 ROUNDS**');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('MULTIPLIER');
      expect(result?.value).toBe(3);
      expect(result?.tag).toBe('__STRUCT:ROUNDS=3');
    });

    it('deve parsear **5 rounds** (minúsculo)', () => {
      const result = parseStructureLine('**5 rounds**');
      expect(result?.type).toBe('MULTIPLIER');
      expect(result?.value).toBe(5);
    });

    it('deve parsear **EMOM X** como FIXED_TIME', () => {
      const result = parseStructureLine('**EMOM 30**');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('FIXED_TIME');
      expect(result?.value).toBe(30);
      expect(result?.tag).toBe('__STRUCT:EMOM=30');
    });

    it('deve parsear **EMOM 20\'** (com apóstrofe)', () => {
      const result = parseStructureLine("**EMOM 20'**");
      expect(result?.type).toBe('FIXED_TIME');
      expect(result?.value).toBe(20);
    });

    it('deve parsear **AMRAP X** como FIXED_TIME', () => {
      const result = parseStructureLine('**AMRAP 15**');
      expect(result?.type).toBe('FIXED_TIME');
      expect(result?.value).toBe(15);
      expect(result?.tag).toBe('__STRUCT:AMRAP=15');
    });

    it('deve parsear **FOR TIME** como DERIVED_TIME', () => {
      const result = parseStructureLine('**FOR TIME**');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('DERIVED_TIME');
      expect(result?.value).toBeNull();
      expect(result?.tag).toBe('__STRUCT:FORTIME=true');
    });

    it('deve parsear **For Time** (mixed case)', () => {
      const result = parseStructureLine('**For Time**');
      expect(result?.type).toBe('DERIVED_TIME');
    });

    it('deve parsear linhas sem ** ** (plain text)', () => {
      expect(parseStructureLine('3 ROUNDS')).not.toBeNull();
      expect(parseStructureLine('3 ROUNDS')?.type).toBe('MULTIPLIER');
      expect(parseStructureLine('3 ROUNDS')?.value).toBe(3);
      expect(parseStructureLine('EMOM 30')).not.toBeNull();
      expect(parseStructureLine('EMOM 30')?.type).toBe('FIXED_TIME');
      expect(parseStructureLine('EMOM 30')?.value).toBe(30);
      expect(parseStructureLine('For Time')).not.toBeNull();
      expect(parseStructureLine('For Time')?.type).toBe('DERIVED_TIME');
    });

    it('deve parsear linhas SEM espaço (2rounds, EMOM20, AMRAP15)', () => {
      const r1 = parseStructureLine('2rounds');
      expect(r1).not.toBeNull();
      expect(r1?.type).toBe('MULTIPLIER');
      expect(r1?.value).toBe(2);

      const r2 = parseStructureLine('3Rounds');
      expect(r2?.type).toBe('MULTIPLIER');
      expect(r2?.value).toBe(3);

      const e1 = parseStructureLine('EMOM20');
      expect(e1).not.toBeNull();
      expect(e1?.type).toBe('FIXED_TIME');
      expect(e1?.value).toBe(20);

      const a1 = parseStructureLine('AMRAP15');
      expect(a1).not.toBeNull();
      expect(a1?.type).toBe('FIXED_TIME');
      expect(a1?.value).toBe(15);

      const ft = parseStructureLine('ForTime');
      expect(ft).not.toBeNull();
      expect(ft?.type).toBe('DERIVED_TIME');

    it('não deve parsear texto que não é estrutura', () => {
      expect(parseStructureLine('12 Back Squat')).toBeNull();
      expect(parseStructureLine('400m Run')).toBeNull();
      expect(parseStructureLine('Aquecimento')).toBeNull();
    });
  });

  describe('validateStructures', () => {
    it('deve permitir MULTIPLIER sozinho', () => {
      const rounds = parseStructureLine('**3 ROUNDS**')!;
      const errors = validateStructures([rounds]);
      expect(errors).toHaveLength(0);
    });

    it('deve permitir FIXED_TIME sozinho', () => {
      const emom = parseStructureLine('**EMOM 30**')!;
      const errors = validateStructures([emom]);
      expect(errors).toHaveLength(0);
    });

    it('deve permitir DERIVED_TIME sozinho', () => {
      const forTime = parseStructureLine('**FOR TIME**')!;
      const errors = validateStructures([forTime]);
      expect(errors).toHaveLength(0);
    });

    it('deve permitir MULTIPLIER + DERIVED_TIME', () => {
      const rounds = parseStructureLine('**3 ROUNDS**')!;
      const forTime = parseStructureLine('**FOR TIME**')!;
      const errors = validateStructures([rounds, forTime]);
      expect(errors).toHaveLength(0);
    });

    it('deve PROIBIR FIXED_TIME + MULTIPLIER', () => {
      const emom = parseStructureLine('**EMOM 30**')!;
      const rounds = parseStructureLine('**3 ROUNDS**')!;
      const errors = validateStructures([emom, rounds]);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('CONFLICT_FIXED_MULTIPLIER');
    });

    it('deve PROIBIR FIXED_TIME + DERIVED_TIME', () => {
      const emom = parseStructureLine('**EMOM 30**')!;
      const forTime = parseStructureLine('**FOR TIME**')!;
      const errors = validateStructures([emom, forTime]);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('CONFLICT_MULTIPLE_TIME_MODES');
    });

    it('deve PROIBIR múltiplos FIXED_TIME', () => {
      const emom = parseStructureLine('**EMOM 30**')!;
      const amrap = parseStructureLine('**AMRAP 15**')!;
      const errors = validateStructures([emom, amrap]);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe('CONFLICT_MULTIPLE_TIME_MODES');
    });
  });

  describe('parseBlockStructures', () => {
    it('deve extrair estruturas e linhas limpas', () => {
      const content = `**3 ROUNDS**
- 10 Burpees
- 20 Wall Balls
- 400m Run`;
      
      const result = parseBlockStructures(content);
      expect(result.structures).toHaveLength(1);
      expect(result.structures[0].type).toBe('MULTIPLIER');
      expect(result.cleanedLines).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it('deve detectar erros de conflito', () => {
      const content = `**EMOM 30**
**3 ROUNDS**
- 10 Burpees`;
      
      const result = parseBlockStructures(content);
      expect(result.structures).toHaveLength(2);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('cálculo de tempo', () => {
    it('getRoundsMultiplier deve retornar o valor de ROUNDS', () => {
      const rounds = parseStructureLine('**5 ROUNDS**')!;
      expect(getRoundsMultiplier([rounds])).toBe(5);
    });

    it('getRoundsMultiplier deve retornar 1 se não houver ROUNDS', () => {
      expect(getRoundsMultiplier([])).toBe(1);
    });

    it('getFixedTimeMinutes deve retornar minutos do EMOM/AMRAP', () => {
      const emom = parseStructureLine('**EMOM 20**')!;
      expect(getFixedTimeMinutes([emom])).toBe(20);
    });

    it('isForTime deve detectar FOR TIME', () => {
      const forTime = parseStructureLine('**FOR TIME**')!;
      expect(isForTime([forTime])).toBe(true);
    });

    it('calculateBlockTimeFromStructures deve usar tempo fixo para EMOM', () => {
      const emom = parseStructureLine('**EMOM 30**')!;
      const time = calculateBlockTimeFromStructures([emom], 10);
      expect(time).toBe(30); // Ignora exerciseEstimatedMinutes
    });

    it('calculateBlockTimeFromStructures deve multiplicar para ROUNDS', () => {
      const rounds = parseStructureLine('**3 ROUNDS**')!;
      const time = calculateBlockTimeFromStructures([rounds], 10);
      expect(time).toBe(30); // 10 * 3
    });
  });

  describe('getStructureDescription', () => {
    it('deve gerar descrição legível', () => {
      const rounds = parseStructureLine('**3 ROUNDS**')!;
      expect(getStructureDescription([rounds])).toBe('3 Rounds');
    });

    it('deve combinar múltiplas estruturas', () => {
      const rounds = parseStructureLine('**5 ROUNDS**')!;
      const forTime = parseStructureLine('**FOR TIME**')!;
      expect(getStructureDescription([rounds, forTime])).toBe('5 Rounds + For Time');
    });
  });
});
