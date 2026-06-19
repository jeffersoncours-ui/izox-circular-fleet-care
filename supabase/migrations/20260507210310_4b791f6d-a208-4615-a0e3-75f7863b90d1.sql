DO $$
DECLARE
  v_contrat_id uuid;
  v_vehicule_id uuid;
  v_intervention_id uuid;
  v_intervention_id_2 uuid;
  v_date_apres date;
  v_date_init date;
BEGIN
  SELECT c.id, v.id INTO v_contrat_id, v_vehicule_id
  FROM contrats c
  JOIN vehicules v ON v.contrat_id = c.id
  WHERE c.numero_contrat = 'CT-202604-0001'
  LIMIT 1;

  IF v_contrat_id IS NULL THEN
    RAISE NOTICE 'SETUP : aucun vehicule rattache a CT-202604-0001';
    RETURN;
  END IF;

  SELECT date_dernier_passage INTO v_date_init FROM contrats WHERE id = v_contrat_id;
  RAISE NOTICE 'SETUP : date_dernier_passage initiale = %', v_date_init;

  -- TEST 1
  INSERT INTO interventions (vehicule_id, statut, date_intervention)
  VALUES (v_vehicule_id, 'validee', '2026-06-15')
  RETURNING id INTO v_intervention_id;

  SELECT date_dernier_passage INTO v_date_apres FROM contrats WHERE id = v_contrat_id;
  IF v_date_apres = '2026-06-15' THEN
    RAISE NOTICE 'TEST 1 OK : INSERT validee -> date = %', v_date_apres;
  ELSE
    RAISE NOTICE 'TEST 1 ECHEC : recu %', v_date_apres;
  END IF;

  -- TEST 2
  INSERT INTO interventions (vehicule_id, statut, date_intervention)
  VALUES (v_vehicule_id, 'validee', '2026-04-01')
  RETURNING id INTO v_intervention_id_2;

  SELECT date_dernier_passage INTO v_date_apres FROM contrats WHERE id = v_contrat_id;
  IF v_date_apres = '2026-06-15' THEN
    RAISE NOTICE 'TEST 2 OK : date inchangee a %', v_date_apres;
  ELSE
    RAISE NOTICE 'TEST 2 ECHEC : recu %', v_date_apres;
  END IF;

  -- TEST 3
  UPDATE interventions SET statut = 'en_cours' WHERE id = v_intervention_id;
  SELECT date_dernier_passage INTO v_date_apres FROM contrats WHERE id = v_contrat_id;
  IF v_date_apres = '2026-04-01' THEN
    RAISE NOTICE 'TEST 3 OK : recalcul a %', v_date_apres;
  ELSE
    RAISE NOTICE 'TEST 3 ECHEC : recu %', v_date_apres;
  END IF;

  -- TEST 4
  DELETE FROM interventions WHERE id = v_intervention_id_2;
  SELECT date_dernier_passage INTO v_date_apres FROM contrats WHERE id = v_contrat_id;
  IF v_date_apres IS NULL THEN
    RAISE NOTICE 'TEST 4 OK : DELETE derniere validee -> NULL';
  ELSE
    RAISE NOTICE 'TEST 4 : recu % (peut etre non-NULL si autres interventions validees existent)', v_date_apres;
  END IF;

  -- CLEANUP
  DELETE FROM interventions WHERE id = v_intervention_id;

  -- Restauration date initiale si modifiee
  UPDATE contrats SET date_dernier_passage = v_date_init WHERE id = v_contrat_id;
END $$;