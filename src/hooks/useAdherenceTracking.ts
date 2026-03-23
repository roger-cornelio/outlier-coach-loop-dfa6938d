/**
 * useAdherenceTracking
 * 
 * Calcula aderência semanal (% treinos completados) e streak (semanas consecutivas ≥ 3 treinos).
 * Dados vêm do localStorage (outlier-benchmark-history) + store.
 */

import { useMemo } from 'react';
import { useOutlierStore } from '@/store/outlierStore';
import type { DayOfWeek } from '@/types/outlier';

const STORAGE_KEY = 'outlier-benchmark-history';
const STREAK_KEY = 'outlier_adherence_streak';

interface StoredResult {
  workout_id: string;
  completed: boolean;
  time_in_seconds?: number;
  created_at: string;
}

function loadFromStorage(): StoredResult[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function getWeekRange(weekStart: string): { from: Date; to: Date } {
  const from = new Date(weekStart + 'T00:00:00');
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export interface AdherenceData {
  /** Treinos completados esta semana */
  completedThisWeek: number;
  /** Total de dias com treino programado */
  scheduledThisWeek: number;
  /** Percentual de aderência (0-100) */
  adherencePct: number;
  /** Semanas consecutivas com ≥3 treinos */
  streakWeeks: number;
  /** Dias completados como array para visual */
  completedDays: DayOfWeek[];
  /** Mensagem motivacional baseada no desempenho */
  motivationalMessage: string;
}

function getMotivationalMessage(pct: number, streak: number): string {
  if (streak >= 4) return '🔥 Máquina! Streak de ' + streak + ' semanas.';
  if (streak >= 2) return '💪 ' + streak + ' semanas seguidas. Consistência gera resultado.';
  if (pct >= 80) return '🎯 Semana forte. Mantenha o ritmo.';
  if (pct >= 50) return '👊 Bom progresso. Cada treino conta.';
  if (pct > 0) return '⚡ Você começou. Agora é manter.';
  return '🏁 Nova semana. Bora construir o hábito.';
}

export function useAdherenceTracking(): AdherenceData {
  const { workoutResults, baseWorkouts } = useOutlierStore();

  return useMemo(() => {
    const now = new Date();
    const currentWeekStart = getMondayOfWeek(now);
    const { from, to } = getWeekRange(currentWeekStart);

    const storageResults = loadFromStorage();
    const completedDaysSet = new Set<string>();

    // localStorage
    for (const r of storageResults) {
      const date = new Date(r.created_at);
      if (date < from || date > to) continue;
      if (r.completed) completedDaysSet.add(r.workout_id);
    }

    // Store (mais recente)
    for (const r of workoutResults) {
      const date = new Date(r.date);
      if (date < from || date > to) continue;
      if (r.completed) completedDaysSet.add(r.workoutId);
    }

    const validDays: DayOfWeek[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    const completedDays = validDays.filter(d => completedDaysSet.has(d));
    const completedThisWeek = completedDays.length;

    // Scheduled = dias com treino real (não rest day)
    const scheduledThisWeek = Math.max(
      baseWorkouts.filter(w => !w.isRestDay && w.blocks && w.blocks.length > 0).length,
      completedThisWeek, // pelo menos o que completou
      1 // evitar divisão por zero
    );

    const adherencePct = Math.min(Math.round((completedThisWeek / scheduledThisWeek) * 100), 100);

    // Streak: contar semanas passadas consecutivas com ≥3 treinos
    let streakWeeks = 0;

    // Verificar semanas passadas (até 12 semanas)
    for (let w = 1; w <= 12; w++) {
      const weekDate = new Date(now);
      weekDate.setDate(weekDate.getDate() - 7 * w);
      const ws = getMondayOfWeek(weekDate);
      const { from: wFrom, to: wTo } = getWeekRange(ws);

      const weekDays = new Set<string>();
      for (const r of storageResults) {
        const date = new Date(r.created_at);
        if (date < wFrom || date > wTo) continue;
        if (r.completed) weekDays.add(r.workout_id);
      }
      for (const r of workoutResults) {
        const date = new Date(r.date);
        if (date < wFrom || date > wTo) continue;
        if (r.completed) weekDays.add(r.workoutId);
      }

      if (weekDays.size >= 3) {
        streakWeeks++;
      } else {
        break;
      }
    }

    // Se a semana atual também tem ≥3, incluir no streak
    if (completedThisWeek >= 3) {
      streakWeeks++;
    }

    return {
      completedThisWeek,
      scheduledThisWeek,
      adherencePct,
      streakWeeks,
      completedDays,
      motivationalMessage: getMotivationalMessage(adherencePct, streakWeeks),
    };
  }, [workoutResults, baseWorkouts]);
}
