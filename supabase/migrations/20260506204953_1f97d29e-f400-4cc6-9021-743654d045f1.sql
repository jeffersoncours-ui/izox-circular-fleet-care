-- ============================================================
-- A. Sequences avoirs
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS seq_avoir_b2b_2026
  START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE;

CREATE SEQUENCE IF NOT EXISTS seq_avoir_b2c_2026
  START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE;

-- ============================================================
-- B. Table avoirs
-- ============================================================
CREATE TABLE IF NOT EXISTS avoirs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_avoir text UNIQUE NOT NULL,
  serie serie_facture_enum NOT NULL,
  annee_fiscale integer NOT NULL,
  numero_sequentiel integer NOT NULL,
  facture_id uuid NOT NULL REFERENCES factures(id) ON DELETE RESTRICT,
  type_avoir text NOT NULL,
  motif text NOT NULL,
  montant_ht numeric(12,2) NOT NULL,
  tva_taux numeric(5,2) NOT NULL DEFAULT 0,
  tva_montant numeric(12,2) NOT NULL DEFAULT 0,
  montant_ttc numeric(12,2) NOT NULL,
  devise text NOT NULL DEFAULT 'EUR',
  date_emission date NOT NULL,
  snapshot_facture_origine jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  emitted_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT chk_avoirs_montants_negatifs
    CHECK (montant_ht <= 0 AND montant_ttc <= 0),
  CONSTRAINT chk_avoirs_montants_coherents
    CHECK (montant_ttc = montant_ht + tva_montant),
  CONSTRAINT chk_avoirs_type_valide
    CHECK (type_avoir IN (
      'annulation_totale',
      'annulation_partielle',
      'remise_commerciale',
      'erreur_saisie'
    ))
);

COMMENT ON TABLE avoirs IS
  'Avoirs (credit notes) conformes CGI. Emis pour annuler ou corriger une facture sans la modifier. Immuables apres emission.';
COMMENT ON COLUMN avoirs.numero_avoir IS
  'Format : AV-{serie}-{annee}-{6 chiffres}. Numerotation sequentielle propre, conforme CGI.';
COMMENT ON COLUMN avoirs.facture_id IS
  'FK obligatoire vers la facture concernee. ON DELETE RESTRICT pour preserver le lien comptable.';
COMMENT ON COLUMN avoirs.type_avoir IS
  'Type : annulation_totale, annulation_partielle, remise_commerciale, erreur_saisie.';
COMMENT ON COLUMN avoirs.snapshot_facture_origine IS
  'Copie complete de la facture au moment de l''emission de l''avoir. Pour audit fiscal.';

-- ============================================================
-- C. Forward reference factures.avoir_id -> avoirs.id
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_factures_avoir'
      AND conrelid = 'factures'::regclass
  ) THEN
    ALTER TABLE factures
      ADD CONSTRAINT fk_factures_avoir
      FOREIGN KEY (avoir_id)
      REFERENCES avoirs(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- D. Index sur factures
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_factures_contrat_id
  ON factures(contrat_id);

CREATE INDEX IF NOT EXISTS idx_factures_entreprise_id
  ON factures(entreprise_id);

CREATE INDEX IF NOT EXISTS idx_factures_numero
  ON factures(numero_facture)
  WHERE numero_facture IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_factures_serie_annee
  ON factures(serie, annee_fiscale);

CREATE INDEX IF NOT EXISTS idx_factures_echeance_impayees
  ON factures(date_echeance)
  WHERE statut = 'emise';

CREATE UNIQUE INDEX IF NOT EXISTS idx_factures_idempotence
  ON factures(contrat_id, periode_debut, periode_fin)
  WHERE statut != 'annulee';

-- ============================================================
-- E. Index sur avoirs
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_avoirs_facture_id
  ON avoirs(facture_id);

CREATE INDEX IF NOT EXISTS idx_avoirs_serie_annee
  ON avoirs(serie, annee_fiscale);

-- ============================================================
-- F. RLS
-- ============================================================
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE avoirs ENABLE ROW LEVEL SECURITY;

-- factures
DROP POLICY IF EXISTS p_factures_admin_staff_all ON factures;
CREATE POLICY p_factures_admin_staff_all
  ON factures
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS p_factures_client_select_own ON factures;
CREATE POLICY p_factures_client_select_own
  ON factures
  FOR SELECT
  TO authenticated
  USING (
    entreprise_id = get_user_entreprise(auth.uid())
    AND statut IN ('emise', 'payee', 'annulee')
  );

-- factures_lignes
DROP POLICY IF EXISTS p_factures_lignes_admin_staff_all ON factures_lignes;
CREATE POLICY p_factures_lignes_admin_staff_all
  ON factures_lignes
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS p_factures_lignes_client_select ON factures_lignes;
CREATE POLICY p_factures_lignes_client_select
  ON factures_lignes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM factures f
      WHERE f.id = factures_lignes.facture_id
        AND f.entreprise_id = get_user_entreprise(auth.uid())
        AND f.statut IN ('emise', 'payee', 'annulee')
    )
  );

-- avoirs
DROP POLICY IF EXISTS p_avoirs_admin_staff_all ON avoirs;
CREATE POLICY p_avoirs_admin_staff_all
  ON avoirs
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS p_avoirs_client_select ON avoirs;
CREATE POLICY p_avoirs_client_select
  ON avoirs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM factures f
      WHERE f.id = avoirs.facture_id
        AND f.entreprise_id = get_user_entreprise(auth.uid())
    )
  );