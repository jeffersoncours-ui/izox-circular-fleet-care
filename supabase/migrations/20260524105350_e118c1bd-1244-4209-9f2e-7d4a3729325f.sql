-- =============================================================================
-- RPC confirmer_demande_rdv_multi — c.11.2.2.B.3
-- =============================================================================
-- DETTE TECHNIQUE : Cette RPC a vocation à REMPLACER à terme
-- public.confirmer_demande_rdv() (signature scalaire mono-véhicule).
--
-- Justification de la coexistence temporaire :
-- - confirmer_demande_rdv (scalaire) : utilisée historiquement, encore appelée
--   par certains workflows en cours de migration
-- - confirmer_demande_rdv_multi (vectorielle) : nouvelle norme, gère
--   atomiquement 1 à N véhicules sur un créneau commun
--
-- Plan de migration (sprint refactor futur c.11.3.x ou v2) :
-- 1. Migrer tous les callers frontend vers confirmer_demande_rdv_multi
-- 2. Marquer confirmer_demande_rdv comme deprecated (RAISE NOTICE)
-- 3. Drop de confirmer_demande_rdv après audit zéro caller
-- 4. Renommer confirmer_demande_rdv_multi en confirmer_demande_rdv
-- =============================================================================

CREATE OR REPLACE FUNCTION public.confirmer_demande_rdv_multi(
  p_demande_id UUID,
  p_date_intervention TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_demande RECORD;
  v_entreprise_id UUID;
  v_vehicule_id UUID;
  v_type_pack TEXT;
  v_intervention_id UUID;
  v_intervention_ids UUID[] := ARRAY[]::UUID[];
  v_premier_vehicule_id UUID;
  v_client_user_id UUID;
  v_nb_vehicules INTEGER;
BEGIN
  v_user_id := auth.uid();

  IF p_date_intervention < NOW() THEN
    RAISE EXCEPTION 'La date d''intervention doit être dans le futur';
  END IF;

  SELECT * INTO v_demande FROM public.demandes_rdv WHERE id = p_demande_id;
  IF v_demande IS NULL THEN
    RAISE EXCEPTION 'Demande introuvable';
  END IF;

  IF v_demande.statut != 'en_attente' THEN
    RAISE EXCEPTION 'La demande n''est plus en attente (statut: %)', v_demande.statut;
  END IF;

  v_entreprise_id := v_demande.entreprise_id;

  IF v_demande.vehicule_ids IS NULL OR array_length(v_demande.vehicule_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Aucun véhicule associé à la demande';
  END IF;

  v_nb_vehicules := array_length(v_demande.vehicule_ids, 1);
  v_premier_vehicule_id := v_demande.vehicule_ids[1];

  FOREACH v_vehicule_id IN ARRAY v_demande.vehicule_ids
  LOOP
    SELECT type_pack_souhaite INTO v_type_pack
    FROM public.vehicules
    WHERE id = v_vehicule_id
      AND entreprise_id = v_entreprise_id
      AND statut = 'actif';

    IF v_type_pack IS NULL THEN
      RAISE EXCEPTION 'Véhicule % introuvable, inactif, ou pack non défini', v_vehicule_id;
    END IF;

    INSERT INTO public.interventions (
      entreprise_id,
      vehicule_id,
      type_prestation,
      date_intervention,
      statut,
      demande_rdv_id,
      created_at
    ) VALUES (
      v_entreprise_id,
      v_vehicule_id,
      v_type_pack,
      p_date_intervention,
      'planifiee',
      p_demande_id,
      NOW()
    ) RETURNING id INTO v_intervention_id;

    v_intervention_ids := array_append(v_intervention_ids, v_intervention_id);
  END LOOP;

  UPDATE public.demandes_rdv
  SET statut = 'confirmee',
      date_confirmee = p_date_intervention,
      vehicule_confirme_id = v_premier_vehicule_id,
      updated_at = NOW()
  WHERE id = p_demande_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, created_at)
  VALUES (
    v_user_id,
    'demande_rdv_confirmee_multi',
    jsonb_build_object(
      'demande_id', p_demande_id,
      'nb_interventions', v_nb_vehicules,
      'intervention_ids', to_jsonb(v_intervention_ids),
      'vehicule_ids', to_jsonb(v_demande.vehicule_ids),
      'date_intervention', p_date_intervention
    ),
    NOW()
  );

  SELECT id INTO v_client_user_id
  FROM public.profiles
  WHERE entreprise_id = v_entreprise_id
  LIMIT 1;

  IF v_client_user_id IS NOT NULL THEN
    INSERT INTO public.notifications_internes (
      user_id, titre, details, source_action, severite, link_url, statut, created_at
    ) VALUES (
      v_client_user_id,
      CASE
        WHEN v_nb_vehicules = 1 THEN 'Votre demande de RDV a été confirmée'
        ELSE format('Votre demande de RDV (%s véhicules) a été confirmée', v_nb_vehicules)
      END,
      jsonb_build_object(
        'demande_id', p_demande_id,
        'intervention_ids', to_jsonb(v_intervention_ids),
        'nb_interventions', v_nb_vehicules,
        'date_intervention', p_date_intervention
      ),
      'demande_rdv_confirmee',
      'info',
      '/client/prestations',
      'non_lu',
      NOW()
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'demande_id', p_demande_id,
    'intervention_ids', v_intervention_ids,
    'nb_interventions', v_nb_vehicules
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirmer_demande_rdv_multi(UUID, TIMESTAMPTZ)
TO authenticated;

COMMENT ON FUNCTION public.confirmer_demande_rdv_multi(UUID, TIMESTAMPTZ) IS
'Confirmation de demande RDV multi-véhicules (1 à N véhicules) avec création atomique de N interventions sur un créneau commun. Vocation : remplacer à terme confirmer_demande_rdv (scalaire) — voir commentaires en tête de migration 20260525_c1122b3 pour le plan de migration complet.';