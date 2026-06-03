-- ============================================================
-- Module 3.A.7 — Email natif IZOX
-- email_logs + colonnes email_sent_at/email_status
-- ============================================================

-- Table de logs emails
CREATE TABLE IF NOT EXISTS email_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT        NOT NULL,
  target_id     UUID        NOT NULL,
  email_to      TEXT,
  status        TEXT        NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Seuls admin/staff lisent les logs
CREATE POLICY "email_logs_admin_staff_select"
  ON email_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- La service role insère (Edge Function)
CREATE POLICY "email_logs_service_insert"
  ON email_logs FOR INSERT TO service_role
  WITH CHECK (true);

-- Index pour requêtes par target_id et type
CREATE INDEX IF NOT EXISTS email_logs_target_id_idx ON email_logs (target_id);
CREATE INDEX IF NOT EXISTS email_logs_type_idx       ON email_logs (type);
CREATE INDEX IF NOT EXISTS email_logs_status_idx     ON email_logs (status);

-- Colonnes de tracking sur demandes_gel
ALTER TABLE demandes_gel
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_status  TEXT;

-- Colonnes de tracking sur demandes_rdv
ALTER TABLE demandes_rdv
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_status  TEXT;

-- Colonnes de tracking sur interventions
ALTER TABLE interventions
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_status  TEXT;
