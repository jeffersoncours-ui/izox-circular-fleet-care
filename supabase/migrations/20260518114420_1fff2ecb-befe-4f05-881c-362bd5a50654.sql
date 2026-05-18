-- ============================================================================
-- c.7.3 — Soft-delete entreprises + nettoyage pré-c.7.2
-- ============================================================================

-- 1.1 — Colonnes soft-delete sur entreprises
ALTER TABLE public.entreprises
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS archived_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_entreprises_archived_at
  ON public.entreprises(archived_at)
  WHERE archived_at IS NULL;

COMMENT ON COLUMN public.entreprises.archived_at IS
'Soft-delete timestamp. NULL = entreprise active visible UI. NOT NULL = entreprise archivée invisible UI mais données conservées pour audit et obligations comptables (Code de commerce L123-22, 10 ans).';
COMMENT ON COLUMN public.entreprises.archived_by IS
'Profile admin/staff qui a archivé l''entreprise.';
COMMENT ON COLUMN public.entreprises.archived_reason IS
'Justification d''archivage (résiliation, demande client, erreur de saisie, etc.). Pour audit CSRD.';

-- 1.2 — Fonction archiver_entreprise
CREATE OR REPLACE FUNCTION public.archiver_entreprise(
  p_entreprise_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_is_staff BOOLEAN;
  v_entreprise_nom TEXT;
  v_contrats_actifs INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  v_is_admin := public.has_role(v_user_id, 'admin'::app_role);
  v_is_staff := public.has_role(v_user_id, 'staff'::app_role);

  IF NOT (v_is_admin OR v_is_staff) THEN
    RAISE EXCEPTION 'Permission refusée. Seuls admin et staff peuvent archiver une entreprise.';
  END IF;

  SELECT nom INTO v_entreprise_nom
  FROM public.entreprises
  WHERE id = p_entreprise_id AND archived_at IS NULL;

  IF v_entreprise_nom IS NULL THEN
    RAISE EXCEPTION 'Entreprise introuvable ou déjà archivée: %', p_entreprise_id;
  END IF;

  SELECT COUNT(*) INTO v_contrats_actifs
  FROM public.contrats
  WHERE entreprise_id = p_entreprise_id
    AND statut IN ('actif', 'en_attente_validation');

  IF v_contrats_actifs > 0 THEN
    RAISE EXCEPTION 'Impossible d''archiver: % contrat(s) actif(s) sur cette entreprise. Résilier d''abord les contrats.', v_contrats_actifs;
  END IF;

  UPDATE public.entreprises
  SET archived_at = NOW(),
      archived_by = v_user_id,
      archived_reason = p_reason
  WHERE id = p_entreprise_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (
    v_user_id,
    'archivage_entreprise',
    jsonb_build_object(
      'entreprise_id', p_entreprise_id,
      'entreprise_nom', v_entreprise_nom,
      'reason', p_reason
    ),
    1
  );

  RETURN json_build_object(
    'success', true,
    'entreprise_id', p_entreprise_id,
    'entreprise_nom', v_entreprise_nom,
    'archived_at', NOW(),
    'archived_by', v_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.archiver_entreprise(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.archiver_entreprise IS
'Soft-delete d''une entreprise. Conserve toutes les données pour audit comptable (10 ans). Refuse si contrats actifs présents. Loggue dans admin_actions_log.';

-- 1.3 — Fonction desarchiver_entreprise
CREATE OR REPLACE FUNCTION public.desarchiver_entreprise(
  p_entreprise_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_entreprise_nom TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  v_is_admin := public.has_role(v_user_id, 'admin'::app_role);
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Permission refusée. Seul admin peut désarchiver.';
  END IF;

  SELECT nom INTO v_entreprise_nom
  FROM public.entreprises
  WHERE id = p_entreprise_id AND archived_at IS NOT NULL;

  IF v_entreprise_nom IS NULL THEN
    RAISE EXCEPTION 'Entreprise introuvable ou non archivée';
  END IF;

  UPDATE public.entreprises
  SET archived_at = NULL,
      archived_by = NULL,
      archived_reason = NULL
  WHERE id = p_entreprise_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (
    v_user_id,
    'desarchivage_entreprise',
    jsonb_build_object(
      'entreprise_id', p_entreprise_id,
      'entreprise_nom', v_entreprise_nom
    ),
    1
  );

  RETURN json_build_object(
    'success', true,
    'entreprise_id', p_entreprise_id,
    'entreprise_nom', v_entreprise_nom
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.desarchiver_entreprise(UUID) TO authenticated;

COMMENT ON FUNCTION public.desarchiver_entreprise IS
'Réactive une entreprise précédemment archivée. Réservé admin uniquement.';

-- 1.4 — Vue entreprises actives
CREATE OR REPLACE VIEW public.v_entreprises_actives AS
SELECT *
FROM public.entreprises
WHERE archived_at IS NULL;

GRANT SELECT ON public.v_entreprises_actives TO authenticated;

COMMENT ON VIEW public.v_entreprises_actives IS
'Vue filtrée des entreprises non archivées. Source unique de vérité pour dashboard et listes UI admin.';

-- 1.5 — Nettoyage one-shot : véhicules orphelins
DELETE FROM public.vehicules
WHERE contrat_id IS NULL;

INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
VALUES (
  NULL,
  'nettoyage_systeme_c73_vehicules_orphelins',
  jsonb_build_object(
    'description', 'Suppression one-shot véhicules orphelins (contrat_id IS NULL)',
    'execution_date', NOW()
  ),
  0
);

-- 1.6 — Nettoyage one-shot : 3 entreprises fantômes test/dev
DELETE FROM public.entreprises
WHERE nom IN ('Transport Durand', 'VTC Express', 'Jefferson Jouenne');

INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
VALUES (
  NULL,
  'purge_systeme_c73_entreprises_fantomes',
  jsonb_build_object(
    'description', 'Purge one-shot 3 entreprises fantômes pré-c.7.2',
    'entreprises_supprimees', ARRAY['Transport Durand', 'VTC Express', 'Jefferson Jouenne'],
    'execution_date', NOW()
  ),
  3
);