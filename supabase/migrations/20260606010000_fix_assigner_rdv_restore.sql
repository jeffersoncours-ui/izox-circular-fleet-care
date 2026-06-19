-- Fix: restore assigner_rdv with role guard + DEFAULT NULL on p_heure + client notification
-- Combines security_fixes role guard with notifications migration's DEFAULT NULL

CREATE OR REPLACE FUNCTION public.assigner_rdv(
  p_demande_id   uuid,
  p_operator_id  uuid,
  p_date         date,
  p_time_slot    text,
  p_heure        time without time zone DEFAULT NULL::time without time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_client_uid       uuid;
BEGIN
  -- Role guard: admin and staff only
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role IN ('admin', 'staff')
  ) THEN
    RAISE EXCEPTION 'Accès refusé : rôle admin ou staff requis';
  END IF;

  IF p_time_slot NOT IN ('morning', 'afternoon') THEN
    RAISE EXCEPTION 'time_slot invalide : %', p_time_slot;
  END IF;

  SELECT * INTO v_demande FROM public.demandes_rdv WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_demande.statut != 'en_attente' THEN
    RAISE EXCEPTION 'La demande n''est plus en attente (statut: %)', v_demande.statut;
  END IF;

  v_nb_vehicules := COALESCE(array_length(v_demande.vehicule_ids, 1), 0);
  IF v_nb_vehicules = 0 THEN RAISE EXCEPTION 'Aucun véhicule associé à cette demande'; END IF;

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
      time_slot, heure_intervention, statut, type_prestation, demande_rdv_id, contrat_ligne_id,
      adresse_intervention, ville_intervention, code_postal_intervention,
      latitude, longitude, telephone_intervention
    ) VALUES (
      v_demande.entreprise_id, v_vehicule_id, p_operator_id, p_date,
      p_time_slot, p_heure, 'planifiee', COALESCE(v_type_pack, 'complet'), p_demande_id, v_contrat_ligne_id,
      v_demande.adresse_intervention, v_demande.ville_intervention, v_demande.code_postal_intervention,
      v_demande.latitude, v_demande.longitude, v_demande.telephone_intervention
    ) RETURNING id INTO v_intervention_id;

    v_intervention_ids := array_append(v_intervention_ids, v_intervention_id);
  END LOOP;

  UPDATE public.demandes_rdv SET
    statut = 'confirmee',
    assigned_operator_id = p_operator_id,
    assigned_date = p_date,
    assigned_time_slot = p_time_slot,
    assigned_heure = p_heure,
    date_confirmee = p_date::timestamptz,
    updated_at = now()
  WHERE id = p_demande_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (
    v_uid, 'rdv_assigne',
    jsonb_build_object(
      'demande_id', p_demande_id,
      'operator_id', p_operator_id,
      'date', p_date,
      'time_slot', p_time_slot,
      'heure', p_heure::text,
      'intervention_ids', to_jsonb(v_intervention_ids)
    ),
    array_length(v_intervention_ids, 1)
  );

  -- Notification client : RDV confirmé
  SELECT p.id INTO v_client_uid
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.entreprise_id = v_demande.entreprise_id AND ur.role = 'client'
  LIMIT 1;

  IF v_client_uid IS NOT NULL THEN
    INSERT INTO public.notifications_internes (
      user_id, source_action, titre, severite, link_url, details, statut, action_requise
    ) VALUES (
      v_client_uid, 'rdv_confirme',
      'RDV confirmé — ' || to_char(p_date, 'DD/MM/YYYY'),
      'info', '/client/prestations',
      jsonb_build_object(
        'demande_id', p_demande_id,
        'date', p_date::text,
        'time_slot', p_time_slot,
        'heure', p_heure::text
      ),
      'non_lu'::notification_statut_enum, false
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'intervention_ids', v_intervention_ids,
    'nb_interventions', array_length(v_intervention_ids, 1)
  );
END;
$$;
