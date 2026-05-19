
ALTER TYPE public.statut_vehicule ADD VALUE IF NOT EXISTS 'gele';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_demandes_rdv_statut') THEN
    ALTER TABLE public.demandes_rdv ADD CONSTRAINT chk_demandes_rdv_statut
      CHECK (statut IN ('en_attente', 'confirmee', 'refusee', 'annulee_client'));
  END IF;
END$$;

ALTER TABLE public.interventions
  ADD COLUMN IF NOT EXISTS demande_rdv_id UUID
  REFERENCES public.demandes_rdv(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_interventions_demande_rdv ON public.interventions(demande_rdv_id);

CREATE TABLE IF NOT EXISTS public.demandes_gel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  contrat_id UUID NOT NULL REFERENCES public.contrats(id) ON DELETE CASCADE,
  type_demande TEXT NOT NULL CHECK (type_demande IN ('contrat', 'vehicules')),
  vehicule_ids UUID[] NULL,
  date_debut DATE NOT NULL,
  date_fin_prevue DATE NOT NULL,
  date_fin_effective DATE NULL,
  motif TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente','validee','refusee','active','close','annulee')),
  refus_motif TEXT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  validated_by UUID NULL REFERENCES public.profiles(id),
  validated_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_dates_coherentes CHECK (date_fin_prevue > date_debut),
  CONSTRAINT chk_duree_min_14j CHECK (date_fin_prevue - date_debut >= 14),
  CONSTRAINT chk_duree_max_90j CHECK (date_fin_prevue - date_debut <= 90),
  CONSTRAINT chk_motif_min_10 CHECK (LENGTH(TRIM(motif)) >= 10),
  CONSTRAINT chk_vehicule_ids_coherence CHECK (
    (type_demande='contrat' AND vehicule_ids IS NULL)
    OR (type_demande='vehicules' AND vehicule_ids IS NOT NULL AND array_length(vehicule_ids,1) > 0)
  ),
  CONSTRAINT chk_refus_motif_si_refusee CHECK (
    statut <> 'refusee' OR (refus_motif IS NOT NULL AND LENGTH(TRIM(refus_motif)) >= 5)
  )
);

CREATE INDEX IF NOT EXISTS idx_demandes_gel_entreprise ON public.demandes_gel(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_demandes_gel_statut ON public.demandes_gel(statut);
CREATE INDEX IF NOT EXISTS idx_demandes_gel_dates ON public.demandes_gel(date_debut, date_fin_prevue);
CREATE UNIQUE INDEX IF NOT EXISTS idx_demandes_gel_unicite_active
  ON public.demandes_gel(contrat_id) WHERE statut IN ('en_attente','active');

ALTER TABLE public.demandes_gel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demandes_gel_client_insert ON public.demandes_gel;
CREATE POLICY demandes_gel_client_insert ON public.demandes_gel
  FOR INSERT TO authenticated
  WITH CHECK (entreprise_id = (SELECT entreprise_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS demandes_gel_select_authorized ON public.demandes_gel;
CREATE POLICY demandes_gel_select_authorized ON public.demandes_gel
  FOR SELECT TO authenticated
  USING (
    entreprise_id = (SELECT entreprise_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','staff'))
    OR EXISTS (SELECT 1 FROM public.contrats c WHERE c.id = contrat_id AND c.commercial_signataire_id = auth.uid())
  );

DROP POLICY IF EXISTS demandes_gel_admin_all ON public.demandes_gel;
CREATE POLICY demandes_gel_admin_all ON public.demandes_gel
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','staff')));

DROP TRIGGER IF EXISTS trg_demandes_gel_updated_at ON public.demandes_gel;
CREATE TRIGGER trg_demandes_gel_updated_at
  BEFORE UPDATE ON public.demandes_gel
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
