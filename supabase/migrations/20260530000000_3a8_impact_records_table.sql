-- ============================================================
-- Module 3.A.8 — Impact RSE (Edge Function approach)
-- Only impact_records table (coefficients in Edge Function)
-- ============================================================

CREATE TABLE IF NOT EXISTS impact_records (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id       UUID        NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  contrat_id            UUID        REFERENCES contrats(id) ON DELETE SET NULL,
  entreprise_id         UUID        NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  coefficient_snapshot  JSONB       NOT NULL,
  category              TEXT        NOT NULL CHECK (category IN ('water','pollution','circular','ghg')),
  quantity              NUMERIC     NOT NULL,
  unit                  TEXT        NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'estimated'
                          CHECK (status IN ('estimated','validated')),
  validated_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_impact_records_entreprise   ON impact_records(entreprise_id, category);
CREATE INDEX IF NOT EXISTS idx_impact_records_intervention ON impact_records(intervention_id);
CREATE INDEX IF NOT EXISTS idx_impact_records_status       ON impact_records(status);

ALTER TABLE impact_records ENABLE ROW LEVEL SECURITY;

-- Admin/staff : accès complet
CREATE POLICY "impact_records_admin_staff_all" ON impact_records
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','staff'))
  );

-- Client : lecture uniquement SES records VALIDÉS
CREATE POLICY "impact_records_client_select_validated" ON impact_records
  FOR SELECT TO authenticated
  USING (
    status = 'validated'
    AND entreprise_id = get_user_entreprise(auth.uid())
  );

-- Authenticated can insert (via Edge Function)
CREATE POLICY "impact_records_insert" ON impact_records
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Authenticated can update (via Edge Function)
CREATE POLICY "impact_records_update" ON impact_records
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
