-- Session 30 — Logger la validation d'une intervention dans admin_actions_log
-- pour qu'elle apparaisse dans la Timeline des modifications de la fiche contrat.
-- La validation passe par un simple UPDATE interventions SET statut='validee' côté
-- admin ; un trigger garantit le log quel que soit le chemin d'écriture.

CREATE OR REPLACE FUNCTION public.tg_log_intervention_validee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrat_id uuid;
  v_immat text;
BEGIN
  -- Ne logger qu'au passage effectif vers 'validee'
  IF NEW.statut = 'validee' AND OLD.statut IS DISTINCT FROM 'validee' THEN
    SELECT contrat_id, immatriculation
      INTO v_contrat_id, v_immat
      FROM public.vehicules
      WHERE id = NEW.vehicule_id;

    INSERT INTO public.admin_actions_log (user_id, action, details, nb_entites_impactees)
    VALUES (
      NEW.validated_by,
      'intervention_validee',
      jsonb_build_object(
        'contrat_id', v_contrat_id,
        'intervention_id', NEW.id,
        'vehicule_id', NEW.vehicule_id,
        'immatriculation', v_immat,
        'type_prestation', NEW.type_prestation,
        'date_intervention', NEW.date_intervention
      ),
      1
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_intervention_validee ON public.interventions;
CREATE TRIGGER trg_log_intervention_validee
  AFTER UPDATE ON public.interventions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_log_intervention_validee();
