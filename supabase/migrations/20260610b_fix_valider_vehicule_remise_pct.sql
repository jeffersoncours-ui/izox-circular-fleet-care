-- Fix: valider_vehicule lisait remise_pct au lieu de taux_remise depuis calculer_palier_remise
-- Même bug que ajouter_vehicule/supprimer_vehicule (corrigés en 20260610), manqué sur valider_vehicule
CREATE OR REPLACE FUNCTION public.valider_vehicule(p_vehicule_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  -- FIX: taux_remise (pas remise_pct) — calculer_palier_remise retourne (palier, taux_remise)
  SELECT palier, taux_remise INTO v_palier, v_remise FROM public.calculer_palier_remise(v_nb);

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
$function$;
