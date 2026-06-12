-- supprimer_vehicule : un commercial ne peut supprimer que sur les entreprises qu'il gère
-- (signataire du contrat OU commercial_id de l'entreprise OU accès délégué).
-- Client et admin/staff : comportement inchangé. Appliqué en prod le 2026-06-10.
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
  v_user_id UUID; v_is_admin BOOLEAN; v_is_staff BOOLEAN; v_is_commercial BOOLEAN;
  v_user_entreprise UUID; v_v RECORD; v_contrat_id UUID; v_contrat_ligne_id UUID;
  v_type_pack TEXT; v_entreprise_id UUID; v_entreprise_nom TEXT; v_commercial_signataire_id UUID;
  v_immatriculation TEXT; v_interventions_non_facturees INTEGER; v_nb_vehicules_restants INTEGER := 0;
  v_nb_lignes_restantes INTEGER; v_ligne_supprimee BOOLEAN := FALSE; v_contrat_resilie BOOLEAN := FALSE;
  v_montant_brut NUMERIC := 0; v_montant_net NUMERIC := 0; v_palier TEXT; v_remise NUMERIC;
  v_remise_commerciale NUMERIC; v_facteur_palier NUMERIC; v_facteur_commercial NUMERIC; v_facteur_combine NUMERIC;
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

  v_contrat_id := v_v.contrat_id; v_type_pack := v_v.type_pack_souhaite;
  v_entreprise_id := v_v.entreprise_id; v_entreprise_nom := v_v.entreprise_nom;
  v_commercial_signataire_id := v_v.commercial_sig; v_immatriculation := v_v.immatriculation;

  -- Permissions
  IF v_is_admin OR v_is_staff THEN
    NULL; -- accès complet
  ELSIF v_is_commercial THEN
    IF v_commercial_signataire_id IS DISTINCT FROM v_user_id
       AND NOT EXISTS (SELECT 1 FROM public.entreprises WHERE id = v_entreprise_id AND commercial_id = v_user_id)
       AND NOT EXISTS (SELECT 1 FROM public.entreprise_acces_commerciaux WHERE entreprise_id = v_entreprise_id AND commercial_id = v_user_id) THEN
      RAISE EXCEPTION 'Commercial non autorisé pour cette entreprise';
    END IF;
  ELSE
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
    WHERE i.vehicule_id = p_vehicule_id AND i.statut = 'validee'
      AND DATE_TRUNC('month', i.date_intervention) = DATE_TRUNC('month', NOW())
      AND NOT EXISTS (
        SELECT 1 FROM public.factures f
        WHERE f.contrat_id = v_contrat_id
          AND DATE_TRUNC('month', f.periode_debut) = DATE_TRUNC('month', i.date_intervention)
          AND f.statut IN ('emise', 'payee')
      );

    IF COALESCE(v_interventions_non_facturees, 0) > 0 AND NOT p_force_facturation THEN
      RETURN jsonb_build_object(
        'success', false, 'error_code', 'INTERVENTIONS_NON_FACTUREES',
        'message', format('Suppression bloquée : %s prestation(s) validée(s) ce mois non facturée(s). Génération facture préalable obligatoire.', v_interventions_non_facturees),
        'interventions_non_facturees', v_interventions_non_facturees,
        'vehicule_id', p_vehicule_id, 'contrat_id', v_contrat_id,
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
    UPDATE public.contrat_lignes SET nb_vehicules = GREATEST(0, nb_vehicules - 1) WHERE id = v_contrat_ligne_id;
    DELETE FROM public.contrat_lignes WHERE id = v_contrat_ligne_id AND nb_vehicules <= 0;
    IF FOUND THEN v_ligne_supprimee := TRUE; END IF;
  END IF;

  IF v_contrat_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_nb_lignes_restantes
    FROM public.contrat_lignes WHERE contrat_id = v_contrat_id AND statut_ligne = 'actif';

    IF v_nb_lignes_restantes = 0 THEN
      UPDATE public.contrats
      SET statut = 'resilie', date_resiliation = NOW(), nb_vehicules_actifs = 0,
          montant_brut_mensuel = 0, montant_net_mensuel = 0, updated_at = NOW()
      WHERE id = v_contrat_id;
      v_contrat_resilie := TRUE;
    ELSE
      SELECT COUNT(*) INTO v_nb_vehicules_restants
      FROM public.vehicules WHERE contrat_id = v_contrat_id AND statut = 'actif';

      SELECT palier, taux_remise INTO v_palier, v_remise
      FROM public.calculer_palier_remise(v_nb_vehicules_restants);

      SELECT COALESCE(SUM(cl.nb_vehicules * cl.prix_unitaire_ht), 0) INTO v_montant_brut
      FROM public.contrat_lignes cl WHERE cl.contrat_id = v_contrat_id AND cl.statut_ligne = 'actif';

      SELECT COALESCE(remise_commerciale_pct, 0) INTO v_remise_commerciale
      FROM public.contrats WHERE id = v_contrat_id;

      v_facteur_palier := 1 - COALESCE(v_remise, 0);
      v_facteur_commercial := 1 - COALESCE(v_remise_commerciale, 0);
      v_facteur_combine := GREATEST(0.70, v_facteur_palier * v_facteur_commercial);
      v_montant_net := ROUND(v_montant_brut * v_facteur_combine, 2);

      UPDATE public.contrats
      SET palier = v_palier, remise_pct = COALESCE(v_remise, 0),
          nb_vehicules_actifs = v_nb_vehicules_restants,
          montant_brut_mensuel = v_montant_brut, montant_net_mensuel = v_montant_net, updated_at = NOW()
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
      'force_facturation', p_force_facturation, 'nb_vehicules_restants', v_nb_vehicules_restants,
      'montant_net_mensuel', v_montant_net
    ), 1
  );

  INSERT INTO public.notifications_internes (
    user_id, source_action, titre, severite, link_url, details, statut, action_requise
  )
  SELECT DISTINCT ur.user_id,
    CASE WHEN v_contrat_resilie THEN 'contrat_resilie_auto' ELSE 'vehicule_supprime' END,
    CASE WHEN v_contrat_resilie THEN 'Contrat résilié auto — ' || v_entreprise_nom ELSE 'Véhicule supprimé — ' || v_entreprise_nom END,
    CASE WHEN v_contrat_resilie THEN 'warning' ELSE 'info' END,
    '/admin/clients/' || v_entreprise_id::text,
    jsonb_build_object('entreprise_id', v_entreprise_id, 'contrat_id', v_contrat_id, 'immatriculation', v_immatriculation, 'contrat_resilie_auto', v_contrat_resilie),
    'non_lu'::notification_statut_enum,
    v_contrat_resilie
  FROM public.user_roles ur
  WHERE ur.role IN ('admin'::app_role, 'staff'::app_role) AND ur.user_id <> v_user_id;

  IF v_commercial_signataire_id IS NOT NULL AND v_commercial_signataire_id <> v_user_id THEN
    INSERT INTO public.notifications_internes (
      user_id, source_action, titre, severite, link_url, details, statut, action_requise
    ) VALUES (
      v_commercial_signataire_id,
      CASE WHEN v_contrat_resilie THEN 'contrat_resilie_auto' ELSE 'vehicule_supprime' END,
      CASE WHEN v_contrat_resilie THEN 'Contrat résilié auto — ' || v_entreprise_nom ELSE 'Véhicule supprimé — ' || v_entreprise_nom END,
      CASE WHEN v_contrat_resilie THEN 'warning' ELSE 'info' END,
      '/admin/clients/' || v_entreprise_id::text,
      jsonb_build_object('entreprise_id', v_entreprise_id, 'contrat_id', v_contrat_id, 'immatriculation', v_immatriculation, 'contrat_resilie_auto', v_contrat_resilie),
      'non_lu'::notification_statut_enum,
      v_contrat_resilie
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'vehicule_id', p_vehicule_id, 'contrat_id', v_contrat_id,
    'ligne_supprimee', v_ligne_supprimee, 'contrat_resilie_auto', v_contrat_resilie,
    'nb_vehicules_restants', v_nb_vehicules_restants,
    'montant_brut_mensuel', v_montant_brut, 'montant_net_mensuel', v_montant_net
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.supprimer_vehicule(UUID, BOOLEAN) TO authenticated;
