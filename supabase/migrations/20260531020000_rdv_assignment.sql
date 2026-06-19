-- ===========================================================================
-- FEATURE 4 — RDV Assignment: colonnes d'assignation sur demandes_rdv
-- ===========================================================================

-- Note : demandes_rdv (table existante) reçoit 3 nouvelles colonnes.
-- assigned_operator_id lie vers operators (planning admin, pas profiles).
ALTER TABLE public.demandes_rdv
  ADD COLUMN IF NOT EXISTS assigned_operator_id uuid REFERENCES public.operators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_date date,
  ADD COLUMN IF NOT EXISTS assigned_time_slot text CHECK (assigned_time_slot IN ('morning', 'afternoon'));

CREATE INDEX IF NOT EXISTS idx_demandes_rdv_assigned_operator
  ON public.demandes_rdv(assigned_operator_id)
  WHERE assigned_operator_id IS NOT NULL;

COMMENT ON COLUMN public.demandes_rdv.assigned_operator_id IS
  'Opérateur assigné lors de la planification admin (FK operators). Renseigné par la modal Assigner & Planifier.';
COMMENT ON COLUMN public.demandes_rdv.assigned_date IS
  'Date d''intervention assignée par l''admin.';
COMMENT ON COLUMN public.demandes_rdv.assigned_time_slot IS
  'Créneau assigné : morning (08h-12h) ou afternoon (14h-18h).';

-- ---------------------------------------------------------------------------
-- RPC: assigner_rdv — assign opérateur + créneau ET confirme la demande
-- ---------------------------------------------------------------------------
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
  v_vehicule_id uuid;
  v_type_pack text;
  v_intervention_id uuid;
  v_intervention_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  -- Vérifications basiques
  IF p_time_slot NOT IN ('morning', 'afternoon') THEN
    RAISE EXCEPTION 'time_slot invalide : %', p_time_slot;
  END IF;

  SELECT * INTO v_demande FROM public.demandes_rdv WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_demande.statut != 'en_attente' THEN
    RAISE EXCEPTION 'La demande n''est plus en attente (statut: %)', v_demande.statut;
  END IF;

  -- Vérification de capacité (max 3 interventions par opérateur/créneau/date)
  SELECT COUNT(*) INTO v_nb_interventions
  FROM public.interventions
  WHERE operator_id = p_operator_id
    AND date_intervention = p_date
    AND time_slot = p_time_slot;

  IF v_nb_interventions + array_length(v_demande.vehicule_ids, 1) > 3 THEN
    RAISE EXCEPTION 'Créneau saturé (% / 3 interventions)', v_nb_interventions;
  END IF;

  -- Créer une intervention par véhicule
  FOREACH v_vehicule_id IN ARRAY v_demande.vehicule_ids LOOP
    SELECT type_pack_souhaite INTO v_type_pack
    FROM public.vehicules WHERE id = v_vehicule_id AND statut = 'actif';

    INSERT INTO public.interventions (
      entreprise_id, vehicule_id, operator_id, date_intervention,
      time_slot, statut, type_prestation, demande_rdv_id
    ) VALUES (
      v_demande.entreprise_id, v_vehicule_id, p_operator_id, p_date,
      p_time_slot, 'planifiee', COALESCE(v_type_pack, 'complet'), p_demande_id
    ) RETURNING id INTO v_intervention_id;

    v_intervention_ids := array_append(v_intervention_ids, v_intervention_id);
  END LOOP;

  -- Mettre à jour la demande
  UPDATE public.demandes_rdv SET
    statut = 'confirmee',
    assigned_operator_id = p_operator_id,
    assigned_date = p_date,
    assigned_time_slot = p_time_slot,
    date_confirmee = p_date::timestamptz,
    updated_at = now()
  WHERE id = p_demande_id;

  -- Log admin
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

-- RPC: get_slot_occupancy — disponibilités par opérateur sur une semaine
CREATE OR REPLACE FUNCTION public.get_slot_occupancy(
  p_operator_id uuid,
  p_date_debut date,
  p_date_fin date
)
RETURNS TABLE(intervention_date date, time_slot text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT date_intervention, i.time_slot, COUNT(*) AS count
  FROM public.interventions i
  WHERE i.operator_id = p_operator_id
    AND i.date_intervention BETWEEN p_date_debut AND p_date_fin
    AND i.time_slot IS NOT NULL
  GROUP BY date_intervention, i.time_slot;
$$;
GRANT EXECUTE ON FUNCTION public.get_slot_occupancy(uuid, date, date) TO authenticated;
