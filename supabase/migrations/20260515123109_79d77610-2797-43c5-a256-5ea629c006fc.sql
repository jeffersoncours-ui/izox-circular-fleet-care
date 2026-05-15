-- A + B : Mise à jour du dispatcher (suppression RAS + matrice enrichie)
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
      SELECT DISTINCT ur.user_id FROM user_roles ur WHERE ur.role = ANY(v_roles_cibles)
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

-- C : Colonnes épingle équipe
ALTER TABLE notifications_internes
  ADD COLUMN epingle_equipe boolean NOT NULL DEFAULT false;

ALTER TABLE notifications_internes
  ADD COLUMN epingle_par uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE notifications_internes
  ADD COLUMN epingle_at timestamptz;

COMMENT ON COLUMN notifications_internes.epingle_equipe IS
'Si true, la notification est mise en avant pour TOUTE l''equipe (admin/staff/commercial). Modification propagee a toutes les copies via toggle_epingle_equipe().';

COMMENT ON COLUMN notifications_internes.epingle_par IS
'User qui a active l''epingle equipe (pour audit).';

COMMENT ON COLUMN notifications_internes.epingle_at IS
'Date d''activation de l''epingle equipe.';

CREATE INDEX idx_notif_epingle_equipe
  ON notifications_internes(user_id, created_at DESC)
  WHERE epingle_equipe = true AND statut != 'archive';

-- D : Fonction RPC toggle_epingle_equipe
CREATE OR REPLACE FUNCTION toggle_epingle_equipe(
  p_notification_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source_log_id uuid;
  v_source_action text;
  v_current_state boolean;
  v_new_state boolean;
  v_nb_updated integer;
  v_calling_user uuid;
  v_has_internal_role boolean;
BEGIN
  v_calling_user := auth.uid();

  IF v_calling_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifie');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = v_calling_user
      AND role IN ('admin', 'staff', 'commercial')
  ) INTO v_has_internal_role;

  IF NOT v_has_internal_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'Role non autorise (admin/staff/commercial requis)');
  END IF;

  SELECT source_log_id, source_action, epingle_equipe
  INTO v_source_log_id, v_source_action, v_current_state
  FROM notifications_internes
  WHERE id = p_notification_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notification introuvable');
  END IF;

  IF v_source_log_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notification sans source_log_id (impossible a epingler equipe)');
  END IF;

  v_new_state := NOT COALESCE(v_current_state, false);

  UPDATE notifications_internes
  SET
    epingle_equipe = v_new_state,
    epingle_par = CASE WHEN v_new_state THEN v_calling_user ELSE NULL END,
    epingle_at = CASE WHEN v_new_state THEN now() ELSE NULL END
  WHERE source_log_id = v_source_log_id
    AND source_action = v_source_action;

  GET DIAGNOSTICS v_nb_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'epingle_equipe', v_new_state,
    'nb_copies_modifiees', v_nb_updated
  );
END;
$$;

COMMENT ON FUNCTION toggle_epingle_equipe(uuid) IS
'Bascule l''etat epingle_equipe sur TOUTES les copies de la notification (admin + staff + commercial). Reserve aux roles internes (verification par EXISTS direct sur user_roles). SECURITY DEFINER pour bypass RLS.';

GRANT EXECUTE ON FUNCTION toggle_epingle_equipe(uuid) TO authenticated;