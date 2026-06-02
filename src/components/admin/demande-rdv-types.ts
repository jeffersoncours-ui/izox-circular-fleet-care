export interface AdminDemandeRdv {
  id: string;
  entreprise_id: string;
  entreprise_nom?: string | null;
  statut: string;
  creneaux_preferes: any;
  commentaires: string | null;
  nb_vehicules_rdv: number;
  vehicule_ids?: string[] | null;
  created_at: string;
  adresse_intervention?: string | null;
  ville_intervention?: string | null;
  code_postal_intervention?: string | null;
  assigned_date?: string | null;
  assigned_heure?: string | null;
  assigned_time_slot?: string | null;
  assigned_operator_id?: string | null;
  date_confirmee?: string | null;
}
