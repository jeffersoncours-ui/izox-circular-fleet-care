-- =============================================================================
-- FIX QUOTA GEL + élargissement annulation (c.11.2.2.C.3)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculer_quota_gel_consomme(p_entreprise_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_quota INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    (COALESCE(date_fin_effective, date_fin_prevue) - date_debut + 1)
  ), 0)::INTEGER
  INTO v_quota
  FROM public.demandes_gel
  WHERE entreprise_id = p_entreprise_id
    AND statut IN ('en_attente', 'validee', 'active', 'close')
    AND date_debut >= (v_today - INTERVAL '365 days')
    AND date_debut <= (v_today + INTERVAL '365 days');
  RETURN v_quota;
END;
$$;

COMMENT ON FUNCTION public.calculer_quota_gel_consomme(UUID) IS
'Quota de gel CONSOMMÉ par une entreprise sur année glissante (durée RÉSERVÉE totale, pas jours écoulés). c.11.2.2.C.3';

-- Élargir annuler_demande_gel pour accepter aussi 'validee' (gel programmé futur)
CREATE OR REPLACE FUNCTION public.annuler_demande_gel(p_demande_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_d RECORD;
  v_ent UUID;
  v_comm UUID;
BEGIN
  SELECT entreprise_id INTO v_ent FROM profiles WHERE id = v_uid;
  SELECT * INTO v_d FROM demandes_gel WHERE id = p_demande_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_d.entreprise_id <> v_ent THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF v_d.statut NOT IN ('en_attente', 'validee') THEN
    RAISE EXCEPTION 'Seules les demandes en attente ou programmées peuvent être annulées (statut actuel: %)', v_d.statut;
  END IF;
  -- Pour une demande validee, refuser si déjà commencée
  IF v_d.statut = 'validee' AND v_d.date_debut <= CURRENT_DATE THEN
    RAISE EXCEPTION 'Le gel a déjà commencé, annulation impossible';
  END IF;

  SELECT commercial_signataire_id INTO v_comm FROM contrats WHERE id = v_d.contrat_id;
  UPDATE demandes_gel SET statut='annulee', updated_at=NOW() WHERE id = p_demande_id;

  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'demande_gel_annulee_par_client',
    jsonb_build_object('demande_id',p_demande_id,'contrat_id',v_d.contrat_id,'statut_avant',v_d.statut), 1);

  INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut)
  SELECT DISTINCT ON (p.id) p.id, 'demande_gel_annulee_par_client', 'Demande de gel annulée par le client',
    jsonb_build_object('demande_id',p_demande_id,'entreprise_id',v_d.entreprise_id),
    'info', '/admin/demandes-gel?demande='||p_demande_id::TEXT, 'non_lu'
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE (ur.role IN ('admin','staff') OR p.id = v_comm)
    AND p.id <> v_uid;

  RETURN json_build_object('success', true, 'demande_id', p_demande_id);
END;
$$;