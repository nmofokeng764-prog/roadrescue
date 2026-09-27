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
      emergency_contacts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kind: string
          label: string
          phone: string
          sms_number: string | null
          sort_order: number
          ussd_code: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          label: string
          phone: string
          sms_number?: string | null
          sort_order?: number
          ussd_code?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          label?: string
          phone?: string
          sms_number?: string | null
          sort_order?: number
          ussd_code?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string | null
          request_id: string
          status: Database["public"]["Enums"]["payment_status"]
          transaction_ref: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_ref?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      providers: {
        Row: {
          base_lat: number | null
          base_lng: number | null
          business_name: string
          contact_phone: string
          created_at: string
          current_lat: number | null
          current_lng: number | null
          description: string | null
          id: string
          is_online: boolean
          is_verified: boolean
          service_area: string
          services: string[]
          status: Database["public"]["Enums"]["provider_status"]
          user_id: string
          verified_at: string | null
        }
        Insert: {
          base_lat?: number | null
          base_lng?: number | null
          business_name: string
          contact_phone?: string
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          description?: string | null
          id?: string
          is_online?: boolean
          is_verified?: boolean
          service_area?: string
          services?: string[]
          status?: Database["public"]["Enums"]["provider_status"]
          user_id: string
          verified_at?: string | null
        }
        Update: {
          base_lat?: number | null
          base_lng?: number | null
          business_name?: string
          contact_phone?: string
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          description?: string | null
          id?: string
          is_online?: boolean
          is_verified?: boolean
          service_area?: string
          services?: string[]
          status?: Database["public"]["Enums"]["provider_status"]
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      requests: {
        Row: {
          created_at: string
          customer_id: string
          distance_km: number | null
          est_cost: number | null
          eta_min: number | null
          id: string
          instructions: string | null
          lat: number
          lng: number
          provider_id: string | null
          service_type: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          distance_km?: number | null
          est_cost?: number | null
          eta_min?: number | null
          id?: string
          instructions?: string | null
          lat: number
          lng: number
          provider_id?: string | null
          service_type: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          distance_km?: number | null
          est_cost?: number | null
          eta_min?: number | null
          id?: string
          instructions?: string | null
          lat?: number
          lng?: number
          provider_id?: string | null
          service_type?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          provider_id: string
          rating: number
          request_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          provider_id: string
          rating: number
          request_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          provider_id?: string
          rating?: number
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_alerts: {
        Row: {
          created_at: string
          customer_id: string
          full_name: string
          id: string
          lat: number
          lng: number
          note: string | null
          phone: string | null
          police_reference: string | null
          request_id: string | null
          status: Database["public"]["Enums"]["safety_status"]
        }
        Insert: {
          created_at?: string
          customer_id: string
          full_name: string
          id?: string
          lat: number
          lng: number
          note?: string | null
          phone?: string | null
          police_reference?: string | null
          request_id?: string | null
          status?: Database["public"]["Enums"]["safety_status"]
        }
        Update: {
          created_at?: string
          customer_id?: string
          full_name?: string
          id?: string
          lat?: number
          lng?: number
          note?: string | null
          phone?: string | null
          police_reference?: string | null
          request_id?: string | null
          status?: Database["public"]["Enums"]["safety_status"]
        }
        Relationships: [
          {
            foreignKeyName: "safety_alerts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          category: string
          colour: string
          created_at: string
          id: string
          is_primary: boolean
          make_model: string
          owner_id: string
          registration: string
        }
        Insert: {
          category: string
          colour: string
          created_at?: string
          id?: string
          is_primary?: boolean
          make_model: string
          owner_id: string
          registration: string
        }
        Update: {
          category?: string
          colour?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          make_model?: string
          owner_id?: string
          registration?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_provider_id: { Args: never; Returns: string }
      nearest_provider: {
        Args: { _lat: number; _lng: number; _service: string }
        Returns: {
          business_name: string
          distance_km: number
        }[]
      }
      provider_rating: {
        Args: { _provider_id: string }
        Returns: {
          avg_rating: number
          review_count: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "provider" | "customer"
      payment_method: "cash" | "eft" | "instant_eft"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      provider_status: "pending" | "approved" | "rejected"
      request_status:
        | "pending"
        | "matched"
        | "en_route"
        | "arrived"
        | "completed"
        | "cancelled"
      safety_status: "open" | "acknowledged" | "police_notified" | "resolved"
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
    Enums: {
      app_role: ["admin", "provider", "customer"],
      payment_method: ["cash", "eft", "instant_eft"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      provider_status: ["pending", "approved", "rejected"],
      request_status: [
        "pending",
        "matched",
        "en_route",
        "arrived",
        "completed",
        "cancelled",
      ],
      safety_status: ["open", "acknowledged", "police_notified", "resolved"],
    },
  },
} as const
