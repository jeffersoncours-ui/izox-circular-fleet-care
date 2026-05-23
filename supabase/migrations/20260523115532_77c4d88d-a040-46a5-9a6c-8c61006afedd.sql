
-- ============================================================
-- PARTIE 1.1 — Extension CHECK interventions_statut_check
-- ============================================================
ALTER TABLE public.interventions DROP CONSTRAINT IF EXISTS interventions_statut_check;
ALTER TABLE public.interventions
  ADD CONSTRAINT interventions_statut_check
  CHECK (statut IN ('planifiee','en_cours','en_revision','validee','refusee'));

COMMENT ON CONSTRAINT interventions_statut_check ON public.interventions IS
'Statuts autorisés des interventions. ''planifiee'' ajouté en c.11.2.1 pour le workflow demande_rdv -> intervention.';

-- ============================================================
-- PARTIE 1.9 — demandes_rdv : ajout vehicule_ids + colonnes confirmation
-- ============================================================
ALTER TABLE public.demandes_rdv
  ADD COLUMN IF NOT EXISTS vehicule_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS date_confirmee TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vehicule_confirme_id UUID;

ALTER TABLE public.demandes_rdv ALTER COLUMN nb_vehicules_rdv DROP NOT NULL;

ALTER TABLE public.demandes_rdv DROP CONSTRAINT IF EXISTS chk_demandes_rdv_vehicule_ids_count;
ALTER TABLE public.demandes_rdv
  ADD CONSTRAINT chk_demandes_rdv_vehicule_ids_count
  CHECK (
    array_length(vehicule_ids,1) IS NULL
    OR (array_length(vehicule_ids,1) >= 1 AND array_length(vehicule_ids,1) <= 2)
  );

COMMENT ON COLUMN public.demandes_rdv.vehicule_ids IS
'Véhicules concernés par la demande RDV (1 à 2 max, capacité opérationnelle).';

-- ============================================================
-- PARTIE 1.11 — Fonction utilitaire MAX véhicules par demande
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_max_vehicules_par_demande()
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$ SELECT 2 $$;
GRANT EXECUTE ON FUNCTION public.get_max_vehicules_par_demande() TO authenticated;

COMMENT ON FUNCTION public.get_max_vehicules_par_demande() IS
'Capacité opérationnelle max de véhicules par demande RDV. Aligner avec chk_demandes_rdv_vehicule_ids_count.';

-- ============================================================
-- PARTIE 1.2/1.3/1.4 — Refactor demander_gel
-- ============================================================
CREATE OR REPLACE FUNCTION public.demander_gel(
  p_contrat_id UUID, p_type_demande TEXT, p_vehicule_ids UUID[],
  p_date_debut DATE, p_date_fin DATE, p_motif TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_ent UUID; v_c RECORD; v_quota INTEGER; v_duree INTEGER; v_id UUID;
BEGIN
  SELECT entreprise_id INTO v_ent FROM profiles WHERE id = v_uid;
  IF v_ent IS NULL THEN RAISE EXCEPTION 'Utilisateur sans entreprise'; END IF;
  SELECT * INTO v_c FROM contrats WHERE id = p_contrat_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrat introuvable'; END IF;
  IF v_c.entreprise_id <> v_ent THEN RAISE EXCEPTION 'Contrat hors entreprise'; END IF;
  IF v_c.statut::text <> 'actif' THEN RAISE EXCEPTION 'Contrat non actif'; END IF;
  IF p_date_debut < CURRENT_DATE THEN RAISE EXCEPTION 'Date début dans le passé'; END IF;
  v_duree := p_date_fin - p_date_debut;
  IF v_duree < 14 OR v_duree > 90 THEN RAISE EXCEPTION 'Durée invalide (14-90 jours)'; END IF;
  IF LENGTH(TRIM(p_motif)) < 10 THEN RAISE EXCEPTION 'Motif trop court'; END IF;
  v_quota := calculer_quota_gel_consomme(v_ent);
  IF v_quota + v_duree > 90 THEN RAISE EXCEPTION 'Quota 90 jours dépassé (% + %)', v_quota, v_duree; END IF;
  IF EXISTS (SELECT 1 FROM demandes_gel WHERE contrat_id = p_contrat_id AND statut IN ('en_attente','active')) THEN
    RAISE EXCEPTION 'Demande déjà en cours pour ce contrat';
  END IF;
  IF p_type_demande = 'vehicules' AND (p_vehicule_ids IS NULL OR array_length(p_vehicule_ids,1) = 0) THEN
    RAISE EXCEPTION 'Liste véhicules vide';
  END IF;
  INSERT INTO demandes_gel (entreprise_id, contrat_id, type_demande, vehicule_ids, date_debut, date_fin_prevue, motif, statut, created_by)
  VALUES (v_ent, p_contrat_id, p_type_demande,
    CASE WHEN p_type_demande='contrat' THEN NULL ELSE p_vehicule_ids END,
    p_date_debut, p_date_fin, p_motif, 'en_attente', v_uid) RETURNING id INTO v_id;

  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'demande_gel_creee', jsonb_build_object('demande_id',v_id,'contrat_id',p_contrat_id,'type',p_type_demande), 1);

  INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut, action_requise)
  SELECT DISTINCT ON (p.id) p.id, 'demande_gel_creee', 'Nouvelle demande de gel',
    jsonb_build_object('demande_id',v_id,'contrat_id',p_contrat_id,'type',p_type_demande),
    'info', '/admin/demandes-gel?demande='||v_id::TEXT, 'non_lu', TRUE
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE (ur.role IN ('admin','staff') OR p.id = v_c.commercial_signataire_id)
    AND p.id <> v_uid;

  RETURN json_build_object('success', true, 'demande_id', v_id);
END;$$;
GRANT EXECUTE ON FUNCTION public.demander_gel(UUID, TEXT, UUID[], DATE, DATE, TEXT) TO authenticated;

-- ============================================================
-- PARTIE 1.12 — valider_gel : severite 'info' (au lieu de 'success')
-- ============================================================
CREATE OR REPLACE FUNCTION public.valider_gel(p_demande_id UUID) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_d RECORD; v_c RECORD; v_is_admin BOOLEAN; v_new TEXT; v_vid UUID; v_cu UUID;
BEGIN
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid AND role IN ('admin','staff')) INTO v_is_admin;
  SELECT * INTO v_d FROM demandes_gel WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_d.statut <> 'en_attente' THEN RAISE EXCEPTION 'Demande non en attente'; END IF;
  SELECT * INTO v_c FROM contrats WHERE id = v_d.contrat_id;
  IF NOT v_is_admin AND v_c.commercial_signataire_id <> v_uid THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF v_d.date_debut <= CURRENT_DATE THEN
    v_new := 'active';
    IF v_d.type_demande='contrat' THEN
      PERFORM geler_contrat(v_d.contrat_id, v_d.date_debut, v_d.date_fin_prevue, v_d.motif);
    ELSE
      FOREACH v_vid IN ARRAY v_d.vehicule_ids LOOP
        PERFORM geler_vehicule(v_vid, v_d.date_debut, v_d.date_fin_prevue, v_d.motif);
      END LOOP;
    END IF;
  ELSE v_new := 'validee'; END IF;
  UPDATE demandes_gel SET statut=v_new, validated_by=v_uid, validated_at=NOW() WHERE id = p_demande_id;
  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'demande_gel_validee', jsonb_build_object('demande_id',p_demande_id,'statut_final',v_new), 1);

  FOR v_cu IN SELECT id FROM profiles WHERE entreprise_id = v_d.entreprise_id AND role='client' LOOP
    INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut)
    VALUES (v_cu, 'demande_gel_validee', 'Votre demande de gel a été validée',
      jsonb_build_object('demande_id',p_demande_id,'statut',v_new), 'info',
      '/client/contrats/'||v_d.contrat_id, 'non_lu');
  END LOOP;
  RETURN json_build_object('success', true, 'statut', v_new);
END;$$;
GRANT EXECUTE ON FUNCTION public.valider_gel(UUID) TO authenticated;

-- ============================================================
-- refuser_gel : URL inchangée (déjà /client/contrats/), severite warning OK
-- (recréation pour cohérence + s'assurer du link_url paramétré client)
-- ============================================================
CREATE OR REPLACE FUNCTION public.refuser_gel(p_demande_id UUID, p_motif_refus TEXT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_d RECORD; v_c RECORD; v_is_admin BOOLEAN; v_cu UUID;
BEGIN
  IF LENGTH(TRIM(COALESCE(p_motif_refus,''))) < 5 THEN RAISE EXCEPTION 'Motif de refus trop court'; END IF;
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid AND role IN ('admin','staff')) INTO v_is_admin;
  SELECT * INTO v_d FROM demandes_gel WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_d.statut <> 'en_attente' THEN RAISE EXCEPTION 'Demande non en attente'; END IF;
  SELECT * INTO v_c FROM contrats WHERE id = v_d.contrat_id;
  IF NOT v_is_admin AND v_c.commercial_signataire_id <> v_uid THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  UPDATE demandes_gel SET statut='refusee', refus_motif=p_motif_refus, validated_by=v_uid, validated_at=NOW()
  WHERE id = p_demande_id;
  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'demande_gel_refusee', jsonb_build_object('demande_id',p_demande_id,'motif',p_motif_refus), 1);
  FOR v_cu IN SELECT id FROM profiles WHERE entreprise_id = v_d.entreprise_id AND role='client' LOOP
    INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut)
    VALUES (v_cu, 'demande_gel_refusee', 'Votre demande de gel a été refusée',
      jsonb_build_object('demande_id',p_demande_id,'motif_refus',p_motif_refus), 'warning',
      '/client/contrats/'||v_d.contrat_id, 'non_lu');
  END LOOP;
  RETURN json_build_object('success', true);
END;$$;
GRANT EXECUTE ON FUNCTION public.refuser_gel(UUID, TEXT) TO authenticated;

-- ============================================================
-- PARTIE 1.6 — annuler_demande_gel (nouvelle RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION public.annuler_demande_gel(p_demande_id UUID) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_d RECORD; v_ent UUID; v_comm UUID;
BEGIN
  SELECT entreprise_id INTO v_ent FROM profiles WHERE id = v_uid;
  SELECT * INTO v_d FROM demandes_gel WHERE id = p_demande_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_d.entreprise_id <> v_ent THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF v_d.statut <> 'en_attente' THEN RAISE EXCEPTION 'Seule une demande en attente peut être annulée (statut actuel: %)', v_d.statut; END IF;
  SELECT commercial_signataire_id INTO v_comm FROM contrats WHERE id = v_d.contrat_id;
  UPDATE demandes_gel SET statut='annulee', updated_at=NOW() WHERE id = p_demande_id;
  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'demande_gel_annulee_par_client',
    jsonb_build_object('demande_id',p_demande_id,'contrat_id',v_d.contrat_id), 1);

  INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut)
  SELECT DISTINCT ON (p.id) p.id, 'demande_gel_annulee_par_client', 'Demande de gel annulée par le client',
    jsonb_build_object('demande_id',p_demande_id,'entreprise_id',v_d.entreprise_id),
    'info', '/admin/demandes-gel?demande='||p_demande_id::TEXT, 'non_lu'
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE (ur.role IN ('admin','staff') OR p.id = v_comm)
    AND p.id <> v_uid;

  RETURN json_build_object('success', true, 'demande_id', p_demande_id);
END;$$;
GRANT EXECUTE ON FUNCTION public.annuler_demande_gel(UUID) TO authenticated;

-- ============================================================
-- PARTIE 1.10 — Refactor creer_demande_rdv (signature vehicule_ids)
-- ============================================================
DROP FUNCTION IF EXISTS public.creer_demande_rdv(JSONB, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.creer_demande_rdv(
  p_vehicule_ids UUID[], p_creneaux_preferes JSONB, p_commentaires TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_ent UUID; v_id UUID; v_nom TEXT;
BEGIN
  SELECT entreprise_id INTO v_ent FROM profiles WHERE id = v_uid;
  IF v_ent IS NULL THEN RAISE EXCEPTION 'Utilisateur sans entreprise rattachée'; END IF;
  IF p_vehicule_ids IS NULL OR array_length(p_vehicule_ids,1) < 1 THEN
    RAISE EXCEPTION 'Sélectionnez au moins 1 véhicule';
  END IF;
  IF array_length(p_vehicule_ids,1) > 2 THEN
    RAISE EXCEPTION 'Maximum 2 véhicules par demande';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_vehicule_ids) AS vid
    WHERE NOT EXISTS (
      SELECT 1 FROM vehicules WHERE id = vid AND entreprise_id = v_ent AND statut::text='actif'
    )
  ) THEN
    RAISE EXCEPTION 'Un ou plusieurs véhicules sélectionnés ne sont pas valides';
  END IF;
  IF p_creneaux_preferes IS NULL OR jsonb_array_length(p_creneaux_preferes) = 0 THEN
    RAISE EXCEPTION 'Au moins un créneau préféré requis';
  END IF;

  SELECT nom INTO v_nom FROM entreprises WHERE id = v_ent;

  INSERT INTO demandes_rdv (entreprise_id, statut, vehicule_ids, creneaux_preferes, commentaires, nb_vehicules_rdv)
  VALUES (v_ent, 'en_attente', p_vehicule_ids, p_creneaux_preferes, p_commentaires, array_length(p_vehicule_ids,1))
  RETURNING id INTO v_id;

  INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut, action_requise)
  SELECT DISTINCT ON (p.id) p.id, 'demande_rdv_creee',
    'Nouvelle demande RDV — '||COALESCE(v_nom,''),
    jsonb_build_object('demande_id',v_id,'entreprise_id',v_ent,'nb_vehicules',array_length(p_vehicule_ids,1)),
    'info', '/admin/demandes-rdv?demande='||v_id::TEXT, 'non_lu', TRUE
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role IN ('admin','staff') AND p.id <> v_uid;

  RETURN json_build_object('success', true, 'demande_id', v_id);
END;$$;
GRANT EXECUTE ON FUNCTION public.creer_demande_rdv(UUID[], JSONB, TEXT) TO authenticated;

-- ============================================================
-- PARTIE 1.5/1.8 — Refactor confirmer_demande_rdv
-- ============================================================
DROP FUNCTION IF EXISTS public.confirmer_demande_rdv(UUID, TIMESTAMPTZ, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.confirmer_demande_rdv(
  p_demande_id UUID, p_date_intervention TIMESTAMPTZ, p_vehicule_id UUID
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_d RECORD; v_type_pack TEXT; v_iid UUID; v_is_admin BOOLEAN; v_cu UUID;
BEGIN
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid AND role IN ('admin','staff')) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF p_date_intervention < NOW() THEN RAISE EXCEPTION 'La date d''intervention doit être dans le futur'; END IF;

  SELECT * INTO v_d FROM demandes_rdv WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_d.statut <> 'en_attente' THEN RAISE EXCEPTION 'La demande n''est plus en attente (statut: %)', v_d.statut; END IF;

  SELECT type_pack_souhaite INTO v_type_pack
  FROM vehicules
  WHERE id = p_vehicule_id AND entreprise_id = v_d.entreprise_id AND statut::text = 'actif';
  IF v_type_pack IS NULL THEN RAISE EXCEPTION 'Véhicule introuvable ou pack non défini'; END IF;

  INSERT INTO interventions (entreprise_id, vehicule_id, type_prestation, date_intervention, statut, demande_rdv_id)
  VALUES (v_d.entreprise_id, p_vehicule_id, v_type_pack, p_date_intervention::date, 'planifiee', p_demande_id)
  RETURNING id INTO v_iid;

  UPDATE demandes_rdv
    SET statut='confirmee', date_confirmee=p_date_intervention, vehicule_confirme_id=p_vehicule_id, updated_at=NOW()
  WHERE id = p_demande_id;

  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'demande_rdv_confirmee',
    jsonb_build_object('demande_id',p_demande_id,'intervention_id',v_iid,'vehicule_id',p_vehicule_id,'type_pack',v_type_pack), 1);

  FOR v_cu IN SELECT id FROM profiles WHERE entreprise_id = v_d.entreprise_id AND role='client' LOOP
    INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut)
    VALUES (v_cu, 'demande_rdv_confirmee', 'Votre demande de RDV a été confirmée',
      jsonb_build_object('demande_id',p_demande_id,'intervention_id',v_iid,'date_intervention',p_date_intervention),
      'info', '/client/prestations', 'non_lu');
  END LOOP;

  RETURN json_build_object('success', true, 'demande_id', p_demande_id, 'intervention_id', v_iid, 'type_pack', v_type_pack);
END;$$;
GRANT EXECUTE ON FUNCTION public.confirmer_demande_rdv(UUID, TIMESTAMPTZ, UUID) TO authenticated;

-- ============================================================
-- refuser_demande_rdv : déjà 'warning' + URL /client/prestations OK
-- (recréation pour confirmer le mapping)
-- ============================================================
CREATE OR REPLACE FUNCTION public.refuser_demande_rdv(p_demande_id UUID, p_motif TEXT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_d RECORD; v_is_admin BOOLEAN; v_cu UUID;
BEGIN
  IF LENGTH(TRIM(COALESCE(p_motif,''))) < 5 THEN RAISE EXCEPTION 'Motif trop court'; END IF;
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid AND role IN ('admin','staff')) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  SELECT * INTO v_d FROM demandes_rdv WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_d.statut <> 'en_attente' THEN RAISE EXCEPTION 'Demande non en attente'; END IF;
  UPDATE demandes_rdv SET statut='refusee',
    commentaires = COALESCE(commentaires,'') || E'\n[Refus] ' || p_motif, updated_at=NOW()
  WHERE id = p_demande_id;
  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'demande_rdv_refusee', jsonb_build_object('demande_id',p_demande_id,'motif',p_motif), 1);
  FOR v_cu IN SELECT id FROM profiles WHERE entreprise_id = v_d.entreprise_id AND role='client' LOOP
    INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut)
    VALUES (v_cu, 'demande_rdv_refusee', 'Votre demande de RDV a été refusée',
      jsonb_build_object('demande_id',p_demande_id,'motif',p_motif), 'warning',
      '/client/prestations', 'non_lu');
  END LOOP;
  RETURN json_build_object('success', true);
END;$$;
GRANT EXECUTE ON FUNCTION public.refuser_demande_rdv(UUID, TEXT) TO authenticated;

-- ============================================================
-- PARTIE 1.7 — annuler_demande_rdv (nouvelle RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION public.annuler_demande_rdv(p_demande_id UUID) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_d RECORD; v_ent UUID;
BEGIN
  SELECT entreprise_id INTO v_ent FROM profiles WHERE id = v_uid;
  SELECT * INTO v_d FROM demandes_rdv WHERE id = p_demande_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_d.entreprise_id <> v_ent THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF v_d.statut <> 'en_attente' THEN RAISE EXCEPTION 'Seule une demande en attente peut être annulée (statut actuel: %)', v_d.statut; END IF;

  UPDATE demandes_rdv SET statut='annulee_client', updated_at=NOW() WHERE id = p_demande_id;
  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'demande_rdv_annulee_par_client',
    jsonb_build_object('demande_id',p_demande_id,'entreprise_id',v_d.entreprise_id), 1);

  INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut)
  SELECT DISTINCT ON (p.id) p.id, 'demande_rdv_annulee_par_client', 'Demande RDV annulée par le client',
    jsonb_build_object('demande_id',p_demande_id,'entreprise_id',v_d.entreprise_id),
    'info', '/admin/demandes-rdv?demande='||p_demande_id::TEXT, 'non_lu'
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role IN ('admin','staff') AND p.id <> v_uid;

  RETURN json_build_object('success', true, 'demande_id', p_demande_id);
END;$$;
GRANT EXECUTE ON FUNCTION public.annuler_demande_rdv(UUID) TO authenticated;

-- ============================================================
-- PARTIE 1.13 — Cron tâche 4 : URLs dédiées admin vs client, severite 'info'
-- ============================================================
CREATE OR REPLACE FUNCTION public.cron_maintenance_quotidienne() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_now_utc timestamptz := now() AT TIME ZONE 'UTC';
  v_today date := (v_now_utc)::date;
  v_seuil_dormance integer := 28; v_duree_onboarding integer := 30;
  v_nb_dormants integer := 0; v_nb_actives integer := 0; v_nb_preavis_echus integer := 0;
  v_nb_gels_actives integer := 0; v_nb_gels_reactives integer := 0;
  v_contrats_dormants jsonb := '[]'::jsonb;
  v_contrats_actives jsonb := '[]'::jsonb;
  v_contrats_preavis jsonb := '[]'::jsonb;
  v_record record; v_demande record; v_vid uuid; v_target uuid;
BEGIN
  FOR v_record IN
    SELECT id, numero_contrat, date_dernier_passage, created_at FROM contrats
    WHERE statut IN ('actif','en_cours_gel') AND status_cycle='actif'
      AND ((date_dernier_passage IS NOT NULL AND date_dernier_passage < (v_today - INTERVAL '28 days')::date)
        OR (date_dernier_passage IS NULL AND created_at < (v_now_utc - INTERVAL '28 days')))
  LOOP
    BEGIN
      UPDATE contrats SET status_cycle='dormant' WHERE id = v_record.id;
      v_nb_dormants := v_nb_dormants + 1;
      v_contrats_dormants := v_contrats_dormants || jsonb_build_object(
        'contrat_id',v_record.id,'numero_contrat',v_record.numero_contrat,
        'date_dernier_passage',v_record.date_dernier_passage,'created_at',v_record.created_at);
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erreur dormant % : %', v_record.numero_contrat, SQLERRM;
    END;
  END LOOP;

  FOR v_record IN
    SELECT id, numero_contrat, created_at FROM contrats
    WHERE statut IN ('actif','en_cours_gel') AND status_cycle='onboarding'
      AND created_at < (v_now_utc - INTERVAL '30 days')
  LOOP
    BEGIN
      UPDATE contrats SET status_cycle='actif' WHERE id = v_record.id;
      v_nb_actives := v_nb_actives + 1;
      v_contrats_actives := v_contrats_actives || jsonb_build_object(
        'contrat_id',v_record.id,'numero_contrat',v_record.numero_contrat,'created_at',v_record.created_at);
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erreur actif % : %', v_record.numero_contrat, SQLERRM;
    END;
  END LOOP;

  FOR v_record IN
    SELECT id, numero_contrat, preavis_deadline, date_fin_engagement, engagement_type FROM contrats
    WHERE statut IN ('actif','en_cours_gel') AND preavis_deadline = v_today
  LOOP
    v_nb_preavis_echus := v_nb_preavis_echus + 1;
    v_contrats_preavis := v_contrats_preavis || jsonb_build_object(
      'contrat_id',v_record.id,'numero_contrat',v_record.numero_contrat,
      'preavis_deadline',v_record.preavis_deadline,
      'date_fin_engagement',v_record.date_fin_engagement,'engagement_type',v_record.engagement_type);
  END LOOP;

  FOR v_demande IN SELECT * FROM demandes_gel WHERE statut='validee' AND date_debut <= v_today LOOP
    BEGIN
      IF v_demande.type_demande='contrat' THEN
        PERFORM geler_contrat(v_demande.contrat_id, v_demande.date_debut, v_demande.date_fin_prevue, v_demande.motif);
      ELSE
        FOREACH v_vid IN ARRAY v_demande.vehicule_ids LOOP
          PERFORM geler_vehicule(v_vid, v_demande.date_debut, v_demande.date_fin_prevue, v_demande.motif);
        END LOOP;
      END IF;
      UPDATE demandes_gel SET statut='active' WHERE id = v_demande.id;
      v_nb_gels_actives := v_nb_gels_actives + 1;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erreur activation gel % : %', v_demande.id, SQLERRM;
    END;
  END LOOP;

  FOR v_demande IN SELECT * FROM demandes_gel WHERE statut='active' AND date_fin_prevue < v_today LOOP
    BEGIN
      IF v_demande.type_demande='contrat' THEN
        PERFORM degeler_contrat(v_demande.contrat_id, 'cron');
      ELSE
        FOREACH v_vid IN ARRAY v_demande.vehicule_ids LOOP
          PERFORM degeler_vehicule(v_vid, 'cron');
        END LOOP;
      END IF;
      UPDATE demandes_gel SET statut='close', date_fin_effective=v_today WHERE id = v_demande.id;
      v_nb_gels_reactives := v_nb_gels_reactives + 1;

      -- Notif admin/staff (URL admin paramétrée)
      FOR v_target IN SELECT user_id FROM user_roles WHERE role IN ('admin','staff') LOOP
        INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut)
        VALUES (v_target, 'gel_reactivation_auto', 'Fin de gel automatique',
          jsonb_build_object('demande_id',v_demande.id,'contrat_id',v_demande.contrat_id),
          'info', '/admin/demandes-gel?demande='||v_demande.id::TEXT, 'non_lu');
      END LOOP;
      -- Notif clients (URL client contrat)
      FOR v_target IN SELECT id FROM profiles WHERE entreprise_id = v_demande.entreprise_id AND role='client' LOOP
        INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut)
        VALUES (v_target, 'gel_reactivation_auto', 'Fin de gel automatique',
          jsonb_build_object('demande_id',v_demande.id,'contrat_id',v_demande.contrat_id),
          'info', '/client/contrats/'||v_demande.contrat_id, 'non_lu');
      END LOOP;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erreur réactivation gel % : %', v_demande.id, SQLERRM;
    END;
  END LOOP;

  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (NULL, 'cron_maintenance_quotidienne', jsonb_build_object(
    'date_execution_utc',v_now_utc,'today',v_today,
    'seuil_dormance_jours',v_seuil_dormance,'duree_onboarding_jours',v_duree_onboarding,
    'nb_dormants_detectes',v_nb_dormants,'nb_onboarding_basculees_actif',v_nb_actives,
    'nb_preavis_echus',v_nb_preavis_echus,
    'nb_gels_actives',v_nb_gels_actives,'nb_gels_reactives',v_nb_gels_reactives,
    'contrats_dormants',v_contrats_dormants,'contrats_actives',v_contrats_actives,
    'contrats_preavis',v_contrats_preavis),
    v_nb_dormants + v_nb_actives + v_nb_preavis_echus + v_nb_gels_actives + v_nb_gels_reactives);
END;
$function$;
