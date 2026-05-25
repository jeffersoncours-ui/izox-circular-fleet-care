CREATE OR REPLACE FUNCTION public.lever_gel_anticipe(p_demande_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demande RECORD;
  v_user_id UUID := auth.uid();
  v_user_role TEXT;
  v_user_entreprise_id UUID;
  v_today DATE := CURRENT_DATE;
  v_jours_economises INTEGER;
  v_admin RECORD;
BEGIN
  SELECT role::text, entreprise_id INTO v_user_role, v_user_entreprise_id
  FROM public.profiles WHERE id = v_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  SELECT * INTO v_demande FROM public.demandes_gel WHERE id = p_demande_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande introuvable';
  END IF;

  IF v_user_role = 'client' AND v_demande.entreprise_id <> v_user_entreprise_id THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF v_demande.statut <> 'active' THEN
    RAISE EXCEPTION 'Seul un gel actif peut être levé (statut actuel : %)', v_demande.statut;
  END IF;

  UPDATE public.demandes_gel
  SET statut = 'close',
      date_fin_effective = v_today,
      updated_at = NOW()
  WHERE id = p_demande_id;

  IF v_demande.vehicule_ids IS NOT NULL AND array_length(v_demande.vehicule_ids, 1) > 0 THEN
    UPDATE public.vehicules
    SET statut = 'actif', updated_at = NOW()
    WHERE id = ANY(v_demande.vehicule_ids) AND statut = 'gele';
  ELSIF v_demande.contrat_id IS NOT NULL AND v_demande.type_demande = 'contrat' THEN
    UPDATE public.vehicules
    SET statut = 'actif', updated_at = NOW()
    WHERE contrat_id = v_demande.contrat_id AND statut = 'gele';
  END IF;

  v_jours_economises := GREATEST(0, (v_demande.date_fin_prevue - v_today));

  INSERT INTO public.admin_actions_log(user_id, action, details)
  VALUES (
    v_user_id,
    'gel_leve_anticipativement',
    jsonb_build_object(
      'demande_id', p_demande_id,
      'entreprise_id', v_demande.entreprise_id,
      'contrat_id', v_demande.contrat_id,
      'date_debut_initiale', v_demande.date_debut,
      'date_fin_prevue_initiale', v_demande.date_fin_prevue,
      'date_fin_effective', v_today,
      'jours_economises', v_jours_economises
    )
  );

  -- Notifier directement admin + staff (dispatcher = whitelist stricte)
  FOR v_admin IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'staff')
      AND ur.user_id <> COALESCE(v_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    INSERT INTO public.notifications_internes (
      user_id, source_action, titre, details, link_url, statut, action_requise, severite
    ) VALUES (
      v_admin.user_id,
      'gel_leve_anticipativement',
      'Gel levé anticipativement',
      jsonb_build_object(
        'demande_id', p_demande_id,
        'entreprise_id', v_demande.entreprise_id,
        'jours_economises', v_jours_economises
      ),
      '/admin/demandes-gel?statut=close',
      'non_lu',
      false,
      'info'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'statut_final', 'close',
    'date_fin_effective', v_today,
    'jours_economises', v_jours_economises
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.lever_gel_anticipe(UUID) TO authenticated;