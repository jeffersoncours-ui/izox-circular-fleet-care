-- Ajouter colonne heure précise sur interventions
ALTER TABLE public.interventions
  ADD COLUMN IF NOT EXISTS heure_intervention TIME;

-- Ajouter colonne heure assignée sur demandes_rdv
ALTER TABLE public.demandes_rdv
  ADD COLUMN IF NOT EXISTS assigned_heure TIME;

-- Mettre à jour assigner_rdv pour accepter p_heure
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
  v_uid             uuid := auth.uid();
  v_demande         RECORD;
  v_nb_interventions int;
  v_nb_vehicules    int;
  v_vehicule_id     uuid;
  v_type_pack       text;
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
      time_slot, heure_intervention, statut, type_prestation, demande_rdv_id,
      adresse_intervention, ville_intervention, code_postal_intervention
    ) VALUES (
      v_demande.entreprise_id, v_vehicule_id, p_operator_id, p_date,
      p_time_slot, p_heure, 'planifiee', COALESCE(v_type_pack, 'complet'), p_demande_id,
      v_demande.adresse_intervention, v_demande.ville_intervention, v_demande.code_postal_intervention
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
