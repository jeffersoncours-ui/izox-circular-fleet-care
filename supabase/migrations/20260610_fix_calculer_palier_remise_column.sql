-- =========================================================================
-- Fix: ajouter_vehicule et supprimer_vehicule lisaient remise_pct au lieu de taux_remise
-- Error: column "remise_pct" does not exist
-- La RPC calculer_palier_remise retourne (palier, taux_remise), PAS (palier, remise_pct)
-- =========================================================================

-- PARTIE 1 — Corriger ajouter_vehicule
CREATE OR REPLACE FUNCTION public.ajouter_vehicule(
  p_entreprise_id uuid, p_type_vehicule text, p_immatriculation text, p_pack text,
  p_marque text DEFAULT NULL, p_modele text DEFAULT NULL, p_annee integer DEFAULT NULL,
  p_couleur text DEFAULT NULL, p_kilometrage integer DEFAULT NULL,
  p_photo_path text DEFAULT NULL, p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_is_staff BOOLEAN;
  v_role_initiateur TEXT;
  v_contrat_id UUID;
  v_contrat_existant_id UUID;
  v_contrat_resilie_id UUID;
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

  -- ÉTAPE 5.5 : Réactivation contrat résilié si acteur admin/staff
  IF v_is_admin OR v_is_staff THEN
    SELECT id INTO v_contrat_resilie_id
    FROM public.contrats
    WHERE entreprise_id = p_entreprise_id AND statut = 'resilie'
    ORDER BY date_resiliation DESC NULLS LAST, created_at DESC
    LIMIT 1 FOR UPDATE;

    IF v_contrat_resilie_id IS NOT NULL THEN
      UPDATE public.contrats
      SET statut = 'actif', date_resiliation = NULL, updated_at = NOW()
      WHERE id = v_contrat_resilie_id;
      v_contrat_existant_id := v_contrat_resilie_id;
      v_contrat_reactive := TRUE;
    END IF;
  END IF;

  -- ÉTAPE 6 : Contrat actif existant ?
  IF v_contrat_existant_id IS NULL THEN
    SELECT id INTO v_contrat_existant_id
    FROM public.contrats
    WHERE entreprise_id = p_entreprise_id
      AND statut IN ('actif', 'en_attente_validation')
    LIMIT 1;
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
    type_pack_souhaite, statut
  ) VALUES (
    p_entreprise_id, v_contrat_id, p_type_vehicule::type_vehicule, v_immat,
    p_marque, p_modele, p_annee, p_couleur, p_kilometrage, p_photo_path, p_notes,
    p_pack, v_statut_vehicule
  ) RETURNING id INTO v_vehicule_id;

  IF v_statut_vehicule = 'actif' THEN
    -- Greffe / création ligne contrat_lignes
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

  -- Recalcul caches
  SELECT COUNT(*) INTO v_nb_vehicules_actifs
  FROM public.vehicules WHERE contrat_id = v_contrat_id AND statut = 'actif';

  SELECT palier, taux_remise INTO v_palier, v_remise
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
      'numero_contrat', COALESCE(v_numero_contrat, (SELECT numero_contrat FROM public.contrats WHERE id = v_contrat_id)),
      'pack', p_pack,
      'statut_vehicule', v_statut_vehicule::text,
      'statut_contrat', v_statut_contrat::text,
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
    'statut_contrat', v_statut_contrat::text,
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

-- PARTIE 2 — Corriger supprimer_vehicule
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

  -- Permissions
  IF NOT (v_is_admin OR v_is_staff OR v_is_commercial) THEN
    -- Client : doit appartenir à la même entreprise
    v_user_entreprise := public.get_user_entreprise(v_user_id);
    IF v_user_entreprise IS NULL OR v_user_entreprise <> v_entreprise_id THEN
      RAISE EXCEPTION 'Permission refusée';
    END IF;
  END IF;

  PERFORM 1 FROM public.entreprises WHERE id = v_entreprise_id FOR UPDATE;

  -- GARDE-FOU FACTURATION
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

  -- Trouver ligne contrat_lignes
  IF v_contrat_id IS NOT NULL AND v_type_pack IS NOT NULL THEN
    SELECT id INTO v_contrat_ligne_id
    FROM public.contrat_lignes
    WHERE contrat_id = v_contrat_id AND type_pack = v_type_pack
    LIMIT 1 FOR UPDATE;
  END IF;

  -- Suppression physique
  DELETE FROM public.vehicules WHERE id = p_vehicule_id;

  -- Décrément ligne
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
      UPDATE public.contrats
      SET statut = 'resilie',
          date_resiliation = NOW(),
          nb_vehicules_actifs = 0,
          montant_brut_mensuel = 0,
          montant_net_mensuel = 0,
          updated_at = NOW()
      WHERE id = v_contrat_id;
      v_contrat_resilie := TRUE;
    ELSE
      SELECT COUNT(*) INTO v_nb_vehicules_restants
      FROM public.vehicules
      WHERE contrat_id = v_contrat_id AND statut = 'actif';

      SELECT palier, taux_remise INTO v_palier, v_remise
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

  -- Log
  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (
    v_user_id,
    CASE WHEN v_contrat_resilie THEN 'suppression_vehicule_contrat_resilie_auto' ELSE 'suppression_vehicule' END,
    jsonb_build_object(
      'entreprise_id', v_entreprise_id,
      'entreprise_nom', v_entreprise_nom,
      'contrat_id', v_contrat_id,
      'vehicule_id', p_vehicule_id,
      'immatriculation', v_immatriculation,
      'type_pack', v_type_pack,
      'ligne_supprimee', v_ligne_supprimee,
      'contrat_resilie_auto', v_contrat_resilie,
      'force_facturation', p_force_facturation,
      'nb_vehicules_restants', v_nb_vehicules_restants,
      'montant_net_mensuel', v_montant_net
    ),
    1
  );

  -- Notifications internes (admin + staff + commercial signataire, sauf déclencheur)
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
      'entreprise_id', v_entreprise_id,
      'contrat_id', v_contrat_id,
      'immatriculation', v_immatriculation,
      'contrat_resilie_auto', v_contrat_resilie
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

GRANT EXECUTE ON FUNCTION public.supprimer_vehicule(UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.supprimer_vehicule IS
'Suppression atomique véhicule: décrément contrat_lignes, recalcul caches, résiliation auto si dernier véhicule, garde-fou facturation pré-suppression, dispatch notif.';
