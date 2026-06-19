
-- =========================================================
-- c.7 : Fonction ajouter_vehicule() unifiée + infra associée
-- =========================================================

-- 1. Extension des enums
ALTER TYPE public.contrat_statut_enum ADD VALUE IF NOT EXISTS 'en_attente_validation';
ALTER TYPE public.statut_vehicule ADD VALUE IF NOT EXISTS 'en_attente_validation';

-- 2. Colonnes cache d'affichage sur contrats (hybride)
ALTER TABLE public.contrats ADD COLUMN IF NOT EXISTS palier TEXT;
ALTER TABLE public.contrats ADD COLUMN IF NOT EXISTS montant_net_mensuel NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.contrats ADD COLUMN IF NOT EXISTS nb_vehicules_actifs INTEGER DEFAULT 0;

COMMENT ON COLUMN public.contrats.palier IS 'Cache UI du palier B2B (starter/pro/business/premium). Source de vérité comptable : recalcul dans generer_facture().';
COMMENT ON COLUMN public.contrats.montant_net_mensuel IS 'Cache UI du montant net mensuel HT (après remise palier). Calculé sur vehicules actifs * prix pack.';
COMMENT ON COLUMN public.contrats.nb_vehicules_actifs IS 'Cache UI du nombre de véhicules statut=actif rattachés au contrat.';

-- 3. Table de séquences contrats (numérotation monotone mensuelle)
CREATE TABLE IF NOT EXISTS public.contrat_sequences (
  annee_mois TEXT PRIMARY KEY,
  derniere_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.contrat_sequences IS 'Séquence monotone mensuelle pour numérotation contrats (CT-AAAAMM-NNNN). Ne recule jamais.';

ALTER TABLE public.contrat_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contrat_sequences_admin_staff_read" ON public.contrat_sequences;
CREATE POLICY "contrat_sequences_admin_staff_read"
  ON public.contrat_sequences FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- 4. Backfill des séquences à partir des contrats existants
INSERT INTO public.contrat_sequences (annee_mois, derniere_sequence)
SELECT
  SUBSTRING(numero_contrat FROM 4 FOR 6) AS annee_mois,
  MAX(CAST(SUBSTRING(numero_contrat FROM 11 FOR 4) AS INTEGER)) AS derniere_sequence
FROM public.contrats
WHERE numero_contrat ~ '^CT-[0-9]{6}-[0-9]{4}$'
GROUP BY SUBSTRING(numero_contrat FROM 4 FOR 6)
ON CONFLICT (annee_mois) DO UPDATE
SET derniere_sequence = GREATEST(public.contrat_sequences.derniere_sequence, EXCLUDED.derniere_sequence),
    updated_at = NOW();

-- 5. Génération d'un numéro contrat
CREATE OR REPLACE FUNCTION public.generer_numero_contrat()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_annee_mois TEXT;
  v_sequence INTEGER;
BEGIN
  v_annee_mois := TO_CHAR(NOW(), 'YYYYMM');

  INSERT INTO public.contrat_sequences (annee_mois, derniere_sequence)
  VALUES (v_annee_mois, 1)
  ON CONFLICT (annee_mois) DO UPDATE
    SET derniere_sequence = public.contrat_sequences.derniere_sequence + 1,
        updated_at = NOW()
  RETURNING derniere_sequence INTO v_sequence;

  RETURN 'CT-' || v_annee_mois || '-' || LPAD(v_sequence::TEXT, 4, '0');
END;
$$;

COMMENT ON FUNCTION public.generer_numero_contrat() IS 'Génère un numéro contrat CT-AAAAMM-NNNN atomique (UPSERT séquence).';

-- 6. Calcul palier / remise
CREATE OR REPLACE FUNCTION public.calculer_palier_remise(p_nb_vehicules INTEGER)
RETURNS TABLE(palier TEXT, remise_pct NUMERIC)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_nb_vehicules >= 11 THEN
    RETURN QUERY SELECT 'premium'::TEXT, 0.20::NUMERIC;
  ELSIF p_nb_vehicules >= 6 THEN
    RETURN QUERY SELECT 'business'::TEXT, 0.12::NUMERIC;
  ELSIF p_nb_vehicules >= 3 THEN
    RETURN QUERY SELECT 'pro'::TEXT, 0.05::NUMERIC;
  ELSE
    RETURN QUERY SELECT 'starter'::TEXT, 0.00::NUMERIC;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.calculer_palier_remise(INTEGER) IS 'Palier B2B (1-2 starter, 3-5 pro, 6-10 business, 11+ premium) et remise associée.';

-- 7. Fonction principale ajouter_vehicule()
CREATE OR REPLACE FUNCTION public.ajouter_vehicule(
  p_entreprise_id UUID,
  p_type_vehicule TEXT,
  p_immatriculation TEXT,
  p_pack TEXT,
  p_marque TEXT DEFAULT NULL,
  p_modele TEXT DEFAULT NULL,
  p_annee INTEGER DEFAULT NULL,
  p_couleur TEXT DEFAULT NULL,
  p_kilometrage INTEGER DEFAULT NULL,
  p_photo_path TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_is_staff BOOLEAN;
  v_role_initiateur TEXT;
  v_contrat_id UUID;
  v_contrat_existant_id UUID;
  v_vehicule_id UUID;
  v_statut_vehicule public.statut_vehicule;
  v_statut_contrat public.contrat_statut_enum;
  v_nb_vehicules_actifs INTEGER := 0;
  v_palier TEXT;
  v_remise NUMERIC;
  v_prix_pack NUMERIC;
  v_numero_contrat TEXT;
  v_montant_brut NUMERIC := 0;
  v_montant_net NUMERIC := 0;
  v_entreprise_nom TEXT;
  v_contrat_cree BOOLEAN := FALSE;
  v_immat TEXT;
BEGIN
  -- ÉTAPE 1 : authentification + rôle (via user_roles, jamais profiles.role)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  v_is_admin := public.has_role(v_user_id, 'admin'::app_role);
  v_is_staff := public.has_role(v_user_id, 'staff'::app_role);

  IF v_is_admin THEN
    v_role_initiateur := 'admin';
  ELSIF v_is_staff THEN
    v_role_initiateur := 'staff';
  ELSIF public.has_role(v_user_id, 'commercial'::app_role) THEN
    v_role_initiateur := 'commercial';
  ELSE
    v_role_initiateur := 'client';
  END IF;

  -- ÉTAPE 2 : validation pack
  IF p_pack NOT IN ('pack_interieur', 'pack_standard', 'pack_vtc') THEN
    RAISE EXCEPTION 'Pack invalide: %. Valeurs autorisées: pack_interieur, pack_standard, pack_vtc', p_pack;
  END IF;

  v_prix_pack := CASE p_pack
    WHEN 'pack_interieur' THEN 130
    WHEN 'pack_standard' THEN 170
    WHEN 'pack_vtc' THEN 240
  END;

  -- ÉTAPE 3 : entreprise existe
  SELECT nom INTO v_entreprise_nom
  FROM public.entreprises
  WHERE id = p_entreprise_id;

  IF v_entreprise_nom IS NULL THEN
    RAISE EXCEPTION 'Entreprise introuvable: %', p_entreprise_id;
  END IF;

  -- ÉTAPE 4 : statut selon rôle (Option B)
  IF v_is_admin OR v_is_staff THEN
    v_statut_vehicule := 'actif';
    v_statut_contrat := 'actif';
  ELSE
    v_statut_vehicule := 'en_attente_validation';
    v_statut_contrat := 'en_attente_validation';
  END IF;

  -- ÉTAPE 5 : LOCK PROXY anti-race-condition sur entreprises
  PERFORM 1 FROM public.entreprises WHERE id = p_entreprise_id FOR UPDATE;

  -- Cherche un contrat actif/en_attente
  SELECT id INTO v_contrat_existant_id
  FROM public.contrats
  WHERE entreprise_id = p_entreprise_id
    AND statut IN ('actif', 'en_attente_validation')
  LIMIT 1;

  -- ÉTAPE 6 : greffe ou création
  IF v_contrat_existant_id IS NOT NULL THEN
    v_contrat_id := v_contrat_existant_id;
    v_contrat_cree := FALSE;
  ELSE
    v_numero_contrat := public.generer_numero_contrat();

    INSERT INTO public.contrats (
      entreprise_id, numero_contrat, statut, date_debut
    ) VALUES (
      p_entreprise_id, v_numero_contrat, v_statut_contrat, CURRENT_DATE
    ) RETURNING id INTO v_contrat_id;

    v_contrat_cree := TRUE;
  END IF;

  v_immat := UPPER(TRIM(p_immatriculation));

  -- ÉTAPE 7 : insertion véhicule
  INSERT INTO public.vehicules (
    entreprise_id, contrat_id, type_vehicule, immatriculation,
    marque, modele, annee, couleur, kilometrage, photo_path, notes,
    type_pack_souhaite, statut
  ) VALUES (
    p_entreprise_id, v_contrat_id, p_type_vehicule::type_vehicule_enum, v_immat,
    p_marque, p_modele, p_annee, p_couleur, p_kilometrage, p_photo_path, p_notes,
    p_pack, v_statut_vehicule
  ) RETURNING id INTO v_vehicule_id;

  -- ÉTAPE 7 bis : upsert contrat_lignes UNIQUEMENT si véhicule actif
  IF v_statut_vehicule = 'actif' THEN
    UPDATE public.contrat_lignes
    SET nb_vehicules = nb_vehicules + 1
    WHERE contrat_id = v_contrat_id
      AND type_pack = p_pack
      AND statut_ligne = 'actif';

    IF NOT FOUND THEN
      INSERT INTO public.contrat_lignes (
        contrat_id, type_pack, nb_vehicules, prix_unitaire_ht, statut_ligne
      ) VALUES (
        v_contrat_id, p_pack, 1, v_prix_pack, 'actif'
      );
    END IF;
  END IF;

  -- ÉTAPE 8-10 : recalcul cache contrat
  SELECT COUNT(*) INTO v_nb_vehicules_actifs
  FROM public.vehicules
  WHERE contrat_id = v_contrat_id AND statut = 'actif';

  SELECT palier, remise_pct INTO v_palier, v_remise
  FROM public.calculer_palier_remise(v_nb_vehicules_actifs);

  SELECT COALESCE(SUM(
    CASE type_pack_souhaite
      WHEN 'pack_interieur' THEN 130
      WHEN 'pack_standard' THEN 170
      WHEN 'pack_vtc' THEN 240
      ELSE 0
    END
  ), 0) INTO v_montant_brut
  FROM public.vehicules
  WHERE contrat_id = v_contrat_id AND statut = 'actif';

  v_montant_net := ROUND(v_montant_brut * (1 - COALESCE(v_remise, 0)), 2);

  UPDATE public.contrats
  SET palier = v_palier,
      montant_net_mensuel = v_montant_net,
      nb_vehicules_actifs = v_nb_vehicules_actifs,
      updated_at = NOW()
  WHERE id = v_contrat_id;

  -- ÉTAPE 11 : log + dispatcher (via admin_actions_log)
  INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
  VALUES (
    v_user_id,
    'ajout_vehicule',
    jsonb_build_object(
      'entreprise_id', p_entreprise_id,
      'entreprise_nom', v_entreprise_nom,
      'vehicule_id', v_vehicule_id,
      'immatriculation', v_immat,
      'contrat_id', v_contrat_id,
      'contrat_cree', v_contrat_cree,
      'numero_contrat', COALESCE(v_numero_contrat, (SELECT numero_contrat FROM public.contrats WHERE id = v_contrat_id)),
      'pack', p_pack,
      'statut_vehicule', v_statut_vehicule::text,
      'statut_contrat', v_statut_contrat::text,
      'role_initiateur', v_role_initiateur,
      'palier', v_palier,
      'nb_vehicules_actifs', v_nb_vehicules_actifs,
      'montant_net_mensuel', v_montant_net
    ),
    1
  );

  -- ÉTAPE 12 : retour structuré
  RETURN jsonb_build_object(
    'success', true,
    'vehicule_id', v_vehicule_id,
    'contrat_id', v_contrat_id,
    'contrat_cree', v_contrat_cree,
    'statut_vehicule', v_statut_vehicule::text,
    'statut_contrat', v_statut_contrat::text,
    'palier', v_palier,
    'remise_pct', v_remise,
    'nb_vehicules_actifs', v_nb_vehicules_actifs,
    'montant_brut_mensuel', v_montant_brut,
    'montant_net_mensuel', v_montant_net,
    'numero_contrat', COALESCE(v_numero_contrat, (SELECT numero_contrat FROM public.contrats WHERE id = v_contrat_id))
  );
END;
$$;

COMMENT ON FUNCTION public.ajouter_vehicule IS 'Fonction unifiée ajout véhicule : crée/greffe contrat, upsert contrat_lignes, recalcule palier, applique statut selon rôle, dispatch notif. Atomique + lock proxy sur entreprises.';

GRANT EXECUTE ON FUNCTION public.ajouter_vehicule(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generer_numero_contrat() TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculer_palier_remise(INTEGER) TO authenticated;

-- 8. Extension du dispatcher pour l'action 'ajout_vehicule'
CREATE OR REPLACE FUNCTION public.dispatcher_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_action text;
  v_details jsonb;
  v_log_id uuid;
  v_titre text;
  v_severite text;
  v_action_requise boolean;
  v_link_url text;
  v_roles_cibles app_role[];
  v_user record;
  v_nb_erreurs integer;
  v_nb_dormants integer;
  v_nb_preavis integer;
  v_numero_contrat text;
  v_role_initiateur text;
  v_contrat_cree boolean;
  v_immat text;
  v_entreprise_nom text;
  v_entreprise_id text;
BEGIN
  BEGIN
    v_action := NEW.action;
    v_details := COALESCE(NEW.details, '{}'::jsonb);
    v_log_id := NEW.id;

    IF v_action LIKE 'test%' THEN
      RETURN NEW;
    END IF;

    v_numero_contrat := COALESCE(
      v_details->>'numero_contrat',
      v_details->>'numero_facture',
      v_details->>'numero_avoir',
      ''
    );

    CASE v_action

      WHEN 'creation_contrat' THEN
        v_titre := 'Nouveau contrat — ' || v_numero_contrat;
        v_roles_cibles := ARRAY['admin', 'staff', 'commercial']::app_role[];
        v_severite := 'info';
        v_action_requise := false;
        v_link_url := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'modification_contrat' THEN
        v_titre := 'Ajustement de flotte — ' || v_numero_contrat;
        v_roles_cibles := ARRAY['admin', 'staff', 'commercial']::app_role[];
        v_severite := 'info';
        v_action_requise := false;
        v_link_url := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'gel_contrat' THEN
        v_titre := 'Mise en veille — ' || v_numero_contrat;
        v_roles_cibles := ARRAY['admin', 'staff', 'commercial']::app_role[];
        v_severite := 'info';
        v_action_requise := false;
        v_link_url := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'reactivation_contrat' THEN
        v_titre := 'Reprise du contrat — ' || v_numero_contrat;
        v_roles_cibles := ARRAY['admin', 'staff', 'commercial']::app_role[];
        v_severite := 'info';
        v_action_requise := false;
        v_link_url := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'resiliation_contrat' THEN
        v_titre := 'Clôture du contrat — ' || v_numero_contrat;
        v_roles_cibles := ARRAY['admin', 'staff', 'commercial']::app_role[];
        v_severite := 'warning';
        v_action_requise := false;
        v_link_url := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'validation_vehicule_attente' THEN
        v_titre := 'Véhicule validé — ' || COALESCE(v_details->>'immatriculation', '');
        v_roles_cibles := ARRAY['admin', 'staff', 'commercial']::app_role[];
        v_severite := 'info';
        v_action_requise := false;
        v_link_url := '/admin/vehicules';

      WHEN 'ajout_vehicule' THEN
        v_role_initiateur := COALESCE(v_details->>'role_initiateur', 'client');
        v_contrat_cree := COALESCE((v_details->>'contrat_cree')::boolean, false);
        v_immat := COALESCE(v_details->>'immatriculation', '');
        v_entreprise_nom := COALESCE(v_details->>'entreprise_nom', '');
        v_entreprise_id := COALESCE(v_details->>'entreprise_id', '');

        IF v_role_initiateur IN ('admin', 'staff') THEN
          IF v_contrat_cree THEN
            v_titre := 'Nouveau contrat créé — ' || v_entreprise_nom;
          ELSE
            v_titre := 'Véhicule ajouté — ' || v_entreprise_nom || ' (' || v_immat || ')';
          END IF;
          v_severite := 'info';
          v_action_requise := false;
        ELSE
          IF v_contrat_cree THEN
            v_titre := 'Nouvelle demande contrat — ' || v_entreprise_nom;
          ELSE
            v_titre := 'Véhicule à valider — ' || v_entreprise_nom || ' (' || v_immat || ')';
          END IF;
          v_severite := 'warning';
          v_action_requise := true;
        END IF;

        v_roles_cibles := ARRAY['admin', 'staff']::app_role[];
        v_link_url := '/admin/clients/' || v_entreprise_id;

      WHEN 'cron_cloture_mensuelle' THEN
        v_nb_erreurs := COALESCE((v_details->>'nb_erreurs')::integer, 0);
        IF v_nb_erreurs > 0 THEN
          v_titre := '⚠ Clôture mensuelle — ' || v_nb_erreurs || ' erreur(s)';
          v_severite := 'critical';
          v_action_requise := true;
        ELSE
          v_titre := 'Clôture mensuelle — ' || COALESCE(v_details->>'nb_factures_creees', '0') || ' facture(s) créée(s)';
          v_severite := 'info';
          v_action_requise := false;
        END IF;
        v_roles_cibles := ARRAY['admin', 'staff']::app_role[];
        v_link_url := '/admin';

      WHEN 'cron_maintenance_quotidienne' THEN
        v_nb_dormants := COALESCE((v_details->>'nb_dormants_detectes')::integer, 0);
        v_nb_preavis := COALESCE((v_details->>'nb_preavis_echus')::integer, 0);

        IF v_nb_dormants > 0 THEN
          FOR v_user IN
            SELECT DISTINCT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'commercial')
          LOOP
            INSERT INTO notifications_internes (
              user_id, source_action, source_log_id, titre, details, link_url, statut, action_requise, severite
            ) VALUES (
              v_user.user_id, v_action, v_log_id, v_nb_dormants || ' contrat(s) dormant(s) détecté(s)', v_details, '/admin/contrats', 'non_lu', true, 'warning'
            )
            ON CONFLICT (user_id, source_log_id, source_action) WHERE source_log_id IS NOT NULL DO NOTHING;
          END LOOP;
        END IF;

        IF v_nb_preavis > 0 THEN
          FOR v_user IN
            SELECT DISTINCT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'staff', 'commercial')
          LOOP
            INSERT INTO notifications_internes (
              user_id, source_action, source_log_id, titre, details, link_url, statut, action_requise, severite
            ) VALUES (
              v_user.user_id, v_action || '_preavis', v_log_id, v_nb_preavis || ' préavis échu(s) aujourd''hui', v_details, '/admin/contrats', 'non_lu', true, 'warning'
            )
            ON CONFLICT (user_id, source_log_id, source_action) WHERE source_log_id IS NOT NULL DO NOTHING;
          END LOOP;
        END IF;

        RETURN NEW;

      WHEN 'generation_facture_brouillon' THEN
        v_titre := 'Facture brouillon générée — ' || v_numero_contrat;
        v_roles_cibles := ARRAY['admin', 'staff']::app_role[];
        v_severite := 'info';
        v_action_requise := false;
        v_link_url := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'emission_facture' THEN
        v_titre := 'Facture émise — ' || COALESCE(v_details->>'numero_facture', '');
        v_roles_cibles := ARRAY['admin', 'staff']::app_role[];
        v_severite := 'info';
        v_action_requise := false;
        v_link_url := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'annulation_facture_via_avoir' THEN
        v_titre := 'Avoir émis — ' || COALESCE(v_details->>'numero_avoir', '');
        v_roles_cibles := ARRAY['admin', 'staff', 'commercial']::app_role[];
        v_severite := 'warning';
        v_action_requise := false;
        v_link_url := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      ELSE
        v_titre := replace(v_action, '_', ' ');
        v_roles_cibles := ARRAY['admin']::app_role[];
        v_severite := 'info';
        v_action_requise := false;
        v_link_url := '/admin';

    END CASE;

    FOR v_user IN
      SELECT DISTINCT ur.user_id FROM user_roles ur
      WHERE ur.role = ANY(v_roles_cibles)
        AND ur.user_id <> COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    LOOP
      INSERT INTO notifications_internes (
        user_id, source_action, source_log_id, titre, details, link_url, statut, action_requise, severite
      ) VALUES (
        v_user.user_id, v_action, v_log_id, v_titre, v_details, v_link_url, 'non_lu', v_action_requise, v_severite
      )
      ON CONFLICT (user_id, source_log_id, source_action) WHERE source_log_id IS NOT NULL DO NOTHING;
    END LOOP;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dispatcher_notification ECHEC pour log % (action=%): %', NEW.id, NEW.action, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
