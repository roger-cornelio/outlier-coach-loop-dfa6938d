import { describe, it, expect } from 'vitest';
import {
  computeTrainingFocus,
  computeStationEmphasis,
  resolveStationWeight,
} from '@/utils/diagnosticProportionEngine';
import type { DiagnosticoMelhoria } from '@/components/diagnostico/types';

// ════════════════════════════════════════════════════════════════
// DADOS REAIS DE UM ATLETA HYROX (simulado baseado em prova real)
// ════════════════════════════════════════════════════════════════

const MOCK_DIAGNOSTICOS: DiagnosticoMelhoria[] = [
  { id: '1', movement: 'Running',        metric: 'time', value: 0, your_score: 2400, top_1: 2100, improvement_value: 300, percentage: 0, total_improvement: 0 },
  { id: '2', movement: 'SkiErg',         metric: 'time', value: 0, your_score: 240,  top_1: 195,  improvement_value: 45,  percentage: 0, total_improvement: 0 },
  { id: '3', movement: 'Sled Push',      metric: 'time', value: 0, your_score: 180,  top_1: 120,  improvement_value: 60,  percentage: 0, total_improvement: 0 },
  { id: '4', movement: 'Sled Pull',      metric: 'time', value: 0, your_score: 150,  top_1: 110,  improvement_value: 40,  percentage: 0, total_improvement: 0 },
  { id: '5', movement: 'Burpee Broad Jumps', metric: 'time', value: 0, your_score: 210, top_1: 150, improvement_value: 60, percentage: 0, total_improvement: 0 },
  { id: '6', movement: 'Rowing',         metric: 'time', value: 0, your_score: 230,  top_1: 190,  improvement_value: 40,  percentage: 0, total_improvement: 0 },
  { id: '7', movement: 'Farmers Carry',  metric: 'time', value: 0, your_score: 130,  top_1: 95,   improvement_value: 35,  percentage: 0, total_improvement: 0 },
  { id: '8', movement: 'Sandbag Lunges', metric: 'time', value: 0, your_score: 160,  top_1: 115,  improvement_value: 45,  percentage: 0, total_improvement: 0 },
  { id: '9', movement: 'Wall Balls',     metric: 'time', value: 0, your_score: 190,  top_1: 120,  improvement_value: 70,  percentage: 0, total_improvement: 0 },
  { id: '10', movement: 'Roxzone Time',  metric: 'roxzone', value: 0, your_score: 180, top_1: 100, improvement_value: 80, percentage: 0, total_improvement: 0 },
];

// Fórmula LINEAR antiga: improvement_value / total
function computeLinearFocus(diagnosticos: DiagnosticoMelhoria[]) {
  const total = diagnosticos.reduce((s, d) => s + d.improvement_value, 0);
  return diagnosticos.map(d => ({
    movement: d.movement,
    focusPercent: total > 0 ? (d.improvement_value / total) * 100 : 0,
  }));
}

describe('diagnosticProportionEngine', () => {

  describe('resolveStationWeight', () => {
    it('resolve estações por nome exato', () => {
      expect(resolveStationWeight('Wall Balls').impactWeight).toBe(0.13);
      expect(resolveStationWeight('sled push').timeWeight).toBe(0.09);
    });

    it('resolve estações por match parcial', () => {
      expect(resolveStationWeight('Burpee Broad Jumps').impactWeight).toBe(0.10);
      expect(resolveStationWeight('Roxzone Time').impactWeight).toBe(0.08);
    });

    it('retorna default para estação desconhecida', () => {
      const w = resolveStationWeight('Exercício Inventado');
      expect(w.timeWeight).toBe(0.05);
      expect(w.impactWeight).toBe(0.05);
    });
  });

  describe('computeTrainingFocus — fórmula ponderada', () => {
    it('retorna array com mesmo tamanho dos inputs', () => {
      const result = computeTrainingFocus(MOCK_DIAGNOSTICOS);
      expect(result).toHaveLength(MOCK_DIAGNOSTICOS.length);
    });

    it('soma dos percentuais ≈ 100%', () => {
      const result = computeTrainingFocus(MOCK_DIAGNOSTICOS);
      const total = result.reduce((s, r) => s + r.focusPercent, 0);
      expect(total).toBeCloseTo(100, 0);
    });

    it('Wall Balls ganha mais foco que na fórmula linear', () => {
      const weighted = computeTrainingFocus(MOCK_DIAGNOSTICOS);
      const linear = computeLinearFocus(MOCK_DIAGNOSTICOS);

      const wallWeighted = weighted.find(r => r.movement === 'Wall Balls')!.focusPercent;
      const wallLinear = linear.find(r => r.movement === 'Wall Balls')!.focusPercent;

      console.log(`Wall Balls: Linear=${wallLinear.toFixed(1)}% → Ponderada=${wallWeighted.toFixed(1)}%`);
      expect(wallWeighted).toBeGreaterThan(wallLinear);
    });

    it('Roxzone ganha mais foco que na fórmula linear', () => {
      const weighted = computeTrainingFocus(MOCK_DIAGNOSTICOS);
      const linear = computeLinearFocus(MOCK_DIAGNOSTICOS);

      const roxWeighted = weighted.find(r => r.movement === 'Roxzone Time')!.focusPercent;
      const roxLinear = linear.find(r => r.movement === 'Roxzone Time')!.focusPercent;

      console.log(`Roxzone: Linear=${roxLinear.toFixed(1)}% → Ponderada=${roxWeighted.toFixed(1)}%`);
      expect(roxWeighted).toBeGreaterThan(roxLinear);
    });

    it('Running perde foco relativo vs fórmula linear', () => {
      const weighted = computeTrainingFocus(MOCK_DIAGNOSTICOS);
      const linear = computeLinearFocus(MOCK_DIAGNOSTICOS);

      const runWeighted = weighted.find(r => r.movement === 'Running')!.focusPercent;
      const runLinear = linear.find(r => r.movement === 'Running')!.focusPercent;

      console.log(`Running: Linear=${runLinear.toFixed(1)}% → Ponderada=${runWeighted.toFixed(1)}%`);
      // Running still has highest focus, but relatively less dominant
      expect(runWeighted).toBeLessThan(runLinear);
    });

    it('retorna vazio para array vazio', () => {
      expect(computeTrainingFocus([])).toEqual([]);
    });
  });

  describe('computeStationEmphasis — multiplicadores', () => {
    it('multiplicadores estão entre 0.85 e 1.15', () => {
      const emphasis = computeStationEmphasis(MOCK_DIAGNOSTICOS);
      for (const e of emphasis) {
        expect(e.multiplier).toBeGreaterThanOrEqual(0.85);
        expect(e.multiplier).toBeLessThanOrEqual(1.15);
      }
    });

    it('volume-neutro: média dos multiplicadores ≈ 1.0', () => {
      const emphasis = computeStationEmphasis(MOCK_DIAGNOSTICOS);
      const avg = emphasis.reduce((s, e) => s + e.multiplier, 0) / emphasis.length;
      expect(avg).toBeCloseTo(1.0, 1);
    });

    it('estação mais fraca recebe maior multiplicador', () => {
      const emphasis = computeStationEmphasis(MOCK_DIAGNOSTICOS);
      const wallBalls = emphasis.find(e => e.movement === 'Wall Balls')!;
      const skiErg = emphasis.find(e => e.movement === 'SkiErg')!;

      console.log(`Wall Balls: ${wallBalls.multiplier}x (${wallBalls.label})`);
      console.log(`SkiErg: ${skiErg.multiplier}x (${skiErg.label})`);

      // Wall Balls has higher improvement_value AND higher impact → higher multiplier
      expect(wallBalls.multiplier).toBeGreaterThan(skiErg.multiplier);
    });

    it('labels formatados corretamente', () => {
      const emphasis = computeStationEmphasis(MOCK_DIAGNOSTICOS);
      for (const e of emphasis) {
        expect(e.label).toMatch(/^[+-]?\d+%$/);
      }
    });

    it('retorna vazio para array vazio', () => {
      expect(computeStationEmphasis([])).toEqual([]);
    });
  });

  describe('Comparação LINEAR vs PONDERADA — impacto completo', () => {
    it('mostra tabela comparativa completa', () => {
      const weighted = computeTrainingFocus(MOCK_DIAGNOSTICOS);
      const linear = computeLinearFocus(MOCK_DIAGNOSTICOS);
      const emphasis = computeStationEmphasis(MOCK_DIAGNOSTICOS);

      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('  COMPARAÇÃO: Fórmula Linear vs Ponderada (Foco de Treino %)');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(
        'Estação'.padEnd(22),
        'Linear'.padStart(8),
        'Ponderada'.padStart(10),
        'Δ'.padStart(8),
        'Mult'.padStart(7),
      );
      console.log('─'.repeat(60));

      for (const w of weighted) {
        const l = linear.find(x => x.movement === w.movement)!;
        const e = emphasis.find(x => x.movement === w.movement)!;
        const delta = w.focusPercent - l.focusPercent;
        console.log(
          w.movement.padEnd(22),
          `${l.focusPercent.toFixed(1)}%`.padStart(8),
          `${w.focusPercent.toFixed(1)}%`.padStart(10),
          `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`.padStart(8),
          `${e.multiplier}x`.padStart(7),
        );
      }

      console.log('─'.repeat(60));
      
      // Verificação geral: a fórmula ponderada redistribui foco
      const totalDelta = weighted.reduce((s, w) => {
        const l = linear.find(x => x.movement === w.movement)!;
        return s + Math.abs(w.focusPercent - l.focusPercent);
      }, 0);

      console.log(`\nRedistribuição total: ${totalDelta.toFixed(1)} pontos percentuais movidos`);
      expect(totalDelta).toBeGreaterThan(5); // Pelo menos 5pp de redistribuição
    });
  });
});
