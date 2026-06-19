-- ===========================================================================
-- Adresse d'intervention : demandes_rdv + interventions
-- Refonte creer_demande_rdv (lieu obligatoire)
-- Propagation adresse dans assigner_rdv
-- ===========================================================================

-- 1. Colonnes sur demandes_rdv
ALTER TABLE public.demandes_rdv
  ADD COLUMN IF NOT EXISTS adresse_intervention text,
  ADD COLUMN IF NOT EXISTS ville_intervention text,
  ADD COLUMN IF NOT EXISTS code_postal_intervention text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- 2. Colonnes sur interventions
ALTER TABLE public.interventions
  ADD COLUMN IF NOT EXISTS adresse_intervention text,
  ADD COLUMN IF NOT EXISTS ville_intervention text,
  ADD COLUMN IF NOT EXISTS code_postal_intervention text;

-- 3. creer_demande_rdv : DROP ancienne signature, CREATE avec lieu obligatoire
DROP FUNCTION IF EXISTS public.creer_demande_rdv(UUID[], JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.creer_demande_rdv(
  p_vehicule_ids UUID[],
  p_creneaux_preferes JSONB,
  p_commentaires TEXT,
  p_adresse_intervention TEXT,
  p_ville_intervention TEXT,
  p_code_postal_intervention TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_ent UUID;
  v_id UUID;
  v_nom TEXT;
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

  -- Lieu obligatoire côté données
  IF TRIM(COALESCE(p_adresse_intervention, '')) = '' THEN
    RAISE EXCEPTION 'L''adresse d''intervention est obligatoire';
  END IF;
  IF TRIM(COALESCE(p_ville_intervention, '')) = '' THEN
    RAISE EXCEPTION 'La ville d''intervention est obligatoire';
  END IF;
  IF TRIM(COALESCE(p_code_postal_intervention, '')) = '' THEN
    RAISE EXCEPTION 'Le code postal d''intervention est obligatoire';
  END IF;

  SELECT nom INTO v_nom FROM entreprises WHERE id = v_ent;

  INSERT INTO demandes_rdv (
    entreprise_id, statut, vehicule_ids, creneaux_preferes, commentaires,
    nb_vehicules_rdv, adresse_intervention, ville_intervention, code_postal_intervention
  ) VALUES (
    v_ent, 'en_attente', p_vehicule_ids, p_creneaux_preferes, p_commentaires,
    array_length(p_vehicule_ids, 1),
    TRIM(p_adresse_intervention), TRIM(p_ville_intervention), TRIM(p_code_postal_intervention)
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
GRANT EXECUTE ON FUNCTION public.creer_demande_rdv(UUID[], JSONB, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 4. assigner_rdv : propager l'adresse aux interventions créées
CREATE OR REPLACE FUNCTION public.assigner_rdv(
  p_demande_id uuid,
  p_operator_id uuid,
  p_date date,
  p_time_slot text
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_demande RECORD;
  v_nb_interventions int;
  v_nb_vehicules int;
  v_vehicule_id uuid;
  v_type_pack text;
  v_intervention_id uuid;
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

  IF v_nb_interventions + v_nb_vehicules > 3 THEN
    RAISE EXCEPTION 'Créneau saturé : % intervention(s) déjà planifiée(s), +% demandée(s) (max 3)',
      v_nb_interventions, v_nb_vehicules;
  END IF;

  FOREACH v_vehicule_id IN ARRAY v_demande.vehicule_ids LOOP
    SELECT type_pack_souhaite INTO v_type_pack
    FROM public.vehicules WHERE id = v_vehicule_id AND statut = 'actif';

    INSERT INTO public.interventions (
      entreprise_id, vehicule_id, operator_id, date_intervention,
      time_slot, statut, type_prestation, demande_rdv_id,
      adresse_intervention, ville_intervention, code_postal_intervention
    ) VALUES (
      v_demande.entreprise_id, v_vehicule_id, p_operator_id, p_date,
      p_time_slot, 'planifiee', COALESCE(v_type_pack, 'complet'), p_demande_id,
      v_demande.adresse_intervention, v_demande.ville_intervention, v_demande.code_postal_intervention
    ) RETURNING id INTO v_intervention_id;

    v_intervention_ids := array_append(v_intervention_ids, v_intervention_id);
  END LOOP;

  UPDATE public.demandes_rdv SET
    statut = 'confirmee',
    assigned_operator_id = p_operator_id,
    assigned_date = p_date,
    assigned_time_slot = p_time_slot,
    date_confirmee = p_date::timestamptz,
    updated_at = now()
  WHERE id = p_demande_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'rdv_assigne', jsonb_build_object(
    'demande_id', p_demande_id,
    'operator_id', p_operator_id,
    'date', p_date,
    'time_slot', p_time_slot,
    'intervention_ids', to_jsonb(v_intervention_ids)
  ), array_length(v_intervention_ids, 1));

  RETURN json_build_object(
    'success', true,
    'intervention_ids', v_intervention_ids,
    'nb_interventions', array_length(v_intervention_ids, 1)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.assigner_rdv(uuid, uuid, date, text) TO authenticated;
