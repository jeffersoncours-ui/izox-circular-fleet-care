-- c.9 Vue agrégée entreprises + véhicules + contrat actif
CREATE OR REPLACE VIEW public.v_entreprises_vehicules_resume AS
SELECT
  e.id AS entreprise_id,
  e.nom,
  e.ville,
  e.type_client,
  e.commercial_id,
  (SELECT (COALESCE(prenom,'') || ' ' || COALESCE(nom,'')) FROM public.profiles WHERE id = e.commercial_id) AS commercial_nom,
  COUNT(DISTINCT v.id) FILTER (WHERE v.statut = 'actif') AS nb_vehicules_actifs,
  COUNT(DISTINCT v.id) FILTER (WHERE v.statut = 'en_attente_validation') AS nb_vehicules_en_attente,
  COUNT(DISTINCT v.id) AS nb_vehicules_total,
  c.id AS contrat_actif_id,
  c.numero_contrat,
  c.statut::text AS contrat_statut,
  c.palier,
  c.montant_brut_mensuel,
  c.montant_net_mensuel,
  c.remise_commerciale_pct
FROM public.entreprises e
LEFT JOIN public.vehicules v ON v.entreprise_id = e.id
LEFT JOIN public.contrats c ON c.entreprise_id = e.id AND c.statut IN ('actif','en_attente_validation')
WHERE e.archived_at IS NULL
GROUP BY e.id, e.nom, e.ville, e.type_client, e.commercial_id,
         c.id, c.numero_contrat, c.statut, c.palier,
         c.montant_brut_mensuel, c.montant_net_mensuel, c.remise_commerciale_pct
HAVING COUNT(v.id) > 0;

COMMENT ON VIEW public.v_entreprises_vehicules_resume IS
'c.9 Vue stricte agrégée : 1 ligne par entreprise active avec ventilation véhicules par statut + contrat actif. Exclut entreprises archivées et entreprises sans véhicules.';

GRANT SELECT ON public.v_entreprises_vehicules_resume TO authenticated;