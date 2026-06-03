-- =============================================================
-- RLS vehicules pour opérateur terrain
-- + Contrainte "1 intervention à la fois" dans le RPC
-- =============================================================

-- 1. RLS vehicules : SELECT pour operateur
--    Nécessaire pour le join dashboard + onglet Recherche
CREATE POLICY "vehicules_operateur_select"
ON public.vehicules FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'operateur'::app_role)
);

-- 2. Mise à jour RPC : contrainte "1 en cours à la fois"
CREATE OR REPLACE FUNCTION public.prendre_en_charge_intervention(p_intervention_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'operateur'::app_role) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT id INTO v_operator_id
  FROM public.operators
  WHERE user_id = auth.uid();

  IF v_operator_id IS NULL THEN
    RAISE EXCEPTION 'Compte terrain non lié à un opérateur planning';
  END IF;

  -- Contrainte : une seule intervention en cours à la fois
  IF EXISTS (
    SELECT 1 FROM public.interventions
    WHERE operateur_id = auth.uid()
      AND statut = 'en_cours'
  ) THEN
    RAISE EXCEPTION 'Terminez votre intervention en cours avant d''en commencer une nouvelle';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.interventions
    WHERE id = p_intervention_id
      AND statut = 'planifiee'
      AND operator_id = v_operator_id
  ) THEN
    RAISE EXCEPTION 'Intervention introuvable, non planifiée ou non assignée à vous';
  END IF;

  UPDATE public.interventions
  SET
    operateur_id = auth.uid(),
    statut       = 'en_cours'
  WHERE id = p_intervention_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.prendre_en_charge_intervention(uuid) TO authenticated;
