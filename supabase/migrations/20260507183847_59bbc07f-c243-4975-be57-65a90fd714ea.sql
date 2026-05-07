CREATE OR REPLACE FUNCTION public.emettre_facture(
  p_facture_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_facture record;
  v_sequence_name text;
  v_numero_sequentiel integer;
  v_numero_facture text;
  v_now timestamptz := now();
  v_sequence_existe boolean;
BEGIN
  SELECT id, contrat_id, entreprise_id, serie, annee_fiscale, statut,
         numero_facture, periode_debut, periode_fin, montant_ttc
  INTO v_facture
  FROM factures
  WHERE id = p_facture_id;

  IF v_facture IS NULL THEN
    RAISE EXCEPTION 'Facture introuvable : %', p_facture_id;
  END IF;

  IF v_facture.statut != 'brouillon' THEN
    RAISE EXCEPTION 'Emission impossible : la facture % est en statut % (seul brouillon est emissible).',
      p_facture_id, v_facture.statut;
  END IF;

  v_sequence_name := 'seq_facture_' || lower(v_facture.serie::text) || '_' || v_facture.annee_fiscale;

  SELECT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = v_sequence_name
      AND relkind = 'S'
  ) INTO v_sequence_existe;

  IF NOT v_sequence_existe THEN
    EXECUTE format(
      'CREATE SEQUENCE IF NOT EXISTS %I START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE',
      v_sequence_name
    );
    RAISE NOTICE 'Sequence % creee automatiquement (nouvelle annee fiscale)', v_sequence_name;
  END IF;

  EXECUTE format('SELECT nextval(%L)', v_sequence_name) INTO v_numero_sequentiel;

  v_numero_facture := 'FA-' || v_facture.serie::text || '-' ||
                      v_facture.annee_fiscale || '-' ||
                      lpad(v_numero_sequentiel::text, 6, '0');

  UPDATE factures
  SET
    statut = 'emise',
    numero_facture = v_numero_facture,
    numero_sequentiel = v_numero_sequentiel,
    date_emission = v_now::date,
    emitted_at = v_now,
    date_echeance = COALESCE(date_echeance, (v_now::date + INTERVAL '30 days')::date)
  WHERE id = p_facture_id;

  INSERT INTO admin_actions_log (
    user_id, action, details, nb_entites_impactees
  )
  VALUES (
    auth.uid(),
    'emission_facture',
    jsonb_build_object(
      'facture_id', p_facture_id,
      'numero_facture', v_numero_facture,
      'numero_sequentiel', v_numero_sequentiel,
      'serie', v_facture.serie,
      'annee_fiscale', v_facture.annee_fiscale,
      'date_emission', v_now::date,
      'montant_ttc', v_facture.montant_ttc,
      'sequence_utilisee', v_sequence_name
    ),
    1
  );

  RETURN v_numero_facture;
END;
$$;

COMMENT ON FUNCTION public.emettre_facture(uuid) IS
'Emet une facture brouillon : attribution atomique du numero sequentiel legal selon serie+annee, bascule en statut emise. Auto-bootstrap des sequences pour nouvelles annees fiscales. Le numero attribue est definitif et immuable (triggers d''immutabilite). Format : FA-B2B-{annee}-{6 chiffres}.';
