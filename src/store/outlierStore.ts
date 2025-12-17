import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AthleteConfig, CoachStyle, WorkoutResult, DayWorkout } from '@/types/outlier';

interface OutlierState {
  coachStyle: CoachStyle | null;
  athleteConfig: AthleteConfig | null;
  workoutResults: WorkoutResult[];
  weeklyWorkouts: DayWorkout[];
  currentView: 'welcome' | 'config' | 'dashboard' | 'workout' | 'result' | 'feedback' | 'admin';
  selectedDay: string | null;
  selectedWorkout: DayWorkout | null;
  
  setCoachStyle: (style: CoachStyle) => void;
  setAthleteConfig: (config: AthleteConfig) => void;
  addWorkoutResult: (result: WorkoutResult) => void;
  setWeeklyWorkouts: (workouts: DayWorkout[]) => void;
  setCurrentView: (view: OutlierState['currentView']) => void;
  setSelectedDay: (day: string | null) => void;
  setSelectedWorkout: (workout: DayWorkout | null) => void;
  resetConfig: () => void;
}

export const useOutlierStore = create<OutlierState>()(
  persist(
    (set) => ({
      coachStyle: null,
      athleteConfig: null,
      workoutResults: [],
      weeklyWorkouts: [],
      currentView: 'welcome',
      selectedDay: null,
      selectedWorkout: null,

      setCoachStyle: (style) => set({ coachStyle: style }),
      setAthleteConfig: (config) => set({ athleteConfig: config }),
      addWorkoutResult: (result) =>
        set((state) => ({ workoutResults: [...state.workoutResults, result] })),
      setWeeklyWorkouts: (workouts) => set({ weeklyWorkouts: workouts }),
      setCurrentView: (view) => set({ currentView: view }),
      setSelectedDay: (day) => set({ selectedDay: day }),
      setSelectedWorkout: (workout) => set({ selectedWorkout: workout }),
      resetConfig: () => set({ coachStyle: null, athleteConfig: null, currentView: 'welcome' }),
    }),
    {
      name: 'outlier-storage',
    }
  )
);
