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
      checkins: {
        Row: {
          car_plate: string | null
          created_at: string
          driver_name: string | null
          id: string
          operator_name: string | null
          packages_count: number
          packages_notes: string | null
          real_departure: string
          sent_to_whatsapp: boolean
          trip_id: string
        }
        Insert: {
          car_plate?: string | null
          created_at?: string
          driver_name?: string | null
          id?: string
          operator_name?: string | null
          packages_count?: number
          packages_notes?: string | null
          real_departure?: string
          sent_to_whatsapp?: boolean
          trip_id: string
        }
        Update: {
          car_plate?: string | null
          created_at?: string
          driver_name?: string | null
          id?: string
          operator_name?: string | null
          packages_count?: number
          packages_notes?: string | null
          real_departure?: string
          sent_to_whatsapp?: boolean
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_goals: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          period_month: string
          seller_id: string | null
          target_amount: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          period_month: string
          seller_id?: string | null
          target_amount: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          period_month?: string
          seller_id?: string | null
          target_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "partner_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_goals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_companies: {
        Row: {
          active: boolean
          color: string
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number
          commission_amount: number
          company_id: string | null
          created_at: string
          id: string
          sale_date: string
          seller_id: string | null
          trip_id: string | null
        }
        Insert: {
          amount: number
          commission_amount?: number
          company_id?: string | null
          created_at?: string
          id?: string
          sale_date?: string
          seller_id?: string | null
          trip_id?: string | null
        }
        Update: {
          amount?: number
          commission_amount?: number
          company_id?: string | null
          created_at?: string
          id?: string
          sale_date?: string
          seller_id?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "partner_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          active: boolean
          commission_rate: number
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          commission_rate?: number
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          commission_rate?: number
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sellers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "partner_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_alerts: {
        Row: {
          created_at: string
          id: string
          message: string
          resolved: boolean
          resolved_at: string | null
          severity: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_alerts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          car_plate: string | null
          code: string
          company_id: string | null
          created_at: string
          destination: string
          driver_name: string | null
          id: string
          notes: string | null
          origin: string
          real_departure: string | null
          scheduled_departure: string
          status: Database["public"]["Enums"]["trip_status"]
          updated_at: string
        }
        Insert: {
          car_plate?: string | null
          code: string
          company_id?: string | null
          created_at?: string
          destination: string
          driver_name?: string | null
          id?: string
          notes?: string | null
          origin: string
          real_departure?: string | null
          scheduled_departure: string
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
        }
        Update: {
          car_plate?: string | null
          code?: string
          company_id?: string | null
          created_at?: string
          destination?: string
          driver_name?: string | null
          id?: string
          notes?: string | null
          origin?: string
          real_departure?: string | null
          scheduled_departure?: string
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "partner_companies"
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
      trip_status:
        | "scheduled"
        | "imminent"
        | "late"
        | "checked_in"
        | "cancelled"
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
      trip_status: ["scheduled", "imminent", "late", "checked_in", "cancelled"],
    },
  },
} as const
