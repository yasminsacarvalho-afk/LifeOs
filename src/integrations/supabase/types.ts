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
      cash_closings: {
        Row: {
          id: string
          closing_date: string
          total_sales: number
          total_commission: number
          expenses: number
          net_amount: number
          closed_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          closing_date?: string
          total_sales?: number
          total_commission?: number
          expenses?: number
          net_amount?: number
          closed_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          closing_date?: string
          total_sales?: number
          total_commission?: number
          expenses?: number
          net_amount?: number
          closed_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      city_codes: {
        Row: {
          id: string
          city_name: string
          code: string
          company_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          city_name: string
          code: string
          company_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          city_name?: string
          code?: string
          company_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "partner_companies"
            referencedColumns: ["id"]
          }
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
          meta: number | null
          comissao: number | null
          linhas_exclusivas: string[] | null
          protocolo: string | null
          politica_devolucao: string | null
          politica_troca: string | null
          ticket_medio: number | null
          carros_por_dia: number | null
          mais_informacoes: string | null
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
          meta?: number | null
          comissao?: number | null
          linhas_exclusivas?: string[] | null
          protocolo?: string | null
          politica_devolucao?: string | null
          politica_troca?: string | null
          ticket_medio?: number | null
          carros_por_dia?: number | null
          mais_informacoes?: string | null
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          meta?: number | null
          comissao?: number | null
          linhas_exclusivas?: string[] | null
          protocolo?: string | null
          politica_devolucao?: string | null
          politica_troca?: string | null
          ticket_medio?: number | null
          carros_por_dia?: number | null
          mais_informacoes?: string | null
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
          payment_method: string | null
          sale_date: string
          sales_channel: string | null
          seller_id: string | null
          trip_id: string | null
        }
        Insert: {
          amount: number
          commission_amount?: number
          company_id?: string | null
          created_at?: string
          id?: string
          payment_method?: string | null
          sale_date?: string
          sales_channel?: string | null
          seller_id?: string | null
          trip_id?: string | null
        }
        Update: {
          amount?: number
          commission_amount?: number
          company_id?: string | null
          created_at?: string
          id?: string
          payment_method?: string | null
          sale_date?: string
          sales_channel?: string | null
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
      drivers: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          lines: string[]
          company_id: string | null
          status: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          lines?: string[]
          company_id?: string | null
          status?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          lines?: string[]
          company_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "partner_companies"
            referencedColumns: ["id"]
          }
        ]
      }
      driver_evaluations: {
        Row: {
          id: string
          created_at: string
          driver_id: string
          trip_id: string | null
          observations: string
          evaluator_name: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          driver_id: string
          trip_id?: string | null
          observations: string
          evaluator_name?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          driver_id?: string
          trip_id?: string | null
          observations?: string
          evaluator_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_evaluations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_evaluations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          }
        ]
      }
      crm_leads: {
        Row: {
          id: string
          created_at: string
          client_name: string
          status: string
          expected_value: number
          estimated_commission: number | null
          notes: string | null
          phone: string | null
          email: string | null
          target_company_id: string | null
          desired_destination: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          client_name: string
          status?: string
          expected_value?: number
          estimated_commission?: number | null
          notes?: string | null
          phone?: string | null
          email?: string | null
          target_company_id?: string | null
          desired_destination?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          client_name?: string
          status?: string
          expected_value?: number
          estimated_commission?: number | null
          notes?: string | null
          phone?: string | null
          email?: string | null
          target_company_id?: string | null
          desired_destination?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "partner_companies"
            referencedColumns: ["id"]
          }
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          company_id: string | null
          created_at: string
          description: string
          expense_date: string
          id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          company_id?: string | null
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          company_id?: string | null
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "partner_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          code: string
          commission: number
          company_id: string | null
          created_at: string
          destination: string
          direction: string
          id: string
          origin: string
          price: number
          receiver_name: string
          sender_name: string
          status: Database["public"]["Enums"]["package_status"]
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          commission?: number
          company_id?: string | null
          created_at?: string
          destination: string
          direction?: string
          id?: string
          origin: string
          price?: number
          receiver_name: string
          sender_name: string
          status?: Database["public"]["Enums"]["package_status"]
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          commission?: number
          company_id?: string | null
          created_at?: string
          destination?: string
          direction?: string
          id?: string
          origin?: string
          price?: number
          receiver_name?: string
          sender_name?: string
          status?: Database["public"]["Enums"]["package_status"]
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "partner_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_goals: {
        Row: {
          bonus_amount: number
          created_at: string
          description: string
          id: string
          seller_id: string
          target_amount: number
          updated_at: string
        }
        Insert: {
          bonus_amount?: number
          created_at?: string
          description: string
          id?: string
          seller_id: string
          target_amount?: number
          updated_at?: string
        }
        Update: {
          bonus_amount?: number
          created_at?: string
          description?: string
          id?: string
          seller_id?: string
          target_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_goals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          active: boolean
          base_salary: number
          bonus_amount: number
          commission_rate: number
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          role: string
          sales_goal: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_salary?: number
          bonus_amount?: number
          commission_rate?: number
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          role?: string
          sales_goal?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_salary?: number
          bonus_amount?: number
          commission_rate?: number
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          role?: string
          sales_goal?: number
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
          cities: string[] | null
          code: string
          company_id: string | null
          created_at: string
          destination: string
          direction: string | null
          driver_name: string | null
          route_name: string | null
          origin_code: string | null
          destination_code: string | null
          agent_indicated_time: string | null
          id: string
          notes: string | null
          operating_days: number[] | null
          origin: string
          real_departure: string | null
          scheduled_departure: string
          status: Database["public"]["Enums"]["trip_status"]
          updated_at: string
          hide_from_dashboard: boolean | null
        }
        Insert: {
          car_plate?: string | null
          cities?: string[] | null
          code: string
          company_id?: string | null
          created_at?: string
          destination: string
          direction?: string | null
          driver_name?: string | null
          route_name?: string | null
          origin_code?: string | null
          destination_code?: string | null
          agent_indicated_time?: string | null
          id?: string
          notes?: string | null
          operating_days?: number[] | null
          origin: string
          real_departure?: string | null
          scheduled_departure: string
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
          hide_from_dashboard?: boolean | null
        }
        Update: {
          car_plate?: string | null
          cities?: string[] | null
          code?: string
          company_id?: string | null
          created_at?: string
          destination?: string
          direction?: string | null
          driver_name?: string | null
          route_name?: string | null
          origin_code?: string | null
          destination_code?: string | null
          agent_indicated_time?: string | null
          id?: string
          notes?: string | null
          operating_days?: number[] | null
          origin?: string
          real_departure?: string | null
          scheduled_departure?: string
          status?: Database["public"]["Enums"]["trip_status"]
          updated_at?: string
          hide_from_dashboard?: boolean | null
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
      shifts: {
        Row: {
          covered_by_id: string | null
          created_at: string
          end_time: string | null
          id: string
          seller_id: string
          shift_date: string
          shift_type: Database["public"]["Enums"]["shift_type"]
          start_time: string | null
          status: Database["public"]["Enums"]["shift_status"]
          swap_fee: number
          swap_requested: boolean
          swap_type: "money" | "time_off" | null
          updated_at: string
        }
        Insert: {
          covered_by_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          seller_id: string
          shift_date: string
          shift_type?: Database["public"]["Enums"]["shift_type"]
          start_time?: string | null
          status?: Database["public"]["Enums"]["shift_status"]
          swap_fee?: number
          swap_requested?: boolean
          swap_type?: "money" | "time_off" | null
          updated_at?: string
        }
        Update: {
          covered_by_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          seller_id?: string
          shift_date?: string
          shift_type?: Database["public"]["Enums"]["shift_type"]
          start_time?: string | null
          status?: Database["public"]["Enums"]["shift_status"]
          swap_fee?: number
          swap_requested?: boolean
          swap_type?: "money" | "time_off" | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_covered_by_id_fkey"
            columns: ["covered_by_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
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
      expense_category: "fixo" | "variavel"
      package_status: "aguardando" | "enviada" | "chegou" | "entregue"
      shift_status: "agendado" | "realizado" | "trocado" | "falta"
      shift_type: "completa" | "manha" | "tarde" | "folga"
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
      expense_category: ["fixo", "variavel"],
      package_status: ["aguardando", "enviada", "chegou", "entregue"],
      shift_status: ["agendado", "realizado", "trocado", "falta"],
      shift_type: ["completa", "manha", "tarde", "folga"],
      trip_status: ["scheduled", "imminent", "late", "checked_in", "cancelled"],
    },
  },
} as const
