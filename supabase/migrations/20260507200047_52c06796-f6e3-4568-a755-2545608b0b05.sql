CREATE OR REPLACE FUNCTION public.annuler_facture_via_avoir(
  p_facture_id uuid,
  p_motif text,
  p_type_avoir text DEFAULT 'annulation_totale',
  p_montant_partiel_ht numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_facture record;
  v_avoir_id uuid;
  v_sequence_name text;
  v_numero_sequentiel integer;
  v_numero_avoir text;
  v_now timestamptz := now();
  v_sequence_existe boolean;
  v_avoir_ht numeric(12,2);
  v_avoir_tva numeric(12,2);
  v_avoir_ttc numeric(12,2);
BEGIN
  IF p_motif IS NULL OR trim(p_motif) = '' THEN
    RAISE EXCEPTION 'Le motif de l''avoir est obligatoire (parametre p_motif).';
  END IF;

  IF p_type_avoir NOT IN (
    'annulation_totale', 'annulation_partielle',
    'remise_commerciale', 'erreur_saisie'
  ) THEN
    RAISE EXCEPTION 'Type d''avoir invalide : %. Valeurs autorisees : annulation_totale, annulation_partielle, remise_commerciale, erreur_saisie.', p_type_avoir;
  END IF;

  IF p_type_avoir IN ('annulation_partielle', 'remise_commerciale') THEN
    IF p_montant_partiel_ht IS NULL OR p_montant_partiel_ht <= 0 THEN
      RAISE EXCEPTION 'Pour un avoir de type %, le montant partiel HT (parametre p_montant_partiel_ht) est obligatoire et doit etre positif. Recu : %', p_type_avoir, p_montant_partiel_ht;
    END IF;
  END IF;

  SELECT
    id, contrat_id, entreprise_id, serie, annee_fiscale,
    numero_facture, statut,
    montant_ht, tva_taux, tva_montant, montant_ttc,
    devise, regime_tva, periode_debut, periode_fin,
    date_emission, date_paiement,
    snapshot_client, snapshot_izox, snapshot_contrat
  INTO v_facture
  FROM factures
  WHERE id = p_facture_id;

  IF v_facture IS NULL THEN
    RAISE EXCEPTION 'Facture introuvable : %', p_facture_id;
  END IF;

  IF v_facture.statut NOT IN ('emise', 'payee') THEN
    RAISE EXCEPTION 'Annulation impossible : la facture % est en statut % (seuls emise et payee peuvent etre annules via avoir).', v_facture.numero_facture, v_facture.statut;
  END IF;

  IF p_montant_partiel_ht IS NOT NULL
     AND p_montant_partiel_ht > v_facture.montant_ht THEN
    RAISE EXCEPTION 'Montant partiel HT (%) superieur au montant HT de la facture %. Pour annulation totale, utiliser type=annulation_totale sans montant partiel.', p_montant_partiel_ht, v_facture.montant_ht;
  END IF;

  IF p_type_avoir = 'annulation_totale' OR p_type_avoir = 'erreur_saisie' THEN
    v_avoir_ht := -v_facture.montant_ht;
    v_avoir_tva := -v_facture.tva_montant;
    v_avoir_ttc := -v_facture.montant_ttc;
  ELSE
    v_avoir_ht := -p_montant_partiel_ht;
    v_avoir_tva := ROUND(-p_montant_partiel_ht * (v_facture.tva_taux / 100), 2);
    v_avoir_ttc := v_avoir_ht + v_avoir_tva;
  END IF;

  v_sequence_name := 'seq_avoir_' || lower(v_facture.serie::text) || '_' || v_facture.annee_fiscale;

  SELECT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = v_sequence_name AND relkind = 'S'
  ) INTO v_sequence_existe;

  IF NOT v_sequence_existe THEN
    EXECUTE format(
      'CREATE SEQUENCE IF NOT EXISTS %I START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE',
      v_sequence_name
    );
    RAISE NOTICE 'Sequence avoir % creee automatiquement (nouvelle annee fiscale)', v_sequence_name;
  END IF;

  EXECUTE format('SELECT nextval(%L)', v_sequence_name) INTO v_numero_sequentiel;

  v_numero_avoir := 'AV-' || v_facture.serie::text || '-' ||
                    v_facture.annee_fiscale || '-' ||
                    lpad(v_numero_sequentiel::text, 6, '0');

  INSERT INTO avoirs (
    numero_avoir, serie, annee_fiscale, numero_sequentiel,
    facture_id, type_avoir, motif,
    montant_ht, tva_taux, tva_montant, montant_ttc, devise,
    date_emission,
    snapshot_facture_origine,
    created_by
  ) VALUES (
    v_numero_avoir, v_facture.serie, v_facture.annee_fiscale, v_numero_sequentiel,
    p_facture_id, p_type_avoir, p_motif,
    v_avoir_ht, v_facture.tva_taux, v_avoir_tva, v_avoir_ttc, v_facture.devise,
    v_now::date,
    jsonb_build_object(
      'facture_id', v_facture.id,
      'numero_facture', v_facture.numero_facture,
      'statut_avant_annulation', v_facture.statut,
      'montant_ht_origine', v_facture.montant_ht,
      'tva_montant_origine', v_facture.tva_montant,
      'montant_ttc_origine', v_facture.montant_ttc,
      'date_emission_origine', v_facture.date_emission,
      'date_paiement_origine', v_facture.date_paiement,
      'periode_debut', v_facture.periode_debut,
      'periode_fin', v_facture.periode_fin,
      'snapshot_client', v_facture.snapshot_client,
      'snapshot_izox', v_facture.snapshot_izox,
      'snapshot_contrat', v_facture.snapshot_contrat
    ),
    auth.uid()
  ) RETURNING id INTO v_avoir_id;

  UPDATE factures
  SET
    statut = 'annulee',
    avoir_id = v_avoir_id
  WHERE id = p_facture_id;

  INSERT INTO admin_actions_log (
    user_id, action, details, nb_entites_impactees
  )
  VALUES (
    auth.uid(),
    'annulation_facture_via_avoir',
    jsonb_build_object(
      'facture_id', p_facture_id,
      'numero_facture', v_facture.numero_facture,
      'statut_facture_avant', v_facture.statut,
      'avoir_id', v_avoir_id,
      'numero_avoir', v_numero_avoir,
      'type_avoir', p_type_avoir,
      'motif', p_motif,
      'montant_avoir_ht', v_avoir_ht,
      'montant_avoir_ttc', v_avoir_ttc,
      'montant_facture_origine_ttc', v_facture.montant_ttc,
      'paiement_avait_eu_lieu', (v_facture.date_paiement IS NOT NULL),
      'sequence_utilisee', v_sequence_name
    ),
    2
  );

  RETURN v_avoir_id;
END;
$$;

COMMENT ON FUNCTION public.annuler_facture_via_avoir(uuid, text, text, numeric) IS
'Annule (totalement ou partiellement) une facture emise ou payee en emettant atomiquement un avoir conforme CGI. UPDATE atomique facture (statut + avoir_id en une seule operation pour satisfaire les triggers d''immutabilite). Auto-bootstrap des sequences pour nouvelles annees. Le motif est obligatoire. Pour annulation_partielle ou remise_commerciale, p_montant_partiel_ht est obligatoire (en HT, TVA recalculee selon regime facture). La trace du paiement est conservee dans le snapshot pour audit.';