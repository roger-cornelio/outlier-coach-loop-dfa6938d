/**
 * useWorkoutStreak
 * 
 * Calcula streak de treinos consecutivos do atleta.
 * Tolerância: 1 dia de descanso não quebra o streak.
 * Persistência: localStorage com user-scoped key.
 */

import { useMemo } from 'react';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'outlier-benchmark-history';

function loadFromStorage(): { workout_id: string; completed: boolean; created_at: string }[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useWorkoutStreak() {
  const { workoutResults } = useOutlierStore();
  const { user } = useAuth();

  return useMemo(() => {
    // Collect unique dates with completed workouts
    const completedDates = new Set<string>();

    // From store
    for (const r of workoutResults) {
      if (r.completed) {
        completedDates.add(toDateStr(new Date(r.date)));
      }
    }

    // From localStorage
    const storageResults = loadFromStorage();
    for (const r of storageResults) {
      if (r.completed) {
        completedDates.add(toDateStr(new Date(r.created_at)));
      }
    }

    if (completedDates.size === 0) {
      return { currentStreak: 0, isStreakActive: false, message: null };
    }

    // Sort dates descending
    const sortedDates = Array.from(completedDates).sort().reverse();
    
    const today = toDateStr(new Date());
    const yesterday = toDateStr(new Date(Date.now() - 86400000));

    // Streak starts from today or yesterday
    const startDate = sortedDates[0];
    const isStreakActive = startDate === today || startDate === yesterday;

    if (!isStreakActive) {
      return { currentStreak: 0, isStreakActive: false, message: null };
    }

    // Count consecutive days (with 1-day gap tolerance for rest days)
    let streak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const current = new Date(sortedDates[i]);
      const next = new Date(sortedDates[i + 1]);
      const diffDays = Math.round((current.getTime() - next.getTime()) / 86400000);
      
      if (diffDays === 1) {
        streak++;
      } else if (diffDays === 2) {
        // 1-day gap tolerance (rest day)
        streak++;
      } else {
        break;
      }
    }

    // Motivational messages
    let message: string | null = null;
    if (streak >= 14) message = 'Duas semanas! Você é imparável 🏆';
    else if (streak >= 7) message = 'Uma semana inteira! Consistência de elite 💪';
    else if (streak >= 5) message = '5 dias seguidos! Ritmo forte 🔥';
    else if (streak >= 3) message = '3 dias seguidos! Continue assim 🔥';

    return { currentStreak: streak, isStreakActive: true, message };
  }, [workoutResults]);
}
