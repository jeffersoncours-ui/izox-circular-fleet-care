-- =========================================================================
-- Obligation de 2 véhicules par demande RDV quand la flotte active ≥ 3
-- Règle "souple" : exiger 2 véhicules, SAUF s'il ne reste qu'un seul véhicule
-- réservable ce mois (quota passages_mois restant). Base = véhicules actifs.
--
-- 1. _passages_pris_vehicule_mois : helper de comptage (source unique de vérité)
-- 2. get_vehicules_reservables_mois : état réservable par véhicule (dialog client)
-- 3. creer_demande_rdv : refactor (helper) + garde serveur min-2-véhicules
-- =========================================================================

-- 1. HELPER — passages déjà pris par un véhicule sur un mois donné
-- Reprend EXACTEMENT la logique inline qui était dans creer_demande_rdv :
-- interventions actives du mois + demandes en_attente contenant le véhicule ce mois.
CREATE OR REPLACE FUNCTION public._passages_pris_vehicule_mois(
  p_vehicule_id uuid,
  p_ref_month date
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (
    (
      SELECT COUNT(*) FROM public.interventions
      WHERE vehicule_id = p_vehicule_id
        AND statut IN ('planifiee', 'en_cours', 'en_revision', 'validee')
        AND DATE_TRUNC('month', date_intervention) = p_ref_month
    ) + (
      SELECT COUNT(*) FROM public.demandes_rdv d
      WHERE d.vehicule_ids @> ARRAY[p_vehicule_id]
        AND d.statut = 'en_attente'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(d.creneaux_preferes) AS dc
          WHERE DATE_TRUNC('month', (dc->>'date')::date) = p_ref_month
        )
    )
  )::integer
$function$;

-- 2. RPC — véhicules actifs de l'entreprise du client + état réservable (mois en cours)
CREATE OR REPLACE FUNCTION public.get_vehicules_reservables_mois()
RETURNS TABLE(vehicule_id uuid, passages_pris integer, quota integer, reservable boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ent   uuid;
  v_month date := DATE_TRUNC('month', CURRENT_DATE)::date;
BEGIN
  SELECT entreprise_id INTO v_ent FROM public.profiles WHERE id = auth.uid();
  IF v_ent IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    v.id,
    public._passages_pris_vehicule_mois(v.id, v_month) AS passages_pris,
    pc.passages_mois::integer AS quota,
    (
      pc.passages_mois IS NULL
      OR public._passages_pris_vehicule_mois(v.id, v_month) < pc.passages_mois
    ) AS reservable
  FROM public.vehicules v
  LEFT JOIN public.prestations_catalogue pc ON pc.code = v.type_pack_souhaite
  WHERE v.entreprise_id = v_ent AND v.statut::text = 'actif';
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_vehicules_reservables_mois() TO authenticated;

-- 3. RPC creer_demande_rdv — garde serveur min-2-véhicules + refactor helper quota
CREATE OR REPLACE FUNCTION public.creer_demande_rdv(
  p_vehicule_ids uuid[],
  p_creneaux_preferes jsonb,
  p_commentaires text,
  p_adresse_intervention text,
  p_ville_intervention text,
  p_code_postal_intervention text,
  p_latitude double precision DEFAULT NULL::double precision,
  p_longitude double precision DEFAULT NULL::double precision,
  p_telephone text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_flotte_active  INT;
  v_nb_reservables INT;
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

  SELECT DATE_TRUNC('month', MIN((c->>'date')::date))::date
  INTO v_ref_month
  FROM jsonb_array_elements(p_creneaux_preferes) AS c;

  -- GARDE SERVEUR — min 2 véhicules quand flotte active ≥ 3 et ≥ 2 véhicules réservables ce mois.
  -- "Souple" : si un seul véhicule réservable subsiste, on autorise une demande à 1 véhicule.
  SELECT COUNT(*) INTO v_flotte_active
  FROM vehicules WHERE entreprise_id = v_ent AND statut::text = 'actif';

  SELECT COUNT(*) INTO v_nb_reservables
  FROM vehicules v
  LEFT JOIN prestations_catalogue pc ON pc.code = v.type_pack_souhaite
  WHERE v.entreprise_id = v_ent AND v.statut::text = 'actif'
    AND (
      pc.passages_mois IS NULL
      OR public._passages_pris_vehicule_mois(v.id, v_ref_month) < pc.passages_mois
    );

  IF v_flotte_active >= 3 AND v_nb_reservables >= 2 AND array_length(p_vehicule_ids, 1) < 2 THEN
    RAISE EXCEPTION 'Avec au moins 3 véhicules dans votre flotte, vous devez réserver 2 véhicules par demande (sauf s''il ne reste qu''un seul véhicule à programmer ce mois-ci).';
  END IF;

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

  FOREACH v_vehicule_id IN ARRAY p_vehicule_ids LOOP
    SELECT type_pack_souhaite, immatriculation INTO v_type_pack, v_immat
    FROM vehicules WHERE id = v_vehicule_id;

    SELECT COALESCE(passages_mois, 0) INTO v_quota_mois
    FROM prestations_catalogue WHERE code = v_type_pack;

    IF v_quota_mois > 0 THEN
      -- Source unique de vérité : même helper que la garde serveur ci-dessus.
      v_prises_mois := public._passages_pris_vehicule_mois(v_vehicule_id, v_ref_month);

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
$function$;
