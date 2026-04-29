ALTER TABLE public.vehicules
  ADD COLUMN contrat_id uuid REFERENCES public.contrats(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicules_contrat_id ON public.vehicules(contrat_id);