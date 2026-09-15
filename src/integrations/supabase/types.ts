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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_shares: {
        Row: {
          audit_id: string
          created_at: string
          expires_at: string | null
          id: string
          passcode: string
          recipient_email: string
          recipient_name: string
          revoked: boolean
          token: string
          updated_at: string
        }
        Insert: {
          audit_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          passcode: string
          recipient_email?: string
          recipient_name?: string
          revoked?: boolean
          token: string
          updated_at?: string
        }
        Update: {
          audit_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          passcode?: string
          recipient_email?: string
          recipient_name?: string
          revoked?: boolean
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_shares_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          auditor: string
          captured_at: string | null
          client: string
          created_at: string
          executive_summary: string
          findings: Json
          headcount: number
          id: string
          industry: string
          latitude: number | null
          location_label: string
          longitude: number | null
          maturity: Json
          opportunities: Json
          photos: Json
          profile_id: string | null
          recommendations: Json
          reference: string
          scope: string
          site: string
          status: string
          updated_at: string
          walkthrough_date: string
        }
        Insert: {
          auditor?: string
          captured_at?: string | null
          client?: string
          created_at?: string
          executive_summary?: string
          findings?: Json
          headcount?: number
          id: string
          industry?: string
          latitude?: number | null
          location_label?: string
          longitude?: number | null
          maturity?: Json
          opportunities?: Json
          photos?: Json
          profile_id?: string | null
          recommendations?: Json
          reference?: string
          scope?: string
          site?: string
          status?: string
          updated_at?: string
          walkthrough_date?: string
        }
        Update: {
          auditor?: string
          captured_at?: string | null
          client?: string
          created_at?: string
          executive_summary?: string
          findings?: Json
          headcount?: number
          id?: string
          industry?: string
          latitude?: number | null
          location_label?: string
          longitude?: number | null
          maturity?: Json
          opportunities?: Json
          photos?: Json
          profile_id?: string | null
          recommendations?: Json
          reference?: string
          scope?: string
          site?: string
          status?: string
          updated_at?: string
          walkthrough_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          audit_id: string
          created_at: string
          id: string
          outcome: string
          outcome_note: string
          reason: string
          share_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          audit_id: string
          created_at?: string
          id?: string
          outcome?: string
          outcome_note?: string
          reason?: string
          share_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          audit_id?: string
          created_at?: string
          id?: string
          outcome?: string
          outcome_note?: string
          reason?: string
          share_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "audit_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          role: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          role?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      report_views: {
        Row: {
          audit_id: string
          created_at: string
          event: string
          id: string
          referrer: string
          share_id: string | null
          user_agent: string
        }
        Insert: {
          audit_id: string
          created_at?: string
          event?: string
          id?: string
          referrer?: string
          share_id?: string | null
          user_agent?: string
        }
        Update: {
          audit_id?: string
          created_at?: string
          event?: string
          id?: string
          referrer?: string
          share_id?: string | null
          user_agent?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_views_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "audit_shares"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
