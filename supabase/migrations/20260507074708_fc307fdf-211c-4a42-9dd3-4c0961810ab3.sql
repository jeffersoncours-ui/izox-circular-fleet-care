-- A. seuils_planning (singleton)
CREATE TABLE seuils_planning (
  id integer PRIMARY KEY DEFAULT 1,
  seuil_libre_max integer NOT NULL DEFAULT 4,
  seuil_demi_journee_max integer NOT NULL DEFAULT 8,
  seuil_journee_max integer NOT NULL DEFAULT 15,
  delai_min_libre integer NOT NULL DEFAULT 3,
  delai_min_demi_journee integer NOT NULL DEFAULT 5,
  delai_min_journee integer NOT NULL DEFAULT 7,
  delai_annulation_libre_h integer NOT NULL DEFAULT 48,
  delai_annulation_demi_journee_h integer NOT NULL DEFAULT 72,
  delai_annulation_journee_h integer NOT NULL DEFAULT 120,
  delai_annulation_recurrent_h integer NOT NULL DEFAULT 168,
  penalite_annulation_libre numeric(5,2) NOT NULL DEFAULT 50,
  penalite_annulation_demi_journee numeric(5,2) NOT NULL DEFAULT 50,
  penalite_annulation_journee numeric(5,2) NOT NULL DEFAULT 70,
  penalite_annulation_recurrent numeric(5,2) NOT NULL DEFAULT 100,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT chk_seuils_planning_singleton CHECK (id = 1),
  CONSTRAINT chk_seuils_croissants
    CHECK (seuil_libre_max < seuil_demi_journee_max
           AND seuil_demi_journee_max < seuil_journee_max)
);

INSERT INTO seuils_planning (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE seuils_planning IS
  'Configuration globale des seuils du module Planning. Une seule ligne (singleton). Modifiable par admin sans toucher au code.';
COMMENT ON COLUMN seuils_planning.seuil_libre_max IS
  'Nombre max de vehicules pour rester en niveau libre (default 4).';
COMMENT ON COLUMN seuils_planning.seuil_demi_journee_max IS
  'Nombre max de vehicules pour le niveau demi-journee bloquee (default 8).';
COMMENT ON COLUMN seuils_planning.seuil_journee_max IS
  'Nombre max de vehicules pour le niveau journee complete (default 15). Au-dela, recurrent annuel obligatoire.';

-- B. jours_indisponibles_izox
CREATE TABLE jours_indisponibles_izox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  type_indisponibilite text NOT NULL,
  motif text NOT NULL,
  operateur_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT chk_jours_indispo_periode_valide CHECK (date_debut <= date_fin),
  CONSTRAINT chk_jours_indispo_type_valide
    CHECK (type_indisponibilite IN (
      'ferie', 'vacances_operateur', 'formation',
      'maintenance_materiel', 'autre'
    ))
);

CREATE INDEX idx_jours_indispo_periode
  ON jours_indisponibles_izox(date_debut, date_fin);
CREATE INDEX idx_jours_indispo_operateur
  ON jours_indisponibles_izox(operateur_id)
  WHERE operateur_id IS NOT NULL;

COMMENT ON TABLE jours_indisponibles_izox IS
  'Jours d''indisponibilite IZOX (feries, vacances, formations). Masques du calendrier client.';
COMMENT ON COLUMN jours_indisponibles_izox.operateur_id IS
  'Si renseigne : indispo specifique d''un operateur. Si NULL : IZOX entier indisponible.';

-- C. disponibilites_operateurs
CREATE TABLE disponibilites_operateurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operateur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jour_semaine integer NOT NULL,
  heure_debut time NOT NULL,
  heure_fin time NOT NULL,
  actif boolean NOT NULL DEFAULT true,
  date_debut_validite date,
  date_fin_validite date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT chk_dispo_jour_semaine_valide CHECK (jour_semaine BETWEEN 1 AND 7),
  CONSTRAINT chk_dispo_heures_coherentes CHECK (heure_debut < heure_fin),
  CONSTRAINT chk_dispo_validite_coherente
    CHECK (
      date_debut_validite IS NULL
      OR date_fin_validite IS NULL
      OR date_debut_validite <= date_fin_validite
    )
);

CREATE INDEX idx_dispo_operateur_jour
  ON disponibilites_operateurs(operateur_id, jour_semaine)
  WHERE actif = true;
CREATE INDEX idx_dispo_periode_validite
  ON disponibilites_operateurs(date_debut_validite, date_fin_validite)
  WHERE actif = true;

COMMENT ON TABLE disponibilites_operateurs IS
  'Disponibilites hebdomadaires recurrentes des operateurs IZOX. Base pour calcul des creneaux disponibles cote client.';
COMMENT ON COLUMN disponibilites_operateurs.jour_semaine IS
  'Jour de la semaine : 1=lundi, 2=mardi, 3=mercredi, 4=jeudi, 5=vendredi, 6=samedi, 7=dimanche.';

-- D. creneaux_recurrents_garantis
CREATE TABLE creneaux_recurrents_garantis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrat_id uuid NOT NULL REFERENCES contrats(id) ON DELETE CASCADE,
  jour_semaine integer NOT NULL,
  heure_debut time NOT NULL,
  heure_fin time NOT NULL,
  operateur_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  frequence_semaines integer NOT NULL DEFAULT 1,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  actif boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT chk_creneaux_rec_jour_valide CHECK (jour_semaine BETWEEN 1 AND 7),
  CONSTRAINT chk_creneaux_rec_heures_coherentes CHECK (heure_debut < heure_fin),
  CONSTRAINT chk_creneaux_rec_periode_valide CHECK (date_debut <= date_fin),
  CONSTRAINT chk_creneaux_rec_frequence_valide CHECK (frequence_semaines BETWEEN 1 AND 4)
);

CREATE INDEX idx_creneaux_rec_contrat
  ON creneaux_recurrents_garantis(contrat_id);
CREATE INDEX idx_creneaux_rec_operateur_jour
  ON creneaux_recurrents_garantis(operateur_id, jour_semaine)
  WHERE actif = true AND operateur_id IS NOT NULL;
CREATE INDEX idx_creneaux_rec_periode
  ON creneaux_recurrents_garantis(date_debut, date_fin)
  WHERE actif = true;

COMMENT ON TABLE creneaux_recurrents_garantis IS
  'Plages horaires recurrentes garanties pour les contrats Niveau 4 (>15 vehicules avec engagement annuel). Bloquees automatiquement dans le calendrier des autres clients.';
COMMENT ON COLUMN creneaux_recurrents_garantis.frequence_semaines IS
  'Frequence : 1=hebdomadaire, 2=bi-mensuel, 4=mensuel.';

-- E. RLS
ALTER TABLE seuils_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE jours_indisponibles_izox ENABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilites_operateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE creneaux_recurrents_garantis ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_seuils_planning_select_all
  ON seuils_planning FOR SELECT TO authenticated USING (true);
CREATE POLICY p_seuils_planning_admin_modify
  ON seuils_planning FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY p_jours_indispo_admin_staff_all
  ON jours_indisponibles_izox FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY p_jours_indispo_client_select
  ON jours_indisponibles_izox FOR SELECT TO authenticated USING (true);

CREATE POLICY p_dispo_operateurs_admin_staff_all
  ON disponibilites_operateurs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY p_dispo_operateurs_self_select
  ON disponibilites_operateurs FOR SELECT TO authenticated
  USING (operateur_id = auth.uid());

CREATE POLICY p_creneaux_rec_admin_staff_all
  ON creneaux_recurrents_garantis FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY p_creneaux_rec_client_select_own
  ON creneaux_recurrents_garantis FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contrats c
      WHERE c.id = creneaux_recurrents_garantis.contrat_id
        AND c.entreprise_id = get_user_entreprise(auth.uid())
    )
  );