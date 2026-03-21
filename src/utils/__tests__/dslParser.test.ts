import { describe, it, expect } from 'vitest';
import {
  isDSLDayLine,
  isDSLBlockLine,
  isDSLExerciseLine,
  isDSLStructureLine,
  isDSLPureCommentLine,
  extractDSLDay,
  extractDSLBlockName,
  extractDSLExercise,
  extractDSLStructure,
  extractDSLComment,
  validateDSLStructure,
  classifyDSLLine,
  usesDSLFormat,
  hasDSLBlockingErrors,
} from '../dslParser';

describe('DSL Parser - Detecção de linhas', () => {
  describe('isDSLDayLine', () => {
    it('detecta DIA: SEGUNDA', () => {
      expect(isDSLDayLine('DIA: SEGUNDA')).toBe(true);
      expect(isDSLDayLine('DIA: TERÇA')).toBe(true);
      expect(isDSLDayLine('DIA: QUARTA')).toBe(true);
      expect(isDSLDayLine('DIA: QUINTA')).toBe(true);
      expect(isDSLDayLine('DIA: SEXTA')).toBe(true);
      expect(isDSLDayLine('DIA: SÁBADO')).toBe(true);
      expect(isDSLDayLine('DIA: DOMINGO')).toBe(true);
    });

    it('detecta variantes com -FEIRA', () => {
      expect(isDSLDayLine('DIA: SEGUNDA-FEIRA')).toBe(true);
      expect(isDSLDayLine('DIA: TERÇA-FEIRA')).toBe(true);
      expect(isDSLDayLine('DIA: TERCA-FEIRA')).toBe(true);
      expect(isDSLDayLine('DIA: QUINTA-FEIRA')).toBe(true);
    });

    it('não detecta formatos inválidos', () => {
      expect(isDSLDayLine('SEGUNDA')).toBe(false);
      expect(isDSLDayLine('Dia: Segunda')).toBe(true);
      expect(isDSLDayLine('DIA SEGUNDA')).toBe(false);
    });
  });

  describe('isDSLBlockLine', () => {
    it('detecta BLOCO: X', () => {
      expect(isDSLBlockLine('BLOCO: AQUECIMENTO')).toBe(true);
      expect(isDSLBlockLine('BLOCO: WOD PRINCIPAL')).toBe(true);
      expect(isDSLBlockLine('BLOCO: Força')).toBe(true);
    });

    it('não detecta formatos inválidos', () => {
      expect(isDSLBlockLine('AQUECIMENTO')).toBe(false);
      expect(isDSLBlockLine('BLOCO AQUECIMENTO')).toBe(false); // falta :
    });
  });

  describe('isDSLExerciseLine', () => {
    it('detecta linhas com "- "', () => {
      expect(isDSLExerciseLine('- 500m Run')).toBe(true);
      expect(isDSLExerciseLine('- 10 Pull-ups')).toBe(true);
      expect(isDSLExerciseLine('-10 Pull-ups')).toBe(false); // precisa do espaço
    });

    it('não detecta linhas sem hífen', () => {
      expect(isDSLExerciseLine('500m Run')).toBe(false);
      expect(isDSLExerciseLine('10 Pull-ups')).toBe(false);
    });
  });

  describe('isDSLStructureLine', () => {
    it('detecta estruturas entre **', () => {
      expect(isDSLStructureLine('**3 ROUNDS**')).toBe(true);
      expect(isDSLStructureLine('**EMOM 30**')).toBe(true);
      expect(isDSLStructureLine('**AMRAP 15**')).toBe(true);
      expect(isDSLStructureLine('**FOR TIME**')).toBe(true);
    });

    it('não detecta estruturas malformadas', () => {
      expect(isDSLStructureLine('3 ROUNDS')).toBe(false);
      expect(isDSLStructureLine('*3 ROUNDS*')).toBe(false);
      expect(isDSLStructureLine('**3 ROUNDS')).toBe(false);
    });
  });

  describe('isDSLPureCommentLine', () => {
    it('detecta comentários entre ()', () => {
      expect(isDSLPureCommentLine('(Foco na mobilidade)')).toBe(true);
      expect(isDSLPureCommentLine('(Cap 12 min)')).toBe(true);
    });

    it('não detecta linhas mistas', () => {
      expect(isDSLPureCommentLine('- 500m Run (leve)')).toBe(false);
      expect(isDSLPureCommentLine('Aquecimento (zona 2)')).toBe(false);
    });
  });
});

describe('DSL Parser - Extração de conteúdo', () => {
  describe('extractDSLDay', () => {
    it('extrai dia corretamente', () => {
      expect(extractDSLDay('DIA: SEGUNDA')).toEqual({ dayName: 'SEGUNDA', dayValue: 'seg' });
      expect(extractDSLDay('DIA: TERÇA')).toEqual({ dayName: 'TERÇA', dayValue: 'ter' });
      expect(extractDSLDay('DIA: SÁBADO')).toEqual({ dayName: 'SÁBADO', dayValue: 'sab' });
    });

    it('extrai variantes com -FEIRA', () => {
      expect(extractDSLDay('DIA: SEGUNDA-FEIRA')).toEqual({ dayName: 'SEGUNDA-FEIRA', dayValue: 'seg' });
      expect(extractDSLDay('DIA: TERCA-FEIRA')).toEqual({ dayName: 'TERCA-FEIRA', dayValue: 'ter' });
    });

    it('retorna null para dia inválido', () => {
      expect(extractDSLDay('DIA: FERIADO')).toEqual({ dayName: 'FERIADO', dayValue: null });
    });
  });

  describe('extractDSLBlockName', () => {
    it('extrai nome do bloco', () => {
      expect(extractDSLBlockName('BLOCO: AQUECIMENTO')).toBe('AQUECIMENTO');
      expect(extractDSLBlockName('BLOCO: WOD Principal')).toBe('WOD Principal');
    });
  });

  describe('extractDSLExercise', () => {
    it('extrai exercício sem o hífen', () => {
      expect(extractDSLExercise('- 500m Run')).toBe('500m Run');
      expect(extractDSLExercise('- 10 Pull-ups')).toBe('10 Pull-ups');
    });
  });

  describe('extractDSLStructure', () => {
    it('extrai estrutura sem os asteriscos', () => {
      expect(extractDSLStructure('**3 ROUNDS**')).toBe('3 ROUNDS');
      expect(extractDSLStructure('**EMOM 30 MIN**')).toBe('EMOM 30 MIN');
    });
  });

  describe('extractDSLComment', () => {
    it('extrai comentário sem parênteses', () => {
      expect(extractDSLComment('(Foco na mobilidade)')).toBe('Foco na mobilidade');
      expect(extractDSLComment('(Cap 12 min)')).toBe('Cap 12 min');
    });
  });
});

describe('DSL Parser - Validação de estrutura', () => {
  it('valida estrutura correta sem erros', () => {
    const text = `DIA: SEGUNDA

BLOCO: AQUECIMENTO
- 500m Run
(Foco na mobilidade)

BLOCO: WOD
**FOR TIME**
- 21-15-9 Thrusters
- Pull-ups`;

    const errors = validateDSLStructure(text);
    expect(errors.filter(e => e.severity === 'ERROR')).toHaveLength(0);
  });

  it('detecta BLOCO sem DIA', () => {
    const text = `BLOCO: AQUECIMENTO
- 500m Run`;

    const errors = validateDSLStructure(text);
    expect(errors.some(e => e.message.includes('BLOCO:') && e.message.includes('antes de DIA:'))).toBe(true);
  });

  it('detecta exercício sem BLOCO', () => {
    const text = `DIA: SEGUNDA
- 500m Run`;

    const errors = validateDSLStructure(text);
    expect(errors.some(e => e.message.includes('sem BLOCO:'))).toBe(true);
  });

  it('detecta estrutura ** ** sem BLOCO', () => {
    const text = `DIA: SEGUNDA
**3 ROUNDS**`;

    const errors = validateDSLStructure(text);
    expect(errors.some(e => e.message.includes('sem BLOCO:'))).toBe(true);
  });

  it('permite comentário antes de DIA', () => {
    const text = `(Programa de treino)
DIA: SEGUNDA
BLOCO: AQUECIMENTO
- 500m Run`;

    const errors = validateDSLStructure(text);
    // Comentário () é permitido em qualquer lugar
    expect(errors.filter(e => e.severity === 'ERROR')).toHaveLength(0);
  });

  it('gera warning para texto antes de DIA', () => {
    const text = `Programa de treino
DIA: SEGUNDA
BLOCO: AQUECIMENTO
- 500m Run`;

    const errors = validateDSLStructure(text);
    expect(errors.some(e => e.severity === 'WARNING' && e.message.includes('antes de DIA:'))).toBe(true);
  });
});

describe('DSL Parser - Classificação de linhas', () => {
  it('classifica DIA corretamente', () => {
    const result = classifyDSLLine('DIA: SEGUNDA', 1);
    expect(result.type).toBe('DAY');
    expect(result.content).toBe('SEGUNDA');
    expect(result.dayValue).toBe('seg');
  });

  it('classifica BLOCO corretamente', () => {
    const result = classifyDSLLine('BLOCO: AQUECIMENTO', 2);
    expect(result.type).toBe('BLOCK');
    expect(result.content).toBe('AQUECIMENTO');
  });

  it('classifica EXERCÍCIO corretamente', () => {
    const result = classifyDSLLine('- 500m Run', 3);
    expect(result.type).toBe('EXERCISE');
    expect(result.content).toBe('500m Run');
  });

  it('classifica ESTRUTURA corretamente', () => {
    const result = classifyDSLLine('**3 ROUNDS**', 4);
    expect(result.type).toBe('STRUCTURE');
    expect(result.content).toBe('3 ROUNDS');
    expect(result.structureTag).toBe('__STRUCT:ROUNDS=3');
  });

  it('classifica COMENTÁRIO corretamente', () => {
    const result = classifyDSLLine('(Foco na mobilidade)', 5);
    expect(result.type).toBe('COMMENT');
    expect(result.content).toBe('Foco na mobilidade');
  });
});

describe('DSL Parser - Utilidades', () => {
  it('detecta formato DSL no texto', () => {
    expect(usesDSLFormat('DIA: SEGUNDA\nBLOCO: AQUECIMENTO')).toBe(true);
    expect(usesDSLFormat('BLOCO: WOD')).toBe(true);
    expect(usesDSLFormat('SEGUNDA\nAquecimento\n- 500m Run')).toBe(false);
  });

  it('detecta erros bloqueantes', () => {
    const errorsWithBlocking = [{ lineNumber: 1, lineText: 'test', message: 'erro', severity: 'ERROR' as const }];
    const errorsWithoutBlocking = [{ lineNumber: 1, lineText: 'test', message: 'aviso', severity: 'WARNING' as const }];
    
    expect(hasDSLBlockingErrors(errorsWithBlocking)).toBe(true);
    expect(hasDSLBlockingErrors(errorsWithoutBlocking)).toBe(false);
  });
});
