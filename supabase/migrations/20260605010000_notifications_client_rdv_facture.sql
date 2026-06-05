-- Migration: notifications client pour RDV et factures
-- Complète le système de notifications côté client pour les 4 RPCs manquants :
--   assigner_rdv, annuler_rdv_admin, modifier_heure_rdv, emettre_facture
-- Les RPCs valider_vehicule, valider_gel, refuser_gel avaient déjà leurs notifications client.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. assigner_rdv — RDV confirmé → notifier le client
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assigner_rdv(
  p_demande_id uuid,
  p_operator_id uuid,
  p_date date,
  p_time_slot text,
  p_heure time without time zone DEFAULT NULL::time without time zone
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
  v_client_uid       uuid;
BEGIN
  IF p_time_slot NOT IN ('morning', 'afternoon') THEN RAISE EXCEPTION 'time_slot invalide : %', p_time_slot; END IF;
  SELECT * INTO v_demande FROM public.demandes_rdv WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_demande.statut != 'en_attente' THEN RAISE EXCEPTION 'La demande n''est plus en attente (statut: %)', v_demande.statut; END IF;
  v_nb_vehicules := COALESCE(array_length(v_demande.vehicule_ids, 1), 0);
  IF v_nb_vehicules = 0 THEN RAISE EXCEPTION 'Aucun véhicule associé à cette demande'; END IF;
  SELECT COUNT(*) INTO v_nb_interventions FROM public.interventions WHERE operator_id = p_operator_id AND date_intervention = p_date AND time_slot = p_time_slot;
  IF v_nb_interventions + v_nb_vehicules > 2 THEN
    RAISE EXCEPTION 'Créneau saturé : % intervention(s) déjà planifiée(s), +% demandée(s) (max 2 par demi-journée)', v_nb_interventions, v_nb_vehicules;
  END IF;

  FOREACH v_vehicule_id IN ARRAY v_demande.vehicule_ids LOOP
    SELECT type_pack_souhaite INTO v_type_pack FROM public.vehicules WHERE id = v_vehicule_id AND statut = 'actif';
    SELECT cl.id INTO v_contrat_ligne_id FROM contrat_lignes cl JOIN contrats c ON c.id = cl.contrat_id
    WHERE c.entreprise_id = v_demande.entreprise_id AND cl.type_pack = v_type_pack AND cl.statut_ligne = 'actif' AND c.statut = 'actif' LIMIT 1;

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
    statut = 'confirmee', assigned_operator_id = p_operator_id,
    assigned_date = p_date, assigned_time_slot = p_time_slot,
    assigned_heure = p_heure, date_confirmee = p_date::timestamptz, updated_at = now()
  WHERE id = p_demande_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'rdv_assigne', jsonb_build_object('demande_id', p_demande_id, 'operator_id', p_operator_id, 'date', p_date, 'time_slot', p_time_slot, 'heure', p_heure::text, 'intervention_ids', to_jsonb(v_intervention_ids)), array_length(v_intervention_ids, 1));

  -- Notification client : RDV confirmé
  SELECT p.id INTO v_client_uid
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.entreprise_id = v_demande.entreprise_id AND ur.role = 'client'
  LIMIT 1;

  IF v_client_uid IS NOT NULL THEN
    INSERT INTO public.notifications_internes (user_id, source_action, titre, severite, link_url, details, statut, action_requise)
    VALUES (v_client_uid, 'rdv_confirme',
      'RDV confirmé — ' || to_char(p_date, 'DD/MM/YYYY'),
      'info', '/client/prestations',
      jsonb_build_object('demande_id', p_demande_id, 'date', p_date::text, 'time_slot', p_time_slot, 'heure', p_heure::text),
      'non_lu'::notification_statut_enum, false);
  END IF;

  RETURN json_build_object('success', true, 'intervention_ids', v_intervention_ids, 'nb_interventions', array_length(v_intervention_ids, 1));
END;
$function$;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. annuler_rdv_admin — RDV annulé par IZOX → notifier le client
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.annuler_rdv_admin(p_demande_id uuid, p_motif text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid        UUID := auth.uid();
  v_d          RECORD;
  v_client_uid uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = v_uid AND role IN ('admin','staff')
  ) THEN
    RAISE EXCEPTION 'Permission refusée : action réservée à l''équipe IZOX';
  END IF;

  IF p_motif IS NULL OR length(trim(p_motif)) < 5 THEN
    RAISE EXCEPTION 'Le motif d''annulation est obligatoire (5 caractères minimum)';
  END IF;

  SELECT * INTO v_d FROM demandes_rdv WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;

  IF v_d.statut NOT IN ('en_attente','confirmee') THEN
    RAISE EXCEPTION 'Cette demande ne peut plus être annulée (statut: %)', v_d.statut;
  END IF;

  IF EXISTS (
    SELECT 1 FROM interventions
    WHERE demande_rdv_id = p_demande_id AND statut = 'validee'
  ) THEN
    RAISE EXCEPTION 'Une intervention est déjà validée (facturée). Annulation impossible.';
  END IF;

  UPDATE demandes_rdv
  SET statut='annulee_admin', annulation_motif=trim(p_motif), annule_par='admin', updated_at=NOW()
  WHERE id = p_demande_id;

  UPDATE interventions SET statut='annulee', updated_at=NOW()
  WHERE demande_rdv_id = p_demande_id AND statut IN ('planifiee','en_cours','en_revision');

  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'rdv_annule_par_admin',
    jsonb_build_object('demande_id',p_demande_id,'entreprise_id',v_d.entreprise_id,'motif',trim(p_motif)), 1);

  -- Notification client : RDV annulé par IZOX
  SELECT p.id INTO v_client_uid
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.entreprise_id = v_d.entreprise_id AND ur.role = 'client'
  LIMIT 1;

  IF v_client_uid IS NOT NULL THEN
    INSERT INTO public.notifications_internes (user_id, source_action, titre, severite, link_url, details, statut, action_requise)
    VALUES (v_client_uid, 'rdv_annule_admin',
      'RDV annulé par IZOX',
      'warning', '/client/prestations',
      jsonb_build_object('demande_id', p_demande_id, 'motif', trim(p_motif)),
      'non_lu'::notification_statut_enum, true);
  END IF;

  RETURN json_build_object('success', true, 'demande_id', p_demande_id);
END;
$function$;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. modifier_heure_rdv — Horaire modifié → notifier le client
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.modifier_heure_rdv(p_demande_id uuid, p_heure time without time zone)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid        uuid := auth.uid();
  v_d          RECORD;
  v_nb         int;
  v_client_uid uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = v_uid AND role IN ('admin','staff')
  ) THEN
    RAISE EXCEPTION 'Permission refusée : action réservée à l''équipe IZOX';
  END IF;

  IF p_heure IS NULL THEN
    RAISE EXCEPTION 'L''heure est obligatoire';
  END IF;

  SELECT * INTO v_d FROM demandes_rdv WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;

  IF v_d.statut <> 'confirmee' THEN
    RAISE EXCEPTION 'Seul un RDV confirmé peut être replanifié (statut: %)', v_d.statut;
  END IF;

  IF v_d.assigned_date IS NOT NULL AND v_d.assigned_date <= CURRENT_DATE THEN
    RAISE EXCEPTION 'Impossible de modifier l''heure : le RDV est aujourd''hui ou déjà passé (date: %)', v_d.assigned_date;
  END IF;

  IF EXISTS (
    SELECT 1 FROM interventions WHERE demande_rdv_id = p_demande_id AND statut = 'en_cours'
  ) THEN
    RAISE EXCEPTION 'Impossible de modifier l''heure : une intervention est déjà en cours';
  END IF;

  IF v_d.assigned_time_slot = 'morning' AND (p_heure < TIME '08:00' OR p_heure > TIME '12:00') THEN
    RAISE EXCEPTION 'Heure hors plage matin (08:00–12:00)';
  ELSIF v_d.assigned_time_slot = 'afternoon' AND (p_heure < TIME '14:00' OR p_heure > TIME '18:00') THEN
    RAISE EXCEPTION 'Heure hors plage après-midi (14:00–18:00)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM interventions WHERE demande_rdv_id = p_demande_id AND statut = 'validee'
  ) THEN
    RAISE EXCEPTION 'Une intervention est déjà validée (facturée). Modification impossible.';
  END IF;

  UPDATE demandes_rdv
  SET assigned_heure = p_heure, updated_at = now()
  WHERE id = p_demande_id;

  UPDATE interventions
  SET heure_intervention = p_heure, updated_at = now()
  WHERE demande_rdv_id = p_demande_id
    AND statut IN ('planifiee','en_cours','en_revision');
  GET DIAGNOSTICS v_nb = ROW_COUNT;

  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'rdv_heure_modifiee',
    jsonb_build_object('demande_id', p_demande_id, 'heure', p_heure::text), v_nb);

  -- Notification client : horaire modifié
  SELECT p.id INTO v_client_uid
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.entreprise_id = v_d.entreprise_id AND ur.role = 'client'
  LIMIT 1;

  IF v_client_uid IS NOT NULL THEN
    INSERT INTO public.notifications_internes (user_id, source_action, titre, severite, link_url, details, statut, action_requise)
    VALUES (v_client_uid, 'rdv_heure_modifiee',
      'Horaire RDV modifié — ' || to_char(v_d.assigned_date, 'DD/MM/YYYY'),
      'info', '/client/prestations',
      jsonb_build_object('demande_id', p_demande_id, 'nouvelle_heure', p_heure::text, 'date', v_d.assigned_date::text),
      'non_lu'::notification_statut_enum, false);
  END IF;

  RETURN json_build_object('success', true, 'demande_id', p_demande_id, 'nb_interventions', v_nb);
END;
$function$;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. emettre_facture — Facture disponible → notifier le client
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.emettre_facture(p_facture_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_facture           record;
  v_sequence_name     text;
  v_numero_sequentiel integer;
  v_numero_facture    text;
  v_now               timestamptz := now();
  v_sequence_existe   boolean;
  v_client_uid        uuid;
BEGIN
  SELECT id, contrat_id, entreprise_id, serie, annee_fiscale, statut,
         numero_facture, periode_debut, periode_fin, montant_ttc
  INTO v_facture
  FROM factures
  WHERE id = p_facture_id;

  IF v_facture IS NULL THEN
    RAISE EXCEPTION 'Facture introuvable : %', p_facture_id;
  END IF;

  IF v_facture.statut != 'brouillon' THEN
    RAISE EXCEPTION 'Emission impossible : la facture % est en statut % (seul brouillon est emissible).',
      p_facture_id, v_facture.statut;
  END IF;

  v_sequence_name := 'seq_facture_' || lower(v_facture.serie::text) || '_' || v_facture.annee_fiscale;

  SELECT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = v_sequence_name
      AND relkind = 'S'
  ) INTO v_sequence_existe;

  IF NOT v_sequence_existe THEN
    EXECUTE format(
      'CREATE SEQUENCE IF NOT EXISTS %I START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE',
      v_sequence_name
    );
    RAISE NOTICE 'Sequence % creee automatiquement (nouvelle annee fiscale)', v_sequence_name;
  END IF;

  EXECUTE format('SELECT nextval(%L)', v_sequence_name) INTO v_numero_sequentiel;

  v_numero_facture := 'FA-' || v_facture.serie::text || '-' ||
                      v_facture.annee_fiscale || '-' ||
                      lpad(v_numero_sequentiel::text, 6, '0');

  UPDATE factures
  SET
    statut = 'emise',
    numero_facture = v_numero_facture,
    numero_sequentiel = v_numero_sequentiel,
    date_emission = v_now::date,
    emitted_at = v_now,
    date_echeance = COALESCE(date_echeance, (v_now::date + INTERVAL '30 days')::date)
  WHERE id = p_facture_id;

  INSERT INTO admin_actions_log (
    user_id, action, details, nb_entites_impactees
  )
  VALUES (
    auth.uid(),
    'emission_facture',
    jsonb_build_object(
      'facture_id', p_facture_id,
      'numero_facture', v_numero_facture,
      'numero_sequentiel', v_numero_sequentiel,
      'serie', v_facture.serie,
      'annee_fiscale', v_facture.annee_fiscale,
      'date_emission', v_now::date,
      'montant_ttc', v_facture.montant_ttc,
      'sequence_utilisee', v_sequence_name
    ),
    1
  );

  -- Notification client : nouvelle facture disponible
  IF v_facture.entreprise_id IS NOT NULL THEN
    SELECT p.id INTO v_client_uid
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.entreprise_id = v_facture.entreprise_id AND ur.role = 'client'
    LIMIT 1;

    IF v_client_uid IS NOT NULL THEN
      INSERT INTO public.notifications_internes (user_id, source_action, titre, severite, link_url, details, statut, action_requise)
      VALUES (v_client_uid, 'emission_facture',
        'Nouvelle facture disponible — ' || v_numero_facture,
        'info', '/client/documents',
        jsonb_build_object('facture_id', p_facture_id, 'numero_facture', v_numero_facture, 'montant_ttc', v_facture.montant_ttc),
        'non_lu'::notification_statut_enum, false);
    END IF;
  END IF;

  RETURN v_numero_facture;
END;
$function$;
