-- Fix: _recalculer_caches_contrat lisait remise_pct depuis calculer_palier_remise()
-- mais la fonction retourne taux_remise. Même bug que sessions 27c/28 sur les autres RPCs.
CREATE OR REPLACE FUNCTION public._recalculer_caches_contrat(p_contrat_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nb INTEGER; v_palier TEXT; v_remise NUMERIC; v_comm NUMERIC; v_facteur NUMERIC; v_brut NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_nb FROM vehicules WHERE contrat_id = p_contrat_id AND statut::text='actif';
  SELECT palier, taux_remise INTO v_palier, v_remise FROM calculer_palier_remise(v_nb);
  SELECT COALESCE(SUM(prix_unitaire_ht * nb_vehicules), 0) INTO v_brut
    FROM contrat_lignes WHERE contrat_id = p_contrat_id AND COALESCE(statut_ligne,'actif')='actif';
  SELECT COALESCE(remise_commerciale_pct,0) INTO v_comm FROM contrats WHERE id = p_contrat_id;
  v_facteur := GREATEST(0.70, (1 - v_remise) * (1 - COALESCE(v_comm,0)));
  UPDATE contrats SET nb_vehicules_actifs=v_nb, palier=v_palier, remise_pct=v_remise,
    montant_brut_mensuel=v_brut, montant_net_mensuel=ROUND(v_brut * v_facteur, 2), updated_at=NOW()
  WHERE id = p_contrat_id;
END;$$;
