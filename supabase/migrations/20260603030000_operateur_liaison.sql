-- =============================================================
-- Liaison operators (planning) ↔ auth.users (terrain)
-- + RLS mise à jour + RPC prendre_en_charge_intervention
-- =============================================================

-- 1. Ajouter user_id sur operators
ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_operators_user_id
  ON public.operators(user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON COLUMN public.operators.user_id IS
  'Lien vers le compte auth.users du technicien terrain. Permet à l''opérateur de voir ses interventions planifiées.';

-- 2. Lier l'opérateur de test à son compte auth
UPDATE public.operators
  SET user_id = '8d2dae00-8277-45e8-a341-e0943a9f02d4'
  WHERE id = 'adfda534-67a2-4f0f-847a-425d7da4d4bf';

-- 3. Mettre à jour les RLS interventions
DROP POLICY IF EXISTS "interventions_operateur_select" ON public.interventions;
DROP POLICY IF EXISTS "interventions_operateur_insert" ON public.interventions;
DROP POLICY IF EXISTS "interventions_operateur_update" ON public.interventions;

CREATE POLICY "interventions_operateur_select"
ON public.interventions FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'operateur'::app_role)
  AND (
    operateur_id = auth.uid()
    OR operator_id IN (
      SELECT id FROM public.operators WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "interventions_operateur_insert"
ON public.interventions FOR INSERT TO authenticated
WITH CHECK (
  operateur_id = auth.uid()
  AND public.has_role(auth.uid(), 'operateur'::app_role)
  AND statut = 'en_cours'
);

CREATE POLICY "interventions_operateur_update"
ON public.interventions FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'operateur'::app_role)
  AND (
    operateur_id = auth.uid()
    OR operator_id IN (
      SELECT id FROM public.operators WHERE user_id = auth.uid()
    )
  )
  AND statut IN ('planifiee', 'en_cours', 'en_revision')
)
WITH CHECK (
  public.has_role(auth.uid(), 'operateur'::app_role)
  AND statut IN ('planifiee', 'en_cours', 'en_revision')
);

-- 4. Mettre à jour RLS intervention_photos
DROP POLICY IF EXISTS "intervention_photos_operateur_select" ON public.intervention_photos;
DROP POLICY IF EXISTS "intervention_photos_operateur_insert" ON public.intervention_photos;
DROP POLICY IF EXISTS "intervention_photos_operateur_delete" ON public.intervention_photos;

CREATE POLICY "intervention_photos_operateur_select"
ON public.intervention_photos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'operateur'::app_role)
  AND intervention_id IN (
    SELECT id FROM public.interventions
    WHERE operateur_id = auth.uid()
       OR operator_id IN (SELECT id FROM public.operators WHERE user_id = auth.uid())
  )
);

CREATE POLICY "intervention_photos_operateur_insert"
ON public.intervention_photos FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'operateur'::app_role)
  AND intervention_id IN (
    SELECT id FROM public.interventions
    WHERE (
      operateur_id = auth.uid()
      OR operator_id IN (SELECT id FROM public.operators WHERE user_id = auth.uid())
    )
    AND statut = 'en_cours'
  )
);

CREATE POLICY "intervention_photos_operateur_delete"
ON public.intervention_photos FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'operateur'::app_role)
  AND intervention_id IN (
    SELECT id FROM public.interventions
    WHERE (
      operateur_id = auth.uid()
      OR operator_id IN (SELECT id FROM public.operators WHERE user_id = auth.uid())
    )
    AND statut = 'en_cours'
  )
);

-- 5. Mettre à jour les storage policies (bucket interventions)
DROP POLICY IF EXISTS "interventions_storage_operateur_insert" ON storage.objects;
DROP POLICY IF EXISTS "interventions_storage_operateur_select" ON storage.objects;

CREATE POLICY "interventions_storage_operateur_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'interventions'
  AND EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id::text = (storage.foldername(name))[1]
      AND (i.operateur_id = auth.uid()
           OR i.operator_id IN (SELECT id FROM public.operators WHERE user_id = auth.uid()))
      AND i.statut = 'en_cours'
  )
);

CREATE POLICY "interventions_storage_operateur_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'interventions'
  AND EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id::text = (storage.foldername(name))[1]
      AND (i.operateur_id = auth.uid()
           OR i.operator_id IN (SELECT id FROM public.operators WHERE user_id = auth.uid()))
  )
);

-- 6. RPC prendre_en_charge_intervention
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
