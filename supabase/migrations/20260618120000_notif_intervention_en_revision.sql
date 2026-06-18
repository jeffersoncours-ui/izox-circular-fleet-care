-- Notif in-app équipe lorsqu'une intervention est soumise par l'opérateur
-- (transition -> 'en_revision'). L'email est déclenché côté terrain
-- (sendEmail "intervention_a_valider") ; ce trigger garantit la notif in-app
-- quel que soit le chemin d'écriture (UI terrain, RPC future, cron).
-- Mirroir de tg_log_intervention_validee.

CREATE OR REPLACE FUNCTION public.tg_notif_intervention_en_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_immat   text;
  v_ent_nom text;
BEGIN
  IF NEW.statut = 'en_revision' AND OLD.statut IS DISTINCT FROM 'en_revision' THEN
    SELECT immatriculation INTO v_immat   FROM public.vehicules   WHERE id = NEW.vehicule_id;
    SELECT nom             INTO v_ent_nom FROM public.entreprises WHERE id = NEW.entreprise_id;

    INSERT INTO public.notifications_internes
      (user_id, source_action, titre, details, severite, link_url, statut, action_requise)
    SELECT
      p.id,
      'intervention_en_revision',
      'Intervention à valider — ' || COALESCE(v_immat, '?')
        || CASE WHEN v_ent_nom IS NOT NULL THEN ' (' || v_ent_nom || ')' ELSE '' END,
      jsonb_build_object(
        'intervention_id',  NEW.id,
        'vehicule_id',      NEW.vehicule_id,
        'immatriculation',  v_immat,
        'type_prestation',  NEW.type_prestation,
        'date_intervention', NEW.date_intervention
      ),
      'warning',
      '/admin/interventions/' || NEW.id::text,
      'non_lu',
      TRUE
    FROM public.profiles p
    WHERE p.role::text IN ('admin', 'staff', 'commercial');
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notif_intervention_en_revision ON public.interventions;
CREATE TRIGGER trg_notif_intervention_en_revision
AFTER UPDATE ON public.interventions
FOR EACH ROW EXECUTE FUNCTION public.tg_notif_intervention_en_revision();
