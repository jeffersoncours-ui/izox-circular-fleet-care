-- ============================================
-- 3.A.4.4 : Trigger tracker_dernier_passage
-- ============================================

CREATE OR REPLACE FUNCTION public.trg_tracker_dernier_passage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contrat_id uuid;
  v_date_actuelle date;
  v_nouvelle_date date;
  v_max_recalcule date;
BEGIN
  -- Determination du contrat impacte
  IF TG_OP = 'DELETE' THEN
    SELECT contrat_id INTO v_contrat_id
    FROM vehicules WHERE id = OLD.vehicule_id;
  ELSE
    SELECT contrat_id INTO v_contrat_id
    FROM vehicules WHERE id = NEW.vehicule_id;
  END IF;

  IF v_contrat_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT date_dernier_passage INTO v_date_actuelle
  FROM contrats WHERE id = v_contrat_id;

  -- CAS 1 & 3 : INSERT validee OU UPDATE vers validee
  IF (TG_OP = 'INSERT' AND NEW.statut = 'validee')
     OR (TG_OP = 'UPDATE' AND NEW.statut = 'validee'
         AND (OLD.statut IS DISTINCT FROM 'validee'))
  THEN
    v_nouvelle_date := NEW.date_intervention;

    IF v_date_actuelle IS NULL OR v_nouvelle_date > v_date_actuelle THEN
      UPDATE contrats
      SET date_dernier_passage = v_nouvelle_date
      WHERE id = v_contrat_id;
    END IF;

    RETURN NEW;
  END IF;

  -- CAS 4 : UPDATE date_intervention sur intervention deja validee
  IF TG_OP = 'UPDATE'
     AND NEW.statut = 'validee'
     AND OLD.statut = 'validee'
     AND (OLD.date_intervention IS DISTINCT FROM NEW.date_intervention)
  THEN
    IF v_date_actuelle IS NULL OR NEW.date_intervention > v_date_actuelle THEN
      UPDATE contrats
      SET date_dernier_passage = NEW.date_intervention
      WHERE id = v_contrat_id;
    ELSE
      SELECT MAX(i.date_intervention) INTO v_max_recalcule
      FROM interventions i
      JOIN vehicules v ON v.id = i.vehicule_id
      WHERE v.contrat_id = v_contrat_id
        AND i.statut = 'validee'
        AND i.id != NEW.id;

      v_max_recalcule := GREATEST(
        COALESCE(v_max_recalcule, NEW.date_intervention),
        NEW.date_intervention
      );

      UPDATE contrats
      SET date_dernier_passage = v_max_recalcule
      WHERE id = v_contrat_id;
    END IF;

    RETURN NEW;
  END IF;

  -- CAS 2A : DEVALIDATION (validee -> autre)
  IF TG_OP = 'UPDATE'
     AND OLD.statut = 'validee'
     AND NEW.statut != 'validee'
  THEN
    IF v_date_actuelle IS NOT NULL
       AND OLD.date_intervention = v_date_actuelle
    THEN
      SELECT MAX(i.date_intervention) INTO v_max_recalcule
      FROM interventions i
      JOIN vehicules v ON v.id = i.vehicule_id
      WHERE v.contrat_id = v_contrat_id
        AND i.statut = 'validee'
        AND i.id != NEW.id;

      UPDATE contrats
      SET date_dernier_passage = v_max_recalcule
      WHERE id = v_contrat_id;
    END IF;

    RETURN NEW;
  END IF;

  -- CAS 2B : DELETE d'une intervention validee
  IF TG_OP = 'DELETE' AND OLD.statut = 'validee' THEN
    IF v_date_actuelle IS NOT NULL
       AND OLD.date_intervention = v_date_actuelle
    THEN
      SELECT MAX(i.date_intervention) INTO v_max_recalcule
      FROM interventions i
      JOIN vehicules v ON v.id = i.vehicule_id
      WHERE v.contrat_id = v_contrat_id
        AND i.statut = 'validee'
        AND i.id != OLD.id;

      UPDATE contrats
      SET date_dernier_passage = v_max_recalcule
      WHERE id = v_contrat_id;
    END IF;

    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.trg_tracker_dernier_passage() IS
'Trigger function : met a jour automatiquement contrats.date_dernier_passage selon les changements sur interventions. Logique de "Recalcul Intelligent" : comparaison rapide pour les validations (frequentes), MAX() complet pour les devalidations/suppressions (rares). Critique pour la detection des contrats dormants par le cron quotidien.';

-- Trigger
DROP TRIGGER IF EXISTS trg_interventions_tracker_passage ON public.interventions;

CREATE TRIGGER trg_interventions_tracker_passage
AFTER INSERT OR UPDATE OR DELETE ON public.interventions
FOR EACH ROW
EXECUTE FUNCTION public.trg_tracker_dernier_passage();

-- Backfill initial
UPDATE contrats c
SET date_dernier_passage = subq.max_date
FROM (
  SELECT v.contrat_id, MAX(i.date_intervention) AS max_date
  FROM interventions i
  JOIN vehicules v ON v.id = i.vehicule_id
  WHERE i.statut = 'validee'
    AND v.contrat_id IS NOT NULL
  GROUP BY v.contrat_id
) subq
WHERE c.id = subq.contrat_id;
