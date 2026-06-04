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
      academic_sessions: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          name: string
          short_code: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          name: string
          short_code: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          name?: string
          short_code?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          arm_id: string | null
          audience: string
          body: string
          class_id: string | null
          created_at: string
          created_by: string | null
          id: string
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          arm_id?: string | null
          audience?: string
          body: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          arm_id?: string | null
          audience?: string
          body?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "arms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      arms: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          arm_id: string
          class_id: string
          created_at: string
          date: string
          id: string
          note: string | null
          recorded_by: string | null
          session_id: string | null
          status: string
          student_id: string
          term_id: string
          updated_at: string
        }
        Insert: {
          arm_id: string
          class_id: string
          created_at?: string
          date: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          session_id?: string | null
          status?: string
          student_id: string
          term_id: string
          updated_at?: string
        }
        Update: {
          arm_id?: string
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          session_id?: string | null
          status?: string
          student_id?: string
          term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "arms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      classes: {
        Row: {
          created_at: string
          id: string
          level_order: number
          name: string
          section: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level_order?: number
          name: string
          section: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level_order?: number
          name?: string
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      grade_scale: {
        Row: {
          created_at: string
          grade: string
          id: string
          max_score: number
          min_score: number
          remark: string
        }
        Insert: {
          created_at?: string
          grade: string
          id?: string
          max_score: number
          min_score: number
          remark: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          max_score?: number
          min_score?: number
          remark?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      result_sheets: {
        Row: {
          arm_id: string | null
          average: number
          class_id: string | null
          created_at: string
          id: string
          position: number | null
          promoted: boolean
          published_at: string | null
          session_id: string | null
          status: string
          student_id: string
          term_id: string
          total_obtainable: number
          total_score: number
          updated_at: string
        }
        Insert: {
          arm_id?: string | null
          average?: number
          class_id?: string | null
          created_at?: string
          id?: string
          position?: number | null
          promoted?: boolean
          published_at?: string | null
          session_id?: string | null
          status?: string
          student_id: string
          term_id: string
          total_obtainable?: number
          total_score?: number
          updated_at?: string
        }
        Update: {
          arm_id?: string | null
          average?: number
          class_id?: string | null
          created_at?: string
          id?: string
          position?: number | null
          promoted?: boolean
          published_at?: string | null
          session_id?: string | null
          status?: string
          student_id?: string
          term_id?: string
          total_obtainable?: number
          total_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "result_sheets_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "arms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_sheets_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_sheets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_sheets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_sheets_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      school_settings: {
        Row: {
          acronym: string
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: number
          location: string
          logo_url: string | null
          motto: string | null
          principal_name: string | null
          school_name: string
          scratch_card_default_uses: number
          updated_at: string
        }
        Insert: {
          acronym?: string
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: number
          location?: string
          logo_url?: string | null
          motto?: string | null
          principal_name?: string | null
          school_name?: string
          scratch_card_default_uses?: number
          updated_at?: string
        }
        Update: {
          acronym?: string
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: number
          location?: string
          logo_url?: string | null
          motto?: string | null
          principal_name?: string | null
          school_name?: string
          scratch_card_default_uses?: number
          updated_at?: string
        }
        Relationships: []
      }
      scores: {
        Row: {
          arm_id: string
          ca1: number
          ca2: number
          ca3: number
          class_id: string
          created_at: string
          entered_by: string | null
          exam: number
          grade: string | null
          id: string
          remark: string | null
          session_id: string
          student_id: string
          subject_id: string
          term_id: string
          total: number
          updated_at: string
        }
        Insert: {
          arm_id: string
          ca1?: number
          ca2?: number
          ca3?: number
          class_id: string
          created_at?: string
          entered_by?: string | null
          exam?: number
          grade?: string | null
          id?: string
          remark?: string | null
          session_id: string
          student_id: string
          subject_id: string
          term_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          arm_id?: string
          ca1?: number
          ca2?: number
          ca3?: number
          class_id?: string
          created_at?: string
          entered_by?: string | null
          exam?: number
          grade?: string | null
          id?: string
          remark?: string | null
          session_id?: string
          student_id?: string
          subject_id?: string
          term_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "arms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      scratch_cards: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          max_uses: number
          pin: string
          session_id: string
          status: string
          term_id: string | null
          updated_at: string
          uses: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          max_uses?: number
          pin: string
          session_id: string
          status?: string
          term_id?: string | null
          updated_at?: string
          uses?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          max_uses?: number
          pin?: string
          session_id?: string
          status?: string
          term_id?: string | null
          updated_at?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "scratch_cards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scratch_cards_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          address: string | null
          created_at: string
          date_employed: string
          department: string | null
          email: string | null
          employee_no: string
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          lga: string | null
          phone: string | null
          qualification: string | null
          state_of_origin: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_employed?: string
          department?: string | null
          email?: string | null
          employee_no: string
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean
          lga?: string | null
          phone?: string | null
          qualification?: string | null
          state_of_origin?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          date_employed?: string
          department?: string | null
          email?: string | null
          employee_no?: string
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          lga?: string | null
          phone?: string | null
          qualification?: string | null
          state_of_origin?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          address: string | null
          admission_date: string
          admission_no: string
          admission_session_id: string | null
          created_at: string
          current_arm_id: string | null
          current_class_id: string | null
          date_of_birth: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          lga: string | null
          parent_email: string | null
          parent_name: string | null
          parent_occupation: string | null
          parent_phone: string | null
          passport_url: string | null
          state_of_origin: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          admission_date?: string
          admission_no: string
          admission_session_id?: string | null
          created_at?: string
          current_arm_id?: string | null
          current_class_id?: string | null
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean
          lga?: string | null
          parent_email?: string | null
          parent_name?: string | null
          parent_occupation?: string | null
          parent_phone?: string | null
          passport_url?: string | null
          state_of_origin?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          admission_date?: string
          admission_no?: string
          admission_session_id?: string | null
          created_at?: string
          current_arm_id?: string | null
          current_class_id?: string | null
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          lga?: string | null
          parent_email?: string | null
          parent_name?: string | null
          parent_occupation?: string | null
          parent_phone?: string | null
          passport_url?: string | null
          state_of_origin?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_admission_session_id_fkey"
            columns: ["admission_session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_current_arm_id_fkey"
            columns: ["current_arm_id"]
            isOneToOne: false
            referencedRelation: "arms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_current_class_id_fkey"
            columns: ["current_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_offerings: {
        Row: {
          arm_id: string
          class_id: string
          created_at: string
          id: string
          session_id: string
          subject_id: string
        }
        Insert: {
          arm_id: string
          class_id: string
          created_at?: string
          id?: string
          session_id: string
          subject_id: string
        }
        Update: {
          arm_id?: string
          class_id?: string
          created_at?: string
          id?: string
          session_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_offerings_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "arms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_offerings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_offerings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_offerings_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          id: string
          max_level_order: number | null
          min_level_order: number | null
          name: string
          restricted_arm_ids: string[]
          section: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          max_level_order?: number | null
          min_level_order?: number | null
          name: string
          restricted_arm_ids?: string[]
          section?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          max_level_order?: number | null
          min_level_order?: number | null
          name?: string
          restricted_arm_ids?: string[]
          section?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      teacher_assignments: {
        Row: {
          arm_id: string
          class_id: string
          created_at: string
          id: string
          session_id: string
          staff_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          arm_id: string
          class_id: string
          created_at?: string
          id?: string
          session_id: string
          staff_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          arm_id?: string
          class_id?: string
          created_at?: string
          id?: string
          session_id?: string
          staff_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_arm_id_fkey"
            columns: ["arm_id"]
            isOneToOne: false
            referencedRelation: "arms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          name: string
          session_id: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          name: string
          session_id: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          name?: string
          session_id?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_admission_no: {
        Args: { _section: string; _session_id: string }
        Returns: string
      }
      generate_employee_no: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recompute_result_sheet: {
        Args: { _student_id: string; _term_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "rep"
        | "super_admin"
        | "director"
        | "principal"
        | "vice_principal"
        | "admission_officer"
        | "teacher"
        | "form_master"
        | "exam_officer"
        | "parent"
        | "student"
      deal_status: "closed" | "open"
      quota_period: "month" | "quarter" | "year"
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
      app_role: [
        "admin",
        "rep",
        "super_admin",
        "director",
        "principal",
        "vice_principal",
        "admission_officer",
        "teacher",
        "form_master",
        "exam_officer",
        "parent",
        "student",
      ],
      deal_status: ["closed", "open"],
      quota_period: ["month", "quarter", "year"],
    },
  },
} as const
