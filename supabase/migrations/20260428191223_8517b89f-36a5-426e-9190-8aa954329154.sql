
-- =============================================================================
-- MIGRATION A2bis — Tables métier IZOX
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.type_prestation_enum AS ENUM (
    'pack_interieur',
    'pack_standard',
    'pack_vtc',
    'concession_one_shot',
    'fin_de_bail_one_shot',
    'supplement_poils',
    'supplement_coffre',
    'supplement_ozone',
    'supplement_puzzi'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.gel_type_enum AS ENUM ('programme', 'sinistre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contrat_statut_enum AS ENUM ('actif', 'suspendu', 'resilie', 'en_cours_gel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.mode_paiement_enum AS ENUM ('sepa', 'virement', 'stripe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 1. prestations_catalogue
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prestations_catalogue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  nom text NOT NULL,
  prix_ht numeric(10,2) NOT NULL,
  type_prestation public.type_prestation_enum NOT NULL,
  duree_minutes integer,
  passages_mois integer,
  est_abonnement boolean NOT NULL DEFAULT false,
  est_one_shot boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prestations_catalogue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prestations_catalogue_admin_staff_all ON public.prestations_catalogue;
CREATE POLICY prestations_catalogue_admin_staff_all ON public.prestations_catalogue
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS prestations_catalogue_authenticated_select ON public.prestations_catalogue;
CREATE POLICY prestations_catalogue_authenticated_select ON public.prestations_catalogue
  FOR SELECT TO authenticated
  USING (true);

-- Vider et réinsérer les données catalogue
TRUNCATE public.prestations_catalogue;

INSERT INTO public.prestations_catalogue
  (code, nom, prix_ht, type_prestation, duree_minutes, passages_mois, est_abonnement, est_one_shot)
VALUES
  -- ABONNEMENTS
  ('pack_interieur',     'Pack Intérieur',              100, 'pack_interieur',        45,  2,    true,  false),
  ('pack_standard',      'Pack Standard',               150, 'pack_standard',         75,  2,    true,  false),
  ('pack_vtc',           'Pack VTC/Taxi',               190, 'pack_vtc',              45,  4,    true,  false),
  -- ONE-SHOT
  ('concession',         'Pack Concession',             100, 'concession_one_shot',   60,  NULL, false, true),
  ('fin_bail_citadine',  'Fin de bail - Citadine',      200, 'fin_de_bail_one_shot',  180, NULL, false, true),
  ('fin_bail_berline',   'Fin de bail - Berline',       230, 'fin_de_bail_one_shot',  180, NULL, false, true),
  ('fin_bail_suv',       'Fin de bail - SUV',           260, 'fin_de_bail_one_shot',  180, NULL, false, true),
  ('fin_bail_utilitaire','Fin de bail - Utilitaire',    290, 'fin_de_bail_one_shot',  180, NULL, false, true),
  -- SUPPLÉMENTS
  ('supp_poils',         'Poils animaux intensif',       25, 'supplement_poils',      30,  NULL, false, false),
  ('supp_coffre',        'Coffre/soute sévère',          35, 'supplement_coffre',     45,  NULL, false, false),
  ('supp_ozone',         'Traitement ozone',             45, 'supplement_ozone',      30,  NULL, false, false),
  ('supp_puzzi_cit',     'Puzzi - Citadine',             40, 'supplement_puzzi',      45,  NULL, false, false),
  ('supp_puzzi_ber',     'Puzzi - Berline',              47, 'supplement_puzzi',      45,  NULL, false, false),
  ('supp_puzzi_suv',     'Puzzi - SUV',                  53, 'supplement_puzzi',      45,  NULL, false, false),
  ('supp_puzzi_uti',     'Puzzi - Utilitaire',           60, 'supplement_puzzi',      45,  NULL, false, false);

-- -----------------------------------------------------------------------------
-- 2. contrats
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contrats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  numero_contrat text,
  engagement_annuel boolean NOT NULL DEFAULT false,
  date_debut date NOT NULL DEFAULT CURRENT_DATE,
  date_fin date,
  date_anniversaire date,
  passages_mois integer NOT NULL DEFAULT 0,
  passages_restants_mois integer NOT NULL DEFAULT 0,
  passages_reportes integer NOT NULL DEFAULT 0,
  gel_actif boolean NOT NULL DEFAULT false,
  gel_type public.gel_type_enum,
  gel_date_debut date,
  gel_date_fin date,
  gel_justificatif_url text,
  statut public.contrat_statut_enum NOT NULL DEFAULT 'actif',
  mode_paiement public.mode_paiement_enum NOT NULL DEFAULT 'sepa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contrats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contrats_admin_staff_all ON public.contrats;
CREATE POLICY contrats_admin_staff_all ON public.contrats
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS contrats_client_select ON public.contrats;
CREATE POLICY contrats_client_select ON public.contrats
  FOR SELECT TO authenticated
  USING (entreprise_id = get_user_entreprise(auth.uid()));

DROP POLICY IF EXISTS contrats_commercial_select ON public.contrats;
CREATE POLICY contrats_commercial_select ON public.contrats
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'commercial'::app_role)
    AND entreprise_id IN (SELECT id FROM public.entreprises WHERE commercial_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- 3. contrat_lignes
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contrat_lignes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrat_id uuid NOT NULL REFERENCES public.contrats(id) ON DELETE CASCADE,
  type_pack text NOT NULL,
  nb_vehicules integer NOT NULL DEFAULT 1,
  prix_unitaire_ht numeric(10,2) NOT NULL,
  statut_ligne text NOT NULL DEFAULT 'actif',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contrat_lignes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contrat_lignes_admin_staff_all ON public.contrat_lignes;
CREATE POLICY contrat_lignes_admin_staff_all ON public.contrat_lignes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS contrat_lignes_client_select ON public.contrat_lignes;
CREATE POLICY contrat_lignes_client_select ON public.contrat_lignes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contrats c
      WHERE c.id = contrat_lignes.contrat_id
        AND c.entreprise_id = get_user_entreprise(auth.uid())
    )
  );

DROP POLICY IF EXISTS contrat_lignes_commercial_select ON public.contrat_lignes;
CREATE POLICY contrat_lignes_commercial_select ON public.contrat_lignes
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'commercial'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.contrats c
      JOIN public.entreprises e ON e.id = c.entreprise_id
      WHERE c.id = contrat_lignes.contrat_id
        AND e.commercial_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 4. contrat_avenants
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contrat_avenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrat_id uuid NOT NULL REFERENCES public.contrats(id) ON DELETE CASCADE,
  url text NOT NULL,
  date_generation timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL DEFAULT 'ajout_vehicule',
  genere_par uuid REFERENCES auth.users(id)
);

ALTER TABLE public.contrat_avenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contrat_avenants_admin_staff_all ON public.contrat_avenants;
CREATE POLICY contrat_avenants_admin_staff_all ON public.contrat_avenants
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS contrat_avenants_client_select ON public.contrat_avenants;
CREATE POLICY contrat_avenants_client_select ON public.contrat_avenants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contrats c
      WHERE c.id = contrat_avenants.contrat_id
        AND c.entreprise_id = get_user_entreprise(auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 5. admin_actions_log
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb,
  nb_entites_impactees integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_actions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_actions_log_admin_all ON public.admin_actions_log;
CREATE POLICY admin_actions_log_admin_all ON public.admin_actions_log
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS admin_actions_log_staff_select ON public.admin_actions_log;
CREATE POLICY admin_actions_log_staff_select ON public.admin_actions_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role));

-- -----------------------------------------------------------------------------
-- 6. parrainages
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.parrainages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parrain_id uuid NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  filleul_id uuid REFERENCES public.entreprises(id) ON DELETE SET NULL,
  code_parrainage text UNIQUE NOT NULL,
  date_parrainage timestamptz NOT NULL DEFAULT now(),
  date_premiere_mensualite timestamptz,
  statut text NOT NULL DEFAULT 'en_attente',
  recompense_parrain_appliquee boolean NOT NULL DEFAULT false,
  recompense_filleul_appliquee boolean NOT NULL DEFAULT false
);

ALTER TABLE public.parrainages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parrainages_admin_staff_all ON public.parrainages;
CREATE POLICY parrainages_admin_staff_all ON public.parrainages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS parrainages_client_select ON public.parrainages;
CREATE POLICY parrainages_client_select ON public.parrainages
  FOR SELECT TO authenticated
  USING (
    parrain_id = get_user_entreprise(auth.uid())
    OR filleul_id = get_user_entreprise(auth.uid())
  );

-- -----------------------------------------------------------------------------
-- 7. demandes_rdv
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.demandes_rdv (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  statut text NOT NULL DEFAULT 'en_attente',
  creneaux_preferes jsonb NOT NULL DEFAULT '[]'::jsonb,
  commentaires text,
  nb_vehicules_rdv integer NOT NULL DEFAULT 1,
  derogation_min_vehicules boolean NOT NULL DEFAULT false,
  derogation_motif text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demandes_rdv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demandes_rdv_admin_staff_all ON public.demandes_rdv;
CREATE POLICY demandes_rdv_admin_staff_all ON public.demandes_rdv
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS demandes_rdv_client_select ON public.demandes_rdv;
CREATE POLICY demandes_rdv_client_select ON public.demandes_rdv
  FOR SELECT TO authenticated
  USING (entreprise_id = get_user_entreprise(auth.uid()));

DROP POLICY IF EXISTS demandes_rdv_client_insert ON public.demandes_rdv;
CREATE POLICY demandes_rdv_client_insert ON public.demandes_rdv
  FOR INSERT TO authenticated
  WITH CHECK (entreprise_id = get_user_entreprise(auth.uid()));

DROP POLICY IF EXISTS demandes_rdv_commercial_select ON public.demandes_rdv;
CREATE POLICY demandes_rdv_commercial_select ON public.demandes_rdv
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'commercial'::app_role)
    AND entreprise_id IN (SELECT id FROM public.entreprises WHERE commercial_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- Triggers updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS prestations_catalogue_updated_at ON public.prestations_catalogue;
CREATE TRIGGER prestations_catalogue_updated_at
  BEFORE UPDATE ON public.prestations_catalogue
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS contrats_updated_at ON public.contrats;
CREATE TRIGGER contrats_updated_at
  BEFORE UPDATE ON public.contrats
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS demandes_rdv_updated_at ON public.demandes_rdv;
CREATE TRIGGER demandes_rdv_updated_at
  BEFORE UPDATE ON public.demandes_rdv
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
