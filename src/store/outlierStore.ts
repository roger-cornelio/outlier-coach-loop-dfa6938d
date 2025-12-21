import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AthleteConfig, CoachStyle, WorkoutResult, DayWorkout } from '@/types/outlier';
import { migrateWorkouts } from '@/utils/benchmarkMigration';

// ============================================
// STORE SIMPLIFICADO - SEM GUARDS OU ASSINATURAS
// ============================================
// Todas as funções de set devem SEMPRE atualizar o estado
// Lógica de controle fica no Dashboard
// ============================================

interface ViewingAsAthlete {
  id: string;
  email: string;
  name: string | null;
}

interface OutlierState {
  // Hydration flag - evita loops durante rehydrate
  hasHydrated: boolean;
  
  coachStyle: CoachStyle | null;
  athleteConfig: AthleteConfig | null;
  workoutResults: WorkoutResult[];
  
  // PLANILHA BASE (definida pelo coach)
  baseWorkouts: DayWorkout[];
  
  // TREINO ADAPTADO (gerado para o atleta)
  adaptedWorkouts: DayWorkout[];
  
  // Flag para indicar se adaptação está pendente
  adaptationPending: boolean;
  
  // Timestamp da última adaptação
  lastAdaptationTimestamp: number | null;
  
  // Legacy: mantido para compatibilidade
  weeklyWorkouts: DayWorkout[];
  
  currentView: 'welcome' | 'athleteWelcome' | 'config' | 'dashboard' | 'preWorkout' | 'workout' | 'result' | 'feedback' | 'admin' | 'users' | 'userManagement' | 'benchmarks' | 'params' | 'coachPerformance' | 'coachApplication' | 'coachApplicationsAdmin';
  selectedDay: string | null;
  selectedWorkout: DayWorkout | null;
  externalResultsRefreshKey: number;
  
  // Admin: Visualizar como atleta específico
  viewingAsAthlete: ViewingAsAthlete | null;
  
  // Actions
  setHasHydrated: (v: boolean) => void;
  setCoachStyle: (style: CoachStyle) => void;
  setAthleteConfig: (config: AthleteConfig) => void;
  addWorkoutResult: (result: WorkoutResult) => void;
  
  // Base workouts - SEMPRE atualiza, sem condições
  setBaseWorkouts: (workouts: DayWorkout[]) => void;
  clearBaseWorkouts: () => void;
  
  // Adapted workouts
  setAdaptedWorkouts: (workouts: DayWorkout[]) => void;
  clearAdaptedWorkouts: () => void;
  markAdaptationPending: () => void;
  
  // Legacy
  setWeeklyWorkouts: (workouts: DayWorkout[]) => void;
  
  setCurrentView: (view: OutlierState['currentView']) => void;
  setSelectedDay: (day: string | null) => void;
  setSelectedWorkout: (workout: DayWorkout | null) => void;
  triggerExternalResultsRefresh: () => void;
  resetConfig: () => void;
  resetToDefaults: () => void;
  resetUserPreferencesOnly: () => void;
  
  // Admin: Visualizar como atleta
  setViewingAsAthlete: (athlete: ViewingAsAthlete | null) => void;
  clearViewingAsAthlete: () => void;
}

export const useOutlierStore = create<OutlierState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      coachStyle: null,
      athleteConfig: null,
      workoutResults: [],
      baseWorkouts: [],
      adaptedWorkouts: [],
      adaptationPending: false,
      lastAdaptationTimestamp: null,
      weeklyWorkouts: [],
      currentView: 'welcome',
      selectedDay: null,
      selectedWorkout: null,
      externalResultsRefreshKey: 0,
      viewingAsAthlete: null,

      setHasHydrated: (v) => set({ hasHydrated: v }),
      setCoachStyle: (style) => set({ coachStyle: style }),
      
      setAthleteConfig: (config) => {
        const currentConfig = get().athleteConfig;
        const configChanged = !currentConfig || 
          currentConfig.trainingLevel !== config.trainingLevel ||
          currentConfig.sexo !== config.sexo ||
          currentConfig.sessionDuration !== config.sessionDuration ||
          JSON.stringify(currentConfig.equipment) !== JSON.stringify(config.equipment);
        
        set({ 
          athleteConfig: config,
          adaptationPending: configChanged ? true : get().adaptationPending,
        });
      },
      
      addWorkoutResult: (result) =>
        set((state) => ({ workoutResults: [...state.workoutResults, result] })),
      
      // PLANILHA BASE - SEMPRE atualiza, sem condições
      setBaseWorkouts: (workouts) => set({
        baseWorkouts: workouts,
        weeklyWorkouts: workouts,
        adaptationPending: workouts.length > 0,
        adaptedWorkouts: [],
      }),
      
      // Limpar base workouts
      clearBaseWorkouts: () => set({
        baseWorkouts: [],
        weeklyWorkouts: [],
        adaptationPending: false,
        adaptedWorkouts: [],
      }),
      
      // TREINO ADAPTADO
      setAdaptedWorkouts: (workouts) => set({ 
        adaptedWorkouts: workouts,
        weeklyWorkouts: workouts,
        adaptationPending: false,
        lastAdaptationTimestamp: Date.now(),
      }),
      
      clearAdaptedWorkouts: () => set((state) => ({ 
        adaptedWorkouts: [],
        weeklyWorkouts: state.baseWorkouts,
        adaptationPending: true,
      })),
      
      markAdaptationPending: () => set({ adaptationPending: true }),
      
      // Legacy: define a BASE
      setWeeklyWorkouts: (workouts) => set({
        baseWorkouts: workouts,
        weeklyWorkouts: workouts,
        adaptationPending: workouts.length > 0,
        adaptedWorkouts: [],
      }),
      
      setCurrentView: (view) => set({ currentView: view }),
      setSelectedDay: (day) => set({ selectedDay: day }),
      setSelectedWorkout: (workout) => set({ selectedWorkout: workout }),
      triggerExternalResultsRefresh: () => set((state) => ({ externalResultsRefreshKey: state.externalResultsRefreshKey + 1 })),
      resetConfig: () => set({ coachStyle: null, athleteConfig: null, currentView: 'welcome' }),
      
      resetToDefaults: () => set({
        athleteConfig: null,
        workoutResults: [],
        baseWorkouts: [],
        adaptedWorkouts: [],
        adaptationPending: false,
        lastAdaptationTimestamp: null,
        weeklyWorkouts: [],
        currentView: 'welcome',
        selectedDay: null,
        selectedWorkout: null,
        externalResultsRefreshKey: 0,
        viewingAsAthlete: null,
      }),
      
      resetUserPreferencesOnly: () => set({
        athleteConfig: null,
        adaptationPending: true,
        currentView: 'welcome',
        selectedDay: null,
        selectedWorkout: null,
        viewingAsAthlete: null,
      }),
      
      setViewingAsAthlete: (athlete) => set({ viewingAsAthlete: athlete }),
      clearViewingAsAthlete: () => set({ viewingAsAthlete: null }),
    }),
    {
      name: 'outlier-storage',
      // Persistir configurações e treinos base
      partialize: (state) => ({
        coachStyle: state.coachStyle,
        athleteConfig: state.athleteConfig,
        workoutResults: state.workoutResults,
        baseWorkouts: state.baseWorkouts,
        // Não persistir adaptedWorkouts - recalcular sempre
      }),
      // Run migration when store is rehydrated from storage
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Migrar workouts se necessário
          if (state.baseWorkouts && state.baseWorkouts.length > 0) {
            const migrated = migrateWorkouts(state.baseWorkouts);
            if (migrated) {
              state.baseWorkouts = migrated;
              state.weeklyWorkouts = migrated;
              console.log('[outlierStore] Benchmarks migrated with paramsVersionUsed');
            }
          }
          // Marcar como hidratado APÓS migração
          state.hasHydrated = true;
          console.log('[outlierStore] Hydration complete');
        }
      },
    }
  )
);
