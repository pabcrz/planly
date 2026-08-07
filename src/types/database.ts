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
      church_memberships: {
        Row: {
          church_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["church_role"]
          user_id: string
        }
        Insert: {
          church_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["church_role"]
          user_id: string
        }
        Update: {
          church_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["church_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "church_memberships_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      church_repertoire: {
        Row: {
          adopted_at: string
          adopted_by: string
          archived_at: string | null
          church_id: string
          is_published: boolean
          song_id: string
        }
        Insert: {
          adopted_at?: string
          adopted_by: string
          archived_at?: string | null
          church_id: string
          is_published?: boolean
          song_id: string
        }
        Update: {
          adopted_at?: string
          adopted_by?: string
          archived_at?: string | null
          church_id?: string
          is_published?: boolean
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "church_repertoire_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "church_repertoire_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      churches: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json
          slug: string
          timezone: string
          type: Database["public"]["Enums"]["church_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json
          slug: string
          timezone?: string
          type?: Database["public"]["Enums"]["church_type"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json
          slug?: string
          timezone?: string
          type?: Database["public"]["Enums"]["church_type"]
        }
        Relationships: []
      }
      global_curators: {
        Row: {
          granted_at: string
          granted_by: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string
          user_id?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          display_name: string
          instruments: string[]
          membership_id: string
          musical_roles: string[]
        }
        Insert: {
          display_name: string
          instruments?: string[]
          membership_id: string
          musical_roles?: string[]
        }
        Update: {
          display_name?: string
          instruments?: string[]
          membership_id?: string
          musical_roles?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "people_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "church_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      service_member_roles: {
        Row: {
          role: string
          service_participant_id: string
        }
        Insert: {
          role: string
          service_participant_id: string
        }
        Update: {
          role?: string
          service_participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_member_roles_service_participant_id_fkey"
            columns: ["service_participant_id"]
            isOneToOne: false
            referencedRelation: "service_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_participants: {
        Row: {
          id: string
          membership_id: string
          service_id: string
        }
        Insert: {
          id?: string
          membership_id: string
          service_id: string
        }
        Update: {
          id?: string
          membership_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_participants_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "church_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_participants_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          church_id: string
          created_at: string
          director: string | null
          service_type: string | null
          id: string
          is_published: boolean
          notes: string | null
          service_date: string
          start_time: string
          status: Database["public"]["Enums"]["service_status"]
          team_id: string | null
          timezone: string
        }
        Insert: {
          church_id: string
          created_at?: string
          director?: string | null
          service_type?: string | null
          id?: string
          is_published?: boolean
          notes?: string | null
          service_date: string
          start_time: string
          status?: Database["public"]["Enums"]["service_status"]
          team_id?: string | null
          timezone: string
        }
        Update: {
          church_id?: string
          created_at?: string
          director?: string | null
          service_type?: string | null
          id?: string
          is_published?: boolean
          notes?: string | null
          service_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["service_status"]
          team_id?: string | null
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      setlist_items: {
        Row: {
          id: string
          key: string
          notes: string | null
          setlist_id: string
          song_id: string
          song_version_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          key: string
          notes?: string | null
          setlist_id: string
          song_id: string
          song_version_id: string
          sort_order: number
        }
        Update: {
          id?: string
          key?: string
          notes?: string | null
          setlist_id?: string
          song_id?: string
          song_version_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "setlist_items_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_items_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_items_song_version_id_fkey"
            columns: ["song_version_id"]
            isOneToOne: false
            referencedRelation: "song_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      setlists: {
        Row: {
          created_at: string
          frozen_at: string | null
          frozen_content: Json | null
          id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          frozen_at?: string | null
          frozen_content?: Json | null
          id?: string
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          frozen_at?: string | null
          frozen_content?: Json | null
          id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setlists_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      song_variants: {
        Row: {
          church_id: string
          created_at: string
          created_by: string
          id: string
          local_content: string | null
          local_key: string
          local_notes: string | null
          song_version_id: string
        }
        Insert: {
          church_id: string
          created_at?: string
          created_by: string
          id?: string
          local_content?: string | null
          local_key: string
          local_notes?: string | null
          song_version_id: string
        }
        Update: {
          church_id?: string
          created_at?: string
          created_by?: string
          id?: string
          local_content?: string | null
          local_key?: string
          local_notes?: string | null
          song_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_variants_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_variants_song_version_id_fkey"
            columns: ["song_version_id"]
            isOneToOne: false
            referencedRelation: "song_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      song_versions: {
        Row: {
          chordpro_content: string
          created_at: string
          created_by: string
          id: string
          key: string
          notes: string | null
          song_id: string
          version_name: string
        }
        Insert: {
          chordpro_content: string
          created_at?: string
          created_by: string
          id?: string
          key: string
          notes?: string | null
          song_id: string
          version_name: string
        }
        Update: {
          chordpro_content?: string
          created_at?: string
          created_by?: string
          id?: string
          key?: string
          notes?: string | null
          song_id?: string
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_versions_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          author: string | null
          church_id: string | null
          created_at: string
          created_by: string
          id: string
          is_canonical: boolean
          reference_urls: Json
          tags: string[]
          tempo: number | null
          title: string
        }
        Insert: {
          author?: string | null
          church_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_canonical?: boolean
          reference_urls?: Json
          tags?: string[]
          tempo?: number | null
          title: string
        }
        Update: {
          author?: string | null
          church_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_canonical?: boolean
          reference_urls?: Json
          tags?: string[]
          tempo?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "songs_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          joined_at: string
          membership_id: string
          team_id: string
        }
        Insert: {
          joined_at?: string
          membership_id: string
          team_id: string
        }
        Update: {
          joined_at?: string
          membership_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "church_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          church_id: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          church_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          church_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_current_user: { Args: never; Returns: undefined }
      create_church: {
        Args: {
          church_name: string
          church_slug: string
          church_timezone: string
        }
        Returns: {
          created_at: string
          id: string
          name: string
          settings: Json
          slug: string
          timezone: string
          type: Database["public"]["Enums"]["church_type"]
        }
        SetofOptions: {
          from: "*"
          to: "churches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_church_role: {
        Args: {
          church_uuid: string
          min_role: Database["public"]["Enums"]["church_role"]
        }
        Returns: boolean
      }
      is_church_member: { Args: { church_uuid: string }; Returns: boolean }
      is_curator: { Args: never; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_user_active: { Args: { target_user_id?: string }; Returns: boolean }
    }
    Enums: {
      church_role: "church_admin" | "worship_director" | "member"
      church_type: "managed" | "lightweight"
      service_status: "planned" | "active" | "completed"
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
      church_role: ["church_admin", "worship_director", "member"],
      church_type: ["managed", "lightweight"],
      service_status: ["planned", "active", "completed"],
    },
  },
} as const
