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
      entreprises: {
        Row: {
          adresse: string | null
          code_postal: string | null
          commercial_id: string | null
          compte_active: boolean
          created_at: string
          email_contact: string | null
          id: string
          nom: string
          palier_remise: Database["public"]["Enums"]["palier_remise"]
          siret: string | null
          telephone: string | null
          type_client: Database["public"]["Enums"]["type_client"]
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          code_postal?: string | null
          commercial_id?: string | null
          compte_active?: boolean
          created_at?: string
          email_contact?: string | null
          id?: string
          nom: string
          palier_remise?: Database["public"]["Enums"]["palier_remise"]
          siret?: string | null
          telephone?: string | null
          type_client?: Database["public"]["Enums"]["type_client"]
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          code_postal?: string | null
          commercial_id?: string | null
          compte_active?: boolean
          created_at?: string
          email_contact?: string | null
          id?: string
          nom?: string
          palier_remise?: Database["public"]["Enums"]["palier_remise"]
          siret?: string | null
          telephone?: string | null
          type_client?: Database["public"]["Enums"]["type_client"]
          ville?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          entreprise_id: string | null
          id: string
          nom: string | null
          prenom: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          entreprise_id?: string | null
          id: string
          nom?: string | null
          prenom?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          entreprise_id?: string | null
          id?: string
          nom?: string | null
          prenom?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicules: {
        Row: {
          annee: number | null
          couleur: string | null
          created_at: string
          entreprise_id: string
          id: string
          immatriculation: string
          kilometrage: number | null
          marque: string | null
          modele: string | null
          notes: string | null
          photo_path: string | null
          statut: Database["public"]["Enums"]["statut_vehicule"]
          type_pack_souhaite: string | null
          type_vehicule: Database["public"]["Enums"]["type_vehicule"] | null
        }
        Insert: {
          annee?: number | null
          couleur?: string | null
          created_at?: string
          entreprise_id: string
          id?: string
          immatriculation: string
          kilometrage?: number | null
          marque?: string | null
          modele?: string | null
          notes?: string | null
          photo_path?: string | null
          statut?: Database["public"]["Enums"]["statut_vehicule"]
          type_pack_souhaite?: string | null
          type_vehicule?: Database["public"]["Enums"]["type_vehicule"] | null
        }
        Update: {
          annee?: number | null
          couleur?: string | null
          created_at?: string
          entreprise_id?: string
          id?: string
          immatriculation?: string
          kilometrage?: number | null
          marque?: string | null
          modele?: string | null
          notes?: string | null
          photo_path?: string | null
          statut?: Database["public"]["Enums"]["statut_vehicule"]
          type_pack_souhaite?: string | null
          type_vehicule?: Database["public"]["Enums"]["type_vehicule"] | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicules_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_entreprise: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "commercial" | "operateur" | "client"
      palier_remise: "starter" | "pro" | "business" | "premium"
      statut_vehicule:
        | "actif"
        | "en_attente_validation"
        | "remplace"
        | "archive"
      type_client: "flotte" | "concession" | "vtc" | "autre"
      type_vehicule: "citadine" | "berline" | "suv_break" | "utilitaire"
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
      app_role: ["admin", "staff", "commercial", "operateur", "client"],
      palier_remise: ["starter", "pro", "business", "premium"],
      statut_vehicule: [
        "actif",
        "en_attente_validation",
        "remplace",
        "archive",
      ],
      type_client: ["flotte", "concession", "vtc", "autre"],
      type_vehicule: ["citadine", "berline", "suv_break", "utilitaire"],
    },
  },
} as const
