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
      app_config: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      avis_clients: {
        Row: {
          auteur_nom: string
          auteur_role: string | null
          created_at: string
          google_review_id: string | null
          id: string
          note: number | null
          photo_url: string | null
          publie: boolean
          source: string
          texte: string
        }
        Insert: {
          auteur_nom: string
          auteur_role?: string | null
          created_at?: string
          google_review_id?: string | null
          id?: string
          note?: number | null
          photo_url?: string | null
          publie?: boolean
          source?: string
          texte: string
        }
        Update: {
          auteur_nom?: string
          auteur_role?: string | null
          created_at?: string
          google_review_id?: string | null
          id?: string
          note?: number | null
          photo_url?: string | null
          publie?: boolean
          source?: string
          texte?: string
        }
        Relationships: []
      }
      avoirs: {
        Row: {
          annee_fiscale: number
          created_at: string
          created_by: string | null
          date_emission: string
          devise: string
          emitted_at: string
          facture_id: string
          id: string
          montant_ht: number
          montant_ttc: number
          motif: string
          numero_avoir: string
          numero_sequentiel: number
          serie: Database["public"]["Enums"]["serie_facture_enum"]
          snapshot_facture_origine: Json
          tva_montant: number
          tva_taux: number
          type_avoir: string
        }
        Insert: {
          annee_fiscale: number
          created_at?: string
          created_by?: string | null
          date_emission: string
          devise?: string
          emitted_at?: string
          facture_id: string
          id?: string
          montant_ht: number
          montant_ttc: number
          motif: string
          numero_avoir: string
          numero_sequentiel: number
          serie: Database["public"]["Enums"]["serie_facture_enum"]
          snapshot_facture_origine: Json
          tva_montant?: number
          tva_taux?: number
          type_avoir: string
        }
        Update: {
          annee_fiscale?: number
          created_at?: string
          created_by?: string | null
          date_emission?: string
          devise?: string
          emitted_at?: string
          facture_id?: string
          id?: string
          montant_ht?: number
          montant_ttc?: number
          motif?: string
          numero_avoir?: string
          numero_sequentiel?: number
          serie?: Database["public"]["Enums"]["serie_facture_enum"]
          snapshot_facture_origine?: Json
          tva_montant?: number
          tva_taux?: number
          type_avoir?: string
        }
        Relationships: [
          {
            foreignKeyName: "avoirs_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "contrat_avenants_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_passages_restants"
            referencedColumns: ["contrat_id"]
          },
          {
            foreignKeyName: "contrat_avenants_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_resume"
            referencedColumns: ["contrat_id"]
          },
          {
            foreignKeyName: "contrat_avenants_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_resume"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrat_avenants_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["contrat_actif_id"]
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
          {
            foreignKeyName: "contrat_lignes_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_passages_restants"
            referencedColumns: ["contrat_id"]
          },
          {
            foreignKeyName: "contrat_lignes_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_resume"
            referencedColumns: ["contrat_id"]
          },
          {
            foreignKeyName: "contrat_lignes_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_resume"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrat_lignes_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["contrat_actif_id"]
          },
        ]
      }
      contrat_sequences: {
        Row: {
          annee_mois: string
          derniere_sequence: number
          updated_at: string
        }
        Insert: {
          annee_mois: string
          derniere_sequence?: number
          updated_at?: string
        }
        Update: {
          annee_mois?: string
          derniere_sequence?: number
          updated_at?: string
        }
        Relationships: []
      }
      contrats: {
        Row: {
          commercial_signataire_id: string | null
          created_at: string
          date_anniversaire: string | null
          date_debut: string
          date_dernier_passage: string | null
          date_fin: string | null
          date_fin_engagement: string | null
          date_paiement_anticipe: string | null
          date_resiliation: string | null
          engagement_annuel: boolean
          engagement_type:
            | Database["public"]["Enums"]["engagement_type_enum"]
            | null
          entreprise_id: string
          gel_actif: boolean
          gel_commentaire: string | null
          gel_date_debut: string | null
          gel_date_fin: string | null
          gel_justificatif_url: string | null
          gel_notifier_client: boolean
          gel_type: Database["public"]["Enums"]["gel_type_enum"] | null
          id: string
          mode_paiement: Database["public"]["Enums"]["mode_paiement_enum"]
          montant_brut_mensuel: number | null
          montant_net_mensuel: number | null
          multiplicateur_prix: number | null
          nb_vehicules_actifs: number | null
          numero_contrat: string | null
          paiement_anticipe_total: boolean
          palier: string | null
          passages_mois: number
          passages_reportes: number
          passages_restants_mois: number
          plage_horaire_preferee: string | null
          planning_niveau:
            | Database["public"]["Enums"]["planning_niveau_enum"]
            | null
          preavis_deadline: string | null
          preavis_envoye_le: string | null
          remise_commerciale_auteur_id: string | null
          remise_commerciale_date: string | null
          remise_commerciale_justification: string | null
          remise_commerciale_pct: number
          remise_pct: number | null
          status_cycle: Database["public"]["Enums"]["status_cycle_enum"]
          statut: Database["public"]["Enums"]["contrat_statut_enum"]
          updated_at: string
        }
        Insert: {
          commercial_signataire_id?: string | null
          created_at?: string
          date_anniversaire?: string | null
          date_debut?: string
          date_dernier_passage?: string | null
          date_fin?: string | null
          date_fin_engagement?: string | null
          date_paiement_anticipe?: string | null
          date_resiliation?: string | null
          engagement_annuel?: boolean
          engagement_type?:
            | Database["public"]["Enums"]["engagement_type_enum"]
            | null
          entreprise_id: string
          gel_actif?: boolean
          gel_commentaire?: string | null
          gel_date_debut?: string | null
          gel_date_fin?: string | null
          gel_justificatif_url?: string | null
          gel_notifier_client?: boolean
          gel_type?: Database["public"]["Enums"]["gel_type_enum"] | null
          id?: string
          mode_paiement?: Database["public"]["Enums"]["mode_paiement_enum"]
          montant_brut_mensuel?: number | null
          montant_net_mensuel?: number | null
          multiplicateur_prix?: number | null
          nb_vehicules_actifs?: number | null
          numero_contrat?: string | null
          paiement_anticipe_total?: boolean
          palier?: string | null
          passages_mois?: number
          passages_reportes?: number
          passages_restants_mois?: number
          plage_horaire_preferee?: string | null
          planning_niveau?:
            | Database["public"]["Enums"]["planning_niveau_enum"]
            | null
          preavis_deadline?: string | null
          preavis_envoye_le?: string | null
          remise_commerciale_auteur_id?: string | null
          remise_commerciale_date?: string | null
          remise_commerciale_justification?: string | null
          remise_commerciale_pct?: number
          remise_pct?: number | null
          status_cycle?: Database["public"]["Enums"]["status_cycle_enum"]
          statut?: Database["public"]["Enums"]["contrat_statut_enum"]
          updated_at?: string
        }
        Update: {
          commercial_signataire_id?: string | null
          created_at?: string
          date_anniversaire?: string | null
          date_debut?: string
          date_dernier_passage?: string | null
          date_fin?: string | null
          date_fin_engagement?: string | null
          date_paiement_anticipe?: string | null
          date_resiliation?: string | null
          engagement_annuel?: boolean
          engagement_type?:
            | Database["public"]["Enums"]["engagement_type_enum"]
            | null
          entreprise_id?: string
          gel_actif?: boolean
          gel_commentaire?: string | null
          gel_date_debut?: string | null
          gel_date_fin?: string | null
          gel_justificatif_url?: string | null
          gel_notifier_client?: boolean
          gel_type?: Database["public"]["Enums"]["gel_type_enum"] | null
          id?: string
          mode_paiement?: Database["public"]["Enums"]["mode_paiement_enum"]
          montant_brut_mensuel?: number | null
          montant_net_mensuel?: number | null
          multiplicateur_prix?: number | null
          nb_vehicules_actifs?: number | null
          numero_contrat?: string | null
          paiement_anticipe_total?: boolean
          palier?: string | null
          passages_mois?: number
          passages_reportes?: number
          passages_restants_mois?: number
          plage_horaire_preferee?: string | null
          planning_niveau?:
            | Database["public"]["Enums"]["planning_niveau_enum"]
            | null
          preavis_deadline?: string | null
          preavis_envoye_le?: string | null
          remise_commerciale_auteur_id?: string | null
          remise_commerciale_date?: string | null
          remise_commerciale_justification?: string | null
          remise_commerciale_pct?: number
          remise_pct?: number | null
          status_cycle?: Database["public"]["Enums"]["status_cycle_enum"]
          statut?: Database["public"]["Enums"]["contrat_statut_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrats_commercial_signataire_id_fkey"
            columns: ["commercial_signataire_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_actives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["entreprise_id"]
          },
          {
            foreignKeyName: "contrats_remise_commerciale_auteur_id_fkey"
            columns: ["remise_commerciale_auteur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creneaux_recurrents_garantis: {
        Row: {
          actif: boolean
          contrat_id: string
          created_at: string
          created_by: string | null
          date_debut: string
          date_fin: string
          frequence_semaines: number
          heure_debut: string
          heure_fin: string
          id: string
          jour_semaine: number
          notes: string | null
          operateur_id: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          contrat_id: string
          created_at?: string
          created_by?: string | null
          date_debut: string
          date_fin: string
          frequence_semaines?: number
          heure_debut: string
          heure_fin: string
          id?: string
          jour_semaine: number
          notes?: string | null
          operateur_id?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          contrat_id?: string
          created_at?: string
          created_by?: string | null
          date_debut?: string
          date_fin?: string
          frequence_semaines?: number
          heure_debut?: string
          heure_fin?: string
          id?: string
          jour_semaine?: number
          notes?: string | null
          operateur_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creneaux_recurrents_garantis_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "contrats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creneaux_recurrents_garantis_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_passages_restants"
            referencedColumns: ["contrat_id"]
          },
          {
            foreignKeyName: "creneaux_recurrents_garantis_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_resume"
            referencedColumns: ["contrat_id"]
          },
          {
            foreignKeyName: "creneaux_recurrents_garantis_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_resume"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creneaux_recurrents_garantis_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["contrat_actif_id"]
          },
        ]
      }
      demandes_gel: {
        Row: {
          contrat_id: string
          created_at: string
          created_by: string
          date_debut: string
          date_fin_effective: string | null
          date_fin_prevue: string
          email_sent_at: string | null
          email_status: string | null
          entreprise_id: string
          id: string
          motif: string
          refus_motif: string | null
          statut: string
          type_demande: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          vehicule_ids: string[] | null
        }
        Insert: {
          contrat_id: string
          created_at?: string
          created_by: string
          date_debut: string
          date_fin_effective?: string | null
          date_fin_prevue: string
          email_sent_at?: string | null
          email_status?: string | null
          entreprise_id: string
          id?: string
          motif: string
          refus_motif?: string | null
          statut?: string
          type_demande: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          vehicule_ids?: string[] | null
        }
        Update: {
          contrat_id?: string
          created_at?: string
          created_by?: string
          date_debut?: string
          date_fin_effective?: string | null
          date_fin_prevue?: string
          email_sent_at?: string | null
          email_status?: string | null
          entreprise_id?: string
          id?: string
          motif?: string
          refus_motif?: string | null
          statut?: string
          type_demande?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          vehicule_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "demandes_gel_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "contrats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_gel_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_passages_restants"
            referencedColumns: ["contrat_id"]
          },
          {
            foreignKeyName: "demandes_gel_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_resume"
            referencedColumns: ["contrat_id"]
          },
          {
            foreignKeyName: "demandes_gel_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_resume"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_gel_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["contrat_actif_id"]
          },
          {
            foreignKeyName: "demandes_gel_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_gel_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_gel_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_actives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_gel_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["entreprise_id"]
          },
          {
            foreignKeyName: "demandes_gel_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes_rdv: {
        Row: {
          adresse_intervention: string | null
          annulation_motif: string | null
          annule_par: string | null
          assigned_date: string | null
          assigned_heure: string | null
          assigned_operator_id: string | null
          assigned_time_slot: string | null
          code_postal_intervention: string | null
          commentaires: string | null
          created_at: string
          creneaux_preferes: Json
          date_confirmee: string | null
          derogation_min_vehicules: boolean
          derogation_motif: string | null
          email_sent_at: string | null
          email_status: string | null
          entreprise_id: string
          id: string
          latitude: number | null
          longitude: number | null
          nb_vehicules_rdv: number | null
          statut: string
          telephone_intervention: string | null
          updated_at: string
          vehicule_confirme_id: string | null
          vehicule_ids: string[]
          ville_intervention: string | null
        }
        Insert: {
          adresse_intervention?: string | null
          annulation_motif?: string | null
          annule_par?: string | null
          assigned_date?: string | null
          assigned_heure?: string | null
          assigned_operator_id?: string | null
          assigned_time_slot?: string | null
          code_postal_intervention?: string | null
          commentaires?: string | null
          created_at?: string
          creneaux_preferes?: Json
          date_confirmee?: string | null
          derogation_min_vehicules?: boolean
          derogation_motif?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          entreprise_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nb_vehicules_rdv?: number | null
          statut?: string
          telephone_intervention?: string | null
          updated_at?: string
          vehicule_confirme_id?: string | null
          vehicule_ids?: string[]
          ville_intervention?: string | null
        }
        Update: {
          adresse_intervention?: string | null
          annulation_motif?: string | null
          annule_par?: string | null
          assigned_date?: string | null
          assigned_heure?: string | null
          assigned_operator_id?: string | null
          assigned_time_slot?: string | null
          code_postal_intervention?: string | null
          commentaires?: string | null
          created_at?: string
          creneaux_preferes?: Json
          date_confirmee?: string | null
          derogation_min_vehicules?: boolean
          derogation_motif?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          entreprise_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nb_vehicules_rdv?: number | null
          statut?: string
          telephone_intervention?: string | null
          updated_at?: string
          vehicule_confirme_id?: string | null
          vehicule_ids?: string[]
          ville_intervention?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demandes_rdv_assigned_operator_id_fkey"
            columns: ["assigned_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_rdv_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_rdv_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_actives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_rdv_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["entreprise_id"]
          },
        ]
      }
      disponibilites_operateurs: {
        Row: {
          actif: boolean
          created_at: string
          created_by: string | null
          date_debut_validite: string | null
          date_fin_validite: string | null
          heure_debut: string
          heure_fin: string
          id: string
          jour_semaine: number
          operateur_id: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          created_by?: string | null
          date_debut_validite?: string | null
          date_fin_validite?: string | null
          heure_debut: string
          heure_fin: string
          id?: string
          jour_semaine: number
          operateur_id: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          created_by?: string | null
          date_debut_validite?: string | null
          date_fin_validite?: string | null
          heure_debut?: string
          heure_fin?: string
          id?: string
          jour_semaine?: number
          operateur_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string | null
          email_to: string | null
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          target_id: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          email_to?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          target_id?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          email_to?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          target_id?: string | null
          type?: string
        }
        Relationships: []
      }
      entreprise_acces_commerciaux: {
        Row: {
          commercial_id: string
          entreprise_id: string
          granted_at: string
          granted_reason: string | null
          id: string
        }
        Insert: {
          commercial_id: string
          entreprise_id: string
          granted_at?: string
          granted_reason?: string | null
          id?: string
        }
        Update: {
          commercial_id?: string
          entreprise_id?: string
          granted_at?: string
          granted_reason?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entreprise_acces_commerciaux_commercial_id_fkey"
            columns: ["commercial_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entreprise_acces_commerciaux_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entreprise_acces_commerciaux_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_actives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entreprise_acces_commerciaux_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["entreprise_id"]
          },
        ]
      }
      entreprises: {
        Row: {
          adresse: string | null
          archived_at: string | null
          archived_by: string | null
          archived_reason: string | null
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
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
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
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
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
        Relationships: [
          {
            foreignKeyName: "entreprises_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          annee_fiscale: number
          avoir_id: string | null
          contrat_id: string | null
          created_at: string
          created_by: string | null
          date_echeance: string | null
          date_emission: string | null
          date_paiement: string | null
          devise: string
          emitted_at: string | null
          entreprise_id: string | null
          id: string
          mention_tva_speciale: string | null
          mode_paiement: string | null
          montant_ht: number
          montant_ttc: number
          numero_facture: string | null
          numero_sequentiel: number | null
          periode_debut: string
          periode_fin: string
          regime_tva: Database["public"]["Enums"]["regime_tva_enum"]
          serie: Database["public"]["Enums"]["serie_facture_enum"]
          snapshot_client: Json | null
          snapshot_contrat: Json | null
          snapshot_izox: Json | null
          snapshot_prestations: Json | null
          statut: Database["public"]["Enums"]["statut_facture_enum"]
          tva_montant: number
          tva_taux: number
        }
        Insert: {
          annee_fiscale: number
          avoir_id?: string | null
          contrat_id?: string | null
          created_at?: string
          created_by?: string | null
          date_echeance?: string | null
          date_emission?: string | null
          date_paiement?: string | null
          devise?: string
          emitted_at?: string | null
          entreprise_id?: string | null
          id?: string
          mention_tva_speciale?: string | null
          mode_paiement?: string | null
          montant_ht?: number
          montant_ttc?: number
          numero_facture?: string | null
          numero_sequentiel?: number | null
          periode_debut: string
          periode_fin: string
          regime_tva?: Database["public"]["Enums"]["regime_tva_enum"]
          serie: Database["public"]["Enums"]["serie_facture_enum"]
          snapshot_client?: Json | null
          snapshot_contrat?: Json | null
          snapshot_izox?: Json | null
          snapshot_prestations?: Json | null
          statut?: Database["public"]["Enums"]["statut_facture_enum"]
          tva_montant?: number
          tva_taux?: number
        }
        Update: {
          annee_fiscale?: number
          avoir_id?: string | null
          contrat_id?: string | null
          created_at?: string
          created_by?: string | null
          date_echeance?: string | null
          date_emission?: string | null
          date_paiement?: string | null
          devise?: string
          emitted_at?: string | null
          entreprise_id?: string | null
          id?: string
          mention_tva_speciale?: string | null
          mode_paiement?: string | null
          montant_ht?: number
          montant_ttc?: number
          numero_facture?: string | null
          numero_sequentiel?: number | null
          periode_debut?: string
          periode_fin?: string
          regime_tva?: Database["public"]["Enums"]["regime_tva_enum"]
          serie?: Database["public"]["Enums"]["serie_facture_enum"]
          snapshot_client?: Json | null
          snapshot_contrat?: Json | null
          snapshot_izox?: Json | null
          snapshot_prestations?: Json | null
          statut?: Database["public"]["Enums"]["statut_facture_enum"]
          tva_montant?: number
          tva_taux?: number
        }
        Relationships: [
          {
            foreignKeyName: "factures_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "contrats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_passages_restants"
            referencedColumns: ["contrat_id"]
          },
          {
            foreignKeyName: "factures_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_resume"
            referencedColumns: ["contrat_id"]
          },
          {
            foreignKeyName: "factures_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_resume"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["contrat_actif_id"]
          },
          {
            foreignKeyName: "factures_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_actives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["entreprise_id"]
          },
          {
            foreignKeyName: "fk_factures_avoir"
            columns: ["avoir_id"]
            isOneToOne: false
            referencedRelation: "avoirs"
            referencedColumns: ["id"]
          },
        ]
      }
      factures_lignes: {
        Row: {
          created_at: string
          facture_id: string
          id: string
          intervention_id: string | null
          libelle: string
          montant_ht: number
          ordre_affichage: number
          prix_unitaire_ht: number | null
          quantite: number | null
          tva_taux: number | null
          type_ligne: string
        }
        Insert: {
          created_at?: string
          facture_id: string
          id?: string
          intervention_id?: string | null
          libelle: string
          montant_ht: number
          ordre_affichage?: number
          prix_unitaire_ht?: number | null
          quantite?: number | null
          tva_taux?: number | null
          type_ligne: string
        }
        Update: {
          created_at?: string
          facture_id?: string
          id?: string
          intervention_id?: string | null
          libelle?: string
          montant_ht?: number
          ordre_affichage?: number
          prix_unitaire_ht?: number | null
          quantite?: number | null
          tva_taux?: number | null
          type_ligne?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_lignes_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_lignes_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
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
          adresse_intervention: string | null
          checklist_exterieur: Json
          checklist_interieur: Json
          cles_documents_localisation: string | null
          code_postal_intervention: string | null
          contrat_ligne_id: string | null
          controle_cles_documents: boolean
          controle_degradations: boolean
          controle_objets_valeur: boolean
          created_at: string
          date_intervention: string | null
          degradations_description: string | null
          demande_rdv_id: string | null
          email_sent_at: string | null
          email_status: string | null
          entreprise_id: string | null
          heure_intervention: string | null
          id: string
          latitude: number | null
          longitude: number | null
          motif_refus: string | null
          notes_operateur: string | null
          operateur_id: string | null
          operator_id: string | null
          reservation_b2c_id: string | null
          signature_url: string | null
          source: string
          statut: string
          submitted_at: string | null
          telephone_intervention: string | null
          time_slot: string | null
          type_prestation: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          vehicule_id: string | null
          ville_intervention: string | null
        }
        Insert: {
          adresse_intervention?: string | null
          checklist_exterieur?: Json
          checklist_interieur?: Json
          cles_documents_localisation?: string | null
          code_postal_intervention?: string | null
          contrat_ligne_id?: string | null
          controle_cles_documents?: boolean
          controle_degradations?: boolean
          controle_objets_valeur?: boolean
          created_at?: string
          date_intervention?: string | null
          degradations_description?: string | null
          demande_rdv_id?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          entreprise_id?: string | null
          heure_intervention?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          motif_refus?: string | null
          notes_operateur?: string | null
          operateur_id?: string | null
          operator_id?: string | null
          reservation_b2c_id?: string | null
          signature_url?: string | null
          source?: string
          statut?: string
          submitted_at?: string | null
          telephone_intervention?: string | null
          time_slot?: string | null
          type_prestation?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          vehicule_id?: string | null
          ville_intervention?: string | null
        }
        Update: {
          adresse_intervention?: string | null
          checklist_exterieur?: Json
          checklist_interieur?: Json
          cles_documents_localisation?: string | null
          code_postal_intervention?: string | null
          contrat_ligne_id?: string | null
          controle_cles_documents?: boolean
          controle_degradations?: boolean
          controle_objets_valeur?: boolean
          created_at?: string
          date_intervention?: string | null
          degradations_description?: string | null
          demande_rdv_id?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          entreprise_id?: string | null
          heure_intervention?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          motif_refus?: string | null
          notes_operateur?: string | null
          operateur_id?: string | null
          operator_id?: string | null
          reservation_b2c_id?: string | null
          signature_url?: string | null
          source?: string
          statut?: string
          submitted_at?: string | null
          telephone_intervention?: string | null
          time_slot?: string | null
          type_prestation?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          vehicule_id?: string | null
          ville_intervention?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interventions_contrat_ligne_id_fkey"
            columns: ["contrat_ligne_id"]
            isOneToOne: false
            referencedRelation: "contrat_lignes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_contrat_ligne_id_fkey"
            columns: ["contrat_ligne_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_passages_restants"
            referencedColumns: ["contrat_ligne_id"]
          },
          {
            foreignKeyName: "interventions_demande_rdv_id_fkey"
            columns: ["demande_rdv_id"]
            isOneToOne: false
            referencedRelation: "demandes_rdv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_actives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["entreprise_id"]
          },
          {
            foreignKeyName: "interventions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_reservation_b2c_id_fkey"
            columns: ["reservation_b2c_id"]
            isOneToOne: false
            referencedRelation: "reservations_b2c"
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
      jours_indisponibles_izox: {
        Row: {
          created_at: string
          created_by: string | null
          date_debut: string
          date_fin: string
          id: string
          motif: string
          operateur_id: string | null
          type_indisponibilite: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_debut: string
          date_fin: string
          id?: string
          motif: string
          operateur_id?: string | null
          type_indisponibilite: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_debut?: string
          date_fin?: string
          id?: string
          motif?: string
          operateur_id?: string | null
          type_indisponibilite?: string
        }
        Relationships: []
      }
      leads_landing: {
        Row: {
          code_postal: string | null
          created_at: string
          email: string
          id: string
          nom: string | null
          societe: string | null
          taille_flotte: string | null
          telephone: string | null
          traite: boolean
          type: string
        }
        Insert: {
          code_postal?: string | null
          created_at?: string
          email: string
          id?: string
          nom?: string | null
          societe?: string | null
          taille_flotte?: string | null
          telephone?: string | null
          traite?: boolean
          type: string
        }
        Update: {
          code_postal?: string | null
          created_at?: string
          email?: string
          id?: string
          nom?: string | null
          societe?: string | null
          taille_flotte?: string | null
          telephone?: string | null
          traite?: boolean
          type?: string
        }
        Relationships: []
      }
      notifications_internes: {
        Row: {
          action_requise: boolean
          archived_at: string | null
          created_at: string
          details: Json | null
          epingle_at: string | null
          epingle_equipe: boolean
          epingle_par: string | null
          id: string
          link_url: string | null
          read_at: string | null
          severite: string
          source_action: string
          source_log_id: string | null
          statut: Database["public"]["Enums"]["notification_statut_enum"]
          titre: string
          user_id: string
        }
        Insert: {
          action_requise?: boolean
          archived_at?: string | null
          created_at?: string
          details?: Json | null
          epingle_at?: string | null
          epingle_equipe?: boolean
          epingle_par?: string | null
          id?: string
          link_url?: string | null
          read_at?: string | null
          severite?: string
          source_action: string
          source_log_id?: string | null
          statut?: Database["public"]["Enums"]["notification_statut_enum"]
          titre: string
          user_id: string
        }
        Update: {
          action_requise?: boolean
          archived_at?: string | null
          created_at?: string
          details?: Json | null
          epingle_at?: string | null
          epingle_equipe?: boolean
          epingle_par?: string | null
          id?: string
          link_url?: string | null
          read_at?: string | null
          severite?: string
          source_action?: string
          source_log_id?: string | null
          statut?: Database["public"]["Enums"]["notification_statut_enum"]
          titre?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_internes_source_log_id_fkey"
            columns: ["source_log_id"]
            isOneToOne: false
            referencedRelation: "admin_actions_log"
            referencedColumns: ["id"]
          },
        ]
      }
      operateur_messages: {
        Row: {
          client_local_id: string | null
          content: string | null
          conversation_operator_id: string
          created_at: string
          id: string
          image_url: string | null
          read_at_admin: string | null
          read_at_operator: string | null
          sender_id: string
        }
        Insert: {
          client_local_id?: string | null
          content?: string | null
          conversation_operator_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at_admin?: string | null
          read_at_operator?: string | null
          sender_id: string
        }
        Update: {
          client_local_id?: string | null
          content?: string | null
          conversation_operator_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at_admin?: string | null
          read_at_operator?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      operateur_notes: {
        Row: {
          created_at: string
          date_observation: string
          entreprise_id: string
          id: string
          note: string
          operateur_id: string
          vehicule_id: string | null
        }
        Insert: {
          created_at?: string
          date_observation?: string
          entreprise_id: string
          id?: string
          note: string
          operateur_id: string
          vehicule_id?: string | null
        }
        Update: {
          created_at?: string
          date_observation?: string
          entreprise_id?: string
          id?: string
          note?: string
          operateur_id?: string
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operateur_notes_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operateur_notes_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_actives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operateur_notes_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["entreprise_id"]
          },
          {
            foreignKeyName: "operateur_notes_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      operateur_observations: {
        Row: {
          created_at: string
          id: string
          intervention_id: string
          note: string
          operateur_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intervention_id: string
          note?: string
          operateur_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intervention_id?: string
          note?: string
          operateur_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operateur_observations_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          color_hex: string
          created_at: string
          id: string
          initials: string
          name: string
          user_id: string | null
        }
        Insert: {
          color_hex: string
          created_at?: string
          id?: string
          initials: string
          name: string
          user_id?: string | null
        }
        Update: {
          color_hex?: string
          created_at?: string
          id?: string
          initials?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
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
            foreignKeyName: "parrainages_filleul_id_fkey"
            columns: ["filleul_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_actives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parrainages_filleul_id_fkey"
            columns: ["filleul_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["entreprise_id"]
          },
          {
            foreignKeyName: "parrainages_parrain_id_fkey"
            columns: ["parrain_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parrainages_parrain_id_fkey"
            columns: ["parrain_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_actives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parrainages_parrain_id_fkey"
            columns: ["parrain_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["entreprise_id"]
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
          {
            foreignKeyName: "profiles_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_actives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["entreprise_id"]
          },
        ]
      }
      reservations_b2c: {
        Row: {
          adresse: string
          code_postal: string
          created_at: string
          creneaux_preferes: Json
          email: string
          formule: string
          id: string
          intervention_id: string | null
          montant_ttc: number
          nom: string
          notes_admin: string | null
          options: Json
          prenom: string
          statut: string
          telephone: string
          vehicule: string
          ville: string
        }
        Insert: {
          adresse: string
          code_postal: string
          created_at?: string
          creneaux_preferes?: Json
          email: string
          formule: string
          id?: string
          intervention_id?: string | null
          montant_ttc: number
          nom: string
          notes_admin?: string | null
          options?: Json
          prenom: string
          statut?: string
          telephone: string
          vehicule: string
          ville: string
        }
        Update: {
          adresse?: string
          code_postal?: string
          created_at?: string
          creneaux_preferes?: Json
          email?: string
          formule?: string
          id?: string
          intervention_id?: string | null
          montant_ttc?: number
          nom?: string
          notes_admin?: string | null
          options?: Json
          prenom?: string
          statut?: string
          telephone?: string
          vehicule?: string
          ville?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_b2c_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      seuils_planning: {
        Row: {
          delai_annulation_demi_journee_h: number
          delai_annulation_journee_h: number
          delai_annulation_libre_h: number
          delai_annulation_recurrent_h: number
          delai_min_demi_journee: number
          delai_min_journee: number
          delai_min_libre: number
          id: number
          penalite_annulation_demi_journee: number
          penalite_annulation_journee: number
          penalite_annulation_libre: number
          penalite_annulation_recurrent: number
          seuil_demi_journee_max: number
          seuil_journee_max: number
          seuil_libre_max: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          delai_annulation_demi_journee_h?: number
          delai_annulation_journee_h?: number
          delai_annulation_libre_h?: number
          delai_annulation_recurrent_h?: number
          delai_min_demi_journee?: number
          delai_min_journee?: number
          delai_min_libre?: number
          id?: number
          penalite_annulation_demi_journee?: number
          penalite_annulation_journee?: number
          penalite_annulation_libre?: number
          penalite_annulation_recurrent?: number
          seuil_demi_journee_max?: number
          seuil_journee_max?: number
          seuil_libre_max?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          delai_annulation_demi_journee_h?: number
          delai_annulation_journee_h?: number
          delai_annulation_libre_h?: number
          delai_annulation_recurrent_h?: number
          delai_min_demi_journee?: number
          delai_min_journee?: number
          delai_min_libre?: number
          id?: number
          penalite_annulation_demi_journee?: number
          penalite_annulation_journee?: number
          penalite_annulation_libre?: number
          penalite_annulation_recurrent?: number
          seuil_demi_journee_max?: number
          seuil_journee_max?: number
          seuil_libre_max?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_2fa_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_2fa_settings: {
        Row: {
          activated_at: string | null
          created_at: string
          enabled: boolean | null
          failed_attempts: number
          id: string
          locked_until: string | null
          method: string | null
          phone: string | null
          totp_secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          enabled?: boolean | null
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          method?: string | null
          phone?: string | null
          totp_secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          enabled?: boolean | null
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          method?: string | null
          phone?: string | null
          totp_secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          created_by: string | null
          entreprise_id: string
          gel_admin_date_debut: string | null
          gel_admin_date_fin: string | null
          gel_admin_motif: string | null
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
          updated_at: string
        }
        Insert: {
          annee?: number | null
          contrat_id?: string | null
          couleur?: string | null
          created_at?: string
          created_by?: string | null
          entreprise_id: string
          gel_admin_date_debut?: string | null
          gel_admin_date_fin?: string | null
          gel_admin_motif?: string | null
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
          updated_at?: string
        }
        Update: {
          annee?: number | null
          contrat_id?: string | null
          couleur?: string | null
          created_at?: string
          created_by?: string | null
          entreprise_id?: string
          gel_admin_date_debut?: string | null
          gel_admin_date_fin?: string | null
          gel_admin_motif?: string | null
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
          updated_at?: string
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
            foreignKeyName: "vehicules_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_passages_restants"
            referencedColumns: ["contrat_id"]
          },
          {
            foreignKeyName: "vehicules_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_resume"
            referencedColumns: ["contrat_id"]
          },
          {
            foreignKeyName: "vehicules_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_resume"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicules_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["contrat_actif_id"]
          },
          {
            foreignKeyName: "vehicules_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicules_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_actives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicules_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["entreprise_id"]
          },
        ]
      }
    }
    Views: {
      v_contrats_passages_restants: {
        Row: {
          contrat_id: string | null
          contrat_ligne_id: string | null
          entreprise_id: string | null
          nb_vehicules: number | null
          numero_contrat: string | null
          passages_effectues_mois: number | null
          passages_mois_pack: number | null
          passages_mois_total: number | null
          passages_restants_mois: number | null
          type_pack: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrats_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_actives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["entreprise_id"]
          },
        ]
      }
      v_contrats_resume: {
        Row: {
          commercial_signataire_id: string | null
          contrat_id: string | null
          created_at: string | null
          date_debut: string | null
          date_fin: string | null
          date_resiliation: string | null
          entreprise_id: string | null
          id: string | null
          montant_brut_mensuel: number | null
          montant_net_mensuel: number | null
          nb_vehicules_actifs: number | null
          numero_contrat: string | null
          palier: string | null
          passages_effectues_total: number | null
          passages_mois_total: number | null
          passages_restants_total: number | null
          remise_commerciale_pct: number | null
          remise_palier: number | null
          statut: Database["public"]["Enums"]["contrat_statut_enum"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrats_commercial_signataire_id_fkey"
            columns: ["commercial_signataire_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_actives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrats_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["entreprise_id"]
          },
        ]
      }
      v_demandes_gel_with_quota: {
        Row: {
          commercial_signataire_id: string | null
          contrat_id: string | null
          created_at: string | null
          created_by: string | null
          date_debut: string | null
          date_fin_effective: string | null
          date_fin_prevue: string | null
          duree_jours_demandee: number | null
          entreprise_id: string | null
          entreprise_nom: string | null
          id: string | null
          motif: string | null
          numero_contrat: string | null
          quota_consomme_actuel: number | null
          refus_motif: string | null
          statut: string | null
          type_demande: string | null
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
          vehicule_ids: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "contrats_commercial_signataire_id_fkey"
            columns: ["commercial_signataire_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_gel_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "contrats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_gel_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_passages_restants"
            referencedColumns: ["contrat_id"]
          },
          {
            foreignKeyName: "demandes_gel_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_resume"
            referencedColumns: ["contrat_id"]
          },
          {
            foreignKeyName: "demandes_gel_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_contrats_resume"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_gel_contrat_id_fkey"
            columns: ["contrat_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["contrat_actif_id"]
          },
          {
            foreignKeyName: "demandes_gel_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_gel_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_gel_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_actives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_gel_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "v_entreprises_vehicules_resume"
            referencedColumns: ["entreprise_id"]
          },
          {
            foreignKeyName: "demandes_gel_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_entreprises_actives: {
        Row: {
          adresse: string | null
          archived_at: string | null
          archived_by: string | null
          archived_reason: string | null
          code_postal: string | null
          commercial_id: string | null
          compte_active: boolean | null
          created_at: string | null
          email_contact: string | null
          id: string | null
          nom: string | null
          palier_remise: Database["public"]["Enums"]["palier_remise"] | null
          siret: string | null
          telephone: string | null
          type_client: Database["public"]["Enums"]["type_client"] | null
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
          code_postal?: string | null
          commercial_id?: string | null
          compte_active?: boolean | null
          created_at?: string | null
          email_contact?: string | null
          id?: string | null
          nom?: string | null
          palier_remise?: Database["public"]["Enums"]["palier_remise"] | null
          siret?: string | null
          telephone?: string | null
          type_client?: Database["public"]["Enums"]["type_client"] | null
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          archived_at?: string | null
          archived_by?: string | null
          archived_reason?: string | null
          code_postal?: string | null
          commercial_id?: string | null
          compte_active?: boolean | null
          created_at?: string | null
          email_contact?: string | null
          id?: string | null
          nom?: string | null
          palier_remise?: Database["public"]["Enums"]["palier_remise"] | null
          siret?: string | null
          telephone?: string | null
          type_client?: Database["public"]["Enums"]["type_client"] | null
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entreprises_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_entreprises_vehicules_resume: {
        Row: {
          commercial_id: string | null
          commercial_nom: string | null
          contrat_actif_id: string | null
          contrat_statut: string | null
          entreprise_id: string | null
          montant_brut_mensuel: number | null
          montant_net_mensuel: number | null
          nb_vehicules_actifs: number | null
          nb_vehicules_en_attente: number | null
          nb_vehicules_gele: number | null
          nb_vehicules_total: number | null
          nom: string | null
          numero_contrat: string | null
          palier: string | null
          remise_commerciale_pct: number | null
          type_client: Database["public"]["Enums"]["type_client"] | null
          ville: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _recalculer_caches_contrat: {
        Args: { p_contrat_id: string }
        Returns: undefined
      }
      ajouter_vehicule: {
        Args: {
          p_annee?: number
          p_couleur?: string
          p_entreprise_id: string
          p_immatriculation: string
          p_kilometrage?: number
          p_marque?: string
          p_modele?: string
          p_notes?: string
          p_pack: string
          p_photo_path?: string
          p_type_vehicule: string
        }
        Returns: Json
      }
      annuler_demande_gel: { Args: { p_demande_id: string }; Returns: Json }
      annuler_demande_rdv: { Args: { p_demande_id: string }; Returns: Json }
      annuler_facture_via_avoir: {
        Args: {
          p_facture_id: string
          p_montant_partiel_ht?: number
          p_motif: string
          p_type_avoir?: string
        }
        Returns: string
      }
      annuler_gel_vehicule_admin: {
        Args: { p_vehicule_id: string }
        Returns: Json
      }
      annuler_rdv_admin: {
        Args: { p_demande_id: string; p_motif: string }
        Returns: Json
      }
      annuler_rdv_client: {
        Args: { p_demande_id: string; p_motif: string }
        Returns: Json
      }
      annuler_reservation_b2c: {
        Args: { p_motif?: string; p_reservation_id: string }
        Returns: undefined
      }
      appliquer_remise_commerciale: {
        Args: {
          p_contrat_id: string
          p_justification: string
          p_remise_pct: number
        }
        Returns: Json
      }
      archiver_entreprise: {
        Args: { p_entreprise_id: string; p_reason?: string }
        Returns: Json
      }
      assigner_rdv: {
        Args: {
          p_date: string
          p_demande_id: string
          p_heure?: string
          p_operator_id: string
          p_time_slot: string
        }
        Returns: Json
      }
      calculer_palier_remise: {
        Args: { p_nb_vehicules: number }
        Returns: {
          palier: string
          taux_remise: number
        }[]
      }
      calculer_quota_gel_consomme: {
        Args: { p_entreprise_id: string }
        Returns: number
      }
      confirmer_demande_rdv: {
        Args: {
          p_date_intervention: string
          p_demande_id: string
          p_vehicule_id: string
        }
        Returns: Json
      }
      confirmer_demande_rdv_multi: {
        Args: { p_date_intervention: string; p_demande_id: string }
        Returns: Json
      }
      confirmer_reservation_b2c: {
        Args: {
          p_date: string
          p_heure: string
          p_operator_id: string
          p_reservation_id: string
          p_time_slot: string
        }
        Returns: string
      }
      creer_demande_rdv: {
        Args: {
          p_adresse_intervention: string
          p_code_postal_intervention: string
          p_commentaires: string
          p_creneaux_preferes: Json
          p_latitude?: number
          p_longitude?: number
          p_telephone?: string
          p_vehicule_ids: string[]
          p_ville_intervention: string
        }
        Returns: Json
      }
      cron_cloture_mensuelle: { Args: never; Returns: undefined }
      cron_maintenance_quotidienne: { Args: never; Returns: undefined }
      cron_rappels_gel_24h: { Args: never; Returns: undefined }
      degeler_contrat: {
        Args: { p_contrat_id: string; p_source?: string }
        Returns: Json
      }
      degeler_vehicule: {
        Args: { p_source?: string; p_vehicule_id: string }
        Returns: Json
      }
      demander_gel: {
        Args: {
          p_contrat_id: string
          p_date_debut: string
          p_date_fin: string
          p_motif: string
          p_type_demande: string
          p_vehicule_ids: string[]
        }
        Returns: Json
      }
      desarchiver_entreprise: {
        Args: { p_entreprise_id: string }
        Returns: Json
      }
      emettre_facture: { Args: { p_facture_id: string }; Returns: string }
      geler_contrat: {
        Args: {
          p_contrat_id: string
          p_date_debut: string
          p_date_fin: string
          p_motif: string
        }
        Returns: Json
      }
      geler_vehicule: {
        Args: {
          p_date_debut: string
          p_date_fin: string
          p_motif: string
          p_vehicule_id: string
        }
        Returns: Json
      }
      geler_vehicule_admin: {
        Args: {
          p_date_debut: string
          p_date_fin: string
          p_motif: string
          p_vehicule_id: string
        }
        Returns: Json
      }
      generer_facture: {
        Args: { p_annee: number; p_contrat_id: string; p_mois: number }
        Returns: string
      }
      generer_numero_contrat: { Args: never; Returns: string }
      get_creneaux_disponibles: {
        Args: { p_date_debut: string; p_date_fin: string }
        Returns: {
          capacite_totale: number
          nb_interventions: number
          slot_date: string
          time_slot: string
        }[]
      }
      get_max_vehicules_par_demande: { Args: never; Returns: number }
      get_slot_occupancy: {
        Args: {
          p_date_debut: string
          p_date_fin: string
          p_operator_id: string
        }
        Returns: {
          count: number
          intervention_date: string
          time_slot: string
        }[]
      }
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
      lever_gel_anticipe: { Args: { p_demande_id: string }; Returns: Json }
      modifier_heure_rdv: {
        Args: { p_demande_id: string; p_heure: string }
        Returns: Json
      }
      prendre_en_charge_intervention: {
        Args: { p_intervention_id: string }
        Returns: undefined
      }
      reassigner_commercial: {
        Args: { p_entreprise_id: string; p_nouveau_commercial_id: string }
        Returns: Json
      }
      record_2fa_attempt: { Args: { p_success: boolean }; Returns: Json }
      refuser_demande_rdv: {
        Args: { p_demande_id: string; p_motif: string }
        Returns: Json
      }
      refuser_gel: {
        Args: { p_demande_id: string; p_motif_refus: string }
        Returns: Json
      }
      rejeter_vehicule: {
        Args: { p_raison: string; p_vehicule_id: string }
        Returns: Json
      }
      setup_2fa: {
        Args: { p_method: string; p_phone?: string; p_totp_secret?: string }
        Returns: Json
      }
      store_2fa_recovery_codes: { Args: { p_codes: string[] }; Returns: Json }
      supprimer_vehicule: {
        Args: { p_force_facturation?: boolean; p_vehicule_id: string }
        Returns: Json
      }
      toggle_epingle_equipe: {
        Args: { p_notification_id: string }
        Returns: Json
      }
      valider_gel: { Args: { p_demande_id: string }; Returns: Json }
      valider_vehicule: { Args: { p_vehicule_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "staff" | "commercial" | "operateur" | "client"
      contrat_statut_enum:
        | "actif"
        | "suspendu"
        | "resilie"
        | "en_cours_gel"
        | "en_attente_validation"
      engagement_type_enum: "mensuel" | "trimestriel" | "annuel"
      gel_type_enum: "programme" | "sinistre"
      mode_paiement_enum: "sepa" | "virement" | "stripe"
      notification_statut_enum: "non_lu" | "vu" | "priorite" | "archive"
      palier_remise: "starter" | "pro" | "business" | "premium"
      planning_niveau_enum:
        | "libre"
        | "demi_journee"
        | "journee"
        | "recurrent_annuel"
      regime_tva_enum: "franchise_base" | "reel_normal"
      serie_facture_enum: "B2B" | "B2C"
      status_cycle_enum: "onboarding" | "actif" | "dormant"
      statut_facture_enum: "brouillon" | "emise" | "payee" | "annulee"
      statut_vehicule:
        | "actif"
        | "en_attente_validation"
        | "remplace"
        | "archive"
        | "refuse"
        | "gele"
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
      contrat_statut_enum: [
        "actif",
        "suspendu",
        "resilie",
        "en_cours_gel",
        "en_attente_validation",
      ],
      engagement_type_enum: ["mensuel", "trimestriel", "annuel"],
      gel_type_enum: ["programme", "sinistre"],
      mode_paiement_enum: ["sepa", "virement", "stripe"],
      notification_statut_enum: ["non_lu", "vu", "priorite", "archive"],
      palier_remise: ["starter", "pro", "business", "premium"],
      planning_niveau_enum: [
        "libre",
        "demi_journee",
        "journee",
        "recurrent_annuel",
      ],
      regime_tva_enum: ["franchise_base", "reel_normal"],
      serie_facture_enum: ["B2B", "B2C"],
      status_cycle_enum: ["onboarding", "actif", "dormant"],
      statut_facture_enum: ["brouillon", "emise", "payee", "annulee"],
      statut_vehicule: [
        "actif",
        "en_attente_validation",
        "remplace",
        "archive",
        "refuse",
        "gele",
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
