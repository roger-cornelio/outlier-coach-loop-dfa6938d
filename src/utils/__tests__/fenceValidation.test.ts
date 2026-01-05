// src/utils/__tests__/fenceValidation.test.ts
// MVP0: Testes de validação de linhas não executáveis

import { describe, it, expect } from 'vitest';
import { validateFence, isExecutableLine as isExecFence } from '../fenceValidation';
import { separateBlockContent, isExecutableLine as isExecBlock } from '../blockDisplayUtils';

describe('isExecutableLine - Regra determinística', () => {
  describe('Linhas que DEVEM ser executáveis (passar)', () => {
    const validLines = [
      'Front Squat 5x6 | PSE 8 | rest 2:00',
      '500m trote leve',
      '10 Burpees',
      'EMOM 20 min',
      '4x20 m Farmer Carry',
      'rest 2:00',
      'PSE 8',
      'Z2 corrida',
      'Corrida 45 min Zona 2',
      '5 Rounds For Time',
      '15 Wall Balls 20/14 lb',
      '30 calorias Bike',
      '100m sprint',
    ];
    
    validLines.forEach(line => {
      it(`deve aceitar: "${line}"`, () => {
        expect(isExecFence(line)).toBe(true);
        expect(isExecBlock(line)).toBe(true);
      });
    });
  });
  
  describe('Linhas que NÃO DEVEM ser executáveis (bloquear)', () => {
    const invalidLines = [
      'Priorizar técnica no agachamento frontal.',
      'focado em manutenção de força e eficiência técnica.',
      'Manter o foco na qualidade do movimento.',
      'Se sentir bem, aumentar a carga.',
      'Objetivo é trabalhar resistência.',
      'Atenção à postura durante toda a série.',
      'Treino de hoje é mais leve.',
    ];
    
    invalidLines.forEach(line => {
      it(`deve rejeitar: "${line}"`, () => {
        expect(isExecFence(line)).toBe(false);
        expect(isExecBlock(line)).toBe(false);
      });
    });
  });
});

describe('validateFence - Erro duro para linha não executável', () => {
  it('Teste 1: DEVE BLOQUEAR linha não executável fora de [COMENTÁRIO]', () => {
    const input = `SEGUNDA-FEIRA

FORÇA
[TREINO]
- Front Squat 5x6 | PSE 8 | rest 2:00
Priorizar técnica no agachamento frontal.
[COMENTÁRIO]
Treino focado em força.`;

    const result = validateFence(input);
    
    // Deve ter erro de linha não executável
    const nonExecErrors = result.errors.filter(e => e.type === 'NON_EXECUTABLE_LINE');
    expect(nonExecErrors.length).toBeGreaterThan(0);
    
    // O erro deve apontar a linha problemática
    const error = nonExecErrors[0];
    expect(error.lineText).toContain('Priorizar técnica');
    expect(error.blockTitle).toBe('FORÇA');
    
    // Validação deve falhar
    expect(result.isValid).toBe(false);
  });

  it('Teste 2: DEVE PASSAR quando linha explicativa está dentro de [COMENTÁRIO]', () => {
    const input = `SEGUNDA-FEIRA

FORÇA
[TREINO]
- Front Squat 5x6 | PSE 8 | rest 2:00
[COMENTÁRIO]
Priorizar técnica no agachamento frontal.`;

    const result = validateFence(input);
    
    // Não deve ter erro de linha não executável
    const nonExecErrors = result.errors.filter(e => e.type === 'NON_EXECUTABLE_LINE');
    expect(nonExecErrors.length).toBe(0);
    
    // Validação deve passar (assumindo outras regras OK)
    // Nota: pode ter outros erros (âncora, etc.), mas NÃO de non-executable
    const hasOnlyAnchorErrors = result.errors.every(
      e => e.type === 'MISSING_ANCHOR' || e.type !== 'NON_EXECUTABLE_LINE'
    );
    expect(hasOnlyAnchorErrors).toBe(true);
  });

  it('Teste 3: Vazamento específico do bug - linha sem métrica não é treino', () => {
    const input = `SEGUNDA-FEIRA

FORÇA
[TREINO]
focado em manutenção de força e eficiência técnica.
[COMENTÁRIO]
Treino de hoje.`;

    const result = validateFence(input);
    
    // Deve ter erro de linha não executável
    const nonExecErrors = result.errors.filter(e => e.type === 'NON_EXECUTABLE_LINE');
    expect(nonExecErrors.length).toBeGreaterThan(0);
    
    // A linha problemática deve estar no erro
    expect(nonExecErrors[0].lineText).toContain('manutenção de força');
    
    // Bloco correspondente no parse NÃO deve ter essa linha em trainLines válidas
    const forceBlock = result.blocks.find(b => b.title === 'FORÇA');
    expect(forceBlock).toBeDefined();
    
    // trainLines só deve conter linhas executáveis (neste caso, nenhuma)
    // Mas trainLines RAW ainda contém a linha - o erro é que ela não deveria estar lá
    // A verificação correta é que o erro foi gerado
    expect(result.isValid).toBe(false);
  });
});

describe('separateBlockContent - Filtro de linhas não executáveis', () => {
  it('deve filtrar linhas não executáveis das exerciseLines', () => {
    const content = `[TREINO]
Front Squat 5x6 | PSE 8 | rest 2:00
Priorizar técnica no agachamento frontal.
10 Burpees
[COMENTÁRIO]
Treino focado.`;

    const result = separateBlockContent(content);
    
    // exerciseLines NÃO deve conter a frase não executável
    expect(result.exerciseLines.some(l => l.includes('Priorizar'))).toBe(false);
    
    // exerciseLines deve conter as linhas executáveis
    expect(result.exerciseLines.some(l => l.includes('Front Squat'))).toBe(true);
    expect(result.exerciseLines.some(l => l.includes('Burpees'))).toBe(true);
  });

  it('deve retornar exerciseLines vazio se não houver linhas executáveis', () => {
    const content = `[TREINO]
focado em manutenção de força e eficiência técnica.
Treino de hoje é mais leve.
[COMENTÁRIO]
Observações do coach.`;

    const result = separateBlockContent(content);
    
    // Nenhuma linha executável
    expect(result.exerciseLines.length).toBe(0);
    
    // commentLines deve ter o conteúdo do [COMENTÁRIO]
    expect(result.commentLines.length).toBeGreaterThan(0);
  });

  it('trainingLines.length === 0 quando bloco só tem comentário disfarçado', () => {
    const content = `[TREINO]
focado em manutenção de força e eficiência técnica.
[COMENTÁRIO]
Notas.`;

    const result = separateBlockContent(content);
    
    // UI não deve renderizar este bloco como treino
    expect(result.exerciseLines.length).toBe(0);
  });
});
