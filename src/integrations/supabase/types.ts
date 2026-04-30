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
      admin_actions_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          nb_entites_impactees: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          nb_entites_impactees?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          nb_entites_impactees?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      contrat_avenants: {
        Row: {
          contrat_id: string
          date_generation: string
          genere_par: string | null
          id: string
          type: string
          url: string
        }
        Insert: {
          contrat_id: string
          date_generation?: string
          genere_par?: string | null
          id?: string
          type?: string
          url: string
        }
        Update: {
          contrat_id?: string
          date_generation?: string
          genere_par?: string | null
          id?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrat_avenants_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "contrats"
            referencedColumns: ["id"]
          },
        ]
      }
      contrat_lignes: {
        Row: {
          contrat_id: string
          created_at: string
          id: string
          nb_vehicules: number
          prix_unitaire_ht: number
          statut_ligne: string
          type_pack: string
        }
        Insert: {
          contrat_id: string
          created_at?: string
          id?: string
          nb_vehicules?: number
          prix_unitaire_ht: number
          statut_ligne?: string
          type_pack: string
        }
        Update: {
          contrat_id?: string
          created_at?: string
          id?: string
          nb_vehicules?: number
          prix_unitaire_ht?: number
          statut_ligne?: string
          type_pack?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrat_lignes_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "contrats"
            referencedColumns: ["id"]
          },
        ]
      }
      contrats: {
        Row: {
          created_at: string
          date_anniversaire: string | null
          date_debut: string
          date_fin: string | null
          engagement_annuel: boolean
          entreprise_id: string
          gel_actif: boolean
          gel_date_debut: string | null
          gel_date_fin: string | null
          gel_justificatif_url: string | null
          gel_type: Database["public"]["Enums"]["gel_type_enum"] | null
          id: string
          mode_paiement: Database["public"]["Enums"]["mode_paiement_enum"]
          numero_contrat: string | null
          passages_mois: number
          passages_reportes: number
          passages_restants_mois: number
          statut: Database["public"]["Enums"]["contrat_statut_enum"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_anniversaire?: string | null
          date_debut?: string
          date_fin?: string | null
          engagement_annuel?: boolean
          entreprise_id: string
          gel_actif?: boolean
          gel_date_debut?: string | null
          gel_date_fin?: string | null
          gel_justificatif_url?: string | null
          gel_type?: Database["public"]["Enums"]["gel_type_enum"] | null
          id?: string
          mode_paiement?: Database["public"]["Enums"]["mode_paiement_enum"]
          numero_contrat?: string | null
          passages_mois?: number
          passages_reportes?: number
          passages_restants_mois?: number
          statut?: Database["public"]["Enums"]["contrat_statut_enum"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_anniversaire?: string | null
          date_debut?: string
          date_fin?: string | null
          engagement_annuel?: boolean
          entreprise_id?: string
          gel_actif?: boolean
          gel_date_debut?: string | null
          gel_date_fin?: string | null
          gel_justificatif_url?: string | null
          gel_type?: Database["public"]["Enums"]["gel_type_enum"] | null
          id?: string
          mode_paiement?: Database["public"]["Enums"]["mode_paiement_enum"]
          numero_contrat?: string | null
          passages_mois?: number
          passages_reportes?: number
          passages_restants_mois?: number
          statut?: Database["public"]["Enums"]["contrat_statut_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrats_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes_rdv: {
        Row: {
          commentaires: string | null
          created_at: string
          creneaux_preferes: Json
          derogation_min_vehicules: boolean
          derogation_motif: string | null
          entreprise_id: string
          id: string
          nb_vehicules_rdv: number
          statut: string
          updated_at: string
        }
        Insert: {
          commentaires?: string | null
          created_at?: string
          creneaux_preferes?: Json
          derogation_min_vehicules?: boolean
          derogation_motif?: string | null
          entreprise_id: string
          id?: string
          nb_vehicules_rdv?: number
          statut?: string
          updated_at?: string
        }
        Update: {
          commentaires?: string | null
          created_at?: string
          creneaux_preferes?: Json
          derogation_min_vehicules?: boolean
          derogation_motif?: string | null
          entreprise_id?: string
          id?: string
          nb_vehicules_rdv?: number
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandes_rdv_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
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
      intervention_photos: {
        Row: {
          created_at: string
          id: string
          intervention_id: string
          moment: string
          ordre: number
          url: string
          zone: string
        }
        Insert: {
          created_at?: string
          id?: string
          intervention_id: string
          moment: string
          ordre?: number
          url: string
          zone: string
        }
        Update: {
          created_at?: string
          id?: string
          intervention_id?: string
          moment?: string
          ordre?: number
          url?: string
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_photos_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          checklist_exterieur: Json
          checklist_interieur: Json
          cles_documents_localisation: string | null
          controle_cles_documents: boolean
          controle_degradations: boolean
          controle_objets_valeur: boolean
          created_at: string
          date_intervention: string | null
          degradations_description: string | null
          entreprise_id: string | null
          id: string
          motif_refus: string | null
          notes_operateur: string | null
          operateur_id: string | null
          signature_url: string | null
          statut: string
          submitted_at: string | null
          type_prestation: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          vehicule_id: string | null
        }
        Insert: {
          checklist_exterieur?: Json
          checklist_interieur?: Json
          cles_documents_localisation?: string | null
          controle_cles_documents?: boolean
          controle_degradations?: boolean
          controle_objets_valeur?: boolean
          created_at?: string
          date_intervention?: string | null
          degradations_description?: string | null
          entreprise_id?: string | null
          id?: string
          motif_refus?: string | null
          notes_operateur?: string | null
          operateur_id?: string | null
          signature_url?: string | null
          statut?: string
          submitted_at?: string | null
          type_prestation?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          vehicule_id?: string | null
        }
        Update: {
          checklist_exterieur?: Json
          checklist_interieur?: Json
          cles_documents_localisation?: string | null
          controle_cles_documents?: boolean
          controle_degradations?: boolean
          controle_objets_valeur?: boolean
          created_at?: string
          date_intervention?: string | null
          degradations_description?: string | null
          entreprise_id?: string | null
          id?: string
          motif_refus?: string | null
          notes_operateur?: string | null
          operateur_id?: string | null
          signature_url?: string | null
          statut?: string
          submitted_at?: string | null
          type_prestation?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interventions_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      parrainages: {
        Row: {
          code_parrainage: string
          date_parrainage: string
          date_premiere_mensualite: string | null
          filleul_id: string | null
          id: string
          parrain_id: string
          recompense_filleul_appliquee: boolean
          recompense_parrain_appliquee: boolean
          statut: string
        }
        Insert: {
          code_parrainage: string
          date_parrainage?: string
          date_premiere_mensualite?: string | null
          filleul_id?: string | null
          id?: string
          parrain_id: string
          recompense_filleul_appliquee?: boolean
          recompense_parrain_appliquee?: boolean
          statut?: string
        }
        Update: {
          code_parrainage?: string
          date_parrainage?: string
          date_premiere_mensualite?: string | null
          filleul_id?: string | null
          id?: string
          parrain_id?: string
          recompense_filleul_appliquee?: boolean
          recompense_parrain_appliquee?: boolean
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "parrainages_filleul_id_fkey"
            columns: ["filleul_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parrainages_parrain_id_fkey"
            columns: ["parrain_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
      prestations_catalogue: {
        Row: {
          code: string
          created_at: string
          duree_minutes: number | null
          est_abonnement: boolean
          est_one_shot: boolean
          id: string
          nom: string
          passages_mois: number | null
          prix_ht: number
          type_prestation: Database["public"]["Enums"]["type_prestation_enum"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          duree_minutes?: number | null
          est_abonnement?: boolean
          est_one_shot?: boolean
          id?: string
          nom: string
          passages_mois?: number | null
          prix_ht: number
          type_prestation: Database["public"]["Enums"]["type_prestation_enum"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          duree_minutes?: number | null
          est_abonnement?: boolean
          est_one_shot?: boolean
          id?: string
          nom?: string
          passages_mois?: number | null
          prix_ht?: number
          type_prestation?: Database["public"]["Enums"]["type_prestation_enum"]
          updated_at?: string
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
          contrat_id: string | null
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
          contrat_id?: string | null
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
          contrat_id?: string | null
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
            foreignKeyName: "vehicules_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "contrats"
            referencedColumns: ["id"]
          },
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
      contrat_statut_enum: "actif" | "suspendu" | "resilie" | "en_cours_gel"
      gel_type_enum: "programme" | "sinistre"
      mode_paiement_enum: "sepa" | "virement" | "stripe"
      palier_remise: "starter" | "pro" | "business" | "premium"
      statut_vehicule:
        | "actif"
        | "en_attente_validation"
        | "remplace"
        | "archive"
        | "refuse"
      type_client: "flotte" | "concession" | "vtc" | "autre"
      type_prestation_enum:
        | "pack_interieur"
        | "pack_standard"
        | "pack_vtc"
        | "concession_one_shot"
        | "fin_de_bail_one_shot"
        | "supplement_poils"
        | "supplement_coffre"
        | "supplement_ozone"
        | "supplement_puzzi"
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
      contrat_statut_enum: ["actif", "suspendu", "resilie", "en_cours_gel"],
      gel_type_enum: ["programme", "sinistre"],
      mode_paiement_enum: ["sepa", "virement", "stripe"],
      palier_remise: ["starter", "pro", "business", "premium"],
      statut_vehicule: [
        "actif",
        "en_attente_validation",
        "remplace",
        "archive",
        "refuse",
      ],
      type_client: ["flotte", "concession", "vtc", "autre"],
      type_prestation_enum: [
        "pack_interieur",
        "pack_standard",
        "pack_vtc",
        "concession_one_shot",
        "fin_de_bail_one_shot",
        "supplement_poils",
        "supplement_coffre",
        "supplement_ozone",
        "supplement_puzzi",
      ],
      type_vehicule: ["citadine", "berline", "suv_break", "utilitaire"],
    },
  },
} as const
