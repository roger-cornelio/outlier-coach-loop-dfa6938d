export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_allowlist: {
        Row: {
          created_at: string | null
          created_by: string
          email: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          email: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          email?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      athlete_plans: {
        Row: {
          athlete_user_id: string
          coach_id: string
          created_at: string
          id: string
          plan_json: Json
          published_at: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string
          title: string | null
          updated_at: string
          week_start: string
        }
        Insert: {
          athlete_user_id: string
          coach_id: string
          created_at?: string
          id?: string
          plan_json?: Json
          published_at?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          week_start: string
        }
        Update: {
          athlete_user_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          plan_json?: Json
          published_at?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_plans_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_results: {
        Row: {
          athlete_level: string | null
          bbj_sec: number | null
          benchmark_id: string | null
          block_id: string
          bucket: string | null
          completed: boolean
          created_at: string
          event_date: string | null
          event_name: string | null
          farmers_sec: number | null
          id: string
          race_category: string | null
          result_type: string | null
          row_sec: number | null
          roxzone_sec: number | null
          run_avg_sec: number | null
          sandbag_sec: number | null
          score: number | null
          screenshot_url: string | null
          ski_sec: number | null
          sled_pull_sec: number | null
          sled_push_sec: number | null
          time_in_seconds: number | null
          user_id: string
          wallballs_sec: number | null
          workout_id: string
        }
        Insert: {
          athlete_level?: string | null
          bbj_sec?: number | null
          benchmark_id?: string | null
          block_id: string
          bucket?: string | null
          completed?: boolean
          created_at?: string
          event_date?: string | null
          event_name?: string | null
          farmers_sec?: number | null
          id?: string
          race_category?: string | null
          result_type?: string | null
          row_sec?: number | null
          roxzone_sec?: number | null
          run_avg_sec?: number | null
          sandbag_sec?: number | null
          score?: number | null
          screenshot_url?: string | null
          ski_sec?: number | null
          sled_pull_sec?: number | null
          sled_push_sec?: number | null
          time_in_seconds?: number | null
          user_id: string
          wallballs_sec?: number | null
          workout_id: string
        }
        Update: {
          athlete_level?: string | null
          bbj_sec?: number | null
          benchmark_id?: string | null
          block_id?: string
          bucket?: string | null
          completed?: boolean
          created_at?: string
          event_date?: string | null
          event_name?: string | null
          farmers_sec?: number | null
          id?: string
          race_category?: string | null
          result_type?: string | null
          row_sec?: number | null
          roxzone_sec?: number | null
          run_avg_sec?: number | null
          sandbag_sec?: number | null
          score?: number | null
          screenshot_url?: string | null
          ski_sec?: number | null
          sled_pull_sec?: number | null
          sled_push_sec?: number | null
          time_in_seconds?: number | null
          user_id?: string
          wallballs_sec?: number | null
          workout_id?: string
        }
        Relationships: []
      }
      coach_applications: {
        Row: {
          auth_user_id: string | null
          box_name: string | null
          city: string | null
          created_at: string | null
          email: string | null
          email_normalized: string | null
          full_name: string | null
          id: string
          instagram: string | null
          message: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auth_user_id?: string | null
          box_name?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          email_normalized?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          message?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auth_user_id?: string | null
          box_name?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          email_normalized?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          message?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_athletes: {
        Row: {
          athlete_id: string
          coach_id: string
          created_at: string
          id: string
        }
        Insert: {
          athlete_id: string
          coach_id: string
          created_at?: string
          id?: string
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          event_name: string
          id: string
          properties: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_name: string
          id?: string
          properties?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_name?: string
          id?: string
          properties?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hyrox_metric_scores: {
        Row: {
          created_at: string
          data_source: string
          hyrox_result_id: string
          id: string
          metric: string
          percentile_set_id_used: string
          percentile_value: number
          raw_time_sec: number
        }
        Insert: {
          created_at?: string
          data_source?: string
          hyrox_result_id: string
          id?: string
          metric: string
          percentile_set_id_used?: string
          percentile_value: number
          raw_time_sec: number
        }
        Update: {
          created_at?: string
          data_source?: string
          hyrox_result_id?: string
          id?: string
          metric?: string
          percentile_set_id_used?: string
          percentile_value?: number
          raw_time_sec?: number
        }
        Relationships: []
      }
      percentile_bands: {
        Row: {
          division: string
          gender: string
          id: string
          is_active: boolean
          metric: string
          p10_sec: number
          p25_sec: number
          p50_sec: number
          p75_sec: number
          p90_sec: number
          percentile_set_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          division: string
          gender: string
          id?: string
          is_active?: boolean
          metric: string
          p10_sec: number
          p25_sec: number
          p50_sec: number
          p75_sec: number
          p90_sec: number
          percentile_set_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          division?: string
          gender?: string
          id?: string
          is_active?: boolean
          metric?: string
          p10_sec?: number
          p25_sec?: number
          p50_sec?: number
          p75_sec?: number
          p90_sec?: number
          percentile_set_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      performance_level_benchmarks: {
        Row: {
          avg_sec: number
          benchmark_set_id: string
          division: string
          gender: string
          id: string
          is_active: boolean
          level: string
          metric: string
          p25_sec: number | null
          p75_sec: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avg_sec: number
          benchmark_set_id?: string
          division: string
          gender: string
          id?: string
          is_active?: boolean
          level: string
          metric: string
          p25_sec?: number | null
          p75_sec?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avg_sec?: number
          benchmark_set_id?: string
          division?: string
          gender?: string
          id?: string
          is_active?: boolean
          level?: string
          metric?: string
          p25_sec?: number | null
          p75_sec?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          altura: number | null
          coach_id: string | null
          coach_style: string | null
          created_at: string
          email: string
          equipment_notes: string | null
          first_setup_completed: boolean
          id: string
          idade: number | null
          last_active_at: string | null
          name: string | null
          peso: number | null
          session_duration: string | null
          sexo: string | null
          status: string
          suspended_at: string | null
          suspended_by: string | null
          training_level: string | null
          unavailable_equipment: Json | null
          user_id: string
        }
        Insert: {
          altura?: number | null
          coach_id?: string | null
          coach_style?: string | null
          created_at?: string
          email: string
          equipment_notes?: string | null
          first_setup_completed?: boolean
          id?: string
          idade?: number | null
          last_active_at?: string | null
          name?: string | null
          peso?: number | null
          session_duration?: string | null
          sexo?: string | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          training_level?: string | null
          unavailable_equipment?: Json | null
          user_id: string
        }
        Update: {
          altura?: number | null
          coach_id?: string | null
          coach_style?: string | null
          created_at?: string
          email?: string
          equipment_notes?: string | null
          first_setup_completed?: boolean
          id?: string
          idade?: number | null
          last_active_at?: string | null
          name?: string | null
          peso?: number | null
          session_duration?: string | null
          sexo?: string | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          training_level?: string | null
          unavailable_equipment?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_params: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          price: number
          status: Database["public"]["Enums"]["workout_status"]
          title: string
          updated_at: string
          week_start: string | null
          workout_json: Json
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          price?: number
          status?: Database["public"]["Enums"]["workout_status"]
          title: string
          updated_at?: string
          week_start?: string | null
          workout_json?: Json
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          price?: number
          status?: Database["public"]["Enums"]["workout_status"]
          title?: string
          updated_at?: string
          week_start?: string | null
          workout_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workouts_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_admin_allowlist: { Args: { _email: string }; Returns: boolean }
      approve_coach_application: {
        Args: { _admin_id: string; _application_id: string }
        Returns: boolean
      }
      can_view_athlete_data: {
        Args: { _athlete_id: string; _viewer_id: string }
        Returns: boolean
      }
      coach_find_athlete_by_email: { Args: { _email: string }; Returns: Json }
      ensure_superadmin_role: {
        Args: { _email: string; _user_id: string }
        Returns: boolean
      }
      get_coach_approval_by_email: {
        Args: { _email: string }
        Returns: {
          app_exists: boolean
          application_id: string
          approved: boolean
          created_at: string
          has_password: boolean
          status: string
        }[]
      }
      get_profile_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coach_or_admin: { Args: { _user_id: string }; Returns: boolean }
      owns_benchmark_result: {
        Args: { _benchmark_result_id: string }
        Returns: boolean
      }
      reject_coach_application: {
        Args: { _admin_id: string; _application_id: string; _reason?: string }
        Returns: boolean
      }
      revoke_admin_allowlist: { Args: { _email: string }; Returns: boolean }
      search_athlete_by_email: {
        Args: { _email: string }
        Returns: {
          coach_id: string
          email: string
          is_athlete: boolean
          is_coach_or_admin: boolean
          name: string
          profile_id: string
          profile_was_created: boolean
          user_id: string
        }[]
      }
      submit_coach_application: {
        Args: { _contact: string; _email: string; _full_name: string }
        Returns: {
          application_id: string
          approved: boolean
          created: boolean
          created_at: string
          status: string
        }[]
      }
      sync_admin_role_from_allowlist: {
        Args: { _email: string; _user_id: string }
        Returns: string
      }
      sync_coach_role_on_login: {
        Args: { _email: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "coach" | "superadmin"
      workout_status: "draft" | "published" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "coach", "superadmin"],
      workout_status: ["draft", "published", "archived"],
    },
  },
} as const
