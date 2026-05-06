-- =========================================================
-- 3.A.2.1.a - Enums
-- =========================================================
CREATE TYPE serie_facture_enum AS ENUM ('B2B', 'B2C');
CREATE TYPE statut_facture_enum AS ENUM ('brouillon', 'emise', 'payee', 'annulee');
CREATE TYPE regime_tva_enum AS ENUM ('franchise_base', 'reel_normal');

-- =========================================================
-- 3.A.2.1.b - Sequences
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS seq_facture_b2b_2026
  START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE;

CREATE SEQUENCE IF NOT EXISTS seq_facture_b2c_2026
  START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE;

-- =========================================================
-- 3.A.2.1.c - Table factures
-- =========================================================
CREATE TABLE factures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  numero_facture text UNIQUE,
  serie serie_facture_enum NOT NULL,
  annee_fiscale integer NOT NULL,
  numero_sequentiel integer,

  contrat_id uuid REFERENCES contrats(id) ON DELETE RESTRICT,
  entreprise_id uuid REFERENCES entreprises(id) ON DELETE RESTRICT,

  periode_debut date NOT NULL,
  periode_fin date NOT NULL,

  statut statut_facture_enum NOT NULL DEFAULT 'brouillon',
  date_emission date,
  date_echeance date,
  date_paiement date,

  montant_ht numeric(12,2) NOT NULL DEFAULT 0,
  tva_taux numeric(5,2) NOT NULL DEFAULT 0,
  tva_montant numeric(12,2) NOT NULL DEFAULT 0,
  montant_ttc numeric(12,2) NOT NULL DEFAULT 0,
  devise text NOT NULL DEFAULT 'EUR',

  regime_tva regime_tva_enum NOT NULL DEFAULT 'franchise_base',
  mention_tva_speciale text,

  mode_paiement text,

  snapshot_client jsonb,
  snapshot_izox jsonb,
  snapshot_contrat jsonb,
  snapshot_prestations jsonb,

  avoir_id uuid,

  created_at timestamptz NOT NULL DEFAULT now(),
  emitted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),

  CONSTRAINT chk_factures_montants_coherents
    CHECK (montant_ttc = montant_ht + tva_montant),

  CONSTRAINT chk_factures_periode_valide
    CHECK (periode_debut <= periode_fin),

  CONSTRAINT chk_factures_emise_a_numero
    CHECK (
      (statut = 'brouillon' AND numero_facture IS NULL AND numero_sequentiel IS NULL)
      OR (statut IN ('emise', 'payee', 'annulee')
          AND numero_facture IS NOT NULL
          AND numero_sequentiel IS NOT NULL
          AND date_emission IS NOT NULL
          AND emitted_at IS NOT NULL)
    ),

  CONSTRAINT chk_factures_payee_a_date_paiement
    CHECK (statut <> 'payee' OR date_paiement IS NOT NULL),

  CONSTRAINT chk_factures_tva_coherente
    CHECK (
      (regime_tva = 'franchise_base' AND tva_taux = 0 AND tva_montant = 0)
      OR (regime_tva = 'reel_normal' AND tva_taux >= 0)
    )
);

COMMENT ON TABLE factures IS
  'Factures emises par IZOX. Conformes CGI : numerotation sequentielle, conservation 10 ans, immuables apres emission.';
COMMENT ON COLUMN factures.numero_facture IS
  'Format : FA-{serie}-{annee}-{6 chiffres}. NULL en brouillon, attribue irreversiblement au passage emise.';
COMMENT ON COLUMN factures.snapshot_client IS
  'Snapshot JSONB des donnees client a l''emission. Immuable.';
COMMENT ON COLUMN factures.snapshot_izox IS
  'Snapshot JSONB de l''identite IZOX a l''emission. Immuable.';
COMMENT ON COLUMN factures.snapshot_contrat IS
  'Snapshot JSONB du contrat a l''emission. Immuable.';
COMMENT ON COLUMN factures.snapshot_prestations IS
  'Snapshot JSONB des prestations effectuees durant la periode.';
COMMENT ON COLUMN factures.regime_tva IS
  'Regime TVA. franchise_base par defaut (art. 293 B CGI).';

-- =========================================================
-- 3.A.2.1.d - Table factures_lignes
-- =========================================================
CREATE TABLE factures_lignes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id uuid NOT NULL REFERENCES factures(id) ON DELETE CASCADE,

  ordre_affichage integer NOT NULL DEFAULT 0,
  type_ligne text NOT NULL,
  libelle text NOT NULL,

  quantite numeric(10,3),
  prix_unitaire_ht numeric(10,2),
  montant_ht numeric(12,2) NOT NULL,

  tva_taux numeric(5,2),

  intervention_id uuid REFERENCES interventions(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_factures_lignes_facture_id ON factures_lignes(facture_id);
CREATE INDEX idx_factures_lignes_intervention_id
  ON factures_lignes(intervention_id)
  WHERE intervention_id IS NOT NULL;

COMMENT ON TABLE factures_lignes IS
  'Detail lisible des lignes de facture. Affichage UI + export comptable FEC.';
COMMENT ON COLUMN factures_lignes.type_ligne IS
  'Type de ligne : prestation, remise_palier, engagement_annuel, supplement, total.';
COMMENT ON COLUMN factures_lignes.intervention_id IS
  'Reference vers intervention validee (modele alpha : facture = prestations reelles).';
COMMENT ON COLUMN factures_lignes.tva_taux IS
  'Taux TVA applique a cette ligne. Pour conformite FEC (Fichier Ecritures Comptables).';