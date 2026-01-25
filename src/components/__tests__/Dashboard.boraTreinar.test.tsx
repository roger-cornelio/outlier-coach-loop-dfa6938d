import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock da data para sexta-feira 23/01/2026
const FRIDAY_JAN_23_2026 = new Date('2026-01-23T12:00:00');

describe("Dashboard - Botão BORA TREINAR", () => {
  beforeEach(() => {
    // Simular que hoje é sexta-feira 23/01/2026
    vi.useFakeTimers();
    vi.setSystemTime(FRIDAY_JAN_23_2026);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve identificar sexta-feira corretamente (dia 5)", () => {
    const now = new Date();
    expect(now.getDay()).toBe(5); // 5 = sexta-feira
  });

  it("deve mapear corretamente para 'sex' no array de dias", () => {
    const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const todayIndex = new Date().getDay();
    const todayDayOfWeek = days[todayIndex];
    
    expect(todayDayOfWeek).toBe('sex');
  });

  it("deve encontrar treino de sexta quando existe no plano", () => {
    // Simular workouts da semana 2026-01-19 (dados reais do banco)
    const mockWorkouts = [
      { day: 'seg', isRestDay: false, blocks: [{ id: 'seg-0', type: 'forca' }] },
      { day: 'ter', isRestDay: false, blocks: [{ id: 'ter-0', type: 'acessorio' }] },
      { day: 'qua', isRestDay: false, blocks: [{ id: 'qua-0', type: 'especifico' }] },
      { day: 'qui', isRestDay: false, blocks: [{ id: 'qui-0', type: 'forca' }] },
      { day: 'sex', isRestDay: false, blocks: [
        { id: 'sex-0', type: 'corrida', title: 'RUN + WORK CAPACITY' },
        { id: 'sex-1', type: 'corrida', title: 'LONGO (SIMULAÇÃO)', isMainWod: true }
      ]},
    ];

    const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const todayDayOfWeek = days[new Date().getDay()];
    
    const todayWorkout = mockWorkouts.find((w) => w.day === todayDayOfWeek);
    
    expect(todayWorkout).toBeDefined();
    expect(todayWorkout?.day).toBe('sex');
    expect(todayWorkout?.isRestDay).toBe(false);
    expect(todayWorkout?.blocks.length).toBe(2);
  });

  it("deve retornar undefined quando não há treino para o dia", () => {
    // Simular workouts sem sábado
    const mockWorkouts = [
      { day: 'seg', isRestDay: false, blocks: [] },
      { day: 'ter', isRestDay: false, blocks: [] },
    ];

    // Simular sábado 24/01/2026
    vi.setSystemTime(new Date('2026-01-24T12:00:00'));
    
    const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const todayDayOfWeek = days[new Date().getDay()];
    
    expect(todayDayOfWeek).toBe('sab');
    
    const todayWorkout = mockWorkouts.find((w) => w.day === todayDayOfWeek);
    
    expect(todayWorkout).toBeUndefined();
  });

  it("deve tratar dia de descanso como sem treino disponível", () => {
    const mockWorkouts = [
      { day: 'sex', isRestDay: true, blocks: [] },
    ];

    const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const todayDayOfWeek = days[new Date().getDay()];
    
    const todayWorkout = mockWorkouts.find((w) => w.day === todayDayOfWeek);
    
    expect(todayWorkout).toBeDefined();
    expect(todayWorkout?.isRestDay).toBe(true);
    
    // Lógica do handleStartWorkout: não deve iniciar se isRestDay
    const shouldStartWorkout = todayWorkout && !todayWorkout.isRestDay;
    expect(shouldStartWorkout).toBe(false);
  });
});
