
CREATE OR REPLACE FUNCTION public.calculer_quota_gel_consomme(p_entreprise_id UUID)
RETURNS INTEGER LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_today DATE := CURRENT_DATE; v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(GREATEST(0,
    LEAST(COALESCE(date_fin_effective, date_fin_prevue), v_today)
    - GREATEST(date_debut, v_today - 365) + 1)), 0)::INTEGER INTO v_total
  FROM public.demandes_gel
  WHERE entreprise_id = p_entreprise_id
    AND statut IN ('validee','active','close')
    AND date_debut <= v_today
    AND COALESCE(date_fin_effective, date_fin_prevue) >= (v_today - 365);
  RETURN GREATEST(v_total, 0);
END;$$;
GRANT EXECUTE ON FUNCTION public.calculer_quota_gel_consomme(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public._recalculer_caches_contrat(p_contrat_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nb INTEGER; v_palier TEXT; v_remise NUMERIC; v_comm NUMERIC; v_facteur NUMERIC; v_brut NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_nb FROM vehicules WHERE contrat_id = p_contrat_id AND statut::text='actif';
  SELECT palier, remise_pct INTO v_palier, v_remise FROM calculer_palier_remise(v_nb);
  SELECT COALESCE(SUM(prix_unitaire_ht * nb_vehicules), 0) INTO v_brut
    FROM contrat_lignes WHERE contrat_id = p_contrat_id AND COALESCE(statut_ligne,'actif')='actif';
  SELECT COALESCE(remise_commerciale_pct,0) INTO v_comm FROM contrats WHERE id = p_contrat_id;
  v_facteur := GREATEST(0.70, (1 - v_remise) * (1 - COALESCE(v_comm,0)));
  UPDATE contrats SET nb_vehicules_actifs=v_nb, palier=v_palier, remise_pct=v_remise,
    montant_brut_mensuel=v_brut, montant_net_mensuel=ROUND(v_brut * v_facteur, 2), updated_at=NOW()
  WHERE id = p_contrat_id;
END;$$;

CREATE OR REPLACE FUNCTION public.geler_contrat(p_contrat_id UUID, p_date_debut DATE, p_date_fin DATE, p_motif TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_contrat RECORD; v_uid UUID := auth.uid(); v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid AND role IN ('admin','staff')) INTO v_is_admin;
  SELECT * INTO v_contrat FROM contrats WHERE id = p_contrat_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrat introuvable'; END IF;
  IF NOT v_is_admin AND v_contrat.commercial_signataire_id <> v_uid THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF v_contrat.statut::text <> 'actif' THEN RAISE EXCEPTION 'Contrat non actif (%)', v_contrat.statut; END IF;
  PERFORM 1 FROM entreprises WHERE id = v_contrat.entreprise_id FOR UPDATE;
  UPDATE contrats SET statut='en_cours_gel', gel_actif=TRUE, gel_type='programme',
    gel_date_debut=p_date_debut, gel_date_fin=p_date_fin, gel_commentaire=p_motif,
    montant_net_mensuel=0, updated_at=NOW() WHERE id = p_contrat_id;
  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'gel_contrat', jsonb_build_object('contrat_id',p_contrat_id,'date_debut',p_date_debut,'date_fin',p_date_fin,'motif',p_motif), 1);
  RETURN json_build_object('success', true, 'contrat_id', p_contrat_id);
END;$$;
GRANT EXECUTE ON FUNCTION public.geler_contrat(UUID, DATE, DATE, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.degeler_contrat(p_contrat_id UUID, p_source TEXT DEFAULT 'manuel')
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_contrat RECORD; v_uid UUID := auth.uid(); v_is_admin BOOLEAN;
BEGIN
  IF p_source <> 'cron' THEN
    SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid AND role IN ('admin','staff')) INTO v_is_admin;
    IF NOT v_is_admin THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  END IF;
  SELECT * INTO v_contrat FROM contrats WHERE id = p_contrat_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrat introuvable'; END IF;
  IF v_contrat.statut::text <> 'en_cours_gel' THEN RAISE EXCEPTION 'Contrat non en gel (%)', v_contrat.statut; END IF;
  UPDATE contrats SET statut='actif', gel_actif=FALSE, gel_date_fin=NULL, gel_date_debut=NULL, updated_at=NOW() WHERE id = p_contrat_id;
  PERFORM _recalculer_caches_contrat(p_contrat_id);
  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'reactivation_contrat', jsonb_build_object('contrat_id',p_contrat_id,'source',p_source), 1);
  RETURN json_build_object('success', true, 'contrat_id', p_contrat_id);
END;$$;
GRANT EXECUTE ON FUNCTION public.degeler_contrat(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.geler_vehicule(p_vehicule_id UUID, p_date_debut DATE, p_date_fin DATE, p_motif TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_v RECORD; v_c RECORD; v_uid UUID := auth.uid(); v_is_admin BOOLEAN; v_pack TEXT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid AND role IN ('admin','staff')) INTO v_is_admin;
  SELECT * INTO v_v FROM vehicules WHERE id = p_vehicule_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Véhicule introuvable'; END IF;
  IF v_v.statut::text <> 'actif' THEN RAISE EXCEPTION 'Véhicule non actif (%)', v_v.statut; END IF;
  IF v_v.contrat_id IS NULL THEN RAISE EXCEPTION 'Véhicule sans contrat'; END IF;
  SELECT * INTO v_c FROM contrats WHERE id = v_v.contrat_id FOR UPDATE;
  IF NOT v_is_admin AND v_c.commercial_signataire_id <> v_uid THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  PERFORM 1 FROM entreprises WHERE id = v_v.entreprise_id FOR UPDATE;
  UPDATE vehicules SET statut='gele', updated_at=NOW() WHERE id = p_vehicule_id;
  v_pack := COALESCE(v_v.type_pack_souhaite, 'pack_standard');
  UPDATE contrat_lignes SET nb_vehicules = GREATEST(0, nb_vehicules - 1)
    WHERE contrat_id = v_v.contrat_id AND type_pack = v_pack;
  DELETE FROM contrat_lignes WHERE contrat_id = v_v.contrat_id AND nb_vehicules = 0;
  PERFORM _recalculer_caches_contrat(v_v.contrat_id);
  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'gel_vehicule', jsonb_build_object('vehicule_id',p_vehicule_id,'contrat_id',v_v.contrat_id,'date_debut',p_date_debut,'date_fin',p_date_fin,'motif',p_motif), 1);
  RETURN json_build_object('success', true, 'vehicule_id', p_vehicule_id);
END;$$;
GRANT EXECUTE ON FUNCTION public.geler_vehicule(UUID, DATE, DATE, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.degeler_vehicule(p_vehicule_id UUID, p_source TEXT DEFAULT 'manuel')
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_v RECORD; v_uid UUID := auth.uid(); v_is_admin BOOLEAN; v_pack TEXT; v_line UUID; v_prix NUMERIC;
BEGIN
  IF p_source <> 'cron' THEN
    SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid AND role IN ('admin','staff')) INTO v_is_admin;
    IF NOT v_is_admin THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  END IF;
  SELECT * INTO v_v FROM vehicules WHERE id = p_vehicule_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Véhicule introuvable'; END IF;
  IF v_v.statut::text <> 'gele' THEN RAISE EXCEPTION 'Véhicule non gelé (%)', v_v.statut; END IF;
  UPDATE vehicules SET statut='actif', updated_at=NOW() WHERE id = p_vehicule_id;
  IF v_v.contrat_id IS NOT NULL THEN
    v_pack := COALESCE(v_v.type_pack_souhaite, 'pack_standard');
    SELECT id INTO v_line FROM contrat_lignes WHERE contrat_id = v_v.contrat_id AND type_pack = v_pack LIMIT 1;
    IF v_line IS NOT NULL THEN
      UPDATE contrat_lignes SET nb_vehicules = nb_vehicules + 1 WHERE id = v_line;
    ELSE
      SELECT prix_unitaire_ht INTO v_prix FROM contrat_lignes WHERE contrat_id = v_v.contrat_id ORDER BY created_at DESC LIMIT 1;
      IF v_prix IS NULL THEN
        SELECT prix_ht INTO v_prix FROM prestations_catalogue WHERE code = v_pack OR type_prestation::text = v_pack LIMIT 1;
      END IF;
      INSERT INTO contrat_lignes (contrat_id, type_pack, nb_vehicules, prix_unitaire_ht)
      VALUES (v_v.contrat_id, v_pack, 1, COALESCE(v_prix, 0));
    END IF;
    PERFORM _recalculer_caches_contrat(v_v.contrat_id);
  END IF;
  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'degel_vehicule', jsonb_build_object('vehicule_id',p_vehicule_id,'source',p_source), 1);
  RETURN json_build_object('success', true, 'vehicule_id', p_vehicule_id);
END;$$;
GRANT EXECUTE ON FUNCTION public.degeler_vehicule(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.demander_gel(p_contrat_id UUID, p_type_demande TEXT, p_vehicule_ids UUID[], p_date_debut DATE, p_date_fin DATE, p_motif TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_ent UUID; v_c RECORD; v_quota INTEGER; v_duree INTEGER; v_id UUID; v_t UUID;
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
  FOR v_t IN
    SELECT user_id FROM user_roles WHERE role IN ('admin','staff')
    UNION
    SELECT v_c.commercial_signataire_id WHERE v_c.commercial_signataire_id IS NOT NULL
  LOOP
    INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut, action_requise)
    VALUES (v_t, 'demande_gel_creee', 'Nouvelle demande de gel',
      jsonb_build_object('demande_id',v_id,'contrat_id',p_contrat_id,'type',p_type_demande),
      'info', '/admin/contrats/'||p_contrat_id, 'non_lu', TRUE);
  END LOOP;
  RETURN json_build_object('success', true, 'demande_id', v_id);
END;$$;
GRANT EXECUTE ON FUNCTION public.demander_gel(UUID, TEXT, UUID[], DATE, DATE, TEXT) TO authenticated;

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
      jsonb_build_object('demande_id',p_demande_id,'statut',v_new), 'success',
      '/client/contrats/'||v_d.contrat_id, 'non_lu');
  END LOOP;
  RETURN json_build_object('success', true, 'statut', v_new);
END;$$;
GRANT EXECUTE ON FUNCTION public.valider_gel(UUID) TO authenticated;

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

CREATE OR REPLACE FUNCTION public.creer_demande_rdv(p_creneaux_preferes JSONB, p_commentaires TEXT, p_nb_vehicules INTEGER DEFAULT 1)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_ent UUID; v_id UUID; v_t UUID;
BEGIN
  SELECT entreprise_id INTO v_ent FROM profiles WHERE id = v_uid;
  IF v_ent IS NULL THEN RAISE EXCEPTION 'Utilisateur sans entreprise'; END IF;
  IF p_creneaux_preferes IS NULL OR jsonb_array_length(p_creneaux_preferes)=0 THEN
    RAISE EXCEPTION 'Créneaux préférés vides';
  END IF;
  INSERT INTO demandes_rdv (entreprise_id, statut, creneaux_preferes, commentaires, nb_vehicules_rdv)
  VALUES (v_ent, 'en_attente', p_creneaux_preferes, p_commentaires, GREATEST(1, COALESCE(p_nb_vehicules,1)))
  RETURNING id INTO v_id;
  FOR v_t IN SELECT user_id FROM user_roles WHERE role IN ('admin','staff') LOOP
    INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut, action_requise)
    VALUES (v_t, 'demande_rdv_creee', 'Nouvelle demande de RDV',
      jsonb_build_object('demande_id',v_id,'entreprise_id',v_ent), 'info',
      '/admin/rendez-vous', 'non_lu', TRUE);
  END LOOP;
  RETURN json_build_object('success', true, 'demande_id', v_id);
END;$$;
GRANT EXECUTE ON FUNCTION public.creer_demande_rdv(JSONB, TEXT, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirmer_demande_rdv(p_demande_id UUID, p_date_intervention TIMESTAMPTZ, p_vehicule_id UUID, p_type_pack TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_d RECORD; v_v RECORD; v_iid UUID; v_is_admin BOOLEAN; v_cu UUID;
BEGIN
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_uid AND role IN ('admin','staff')) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  SELECT * INTO v_d FROM demandes_rdv WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_d.statut <> 'en_attente' THEN RAISE EXCEPTION 'Demande non en attente'; END IF;
  SELECT * INTO v_v FROM vehicules WHERE id = p_vehicule_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Véhicule introuvable'; END IF;
  INSERT INTO interventions (entreprise_id, vehicule_id, type_prestation, date_intervention, statut, demande_rdv_id)
  VALUES (v_d.entreprise_id, p_vehicule_id, p_type_pack, p_date_intervention::date, 'planifiee', p_demande_id)
  RETURNING id INTO v_iid;
  UPDATE demandes_rdv SET statut='confirmee', updated_at=NOW() WHERE id = p_demande_id;
  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'demande_rdv_confirmee', jsonb_build_object('demande_id',p_demande_id,'intervention_id',v_iid,'date',p_date_intervention), 1);
  FOR v_cu IN SELECT id FROM profiles WHERE entreprise_id = v_d.entreprise_id AND role='client' LOOP
    INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut)
    VALUES (v_cu, 'demande_rdv_confirmee', 'Votre rendez-vous a été confirmé',
      jsonb_build_object('demande_id',p_demande_id,'intervention_id',v_iid,'date',p_date_intervention),
      'success', '/client/prestations', 'non_lu');
  END LOOP;
  RETURN json_build_object('success', true, 'intervention_id', v_iid);
END;$$;
GRANT EXECUTE ON FUNCTION public.confirmer_demande_rdv(UUID, TIMESTAMPTZ, UUID, TEXT) TO authenticated;

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
      FOR v_target IN
        SELECT user_id FROM user_roles WHERE role IN ('admin','staff')
        UNION
        SELECT id FROM profiles WHERE entreprise_id = v_demande.entreprise_id AND role='client'
      LOOP
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
