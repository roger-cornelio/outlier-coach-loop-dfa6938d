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
      athlete_races: {
        Row: {
          categoria: string
          created_at: string
          id: string
          nome: string
          participation_type: string
          partner_name: string | null
          race_date: string
          race_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          id?: string
          nome: string
          participation_type?: string
          partner_name?: string | null
          race_date: string
          race_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          nome?: string
          participation_type?: string
          partner_name?: string | null
          race_date?: string
          race_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      benchmark_deltas: {
        Row: {
          bbj_delta: number
          created_at: string
          delta_key: string
          delta_type: string
          farmers_delta: number
          id: string
          is_active: boolean
          row_delta: number
          roxzone_delta: number
          run_avg_delta: number
          sandbag_delta: number
          ski_delta: number
          sled_pull_delta: number
          sled_push_delta: number
          updated_at: string
          updated_by: string | null
          version: string
          wallballs_delta: number
        }
        Insert: {
          bbj_delta?: number
          created_at?: string
          delta_key: string
          delta_type: string
          farmers_delta?: number
          id?: string
          is_active?: boolean
          row_delta?: number
          roxzone_delta?: number
          run_avg_delta?: number
          sandbag_delta?: number
          ski_delta?: number
          sled_pull_delta?: number
          sled_push_delta?: number
          updated_at?: string
          updated_by?: string | null
          version?: string
          wallballs_delta?: number
        }
        Update: {
          bbj_delta?: number
          created_at?: string
          delta_key?: string
          delta_type?: string
          farmers_delta?: number
          id?: string
          is_active?: boolean
          row_delta?: number
          roxzone_delta?: number
          run_avg_delta?: number
          sandbag_delta?: number
          ski_delta?: number
          sled_pull_delta?: number
          sled_push_delta?: number
          updated_at?: string
          updated_by?: string | null
          version?: string
          wallballs_delta?: number
        }
        Relationships: []
      }
      benchmark_master: {
        Row: {
          bbj_sec: number
          created_at: string
          farmers_sec: number
          gender: string
          id: string
          is_active: boolean
          row_sec: number
          roxzone_sec: number
          run_avg_sec: number
          sandbag_sec: number
          ski_sec: number
          sled_pull_sec: number
          sled_push_sec: number
          tier: string
          updated_at: string
          updated_by: string | null
          version: string
          wallballs_sec: number
        }
        Insert: {
          bbj_sec: number
          created_at?: string
          farmers_sec: number
          gender?: string
          id?: string
          is_active?: boolean
          row_sec: number
          roxzone_sec: number
          run_avg_sec: number
          sandbag_sec: number
          ski_sec: number
          sled_pull_sec: number
          sled_push_sec: number
          tier?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
          wallballs_sec: number
        }
        Update: {
          bbj_sec?: number
          created_at?: string
          farmers_sec?: number
          gender?: string
          id?: string
          is_active?: boolean
          row_sec?: number
          roxzone_sec?: number
          run_avg_sec?: number
          sandbag_sec?: number
          ski_sec?: number
          sled_pull_sec?: number
          sled_push_sec?: number
          tier?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
          wallballs_sec?: number
        }
        Relationships: []
      }
      benchmark_outlier_master: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty_weight: number
          expected_minutes: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty_weight?: number
          expected_minutes?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty_weight?: number
          expected_minutes?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      benchmark_outlier_progress: {
        Row: {
          athlete_id: string
          benchmark_id: string
          best_seconds: number | null
          id: string
          last_seconds: number | null
          level_reached: string
          progress_pct: number
          updated_at: string
        }
        Insert: {
          athlete_id: string
          benchmark_id: string
          best_seconds?: number | null
          id?: string
          last_seconds?: number | null
          level_reached?: string
          progress_pct?: number
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          benchmark_id?: string
          best_seconds?: number | null
          id?: string
          last_seconds?: number | null
          level_reached?: string
          progress_pct?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_outlier_progress_benchmark_id_fkey"
            columns: ["benchmark_id"]
            isOneToOne: false
            referencedRelation: "benchmark_outlier_master"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_outlier_results: {
        Row: {
          athlete_id: string
          benchmark_id: string
          created_at: string
          id: string
          notes: string | null
          result_date: string
          result_seconds: number
          source: string
        }
        Insert: {
          athlete_id: string
          benchmark_id: string
          created_at?: string
          id?: string
          notes?: string | null
          result_date?: string
          result_seconds: number
          source?: string
        }
        Update: {
          athlete_id?: string
          benchmark_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          result_date?: string
          result_seconds?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_outlier_results_benchmark_id_fkey"
            columns: ["benchmark_id"]
            isOneToOne: false
            referencedRelation: "benchmark_outlier_master"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_outlier_targets: {
        Row: {
          age_group: string
          benchmark_id: string
          created_at: string
          division: string
          id: string
          level: string
          sex: string
          target_seconds: number
          updated_at: string
          version: string
        }
        Insert: {
          age_group?: string
          benchmark_id: string
          created_at?: string
          division?: string
          id?: string
          level?: string
          sex?: string
          target_seconds: number
          updated_at?: string
          version?: string
        }
        Update: {
          age_group?: string
          benchmark_id?: string
          created_at?: string
          division?: string
          id?: string
          level?: string
          sex?: string
          target_seconds?: number
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_outlier_targets_benchmark_id_fkey"
            columns: ["benchmark_id"]
            isOneToOne: false
            referencedRelation: "benchmark_outlier_master"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_overrides: {
        Row: {
          age_group: string
          created_at: string
          gender: string
          id: string
          is_active: boolean
          metric: string
          override_sec: number
          tier: string
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          age_group: string
          created_at?: string
          gender: string
          id?: string
          is_active?: boolean
          metric: string
          override_sec: number
          tier: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Update: {
          age_group?: string
          created_at?: string
          gender?: string
          id?: string
          is_active?: boolean
          metric?: string
          override_sec?: number
          tier?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: []
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
          source_index: number | null
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
          source_index?: number | null
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
          source_index?: number | null
          time_in_seconds?: number | null
          user_id?: string
          wallballs_sec?: number | null
          workout_id?: string
        }
        Relationships: []
      }
      benchmarks_elite_pro: {
        Row: {
          age_max: number
          age_min: number
          created_at: string
          elite_pro_seconds: number
          id: string
          is_active: boolean
          sex: string
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          age_max: number
          age_min: number
          created_at?: string
          elite_pro_seconds: number
          id?: string
          is_active?: boolean
          sex: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Update: {
          age_max?: number
          age_min?: number
          created_at?: string
          elite_pro_seconds?: number
          id?: string
          is_active?: boolean
          sex?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
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
      custom_exercises: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          movement_pattern_id: string
          name: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          movement_pattern_id: string
          name: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          movement_pattern_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_exercises_movement_pattern_id_fkey"
            columns: ["movement_pattern_id"]
            isOneToOne: false
            referencedRelation: "movement_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostico_melhoria: {
        Row: {
          atleta_id: string
          created_at: string
          id: string
          improvement_value: number
          metric: string
          movement: string
          percentage: number
          resumo_id: string | null
          top_1: number
          total_improvement: number
          value: number
          your_score: number
        }
        Insert: {
          atleta_id: string
          created_at?: string
          id?: string
          improvement_value?: number
          metric: string
          movement: string
          percentage?: number
          resumo_id?: string | null
          top_1?: number
          total_improvement?: number
          value?: number
          your_score?: number
        }
        Update: {
          atleta_id?: string
          created_at?: string
          id?: string
          improvement_value?: number
          metric?: string
          movement?: string
          percentage?: number
          resumo_id?: string | null
          top_1?: number
          total_improvement?: number
          value?: number
          your_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "diagnostico_melhoria_resumo_id_fkey"
            columns: ["resumo_id"]
            isOneToOne: false
            referencedRelation: "diagnostico_resumo"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostico_resumo: {
        Row: {
          atleta_id: string
          coach_insights: Json | null
          created_at: string
          divisao: string | null
          evento: string | null
          finish_time: string | null
          id: string
          nome_atleta: string | null
          posicao_categoria: string | null
          posicao_geral: string | null
          run_total: string | null
          source_url: string | null
          temporada: string | null
          texto_ia: string | null
          texto_ia_completo: string | null
          workout_total: string | null
        }
        Insert: {
          atleta_id: string
          coach_insights?: Json | null
          created_at?: string
          divisao?: string | null
          evento?: string | null
          finish_time?: string | null
          id?: string
          nome_atleta?: string | null
          posicao_categoria?: string | null
          posicao_geral?: string | null
          run_total?: string | null
          source_url?: string | null
          temporada?: string | null
          texto_ia?: string | null
          texto_ia_completo?: string | null
          workout_total?: string | null
        }
        Update: {
          atleta_id?: string
          coach_insights?: Json | null
          created_at?: string
          divisao?: string | null
          evento?: string | null
          finish_time?: string | null
          id?: string
          nome_atleta?: string | null
          posicao_categoria?: string | null
          posicao_geral?: string | null
          run_total?: string | null
          source_url?: string | null
          temporada?: string | null
          texto_ia?: string | null
          texto_ia_completo?: string | null
          workout_total?: string | null
        }
        Relationships: []
      }
      discovered_events: {
        Row: {
          admin_notes: string | null
          categoria_hyrox: string | null
          cidade: string | null
          created_at: string
          created_by: string | null
          data_evento: string | null
          duplicata_de: string | null
          estado: string | null
          grau_confianca: number
          id: string
          nome: string
          organizador: string | null
          origem_principal: string | null
          pais: string | null
          possivel_duplicata: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string | null
          status_validacao: string
          tipo_evento: string
          updated_at: string
          url_inscricao: string | null
          url_origem: string | null
          url_resultado: string | null
          venue: string | null
        }
        Insert: {
          admin_notes?: string | null
          categoria_hyrox?: string | null
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          data_evento?: string | null
          duplicata_de?: string | null
          estado?: string | null
          grau_confianca?: number
          id?: string
          nome: string
          organizador?: string | null
          origem_principal?: string | null
          pais?: string | null
          possivel_duplicata?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string | null
          status_validacao?: string
          tipo_evento?: string
          updated_at?: string
          url_inscricao?: string | null
          url_origem?: string | null
          url_resultado?: string | null
          venue?: string | null
        }
        Update: {
          admin_notes?: string | null
          categoria_hyrox?: string | null
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          data_evento?: string | null
          duplicata_de?: string | null
          estado?: string | null
          grau_confianca?: number
          id?: string
          nome?: string
          organizador?: string | null
          origem_principal?: string | null
          pais?: string | null
          possivel_duplicata?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string | null
          status_validacao?: string
          tipo_evento?: string
          updated_at?: string
          url_inscricao?: string | null
          url_origem?: string | null
          url_resultado?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discovered_events_duplicata_de_fkey"
            columns: ["duplicata_de"]
            isOneToOne: false
            referencedRelation: "discovered_events"
            referencedColumns: ["id"]
          },
        ]
      }
      division_factors: {
        Row: {
          created_at: string
          division: string
          factor: number
          id: string
          is_active: boolean
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          created_at?: string
          division: string
          factor: number
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Update: {
          created_at?: string
          division?: string
          factor?: number
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: []
      }
      event_discovery_logs: {
        Row: {
          cidade_detectada: string | null
          created_at: string
          data_detectada: string | null
          estado_detectado: string | null
          event_id: string | null
          id: string
          motivo_pendencia: string[] | null
          origem: string | null
          raw_text: string | null
          raw_title: string | null
          raw_url: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          score: number
          termo_busca: string | null
        }
        Insert: {
          cidade_detectada?: string | null
          created_at?: string
          data_detectada?: string | null
          estado_detectado?: string | null
          event_id?: string | null
          id?: string
          motivo_pendencia?: string[] | null
          origem?: string | null
          raw_text?: string | null
          raw_title?: string | null
          raw_url?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          termo_busca?: string | null
        }
        Update: {
          cidade_detectada?: string | null
          created_at?: string
          data_detectada?: string | null
          estado_detectado?: string | null
          event_id?: string | null
          id?: string
          motivo_pendencia?: string[] | null
          origem?: string | null
          raw_text?: string | null
          raw_title?: string | null
          raw_url?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          termo_busca?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_discovery_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "discovered_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_review_queue: {
        Row: {
          admin_notes: string | null
          created_at: string
          discovery_log_id: string | null
          event_id: string | null
          id: string
          motivo: string | null
          resolved_at: string | null
          resolved_by: string | null
          status_fila: string
          sugestoes_busca_json: Json | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          discovery_log_id?: string | null
          event_id?: string | null
          id?: string
          motivo?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status_fila?: string
          sugestoes_busca_json?: Json | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          discovery_log_id?: string | null
          event_id?: string | null
          id?: string
          motivo?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status_fila?: string
          sugestoes_busca_json?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_review_queue_discovery_log_id_fkey"
            columns: ["discovery_log_id"]
            isOneToOne: false
            referencedRelation: "event_discovery_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_review_queue_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "discovered_events"
            referencedColumns: ["id"]
          },
        ]
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
      global_exercises: {
        Row: {
          aliases: string[] | null
          created_at: string
          default_female_weight_kg: number | null
          default_male_weight_kg: number | null
          id: string
          movement_pattern_id: string
          name: string
          slug: string | null
        }
        Insert: {
          aliases?: string[] | null
          created_at?: string
          default_female_weight_kg?: number | null
          default_male_weight_kg?: number | null
          id?: string
          movement_pattern_id: string
          name: string
          slug?: string | null
        }
        Update: {
          aliases?: string[] | null
          created_at?: string
          default_female_weight_kg?: number | null
          default_male_weight_kg?: number | null
          id?: string
          movement_pattern_id?: string
          name?: string
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_exercises_movement_pattern_id_fkey"
            columns: ["movement_pattern_id"]
            isOneToOne: false
            referencedRelation: "movement_patterns"
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
      intensity_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          kcal_multiplier: number
          label: string
          rest_multiplier: number
          rule_key: string
          rule_type: string
          tempo_multiplier: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kcal_multiplier?: number
          label: string
          rest_multiplier?: number
          rule_key: string
          rule_type: string
          tempo_multiplier?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kcal_multiplier?: number
          label?: string
          rest_multiplier?: number
          rule_key?: string
          rule_type?: string
          tempo_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      level_time_thresholds: {
        Row: {
          age_max: number
          age_min: number
          created_at: string
          division: string
          elite_cap_seconds: number
          elite_seconds: number
          id: string
          is_active: boolean
          pro_cap_seconds: number
          sex: string
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          age_max: number
          age_min: number
          created_at?: string
          division: string
          elite_cap_seconds: number
          elite_seconds: number
          id?: string
          is_active?: boolean
          pro_cap_seconds: number
          sex: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Update: {
          age_max?: number
          age_min?: number
          created_at?: string
          division?: string
          elite_cap_seconds?: number
          elite_seconds?: number
          id?: string
          is_active?: boolean
          pro_cap_seconds?: number
          sex?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: []
      }
      movement_patterns: {
        Row: {
          aliases: string[] | null
          created_at: string
          default_distance_meters: number
          default_seconds_per_rep: number | null
          formula_type: Database["public"]["Enums"]["formula_type"]
          friction_coefficient: number | null
          human_efficiency_rate: number
          id: string
          moved_mass_percentage: number
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          aliases?: string[] | null
          created_at?: string
          default_distance_meters?: number
          default_seconds_per_rep?: number | null
          formula_type?: Database["public"]["Enums"]["formula_type"]
          friction_coefficient?: number | null
          human_efficiency_rate?: number
          id?: string
          moved_mass_percentage?: number
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          aliases?: string[] | null
          created_at?: string
          default_distance_meters?: number
          default_seconds_per_rep?: number | null
          formula_type?: Database["public"]["Enums"]["formula_type"]
          friction_coefficient?: number | null
          human_efficiency_rate?: number
          id?: string
          moved_mass_percentage?: number
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      outlier_base_master: {
        Row: {
          base_seconds: number
          created_at: string
          id: string
          station_key: string
          updated_at: string
          version: string
        }
        Insert: {
          base_seconds: number
          created_at?: string
          id?: string
          station_key: string
          updated_at?: string
          version?: string
        }
        Update: {
          base_seconds?: number
          created_at?: string
          id?: string
          station_key?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      outlier_factors: {
        Row: {
          created_at: string
          factor_key: string
          factor_type: string
          factor_value: number
          id: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          factor_key: string
          factor_type: string
          factor_value: number
          id?: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          factor_key?: string
          factor_type?: string
          factor_value?: number
          id?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      outlier_reference_overrides: {
        Row: {
          age_group: string
          created_at: string
          division: string
          id: string
          override_seconds: number
          sex: string
          station_key: string
          tier: string
          updated_at: string
          version: string
        }
        Insert: {
          age_group: string
          created_at?: string
          division: string
          id?: string
          override_seconds: number
          sex: string
          station_key: string
          tier: string
          updated_at?: string
          version?: string
        }
        Update: {
          age_group?: string
          created_at?: string
          division?: string
          id?: string
          override_seconds?: number
          sex?: string
          station_key?: string
          tier?: string
          updated_at?: string
          version?: string
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
      race_results: {
        Row: {
          athlete_id: string
          created_at: string
          hyrox_event: string | null
          hyrox_idp: string
          id: string
          source_url: string
          verified: boolean
        }
        Insert: {
          athlete_id: string
          created_at?: string
          hyrox_event?: string | null
          hyrox_idp: string
          id?: string
          source_url: string
          verified?: boolean
        }
        Update: {
          athlete_id?: string
          created_at?: string
          hyrox_event?: string | null
          hyrox_idp?: string
          id?: string
          source_url?: string
          verified?: boolean
        }
        Relationships: []
      }
      scientific_articles: {
        Row: {
          author_or_source: string | null
          category: string
          created_at: string
          criteria_tags: Json | null
          file_path: string | null
          file_url: string | null
          full_summary: string | null
          id: string
          key_takeaways: string | null
          publication_year: number | null
          target_station: string
          title: string
          updated_at: string
        }
        Insert: {
          author_or_source?: string | null
          category?: string
          created_at?: string
          criteria_tags?: Json | null
          file_path?: string | null
          file_url?: string | null
          full_summary?: string | null
          id?: string
          key_takeaways?: string | null
          publication_year?: number | null
          target_station?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_or_source?: string | null
          category?: string
          created_at?: string
          criteria_tags?: Json | null
          file_path?: string | null
          file_url?: string | null
          full_summary?: string | null
          id?: string
          key_takeaways?: string | null
          publication_year?: number | null
          target_station?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      simulations: {
        Row: {
          athlete_id: string
          coach_insights: string | null
          created_at: string
          division: string
          id: string
          roxzone_time: number
          splits_data: Json
          total_time: number
        }
        Insert: {
          athlete_id: string
          coach_insights?: string | null
          created_at?: string
          division?: string
          id?: string
          roxzone_time?: number
          splits_data?: Json
          total_time?: number
        }
        Update: {
          athlete_id?: string
          coach_insights?: string | null
          created_at?: string
          division?: string
          id?: string
          roxzone_time?: number
          splits_data?: Json
          total_time?: number
        }
        Relationships: []
      }
      station_valence_weights: {
        Row: {
          anaerobica: number
          cardio: number
          core: number
          eficiencia: number
          forca: number
          id: string
          potencia: number
          sort_order: number
          station_key: string
          station_label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          anaerobica?: number
          cardio?: number
          core?: number
          eficiencia?: number
          forca?: number
          id?: string
          potencia?: number
          sort_order?: number
          station_key: string
          station_label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          anaerobica?: number
          cardio?: number
          core?: number
          eficiencia?: number
          forca?: number
          id?: string
          potencia?: number
          sort_order?: number
          station_key?: string
          station_label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      status_config: {
        Row: {
          created_at: string
          downgrade_elite_to_level: string
          elite_recency_days: number
          elite_requires_recency: boolean
          id: number
          progress_model: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          downgrade_elite_to_level?: string
          elite_recency_days?: number
          elite_requires_recency?: boolean
          id?: number
          progress_model?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          downgrade_elite_to_level?: string
          elite_recency_days?: number
          elite_requires_recency?: boolean
          id?: number
          progress_model?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_config_downgrade_elite_to_level_fkey"
            columns: ["downgrade_elite_to_level"]
            isOneToOne: false
            referencedRelation: "status_level_rules"
            referencedColumns: ["level_key"]
          },
        ]
      }
      status_jump_rules: {
        Row: {
          created_at: string
          is_enabled: boolean
          jump_key: string
          race_category: string
          rank_scope: string
          rank_top_n: number
          target_level: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_enabled?: boolean
          jump_key: string
          race_category: string
          rank_scope?: string
          rank_top_n: number
          target_level: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_enabled?: boolean
          jump_key?: string
          race_category?: string
          rank_scope?: string
          rank_top_n?: number
          target_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_jump_rules_target_level_fkey"
            columns: ["target_level"]
            isOneToOne: false
            referencedRelation: "status_level_rules"
            referencedColumns: ["level_key"]
          },
        ]
      }
      status_level_rules: {
        Row: {
          benchmarks_required: number
          benchmarks_source: string
          cap_without_official_race_percent: number
          created_at: string
          label: string
          level_key: string
          level_order: number
          official_race_required: boolean
          training_min_sessions: number
          training_window_days: number
          updated_at: string
        }
        Insert: {
          benchmarks_required?: number
          benchmarks_source?: string
          cap_without_official_race_percent?: number
          created_at?: string
          label: string
          level_key: string
          level_order: number
          official_race_required?: boolean
          training_min_sessions?: number
          training_window_days?: number
          updated_at?: string
        }
        Update: {
          benchmarks_required?: number
          benchmarks_source?: string
          cap_without_official_race_percent?: number
          created_at?: string
          label?: string
          level_key?: string
          level_order?: number
          official_race_required?: boolean
          training_min_sessions?: number
          training_window_days?: number
          updated_at?: string
        }
        Relationships: []
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
      tempos_splits: {
        Row: {
          atleta_id: string
          created_at: string
          id: string
          resumo_id: string | null
          split_name: string
          time: string
        }
        Insert: {
          atleta_id: string
          created_at?: string
          id?: string
          resumo_id?: string | null
          split_name: string
          time: string
        }
        Update: {
          atleta_id?: string
          created_at?: string
          id?: string
          resumo_id?: string | null
          split_name?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "tempos_splits_resumo_id_fkey"
            columns: ["resumo_id"]
            isOneToOne: false
            referencedRelation: "diagnostico_resumo"
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
      coach_athlete_overview: {
        Row: {
          account_status: string | null
          altura: number | null
          athlete_email: string | null
          athlete_id: string | null
          athlete_name: string | null
          coach_id: string | null
          days_inactive: number | null
          has_plan_this_week: number | null
          last_active_at: string | null
          peso: number | null
          sexo: string | null
          total_benchmarks: number | null
          training_level: string | null
          workouts_last_7_days: number | null
        }
        Relationships: []
      }
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
      get_benchmark_reference: {
        Args: {
          p_age_group: string
          p_gender: string
          p_metric: string
          p_tier: string
          p_version?: string
        }
        Returns: {
          ref_sec: number
          ref_source: string
        }[]
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
      get_coach_overview: {
        Args: { _coach_id: string }
        Returns: {
          account_status: string
          altura: number
          athlete_email: string
          athlete_id: string
          athlete_name: string
          coach_id: string
          days_inactive: number
          has_plan_this_week: number
          last_active_at: string
          peso: number
          sexo: string
          total_benchmarks: number
          training_level: string
          workouts_last_7_days: number
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
      search_public_athletes: {
        Args: { search_term: string }
        Returns: {
          id: string
          name: string
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
      formula_type: "vertical_work" | "horizontal_friction" | "metabolic"
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
      formula_type: ["vertical_work", "horizontal_friction", "metabolic"],
      workout_status: ["draft", "published", "archived"],
    },
  },
} as const
