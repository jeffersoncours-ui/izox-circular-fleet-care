
-- ============================================================
-- c.8 — Validation/rejet véhicule + commercial mixte + remise
-- ============================================================

-- 1. Colonnes auteur sur vehicules
ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_vehicules_updated_at ON public.vehicules;
CREATE TRIGGER trg_vehicules_updated_at
  BEFORE UPDATE ON public.vehicules
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2. Table rattachement multi-commerciaux
CREATE TABLE IF NOT EXISTS public.entreprise_acces_commerciaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  commercial_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_reason TEXT,
  UNIQUE(entreprise_id, commercial_id)
);

CREATE INDEX IF NOT EXISTS idx_eac_commercial ON public.entreprise_acces_commerciaux(commercial_id);
CREATE INDEX IF NOT EXISTS idx_eac_entreprise ON public.entreprise_acces_commerciaux(entreprise_id);

ALTER TABLE public.entreprise_acces_commerciaux ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eac_admin_staff_all" ON public.entreprise_acces_commerciaux;
CREATE POLICY "eac_admin_staff_all" ON public.entreprise_acces_commerciaux
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'staff'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'staff'::app_role));

DROP POLICY IF EXISTS "eac_commercial_select_own" ON public.entreprise_acces_commerciaux;
CREATE POLICY "eac_commercial_select_own" ON public.entreprise_acces_commerciaux
  FOR SELECT TO authenticated
  USING (commercial_id = auth.uid());

-- 3. RLS commercial inclusif
DROP POLICY IF EXISTS contrats_commercial_select ON public.contrats;
CREATE POLICY contrats_commercial_select ON public.contrats
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'commercial'::app_role)
    AND (
      entreprise_id IN (SELECT id FROM public.entreprises WHERE commercial_id = auth.uid())
      OR entreprise_id IN (SELECT entreprise_id FROM public.entreprise_acces_commerciaux WHERE commercial_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS vehicules_commercial_select ON public.vehicules;
CREATE POLICY vehicules_commercial_select ON public.vehicules
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'commercial'::app_role)
    AND (
      entreprise_id IN (SELECT id FROM public.entreprises WHERE commercial_id = auth.uid())
      OR entreprise_id IN (SELECT entreprise_id FROM public.entreprise_acces_commerciaux WHERE commercial_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS entreprises_commercial_select ON public.entreprises;
CREATE POLICY entreprises_commercial_select ON public.entreprises
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'commercial'::app_role)
    AND (
      commercial_id = auth.uid()
      OR id IN (SELECT entreprise_id FROM public.entreprise_acces_commerciaux WHERE commercial_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS contrat_lignes_commercial_select ON public.contrat_lignes;
CREATE POLICY contrat_lignes_commercial_select ON public.contrat_lignes
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'commercial'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.contrats c
      WHERE c.id = contrat_lignes.contrat_id
        AND (
          c.entreprise_id IN (SELECT id FROM public.entreprises WHERE commercial_id = auth.uid())
          OR c.entreprise_id IN (SELECT entreprise_id FROM public.entreprise_acces_commerciaux WHERE commercial_id = auth.uid())
        )
    )
  );

-- 4. Patch ajouter_vehicule — enregistrer created_by
CREATE OR REPLACE FUNCTION public.ajouter_vehicule(p_entreprise_id uuid, p_type_vehicule text, p_immatriculation text, p_pack text, p_marque text DEFAULT NULL::text, p_modele text DEFAULT NULL::text, p_annee integer DEFAULT NULL::integer, p_couleur text DEFAULT NULL::text, p_kilometrage integer DEFAULT NULL::integer, p_photo_path text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_is_staff BOOLEAN;
  v_role_initiateur TEXT;
  v_contrat_id UUID;
  v_contrat_existant_id UUID;
  v_contrat_resilie_id UUID;
  v_contrat_ligne_id UUID;
  v_vehicule_id UUID;
  v_statut_vehicule public.statut_vehicule;
  v_statut_contrat public.contrat_statut_enum;
  v_nb_vehicules_actifs INTEGER := 0;
  v_palier TEXT;
  v_remise NUMERIC;
  v_remise_commerciale NUMERIC;
  v_prix_pack NUMERIC;
  v_numero_contrat TEXT;
  v_montant_brut NUMERIC := 0;
  v_montant_net NUMERIC := 0;
  v_facteur_palier NUMERIC;
  v_facteur_commercial NUMERIC;
  v_facteur_combine NUMERIC;
  v_entreprise_nom TEXT;
  v_contrat_cree BOOLEAN := FALSE;
  v_contrat_reactive BOOLEAN := FALSE;
  v_immat TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Utilisateur non authentifié'; END IF;

  v_is_admin := public.has_role(v_user_id, 'admin'::app_role);
  v_is_staff := public.has_role(v_user_id, 'staff'::app_role);

  IF v_is_admin THEN v_role_initiateur := 'admin';
  ELSIF v_is_staff THEN v_role_initiateur := 'staff';
  ELSIF public.has_role(v_user_id, 'commercial'::app_role) THEN v_role_initiateur := 'commercial';
  ELSE v_role_initiateur := 'client';
  END IF;

  IF p_pack NOT IN ('pack_interieur', 'pack_standard', 'pack_vtc') THEN
    RAISE EXCEPTION 'Pack invalide: %', p_pack;
  END IF;

  SELECT prix_ht INTO v_prix_pack FROM public.prestations_catalogue WHERE code = p_pack;
  IF v_prix_pack IS NULL THEN RAISE EXCEPTION 'Prix catalogue introuvable: %', p_pack; END IF;

  SELECT nom INTO v_entreprise_nom FROM public.entreprises WHERE id = p_entreprise_id;
  IF v_entreprise_nom IS NULL THEN RAISE EXCEPTION 'Entreprise introuvable: %', p_entreprise_id; END IF;

  IF v_is_admin OR v_is_staff THEN
    v_statut_vehicule := 'actif'; v_statut_contrat := 'actif';
  ELSE
    v_statut_vehicule := 'en_attente_validation'; v_statut_contrat := 'en_attente_validation';
  END IF;

  PERFORM 1 FROM public.entreprises WHERE id = p_entreprise_id FOR UPDATE;

  IF v_is_admin OR v_is_staff THEN
    SELECT id INTO v_contrat_resilie_id
    FROM public.contrats
    WHERE entreprise_id = p_entreprise_id AND statut = 'resilie'
    ORDER BY date_resiliation DESC NULLS LAST, created_at DESC
    LIMIT 1 FOR UPDATE;

    IF v_contrat_resilie_id IS NOT NULL THEN
      UPDATE public.contrats
      SET statut = 'actif', date_resiliation = NULL, updated_at = NOW()
      WHERE id = v_contrat_resilie_id;
      v_contrat_existant_id := v_contrat_resilie_id;
      v_contrat_reactive := TRUE;
    END IF;
  END IF;

  IF v_contrat_existant_id IS NULL THEN
    SELECT id INTO v_contrat_existant_id
    FROM public.contrats
    WHERE entreprise_id = p_entreprise_id
      AND statut IN ('actif', 'en_attente_validation')
    LIMIT 1;
  END IF;

  IF v_contrat_existant_id IS NOT NULL THEN
    v_contrat_id := v_contrat_existant_id;
    v_contrat_cree := FALSE;
  ELSE
    v_numero_contrat := public.generer_numero_contrat();
    INSERT INTO public.contrats (entreprise_id, numero_contrat, statut, date_debut)
    VALUES (p_entreprise_id, v_numero_contrat, v_statut_contrat, CURRENT_DATE)
    RETURNING id INTO v_contrat_id;
    v_contrat_cree := TRUE;
  END IF;

  v_immat := UPPER(TRIM(p_immatriculation));

  INSERT INTO public.vehicules (
    entreprise_id, contrat_id, type_vehicule, immatriculation,
    marque, modele, annee, couleur, kilometrage, photo_path, notes,
    type_pack_souhaite, statut, created_by
  ) VALUES (
    p_entreprise_id, v_contrat_id, p_type_vehicule::type_vehicule, v_immat,
    p_marque, p_modele, p_annee, p_couleur, p_kilometrage, p_photo_path, p_notes,
    p_pack, v_statut_vehicule, v_user_id
  ) RETURNING id INTO v_vehicule_id;

  IF v_statut_vehicule = 'actif' THEN
    SELECT id INTO v_contrat_ligne_id
    FROM public.contrat_lignes
    WHERE contrat_id = v_contrat_id AND type_pack = p_pack AND statut_ligne = 'actif'
    LIMIT 1 FOR UPDATE;

    IF v_contrat_ligne_id IS NOT NULL THEN
      UPDATE public.contrat_lignes SET nb_vehicules = nb_vehicules + 1
      WHERE id = v_contrat_ligne_id;
    ELSE
      INSERT INTO public.contrat_lignes (contrat_id, type_pack, nb_vehicules, prix_unitaire_ht, statut_ligne)
      VALUES (v_contrat_id, p_pack, 1, v_prix_pack, 'actif')
      RETURNING id INTO v_contrat_ligne_id;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_nb_vehicules_actifs
  FROM public.vehicules WHERE contrat_id = v_contrat_id AND statut = 'actif';

  SELECT palier, remise_pct INTO v_palier, v_remise
  FROM public.calculer_palier_remise(v_nb_vehicules_actifs);

  SELECT COALESCE(SUM(cl.nb_vehicules * cl.prix_unitaire_ht), 0) INTO v_montant_brut
  FROM public.contrat_lignes cl
  WHERE cl.contrat_id = v_contrat_id AND cl.statut_ligne = 'actif';

  SELECT COALESCE(remise_commerciale_pct, 0) INTO v_remise_commerciale
  FROM public.contrats WHERE id = v_contrat_id;

  v_facteur_palier := 1 - COALESCE(v_remise, 0);
  v_facteur_commercial := 1 - COALESCE(v_remise_commerciale, 0);
  v_facteur_combine := GREATEST(0.70, v_facteur_palier * v_facteur_commercial);
  v_montant_net := ROUND(v_montant_brut * v_facteur_combine, 2);

  UPDATE public.contrats
  SET palier = v_palier,
      remise_pct = COALESCE(v_remise, 0),
      montant_brut_mensuel = v_montant_brut,
      montant_net_mensuel = v_montant_net,
      nb_vehicules_actifs = v_nb_vehicules_actifs,
      updated_at = NOW()
  WHERE id = v_contrat_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (
    v_user_id,
    CASE WHEN v_contrat_reactive THEN 'reactivation_contrat_via_ajout_vehicule' ELSE 'ajout_vehicule' END,
    jsonb_build_object(
      'entreprise_id', p_entreprise_id, 'entreprise_nom', v_entreprise_nom,
      'vehicule_id', v_vehicule_id, 'immatriculation', v_immat,
      'contrat_id', v_contrat_id, 'contrat_cree', v_contrat_cree,
      'contrat_reactive', v_contrat_reactive,
      'numero_contrat', COALESCE(v_numero_contrat, (SELECT numero_contrat FROM public.contrats WHERE id = v_contrat_id)),
      'pack', p_pack,
      'statut_vehicule', v_statut_vehicule::text,
      'statut_contrat', v_statut_contrat::text,
      'role_initiateur', v_role_initiateur,
      'palier', v_palier,
      'nb_vehicules_actifs', v_nb_vehicules_actifs,
      'montant_brut_mensuel', v_montant_brut,
      'montant_net_mensuel', v_montant_net,
      'remise_palier_pct', v_remise,
      'remise_commerciale_pct', v_remise_commerciale
    ),
    1
  );

  RETURN jsonb_build_object(
    'success', true,
    'vehicule_id', v_vehicule_id,
    'contrat_id', v_contrat_id,
    'contrat_ligne_id', v_contrat_ligne_id,
    'contrat_cree', v_contrat_cree,
    'contrat_reactive', v_contrat_reactive,
    'statut_vehicule', v_statut_vehicule::text,
    'statut_contrat', v_statut_contrat::text,
    'palier', v_palier,
    'remise_pct', v_remise,
    'remise_commerciale_pct', v_remise_commerciale,
    'nb_vehicules_actifs', v_nb_vehicules_actifs,
    'montant_brut_mensuel', v_montant_brut,
    'montant_net_mensuel', v_montant_net,
    'numero_contrat', COALESCE(v_numero_contrat, (SELECT numero_contrat FROM public.contrats WHERE id = v_contrat_id))
  );
END;
$function$;

-- 5. valider_vehicule
CREATE OR REPLACE FUNCTION public.valider_vehicule(p_vehicule_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_is_staff BOOLEAN;
  v_v RECORD;
  v_entreprise_id UUID;
  v_entreprise_nom TEXT;
  v_contrat_id UUID;
  v_contrat_statut TEXT;
  v_commercial_sig UUID;
  v_nb INTEGER;
  v_palier TEXT;
  v_remise NUMERIC;
  v_remise_com NUMERIC;
  v_fp NUMERIC; v_fc NUMERIC; v_fk NUMERIC;
  v_brut NUMERIC; v_net NUMERIC;
  v_active BOOLEAN := FALSE;
  v_client_uid UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Utilisateur non authentifié'; END IF;
  v_is_admin := public.has_role(v_user_id,'admin'::app_role);
  v_is_staff := public.has_role(v_user_id,'staff'::app_role);

  SELECT v.*, c.statut::text AS c_statut, c.commercial_signataire_id, e.nom AS e_nom
  INTO v_v
  FROM public.vehicules v
  JOIN public.contrats c ON c.id = v.contrat_id
  JOIN public.entreprises e ON e.id = v.entreprise_id
  WHERE v.id = p_vehicule_id;

  IF v_v IS NULL THEN RAISE EXCEPTION 'Véhicule introuvable: %', p_vehicule_id; END IF;
  IF v_v.statut::text <> 'en_attente_validation' THEN
    RAISE EXCEPTION 'Véhicule pas en attente (statut: %)', v_v.statut;
  END IF;

  v_entreprise_id := v_v.entreprise_id;
  v_entreprise_nom := v_v.e_nom;
  v_contrat_id := v_v.contrat_id;
  v_contrat_statut := v_v.c_statut;
  v_commercial_sig := v_v.commercial_signataire_id;

  IF NOT (v_is_admin OR v_is_staff OR v_user_id = v_commercial_sig) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  PERFORM 1 FROM public.entreprises WHERE id = v_entreprise_id FOR UPDATE;

  UPDATE public.vehicules SET statut = 'actif', updated_at = NOW() WHERE id = p_vehicule_id;

  IF v_contrat_statut = 'en_attente_validation' THEN
    UPDATE public.contrats SET statut = 'actif', updated_at = NOW() WHERE id = v_contrat_id;
    v_active := TRUE;
  END IF;

  -- Ligne contrat : créer/incrémenter
  IF v_v.type_pack_souhaite IS NOT NULL THEN
    INSERT INTO public.contrat_lignes (contrat_id, type_pack, nb_vehicules, prix_unitaire_ht, statut_ligne)
    SELECT v_contrat_id, v_v.type_pack_souhaite, 1,
      (SELECT prix_ht FROM public.prestations_catalogue WHERE code = v_v.type_pack_souhaite), 'actif'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.contrat_lignes
      WHERE contrat_id = v_contrat_id AND type_pack = v_v.type_pack_souhaite AND statut_ligne='actif'
    );

    UPDATE public.contrat_lignes
    SET nb_vehicules = nb_vehicules
    WHERE contrat_id = v_contrat_id AND type_pack = v_v.type_pack_souhaite AND statut_ligne='actif';
  END IF;

  -- Recalcul
  SELECT COUNT(*) INTO v_nb FROM public.vehicules WHERE contrat_id = v_contrat_id AND statut='actif';
  SELECT palier, remise_pct INTO v_palier, v_remise FROM public.calculer_palier_remise(v_nb);

  -- Recalcul nb_vehicules par ligne en fonction du compte réel
  UPDATE public.contrat_lignes cl SET nb_vehicules = sub.cnt
  FROM (SELECT type_pack_souhaite AS tp, COUNT(*) AS cnt FROM public.vehicules
        WHERE contrat_id = v_contrat_id AND statut='actif' GROUP BY type_pack_souhaite) sub
  WHERE cl.contrat_id = v_contrat_id AND cl.type_pack = sub.tp AND cl.statut_ligne='actif';

  SELECT COALESCE(SUM(nb_vehicules * prix_unitaire_ht),0) INTO v_brut
  FROM public.contrat_lignes WHERE contrat_id = v_contrat_id AND statut_ligne='actif';

  SELECT COALESCE(remise_commerciale_pct,0) INTO v_remise_com FROM public.contrats WHERE id = v_contrat_id;
  v_fp := 1 - COALESCE(v_remise,0);
  v_fc := 1 - COALESCE(v_remise_com,0);
  v_fk := GREATEST(0.70, v_fp * v_fc);
  v_net := ROUND(v_brut * v_fk, 2);

  UPDATE public.contrats
  SET palier=v_palier, remise_pct=COALESCE(v_remise,0),
      nb_vehicules_actifs=v_nb, montant_brut_mensuel=v_brut, montant_net_mensuel=v_net,
      updated_at=NOW()
  WHERE id = v_contrat_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_user_id, 'validation_vehicule',
    jsonb_build_object(
      'vehicule_id', p_vehicule_id, 'contrat_id', v_contrat_id,
      'entreprise_id', v_entreprise_id, 'entreprise_nom', v_entreprise_nom,
      'immatriculation', v_v.immatriculation, 'contrat_active_via_validation', v_active,
      'palier', v_palier, 'nb_vehicules_actifs', v_nb, 'montant_net_mensuel', v_net
    ), 1);

  -- Notif client
  SELECT p.id INTO v_client_uid
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.entreprise_id = v_entreprise_id AND ur.role = 'client'
  LIMIT 1;

  IF v_client_uid IS NOT NULL THEN
    INSERT INTO public.notifications_internes (user_id, source_action, titre, severite, link_url, details, statut)
    VALUES (v_client_uid, 'validation_vehicule',
      'Véhicule validé — ' || v_v.immatriculation, 'info',
      '/client/flotte/' || p_vehicule_id::text,
      jsonb_build_object('vehicule_id', p_vehicule_id,
        'message', 'Votre véhicule ' || v_v.immatriculation || ' a été validé.'),
      'non_lu'::notification_statut_enum);
  END IF;

  -- Notif équipe (sauf auteur)
  INSERT INTO public.notifications_internes (user_id, source_action, titre, severite, link_url, details, statut)
  SELECT DISTINCT ur.user_id, 'validation_vehicule',
    'Véhicule validé — ' || v_entreprise_nom, 'info',
    '/admin/clients/' || v_entreprise_id::text,
    jsonb_build_object('vehicule_id', p_vehicule_id, 'immatriculation', v_v.immatriculation),
    'non_lu'::notification_statut_enum
  FROM public.user_roles ur
  WHERE ur.role IN ('admin'::app_role,'staff'::app_role) AND ur.user_id <> v_user_id;

  IF v_commercial_sig IS NOT NULL AND v_commercial_sig <> v_user_id THEN
    INSERT INTO public.notifications_internes (user_id, source_action, titre, severite, link_url, details, statut)
    VALUES (v_commercial_sig, 'validation_vehicule',
      'Véhicule validé — ' || v_entreprise_nom, 'info',
      '/admin/clients/' || v_entreprise_id::text,
      jsonb_build_object('vehicule_id', p_vehicule_id, 'immatriculation', v_v.immatriculation),
      'non_lu'::notification_statut_enum);
  END IF;

  RETURN json_build_object('success', true, 'vehicule_id', p_vehicule_id,
    'contrat_id', v_contrat_id, 'contrat_active_via_validation', v_active,
    'palier', v_palier, 'nb_vehicules_actifs', v_nb,
    'montant_brut_mensuel', v_brut, 'montant_net_mensuel', v_net);
END;
$$;

GRANT EXECUTE ON FUNCTION public.valider_vehicule(UUID) TO authenticated;

-- 6. rejeter_vehicule
CREATE OR REPLACE FUNCTION public.rejeter_vehicule(p_vehicule_id UUID, p_raison TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_is_staff BOOLEAN;
  v_v RECORD;
  v_createur_role TEXT;
  v_commercial_sig UUID;
  v_entreprise_id UUID;
  v_entreprise_nom TEXT;
  v_client_uid UUID;
  v_supp JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Utilisateur non authentifié'; END IF;
  v_is_admin := public.has_role(v_user_id,'admin'::app_role);
  v_is_staff := public.has_role(v_user_id,'staff'::app_role);

  IF p_raison IS NULL OR LENGTH(TRIM(p_raison)) < 5 THEN
    RAISE EXCEPTION 'Raison de rejet obligatoire (min 5 caractères)';
  END IF;

  SELECT v.*, c.commercial_signataire_id, e.nom AS e_nom,
    (SELECT role::text FROM public.user_roles WHERE user_id = v.created_by LIMIT 1) AS createur_role
  INTO v_v
  FROM public.vehicules v
  JOIN public.contrats c ON c.id = v.contrat_id
  JOIN public.entreprises e ON e.id = v.entreprise_id
  WHERE v.id = p_vehicule_id;

  IF v_v IS NULL THEN RAISE EXCEPTION 'Véhicule introuvable'; END IF;
  IF v_v.statut::text <> 'en_attente_validation' THEN
    RAISE EXCEPTION 'Seul un véhicule en_attente_validation peut être rejeté';
  END IF;

  v_createur_role := v_v.createur_role;
  v_commercial_sig := v_v.commercial_signataire_id;
  v_entreprise_id := v_v.entreprise_id;
  v_entreprise_nom := v_v.e_nom;

  IF v_createur_role IS DISTINCT FROM 'client' THEN
    RAISE EXCEPTION 'Le rejet n''est possible que pour les véhicules ajoutés par un client. Utiliser supprimer_vehicule().';
  END IF;

  IF NOT (v_is_admin OR v_is_staff OR v_user_id = v_commercial_sig) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_user_id, 'rejet_vehicule',
    jsonb_build_object(
      'vehicule_id', p_vehicule_id, 'contrat_id', v_v.contrat_id,
      'entreprise_id', v_entreprise_id, 'entreprise_nom', v_entreprise_nom,
      'immatriculation', v_v.immatriculation,
      'raison_rejet', p_raison, 'createur_role', v_createur_role
    ), 1);

  -- Notif client AVANT suppression
  SELECT p.id INTO v_client_uid
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.entreprise_id = v_entreprise_id AND ur.role = 'client'
  LIMIT 1;

  IF v_client_uid IS NOT NULL THEN
    INSERT INTO public.notifications_internes (user_id, source_action, titre, severite, link_url, details, statut, action_requise)
    VALUES (v_client_uid, 'rejet_vehicule',
      'Demande véhicule refusée — ' || v_v.immatriculation, 'warning',
      '/client/flotte',
      jsonb_build_object('raison', p_raison, 'immatriculation', v_v.immatriculation),
      'non_lu'::notification_statut_enum, true);
  END IF;

  -- Suppression cascade
  v_supp := public.supprimer_vehicule(p_vehicule_id, FALSE);

  RETURN json_build_object('success', true, 'vehicule_id', p_vehicule_id,
    'raison_rejet', p_raison, 'suppression', v_supp);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rejeter_vehicule(UUID, TEXT) TO authenticated;

-- 7. appliquer_remise_commerciale
CREATE OR REPLACE FUNCTION public.appliquer_remise_commerciale(p_contrat_id UUID, p_remise_pct NUMERIC, p_justification TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_is_staff BOOLEAN;
  v_c RECORD;
  v_brut NUMERIC; v_net NUMERIC;
  v_fp NUMERIC; v_fc NUMERIC; v_fk NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Utilisateur non authentifié'; END IF;
  v_is_admin := public.has_role(v_user_id,'admin'::app_role);
  v_is_staff := public.has_role(v_user_id,'staff'::app_role);

  IF p_remise_pct < 0 OR p_remise_pct > 0.20 THEN
    RAISE EXCEPTION 'Remise commerciale doit être entre 0 et 20%% (reçu: %)', p_remise_pct;
  END IF;
  IF p_remise_pct > 0 AND (p_justification IS NULL OR LENGTH(TRIM(p_justification)) < 10) THEN
    RAISE EXCEPTION 'Justification obligatoire (min 10 caractères)';
  END IF;

  SELECT * INTO v_c FROM public.contrats WHERE id = p_contrat_id;
  IF v_c IS NULL THEN RAISE EXCEPTION 'Contrat introuvable'; END IF;

  IF NOT (v_is_admin OR v_is_staff OR v_user_id = v_c.commercial_signataire_id) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  v_brut := COALESCE(v_c.montant_brut_mensuel, 0);
  v_fp := 1 - COALESCE(v_c.remise_pct, 0);
  v_fc := 1 - p_remise_pct;
  v_fk := GREATEST(0.70, v_fp * v_fc);
  v_net := ROUND(v_brut * v_fk, 2);

  UPDATE public.contrats
  SET remise_commerciale_pct = p_remise_pct,
      remise_commerciale_justification = NULLIF(TRIM(p_justification),''),
      remise_commerciale_auteur_id = v_user_id,
      remise_commerciale_date = NOW(),
      montant_net_mensuel = v_net,
      updated_at = NOW()
  WHERE id = p_contrat_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_user_id, 'application_remise_commerciale',
    jsonb_build_object('contrat_id', p_contrat_id, 'remise_pct', p_remise_pct,
      'justification', p_justification, 'montant_brut', v_brut,
      'montant_net_nouveau', v_net, 'facteur_combine', v_fk), 1);

  RETURN json_build_object('success', true, 'contrat_id', p_contrat_id,
    'remise_pct', p_remise_pct, 'montant_net_mensuel', v_net, 'facteur_combine', v_fk);
END;
$$;

GRANT EXECUTE ON FUNCTION public.appliquer_remise_commerciale(UUID, NUMERIC, TEXT) TO authenticated;

-- 8. reassigner_commercial (admin only)
CREATE OR REPLACE FUNCTION public.reassigner_commercial(p_entreprise_id UUID, p_nouveau_commercial_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id UUID;
  v_ancien UUID;
  v_nom TEXT;
  v_role_target app_role;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Utilisateur non authentifié'; END IF;
  IF NOT public.has_role(v_user_id,'admin'::app_role) THEN
    RAISE EXCEPTION 'Permission refusée : admin uniquement';
  END IF;

  SELECT role INTO v_role_target FROM public.user_roles WHERE user_id = p_nouveau_commercial_id LIMIT 1;
  IF v_role_target IS DISTINCT FROM 'commercial'::app_role THEN
    RAISE EXCEPTION 'Utilisateur cible n''est pas un commercial';
  END IF;

  SELECT commercial_id, nom INTO v_ancien, v_nom FROM public.entreprises WHERE id = p_entreprise_id;
  IF v_nom IS NULL THEN RAISE EXCEPTION 'Entreprise introuvable'; END IF;

  UPDATE public.entreprises SET commercial_id = p_nouveau_commercial_id WHERE id = p_entreprise_id;

  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (v_user_id, 'reassignation_commercial',
    jsonb_build_object('entreprise_id', p_entreprise_id, 'entreprise_nom', v_nom,
      'ancien_commercial_id', v_ancien, 'nouveau_commercial_id', p_nouveau_commercial_id), 1);

  RETURN json_build_object('success', true, 'entreprise_id', p_entreprise_id,
    'nouveau_commercial_id', p_nouveau_commercial_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reassigner_commercial(UUID, UUID) TO authenticated;

-- 9. Triggers auto-rattachement commerciaux
CREATE OR REPLACE FUNCTION public.auto_rattacher_commerciaux_before()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_uid UUID;
  v_role app_role;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = v_uid LIMIT 1;

  IF v_role = 'commercial'::app_role AND NEW.commercial_id IS NULL THEN
    NEW.commercial_id := v_uid;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_rattacher_commerciaux_after()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_uid UUID;
  v_role app_role;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = v_uid LIMIT 1;

  IF v_role = 'client'::app_role AND NEW.commercial_id IS NULL THEN
    INSERT INTO public.entreprise_acces_commerciaux (entreprise_id, commercial_id, granted_reason)
    SELECT NEW.id, ur.user_id, 'Auto-rattachement à l''auto-inscription client'
    FROM public.user_roles ur
    WHERE ur.role = 'commercial'::app_role
    ON CONFLICT (entreprise_id, commercial_id) DO NOTHING;

    INSERT INTO public.notifications_internes (user_id, source_action, titre, severite, link_url, details, statut)
    SELECT DISTINCT ur.user_id, 'auto_inscription_client',
      'Nouveau client auto-inscrit — ' || NEW.nom, 'info',
      '/admin/clients/' || NEW.id::text,
      jsonb_build_object('entreprise_id', NEW.id, 'nom', NEW.nom),
      'non_lu'::notification_statut_enum
    FROM public.user_roles ur
    WHERE ur.role IN ('admin'::app_role,'staff'::app_role,'commercial'::app_role)
      AND ur.user_id <> v_uid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_entreprises_auto_rattacher_before ON public.entreprises;
CREATE TRIGGER trg_entreprises_auto_rattacher_before
  BEFORE INSERT ON public.entreprises
  FOR EACH ROW EXECUTE FUNCTION public.auto_rattacher_commerciaux_before();

DROP TRIGGER IF EXISTS trg_entreprises_auto_rattacher_after ON public.entreprises;
CREATE TRIGGER trg_entreprises_auto_rattacher_after
  AFTER INSERT ON public.entreprises
  FOR EACH ROW EXECUTE FUNCTION public.auto_rattacher_commerciaux_after();
