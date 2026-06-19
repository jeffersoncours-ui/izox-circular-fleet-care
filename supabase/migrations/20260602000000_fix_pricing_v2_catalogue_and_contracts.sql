-- Fix pricing V2 : mise à jour prestations_catalogue et recalcul des contrats
-- B1 : Prix V2 dans prestations_catalogue (100→130, 150→170, 190→240)
UPDATE public.prestations_catalogue SET prix_ht = 130.00, updated_at = NOW() WHERE code = 'pack_interieur';
UPDATE public.prestations_catalogue SET prix_ht = 170.00, updated_at = NOW() WHERE code = 'pack_standard';
UPDATE public.prestations_catalogue SET prix_ht = 240.00, updated_at = NOW() WHERE code = 'pack_vtc';

-- B2 : Synchroniser contrat_lignes.prix_unitaire_ht
UPDATE public.contrat_lignes cl
SET prix_unitaire_ht = pc.prix_ht
FROM public.prestations_catalogue pc
WHERE cl.type_pack = pc.code
  AND cl.statut_ligne = 'actif'
  AND pc.code IN ('pack_interieur', 'pack_standard', 'pack_vtc')
  AND cl.prix_unitaire_ht != pc.prix_ht;

-- B3 : Recalculer montant_brut_mensuel et montant_net_mensuel pour tous les contrats actifs
UPDATE public.contrats c
SET
  montant_brut_mensuel = sub.brut,
  montant_net_mensuel  = ROUND(
    sub.brut * GREATEST(0.70,
      (1 - COALESCE(c.remise_pct, 0)) * (1 - COALESCE(c.remise_commerciale_pct, 0))
    ), 2
  ),
  updated_at = NOW()
FROM (
  SELECT contrat_id, COALESCE(SUM(nb_vehicules * prix_unitaire_ht), 0) AS brut
  FROM public.contrat_lignes
  WHERE statut_ligne = 'actif'
  GROUP BY contrat_id
) sub
WHERE c.id = sub.contrat_id
  AND c.statut IN ('actif', 'en_cours_gel');
