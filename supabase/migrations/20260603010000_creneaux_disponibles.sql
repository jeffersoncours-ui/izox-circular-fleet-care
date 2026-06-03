-- B1 : RPC get_creneaux_disponibles
-- Retourne l'occupation par (date, slot) pour la plage demandée.
-- capacite_totale = COUNT(operators) * 2 → scalable multi-opérateurs sans changer l'interface.
-- Exclut les interventions annulées et refusées (libèrent le créneau).

CREATE OR REPLACE FUNCTION public.get_creneaux_disponibles(
  p_date_debut date,
  p_date_fin date
)
RETURNS TABLE(
  slot_date date,
  time_slot text,
  nb_interventions bigint,
  capacite_totale bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.date_intervention                         AS slot_date,
    i.time_slot,
    COUNT(*)                                    AS nb_interventions,
    (SELECT COUNT(*) * 2 FROM public.operators) AS capacite_totale
  FROM public.interventions i
  WHERE i.date_intervention BETWEEN p_date_debut AND p_date_fin
    AND i.time_slot IS NOT NULL
    AND i.statut NOT IN ('annulee', 'refusee')
  GROUP BY i.date_intervention, i.time_slot;
$$;

GRANT EXECUTE ON FUNCTION public.get_creneaux_disponibles(date, date) TO authenticated;

COMMENT ON FUNCTION public.get_creneaux_disponibles IS
  'Retourne l''occupation par (date, créneau) pour la plage donnée. '
  'capacite_totale = COUNT(operators)*2 — scalable multi-opérateurs. '
  'Utilisé côté client pour griser les créneaux saturés dans le formulaire RDV.';
