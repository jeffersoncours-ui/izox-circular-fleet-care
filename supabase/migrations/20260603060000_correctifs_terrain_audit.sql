-- ===========================================================================
-- Session 12 — Correctifs post-tests manuels (audit liaisons)
-- 1. modifier_heure_rdv : interdire la modif si RDV daté jour J/passé OU en_cours
-- 2. prendre_en_charge_intervention : garde-fou serveur date/heure (verrou)
-- 3. RLS operateur SELECT sur entreprises (fix onglet Suivi vide)
-- 4. creer_demande_rdv : quota vérifié sur le mois des créneaux demandés
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. modifier_heure_rdv — bloquer jour J / passé + en_cours
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.modifier_heure_rdv(p_demande_id uuid, p_heure time without time zone)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_d   RECORD;
  v_nb  int;
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

  -- Jour J ou passé : trop tard pour replanifier l'heure
  IF v_d.assigned_date IS NOT NULL AND v_d.assigned_date <= CURRENT_DATE THEN
    RAISE EXCEPTION 'Impossible de modifier l''heure : le RDV est aujourd''hui ou déjà passé (date: %)', v_d.assigned_date;
  END IF;

  -- Une intervention liée est déjà en cours
  IF EXISTS (
    SELECT 1 FROM interventions WHERE demande_rdv_id = p_demande_id AND statut = 'en_cours'
  ) THEN
    RAISE EXCEPTION 'Impossible de modifier l''heure : une intervention est déjà en cours';
  END IF;

  -- Le créneau (matin/après-midi) reste verrouillé : seule l'heure change,
  -- et elle doit rester dans la plage du créneau assigné.
  IF v_d.assigned_time_slot = 'morning' AND (p_heure < TIME '08:00' OR p_heure > TIME '12:00') THEN
    RAISE EXCEPTION 'Heure hors plage matin (08:00–12:00)';
  ELSIF v_d.assigned_time_slot = 'afternoon' AND (p_heure < TIME '14:00' OR p_heure > TIME '18:00') THEN
    RAISE EXCEPTION 'Heure hors plage après-midi (14:00–18:00)';
  END IF;

  -- Pas de modification si une intervention est déjà validée (facturée).
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

  RETURN json_build_object('success', true, 'demande_id', p_demande_id, 'nb_interventions', v_nb);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. prendre_en_charge_intervention — garde-fou serveur date/heure
--    Mirroir du verrou UI : on ne peut démarrer qu'à partir de l'heure de
--    déverrouillage (date + heure_intervention, ou début de créneau si NULL).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prendre_en_charge_intervention(p_intervention_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_operator_id uuid;
  v_unlock      timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'operateur'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT id INTO v_operator_id
  FROM public.operators
  WHERE user_id = auth.uid();

  IF v_operator_id IS NULL THEN
    RAISE EXCEPTION 'Compte terrain non lié à un opérateur planning';
  END IF;

  -- Contrainte : une seule intervention en cours à la fois
  IF EXISTS (
    SELECT 1 FROM public.interventions
    WHERE operateur_id = auth.uid()
      AND statut = 'en_cours'
  ) THEN
    RAISE EXCEPTION 'Terminez votre intervention en cours avant d''en commencer une nouvelle';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.interventions
    WHERE id = p_intervention_id
      AND statut = 'planifiee'
      AND operator_id = v_operator_id
  ) THEN
    RAISE EXCEPTION 'Intervention introuvable, non planifiée ou non assignée à vous';
  END IF;

  -- Garde-fou serveur : verrou horaire (interprété en heure de Paris)
  SELECT (date_intervention
          + COALESCE(heure_intervention,
                     CASE WHEN time_slot = 'afternoon' THEN TIME '14:00' ELSE TIME '08:00' END)
         )::timestamp AT TIME ZONE 'Europe/Paris'
  INTO v_unlock
  FROM public.interventions
  WHERE id = p_intervention_id;

  IF v_unlock IS NOT NULL AND now() < v_unlock THEN
    RAISE EXCEPTION 'Intervention verrouillée : démarrage possible à partir du %',
      to_char(v_unlock AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY à HH24:MI');
  END IF;

  UPDATE public.interventions
  SET
    operateur_id = auth.uid(),
    statut       = 'en_cours'
  WHERE id = p_intervention_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. RLS operateur SELECT sur entreprises
--    L'opérateur peut lire les entreprises liées à au moins une de ses
--    interventions (fix : onglet Suivi affichait 0 client car le join
--    entreprises(...) renvoyait NULL faute de policy).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "entreprises_operateur_select" ON public.entreprises;
CREATE POLICY "entreprises_operateur_select" ON public.entreprises
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'operateur')
    AND EXISTS (
      SELECT 1 FROM public.interventions i
      WHERE i.entreprise_id = entreprises.id
        AND (
          i.operateur_id = auth.uid()
          OR i.operator_id IN (SELECT id FROM public.operators WHERE user_id = auth.uid())
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. creer_demande_rdv — quota vérifié sur le mois des créneaux demandés
--    (au lieu du mois courant NOW()). Mois de référence = mois du créneau
--    le plus proche proposé.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.creer_demande_rdv(
  p_vehicule_ids              UUID[],
  p_creneaux_preferes         JSONB,
  p_commentaires              TEXT,
  p_adresse_intervention      TEXT,
  p_ville_intervention        TEXT,
  p_code_postal_intervention  TEXT,
  p_latitude                  double precision DEFAULT NULL,
  p_longitude                 double precision DEFAULT NULL,
  p_telephone                 TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid            UUID := auth.uid();
  v_ent            UUID;
  v_id             UUID;
  v_nom            TEXT;
  v_vehicule_id    UUID;
  v_type_pack      TEXT;
  v_immat          TEXT;
  v_quota_mois     INT;
  v_prises_mois    INT;
  v_capacite       bigint;
  v_creneau        jsonb;
  v_slot_count     bigint;
  v_any_available  boolean := false;
  v_ref_month      date;
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
  IF TRIM(COALESCE(p_adresse_intervention, '')) = '' THEN
    RAISE EXCEPTION 'L''adresse d''intervention est obligatoire';
  END IF;
  IF TRIM(COALESCE(p_ville_intervention, '')) = '' THEN
    RAISE EXCEPTION 'La ville d''intervention est obligatoire';
  END IF;
  IF TRIM(COALESCE(p_code_postal_intervention, '')) = '' THEN
    RAISE EXCEPTION 'Le code postal d''intervention est obligatoire';
  END IF;

  -- Mois de référence pour le quota = mois du créneau proposé le plus proche
  SELECT DATE_TRUNC('month', MIN((c->>'date')::date))::date
  INTO v_ref_month
  FROM jsonb_array_elements(p_creneaux_preferes) AS c;

  -- Guard race condition : au moins 1 créneau proposé doit avoir de la capacité
  SELECT GREATEST(COUNT(*) * 2, 2) INTO v_capacite FROM public.operators;

  FOR v_creneau IN SELECT jsonb_array_elements(p_creneaux_preferes) LOOP
    SELECT COUNT(*) INTO v_slot_count
    FROM public.interventions
    WHERE date_intervention = (v_creneau->>'date')::date
      AND time_slot = CASE
        WHEN v_creneau->>'creneau' = 'matin' THEN 'morning'
        ELSE 'afternoon'
      END
      AND statut NOT IN ('annulee', 'refusee');

    IF v_slot_count < v_capacite THEN
      v_any_available := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_any_available THEN
    RAISE EXCEPTION 'Tous les créneaux demandés sont complets. Veuillez proposer d''autres créneaux.';
  END IF;

  -- Vérification quota mensuel par véhicule, sur le MOIS DES CRÉNEAUX demandés
  FOREACH v_vehicule_id IN ARRAY p_vehicule_ids LOOP
    SELECT type_pack_souhaite, immatriculation INTO v_type_pack, v_immat
    FROM vehicules WHERE id = v_vehicule_id;

    SELECT COALESCE(passages_mois, 0) INTO v_quota_mois
    FROM prestations_catalogue WHERE code = v_type_pack;

    IF v_quota_mois > 0 THEN
      SELECT (
        SELECT COUNT(*) FROM interventions
        WHERE vehicule_id = v_vehicule_id
          AND statut IN ('planifiee', 'en_cours', 'en_revision', 'validee')
          AND DATE_TRUNC('month', date_intervention) = v_ref_month
      ) + (
        SELECT COUNT(*) FROM demandes_rdv d
        WHERE d.vehicule_ids @> ARRAY[v_vehicule_id]
          AND d.statut = 'en_attente'
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(d.creneaux_preferes) AS dc
            WHERE DATE_TRUNC('month', (dc->>'date')::date) = v_ref_month
          )
      ) INTO v_prises_mois;

      IF v_prises_mois >= v_quota_mois THEN
        RAISE EXCEPTION 'Quota mensuel atteint pour le véhicule % (% / % passages sur le mois demandé)',
          v_immat, v_prises_mois, v_quota_mois;
      END IF;
    END IF;
  END LOOP;

  SELECT nom INTO v_nom FROM entreprises WHERE id = v_ent;

  INSERT INTO demandes_rdv (
    entreprise_id, statut, vehicule_ids, creneaux_preferes, commentaires,
    nb_vehicules_rdv, adresse_intervention, ville_intervention, code_postal_intervention,
    latitude, longitude, telephone_intervention
  ) VALUES (
    v_ent, 'en_attente', p_vehicule_ids, p_creneaux_preferes, p_commentaires,
    array_length(p_vehicule_ids, 1),
    TRIM(p_adresse_intervention), TRIM(p_ville_intervention), TRIM(p_code_postal_intervention),
    p_latitude, p_longitude,
    NULLIF(TRIM(COALESCE(p_telephone, '')), '')
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
