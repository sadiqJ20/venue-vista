export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      booking_approvals: {
        Row: {
          action: string
          approver_id: string
          booking_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          action: string
          approver_id: string
          booking_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          action?: string
          approver_id?: string
          booking_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_approvals_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          attendees_count: number
          created_at: string
          department: Database["public"]["Enums"]["department_name"]
          description: string | null
          end_time: string
          event_date: string
          event_name: string
          faculty_id: string
          faculty_name: string
          faculty_phone: string | null
          guest_lecture_names: string | null
          guest_lectures_count: number
          hall_id: string
          hod_name: string
          id: string
          institution_type: Database["public"]["Enums"]["institution_type"]
          organizer_name: string
          rejection_reason: string | null
          required_ac: boolean | null
          required_audio_system: boolean | null
          required_mic: boolean | null
          required_projector: boolean | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          student_years: string[] | null
          updated_at: string
        }
        Insert: {
          attendees_count: number
          created_at?: string
          department: Database["public"]["Enums"]["department_name"]
          description?: string | null
          end_time: string
          event_date: string
          event_name: string
          faculty_id: string
          faculty_name: string
          faculty_phone?: string | null
          guest_lecture_names?: string | null
          guest_lectures_count: number
          hall_id: string
          hod_name: string
          id?: string
          institution_type: Database["public"]["Enums"]["institution_type"]
          organizer_name: string
          rejection_reason?: string | null
          required_ac?: boolean | null
          required_audio_system?: boolean | null
          required_mic?: boolean | null
          required_projector?: boolean | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          student_years?: string[] | null
          updated_at?: string
        }
        Update: {
          attendees_count?: number
          created_at?: string
          department?: Database["public"]["Enums"]["department_name"]
          description?: string | null
          end_time?: string
          event_date?: string
          event_name?: string
          faculty_id?: string
          faculty_name?: string
          faculty_phone?: string | null
          guest_lecture_names?: string | null
          guest_lectures_count?: number
          hall_id?: string
          hod_name?: string
          id?: string
          institution_type?: Database["public"]["Enums"]["institution_type"]
          organizer_name?: string
          rejection_reason?: string | null
          required_ac?: boolean | null
          required_audio_system?: boolean | null
          required_mic?: boolean | null
          required_projector?: boolean | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          student_years?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
        ]
      }
      halls: {
        Row: {
          block: Database["public"]["Enums"]["block_name"]
          capacity: number
          created_at: string
          has_ac: boolean | null
          has_audio_system: boolean | null
          has_mic: boolean | null
          has_projector: boolean | null
          id: string
          name: string
          type: Database["public"]["Enums"]["hall_type"]
          updated_at: string
        }
        Insert: {
          block: Database["public"]["Enums"]["block_name"]
          capacity: number
          created_at?: string
          has_ac?: boolean | null
          has_audio_system?: boolean | null
          has_mic?: boolean | null
          has_projector?: boolean | null
          id?: string
          name: string
          type: Database["public"]["Enums"]["hall_type"]
          updated_at?: string
        }
        Update: {
          block?: Database["public"]["Enums"]["block_name"]
          capacity?: number
          created_at?: string
          has_ac?: boolean | null
          has_audio_system?: boolean | null
          has_mic?: boolean | null
          has_projector?: boolean | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["hall_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["department_name"] | null
          email: string
          id: string
          mobile_number: string
          name: string
          password_hash: string | null
          role: Database["public"]["Enums"]["user_role"]
          unique_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: Database["public"]["Enums"]["department_name"] | null
          email: string
          id?: string
          mobile_number: string
          name: string
          password_hash?: string | null
          role: Database["public"]["Enums"]["user_role"]
          unique_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["department_name"] | null
          email?: string
          id?: string
          mobile_number?: string
          name?: string
          password_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          unique_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      block_name: "East Block" | "West Block" | "Main Block" | "Diploma Block"
      booking_status:
        | "pending_hod"
        | "pending_principal"
        | "pending_pro"
        | "approved"
        | "rejected"
      department_name:
        | "CSE"
        | "IT"
        | "ECE"
        | "EEE"
        | "MECH"
        | "CIVIL"
        | "AERO"
        | "CHEMICAL"
        | "AIDS"
        | "CSBS"
      hall_type: "Auditorium" | "Smart Classroom"
      institution_type: "School" | "Diploma" | "Polytechnic" | "Engineering"
      user_role: "faculty" | "hod" | "principal" | "pro"
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
      block_name: ["East Block", "West Block", "Main Block", "Diploma Block"],
      booking_status: [
        "pending_hod",
        "pending_principal",
        "pending_pro",
        "approved",
        "rejected",
      ],
      department_name: [
        "CSE",
        "IT",
        "ECE",
        "EEE",
        "MECH",
        "CIVIL",
        "AERO",
        "CHEMICAL",
        "AIDS",
        "CSBS",
      ],
      hall_type: ["Auditorium", "Smart Classroom"],
      institution_type: ["School", "Diploma", "Polytechnic", "Engineering"],
      user_role: ["faculty", "hod", "principal", "pro"],
    },
  },
} as const
