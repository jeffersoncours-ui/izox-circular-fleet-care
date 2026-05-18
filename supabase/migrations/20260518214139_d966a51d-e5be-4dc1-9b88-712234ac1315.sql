-- ============================================================================
-- c.8.1 — Hotfix réactivation contrat résilié + nettoyage one-shot
-- ============================================================================

-- 1. valider_vehicule — transition resilie → actif + reset date_resiliation
CREATE OR REPLACE FUNCTION public.valider_vehicule(p_vehicule_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_is_staff BOOLEAN;
  v_v RECORD;
  v_entreprise_id UUID;
  v_entreprise_nom TEXT;
  v_contrat_id UUID;
  v_contrat_statut TEXT;
  v_commercial_sig UUID;
  v_nb INTEGER;
  v_palier TEXT;
  v_remise NUMERIC;
  v_remise_com NUMERIC;
  v_fp NUMERIC; v_fc NUMERIC; v_fk NUMERIC;
  v_brut NUMERIC; v_net NUMERIC;
  v_active BOOLEAN := FALSE;
  v_client_uid UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Utilisateur non authentifié'; END IF;
  v_is_admin := public.has_role(v_user_id,'admin'::app_role);
  v_is_staff := public.has_role(v_user_id,'staff'::app_role);

  SELECT v.*, c.statut::text AS c_statut, c.commercial_signataire_id, e.nom AS e_nom
  INTO v_v
  FROM public.vehicules v
  JOIN public.contrats c ON c.id = v.contrat_id
  JOIN public.entreprises e ON e.id = v.entreprise_id
  WHERE v.id = p_vehicule_id;

  IF v_v IS NULL THEN RAISE EXCEPTION 'Véhicule introuvable: %', p_vehicule_id; END IF;
  IF v_v.statut::text <> 'en_attente_validation' THEN
    RAISE EXCEPTION 'Véhicule pas en attente (statut: %)', v_v.statut;
  END IF;

  v_entreprise_id := v_v.entreprise_id;
  v_entreprise_nom := v_v.e_nom;
  v_contrat_id := v_v.contrat_id;
  v_contrat_statut := v_v.c_statut;
  v_commercial_sig := v_v.commercial_signataire_id;

  IF NOT (v_is_admin OR v_is_staff OR v_user_id = v_commercial_sig) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  PERFORM 1 FROM public.entreprises WHERE id = v_entreprise_id FOR UPDATE;

  UPDATE public.vehicules SET statut = 'actif', updated_at = NOW() WHERE id = p_vehicule_id;

  -- c.8.1 : transition en_attente_validation OU resilie → actif
  IF v_contrat_statut IN ('en_attente_validation', 'resilie') THEN
    UPDATE public.contrats
    SET statut = 'actif',
        date_resiliation = NULL,
        updated_at = NOW()
    WHERE id = v_contrat_id;
    v_active := TRUE;
  END IF;

  IF v_v.type_pack_souhaite IS NOT NULL THEN
    INSERT INTO public.contrat_lignes (contrat_id, type_pack, nb_vehicules, prix_unitaire_ht, statut_ligne)
    SELECT v_contrat_id, v_v.type_pack_souhaite, 1,
      (SELECT prix_ht FROM public.prestations_catalogue WHERE code = v_v.type_pack_souhaite), 'actif'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.contrat_lignes
      WHERE contrat_id = v_contrat_id AND type_pack = v_v.type_pack_souhaite AND statut_ligne='actif'
    );

    UPDATE public.contrat_lignes
    SET nb_vehicules = nb_vehicules
    WHERE contrat_id = v_contrat_id AND type_pack = v_v.type_pack_souhaite AND statut_ligne='actif';
  END IF;

  SELECT COUNT(*) INTO v_nb FROM public.vehicules WHERE contrat_id = v_contrat_id AND statut='actif';
  SELECT palier, remise_pct INTO v_palier, v_remise FROM public.calculer_palier_remise(v_nb);

  UPDATE public.contrat_lignes cl SET nb_vehicules = sub.cnt
  FROM (SELECT type_pack_souhaite AS tp, COUNT(*) AS cnt FROM public.vehicules
        WHERE contrat_id = v_contrat_id AND statut='actif' GROUP BY type_pack_souhaite) sub
  WHERE cl.contrat_id = v_contrat_id AND cl.type_pack = sub.tp AND cl.statut_ligne='actif';

  SELECT COALESCE(SUM(nb_vehicules * prix_unitaire_ht),0) INTO v_brut
  FROM public.contrat_lignes WHERE contrat_id = v_contrat_id AND statut_ligne='actif';

  SELECT COALESCE(remise_commerciale_pct,0) INTO v_remise_com FROM public.contrats WHERE id = v_contrat_id;
  v_fp := 1 - COALESCE(v_remise,0);
  v_fc := 1 - COALESCE(v_remise_com,0);
  v_fk := GREATEST(0.70, v_fp * v_fc);
  v_net := ROUND(v_brut * v_fk, 2);

  UPDATE public.contrats
  SET palier=v_palier, remise_pct=COALESCE(v_remise,0),
      nb_vehicules_actifs=v_nb, montant_brut_mensuel=v_brut, montant_net_mensuel=v_net,
      updated_at=NOW()
  WHERE id = v_contrat_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_user_id, 'validation_vehicule',
    jsonb_build_object(
      'vehicule_id', p_vehicule_id, 'contrat_id', v_contrat_id,
      'entreprise_id', v_entreprise_id, 'entreprise_nom', v_entreprise_nom,
      'immatriculation', v_v.immatriculation, 'contrat_active_via_validation', v_active,
      'contrat_statut_avant', v_contrat_statut,
      'palier', v_palier, 'nb_vehicules_actifs', v_nb, 'montant_net_mensuel', v_net
    ), 1);

  SELECT p.id INTO v_client_uid
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.entreprise_id = v_entreprise_id AND ur.role = 'client'
  LIMIT 1;

  IF v_client_uid IS NOT NULL THEN
    INSERT INTO public.notifications_internes (user_id, source_action, titre, severite, link_url, details, statut)
    VALUES (v_client_uid, 'validation_vehicule',
      'Véhicule validé — ' || v_v.immatriculation, 'info',
      '/client/flotte/' || p_vehicule_id::text,
      jsonb_build_object('vehicule_id', p_vehicule_id,
        'message', 'Votre véhicule ' || v_v.immatriculation || ' a été validé.'),
      'non_lu'::notification_statut_enum);
  END IF;

  INSERT INTO public.notifications_internes (user_id, source_action, titre, severite, link_url, details, statut)
  SELECT DISTINCT ur.user_id, 'validation_vehicule',
    'Véhicule validé — ' || v_entreprise_nom, 'info',
    '/admin/clients/' || v_entreprise_id::text,
    jsonb_build_object('vehicule_id', p_vehicule_id, 'immatriculation', v_v.immatriculation),
    'non_lu'::notification_statut_enum
  FROM public.user_roles ur
  WHERE ur.role IN ('admin'::app_role,'staff'::app_role) AND ur.user_id <> v_user_id;

  IF v_commercial_sig IS NOT NULL AND v_commercial_sig <> v_user_id THEN
    INSERT INTO public.notifications_internes (user_id, source_action, titre, severite, link_url, details, statut)
    VALUES (v_commercial_sig, 'validation_vehicule',
      'Véhicule validé — ' || v_entreprise_nom, 'info',
      '/admin/clients/' || v_entreprise_id::text,
      jsonb_build_object('vehicule_id', p_vehicule_id, 'immatriculation', v_v.immatriculation),
      'non_lu'::notification_statut_enum);
  END IF;

  RETURN json_build_object('success', true, 'vehicule_id', p_vehicule_id,
    'contrat_id', v_contrat_id, 'contrat_active_via_validation', v_active,
    'palier', v_palier, 'nb_vehicules_actifs', v_nb,
    'montant_brut_mensuel', v_brut, 'montant_net_mensuel', v_net);
END;
$$;

GRANT EXECUTE ON FUNCTION public.valider_vehicule(UUID) TO authenticated;

COMMENT ON FUNCTION public.valider_vehicule IS
'Validation d''un véhicule en_attente_validation. Active le véhicule, active OU réactive le contrat (depuis en_attente_validation ou resilie), recalcule caches palier/montant, dispatche notifications. Réservé admin/staff/commercial signataire.';

-- ============================================================================
-- 2. ajouter_vehicule — réactivation pour tous rôles + recherche élargie
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ajouter_vehicule(
  p_entreprise_id uuid, p_type_vehicule text, p_immatriculation text, p_pack text,
  p_marque text DEFAULT NULL, p_modele text DEFAULT NULL, p_annee integer DEFAULT NULL,
  p_couleur text DEFAULT NULL, p_kilometrage integer DEFAULT NULL,
  p_photo_path text DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_is_staff BOOLEAN;
  v_role_initiateur TEXT;
  v_contrat_id UUID;
  v_contrat_existant_id UUID;
  v_contrat_existant_statut TEXT;
  v_contrat_ligne_id UUID;
  v_vehicule_id UUID;
  v_statut_vehicule public.statut_vehicule;
  v_statut_contrat public.contrat_statut_enum;
  v_nb_vehicules_actifs INTEGER := 0;
  v_palier TEXT;
  v_remise NUMERIC;
  v_remise_commerciale NUMERIC;
  v_prix_pack NUMERIC;
  v_numero_contrat TEXT;
  v_montant_brut NUMERIC := 0;
  v_montant_net NUMERIC := 0;
  v_facteur_palier NUMERIC;
  v_facteur_commercial NUMERIC;
  v_facteur_combine NUMERIC;
  v_entreprise_nom TEXT;
  v_contrat_cree BOOLEAN := FALSE;
  v_contrat_reactive BOOLEAN := FALSE;
  v_immat TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Utilisateur non authentifié'; END IF;

  v_is_admin := public.has_role(v_user_id, 'admin'::app_role);
  v_is_staff := public.has_role(v_user_id, 'staff'::app_role);

  IF v_is_admin THEN v_role_initiateur := 'admin';
  ELSIF v_is_staff THEN v_role_initiateur := 'staff';
  ELSIF public.has_role(v_user_id, 'commercial'::app_role) THEN v_role_initiateur := 'commercial';
  ELSE v_role_initiateur := 'client';
  END IF;

  IF p_pack NOT IN ('pack_interieur', 'pack_standard', 'pack_vtc') THEN
    RAISE EXCEPTION 'Pack invalide: %', p_pack;
  END IF;

  SELECT prix_ht INTO v_prix_pack FROM public.prestations_catalogue WHERE code = p_pack;
  IF v_prix_pack IS NULL THEN RAISE EXCEPTION 'Prix catalogue introuvable: %', p_pack; END IF;

  SELECT nom INTO v_entreprise_nom FROM public.entreprises WHERE id = p_entreprise_id;
  IF v_entreprise_nom IS NULL THEN RAISE EXCEPTION 'Entreprise introuvable: %', p_entreprise_id; END IF;

  IF v_is_admin OR v_is_staff THEN
    v_statut_vehicule := 'actif'; v_statut_contrat := 'actif';
  ELSE
    v_statut_vehicule := 'en_attente_validation'; v_statut_contrat := 'en_attente_validation';
  END IF;

  PERFORM 1 FROM public.entreprises WHERE id = p_entreprise_id FOR UPDATE;

  -- c.8.1 : recherche élargie (actif > en_attente_validation > resilie)
  SELECT id, statut::text INTO v_contrat_existant_id, v_contrat_existant_statut
  FROM public.contrats
  WHERE entreprise_id = p_entreprise_id
    AND statut IN ('actif', 'en_attente_validation', 'resilie')
  ORDER BY
    CASE statut::text
      WHEN 'actif' THEN 1
      WHEN 'en_attente_validation' THEN 2
      WHEN 'resilie' THEN 3
    END,
    created_at DESC
  LIMIT 1
  FOR UPDATE;

  -- c.8.1 : réactivation depuis resilie pour TOUS rôles
  IF v_contrat_existant_id IS NOT NULL AND v_contrat_existant_statut = 'resilie' THEN
    IF v_is_admin OR v_is_staff THEN
      UPDATE public.contrats
      SET statut = 'actif', date_resiliation = NULL, updated_at = NOW()
      WHERE id = v_contrat_existant_id;
      v_contrat_existant_statut := 'actif';
    ELSE
      UPDATE public.contrats
      SET statut = 'en_attente_validation', date_resiliation = NULL, updated_at = NOW()
      WHERE id = v_contrat_existant_id;
      v_contrat_existant_statut := 'en_attente_validation';
    END IF;
    v_contrat_reactive := TRUE;
  END IF;

  IF v_contrat_existant_id IS NOT NULL THEN
    v_contrat_id := v_contrat_existant_id;
    v_contrat_cree := FALSE;
  ELSE
    v_numero_contrat := public.generer_numero_contrat();
    INSERT INTO public.contrats (entreprise_id, numero_contrat, statut, date_debut)
    VALUES (p_entreprise_id, v_numero_contrat, v_statut_contrat, CURRENT_DATE)
    RETURNING id INTO v_contrat_id;
    v_contrat_cree := TRUE;
  END IF;

  v_immat := UPPER(TRIM(p_immatriculation));

  INSERT INTO public.vehicules (
    entreprise_id, contrat_id, type_vehicule, immatriculation,
    marque, modele, annee, couleur, kilometrage, photo_path, notes,
    type_pack_souhaite, statut, created_by
  ) VALUES (
    p_entreprise_id, v_contrat_id, p_type_vehicule::type_vehicule, v_immat,
    p_marque, p_modele, p_annee, p_couleur, p_kilometrage, p_photo_path, p_notes,
    p_pack, v_statut_vehicule, v_user_id
  ) RETURNING id INTO v_vehicule_id;

  IF v_statut_vehicule = 'actif' THEN
    SELECT id INTO v_contrat_ligne_id
    FROM public.contrat_lignes
    WHERE contrat_id = v_contrat_id AND type_pack = p_pack AND statut_ligne = 'actif'
    LIMIT 1 FOR UPDATE;

    IF v_contrat_ligne_id IS NOT NULL THEN
      UPDATE public.contrat_lignes SET nb_vehicules = nb_vehicules + 1
      WHERE id = v_contrat_ligne_id;
    ELSE
      INSERT INTO public.contrat_lignes (contrat_id, type_pack, nb_vehicules, prix_unitaire_ht, statut_ligne)
      VALUES (v_contrat_id, p_pack, 1, v_prix_pack, 'actif')
      RETURNING id INTO v_contrat_ligne_id;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_nb_vehicules_actifs
  FROM public.vehicules WHERE contrat_id = v_contrat_id AND statut = 'actif';

  SELECT palier, remise_pct INTO v_palier, v_remise
  FROM public.calculer_palier_remise(v_nb_vehicules_actifs);

  SELECT COALESCE(SUM(cl.nb_vehicules * cl.prix_unitaire_ht), 0) INTO v_montant_brut
  FROM public.contrat_lignes cl
  WHERE cl.contrat_id = v_contrat_id AND cl.statut_ligne = 'actif';

  SELECT COALESCE(remise_commerciale_pct, 0) INTO v_remise_commerciale
  FROM public.contrats WHERE id = v_contrat_id;

  v_facteur_palier := 1 - COALESCE(v_remise, 0);
  v_facteur_commercial := 1 - COALESCE(v_remise_commerciale, 0);
  v_facteur_combine := GREATEST(0.70, v_facteur_palier * v_facteur_commercial);
  v_montant_net := ROUND(v_montant_brut * v_facteur_combine, 2);

  UPDATE public.contrats
  SET palier = v_palier,
      remise_pct = COALESCE(v_remise, 0),
      montant_brut_mensuel = v_montant_brut,
      montant_net_mensuel = v_montant_net,
      nb_vehicules_actifs = v_nb_vehicules_actifs,
      updated_at = NOW()
  WHERE id = v_contrat_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (
    v_user_id,
    CASE WHEN v_contrat_reactive THEN 'reactivation_contrat_via_ajout_vehicule' ELSE 'ajout_vehicule' END,
    jsonb_build_object(
      'entreprise_id', p_entreprise_id, 'entreprise_nom', v_entreprise_nom,
      'vehicule_id', v_vehicule_id, 'immatriculation', v_immat,
      'contrat_id', v_contrat_id, 'contrat_cree', v_contrat_cree,
      'contrat_reactive', v_contrat_reactive,
      'mode_reactivation', CASE WHEN v_contrat_reactive AND (v_is_admin OR v_is_staff) THEN 'directe_admin_staff'
                                WHEN v_contrat_reactive THEN 'pending_admin_validation' ELSE NULL END,
      'numero_contrat', COALESCE(v_numero_contrat, (SELECT numero_contrat FROM public.contrats WHERE id = v_contrat_id)),
      'pack', p_pack,
      'statut_vehicule', v_statut_vehicule::text,
      'statut_contrat', v_contrat_existant_statut,
      'role_initiateur', v_role_initiateur,
      'palier', v_palier,
      'nb_vehicules_actifs', v_nb_vehicules_actifs,
      'montant_brut_mensuel', v_montant_brut,
      'montant_net_mensuel', v_montant_net,
      'remise_palier_pct', v_remise,
      'remise_commerciale_pct', v_remise_commerciale
    ),
    1
  );

  RETURN jsonb_build_object(
    'success', true,
    'vehicule_id', v_vehicule_id,
    'contrat_id', v_contrat_id,
    'contrat_ligne_id', v_contrat_ligne_id,
    'contrat_cree', v_contrat_cree,
    'contrat_reactive', v_contrat_reactive,
    'statut_vehicule', v_statut_vehicule::text,
    'statut_contrat', COALESCE(v_contrat_existant_statut, v_statut_contrat::text),
    'palier', v_palier,
    'remise_pct', v_remise,
    'remise_commerciale_pct', v_remise_commerciale,
    'nb_vehicules_actifs', v_nb_vehicules_actifs,
    'montant_brut_mensuel', v_montant_brut,
    'montant_net_mensuel', v_montant_net,
    'numero_contrat', COALESCE(v_numero_contrat, (SELECT numero_contrat FROM public.contrats WHERE id = v_contrat_id))
  );
END;
$function$;

-- ============================================================================
-- 3. supprimer_vehicule — zéroïsation complète caches (ajout palier=NULL, remise_pct=0)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.supprimer_vehicule(
  p_vehicule_id UUID,
  p_force_facturation BOOLEAN DEFAULT FALSE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_is_staff BOOLEAN;
  v_is_commercial BOOLEAN;
  v_user_entreprise UUID;
  v_v RECORD;
  v_contrat_id UUID;
  v_contrat_ligne_id UUID;
  v_type_pack TEXT;
  v_entreprise_id UUID;
  v_entreprise_nom TEXT;
  v_commercial_signataire_id UUID;
  v_immatriculation TEXT;
  v_interventions_non_facturees INTEGER;
  v_nb_vehicules_restants INTEGER := 0;
  v_nb_lignes_restantes INTEGER;
  v_ligne_supprimee BOOLEAN := FALSE;
  v_contrat_resilie BOOLEAN := FALSE;
  v_montant_brut NUMERIC := 0;
  v_montant_net NUMERIC := 0;
  v_palier TEXT;
  v_remise NUMERIC;
  v_remise_commerciale NUMERIC;
  v_facteur_palier NUMERIC;
  v_facteur_commercial NUMERIC;
  v_facteur_combine NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Utilisateur non authentifié'; END IF;

  v_is_admin := public.has_role(v_user_id, 'admin'::app_role);
  v_is_staff := public.has_role(v_user_id, 'staff'::app_role);
  v_is_commercial := public.has_role(v_user_id, 'commercial'::app_role);

  SELECT v.*, e.nom AS entreprise_nom, c.commercial_signataire_id AS commercial_sig
  INTO v_v
  FROM public.vehicules v
  JOIN public.entreprises e ON e.id = v.entreprise_id
  LEFT JOIN public.contrats c ON c.id = v.contrat_id
  WHERE v.id = p_vehicule_id;

  IF v_v IS NULL THEN RAISE EXCEPTION 'Véhicule introuvable: %', p_vehicule_id; END IF;

  v_contrat_id := v_v.contrat_id;
  v_type_pack := v_v.type_pack_souhaite;
  v_entreprise_id := v_v.entreprise_id;
  v_entreprise_nom := v_v.entreprise_nom;
  v_commercial_signataire_id := v_v.commercial_sig;
  v_immatriculation := v_v.immatriculation;

  IF NOT (v_is_admin OR v_is_staff OR v_is_commercial) THEN
    v_user_entreprise := public.get_user_entreprise(v_user_id);
    IF v_user_entreprise IS NULL OR v_user_entreprise <> v_entreprise_id THEN
      RAISE EXCEPTION 'Permission refusée';
    END IF;
  END IF;

  PERFORM 1 FROM public.entreprises WHERE id = v_entreprise_id FOR UPDATE;

  IF v_contrat_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_interventions_non_facturees
    FROM public.interventions i
    WHERE i.vehicule_id = p_vehicule_id
      AND i.statut = 'validee'
      AND DATE_TRUNC('month', i.date_intervention) = DATE_TRUNC('month', NOW())
      AND NOT EXISTS (
        SELECT 1 FROM public.factures f
        WHERE f.contrat_id = v_contrat_id
          AND DATE_TRUNC('month', f.periode_debut) = DATE_TRUNC('month', i.date_intervention)
          AND f.statut IN ('emise', 'payee')
      );

    IF COALESCE(v_interventions_non_facturees, 0) > 0 AND NOT p_force_facturation THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INTERVENTIONS_NON_FACTUREES',
        'message', format('Suppression bloquée : %s prestation(s) validée(s) ce mois non facturée(s). Génération facture préalable obligatoire.', v_interventions_non_facturees),
        'interventions_non_facturees', v_interventions_non_facturees,
        'vehicule_id', p_vehicule_id,
        'contrat_id', v_contrat_id,
        'action_requise', 'generer_facture_avant_suppression'
      );
    END IF;
  END IF;

  IF v_contrat_id IS NOT NULL AND v_type_pack IS NOT NULL THEN
    SELECT id INTO v_contrat_ligne_id
    FROM public.contrat_lignes
    WHERE contrat_id = v_contrat_id AND type_pack = v_type_pack
    LIMIT 1 FOR UPDATE;
  END IF;

  DELETE FROM public.vehicules WHERE id = p_vehicule_id;

  IF v_contrat_ligne_id IS NOT NULL THEN
    UPDATE public.contrat_lignes
    SET nb_vehicules = GREATEST(0, nb_vehicules - 1)
    WHERE id = v_contrat_ligne_id;

    DELETE FROM public.contrat_lignes
    WHERE id = v_contrat_ligne_id AND nb_vehicules <= 0;

    IF FOUND THEN v_ligne_supprimee := TRUE; END IF;
  END IF;

  IF v_contrat_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_nb_lignes_restantes
    FROM public.contrat_lignes
    WHERE contrat_id = v_contrat_id AND statut_ligne = 'actif';

    IF v_nb_lignes_restantes = 0 THEN
      -- c.8.1 : zéroïsation COMPLÈTE (palier=NULL, remise_pct=0)
      UPDATE public.contrats
      SET statut = 'resilie',
          date_resiliation = NOW(),
          nb_vehicules_actifs = 0,
          montant_brut_mensuel = 0,
          montant_net_mensuel = 0,
          palier = NULL,
          remise_pct = 0,
          updated_at = NOW()
      WHERE id = v_contrat_id;
      v_contrat_resilie := TRUE;
    ELSE
      SELECT COUNT(*) INTO v_nb_vehicules_restants
      FROM public.vehicules
      WHERE contrat_id = v_contrat_id AND statut = 'actif';

      SELECT palier, remise_pct INTO v_palier, v_remise
      FROM public.calculer_palier_remise(v_nb_vehicules_restants);

      SELECT COALESCE(SUM(cl.nb_vehicules * cl.prix_unitaire_ht), 0) INTO v_montant_brut
      FROM public.contrat_lignes cl
      WHERE cl.contrat_id = v_contrat_id AND cl.statut_ligne = 'actif';

      SELECT COALESCE(remise_commerciale_pct, 0) INTO v_remise_commerciale
      FROM public.contrats WHERE id = v_contrat_id;

      v_facteur_palier := 1 - COALESCE(v_remise, 0);
      v_facteur_commercial := 1 - COALESCE(v_remise_commerciale, 0);
      v_facteur_combine := GREATEST(0.70, v_facteur_palier * v_facteur_commercial);
      v_montant_net := ROUND(v_montant_brut * v_facteur_combine, 2);

      UPDATE public.contrats
      SET palier = v_palier,
          remise_pct = COALESCE(v_remise, 0),
          nb_vehicules_actifs = v_nb_vehicules_restants,
          montant_brut_mensuel = v_montant_brut,
          montant_net_mensuel = v_montant_net,
          updated_at = NOW()
      WHERE id = v_contrat_id;
    END IF;
  END IF;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (
    v_user_id,
    CASE WHEN v_contrat_resilie THEN 'suppression_vehicule_contrat_resilie_auto' ELSE 'suppression_vehicule' END,
    jsonb_build_object(
      'entreprise_id', v_entreprise_id, 'entreprise_nom', v_entreprise_nom,
      'contrat_id', v_contrat_id, 'vehicule_id', p_vehicule_id,
      'immatriculation', v_immatriculation, 'type_pack', v_type_pack,
      'ligne_supprimee', v_ligne_supprimee, 'contrat_resilie_auto', v_contrat_resilie,
      'force_facturation', p_force_facturation,
      'nb_vehicules_restants', v_nb_vehicules_restants,
      'montant_net_mensuel', v_montant_net
    ),
    1
  );

  INSERT INTO public.notifications_internes (
    user_id, source_action, titre, severite, link_url, details, statut, action_requise
  )
  SELECT DISTINCT ur.user_id,
    CASE WHEN v_contrat_resilie THEN 'contrat_resilie_auto' ELSE 'vehicule_supprime' END,
    CASE WHEN v_contrat_resilie
      THEN 'Contrat résilié auto — ' || v_entreprise_nom
      ELSE 'Véhicule supprimé — ' || v_entreprise_nom END,
    CASE WHEN v_contrat_resilie THEN 'warning' ELSE 'info' END,
    '/admin/clients/' || v_entreprise_id::text,
    jsonb_build_object(
      'entreprise_id', v_entreprise_id, 'contrat_id', v_contrat_id,
      'immatriculation', v_immatriculation, 'contrat_resilie_auto', v_contrat_resilie
    ),
    'non_lu'::notification_statut_enum,
    v_contrat_resilie
  FROM public.user_roles ur
  WHERE ur.role IN ('admin'::app_role, 'staff'::app_role)
    AND ur.user_id <> v_user_id;

  IF v_commercial_signataire_id IS NOT NULL AND v_commercial_signataire_id <> v_user_id THEN
    INSERT INTO public.notifications_internes (
      user_id, source_action, titre, severite, link_url, details, statut, action_requise
    ) VALUES (
      v_commercial_signataire_id,
      CASE WHEN v_contrat_resilie THEN 'contrat_resilie_auto' ELSE 'vehicule_supprime' END,
      CASE WHEN v_contrat_resilie
        THEN 'Contrat résilié auto — ' || v_entreprise_nom
        ELSE 'Véhicule supprimé — ' || v_entreprise_nom END,
      CASE WHEN v_contrat_resilie THEN 'warning' ELSE 'info' END,
      '/admin/clients/' || v_entreprise_id::text,
      jsonb_build_object(
        'entreprise_id', v_entreprise_id, 'contrat_id', v_contrat_id,
        'immatriculation', v_immatriculation, 'contrat_resilie_auto', v_contrat_resilie
      ),
      'non_lu'::notification_statut_enum,
      v_contrat_resilie
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'vehicule_id', p_vehicule_id,
    'contrat_id', v_contrat_id,
    'ligne_supprimee', v_ligne_supprimee,
    'contrat_resilie_auto', v_contrat_resilie,
    'nb_vehicules_restants', v_nb_vehicules_restants,
    'montant_brut_mensuel', v_montant_brut,
    'montant_net_mensuel', v_montant_net
  );
END;
$$;

-- ============================================================================
-- 4. Nettoyage one-shot CT-202605-0003 et CT-202605-0004
-- ============================================================================

-- Détacher d'abord les véhicules pour éviter les FK strictes
UPDATE public.vehicules
SET contrat_id = NULL
WHERE contrat_id IN (SELECT id FROM public.contrats WHERE numero_contrat IN ('CT-202605-0003', 'CT-202605-0004'));

-- Supprimer contrat_lignes orphelins
DELETE FROM public.contrat_lignes
WHERE contrat_id IN (SELECT id FROM public.contrats WHERE numero_contrat IN ('CT-202605-0003', 'CT-202605-0004'));

-- Supprimer les contrats incohérents
DELETE FROM public.contrats
WHERE numero_contrat IN ('CT-202605-0003', 'CT-202605-0004');

-- Supprimer les véhicules désormais orphelins
DELETE FROM public.vehicules
WHERE contrat_id IS NULL;

-- Log
INSERT INTO public.admin_actions_log (user_id, action, details)
VALUES (
  NULL,
  'nettoyage_systeme_c81',
  jsonb_build_object(
    'description', 'Purge one-shot contrats incohérents post-c.8 avant déploiement hotfix',
    'contrats_supprimes', ARRAY['CT-202605-0003', 'CT-202605-0004'],
    'raison', 'Contrats résiliés avec caches stale et véhicules actifs rattachés',
    'execution_date', NOW()
  )
);