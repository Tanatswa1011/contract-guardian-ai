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
      contract_dates: {
        Row: {
          contract_id: string
          created_at: string
          due_date: string
          id: string
          label: string | null
          note: string | null
          type: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          due_date: string
          id?: string
          label?: string | null
          note?: string | null
          type: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          due_date?: string
          id?: string
          label?: string | null
          note?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_dates_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_dates_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_files: {
        Row: {
          checksum: string | null
          contract_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          checksum?: string | null
          contract_id: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          checksum?: string | null
          contract_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_files_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_files_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          auto_renew: boolean
          counterparty: string | null
          created_at: string
          end_date: string | null
          id: string
          notice_period_days: number | null
          renewal_term_unit: string | null
          renewal_term_value: number | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          auto_renew?: boolean
          counterparty?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          notice_period_days?: number | null
          renewal_term_unit?: string | null
          renewal_term_value?: number | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          auto_renew?: boolean
          counterparty?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          notice_period_days?: number | null
          renewal_term_unit?: string | null
          renewal_term_value?: number | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["email_event_type"]
          id: string
          notification_log_id: string | null
          notification_queue_id: string | null
          occurred_at: string
          payload: Json
          provider: Database["public"]["Enums"]["provider_name"]
          provider_message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["email_event_type"]
          id?: string
          notification_log_id?: string | null
          notification_queue_id?: string | null
          occurred_at?: string
          payload?: Json
          provider?: Database["public"]["Enums"]["provider_name"]
          provider_message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["email_event_type"]
          id?: string
          notification_log_id?: string | null
          notification_queue_id?: string | null
          occurred_at?: string
          payload?: Json
          provider?: Database["public"]["Enums"]["provider_name"]
          provider_message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_log_fkey"
            columns: ["notification_log_id"]
            isOneToOne: false
            referencedRelation: "notification_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_queue_fkey"
            columns: ["notification_queue_id"]
            isOneToOne: false
            referencedRelation: "notification_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_runs: {
        Row: {
          contract_id: string
          created_at: string
          error: string | null
          id: string
          missing_fields: string[]
          missing_fields_text: string[]
          model: string | null
          needs_review: boolean
          raw_json: Json
          status: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          error?: string | null
          id?: string
          missing_fields?: string[]
          missing_fields_text?: string[]
          model?: string | null
          needs_review?: boolean
          raw_json?: Json
          status?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          error?: string | null
          id?: string
          missing_fields?: string[]
          missing_fields_text?: string[]
          model?: string | null
          needs_review?: boolean
          raw_json?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_runs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_runs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      kv_store_252a6301: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          contract_date_id: string | null
          contract_id: string | null
          dedupe_key: string
          error: string | null
          fire_on_date: string
          from_email: string | null
          headers: Json
          id: string
          offset_unit: string | null
          offset_value: number | null
          provider: Database["public"]["Enums"]["provider_name"]
          provider_message_id: string | null
          reply_to: string | null
          sent_at: string
          sent_to: string
          status: string
          subject: string | null
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          contract_date_id?: string | null
          contract_id?: string | null
          dedupe_key: string
          error?: string | null
          fire_on_date: string
          from_email?: string | null
          headers?: Json
          id?: string
          offset_unit?: string | null
          offset_value?: number | null
          provider?: Database["public"]["Enums"]["provider_name"]
          provider_message_id?: string | null
          reply_to?: string | null
          sent_at?: string
          sent_to: string
          status: string
          subject?: string | null
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          contract_date_id?: string | null
          contract_id?: string | null
          dedupe_key?: string
          error?: string | null
          fire_on_date?: string
          from_email?: string | null
          headers?: Json
          id?: string
          offset_unit?: string | null
          offset_value?: number | null
          provider?: Database["public"]["Enums"]["provider_name"]
          provider_message_id?: string | null
          reply_to?: string | null
          sent_at?: string
          sent_to?: string
          status?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_contract_date_id_fkey"
            columns: ["contract_date_id"]
            isOneToOne: false
            referencedRelation: "contract_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attempt_count: number
          attempts: number
          channel: Database["public"]["Enums"]["notification_channel"]
          contract_date_id: string | null
          contract_id: string | null
          created_at: string
          dedupe_key: string
          from_email: string | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          provider: Database["public"]["Enums"]["provider_name"]
          provider_message_id: string | null
          reminder_rule_id: string | null
          reply_to: string | null
          scheduled_for: string
          sent_to: string
          status: Database["public"]["Enums"]["notification_status"]
          subject: string | null
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          attempts?: number
          channel?: Database["public"]["Enums"]["notification_channel"]
          contract_date_id?: string | null
          contract_id?: string | null
          created_at?: string
          dedupe_key: string
          from_email?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          provider?: Database["public"]["Enums"]["provider_name"]
          provider_message_id?: string | null
          reminder_rule_id?: string | null
          reply_to?: string | null
          scheduled_for: string
          sent_to: string
          status?: Database["public"]["Enums"]["notification_status"]
          subject?: string | null
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          attempts?: number
          channel?: Database["public"]["Enums"]["notification_channel"]
          contract_date_id?: string | null
          contract_id?: string | null
          created_at?: string
          dedupe_key?: string
          from_email?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          provider?: Database["public"]["Enums"]["provider_name"]
          provider_message_id?: string | null
          reminder_rule_id?: string | null
          reply_to?: string | null
          scheduled_for?: string
          sent_to?: string
          status?: Database["public"]["Enums"]["notification_status"]
          subject?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_contract_date_id_fkey"
            columns: ["contract_date_id"]
            isOneToOne: false
            referencedRelation: "contract_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_reminder_rule_id_fkey"
            columns: ["reminder_rule_id"]
            isOneToOne: false
            referencedRelation: "reminder_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          notification_email: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          notification_email?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          notification_email?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder_rules: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          contract_date_id: string | null
          contract_id: string | null
          created_at: string
          date_type: string
          enabled: boolean
          id: string
          offset_unit: string
          offset_value: number
          scope: string
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          contract_date_id?: string | null
          contract_id?: string | null
          created_at?: string
          date_type: string
          enabled?: boolean
          id?: string
          offset_unit: string
          offset_value: number
          scope: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          contract_date_id?: string | null
          contract_id?: string | null
          created_at?: string
          date_type?: string
          enabled?: boolean
          id?: string
          offset_unit?: string
          offset_value?: number
          scope?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_rules_contract_date_id_fkey"
            columns: ["contract_date_id"]
            isOneToOne: false
            referencedRelation: "contract_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_rules_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_rules_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      contracts_dashboard: {
        Row: {
          counterparty: string | null
          created_at: string | null
          days_until_next_deadline: number | null
          end_date: string | null
          expiring_within_30_days: boolean | null
          extracted_at: string | null
          extraction_model: string | null
          extraction_status: string | null
          has_overdue_dates: boolean | null
          health_status: string | null
          id: string | null
          missing_fields: string[] | null
          needs_review: boolean | null
          next_deadline_date: string | null
          next_deadline_source: string | null
          next_deadline_type: string | null
          risk_alert: boolean | null
          start_date: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_notification_jobs: {
        Args: { batch_size?: number }
        Returns: {
          attempt_count: number
          attempts: number
          channel: Database["public"]["Enums"]["notification_channel"]
          contract_date_id: string | null
          contract_id: string | null
          created_at: string
          dedupe_key: string
          from_email: string | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          provider: Database["public"]["Enums"]["provider_name"]
          provider_message_id: string | null
          reminder_rule_id: string | null
          reply_to: string | null
          scheduled_for: string
          sent_to: string
          status: Database["public"]["Enums"]["notification_status"]
          subject: string | null
          template_id: string | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notification_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      handle_notification_failure: {
        Args: { error_message: string; queue_id: string }
        Returns: undefined
      }
      is_contract_owner: { Args: { p_contract_id: string }; Returns: boolean }
      is_workspace_member: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      log_notification:
        | {
            Args: {
              p_channel: string
              p_contract_date_id: string
              p_contract_id: string
              p_dedupe_key: string
              p_error?: string
              p_fire_on_date: string
              p_sent_to: string
              p_status?: string
              p_subject: string
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_channel: string
              p_contract_date_id: string
              p_contract_id: string
              p_dedupe_key: string
              p_fire_on_date: string
              p_subject: string
              p_user_id: string
            }
            Returns: undefined
          }
      pick_notification_job: {
        Args: never
        Returns: {
          attempt_count: number
          attempts: number
          channel: Database["public"]["Enums"]["notification_channel"]
          contract_date_id: string | null
          contract_id: string | null
          created_at: string
          dedupe_key: string
          from_email: string | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          provider: Database["public"]["Enums"]["provider_name"]
          provider_message_id: string | null
          reminder_rule_id: string | null
          reply_to: string | null
          scheduled_for: string
          sent_to: string
          status: Database["public"]["Enums"]["notification_status"]
          subject: string | null
          template_id: string | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notification_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      queue_fail_and_reschedule: {
        Args: { p_error: string; p_id: string }
        Returns: undefined
      }
      recalc_contract_status: {
        Args: { p_contract_id: string }
        Returns: undefined
      }
      reminders_due: {
        Args: { p_day?: string }
        Returns: {
          channel: string
          contract_date_id: string
          contract_id: string
          dedupe_key: string
          fire_on_date: string
          sent_to: string
          subject: string
          user_id: string
        }[]
      }
      reminders_due_today: {
        Args: never
        Returns: {
          channel: string
          contract_date_id: string
          contract_id: string
          date_type: string
          dedupe_key: string
          due_date: string
          fire_on_date: string
          offset_unit: string
          offset_value: number
          send_to: string
          subject: string
          title: string
          user_id: string
        }[]
      }
    }
    Enums: {
      email_event_type:
        | "sent"
        | "delivered"
        | "bounced"
        | "complained"
        | "opened"
        | "clicked"
        | "failed"
        | "dropped"
      notification_channel: "email" | "slack" | "telegram" | "whatsapp"
      notification_status:
        | "pending"
        | "processing"
        | "sent"
        | "failed"
        | "cancelled"
      provider_name: "resend"
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
      email_event_type: [
        "sent",
        "delivered",
        "bounced",
        "complained",
        "opened",
        "clicked",
        "failed",
        "dropped",
      ],
      notification_channel: ["email", "slack", "telegram", "whatsapp"],
      notification_status: [
        "pending",
        "processing",
        "sent",
        "failed",
        "cancelled",
      ],
      provider_name: ["resend"],
    },
  },
} as const
