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
      issues: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_id: string
          photo_urls: string[]
          resolution_note: string | null
          status: Database["public"]["Enums"]["issue_status_type"]
          type: Database["public"]["Enums"]["issue_type_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_id: string
          photo_urls?: string[]
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["issue_status_type"]
          type: Database["public"]["Enums"]["issue_type_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string
          photo_urls?: string[]
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["issue_status_type"]
          type?: Database["public"]["Enums"]["issue_type_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          block: string | null
          created_at: string
          id: string
          is_active: boolean
          message: string
        }
        Insert: {
          block?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
        }
        Update: {
          block?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          deep_link: string | null
          id: string
          is_read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          deep_link?: string | null
          id?: string
          is_read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          deep_link?: string | null
          id?: string
          is_read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor: Database["public"]["Enums"]["event_actor_type"]
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status_type"]
        }
        Insert: {
          actor?: Database["public"]["Enums"]["event_actor_type"]
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status_type"]
        }
        Update: {
          actor?: Database["public"]["Enums"]["event_actor_type"]
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status_type"]
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number | null
          bag_count: number
          created_at: string
          declared_items: Json
          delivered_at: string | null
          estimated_delivery_at: string | null
          id: string
          order_code: string
          partner_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status_type"]
          pickup_at: string | null
          pickup_slot_id: string | null
          rating: number | null
          review: string | null
          service_type_id: string | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["order_status_type"]
          user_id: string
          verified_items: Json | null
          weight_kg: number | null
        }
        Insert: {
          amount?: number | null
          bag_count?: number
          created_at?: string
          declared_items?: Json
          delivered_at?: string | null
          estimated_delivery_at?: string | null
          id?: string
          order_code?: string
          partner_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status_type"]
          pickup_at?: string | null
          pickup_slot_id?: string | null
          rating?: number | null
          review?: string | null
          service_type_id?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status_type"]
          user_id: string
          verified_items?: Json | null
          weight_kg?: number | null
        }
        Update: {
          amount?: number | null
          bag_count?: number
          created_at?: string
          declared_items?: Json
          delivered_at?: string | null
          estimated_delivery_at?: string | null
          id?: string
          order_code?: string
          partner_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status_type"]
          pickup_at?: string | null
          pickup_slot_id?: string | null
          rating?: number | null
          review?: string | null
          service_type_id?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status_type"]
          user_id?: string
          verified_items?: Json | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pickup_slot_id_fkey"
            columns: ["pickup_slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_period: Database["public"]["Enums"]["billing_period_type"]
          id: string
          monthly_quota_kg: number | null
          name: string
          perks: string[]
          price: number
        }
        Insert: {
          billing_period: Database["public"]["Enums"]["billing_period_type"]
          id?: string
          monthly_quota_kg?: number | null
          name: string
          perks?: string[]
          price: number
        }
        Update: {
          billing_period?: Database["public"]["Enums"]["billing_period_type"]
          id?: string
          monthly_quota_kg?: number | null
          name?: string
          perks?: string[]
          price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          block: string | null
          created_at: string
          default_service_type_id: string | null
          email: string | null
          floor: string | null
          full_name: string | null
          id: string
          notify_delivery_alerts: boolean
          notify_offers: boolean
          notify_pickup_reminders: boolean
          notify_status_updates: boolean
          onboarding_complete: boolean
          partner_notes: string | null
          phone: string | null
          pickup_point: Database["public"]["Enums"]["pickup_point_type"] | null
          role: Database["public"]["Enums"]["profile_role_type"]
          room_number: string | null
          student_id: string | null
          theme_preference: string
          village: string | null
          whatsapp_same_as_phone: boolean
        }
        Insert: {
          avatar_url?: string | null
          block?: string | null
          created_at?: string
          default_service_type_id?: string | null
          email?: string | null
          floor?: string | null
          full_name?: string | null
          id: string
          notify_delivery_alerts?: boolean
          notify_offers?: boolean
          notify_pickup_reminders?: boolean
          notify_status_updates?: boolean
          onboarding_complete?: boolean
          partner_notes?: string | null
          phone?: string | null
          pickup_point?: Database["public"]["Enums"]["pickup_point_type"] | null
          role?: Database["public"]["Enums"]["profile_role_type"]
          room_number?: string | null
          student_id?: string | null
          theme_preference?: string
          village?: string | null
          whatsapp_same_as_phone?: boolean
        }
        Update: {
          avatar_url?: string | null
          block?: string | null
          created_at?: string
          default_service_type_id?: string | null
          email?: string | null
          floor?: string | null
          full_name?: string | null
          id?: string
          notify_delivery_alerts?: boolean
          notify_offers?: boolean
          notify_pickup_reminders?: boolean
          notify_status_updates?: boolean
          onboarding_complete?: boolean
          partner_notes?: string | null
          phone?: string | null
          pickup_point?: Database["public"]["Enums"]["pickup_point_type"] | null
          role?: Database["public"]["Enums"]["profile_role_type"]
          room_number?: string | null
          student_id?: string | null
          theme_preference?: string
          village?: string | null
          whatsapp_same_as_phone?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_service_type_id_fkey"
            columns: ["default_service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          description: string | null
          icon_key: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          pricing_unit: Database["public"]["Enums"]["pricing_unit_type"]
          turnaround_hours: number
        }
        Insert: {
          description?: string | null
          icon_key?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          pricing_unit: Database["public"]["Enums"]["pricing_unit_type"]
          turnaround_hours: number
        }
        Update: {
          description?: string | null
          icon_key?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          pricing_unit?: Database["public"]["Enums"]["pricing_unit_type"]
          turnaround_hours?: number
        }
        Relationships: []
      }
      slots: {
        Row: {
          block: string
          booked_count: number
          capacity: number
          date: string
          end_time: string
          id: string
          is_open: boolean
          start_time: string
        }
        Insert: {
          block: string
          booked_count?: number
          capacity?: number
          date: string
          end_time: string
          id?: string
          is_open?: boolean
          start_time: string
        }
        Update: {
          block?: string
          booked_count?: number
          capacity?: number
          date?: string
          end_time?: string
          id?: string
          is_open?: boolean
          start_time?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          ends_on: string | null
          id: string
          is_active: boolean
          plan_id: string
          quota_used_kg: number
          starts_on: string
          user_id: string
        }
        Insert: {
          ends_on?: string | null
          id?: string
          is_active?: boolean
          plan_id: string
          quota_used_kg?: number
          starts_on: string
          user_id: string
        }
        Update: {
          ends_on?: string | null
          id?: string
          is_active?: boolean
          plan_id?: string
          quota_used_kg?: number
          starts_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_plans_user_id_fkey"
            columns: ["user_id"]
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
      [_ in never]: never
    }
    Enums: {
      billing_period_type: "monthly" | "semester"
      event_actor_type: "student" | "partner" | "system"
      issue_status_type: "open" | "in_review" | "resolved"
      issue_type_type:
        | "missing_item"
        | "damaged"
        | "wrong_items"
        | "late"
        | "other"
      order_status_type:
        | "scheduled"
        | "awaiting_pickup"
        | "picked_up"
        | "washing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "issue_raised"
      payment_status_type: "unpaid" | "paid" | "covered_by_plan"
      pickup_point_type: "room_door" | "block_reception" | "common_room"
      pricing_unit_type: "per_kg" | "per_item"
      profile_role_type: "student" | "partner" | "admin"
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
      billing_period_type: ["monthly", "semester"],
      event_actor_type: ["student", "partner", "system"],
      issue_status_type: ["open", "in_review", "resolved"],
      issue_type_type: [
        "missing_item",
        "damaged",
        "wrong_items",
        "late",
        "other",
      ],
      order_status_type: [
        "scheduled",
        "awaiting_pickup",
        "picked_up",
        "washing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "issue_raised",
      ],
      payment_status_type: ["unpaid", "paid", "covered_by_plan"],
      pickup_point_type: ["room_door", "block_reception", "common_room"],
      pricing_unit_type: ["per_kg", "per_item"],
      profile_role_type: ["student", "partner", "admin"],
    },
  },
} as const
