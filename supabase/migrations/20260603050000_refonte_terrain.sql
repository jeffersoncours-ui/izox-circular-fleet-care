-- ===========================================================================
-- Session 12 — Refonte onglets opérateur terrain
-- 1. telephone_intervention sur demandes_rdv + interventions
-- 2. creer_demande_rdv : ajout p_telephone (DEFAULT NULL, rétrocompat)
-- 3. assigner_rdv : propage telephone_intervention → interventions
-- 4. Table operateur_observations + RLS strictes
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Colonnes téléphone
-- ---------------------------------------------------------------------------
ALTER TABLE public.demandes_rdv
  ADD COLUMN IF NOT EXISTS telephone_intervention TEXT;

ALTER TABLE public.interventions
  ADD COLUMN IF NOT EXISTS telephone_intervention TEXT;

-- ---------------------------------------------------------------------------
-- 2. creer_demande_rdv — ajout p_telephone
-- ---------------------------------------------------------------------------
-- Supprimer l'ancienne signature pour éviter la surcharge ambiguë
DROP FUNCTION IF EXISTS public.creer_demande_rdv(
  UUID[], JSONB, TEXT, TEXT, TEXT, TEXT, double precision, double precision
);

CREATE OR REPLACE FUNCTION public.creer_demande_rdv(
  p_vehicule_ids              UUID[],
  p_creneaux_preferes         JSONB,
  p_commentaires              TEXT,
  p_adresse_intervention      TEXT,
  p_ville_intervention        TEXT,
  p_code_postal_intervention  TEXT,
  p_latitude                  double precision DEFAULT NULL,
  p_longitude                 double precision DEFAULT NULL,
  p_telephone                 TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid            UUID := auth.uid();
  v_ent            UUID;
  v_id             UUID;
  v_nom            TEXT;
  v_vehicule_id    UUID;
  v_type_pack      TEXT;
  v_immat          TEXT;
  v_quota_mois     INT;
  v_prises_mois    INT;
  v_capacite       bigint;
  v_creneau        jsonb;
  v_slot_count     bigint;
  v_any_available  boolean := false;
BEGIN
  SELECT entreprise_id INTO v_ent FROM profiles WHERE id = v_uid;
  IF v_ent IS NULL THEN RAISE EXCEPTION 'Utilisateur sans entreprise rattachée'; END IF;

  IF p_vehicule_ids IS NULL OR array_length(p_vehicule_ids, 1) < 1 THEN
    RAISE EXCEPTION 'Sélectionnez au moins 1 véhicule';
  END IF;
  IF array_length(p_vehicule_ids, 1) > 2 THEN
    RAISE EXCEPTION 'Maximum 2 véhicules par demande';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_vehicule_ids) AS vid
    WHERE NOT EXISTS (
      SELECT 1 FROM vehicules WHERE id = vid AND entreprise_id = v_ent AND statut::text = 'actif'
    )
  ) THEN
    RAISE EXCEPTION 'Un ou plusieurs véhicules sélectionnés ne sont pas valides';
  END IF;
  IF p_creneaux_preferes IS NULL OR jsonb_array_length(p_creneaux_preferes) = 0 THEN
    RAISE EXCEPTION 'Au moins un créneau préféré requis';
  END IF;
  IF TRIM(COALESCE(p_adresse_intervention, '')) = '' THEN
    RAISE EXCEPTION 'L''adresse d''intervention est obligatoire';
  END IF;
  IF TRIM(COALESCE(p_ville_intervention, '')) = '' THEN
    RAISE EXCEPTION 'La ville d''intervention est obligatoire';
  END IF;
  IF TRIM(COALESCE(p_code_postal_intervention, '')) = '' THEN
    RAISE EXCEPTION 'Le code postal d''intervention est obligatoire';
  END IF;

  -- Guard race condition : au moins 1 créneau proposé doit avoir de la capacité
  SELECT GREATEST(COUNT(*) * 2, 2) INTO v_capacite FROM public.operators;

  FOR v_creneau IN SELECT jsonb_array_elements(p_creneaux_preferes) LOOP
    SELECT COUNT(*) INTO v_slot_count
    FROM public.interventions
    WHERE date_intervention = (v_creneau->>'date')::date
      AND time_slot = CASE
        WHEN v_creneau->>'creneau' = 'matin' THEN 'morning'
        ELSE 'afternoon'
      END
      AND statut NOT IN ('annulee', 'refusee');

    IF v_slot_count < v_capacite THEN
      v_any_available := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_any_available THEN
    RAISE EXCEPTION 'Tous les créneaux demandés sont complets. Veuillez proposer d''autres créneaux.';
  END IF;

  -- Vérification quota mensuel par véhicule
  FOREACH v_vehicule_id IN ARRAY p_vehicule_ids LOOP
    SELECT type_pack_souhaite, immatriculation INTO v_type_pack, v_immat
    FROM vehicules WHERE id = v_vehicule_id;

    SELECT COALESCE(passages_mois, 0) INTO v_quota_mois
    FROM prestations_catalogue WHERE code = v_type_pack;

    IF v_quota_mois > 0 THEN
      SELECT (
        SELECT COUNT(*) FROM interventions
        WHERE vehicule_id = v_vehicule_id
          AND statut IN ('planifiee', 'en_cours', 'en_revision', 'validee')
          AND DATE_TRUNC('month', date_intervention) = DATE_TRUNC('month', NOW())
      ) + (
        SELECT COUNT(*) FROM demandes_rdv
        WHERE vehicule_ids @> ARRAY[v_vehicule_id]
          AND statut = 'en_attente'
          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
      ) INTO v_prises_mois;

      IF v_prises_mois >= v_quota_mois THEN
        RAISE EXCEPTION 'Quota mensuel atteint pour le véhicule % (% / % passages ce mois)',
          v_immat, v_prises_mois, v_quota_mois;
      END IF;
    END IF;
  END LOOP;

  SELECT nom INTO v_nom FROM entreprises WHERE id = v_ent;

  INSERT INTO demandes_rdv (
    entreprise_id, statut, vehicule_ids, creneaux_preferes, commentaires,
    nb_vehicules_rdv, adresse_intervention, ville_intervention, code_postal_intervention,
    latitude, longitude, telephone_intervention
  ) VALUES (
    v_ent, 'en_attente', p_vehicule_ids, p_creneaux_preferes, p_commentaires,
    array_length(p_vehicule_ids, 1),
    TRIM(p_adresse_intervention), TRIM(p_ville_intervention), TRIM(p_code_postal_intervention),
    p_latitude, p_longitude,
    NULLIF(TRIM(COALESCE(p_telephone, '')), '')
  ) RETURNING id INTO v_id;

  INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut, action_requise)
  SELECT DISTINCT ON (p.id) p.id, 'demande_rdv_creee',
    'Nouvelle demande RDV — ' || COALESCE(v_nom, ''),
    jsonb_build_object('demande_id', v_id, 'entreprise_id', v_ent, 'nb_vehicules', array_length(p_vehicule_ids, 1)),
    'info', '/admin/planning?demande=' || v_id::TEXT, 'non_lu', TRUE
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role IN ('admin', 'staff') AND p.id <> v_uid;

  RETURN json_build_object('success', true, 'demande_id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.creer_demande_rdv(
  UUID[], JSONB, TEXT, TEXT, TEXT, TEXT, double precision, double precision, TEXT
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. assigner_rdv — propage telephone_intervention
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assigner_rdv(
  p_demande_id    uuid,
  p_operator_id   uuid,
  p_date          date,
  p_time_slot     text,
  p_heure         time DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid              uuid := auth.uid();
  v_demande          RECORD;
  v_nb_interventions int;
  v_nb_vehicules     int;
  v_vehicule_id      uuid;
  v_type_pack        text;
  v_contrat_ligne_id uuid;
  v_intervention_id  uuid;
  v_intervention_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF p_time_slot NOT IN ('morning', 'afternoon') THEN
    RAISE EXCEPTION 'time_slot invalide : %', p_time_slot;
  END IF;

  SELECT * INTO v_demande FROM public.demandes_rdv WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_demande.statut != 'en_attente' THEN
    RAISE EXCEPTION 'La demande n''est plus en attente (statut: %)', v_demande.statut;
  END IF;

  v_nb_vehicules := COALESCE(array_length(v_demande.vehicule_ids, 1), 0);
  IF v_nb_vehicules = 0 THEN
    RAISE EXCEPTION 'Aucun véhicule associé à cette demande';
  END IF;

  SELECT COUNT(*) INTO v_nb_interventions
  FROM public.interventions
  WHERE operator_id = p_operator_id
    AND date_intervention = p_date
    AND time_slot = p_time_slot;

  IF v_nb_interventions + v_nb_vehicules > 2 THEN
    RAISE EXCEPTION 'Créneau saturé : % intervention(s) déjà planifiée(s), +% demandée(s) (max 2 par demi-journée)',
      v_nb_interventions, v_nb_vehicules;
  END IF;

  FOREACH v_vehicule_id IN ARRAY v_demande.vehicule_ids LOOP
    SELECT type_pack_souhaite INTO v_type_pack
    FROM public.vehicules WHERE id = v_vehicule_id AND statut = 'actif';

    SELECT cl.id INTO v_contrat_ligne_id
    FROM contrat_lignes cl
    JOIN contrats c ON c.id = cl.contrat_id
    WHERE c.entreprise_id = v_demande.entreprise_id
      AND cl.type_pack = v_type_pack
      AND cl.statut_ligne = 'actif'
      AND c.statut = 'actif'
    LIMIT 1;

    INSERT INTO public.interventions (
      entreprise_id, vehicule_id, operator_id, date_intervention,
      time_slot, heure_intervention, statut, type_prestation, demande_rdv_id,
      contrat_ligne_id,
      adresse_intervention, ville_intervention, code_postal_intervention,
      latitude, longitude,
      telephone_intervention
    ) VALUES (
      v_demande.entreprise_id, v_vehicule_id, p_operator_id, p_date,
      p_time_slot, p_heure, 'planifiee', COALESCE(v_type_pack, 'complet'), p_demande_id,
      v_contrat_ligne_id,
      v_demande.adresse_intervention, v_demande.ville_intervention, v_demande.code_postal_intervention,
      v_demande.latitude, v_demande.longitude,
      v_demande.telephone_intervention
    ) RETURNING id INTO v_intervention_id;

    v_intervention_ids := array_append(v_intervention_ids, v_intervention_id);
  END LOOP;

  UPDATE public.demandes_rdv SET
    statut               = 'confirmee',
    assigned_operator_id = p_operator_id,
    assigned_date        = p_date,
    assigned_time_slot   = p_time_slot,
    assigned_heure       = p_heure,
    date_confirmee       = p_date::timestamptz,
    updated_at           = now()
  WHERE id = p_demande_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'rdv_assigne', jsonb_build_object(
    'demande_id', p_demande_id,
    'operator_id', p_operator_id,
    'date', p_date,
    'time_slot', p_time_slot,
    'heure', p_heure::text,
    'intervention_ids', to_jsonb(v_intervention_ids)
  ), array_length(v_intervention_ids, 1));

  RETURN json_build_object(
    'success', true,
    'intervention_ids', v_intervention_ids,
    'nb_interventions', array_length(v_intervention_ids, 1)
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Table operateur_observations + RLS strictes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operateur_observations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id  uuid NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  operateur_id     uuid NOT NULL REFERENCES auth.users(id),
  note             text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(intervention_id, operateur_id)
);

ALTER TABLE public.operateur_observations ENABLE ROW LEVEL SECURITY;

-- Opérateurs : SELECT sur toutes les observations (pour voir celles des collègues)
CREATE POLICY "obs_operateur_select" ON public.operateur_observations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operateur'));

-- Opérateurs : INSERT uniquement leurs propres notes
CREATE POLICY "obs_operateur_insert" ON public.operateur_observations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'operateur')
    AND operateur_id = auth.uid()
  );

-- Opérateurs : UPDATE uniquement leurs propres notes
CREATE POLICY "obs_operateur_update" ON public.operateur_observations
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'operateur')
    AND operateur_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'operateur')
    AND operateur_id = auth.uid()
  );

-- Admin/staff : SELECT uniquement (lecture seule)
CREATE POLICY "obs_admin_select" ON public.operateur_observations
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  );

-- CLIENT : aucune policy → deny by default (RLS bloque tout accès)

-- Trigger updated_at
CREATE TRIGGER obs_updated_at
  BEFORE UPDATE ON public.operateur_observations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT ALL ON public.operateur_observations TO authenticated;
