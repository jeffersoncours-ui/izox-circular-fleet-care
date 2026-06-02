-- Admin direct vehicle freeze
-- Adds gel_admin_* columns on vehicules + RPCs + extends daily cron

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Columns
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE vehicules
  ADD COLUMN IF NOT EXISTS gel_admin_date_debut DATE    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gel_admin_date_fin   DATE    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gel_admin_motif      TEXT    DEFAULT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. RPC geler_vehicule_admin
--    · date_debut = today  → freeze immediately (statut='gele')
--    · date_debut > today  → schedule (statut stays 'actif', columns stored)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.geler_vehicule_admin(
  p_vehicule_id UUID,
  p_date_debut  DATE,
  p_date_fin    DATE,
  p_motif       TEXT
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_v    RECORD;
  v_pack TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = v_uid AND role IN ('admin','staff')
  ) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  IF p_date_fin IS NULL OR p_date_debut IS NULL THEN
    RAISE EXCEPTION 'Dates obligatoires';
  END IF;
  IF p_date_fin <= p_date_debut THEN
    RAISE EXCEPTION 'La date de fin doit être postérieure à la date de début';
  END IF;
  IF p_motif IS NULL OR length(trim(p_motif)) < 10 THEN
    RAISE EXCEPTION 'Motif trop court (min. 10 caractères)';
  END IF;

  SELECT * INTO v_v FROM vehicules WHERE id = p_vehicule_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Véhicule introuvable'; END IF;

  IF v_v.gel_admin_date_debut IS NOT NULL THEN
    RAISE EXCEPTION 'Ce véhicule a déjà un gel admin en cours ou programmé';
  END IF;
  IF v_v.statut::text <> 'actif' THEN
    RAISE EXCEPTION 'Le véhicule doit être actif pour être gelé (statut actuel : %)', v_v.statut;
  END IF;

  IF p_date_debut <= CURRENT_DATE THEN
    -- Immediate freeze
    v_pack := COALESCE(v_v.type_pack_souhaite, 'pack_standard');

    UPDATE vehicules
    SET statut               = 'gele',
        gel_admin_date_debut = p_date_debut,
        gel_admin_date_fin   = p_date_fin,
        gel_admin_motif      = p_motif,
        updated_at           = NOW()
    WHERE id = p_vehicule_id;

    IF v_v.contrat_id IS NOT NULL THEN
      UPDATE contrat_lignes
      SET nb_vehicules = GREATEST(0, nb_vehicules - 1)
      WHERE contrat_id = v_v.contrat_id AND type_pack = v_pack;

      DELETE FROM contrat_lignes
      WHERE contrat_id = v_v.contrat_id AND nb_vehicules = 0;

      PERFORM _recalculer_caches_contrat(v_v.contrat_id);
    END IF;

    INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
    VALUES (v_uid, 'gel_vehicule_admin', jsonb_build_object(
      'vehicule_id', p_vehicule_id,
      'contrat_id',  v_v.contrat_id,
      'date_debut',  p_date_debut,
      'date_fin',    p_date_fin,
      'motif',       p_motif,
      'type',        'immediat'
    ), 1);

    RETURN json_build_object('success', true, 'type', 'immediat');
  ELSE
    -- Scheduled freeze — only store dates, status stays 'actif'
    UPDATE vehicules
    SET gel_admin_date_debut = p_date_debut,
        gel_admin_date_fin   = p_date_fin,
        gel_admin_motif      = p_motif,
        updated_at           = NOW()
    WHERE id = p_vehicule_id;

    INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
    VALUES (v_uid, 'gel_vehicule_admin', jsonb_build_object(
      'vehicule_id', p_vehicule_id,
      'contrat_id',  v_v.contrat_id,
      'date_debut',  p_date_debut,
      'date_fin',    p_date_fin,
      'motif',       p_motif,
      'type',        'programme'
    ), 1);

    RETURN json_build_object('success', true, 'type', 'programme');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.geler_vehicule_admin(UUID, DATE, DATE, TEXT) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. RPC annuler_gel_vehicule_admin
--    · statut='gele'  → unfreeze + restore contrat_lignes + clear columns
--    · statut='actif' → cancel scheduled gel (just clear columns)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.annuler_gel_vehicule_admin(p_vehicule_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid        UUID := auth.uid();
  v_v          RECORD;
  v_pack       TEXT;
  v_line       UUID;
  v_prix       NUMERIC;
  v_action_type TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = v_uid AND role IN ('admin','staff')
  ) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  SELECT * INTO v_v FROM vehicules WHERE id = p_vehicule_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Véhicule introuvable'; END IF;

  IF v_v.gel_admin_date_debut IS NULL THEN
    RAISE EXCEPTION 'Aucun gel admin sur ce véhicule';
  END IF;

  IF v_v.statut::text = 'gele' THEN
    v_action_type := 'lever_gel';

    UPDATE vehicules
    SET statut               = 'actif',
        gel_admin_date_debut = NULL,
        gel_admin_date_fin   = NULL,
        gel_admin_motif      = NULL,
        updated_at           = NOW()
    WHERE id = p_vehicule_id;

    IF v_v.contrat_id IS NOT NULL THEN
      v_pack := COALESCE(v_v.type_pack_souhaite, 'pack_standard');

      SELECT id INTO v_line FROM contrat_lignes
      WHERE contrat_id = v_v.contrat_id AND type_pack = v_pack LIMIT 1;

      IF v_line IS NOT NULL THEN
        UPDATE contrat_lignes SET nb_vehicules = nb_vehicules + 1 WHERE id = v_line;
      ELSE
        SELECT prix_unitaire_ht INTO v_prix FROM contrat_lignes
        WHERE contrat_id = v_v.contrat_id ORDER BY created_at DESC LIMIT 1;
        IF v_prix IS NULL THEN
          SELECT prix_ht INTO v_prix FROM prestations_catalogue
          WHERE code = v_pack OR type_prestation::text = v_pack LIMIT 1;
        END IF;
        INSERT INTO contrat_lignes (contrat_id, type_pack, nb_vehicules, prix_unitaire_ht)
        VALUES (v_v.contrat_id, v_pack, 1, COALESCE(v_prix, 0));
      END IF;

      PERFORM _recalculer_caches_contrat(v_v.contrat_id);
    END IF;

  ELSIF v_v.statut::text = 'actif' THEN
    v_action_type := 'annuler_gel_programme';

    UPDATE vehicules
    SET gel_admin_date_debut = NULL,
        gel_admin_date_fin   = NULL,
        gel_admin_motif      = NULL,
        updated_at           = NOW()
    WHERE id = p_vehicule_id;

  ELSE
    RAISE EXCEPTION 'Impossible de lever le gel (statut : %)', v_v.statut;
  END IF;

  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'annuler_gel_vehicule_admin', jsonb_build_object(
    'vehicule_id',  p_vehicule_id,
    'contrat_id',   v_v.contrat_id,
    'action_type',  v_action_type
  ), 1);

  RETURN json_build_object('success', true, 'action_type', v_action_type);
END;
$$;

GRANT EXECUTE ON FUNCTION public.annuler_gel_vehicule_admin(UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Extend cron_maintenance_quotidienne
--    Adds two loops for admin vehicle gels:
--    · Activate scheduled admin gels when date_debut is reached
--    · Expire active admin gels when date_fin is passed
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cron_maintenance_quotidienne() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $function$
DECLARE
  v_now_utc timestamptz := now() AT TIME ZONE 'UTC';
  v_today date := (v_now_utc)::date;
  v_seuil_dormance integer := 28; v_duree_onboarding integer := 30;
  v_nb_dormants integer := 0; v_nb_actives integer := 0; v_nb_preavis_echus integer := 0;
  v_nb_gels_actives integer := 0; v_nb_gels_reactives integer := 0;
  v_nb_gels_admin_actives integer := 0; v_nb_gels_admin_expires integer := 0;
  v_contrats_dormants jsonb := '[]'::jsonb;
  v_contrats_actives jsonb := '[]'::jsonb;
  v_contrats_preavis jsonb := '[]'::jsonb;
  v_record record; v_demande record; v_vehicule record; v_vid uuid; v_target uuid;
  v_pack TEXT; v_line UUID; v_prix NUMERIC;
BEGIN
  -- Dormant contracts
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

  -- Onboarding → actif
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

  -- Préavis échus
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

  -- Activate client scheduled gels (demandes_gel validée → active)
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

  -- Expire client gels (demandes_gel active → close)
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

      FOR v_target IN SELECT user_id FROM user_roles WHERE role IN ('admin','staff') LOOP
        INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut)
        VALUES (v_target, 'gel_reactivation_auto', 'Fin de gel automatique',
          jsonb_build_object('demande_id',v_demande.id,'contrat_id',v_demande.contrat_id),
          'info', '/admin/demandes-gel?demande='||v_demande.id::TEXT, 'non_lu');
      END LOOP;
      FOR v_target IN SELECT id FROM profiles WHERE entreprise_id = v_demande.entreprise_id AND role='client' LOOP
        INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut)
        VALUES (v_target, 'gel_reactivation_auto', 'Fin de gel automatique',
          jsonb_build_object('demande_id',v_demande.id,'contrat_id',v_demande.contrat_id),
          'info', '/client/contrats/'||v_demande.contrat_id, 'non_lu');
      END LOOP;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erreur réactivation gel % : %', v_demande.id, SQLERRM;
    END;
  END LOOP;

  -- Activate scheduled admin vehicle gels (date_debut reached)
  FOR v_vehicule IN
    SELECT * FROM vehicules
    WHERE gel_admin_date_debut IS NOT NULL
      AND gel_admin_date_debut <= v_today
      AND statut = 'actif'
  LOOP
    BEGIN
      v_pack := COALESCE(v_vehicule.type_pack_souhaite, 'pack_standard');

      UPDATE vehicules
      SET statut     = 'gele',
          updated_at = NOW()
      WHERE id = v_vehicule.id;

      IF v_vehicule.contrat_id IS NOT NULL THEN
        UPDATE contrat_lignes
        SET nb_vehicules = GREATEST(0, nb_vehicules - 1)
        WHERE contrat_id = v_vehicule.contrat_id AND type_pack = v_pack;

        DELETE FROM contrat_lignes
        WHERE contrat_id = v_vehicule.contrat_id AND nb_vehicules = 0;

        PERFORM _recalculer_caches_contrat(v_vehicule.contrat_id);
      END IF;

      v_nb_gels_admin_actives := v_nb_gels_admin_actives + 1;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erreur activation gel admin véhicule % : %', v_vehicule.id, SQLERRM;
    END;
  END LOOP;

  -- Expire active admin vehicle gels (date_fin passed)
  FOR v_vehicule IN
    SELECT * FROM vehicules
    WHERE gel_admin_date_debut IS NOT NULL
      AND gel_admin_date_fin   IS NOT NULL
      AND gel_admin_date_fin   < v_today
      AND statut = 'gele'
  LOOP
    BEGIN
      v_pack := COALESCE(v_vehicule.type_pack_souhaite, 'pack_standard');

      UPDATE vehicules
      SET statut               = 'actif',
          gel_admin_date_debut = NULL,
          gel_admin_date_fin   = NULL,
          gel_admin_motif      = NULL,
          updated_at           = NOW()
      WHERE id = v_vehicule.id;

      IF v_vehicule.contrat_id IS NOT NULL THEN
        SELECT id INTO v_line FROM contrat_lignes
        WHERE contrat_id = v_vehicule.contrat_id AND type_pack = v_pack LIMIT 1;

        IF v_line IS NOT NULL THEN
          UPDATE contrat_lignes SET nb_vehicules = nb_vehicules + 1 WHERE id = v_line;
        ELSE
          SELECT prix_unitaire_ht INTO v_prix FROM contrat_lignes
          WHERE contrat_id = v_vehicule.contrat_id ORDER BY created_at DESC LIMIT 1;
          IF v_prix IS NULL THEN
            SELECT prix_ht INTO v_prix FROM prestations_catalogue
            WHERE code = v_pack OR type_prestation::text = v_pack LIMIT 1;
          END IF;
          INSERT INTO contrat_lignes (contrat_id, type_pack, nb_vehicules, prix_unitaire_ht)
          VALUES (v_vehicule.contrat_id, v_pack, 1, COALESCE(v_prix, 0));
        END IF;

        PERFORM _recalculer_caches_contrat(v_vehicule.contrat_id);
      END IF;

      v_nb_gels_admin_expires := v_nb_gels_admin_expires + 1;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erreur expiration gel admin véhicule % : %', v_vehicule.id, SQLERRM;
    END;
  END LOOP;

  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (NULL, 'cron_maintenance_quotidienne', jsonb_build_object(
    'date_execution_utc',v_now_utc,'today',v_today,
    'seuil_dormance_jours',v_seuil_dormance,'duree_onboarding_jours',v_duree_onboarding,
    'nb_dormants_detectes',v_nb_dormants,'nb_onboarding_basculees_actif',v_nb_actives,
    'nb_preavis_echus',v_nb_preavis_echus,
    'nb_gels_actives',v_nb_gels_actives,'nb_gels_reactives',v_nb_gels_reactives,
    'nb_gels_admin_actives',v_nb_gels_admin_actives,'nb_gels_admin_expires',v_nb_gels_admin_expires,
    'contrats_dormants',v_contrats_dormants,'contrats_actives',v_contrats_actives,
    'contrats_preavis',v_contrats_preavis),
    v_nb_dormants + v_nb_actives + v_nb_preavis_echus + v_nb_gels_actives + v_nb_gels_reactives
    + v_nb_gels_admin_actives + v_nb_gels_admin_expires);
END;
$function$;
