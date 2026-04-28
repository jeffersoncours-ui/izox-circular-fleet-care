-- =============================================================================
-- A2bis_6 — SEEDS DE TEST (À EXÉCUTER MANUELLEMENT)
-- ⚠️ À SUPPRIMER AVANT LANCEMENT COMMERCIAL
-- =============================================================================
--
-- Ce script :
--  1. Crée (si absentes) les entreprises de test "Transport Durand" et "VTC Express"
--  2. Insère 3 contrats de test
--  3. Insère les lignes correspondantes (dont multi-packs pour TEST-003)
--
-- Exécution : copier/coller dans Supabase Studio > SQL Editor.
-- =============================================================================

BEGIN;

-- 1. Entreprises de test ------------------------------------------------------
INSERT INTO public.entreprises (nom, type_client, palier_remise)
SELECT 'Transport Durand', 'flotte', 'starter'
WHERE NOT EXISTS (SELECT 1 FROM public.entreprises WHERE nom = 'Transport Durand');

INSERT INTO public.entreprises (nom, type_client, palier_remise)
SELECT 'VTC Express', 'vtc', 'business'
WHERE NOT EXISTS (SELECT 1 FROM public.entreprises WHERE nom = 'VTC Express');

-- 2. Contrats de test ---------------------------------------------------------
WITH e AS (
  SELECT
    (SELECT id FROM public.entreprises WHERE nom = 'Transport Durand' LIMIT 1) AS durand,
    (SELECT id FROM public.entreprises WHERE nom = 'VTC Express'      LIMIT 1) AS vtc
)
INSERT INTO public.contrats
  (entreprise_id, numero_contrat, engagement_annuel, statut,
   passages_mois, passages_restants_mois, mode_paiement, date_debut, date_anniversaire)
SELECT durand, 'TEST-001', false, 'actif', 2, 2, 'sepa', CURRENT_DATE, CURRENT_DATE FROM e
UNION ALL
SELECT vtc,    'TEST-002', true,  'actif', 2, 2, 'sepa', CURRENT_DATE, CURRENT_DATE FROM e
UNION ALL
SELECT durand, 'TEST-003', false, 'actif', 2, 2, 'sepa', CURRENT_DATE, CURRENT_DATE FROM e;

-- 3. Lignes des contrats ------------------------------------------------------
-- Contrat 1 : pack_interieur x3
INSERT INTO public.contrat_lignes (contrat_id, type_pack, nb_vehicules, prix_unitaire_ht)
SELECT id, 'pack_interieur', 3,  100 FROM public.contrats WHERE numero_contrat = 'TEST-001';

-- Contrat 2 : pack_standard x10
INSERT INTO public.contrat_lignes (contrat_id, type_pack, nb_vehicules, prix_unitaire_ht)
SELECT id, 'pack_standard',  10, 150 FROM public.contrats WHERE numero_contrat = 'TEST-002';

-- Contrat 3 : multi-packs (pack_interieur x5 + pack_standard x5)
INSERT INTO public.contrat_lignes (contrat_id, type_pack, nb_vehicules, prix_unitaire_ht)
SELECT id, 'pack_interieur', 5, 100 FROM public.contrats WHERE numero_contrat = 'TEST-003'
UNION ALL
SELECT id, 'pack_standard',  5, 150 FROM public.contrats WHERE numero_contrat = 'TEST-003';

COMMIT;

-- Vérification rapide
SELECT numero_contrat, engagement_annuel, statut, passages_mois
FROM public.contrats
WHERE numero_contrat LIKE 'TEST-%'
ORDER BY numero_contrat;
