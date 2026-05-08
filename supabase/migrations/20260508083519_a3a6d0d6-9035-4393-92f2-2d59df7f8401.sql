-- ==========================================================
-- 3.A.5 - Cron pg_cron + automatisation maintenance
-- ==========================================================

-- A. ACTIVATION pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- B. AJOUT VALEUR 'dormant' A status_cycle_enum
ALTER TYPE status_cycle_enum ADD VALUE IF NOT EXISTS 'dormant';

-- C. FONCTION cron_cloture_mensuelle()
CREATE OR REPLACE FUNCTION cron_cloture_mensuelle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_mois_cible integer;
  v_annee_cible integer;
  v_contrat record;
  v_facture_id uuid;
  v_nb_contrats_traites integer := 0;
  v_nb_factures_creees integer := 0;
  v_nb_skipped integer := 0;
  v_nb_erreurs integer := 0;
  v_erreurs jsonb := '[]'::jsonb;
  v_now_utc timestamptz := now() AT TIME ZONE 'UTC';
BEGIN
  v_mois_cible := EXTRACT(MONTH FROM (v_now_utc - INTERVAL '1 month'))::integer;
  v_annee_cible := EXTRACT(YEAR FROM (v_now_utc - INTERVAL '1 month'))::integer;

  RAISE NOTICE 'Cloture mensuelle : generation factures pour %/%',
    v_mois_cible, v_annee_cible;

  FOR v_contrat IN
    SELECT id, numero_contrat, statut
    FROM contrats
    WHERE statut IN ('actif', 'en_cours_gel')
    ORDER BY numero_contrat
  LOOP
    BEGIN
      v_nb_contrats_traites := v_nb_contrats_traites + 1;

      v_facture_id := generer_facture(
        v_contrat.id,
        v_mois_cible,
        v_annee_cible
      );

      IF v_facture_id IS NOT NULL THEN
        v_nb_factures_creees := v_nb_factures_creees + 1;
      ELSE
        v_nb_skipped := v_nb_skipped + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_nb_erreurs := v_nb_erreurs + 1;
      v_erreurs := v_erreurs || jsonb_build_object(
        'contrat_id', v_contrat.id,
        'numero_contrat', v_contrat.numero_contrat,
        'erreur', SQLERRM,
        'sqlstate', SQLSTATE
      );
      RAISE NOTICE 'Erreur cloture pour contrat % : %',
        v_contrat.numero_contrat, SQLERRM;
    END;
  END LOOP;

  INSERT INTO admin_actions_log (
    user_id, action, details, nb_entites_impactees
  )
  VALUES (
    NULL,
    'cron_cloture_mensuelle',
    jsonb_build_object(
      'mois_cible', v_mois_cible,
      'annee_cible', v_annee_cible,
      'date_execution_utc', v_now_utc,
      'nb_contrats_traites', v_nb_contrats_traites,
      'nb_factures_creees', v_nb_factures_creees,
      'nb_skipped_zero_prestation', v_nb_skipped,
      'nb_erreurs', v_nb_erreurs,
      'erreurs_details', v_erreurs
    ),
    v_nb_factures_creees
  );

  RAISE NOTICE 'Cloture mensuelle terminee : % factures creees, % skipped, % erreurs',
    v_nb_factures_creees, v_nb_skipped, v_nb_erreurs;
END;
$fn$;

COMMENT ON FUNCTION cron_cloture_mensuelle() IS
'Job cron mensuel : appele le 1er du mois a 02h00 UTC pour generer toutes les factures du mois precedent. Idempotent : si appele 2 fois, generer_facture retourne la facture existante sans recreer. Iterations independantes : une erreur sur un contrat ne bloque pas les autres. Resultats logges dans admin_actions_log.';

-- D. FONCTION cron_maintenance_quotidienne()
CREATE OR REPLACE FUNCTION cron_maintenance_quotidienne()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_now_utc timestamptz := now() AT TIME ZONE 'UTC';
  v_today date := (v_now_utc)::date;
  v_seuil_dormance integer := 28;
  v_duree_onboarding integer := 30;

  v_nb_dormants integer := 0;
  v_nb_actives integer := 0;
  v_nb_preavis_echus integer := 0;
  v_contrats_dormants jsonb := '[]'::jsonb;
  v_contrats_actives jsonb := '[]'::jsonb;
  v_contrats_preavis jsonb := '[]'::jsonb;
  v_record record;
BEGIN
  -- TACHE 1 : DETECTION DORMANTS
  FOR v_record IN
    SELECT id, numero_contrat, date_dernier_passage, created_at
    FROM contrats
    WHERE statut IN ('actif', 'en_cours_gel')
      AND status_cycle = 'actif'
      AND (
        (date_dernier_passage IS NOT NULL
         AND date_dernier_passage < (v_today - INTERVAL '28 days')::date)
        OR
        (date_dernier_passage IS NULL
         AND created_at < (v_now_utc - INTERVAL '28 days'))
      )
  LOOP
    BEGIN
      UPDATE contrats
      SET status_cycle = 'dormant'
      WHERE id = v_record.id;

      v_nb_dormants := v_nb_dormants + 1;
      v_contrats_dormants := v_contrats_dormants || jsonb_build_object(
        'contrat_id', v_record.id,
        'numero_contrat', v_record.numero_contrat,
        'date_dernier_passage', v_record.date_dernier_passage,
        'created_at', v_record.created_at
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erreur bascule dormant pour % : %',
        v_record.numero_contrat, SQLERRM;
    END;
  END LOOP;

  -- TACHE 2 : BASCULE ONBOARDING -> ACTIF
  FOR v_record IN
    SELECT id, numero_contrat, created_at
    FROM contrats
    WHERE statut IN ('actif', 'en_cours_gel')
      AND status_cycle = 'onboarding'
      AND created_at < (v_now_utc - INTERVAL '30 days')
  LOOP
    BEGIN
      UPDATE contrats
      SET status_cycle = 'actif'
      WHERE id = v_record.id;

      v_nb_actives := v_nb_actives + 1;
      v_contrats_actives := v_contrats_actives || jsonb_build_object(
        'contrat_id', v_record.id,
        'numero_contrat', v_record.numero_contrat,
        'created_at', v_record.created_at
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erreur bascule actif pour % : %',
        v_record.numero_contrat, SQLERRM;
    END;
  END LOOP;

  -- TACHE 3 : DETECTION PREAVIS ECHUS
  FOR v_record IN
    SELECT id, numero_contrat, preavis_deadline, date_fin_engagement, engagement_type
    FROM contrats
    WHERE statut IN ('actif', 'en_cours_gel')
      AND preavis_deadline = v_today
  LOOP
    v_nb_preavis_echus := v_nb_preavis_echus + 1;
    v_contrats_preavis := v_contrats_preavis || jsonb_build_object(
      'contrat_id', v_record.id,
      'numero_contrat', v_record.numero_contrat,
      'preavis_deadline', v_record.preavis_deadline,
      'date_fin_engagement', v_record.date_fin_engagement,
      'engagement_type', v_record.engagement_type
    );
  END LOOP;

  INSERT INTO admin_actions_log (
    user_id, action, details, nb_entites_impactees
  )
  VALUES (
    NULL,
    'cron_maintenance_quotidienne',
    jsonb_build_object(
      'date_execution_utc', v_now_utc,
      'today', v_today,
      'seuil_dormance_jours', v_seuil_dormance,
      'duree_onboarding_jours', v_duree_onboarding,
      'nb_dormants_detectes', v_nb_dormants,
      'nb_onboarding_basculees_actif', v_nb_actives,
      'nb_preavis_echus', v_nb_preavis_echus,
      'contrats_dormants', v_contrats_dormants,
      'contrats_actives', v_contrats_actives,
      'contrats_preavis', v_contrats_preavis
    ),
    v_nb_dormants + v_nb_actives + v_nb_preavis_echus
  );

  RAISE NOTICE 'Maintenance quotidienne : % dormants, % actives, % preavis echus',
    v_nb_dormants, v_nb_actives, v_nb_preavis_echus;
END;
$fn$;

COMMENT ON FUNCTION cron_maintenance_quotidienne() IS
'Job cron quotidien : appele a 03h00 UTC pour 3 taches : (1) detecter les contrats dormants (28j sans passage) -> bascule status_cycle, (2) basculer les contrats onboarding (>30j) en actif, (3) detecter les preavis echus du jour. Toutes les operations sont independantes (erreur sur un contrat ne bloque pas les autres). Le statut juridique (statut) n''est PAS modifie, seul status_cycle change.';

-- E. PROGRAMMATION DES JOBS pg_cron
DO $$
BEGIN
  PERFORM cron.unschedule('izox-cloture-mensuelle');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('izox-maintenance-quotidienne');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'izox-cloture-mensuelle',
  '0 2 1 * *',
  $cron$SELECT cron_cloture_mensuelle()$cron$
);

SELECT cron.schedule(
  'izox-maintenance-quotidienne',
  '0 3 * * *',
  $cron$SELECT cron_maintenance_quotidienne()$cron$
);
