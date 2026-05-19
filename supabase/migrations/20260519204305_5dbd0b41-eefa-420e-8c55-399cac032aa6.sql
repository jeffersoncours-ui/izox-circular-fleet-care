
DROP VIEW IF EXISTS public.v_entreprises_vehicules_resume;
CREATE VIEW public.v_entreprises_vehicules_resume AS
SELECT e.id AS entreprise_id, e.nom, e.ville, e.type_client, e.commercial_id,
  (SELECT (COALESCE(profiles.prenom,'')||' '||COALESCE(profiles.nom,'')) FROM profiles WHERE profiles.id = e.commercial_id) AS commercial_nom,
  count(DISTINCT v.id) FILTER (WHERE v.statut::text='actif') AS nb_vehicules_actifs,
  count(DISTINCT v.id) FILTER (WHERE v.statut::text='en_attente_validation') AS nb_vehicules_en_attente,
  count(DISTINCT v.id) FILTER (WHERE v.statut::text='gele') AS nb_vehicules_gele,
  count(DISTINCT v.id) AS nb_vehicules_total,
  c.id AS contrat_actif_id, c.numero_contrat, c.statut::text AS contrat_statut,
  c.palier, c.montant_brut_mensuel, c.montant_net_mensuel, c.remise_commerciale_pct
FROM entreprises e
LEFT JOIN vehicules v ON v.entreprise_id = e.id
LEFT JOIN contrats c ON c.entreprise_id = e.id
  AND c.statut::text IN ('actif','en_attente_validation','en_cours_gel')
WHERE e.archived_at IS NULL
GROUP BY e.id, e.nom, e.ville, e.type_client, e.commercial_id, c.id, c.numero_contrat, c.statut, c.palier, c.montant_brut_mensuel, c.montant_net_mensuel, c.remise_commerciale_pct
HAVING count(v.id) > 0;

DROP VIEW IF EXISTS public.v_demandes_gel_with_quota;
CREATE VIEW public.v_demandes_gel_with_quota AS
SELECT dg.*, e.nom AS entreprise_nom, c.numero_contrat, c.commercial_signataire_id,
  public.calculer_quota_gel_consomme(dg.entreprise_id) AS quota_consomme_actuel,
  (dg.date_fin_prevue - dg.date_debut + 1) AS duree_jours_demandee
FROM public.demandes_gel dg
JOIN public.entreprises e ON e.id = dg.entreprise_id
JOIN public.contrats c ON c.id = dg.contrat_id;

GRANT SELECT ON public.v_demandes_gel_with_quota TO authenticated;
