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
          benchmark_id: string | null
          block_id: string
          bucket: string | null
          completed: boolean
          created_at: string
          event_date: string | null
          event_name: string | null
          id: string
          race_category: string | null
          result_type: string | null
          score: number | null
          screenshot_url: string | null
          time_in_seconds: number | null
          user_id: string
          workout_id: string
        }
        Insert: {
          athlete_level?: string | null
          benchmark_id?: string | null
          block_id: string
          bucket?: string | null
          completed?: boolean
          created_at?: string
          event_date?: string | null
          event_name?: string | null
          id?: string
          race_category?: string | null
          result_type?: string | null
          score?: number | null
          screenshot_url?: string | null
          time_in_seconds?: number | null
          user_id: string
          workout_id: string
        }
        Update: {
          athlete_level?: string | null
          benchmark_id?: string | null
          block_id?: string
          bucket?: string | null
          completed?: boolean
          created_at?: string
          event_date?: string | null
          event_name?: string | null
          id?: string
          race_category?: string | null
          result_type?: string | null
          score?: number | null
          screenshot_url?: string | null
          time_in_seconds?: number | null
          user_id?: string
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
      profiles: {
        Row: {
          coach_id: string | null
          coach_style: string | null
          created_at: string
          email: string
          first_setup_completed: boolean
          id: string
          last_active_at: string | null
          name: string | null
          user_id: string
        }
        Insert: {
          coach_id?: string | null
          coach_style?: string | null
          created_at?: string
          email: string
          first_setup_completed?: boolean
          id?: string
          last_active_at?: string | null
          name?: string | null
          user_id: string
        }
        Update: {
          coach_id?: string | null
          coach_style?: string | null
          created_at?: string
          email?: string
          first_setup_completed?: boolean
          id?: string
          last_active_at?: string | null
          name?: string | null
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
