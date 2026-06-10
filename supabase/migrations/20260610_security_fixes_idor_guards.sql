-- =========================================================================
-- Audit sécurité 27c — correctifs IDOR / role guards / RLS
-- 1. ajouter_vehicule : un client ne peut créer que dans SA propre entreprise
-- 2. generer_facture : guard admin/staff (était appelable par tout authenticated)
-- 3. vehicules_operateur_select : filtre par interventions liées (était grand ouvert)
--
-- NOTE : corps complets identiques à la version courante, seules les gardes
-- (lignes "Garde IDOR", "Guard admin/staff", filtre RLS) sont ajoutées.
-- Appliqué en prod via apply_migration le 2026-06-10.
-- =========================================================================

-- PARTIE 1 — ajouter_vehicule : garde IDOR client
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
  v_user_id UUID; v_is_admin BOOLEAN; v_is_staff BOOLEAN; v_role_initiateur TEXT;
  v_contrat_id UUID; v_contrat_existant_id UUID; v_contrat_resilie_id UUID;
  v_contrat_ligne_id UUID; v_vehicule_id UUID;
  v_statut_vehicule public.statut_vehicule; v_statut_contrat public.contrat_statut_enum;
  v_nb_vehicules_actifs INTEGER := 0; v_palier TEXT; v_remise NUMERIC; v_remise_commerciale NUMERIC;
  v_prix_pack NUMERIC; v_numero_contrat TEXT; v_montant_brut NUMERIC := 0; v_montant_net NUMERIC := 0;
  v_facteur_palier NUMERIC; v_facteur_commercial NUMERIC; v_facteur_combine NUMERIC;
  v_entreprise_nom TEXT; v_contrat_cree BOOLEAN := FALSE; v_contrat_reactive BOOLEAN := FALSE; v_immat TEXT;
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

  -- Garde IDOR : un client ne peut ajouter un véhicule que dans SA propre entreprise
  IF v_role_initiateur = 'client' THEN
    IF public.get_user_entreprise(v_user_id) IS DISTINCT FROM p_entreprise_id THEN
      RAISE EXCEPTION 'Entreprise non autorisée';
    END IF;
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

  IF v_is_admin OR v_is_staff THEN
    SELECT id INTO v_contrat_resilie_id
    FROM public.contrats
    WHERE entreprise_id = p_entreprise_id AND statut = 'resilie'
    ORDER BY date_resiliation DESC NULLS LAST, created_at DESC
    LIMIT 1 FOR UPDATE;

    IF v_contrat_resilie_id IS NOT NULL THEN
      UPDATE public.contrats SET statut = 'actif', date_resiliation = NULL, updated_at = NOW()
      WHERE id = v_contrat_resilie_id;
      v_contrat_existant_id := v_contrat_resilie_id;
      v_contrat_reactive := TRUE;
    END IF;
  END IF;

  IF v_contrat_existant_id IS NULL THEN
    SELECT id INTO v_contrat_existant_id
    FROM public.contrats
    WHERE entreprise_id = p_entreprise_id AND statut IN ('actif', 'en_attente_validation')
    LIMIT 1;
  END IF;

  IF v_contrat_existant_id IS NOT NULL THEN
    v_contrat_id := v_contrat_existant_id; v_contrat_cree := FALSE;
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
    marque, modele, annee, couleur, kilometrage, photo_path, notes, type_pack_souhaite, statut
  ) VALUES (
    p_entreprise_id, v_contrat_id, p_type_vehicule::type_vehicule, v_immat,
    p_marque, p_modele, p_annee, p_couleur, p_kilometrage, p_photo_path, p_notes, p_pack, v_statut_vehicule
  ) RETURNING id INTO v_vehicule_id;

  IF v_statut_vehicule = 'actif' THEN
    SELECT id INTO v_contrat_ligne_id
    FROM public.contrat_lignes
    WHERE contrat_id = v_contrat_id AND type_pack = p_pack AND statut_ligne = 'actif'
    LIMIT 1 FOR UPDATE;

    IF v_contrat_ligne_id IS NOT NULL THEN
      UPDATE public.contrat_lignes SET nb_vehicules = nb_vehicules + 1 WHERE id = v_contrat_ligne_id;
    ELSE
      INSERT INTO public.contrat_lignes (contrat_id, type_pack, nb_vehicules, prix_unitaire_ht, statut_ligne)
      VALUES (v_contrat_id, p_pack, 1, v_prix_pack, 'actif')
      RETURNING id INTO v_contrat_ligne_id;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_nb_vehicules_actifs
  FROM public.vehicules WHERE contrat_id = v_contrat_id AND statut = 'actif';

  SELECT palier, taux_remise INTO v_palier, v_remise
  FROM public.calculer_palier_remise(v_nb_vehicules_actifs);

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
      montant_brut_mensuel = v_montant_brut, montant_net_mensuel = v_montant_net,
      nb_vehicules_actifs = v_nb_vehicules_actifs, updated_at = NOW()
  WHERE id = v_contrat_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (
    v_user_id,
    CASE WHEN v_contrat_reactive THEN 'reactivation_contrat_via_ajout_vehicule' ELSE 'ajout_vehicule' END,
    jsonb_build_object(
      'entreprise_id', p_entreprise_id, 'entreprise_nom', v_entreprise_nom,
      'vehicule_id', v_vehicule_id, 'immatriculation', v_immat,
      'contrat_id', v_contrat_id, 'contrat_cree', v_contrat_cree, 'contrat_reactive', v_contrat_reactive,
      'numero_contrat', COALESCE(v_numero_contrat, (SELECT numero_contrat FROM public.contrats WHERE id = v_contrat_id)),
      'pack', p_pack, 'statut_vehicule', v_statut_vehicule::text, 'statut_contrat', v_statut_contrat::text,
      'role_initiateur', v_role_initiateur, 'palier', v_palier, 'nb_vehicules_actifs', v_nb_vehicules_actifs,
      'montant_brut_mensuel', v_montant_brut, 'montant_net_mensuel', v_montant_net,
      'remise_palier_pct', v_remise, 'remise_commerciale_pct', v_remise_commerciale
    ), 1
  );

  RETURN jsonb_build_object(
    'success', true, 'vehicule_id', v_vehicule_id, 'contrat_id', v_contrat_id,
    'contrat_ligne_id', v_contrat_ligne_id, 'contrat_cree', v_contrat_cree, 'contrat_reactive', v_contrat_reactive,
    'statut_vehicule', v_statut_vehicule::text, 'statut_contrat', v_statut_contrat::text,
    'palier', v_palier, 'remise_pct', v_remise, 'remise_commerciale_pct', v_remise_commerciale,
    'nb_vehicules_actifs', v_nb_vehicules_actifs, 'montant_brut_mensuel', v_montant_brut, 'montant_net_mensuel', v_montant_net,
    'numero_contrat', COALESCE(v_numero_contrat, (SELECT numero_contrat FROM public.contrats WHERE id = v_contrat_id))
  );
END;
$function$;

-- PARTIE 2 — generer_facture : guard admin/staff en tête de fonction
CREATE OR REPLACE FUNCTION public.generer_facture(p_contrat_id uuid, p_mois integer, p_annee integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_facture_id uuid; v_periode_debut date; v_periode_fin date; v_contrat record;
  v_facture_existante uuid; v_palier text; v_taux_palier numeric(5,4);
  v_remise_commerciale numeric(5,4); v_nb_vehicules_total integer;
  v_montant_ht numeric(12,2) := 0; v_remise_palier numeric(12,2) := 0;
  v_facteur_palier numeric; v_facteur_commercial numeric; v_facteur_combine numeric;
  v_facteur_commercial_effectif numeric; v_montant_apres_remises numeric(12,2);
  v_remise_commerciale_montant numeric(12,2) := 0; v_sous_total numeric(12,2) := 0;
  v_tva_taux numeric(5,2); v_tva_montant numeric(12,2); v_montant_ttc numeric(12,2);
  v_snapshot_prestations jsonb; v_snapshot_contrat jsonb; v_snapshot_client jsonb;
  v_snapshot_izox jsonb; v_serie serie_facture_enum := 'B2B'; v_ordre integer := 0;
  v_ligne record; v_prix_unitaire_ajuste numeric(10,2);
BEGIN
  -- Guard : seuls admin/staff peuvent générer une facture
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)) THEN
    RAISE EXCEPTION 'Permission refusée : rôle admin ou staff requis';
  END IF;

  IF p_mois < 1 OR p_mois > 12 THEN RAISE EXCEPTION 'Mois invalide : %', p_mois; END IF;
  IF p_annee < 2026 OR p_annee > 2099 THEN RAISE EXCEPTION 'Annee invalide : %', p_annee; END IF;
  v_periode_debut := make_date(p_annee, p_mois, 1);
  v_periode_fin := (v_periode_debut + INTERVAL '1 month' - INTERVAL '1 day')::date;
  SELECT id INTO v_facture_existante FROM factures
  WHERE contrat_id = p_contrat_id AND periode_debut = v_periode_debut AND periode_fin = v_periode_fin AND statut != 'annulee';
  IF v_facture_existante IS NOT NULL THEN RETURN v_facture_existante; END IF;
  SELECT c.*, e.id AS ent_id, e.nom AS raison_sociale, e.siret, e.adresse, e.code_postal, e.ville
  INTO v_contrat FROM contrats c JOIN entreprises e ON e.id = c.entreprise_id WHERE c.id = p_contrat_id;
  IF v_contrat IS NULL THEN RAISE EXCEPTION 'Contrat introuvable : %', p_contrat_id; END IF;
  IF v_contrat.statut NOT IN ('actif', 'en_cours_gel', 'resilie') THEN
    RAISE EXCEPTION 'Contrat % non facturable (statut = %).', v_contrat.numero_contrat, v_contrat.statut; END IF;
  v_snapshot_prestations := COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('intervention_id', i.id, 'date_intervention', i.date_intervention,
      'vehicule_id', i.vehicule_id, 'vehicule_immatriculation', v.immatriculation,
      'vehicule_marque_modele', COALESCE(v.marque, '') || ' ' || COALESCE(v.modele, ''),
      'contrat_ligne_id', i.contrat_ligne_id))
     FROM interventions i JOIN vehicules v ON v.id = i.vehicule_id
     WHERE v.entreprise_id = v_contrat.entreprise_id AND i.statut = 'validee'
       AND i.date_intervention >= v_periode_debut AND i.date_intervention <= v_periode_fin), '[]'::jsonb);
  IF jsonb_array_length(v_snapshot_prestations) = 0 THEN RETURN NULL; END IF;
  SELECT COUNT(*) INTO v_nb_vehicules_total FROM vehicules WHERE entreprise_id = v_contrat.entreprise_id AND statut = 'actif';
  v_palier := CASE WHEN v_nb_vehicules_total <= 4 THEN 'starter' WHEN v_nb_vehicules_total <= 9 THEN 'pro'
    WHEN v_nb_vehicules_total <= 19 THEN 'business' ELSE 'premium' END;
  v_taux_palier := CASE v_palier WHEN 'starter' THEN 0 WHEN 'pro' THEN 0.05 WHEN 'business' THEN 0.12 WHEN 'premium' THEN 0.20 END;
  v_remise_commerciale := COALESCE(v_contrat.remise_commerciale_pct, 0);
  FOR v_ligne IN
    SELECT cl.id AS cl_id, cl.type_pack, cl.prix_unitaire_ht, pc.passages_mois, COUNT(i.id) AS nb_passages_effectifs
    FROM contrat_lignes cl JOIN prestations_catalogue pc ON pc.code = cl.type_pack
    LEFT JOIN interventions i ON i.contrat_ligne_id = cl.id AND i.statut = 'validee'
      AND i.date_intervention >= v_periode_debut AND i.date_intervention <= v_periode_fin
    WHERE cl.contrat_id = p_contrat_id AND cl.statut_ligne = 'actif'
    GROUP BY cl.id, cl.type_pack, cl.prix_unitaire_ht, pc.passages_mois LOOP
    v_prix_unitaire_ajuste := ROUND((v_ligne.prix_unitaire_ht / NULLIF(v_ligne.passages_mois, 0)) * COALESCE(v_contrat.multiplicateur_prix, 1.0), 2);
    v_montant_ht := v_montant_ht + (v_prix_unitaire_ajuste * v_ligne.nb_passages_effectifs);
  END LOOP;
  v_remise_palier := ROUND(v_montant_ht * v_taux_palier, 2); v_sous_total := v_montant_ht - v_remise_palier;
  v_facteur_palier := 1 - v_taux_palier; v_facteur_commercial := 1 - v_remise_commerciale;
  v_facteur_combine := GREATEST(0.70, v_facteur_palier * v_facteur_commercial);
  v_facteur_commercial_effectif := CASE WHEN v_facteur_palier > 0 THEN v_facteur_combine / v_facteur_palier ELSE 1 END;
  v_montant_apres_remises := ROUND(v_sous_total * v_facteur_commercial_effectif, 2);
  v_remise_commerciale_montant := v_sous_total - v_montant_apres_remises; v_sous_total := v_montant_apres_remises;
  v_tva_taux := 0; v_tva_montant := ROUND(v_sous_total * (v_tva_taux / 100), 2); v_montant_ttc := v_sous_total + v_tva_montant;
  v_snapshot_client := jsonb_build_object('entreprise_id', v_contrat.ent_id, 'raison_sociale', v_contrat.raison_sociale,
    'siret', v_contrat.siret, 'adresse', v_contrat.adresse, 'code_postal', v_contrat.code_postal, 'ville', v_contrat.ville);
  v_snapshot_izox := jsonb_build_object('raison_sociale', 'IZOX', 'mention_tva', 'TVA non applicable, art. 293 B du CGI');
  v_snapshot_contrat := jsonb_build_object('contrat_id', p_contrat_id, 'numero_contrat', v_contrat.numero_contrat,
    'engagement_type', v_contrat.engagement_type, 'multiplicateur_prix', v_contrat.multiplicateur_prix,
    'palier_applique', v_palier, 'taux_palier', v_taux_palier, 'remise_commerciale_pct', v_remise_commerciale,
    'facteur_commercial_effectif', v_facteur_commercial_effectif, 'nb_vehicules_total_entreprise', v_nb_vehicules_total);
  INSERT INTO factures (contrat_id, entreprise_id, serie, annee_fiscale, periode_debut, periode_fin, statut,
    montant_ht, tva_taux, tva_montant, montant_ttc, devise, regime_tva, mention_tva_speciale,
    snapshot_client, snapshot_izox, snapshot_contrat, snapshot_prestations, created_by)
  VALUES (p_contrat_id, v_contrat.entreprise_id, v_serie, p_annee, v_periode_debut, v_periode_fin, 'brouillon',
    v_sous_total, v_tva_taux, v_tva_montant, v_montant_ttc, 'EUR', 'franchise_base',
    'TVA non applicable, art. 293 B du CGI',
    v_snapshot_client, v_snapshot_izox, v_snapshot_contrat, v_snapshot_prestations, auth.uid())
  RETURNING id INTO v_facture_id;
  v_ordre := 0;
  FOR v_ligne IN
    SELECT cl.id AS cl_id, cl.type_pack, cl.prix_unitaire_ht, pc.passages_mois, pc.nom AS pack_nom, COUNT(i.id) AS nb_passages_effectifs
    FROM contrat_lignes cl JOIN prestations_catalogue pc ON pc.code = cl.type_pack
    LEFT JOIN interventions i ON i.contrat_ligne_id = cl.id AND i.statut = 'validee'
      AND i.date_intervention >= v_periode_debut AND i.date_intervention <= v_periode_fin
    WHERE cl.contrat_id = p_contrat_id AND cl.statut_ligne = 'actif'
    GROUP BY cl.id, cl.type_pack, cl.prix_unitaire_ht, pc.passages_mois, pc.nom HAVING COUNT(i.id) > 0 LOOP
    v_prix_unitaire_ajuste := ROUND((v_ligne.prix_unitaire_ht / NULLIF(v_ligne.passages_mois, 0)) * COALESCE(v_contrat.multiplicateur_prix, 1.0), 2);
    v_ordre := v_ordre + 1;
    INSERT INTO factures_lignes (facture_id, ordre_affichage, type_ligne, libelle, quantite, prix_unitaire_ht, montant_ht, tva_taux)
    VALUES (v_facture_id, v_ordre, 'prestation', v_ligne.pack_nom || ' - ' || v_ligne.nb_passages_effectifs || ' passage(s)',
      v_ligne.nb_passages_effectifs, v_prix_unitaire_ajuste, v_prix_unitaire_ajuste * v_ligne.nb_passages_effectifs, v_tva_taux);
  END LOOP;
  IF v_remise_palier > 0 THEN
    v_ordre := v_ordre + 1;
    INSERT INTO factures_lignes (facture_id, ordre_affichage, type_ligne, libelle, quantite, prix_unitaire_ht, montant_ht, tva_taux)
    VALUES (v_facture_id, v_ordre, 'remise_palier', 'Remise palier ' || v_palier || ' (-' || (v_taux_palier * 100)::text || '%)', NULL, NULL, -v_remise_palier, v_tva_taux);
  END IF;
  IF v_remise_commerciale_montant > 0 THEN
    v_ordre := v_ordre + 1;
    INSERT INTO factures_lignes (facture_id, ordre_affichage, type_ligne, libelle, quantite, prix_unitaire_ht, montant_ht, tva_taux)
    VALUES (v_facture_id, v_ordre, 'remise_commerciale',
      'Remise commerciale -' || ROUND(v_remise_commerciale * 100, 1)::text || '% (effective: -' || ROUND((1 - v_facteur_commercial_effectif) * 100, 2)::text || '%)',
      NULL, NULL, -v_remise_commerciale_montant, v_tva_taux);
  END IF;
  v_ordre := v_ordre + 1;
  INSERT INTO factures_lignes (facture_id, ordre_affichage, type_ligne, libelle, quantite, prix_unitaire_ht, montant_ht, tva_taux)
  VALUES (v_facture_id, v_ordre, 'total', 'Total HT', NULL, NULL, v_sous_total, v_tva_taux);
  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (auth.uid(), 'generation_facture_brouillon', jsonb_build_object(
    'facture_id', v_facture_id, 'contrat_id', p_contrat_id, 'numero_contrat', v_contrat.numero_contrat,
    'periode_debut', v_periode_debut, 'periode_fin', v_periode_fin, 'montant_ttc', v_montant_ttc,
    'nb_prestations', jsonb_array_length(v_snapshot_prestations), 'palier', v_palier, 'taux_palier', v_taux_palier,
    'remise_commerciale_pct', v_remise_commerciale, 'facteur_commercial_effectif', v_facteur_commercial_effectif,
    'multiplicateur_engagement', v_contrat.multiplicateur_prix), 1);
  RETURN v_facture_id;
END;
$function$;

-- PARTIE 3 — RLS opérateur : filtrer les véhicules par interventions liées
DROP POLICY IF EXISTS "vehicules_operateur_select" ON public.vehicules;
CREATE POLICY "vehicules_operateur_select"
ON public.vehicules FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'operateur'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.vehicule_id = vehicules.id
      AND (
        i.operateur_id = auth.uid()
        OR i.operator_id IN (SELECT id FROM public.operators WHERE user_id = auth.uid())
      )
  )
);
