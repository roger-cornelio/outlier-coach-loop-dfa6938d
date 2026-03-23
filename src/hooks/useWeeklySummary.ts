/**
 * useWeeklySummary
 * 
 * Agrega dados da semana anterior para exibir resumo no dashboard:
 * - Treinos completados (count)
 * - Tempo total de treino (minutos)
 * - Tendência de evolução
 * 
 * Visível toda segunda-feira (ou dismissável via localStorage).
 */

import { useMemo, useState, useCallback } from 'react';
import { useOutlierStore } from '@/store/outlierStore';
import { useWeeklyEvolution } from '@/hooks/useWeeklyEvolution';
import type { DayOfWeek } from '@/types/outlier';

const DISMISS_KEY = 'outlier_weekly_summary_dismissed';
const STORAGE_KEY = 'outlier-benchmark-history';

interface WeeklySummary {
  completedCount: number;
  totalMinutes: number;
  totalDays: number;
  weekLabel: string;
  evolutionTrend: 'improving' | 'stable' | 'declining';
  evolutionText: string;
}

function getLastWeekRange(): { from: Date; to: Date; weekLabel: string; weekKey: string } {
  const now = new Date();
  // Calcular segunda-feira da semana passada
  const dayOfWeek = now.getDay(); // 0=dom, 1=seg...
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - daysToLastMonday - 7);
  lastMonday.setHours(0, 0, 0, 0);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  const weekLabel = `${lastMonday.getDate()}/${lastMonday.getMonth() + 1} - ${lastSunday.getDate()}/${lastSunday.getMonth() + 1}`;
  const weekKey = lastMonday.toISOString().split('T')[0];

  return { from: lastMonday, to: lastSunday, weekLabel, weekKey };
}

function isMonday(): boolean {
  return new Date().getDay() === 1;
}

export function useWeeklySummary() {
  const { workoutResults } = useOutlierStore();
  const evolution = useWeeklyEvolution();

  const { from, to, weekLabel, weekKey } = useMemo(() => getLastWeekRange(), []);

  // Check if dismissed this week
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      return dismissed === weekKey;
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, weekKey);
    } catch { /* noop */ }
  }, [weekKey]);

  const summary = useMemo<WeeklySummary | null>(() => {
    // Carregar do localStorage
    let storageResults: { workout_id: string; completed: boolean; time_in_seconds?: number; created_at: string }[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      storageResults = stored ? JSON.parse(stored) : [];
    } catch { /* noop */ }

    const validDays = new Set<string>();
    let totalSeconds = 0;

    // localStorage results
    for (const r of storageResults) {
      const date = new Date(r.created_at);
      if (date < from || date > to) continue;
      if (r.completed) {
        validDays.add(r.workout_id);
        totalSeconds += r.time_in_seconds || 0;
      }
    }

    // Store results (mais recentes)
    for (const r of workoutResults) {
      const date = new Date(r.date);
      if (date < from || date > to) continue;
      if (r.completed) {
        validDays.add(r.workoutId);
        totalSeconds += r.timeInSeconds || 0;
      }
    }

    const completedCount = validDays.size;

    return {
      completedCount,
      totalMinutes: Math.round(totalSeconds / 60),
      totalDays: 7,
      weekLabel,
      evolutionTrend: evolution.trend.direction,
      evolutionText: evolution.trend.text,
    };
  }, [from, to, weekLabel, workoutResults, evolution.trend]);

  const showSummary = isMonday() && !isDismissed && summary !== null;

  return {
    summary,
    showSummary,
    dismiss,
    isMonday: isMonday(),
  };
}
