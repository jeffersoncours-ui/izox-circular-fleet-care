-- Table interventions
CREATE TABLE public.interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id uuid REFERENCES public.entreprises(id) ON DELETE SET NULL,
  vehicule_id uuid REFERENCES public.vehicules(id) ON DELETE SET NULL,
  operateur_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  statut text NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','en_revision','validee','refusee')),
  type_prestation text NOT NULL DEFAULT 'complet' CHECK (type_prestation IN ('exterieur','interieur','complet')),
  date_intervention date DEFAULT CURRENT_DATE,
  notes_operateur text,
  signature_url text,
  motif_refus text,
  controle_objets_valeur boolean NOT NULL DEFAULT false,
  controle_degradations boolean NOT NULL DEFAULT false,
  degradations_description text,
  controle_cles_documents boolean NOT NULL DEFAULT false,
  cles_documents_localisation text,
  checklist_interieur jsonb NOT NULL DEFAULT '{}'::jsonb,
  checklist_exterieur jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  validated_at timestamptz,
  validated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_interventions_operateur ON public.interventions(operateur_id);
CREATE INDEX idx_interventions_entreprise ON public.interventions(entreprise_id);
CREATE INDEX idx_interventions_vehicule ON public.interventions(vehicule_id);
CREATE INDEX idx_interventions_statut ON public.interventions(statut);

-- Table intervention_photos
CREATE TABLE public.intervention_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  zone text NOT NULL,
  moment text NOT NULL CHECK (moment IN ('avant','apres')),
  url text NOT NULL,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_intervention_photos_intervention ON public.intervention_photos(intervention_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_interventions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_interventions_updated_at
BEFORE UPDATE ON public.interventions
FOR EACH ROW EXECUTE FUNCTION public.update_interventions_updated_at();

-- Enable RLS
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_photos ENABLE ROW LEVEL SECURITY;

-- Policies interventions
CREATE POLICY "interventions_admin_staff_all"
ON public.interventions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "interventions_operateur_select"
ON public.interventions FOR SELECT TO authenticated
USING (operateur_id = auth.uid() AND public.has_role(auth.uid(), 'operateur'::app_role));

CREATE POLICY "interventions_operateur_insert"
ON public.interventions FOR INSERT TO authenticated
WITH CHECK (operateur_id = auth.uid() AND public.has_role(auth.uid(), 'operateur'::app_role) AND statut = 'en_cours');

CREATE POLICY "interventions_operateur_update"
ON public.interventions FOR UPDATE TO authenticated
USING (operateur_id = auth.uid() AND public.has_role(auth.uid(), 'operateur'::app_role) AND statut IN ('en_cours','en_revision'))
WITH CHECK (operateur_id = auth.uid() AND statut IN ('en_cours','en_revision'));

CREATE POLICY "interventions_client_select_validee"
ON public.interventions FOR SELECT TO authenticated
USING (statut = 'validee' AND entreprise_id = public.get_user_entreprise(auth.uid()));

-- Policies intervention_photos
CREATE POLICY "intervention_photos_admin_staff_all"
ON public.intervention_photos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "intervention_photos_operateur_select"
ON public.intervention_photos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.interventions i WHERE i.id = intervention_id AND i.operateur_id = auth.uid()));

CREATE POLICY "intervention_photos_operateur_insert"
ON public.intervention_photos FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.interventions i WHERE i.id = intervention_id AND i.operateur_id = auth.uid() AND i.statut IN ('en_cours','en_revision')));

CREATE POLICY "intervention_photos_operateur_delete"
ON public.intervention_photos FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.interventions i WHERE i.id = intervention_id AND i.operateur_id = auth.uid() AND i.statut = 'en_cours'));

CREATE POLICY "intervention_photos_client_select"
ON public.intervention_photos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.interventions i WHERE i.id = intervention_id AND i.statut = 'validee' AND i.entreprise_id = public.get_user_entreprise(auth.uid())));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('interventions','interventions', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "interventions_storage_admin_staff_all"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'interventions' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'staff'::app_role)))
WITH CHECK (bucket_id = 'interventions' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'staff'::app_role)));

CREATE POLICY "interventions_storage_operateur_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'interventions'
  AND EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id::text = (storage.foldername(name))[1]
      AND i.operateur_id = auth.uid()
      AND i.statut IN ('en_cours','en_revision')
  )
);

CREATE POLICY "interventions_storage_operateur_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'interventions'
  AND EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id::text = (storage.foldername(name))[1]
      AND i.operateur_id = auth.uid()
  )
);

CREATE POLICY "interventions_storage_client_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'interventions'
  AND EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id::text = (storage.foldername(name))[1]
      AND i.statut = 'validee'
      AND i.entreprise_id = public.get_user_entreprise(auth.uid())
  )
);

CREATE POLICY "interventions_storage_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'interventions' AND public.has_role(auth.uid(),'admin'::app_role));