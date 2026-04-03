export interface UnifiedUser {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  sexo: string | null;
  idade: number | null;
  peso: number | null;
  altura: number | null;
  training_level: string | null;
  session_duration: string | null;
  first_setup_completed: boolean | null;
  status: string | null;
  created_at: string;
  last_active_at: string | null;
  coach_id: string | null;
  coach_name: string | null;
  coach_email: string | null;
  coach_linked_at: string | null;
  onboarding_experience: string | null;
  onboarding_goal: string | null;
  onboarding_target_race: string | null;
  unavailable_equipment: any;
  equipment_notes: string | null;
  telefone: string | null;
  coach_style: string | null;
  // Computed
  computedStatus: UserStatus;
  leadScore: LeadScore;
}

export type UserStatus = "ativo" | "inativo" | "vinculado" | "sem_coach" | "suspenso" | "so_diagnostico";

export type LeadScore = "hot" | "warm" | "cold";

export type StatusFilter = "todos" | UserStatus;

export interface DiagnosticLeadRow {
  id: string;
  user_id: string;
  athlete_name_searched: string;
  event_name: string | null;
  division: string | null;
  result_url: string | null;
  converted: boolean;
  created_at: string;
  profile_name: string | null;
  profile_email: string | null;
}

export interface AthleteDetail {
  profile: UnifiedUser;
  sessionCount: number;
  benchmarkCount: number;
  raceCount: number;
  diagnosticLeads: { athlete_name_searched: string; event_name: string | null; created_at: string }[];
  weeksSinceSignup: number;
  avgSessionsPerWeek: number;
  platformDuration: string;
  targetRace: { nome: string; race_date: string; categoria: string; race_type: string } | null;
}
