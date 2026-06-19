-- A. Index unique de déduplication à 3 colonnes
DROP INDEX IF EXISTS idx_notif_dedup;

CREATE UNIQUE INDEX idx_notif_dedup
  ON notifications_internes(user_id, source_log_id, source_action)
  WHERE source_log_id IS NOT NULL;

-- B. Fonction dispatcher
CREATE OR REPLACE FUNCTION dispatcher_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
        v_roles_cibles := ARRAY['admin', 'commercial']::app_role[];
        v_severite := 'info';
        v_action_requise := false;
        v_link_url := '/admin/contrats/' || COALESCE(v_details->>'contrat_id', '');

      WHEN 'modification_contrat' THEN
        v_titre := 'Ajustement de flotte — ' || v_numero_contrat;
        v_roles_cibles := ARRAY['admin', 'staff']::app_role[];
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
        v_roles_cibles := ARRAY['admin', 'staff']::app_role[];
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
            SELECT DISTINCT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'staff')
          LOOP
            INSERT INTO notifications_internes (
              user_id, source_action, source_log_id, titre, details, link_url, statut, action_requise, severite
            ) VALUES (
              v_user.user_id, v_action || '_preavis', v_log_id, v_nb_preavis || ' préavis échu(s) aujourd''hui', v_details, '/admin/contrats', 'non_lu', true, 'warning'
            )
            ON CONFLICT (user_id, source_log_id, source_action) WHERE source_log_id IS NOT NULL DO NOTHING;
          END LOOP;
        END IF;

        IF v_nb_dormants = 0 AND v_nb_preavis = 0 THEN
          FOR v_user IN
            SELECT DISTINCT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
          LOOP
            INSERT INTO notifications_internes (
              user_id, source_action, source_log_id, titre, details, link_url, statut, action_requise, severite
            ) VALUES (
              v_user.user_id, v_action, v_log_id, 'Maintenance quotidienne — RAS', v_details, '/admin', 'non_lu', false, 'info'
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
        v_roles_cibles := ARRAY['admin', 'staff']::app_role[];
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
$$;

COMMENT ON FUNCTION dispatcher_notification() IS
'Trigger AFTER INSERT sur admin_actions_log. Distribue automatiquement des notifications aux membres de l''equipe selon le type d''action et leur role. SECURITY DEFINER pour bypass RLS. TRY/CATCH complet. Index UNIQUE a 3 colonnes pour l''edge case des crons.';

-- C. Trigger
DROP TRIGGER IF EXISTS trg_admin_log_dispatcher_notification ON admin_actions_log;

CREATE TRIGGER trg_admin_log_dispatcher_notification
AFTER INSERT ON admin_actions_log
FOR EACH ROW
EXECUTE FUNCTION dispatcher_notification();