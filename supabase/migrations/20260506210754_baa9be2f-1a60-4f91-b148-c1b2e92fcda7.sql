-- ============================================================
-- A. Machine à états des transitions de statut (factures)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_factures_machine_etats()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.statut = NEW.statut THEN
    RETURN NEW;
  END IF;

  IF OLD.statut = 'brouillon' THEN
    IF NEW.statut = 'emise' THEN
      IF NEW.numero_facture IS NULL
         OR NEW.numero_sequentiel IS NULL
         OR NEW.date_emission IS NULL
         OR NEW.emitted_at IS NULL THEN
        RAISE EXCEPTION 'Transition invalide brouillon->emise : numero_facture, numero_sequentiel, date_emission et emitted_at doivent etre remplis simultanement.';
      END IF;
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Transition invalide : un brouillon ne peut passer qu''a emise (tentative : brouillon->%). Pour annuler un brouillon, le supprimer.', NEW.statut;
    END IF;
  END IF;

  IF OLD.statut = 'emise' THEN
    IF NEW.statut = 'payee' THEN
      IF NEW.date_paiement IS NULL THEN
        RAISE EXCEPTION 'Transition emise->payee : date_paiement doit etre renseignee.';
      END IF;
      RETURN NEW;
    END IF;
    IF NEW.statut = 'annulee' THEN
      IF NEW.avoir_id IS NULL THEN
        RAISE EXCEPTION 'Transition emise->annulee : un avoir doit etre lie via avoir_id avant de basculer en annulee.';
      END IF;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Transition invalide emise->%. Seuls payee et annulee sont autorises.', NEW.statut;
  END IF;

  IF OLD.statut = 'payee' THEN
    IF NEW.statut = 'annulee' THEN
      IF NEW.avoir_id IS NULL THEN
        RAISE EXCEPTION 'Transition payee->annulee : un avoir doit etre lie via avoir_id. La trace du paiement est conservee dans snapshot.';
      END IF;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Transition invalide payee->%. Une facture payee ne peut etre que annulee (via avoir). Aucune regression possible.', NEW.statut;
  END IF;

  IF OLD.statut = 'annulee' THEN
    RAISE EXCEPTION 'Transition invalide annulee->%. Une facture annulee est dans un statut terminal definitif.', NEW.statut;
  END IF;

  RAISE EXCEPTION 'Transition de statut non geree : %->% sur facture %',
    OLD.statut, NEW.statut, OLD.numero_facture;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trg_factures_machine_etats ON factures;
CREATE TRIGGER trg_factures_machine_etats
BEFORE UPDATE OF statut ON factures
FOR EACH ROW
WHEN (OLD.statut IS DISTINCT FROM NEW.statut)
EXECUTE FUNCTION trg_factures_machine_etats();

-- ============================================================
-- B. Immutabilité des champs après émission (factures)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_protect_facture_immuable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.statut = 'brouillon' THEN
    RETURN NEW;
  END IF;

  IF OLD.numero_facture IS DISTINCT FROM NEW.numero_facture
    OR OLD.numero_sequentiel IS DISTINCT FROM NEW.numero_sequentiel
    OR OLD.serie IS DISTINCT FROM NEW.serie
    OR OLD.annee_fiscale IS DISTINCT FROM NEW.annee_fiscale
    OR OLD.contrat_id IS DISTINCT FROM NEW.contrat_id
    OR OLD.entreprise_id IS DISTINCT FROM NEW.entreprise_id
    OR OLD.periode_debut IS DISTINCT FROM NEW.periode_debut
    OR OLD.periode_fin IS DISTINCT FROM NEW.periode_fin
    OR OLD.date_emission IS DISTINCT FROM NEW.date_emission
    OR OLD.date_echeance IS DISTINCT FROM NEW.date_echeance
    OR OLD.montant_ht IS DISTINCT FROM NEW.montant_ht
    OR OLD.tva_taux IS DISTINCT FROM NEW.tva_taux
    OR OLD.tva_montant IS DISTINCT FROM NEW.tva_montant
    OR OLD.montant_ttc IS DISTINCT FROM NEW.montant_ttc
    OR OLD.devise IS DISTINCT FROM NEW.devise
    OR OLD.regime_tva IS DISTINCT FROM NEW.regime_tva
    OR OLD.mention_tva_speciale IS DISTINCT FROM NEW.mention_tva_speciale
    OR OLD.mode_paiement IS DISTINCT FROM NEW.mode_paiement
    OR OLD.snapshot_client IS DISTINCT FROM NEW.snapshot_client
    OR OLD.snapshot_izox IS DISTINCT FROM NEW.snapshot_izox
    OR OLD.snapshot_contrat IS DISTINCT FROM NEW.snapshot_contrat
    OR OLD.snapshot_prestations IS DISTINCT FROM NEW.snapshot_prestations
    OR OLD.emitted_at IS DISTINCT FROM NEW.emitted_at
    OR OLD.created_at IS DISTINCT FROM NEW.created_at
    OR OLD.created_by IS DISTINCT FROM NEW.created_by
  THEN
    RAISE EXCEPTION 'Modification interdite : facture % deja emise (statut %). Pour annuler ou corriger, emettre un avoir.',
      OLD.numero_facture, OLD.statut;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trg_factures_protect_immuable ON factures;
CREATE TRIGGER trg_factures_protect_immuable
BEFORE UPDATE ON factures
FOR EACH ROW
EXECUTE FUNCTION trg_protect_facture_immuable();

-- ============================================================
-- C. Suppression interdite après émission (factures)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_factures_no_delete_emise()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.statut != 'brouillon' THEN
    RAISE EXCEPTION 'Suppression interdite : facture % deja emise (statut %). Pour annuler, emettre un avoir.',
      OLD.numero_facture, OLD.statut;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trg_factures_no_delete ON factures;
CREATE TRIGGER trg_factures_no_delete
BEFORE DELETE ON factures
FOR EACH ROW
EXECUTE FUNCTION trg_factures_no_delete_emise();

-- ============================================================
-- D. Avoirs totalement immuables (UPDATE + DELETE)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_avoirs_immuables()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Modification d''avoir interdite : %. Les avoirs sont totalement immuables apres emission. Pour corriger, emettre un nouvel avoir.',
      OLD.numero_avoir;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Suppression d''avoir interdite : %. Les avoirs sont conservation 10 ans (Code de commerce L123-22).',
      OLD.numero_avoir;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trg_avoirs_no_update ON avoirs;
CREATE TRIGGER trg_avoirs_no_update
BEFORE UPDATE ON avoirs
FOR EACH ROW
EXECUTE FUNCTION trg_avoirs_immuables();

DROP TRIGGER IF EXISTS trg_avoirs_no_delete ON avoirs;
CREATE TRIGGER trg_avoirs_no_delete
BEFORE DELETE ON avoirs
FOR EACH ROW
EXECUTE FUNCTION trg_avoirs_immuables();

-- ============================================================
-- E. Documentation procédure de secours admin
-- ============================================================
COMMENT ON FUNCTION trg_protect_facture_immuable() IS
'Bloque toute modification des champs sensibles d''une facture apres emission. PROCEDURE DE SECOURS : en cas d''incident critique, un admin peut temporairement desactiver les triggers via ALTER TABLE factures DISABLE TRIGGER trg_factures_protect_immuable. Tracer l''operation dans admin_actions_log avec motif obligatoire avant toute intervention. Reactiver immediatement apres la correction minimale necessaire.';

COMMENT ON FUNCTION trg_avoirs_immuables() IS
'Empeche toute modification ou suppression d''avoir. Les avoirs sont conservation 10 ans (Code de commerce L123-22). PROCEDURE DE SECOURS : meme protocole que pour factures, via DISABLE TRIGGER explicite et trace admin_actions_log obligatoire.';