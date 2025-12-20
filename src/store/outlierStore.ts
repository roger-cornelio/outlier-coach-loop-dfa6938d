import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AthleteConfig, CoachStyle, WorkoutResult, DayWorkout } from '@/types/outlier';
import { migrateWorkouts } from '@/utils/benchmarkMigration';

// ============================================
// SEPARAÇÃO DE FONTES DE VERDADE
// ============================================
// baseWorkouts: planilha original do coach (IMUTÁVEL)
// adaptedWorkouts: treino gerado para o atleta (MUTÁVEL)
// ============================================

interface ViewingAsAthlete {
  id: string;
  email: string;
  name: string | null;
}

interface OutlierState {
  coachStyle: CoachStyle | null;
  athleteConfig: AthleteConfig | null;
  workoutResults: WorkoutResult[];
  
  // PLANILHA BASE (imutável - definida pelo coach)
  baseWorkouts: DayWorkout[];
  
  // TREINO ADAPTADO (mutável - gerado para o atleta)
  adaptedWorkouts: DayWorkout[];
  
  // Flag para indicar se adaptação está pendente
  adaptationPending: boolean;
  
  // Timestamp da última adaptação (para invalidar quando config muda)
  lastAdaptationTimestamp: number | null;
  
  // Legacy: mantido para compatibilidade (aponta para adaptedWorkouts ou baseWorkouts)
  weeklyWorkouts: DayWorkout[];
  
  currentView: 'welcome' | 'athleteWelcome' | 'config' | 'dashboard' | 'preWorkout' | 'workout' | 'result' | 'feedback' | 'admin' | 'users' | 'userManagement' | 'benchmarks' | 'params' | 'coachPerformance' | 'coachApplication' | 'coachApplicationsAdmin';
  selectedDay: string | null;
  selectedWorkout: DayWorkout | null;
  externalResultsRefreshKey: number;
  
  // Admin: Visualizar como atleta específico
  viewingAsAthlete: ViewingAsAthlete | null;
  
  // Actions
  setCoachStyle: (style: CoachStyle) => void;
  setAthleteConfig: (config: AthleteConfig) => void;
  addWorkoutResult: (result: WorkoutResult) => void;
  
  // Base workouts (coach)
  setBaseWorkouts: (workouts: DayWorkout[]) => void;
  
  // Adapted workouts (athlete)
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
  resetToDefaults: () => void; // Reset completo para novo usuário
  resetUserPreferencesOnly: () => void; // Reset apenas configs, mantém treinos do banco
  
  // Admin: Visualizar como atleta
  setViewingAsAthlete: (athlete: ViewingAsAthlete | null) => void;
  clearViewingAsAthlete: () => void;
}

export const useOutlierStore = create<OutlierState>()(
  persist(
    (set, get) => ({
      coachStyle: null,
      athleteConfig: null,
      workoutResults: [],
      baseWorkouts: [],
      adaptedWorkouts: [],
      adaptationPending: false,
      lastAdaptationTimestamp: null,
      weeklyWorkouts: [], // Legacy: aponta para adaptedWorkouts quando existir
      currentView: 'welcome',
      selectedDay: null,
      selectedWorkout: null,
      externalResultsRefreshKey: 0,
      viewingAsAthlete: null,

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
          // Marcar adaptação como pendente se config mudou
          adaptationPending: configChanged ? true : get().adaptationPending,
        });
      },
      
      addWorkoutResult: (result) =>
        set((state) => ({ workoutResults: [...state.workoutResults, result] })),
      
      // PLANILHA BASE (coach) - também atualiza weeklyWorkouts para legacy
      setBaseWorkouts: (workouts) => set({ 
        baseWorkouts: workouts,
        weeklyWorkouts: workouts, // Legacy fallback
        adaptationPending: true, // Nova base = precisa readaptar
        adaptedWorkouts: [], // Limpa adaptações antigas
      }),
      
      // TREINO ADAPTADO (atleta)
      setAdaptedWorkouts: (workouts) => set({ 
        adaptedWorkouts: workouts,
        weeklyWorkouts: workouts, // Agora weeklyWorkouts aponta para adaptado
        adaptationPending: false,
        lastAdaptationTimestamp: Date.now(),
      }),
      
      clearAdaptedWorkouts: () => set((state) => ({ 
        adaptedWorkouts: [],
        weeklyWorkouts: state.baseWorkouts, // Volta para base
        adaptationPending: true,
      })),
      
      markAdaptationPending: () => set({ adaptationPending: true }),
      
      // Legacy: agora setWeeklyWorkouts define a BASE (para compatibilidade com AdminSpreadsheet)
      setWeeklyWorkouts: (workouts) => set({ 
        baseWorkouts: workouts,
        weeklyWorkouts: workouts,
        adaptationPending: true,
        adaptedWorkouts: [],
      }),
      
      setCurrentView: (view) => set({ currentView: view }),
      setSelectedDay: (day) => set({ selectedDay: day }),
      setSelectedWorkout: (workout) => set({ selectedWorkout: workout }),
      triggerExternalResultsRefresh: () => set((state) => ({ externalResultsRefreshKey: state.externalResultsRefreshKey + 1 })),
      resetConfig: () => set({ coachStyle: null, athleteConfig: null, currentView: 'welcome' }),
      
      // Reset completo para novo usuário - zera TUDO para defaults
      // ATENÇÃO: Este reset é para LOGOUT ou troca de usuário
      // NÃO afeta treinos do banco (esses são carregados via useCoachWorkouts)
      // NÃO reseta coachStyle - ele é persistido no banco e carregado do perfil
      resetToDefaults: () => set({
        // coachStyle NÃO é resetado - será carregado do perfil no próximo login
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
      
      // Reset APENAS preferências do usuário - preserva treinos carregados do banco
      // Usado quando há treinos do banco disponíveis e não queremos sobrescrevê-los
      // NÃO reseta coachStyle - ele é persistido no banco
      resetUserPreferencesOnly: () => set({
        // Limpa apenas configurações pessoais (NÃO coachStyle)
        athleteConfig: null,
        // NÃO limpa treinos - baseWorkouts, adaptedWorkouts, weeklyWorkouts permanecem
        adaptationPending: true, // Marca para readaptar com nova config
        // Limpa estado de navegação
        currentView: 'welcome',
        selectedDay: null,
        selectedWorkout: null,
        viewingAsAthlete: null,
        // Mantém workoutResults e externalResultsRefreshKey
      }),
      
      // Admin: Visualizar como atleta
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
        if (state && state.baseWorkouts && state.baseWorkouts.length > 0) {
          const migrated = migrateWorkouts(state.baseWorkouts);
          if (migrated) {
            // Update store with migrated workouts
            state.baseWorkouts = migrated;
            state.weeklyWorkouts = migrated;
            console.log('[outlierStore] Benchmarks migrated with paramsVersionUsed');
          }
        }
      },
    }
  )
);
