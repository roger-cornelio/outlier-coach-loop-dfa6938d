/**
 * useWeekWorkoutCompletions
 *
 * Lê os resultados de treino do localStorage para a semana atual
 * e retorna um mapa de { dia -> { completed, timeInSeconds } }
 *
 * workout_id no benchmark_results é o dia da semana (ex: 'seg', 'ter')
 * Filtra apenas resultados da semana atual (weekStart)
 */

import { useMemo } from 'react';
import { useOutlierStore } from '@/store/outlierStore';
import type { DayOfWeek } from '@/types/outlier';

export interface DayCompletionInfo {
  completed: boolean;
  timeInSeconds?: number;
}

const STORAGE_KEY = 'outlier-benchmark-history';

function loadFromStorage(): { workout_id: string; completed: boolean; time_in_seconds?: number; created_at: string }[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Dado um weekStart (ex: '2026-02-17'), retorna o intervalo [seg, dom]
 * weekStart é sempre segunda-feira
 */
function getWeekRange(weekStart: string): { from: Date; to: Date } {
  const from = new Date(weekStart + 'T00:00:00');
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function useWeekWorkoutCompletions(weekStart: string): Map<DayOfWeek, DayCompletionInfo> {
  const { workoutResults } = useOutlierStore();

  return useMemo(() => {
    const map = new Map<DayOfWeek, DayCompletionInfo>();

    const { from, to } = getWeekRange(weekStart);

    // Combinar resultados do store (mais recente, sessão atual) + localStorage
    const storageResults = loadFromStorage();

    // Agrupar pelo dia: pegar o resultado mais recente de cada dia
    const allByDay = new Map<string, { completed: boolean; timeInSeconds?: number; date: Date }>();

    // 1. Processar localStorage
    for (const r of storageResults) {
      const date = new Date(r.created_at);
      if (date < from || date > to) continue;
      const day = r.workout_id; // ex: 'seg', 'ter'
      const existing = allByDay.get(day);
      if (!existing || date > existing.date) {
        allByDay.set(day, {
          completed: r.completed,
          timeInSeconds: r.time_in_seconds,
          date,
        });
      }
    }

    // 2. Processar store (sobrescreve localStorage se mais recente)
    for (const r of workoutResults) {
      const date = new Date(r.date);
      if (date < from || date > to) continue;
      const day = r.workoutId; // ex: 'seg', 'ter'
      const existing = allByDay.get(day);
      if (!existing || date > existing.date) {
        allByDay.set(day, {
          completed: r.completed,
          timeInSeconds: r.timeInSeconds,
          date,
        });
      }
    }

    // Converter para Map<DayOfWeek, DayCompletionInfo>
    const validDays: DayOfWeek[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    for (const [day, info] of allByDay.entries()) {
      if (validDays.includes(day as DayOfWeek)) {
        map.set(day as DayOfWeek, {
          completed: info.completed,
          timeInSeconds: info.timeInSeconds,
        });
      }
    }

    return map;
  }, [weekStart, workoutResults]);
}
