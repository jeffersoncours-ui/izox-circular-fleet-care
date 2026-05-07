CREATE OR REPLACE FUNCTION generer_facture(
  p_contrat_id uuid,
  p_mois integer,
  p_annee integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_facture_id uuid;
  v_periode_debut date;
  v_periode_fin date;
  v_contrat record;
  v_facture_existante uuid;
  v_palier text;
  v_taux_palier numeric(5,4);
  v_nb_vehicules_total integer;
  v_montant_ht numeric(12,2) := 0;
  v_remise_palier numeric(12,2) := 0;
  v_sous_total numeric(12,2) := 0;
  v_tva_taux numeric(5,2);
  v_tva_montant numeric(12,2);
  v_montant_ttc numeric(12,2);
  v_snapshot_prestations jsonb;
  v_snapshot_contrat jsonb;
  v_snapshot_client jsonb;
  v_snapshot_izox jsonb;
  v_serie serie_facture_enum := 'B2B';
  v_ordre integer := 0;
  v_ligne record;
  v_prix_unitaire_ajuste numeric(10,2);
BEGIN
  IF p_mois < 1 OR p_mois > 12 THEN
    RAISE EXCEPTION 'Mois invalide : %. Doit etre entre 1 et 12.', p_mois;
  END IF;

  IF p_annee < 2026 OR p_annee > 2099 THEN
    RAISE EXCEPTION 'Annee invalide : %. Doit etre entre 2026 et 2099.', p_annee;
  END IF;

  v_periode_debut := make_date(p_annee, p_mois, 1);
  v_periode_fin := (v_periode_debut + INTERVAL '1 month' - INTERVAL '1 day')::date;

  SELECT id INTO v_facture_existante
  FROM factures
  WHERE contrat_id = p_contrat_id
    AND periode_debut = v_periode_debut
    AND periode_fin = v_periode_fin
    AND statut != 'annulee';

  IF v_facture_existante IS NOT NULL THEN
    RAISE NOTICE 'Facture deja existante pour ce contrat/periode : %', v_facture_existante;
    RETURN v_facture_existante;
  END IF;

  SELECT
    c.*,
    e.id AS ent_id,
    e.nom AS raison_sociale,
    e.siret,
    e.adresse,
    e.code_postal,
    e.ville
  INTO v_contrat
  FROM contrats c
  JOIN entreprises e ON e.id = c.entreprise_id
  WHERE c.id = p_contrat_id;

  IF v_contrat IS NULL THEN
    RAISE EXCEPTION 'Contrat introuvable : %', p_contrat_id;
  END IF;

  IF v_contrat.statut NOT IN ('actif', 'en_cours_gel') THEN
    RAISE EXCEPTION 'Contrat % non facturable (statut = %). Seuls actif et en_cours_gel sont factures.',
      v_contrat.numero_contrat, v_contrat.statut;
  END IF;

  v_snapshot_prestations := COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'intervention_id', i.id,
      'date_intervention', i.date_intervention,
      'vehicule_id', i.vehicule_id,
      'vehicule_immatriculation', v.immatriculation,
      'vehicule_marque_modele', COALESCE(v.marque, '') || ' ' || COALESCE(v.modele, '')
     ))
     FROM interventions i
     JOIN vehicules v ON v.id = i.vehicule_id
     WHERE v.entreprise_id = v_contrat.entreprise_id
       AND i.statut = 'validee'
       AND i.date_intervention >= v_periode_debut
       AND i.date_intervention <= v_periode_fin
    ),
    '[]'::jsonb
  );

  IF jsonb_array_length(v_snapshot_prestations) = 0 THEN
    RAISE NOTICE 'Aucune prestation validee pour contrat % sur periode %-%. Aucune facture generee.',
      v_contrat.numero_contrat, v_periode_debut, v_periode_fin;
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_nb_vehicules_total
  FROM vehicules
  WHERE entreprise_id = v_contrat.entreprise_id
    AND statut = 'actif';

  v_palier := CASE
    WHEN v_nb_vehicules_total <= 4 THEN 'starter'
    WHEN v_nb_vehicules_total <= 9 THEN 'pro'
    WHEN v_nb_vehicules_total <= 19 THEN 'business'
    ELSE 'premium'
  END;

  v_taux_palier := CASE v_palier
    WHEN 'starter' THEN 0
    WHEN 'pro' THEN 0.05
    WHEN 'business' THEN 0.12
    WHEN 'premium' THEN 0.20
  END;

  FOR v_ligne IN
    SELECT
      cl.type_pack,
      cl.prix_unitaire_ht,
      pc.passages_mois,
      COUNT(i.id) AS nb_passages_effectifs
    FROM contrat_lignes cl
    JOIN prestations_catalogue pc ON pc.code = cl.type_pack
    LEFT JOIN vehicules v ON v.entreprise_id = v_contrat.entreprise_id
    LEFT JOIN interventions i ON i.vehicule_id = v.id
      AND i.statut = 'validee'
      AND i.date_intervention >= v_periode_debut
      AND i.date_intervention <= v_periode_fin
    WHERE cl.contrat_id = p_contrat_id
      AND cl.statut_ligne = 'actif'
    GROUP BY cl.type_pack, cl.prix_unitaire_ht, pc.passages_mois
  LOOP
    v_prix_unitaire_ajuste := ROUND(
      (v_ligne.prix_unitaire_ht / NULLIF(v_ligne.passages_mois, 0))
      * COALESCE(v_contrat.multiplicateur_prix, 1.0),
      2
    );

    v_montant_ht := v_montant_ht + (v_prix_unitaire_ajuste * v_ligne.nb_passages_effectifs);
  END LOOP;

  v_remise_palier := ROUND(v_montant_ht * v_taux_palier, 2);
  v_sous_total := v_montant_ht - v_remise_palier;

  v_tva_taux := 0;
  v_tva_montant := ROUND(v_sous_total * (v_tva_taux / 100), 2);
  v_montant_ttc := v_sous_total + v_tva_montant;

  v_snapshot_client := jsonb_build_object(
    'entreprise_id', v_contrat.ent_id,
    'raison_sociale', v_contrat.raison_sociale,
    'siret', v_contrat.siret,
    'adresse', v_contrat.adresse,
    'code_postal', v_contrat.code_postal,
    'ville', v_contrat.ville,
    'tva_intracommunautaire', NULL,
    'note_tva_intra', 'Champ a completer apres ajout colonne entreprises.tva_intracommunautaire (Vague 2/3)'
  );

  v_snapshot_izox := jsonb_build_object(
    'raison_sociale', 'IZOX',
    'forme_juridique', '[EN COURS IMMATRICULATION]',
    'siret', '[EN COURS IMMATRICULATION]',
    'adresse', 'Evry-Courcouronnes (91)',
    'mention_tva', 'TVA non applicable, art. 293 B du CGI',
    'note', 'Identite IZOX a completer apres immatriculation SASU (table parametres_societe future)'
  );

  v_snapshot_contrat := jsonb_build_object(
    'contrat_id', p_contrat_id,
    'numero_contrat', v_contrat.numero_contrat,
    'engagement_type', v_contrat.engagement_type,
    'multiplicateur_prix', v_contrat.multiplicateur_prix,
    'palier_applique', v_palier,
    'taux_palier', v_taux_palier,
    'nb_vehicules_total_entreprise', v_nb_vehicules_total,
    'date_debut', v_contrat.date_debut,
    'date_fin_engagement', v_contrat.date_fin_engagement
  );

  INSERT INTO factures (
    contrat_id, entreprise_id, serie, annee_fiscale,
    periode_debut, periode_fin,
    statut,
    montant_ht, tva_taux, tva_montant, montant_ttc,
    devise, regime_tva,
    mention_tva_speciale,
    snapshot_client, snapshot_izox, snapshot_contrat, snapshot_prestations,
    created_by
  ) VALUES (
    p_contrat_id, v_contrat.entreprise_id, v_serie, p_annee,
    v_periode_debut, v_periode_fin,
    'brouillon',
    v_sous_total, v_tva_taux, v_tva_montant, v_montant_ttc,
    'EUR', 'franchise_base',
    'TVA non applicable, art. 293 B du CGI',
    v_snapshot_client, v_snapshot_izox, v_snapshot_contrat, v_snapshot_prestations,
    auth.uid()
  ) RETURNING id INTO v_facture_id;

  v_ordre := 0;

  FOR v_ligne IN
    SELECT
      cl.type_pack,
      cl.prix_unitaire_ht,
      pc.passages_mois,
      pc.nom AS pack_nom,
      COUNT(i.id) AS nb_passages_effectifs
    FROM contrat_lignes cl
    JOIN prestations_catalogue pc ON pc.code = cl.type_pack
    LEFT JOIN vehicules v ON v.entreprise_id = v_contrat.entreprise_id
    LEFT JOIN interventions i ON i.vehicule_id = v.id
      AND i.statut = 'validee'
      AND i.date_intervention >= v_periode_debut
      AND i.date_intervention <= v_periode_fin
    WHERE cl.contrat_id = p_contrat_id
      AND cl.statut_ligne = 'actif'
    GROUP BY cl.type_pack, cl.prix_unitaire_ht, pc.passages_mois, pc.nom
    HAVING COUNT(i.id) > 0
  LOOP
    v_prix_unitaire_ajuste := ROUND(
      (v_ligne.prix_unitaire_ht / NULLIF(v_ligne.passages_mois, 0))
      * COALESCE(v_contrat.multiplicateur_prix, 1.0),
      2
    );

    v_ordre := v_ordre + 1;

    INSERT INTO factures_lignes (
      facture_id, ordre_affichage, type_ligne, libelle,
      quantite, prix_unitaire_ht, montant_ht, tva_taux
    ) VALUES (
      v_facture_id, v_ordre, 'prestation',
      v_ligne.pack_nom || ' - ' || v_ligne.nb_passages_effectifs || ' passage(s)',
      v_ligne.nb_passages_effectifs,
      v_prix_unitaire_ajuste,
      v_prix_unitaire_ajuste * v_ligne.nb_passages_effectifs,
      v_tva_taux
    );
  END LOOP;

  IF v_remise_palier > 0 THEN
    v_ordre := v_ordre + 1;
    INSERT INTO factures_lignes (
      facture_id, ordre_affichage, type_ligne, libelle,
      quantite, prix_unitaire_ht, montant_ht, tva_taux
    ) VALUES (
      v_facture_id, v_ordre, 'remise_palier',
      'Remise palier ' || v_palier || ' (-' || (v_taux_palier * 100)::text || '%)',
      NULL, NULL, -v_remise_palier, v_tva_taux
    );
  END IF;

  v_ordre := v_ordre + 1;
  INSERT INTO factures_lignes (
    facture_id, ordre_affichage, type_ligne, libelle,
    quantite, prix_unitaire_ht, montant_ht, tva_taux
  ) VALUES (
    v_facture_id, v_ordre, 'total',
    'Total HT', NULL, NULL, v_sous_total, v_tva_taux
  );

  INSERT INTO admin_actions_log (
    user_id, action, details, nb_entites_impactees
  )
  VALUES (
    auth.uid(),
    'generation_facture_brouillon',
    jsonb_build_object(
      'facture_id', v_facture_id,
      'contrat_id', p_contrat_id,
      'numero_contrat', v_contrat.numero_contrat,
      'periode_debut', v_periode_debut,
      'periode_fin', v_periode_fin,
      'montant_ttc', v_montant_ttc,
      'nb_prestations', jsonb_array_length(v_snapshot_prestations),
      'palier', v_palier,
      'multiplicateur', v_contrat.multiplicateur_prix
    ),
    1
  );

  RETURN v_facture_id;
END;
$$;

COMMENT ON FUNCTION generer_facture(uuid, integer, integer) IS
'Genere une facture brouillon pour un contrat donne sur une periode mensuelle. Modele alpha : zero prestation = pas de facture. Idempotent : retourne la facture existante si deja generee. Statut de creation = brouillon (emission manuelle via emettre_facture en 3.A.4.2).';