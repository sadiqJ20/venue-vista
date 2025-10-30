export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
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
      booking_switch_logs: {
        Row: {
          booking_id: string
          changed_at: string
          changed_by: string
          id: string
          new_hall_id: string
          old_hall_id: string
          reason: string | null
        }
        Insert: {
          booking_id: string
          changed_at?: string
          changed_by: string
          id?: string
          new_hall_id: string
          old_hall_id: string
          reason?: string | null
        }
        Update: {
          booking_id?: string
          changed_at?: string
          changed_by?: string
          id?: string
          new_hall_id?: string
          old_hall_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_switch_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_switch_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_switch_logs_new_hall_id_fkey"
            columns: ["new_hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_switch_logs_old_hall_id_fkey"
            columns: ["old_hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          attendee_years: string[] | null
          attendees_count: number
          created_at: string
          department: Database["public"]["Enums"]["department_name"]
          end_time: string
          event_date: string
          event_name: string
          faculty_id: string
          faculty_name: string
          faculty_phone: string | null
          guest_lecture_names: string | null
          guest_lectures_count: number
          hall_change_reason: string | null
          hall_changed_by: string | null
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
          updated_at: string
        }
        Insert: {
          attendee_years?: string[] | null
          attendees_count: number
          created_at?: string
          department: Database["public"]["Enums"]["department_name"]
          end_time: string
          event_date: string
          event_name: string
          faculty_id: string
          faculty_name: string
          faculty_phone?: string | null
          guest_lecture_names?: string | null
          guest_lectures_count: number
          hall_change_reason?: string | null
          hall_changed_by?: string | null
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
          updated_at?: string
        }
        Update: {
          attendee_years?: string[] | null
          attendees_count?: number
          created_at?: string
          department?: Database["public"]["Enums"]["department_name"]
          end_time?: string
          event_date?: string
          event_name?: string
          faculty_id?: string
          faculty_name?: string
          faculty_phone?: string | null
          guest_lecture_names?: string | null
          guest_lectures_count?: number
          hall_change_reason?: string | null
          hall_changed_by?: string | null
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
            foreignKeyName: "bookings_hall_changed_by_fkey"
            columns: ["hall_changed_by"]
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
      email_notifications: {
        Row: {
          booking_id: string | null
          created_at: string
          email_body: string
          email_sent: boolean
          email_subject: string
          error_message: string | null
          id: string
          recipient_email: string
          recipient_name: string | null
          retry_count: number
          sent_at: string | null
          type: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          email_body: string
          email_sent?: boolean
          email_subject: string
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_name?: string | null
          retry_count?: number
          sent_at?: string | null
          type: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          email_body?: string
          email_sent?: boolean
          email_subject?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_name?: string | null
          retry_count?: number
          sent_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
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
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
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
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_available_halls: {
        Args: {
          booking_date: string
          end_time: string
          start_time: string
        }
        Returns: {
          block: Database["public"]["Enums"]["block_name"]
          capacity: number
          has_ac: boolean | null
          has_audio_system: boolean | null
          has_mic: boolean | null
          has_projector: boolean | null
          id: string
          name: string
          type: Database["public"]["Enums"]["hall_type"]
        }[]
      }
      send_notification: {
        Args: {
          recipient_user_id: string
          title: string
          message: string
          type: string
          data?: Json
        }
        Returns: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
      }
    }
    Enums: {
      block_name: "East Block" | "West Block" | "Main Block" | "Diploma Block" | "OutDoor" | "Innovation Block"
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
        | "MCA"
        | "MBA"
        | "TRAINING"
        | "PLACEMENT"
        | "SCIENCE & HUMANITIES"
        | "HR"
        | "INNOVATION"
        | "AI_ML"
        | "NCC"
        | "NSS"
        | "III"
        | "IEDC"
        | "PRO"
      hall_type: "Auditorium" | "Smart Classroom"
      institution_type: "School" | "Diploma" | "Polytechnic" | "Engineering"
      user_role: "faculty" | "hod" | "principal" | "pro" | "chairman"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
