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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      afspraken: {
        Row: {
          categorie: string
          created_at: string
          datum: string
          eind_tijd: string
          id: string
          start_tijd: string
          titel: string
          traject_id: string | null
          user_id: string
        }
        Insert: {
          categorie: string
          created_at?: string
          datum: string
          eind_tijd: string
          id?: string
          start_tijd: string
          titel: string
          traject_id?: string | null
          user_id: string
        }
        Update: {
          categorie?: string
          created_at?: string
          datum?: string
          eind_tijd?: string
          id?: string
          start_tijd?: string
          titel?: string
          traject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "afspraken_traject_id_fkey"
            columns: ["traject_id"]
            isOneToOne: false
            referencedRelation: "trajecten"
            referencedColumns: ["id"]
          },
        ]
      }
      contacten: {
        Row: {
          created_at: string
          email: string | null
          id: string
          klant_id: string | null
          naam: string
          notities: string | null
          rol: string | null
          telefoon: string | null
          updated_at: string
          user_id: string
          voorkeur: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          klant_id?: string | null
          naam: string
          notities?: string | null
          rol?: string | null
          telefoon?: string | null
          updated_at?: string
          user_id: string
          voorkeur?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          klant_id?: string | null
          naam?: string
          notities?: string | null
          rol?: string | null
          telefoon?: string | null
          updated_at?: string
          user_id?: string
          voorkeur?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacten_klant_id_fkey"
            columns: ["klant_id"]
            isOneToOne: false
            referencedRelation: "klanten"
            referencedColumns: ["id"]
          },
        ]
      }
      dag_blokken: {
        Row: {
          created_at: string
          eind_tijd: string
          id: string
          start_tijd: string
          type: string
          user_id: string
          volgorde: number
          weekdag: number
        }
        Insert: {
          created_at?: string
          eind_tijd: string
          id?: string
          start_tijd: string
          type: string
          user_id: string
          volgorde?: number
          weekdag: number
        }
        Update: {
          created_at?: string
          eind_tijd?: string
          id?: string
          start_tijd?: string
          type?: string
          user_id?: string
          volgorde?: number
          weekdag?: number
        }
        Relationships: []
      }
      doel_mijlpalen: {
        Row: {
          afgerond: boolean
          beloning: string | null
          created_at: string
          doel_id: string
          id: string
          titel: string
          updated_at: string
          user_id: string
          volgorde: number
        }
        Insert: {
          afgerond?: boolean
          beloning?: string | null
          created_at?: string
          doel_id: string
          id?: string
          titel: string
          updated_at?: string
          user_id: string
          volgorde?: number
        }
        Update: {
          afgerond?: boolean
          beloning?: string | null
          created_at?: string
          doel_id?: string
          id?: string
          titel?: string
          updated_at?: string
          user_id?: string
          volgorde?: number
        }
        Relationships: [
          {
            foreignKeyName: "doel_mijlpalen_doel_id_fkey"
            columns: ["doel_id"]
            isOneToOne: false
            referencedRelation: "doelen"
            referencedColumns: ["id"]
          },
        ]
      }
      doelen: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          omschrijving: string | null
          status: string
          titel: string
          updated_at: string
          user_id: string
          volgorde: number
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          omschrijving?: string | null
          status?: string
          titel: string
          updated_at?: string
          user_id: string
          volgorde?: number
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          omschrijving?: string | null
          status?: string
          titel?: string
          updated_at?: string
          user_id?: string
          volgorde?: number
        }
        Relationships: []
      }
      focus_sessies: {
        Row: {
          created_at: string
          duur_minuten: number
          id: string
          subtaak_id: string | null
          traject_id: string | null
          type: string
          user_id: string
          voltooid: boolean
        }
        Insert: {
          created_at?: string
          duur_minuten: number
          id?: string
          subtaak_id?: string | null
          traject_id?: string | null
          type: string
          user_id: string
          voltooid?: boolean
        }
        Update: {
          created_at?: string
          duur_minuten?: number
          id?: string
          subtaak_id?: string | null
          traject_id?: string | null
          type?: string
          user_id?: string
          voltooid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessies_subtaak_id_fkey"
            columns: ["subtaak_id"]
            isOneToOne: false
            referencedRelation: "subtaken"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_sessies_traject_id_fkey"
            columns: ["traject_id"]
            isOneToOne: false
            referencedRelation: "trajecten"
            referencedColumns: ["id"]
          },
        ]
      }
      geplande_taken: {
        Row: {
          blok_type: string
          created_at: string
          datum: string
          geschatte_duur: number
          id: string
          start_tijd: string | null
          status: string
          subtaak_id: string | null
          updated_at: string
          user_id: string
          volgorde: number
          vrije_tekst: string | null
        }
        Insert: {
          blok_type: string
          created_at?: string
          datum: string
          geschatte_duur: number
          id?: string
          start_tijd?: string | null
          status?: string
          subtaak_id?: string | null
          updated_at?: string
          user_id: string
          volgorde?: number
          vrije_tekst?: string | null
        }
        Update: {
          blok_type?: string
          created_at?: string
          datum?: string
          geschatte_duur?: number
          id?: string
          start_tijd?: string | null
          status?: string
          subtaak_id?: string | null
          updated_at?: string
          user_id?: string
          volgorde?: number
          vrije_tekst?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geplande_taken_subtaak_id_fkey"
            columns: ["subtaak_id"]
            isOneToOne: false
            referencedRelation: "subtaken"
            referencedColumns: ["id"]
          },
        ]
      }
      ideeen: {
        Row: {
          created_at: string
          id: string
          inhoud: string | null
          titel: string
          traject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inhoud?: string | null
          titel: string
          traject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inhoud?: string | null
          titel?: string
          traject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideeen_traject_id_fkey"
            columns: ["traject_id"]
            isOneToOne: false
            referencedRelation: "trajecten"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          created_at: string
          id: string
          tekst: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tekst: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tekst?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          bron: string
          created_at: string
          id: string
          inhoud: string
          resultaat_label: string | null
          traject_id: string | null
          user_id: string
        }
        Insert: {
          bron?: string
          created_at?: string
          id?: string
          inhoud: string
          resultaat_label?: string | null
          traject_id?: string | null
          user_id: string
        }
        Update: {
          bron?: string
          created_at?: string
          id?: string
          inhoud?: string
          resultaat_label?: string | null
          traject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_traject_id_fkey"
            columns: ["traject_id"]
            isOneToOne: false
            referencedRelation: "trajecten"
            referencedColumns: ["id"]
          },
        ]
      }
      klanten: {
        Row: {
          adres: string | null
          btw: string | null
          created_at: string
          domeinen: string[]
          id: string
          kvk: string | null
          naam: string
          notities: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          adres?: string | null
          btw?: string | null
          created_at?: string
          domeinen?: string[]
          id?: string
          kvk?: string | null
          naam: string
          notities?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          adres?: string | null
          btw?: string | null
          created_at?: string
          domeinen?: string[]
          id?: string
          kvk?: string | null
          naam?: string
          notities?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      subtaken: {
        Row: {
          halte_id: string | null
          created_at: string
          geschatte_duur: number
          id: string
          klaar_op: string | null
          status: string
          tekst: string
          traject_id: string | null
          user_id: string
          volgorde: number
        }
        Insert: {
          halte_id?: string | null
          created_at?: string
          geschatte_duur: number
          id?: string
          klaar_op?: string | null
          status?: string
          tekst: string
          traject_id?: string | null
          user_id: string
          volgorde?: number
        }
        Update: {
          halte_id?: string | null
          created_at?: string
          geschatte_duur?: number
          id?: string
          klaar_op?: string | null
          status?: string
          tekst?: string
          traject_id?: string | null
          user_id?: string
          volgorde?: number
        }
        Relationships: [
          {
            foreignKeyName: "subtaken_traject_id_fkey"
            columns: ["traject_id"]
            isOneToOne: false
            referencedRelation: "trajecten"
            referencedColumns: ["id"]
          },
        ]
      }
      tijdschatting_correcties: {
        Row: {
          aangepaste_duur: number
          context: string | null
          created_at: string
          geschatte_duur: number
          id: string
          omschrijving: string
          user_id: string
        }
        Insert: {
          aangepaste_duur: number
          context?: string | null
          created_at?: string
          geschatte_duur: number
          id?: string
          omschrijving: string
          user_id: string
        }
        Update: {
          aangepaste_duur?: number
          context?: string | null
          created_at?: string
          geschatte_duur?: number
          id?: string
          omschrijving?: string
          user_id?: string
        }
        Relationships: []
      }
      traject_bestanden: {
        Row: {
          created_at: string
          id: string
          kind: string
          naam: string
          traject_id: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          naam: string
          traject_id: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          naam?: string
          traject_id?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traject_bestanden_traject_id_fkey"
            columns: ["traject_id"]
            isOneToOne: false
            referencedRelation: "trajecten"
            referencedColumns: ["id"]
          },
        ]
      }
      traject_haltes: {
        Row: {
          afgerond_op: string | null
          created_at: string
          dienst: string
          fase: string
          icoon: string
          id: string
          streefdatum: string | null
          titel: string
          traject_id: string
          user_id: string
          volgorde: number
        }
        Insert: {
          afgerond_op?: string | null
          created_at?: string
          dienst?: string
          fase?: string
          icoon?: string
          id?: string
          streefdatum?: string | null
          titel: string
          traject_id: string
          user_id: string
          volgorde?: number
        }
        Update: {
          afgerond_op?: string | null
          created_at?: string
          dienst?: string
          fase?: string
          icoon?: string
          id?: string
          streefdatum?: string | null
          titel?: string
          traject_id?: string
          user_id?: string
          volgorde?: number
        }
        Relationships: []
      }
      trajecten: {
        Row: {
          diensten: string[]
          bedrag_afgesproken: number | null
          bedrag_gefactureerd: number | null
          contact_id: string | null
          created_at: string
          doel_id: string | null
          eerstvolgende_actie: string | null
          financieel_notitie: string | null
          id: string
          klant_id: string | null
          kleur: string
          naam: string
          scope: string
          status: string
          streefdatum: string | null
          updated_at: string
          user_id: string
          wacht_op: string | null
        }
        Insert: {
          diensten?: string[]
          bedrag_afgesproken?: number | null
          bedrag_gefactureerd?: number | null
          contact_id?: string | null
          created_at?: string
          doel_id?: string | null
          eerstvolgende_actie?: string | null
          financieel_notitie?: string | null
          id?: string
          klant_id?: string | null
          kleur?: string
          naam: string
          scope?: string
          status?: string
          streefdatum?: string | null
          updated_at?: string
          user_id: string
          wacht_op?: string | null
        }
        Update: {
          diensten?: string[]
          bedrag_afgesproken?: number | null
          bedrag_gefactureerd?: number | null
          contact_id?: string | null
          created_at?: string
          doel_id?: string | null
          eerstvolgende_actie?: string | null
          financieel_notitie?: string | null
          id?: string
          klant_id?: string | null
          kleur?: string
          naam?: string
          scope?: string
          status?: string
          streefdatum?: string | null
          updated_at?: string
          user_id?: string
          wacht_op?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trajecten_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trajecten_doel_id_fkey"
            columns: ["doel_id"]
            isOneToOne: false
            referencedRelation: "doelen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trajecten_klant_id_fkey"
            columns: ["klant_id"]
            isOneToOne: false
            referencedRelation: "klanten"
            referencedColumns: ["id"]
          },
        ]
      }
      vandaag_prioriteiten: {
        Row: {
          created_at: string
          datum: string
          id: string
          klaar: boolean
          tekst: string
          user_id: string
          volgorde: number
        }
        Insert: {
          created_at?: string
          datum: string
          id?: string
          klaar?: boolean
          tekst: string
          user_id: string
          volgorde?: number
        }
        Update: {
          created_at?: string
          datum?: string
          id?: string
          klaar?: boolean
          tekst?: string
          user_id?: string
          volgorde?: number
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
