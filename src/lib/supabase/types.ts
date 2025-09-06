export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          plan_type: 'registered' | 'premium'
          generations_used_today: number
          last_generation_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          plan_type?: 'registered' | 'premium'
          generations_used_today?: number
          last_generation_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          plan_type?: 'registered' | 'premium'
          generations_used_today?: number
          last_generation_date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          id: string
          user_id: string | null
          form_type: string
          character_name: string
          character_description: string
          prediction_text: string
          question: string
          user_name: string
          birth_month: string | null
          birth_year: string | null
          image_url: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          form_type?: string
          character_name: string
          character_description: string
          prediction_text: string
          question: string
          user_name: string
          birth_month?: string | null
          birth_year?: string | null
          image_url?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          form_type?: string
          character_name?: string
          character_description?: string
          prediction_text?: string
          question?: string
          user_name?: string
          birth_month?: string | null
          birth_year?: string | null
          image_url?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      image_assets: {
        Row: {
          id: string
          image_url: string
          character_name: string
          character_description: string
          question_theme: string | null
          form_type: string
          metadata: Json
          usage_count: number
          last_used_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          image_url: string
          character_name: string
          character_description: string
          question_theme?: string | null
          form_type?: string
          metadata?: Json
          usage_count?: number
          last_used_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          image_url?: string
          character_name?: string
          character_description?: string
          question_theme?: string | null
          form_type?: string
          metadata?: Json
          usage_count?: number
          last_used_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      prediction_results: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string | null
          client_ip: string | null
          form_type: string
          user_name: string
          question: string
          birth_month: string
          birth_year: string
          character_name: string
          character_description: string
          prediction_text: string
          image_variants: Json | null
          question_theme: string
          generation_source: string
          usage_count: number
          last_used_at: string | null
          is_active: boolean
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string | null
          client_ip?: string | null
          form_type?: string
          user_name: string
          question: string
          birth_month: string
          birth_year: string
          character_name: string
          character_description: string
          prediction_text: string
          image_variants?: Json | null
          question_theme?: string
          generation_source?: string
          usage_count?: number
          last_used_at?: string | null
          is_active?: boolean
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string | null
          client_ip?: string | null
          form_type?: string
          user_name?: string
          question?: string
          birth_month?: string
          birth_year?: string
          character_name?: string
          character_description?: string
          prediction_text?: string
          image_variants?: Json | null
          question_theme?: string
          generation_source?: string
          usage_count?: number
          last_used_at?: string | null
          is_active?: boolean
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "prediction_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          id: string
          ip_address: string
          generations_used: number
          date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ip_address: string
          generations_used?: number
          date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ip_address?: string
          generations_used?: number
          date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reset_daily_usage: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      increment_user_usage: {
        Args: {
          user_id: string
          current_date: string
        }
        Returns: undefined
      }
      increment_ip_usage: {
        Args: {
          client_ip: string
          current_date: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type User = Database['public']['Tables']['users']['Row']
export type Prediction = Database['public']['Tables']['predictions']['Row']
export type ImageAsset = Database['public']['Tables']['image_assets']['Row']
export type PredictionResult = Database['public']['Tables']['prediction_results']['Row']
export type UsageTracking = Database['public']['Tables']['usage_tracking']['Row']

export type UserInsert = Database['public']['Tables']['users']['Insert']
export type PredictionInsert = Database['public']['Tables']['predictions']['Insert']
export type ImageAssetInsert = Database['public']['Tables']['image_assets']['Insert']
export type PredictionResultInsert = Database['public']['Tables']['prediction_results']['Insert']
export type UsageTrackingInsert = Database['public']['Tables']['usage_tracking']['Insert']

// Image variant types
export interface ImageVariant {
  url: string;
  width: number;
  height: number;
  quality: number;
  size_bytes: number;
}

export interface ImageVariants {
  small: ImageVariant;
  medium: ImageVariant;
  large: ImageVariant;
}