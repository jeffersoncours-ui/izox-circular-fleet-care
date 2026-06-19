CREATE OR REPLACE FUNCTION public.ajouter_vehicule(p_entreprise_id uuid, p_type_vehicule text, p_immatriculation text, p_pack text, p_marque text DEFAULT NULL::text, p_modele text DEFAULT NULL::text, p_annee integer DEFAULT NULL::integer, p_couleur text DEFAULT NULL::text, p_kilometrage integer DEFAULT NULL::integer, p_photo_path text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
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
  v_vehicule_id UUID;
  v_statut_vehicule public.statut_vehicule;
  v_statut_contrat public.contrat_statut_enum;
  v_nb_vehicules_actifs INTEGER := 0;
  v_palier TEXT;
  v_remise NUMERIC;
  v_prix_pack NUMERIC;
  v_numero_contrat TEXT;
  v_montant_brut NUMERIC := 0;
  v_montant_net NUMERIC := 0;
  v_entreprise_nom TEXT;
  v_contrat_cree BOOLEAN := FALSE;
  v_immat TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  v_is_admin := public.has_role(v_user_id, 'admin'::app_role);
  v_is_staff := public.has_role(v_user_id, 'staff'::app_role);

  IF v_is_admin THEN
    v_role_initiateur := 'admin';
  ELSIF v_is_staff THEN
    v_role_initiateur := 'staff';
  ELSIF public.has_role(v_user_id, 'commercial'::app_role) THEN
    v_role_initiateur := 'commercial';
  ELSE
    v_role_initiateur := 'client';
  END IF;

  IF p_pack NOT IN ('pack_interieur', 'pack_standard', 'pack_vtc') THEN
    RAISE EXCEPTION 'Pack invalide: %. Valeurs autorisées: pack_interieur, pack_standard, pack_vtc', p_pack;
  END IF;

  v_prix_pack := CASE p_pack
    WHEN 'pack_interieur' THEN 130
    WHEN 'pack_standard' THEN 170
    WHEN 'pack_vtc' THEN 240
  END;

  SELECT nom INTO v_entreprise_nom FROM public.entreprises WHERE id = p_entreprise_id;
  IF v_entreprise_nom IS NULL THEN
    RAISE EXCEPTION 'Entreprise introuvable: %', p_entreprise_id;
  END IF;

  IF v_is_admin OR v_is_staff THEN
    v_statut_vehicule := 'actif';
    v_statut_contrat := 'actif';
  ELSE
    v_statut_vehicule := 'en_attente_validation';
    v_statut_contrat := 'en_attente_validation';
  END IF;

  PERFORM 1 FROM public.entreprises WHERE id = p_entreprise_id FOR UPDATE;

  SELECT id INTO v_contrat_existant_id
  FROM public.contrats
  WHERE entreprise_id = p_entreprise_id
    AND statut IN ('actif', 'en_attente_validation')
  LIMIT 1;

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
    UPDATE public.contrat_lignes
    SET nb_vehicules = nb_vehicules + 1
    WHERE contrat_id = v_contrat_id
      AND type_pack = p_pack
      AND statut_ligne = 'actif';

    IF NOT FOUND THEN
      INSERT INTO public.contrat_lignes (contrat_id, type_pack, nb_vehicules, prix_unitaire_ht, statut_ligne)
      VALUES (v_contrat_id, p_pack, 1, v_prix_pack, 'actif');
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_nb_vehicules_actifs
  FROM public.vehicules WHERE contrat_id = v_contrat_id AND statut = 'actif';

  SELECT palier, remise_pct INTO v_palier, v_remise
  FROM public.calculer_palier_remise(v_nb_vehicules_actifs);

  SELECT COALESCE(SUM(
    CASE type_pack_souhaite
      WHEN 'pack_interieur' THEN 130
      WHEN 'pack_standard' THEN 170
      WHEN 'pack_vtc' THEN 240
      ELSE 0
    END
  ), 0) INTO v_montant_brut
  FROM public.vehicules WHERE contrat_id = v_contrat_id AND statut = 'actif';

  v_montant_net := ROUND(v_montant_brut * (1 - COALESCE(v_remise, 0)), 2);

  UPDATE public.contrats
  SET palier = v_palier,
      montant_net_mensuel = v_montant_net,
      nb_vehicules_actifs = v_nb_vehicules_actifs,
      updated_at = NOW()
  WHERE id = v_contrat_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (
    v_user_id,
    'ajout_vehicule',
    jsonb_build_object(
      'entreprise_id', p_entreprise_id,
      'entreprise_nom', v_entreprise_nom,
      'vehicule_id', v_vehicule_id,
      'immatriculation', v_immat,
      'contrat_id', v_contrat_id,
      'contrat_cree', v_contrat_cree,
      'numero_contrat', COALESCE(v_numero_contrat, (SELECT numero_contrat FROM public.contrats WHERE id = v_contrat_id)),
      'pack', p_pack,
      'statut_vehicule', v_statut_vehicule::text,
      'statut_contrat', v_statut_contrat::text,
      'role_initiateur', v_role_initiateur,
      'palier', v_palier,
      'nb_vehicules_actifs', v_nb_vehicules_actifs,
      'montant_net_mensuel', v_montant_net
    ),
    1
  );

  RETURN jsonb_build_object(
    'success', true,
    'vehicule_id', v_vehicule_id,
    'contrat_id', v_contrat_id,
    'contrat_cree', v_contrat_cree,
    'statut_vehicule', v_statut_vehicule::text,
    'statut_contrat', v_statut_contrat::text,
    'palier', v_palier,
    'remise_pct', v_remise,
    'nb_vehicules_actifs', v_nb_vehicules_actifs,
    'montant_brut_mensuel', v_montant_brut,
    'montant_net_mensuel', v_montant_net,
    'numero_contrat', COALESCE(v_numero_contrat, (SELECT numero_contrat FROM public.contrats WHERE id = v_contrat_id))
  );
END;
$function$;