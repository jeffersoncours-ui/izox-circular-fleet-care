-- ===========================================================================
-- Annulation de RDV — client (avec règle 48h) et admin (sans restriction)
-- Interventions liées marquées 'annulee' (conservées, exclues du quota)
-- ===========================================================================

-- 1. Colonnes de traçabilité de l'annulation
ALTER TABLE public.demandes_rdv
  ADD COLUMN IF NOT EXISTS annulation_motif TEXT,
  ADD COLUMN IF NOT EXISTS annule_par TEXT;

-- 2. Étendre les CHECK statut
ALTER TABLE public.demandes_rdv DROP CONSTRAINT IF EXISTS chk_demandes_rdv_statut;
ALTER TABLE public.demandes_rdv ADD CONSTRAINT chk_demandes_rdv_statut
  CHECK (statut = ANY (ARRAY['en_attente','confirmee','refusee','annulee_client','annulee_admin']::text[]));

ALTER TABLE public.interventions DROP CONSTRAINT IF EXISTS interventions_statut_check;
ALTER TABLE public.interventions ADD CONSTRAINT interventions_statut_check
  CHECK (statut = ANY (ARRAY['planifiee','en_cours','en_revision','validee','refusee','annulee']::text[]));

-- ============================================================
-- 3. annuler_rdv_client(p_demande_id, p_motif)
--    - motif obligatoire (≥ 5 car.)
--    - en_attente OU confirmee
--    - si confirmee : bloqué à moins de 48h (assigned_date <= CURRENT_DATE + 1)
--    - interventions liées 'planifiee' → 'annulee'
-- ============================================================
CREATE OR REPLACE FUNCTION public.annuler_rdv_client(p_demande_id UUID, p_motif TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_ent UUID;
  v_d   RECORD;
BEGIN
  SELECT entreprise_id INTO v_ent FROM profiles WHERE id = v_uid;
  IF v_ent IS NULL THEN RAISE EXCEPTION 'Utilisateur sans entreprise rattachée'; END IF;

  IF p_motif IS NULL OR length(trim(p_motif)) < 5 THEN
    RAISE EXCEPTION 'Le motif d''annulation est obligatoire (5 caractères minimum)';
  END IF;

  SELECT * INTO v_d FROM demandes_rdv WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  IF v_d.entreprise_id <> v_ent THEN RAISE EXCEPTION 'Permission refusée'; END IF;

  IF v_d.statut NOT IN ('en_attente','confirmee') THEN
    RAISE EXCEPTION 'Cette demande ne peut plus être annulée (statut: %)', v_d.statut;
  END IF;

  IF v_d.statut = 'confirmee' THEN
    IF v_d.assigned_date IS NOT NULL AND v_d.assigned_date <= (CURRENT_DATE + 1) THEN
      RAISE EXCEPTION 'Annulation impossible à moins de 48h du rendez-vous. Contactez IZOX.';
    END IF;
    -- Refuser si une intervention liée a déjà démarré
    IF EXISTS (
      SELECT 1 FROM interventions
      WHERE demande_rdv_id = p_demande_id
        AND statut IN ('en_cours','en_revision','validee')
    ) THEN
      RAISE EXCEPTION 'Une intervention est déjà en cours ou terminée. Contactez IZOX.';
    END IF;
  END IF;

  UPDATE demandes_rdv
  SET statut='annulee_client', annulation_motif=trim(p_motif), annule_par='client', updated_at=NOW()
  WHERE id = p_demande_id;

  UPDATE interventions SET statut='annulee', updated_at=NOW()
  WHERE demande_rdv_id = p_demande_id AND statut = 'planifiee';

  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'rdv_annule_par_client',
    jsonb_build_object('demande_id',p_demande_id,'entreprise_id',v_d.entreprise_id,'motif',trim(p_motif)), 1);

  INSERT INTO notifications_internes (user_id, source_action, titre, details, severite, link_url, statut, action_requise)
  SELECT DISTINCT ON (p.id) p.id, 'rdv_annule_par_client',
    'RDV annulé par le client',
    jsonb_build_object('demande_id',p_demande_id,'entreprise_id',v_d.entreprise_id,'motif',trim(p_motif)),
    'warning', '/admin/planning?demande='||p_demande_id::TEXT, 'non_lu', TRUE
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role IN ('admin','staff') AND p.id <> v_uid;

  RETURN json_build_object('success', true, 'demande_id', p_demande_id);
END;$$;
GRANT EXECUTE ON FUNCTION public.annuler_rdv_client(UUID, TEXT) TO authenticated;

-- ============================================================
-- 4. annuler_rdv_admin(p_demande_id, p_motif)
--    - admin/staff uniquement
--    - aucune restriction de délai
--    - interventions liées non validées → 'annulee'
-- ============================================================
CREATE OR REPLACE FUNCTION public.annuler_rdv_admin(p_demande_id UUID, p_motif TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_d   RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = v_uid AND role IN ('admin','staff')
  ) THEN
    RAISE EXCEPTION 'Permission refusée : action réservée à l''équipe IZOX';
  END IF;

  IF p_motif IS NULL OR length(trim(p_motif)) < 5 THEN
    RAISE EXCEPTION 'Le motif d''annulation est obligatoire (5 caractères minimum)';
  END IF;

  SELECT * INTO v_d FROM demandes_rdv WHERE id = p_demande_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;

  IF v_d.statut NOT IN ('en_attente','confirmee') THEN
    RAISE EXCEPTION 'Cette demande ne peut plus être annulée (statut: %)', v_d.statut;
  END IF;

  IF EXISTS (
    SELECT 1 FROM interventions
    WHERE demande_rdv_id = p_demande_id AND statut = 'validee'
  ) THEN
    RAISE EXCEPTION 'Une intervention est déjà validée (facturée). Annulation impossible.';
  END IF;

  UPDATE demandes_rdv
  SET statut='annulee_admin', annulation_motif=trim(p_motif), annule_par='admin', updated_at=NOW()
  WHERE id = p_demande_id;

  UPDATE interventions SET statut='annulee', updated_at=NOW()
  WHERE demande_rdv_id = p_demande_id AND statut IN ('planifiee','en_cours','en_revision');

  INSERT INTO admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_uid, 'rdv_annule_par_admin',
    jsonb_build_object('demande_id',p_demande_id,'entreprise_id',v_d.entreprise_id,'motif',trim(p_motif)), 1);

  RETURN json_build_object('success', true, 'demande_id', p_demande_id);
END;$$;
GRANT EXECUTE ON FUNCTION public.annuler_rdv_admin(UUID, TEXT) TO authenticated;
