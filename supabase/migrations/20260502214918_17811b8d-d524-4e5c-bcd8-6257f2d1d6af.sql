-- ============================================================
-- 3.A.1.a — ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE engagement_type_enum AS ENUM ('mensuel','trimestriel','annuel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_cycle_enum AS ENUM ('onboarding','actif','dormant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE planning_niveau_enum AS ENUM ('libre','demi_journee','journee','recurrent_annuel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3.A.1.b — COLONNES
-- ============================================================
ALTER TABLE contrats
  ADD COLUMN IF NOT EXISTS engagement_type engagement_type_enum,
  ADD COLUMN IF NOT EXISTS multiplicateur_prix numeric(4,3),
  ADD COLUMN IF NOT EXISTS status_cycle status_cycle_enum NOT NULL DEFAULT 'onboarding',
  ADD COLUMN IF NOT EXISTS planning_niveau planning_niveau_enum,
  ADD COLUMN IF NOT EXISTS paiement_anticipe_total boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_paiement_anticipe date,
  ADD COLUMN IF NOT EXISTS preavis_envoye_le date,
  ADD COLUMN IF NOT EXISTS preavis_deadline date,
  ADD COLUMN IF NOT EXISTS date_fin_engagement date,
  ADD COLUMN IF NOT EXISTS date_dernier_passage date,
  ADD COLUMN IF NOT EXISTS plage_horaire_preferee text;

COMMENT ON COLUMN contrats.engagement_type IS 'Type d''engagement contractuel : mensuel (+15%), trimestriel (reference), annuel (-5%)';
COMMENT ON COLUMN contrats.multiplicateur_prix IS 'Multiplicateur de prix fige a la signature : 1.150 mensuel, 1.000 trimestriel, 0.950 annuel. Synchronise auto par trigger avec engagement_type.';
COMMENT ON COLUMN contrats.status_cycle IS 'Cycle de vie commercial du client : onboarding (30 premiers jours), actif, dormant (28j sans passage). Independant du statut administratif (statut).';
COMMENT ON COLUMN contrats.planning_niveau IS 'Niveau de planning selon taille flotte. Calcule auto par trigger sur contrat_lignes.';
COMMENT ON COLUMN contrats.paiement_anticipe_total IS 'true si client a paye la totalite du contrat a la signature';
COMMENT ON COLUMN contrats.date_paiement_anticipe IS 'Date du paiement anticipe total si applicable';
COMMENT ON COLUMN contrats.preavis_envoye_le IS 'Date a laquelle le client a envoye son preavis de resiliation';
COMMENT ON COLUMN contrats.preavis_deadline IS 'Date limite avant laquelle le client doit envoyer son preavis. Calcule auto.';
COMMENT ON COLUMN contrats.date_fin_engagement IS 'Date de fin de l''engagement contractuel. Calcule auto selon type.';
COMMENT ON COLUMN contrats.date_dernier_passage IS 'Date de la derniere prestation validee. Mis a jour par trigger sur interventions (envoi 3.A.4).';
COMMENT ON COLUMN contrats.plage_horaire_preferee IS 'Plage horaire preferee texte libre (ex : Mardi matin 8h-10h). Pour Niveau 4 = recurrent.';

-- ============================================================
-- 3.A.1.e — TRIGGERS (avant les CHECK pour ne pas casser le backfill)
-- ============================================================

-- Trigger 1 : sync multiplicateur_prix <- engagement_type
CREATE OR REPLACE FUNCTION trg_sync_multiplicateur_prix()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.engagement_type IS NOT NULL THEN
    NEW.multiplicateur_prix := CASE NEW.engagement_type
      WHEN 'mensuel' THEN 1.150
      WHEN 'trimestriel' THEN 1.000
      WHEN 'annuel' THEN 0.950
    END;
  ELSE
    NEW.multiplicateur_prix := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contrats_sync_multiplicateur ON contrats;
CREATE TRIGGER trg_contrats_sync_multiplicateur
BEFORE INSERT OR UPDATE OF engagement_type ON contrats
FOR EACH ROW EXECUTE FUNCTION trg_sync_multiplicateur_prix();

-- Trigger 2 : calcul date_fin_engagement
CREATE OR REPLACE FUNCTION trg_calc_date_fin_engagement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.date_debut IS NOT NULL AND NEW.engagement_type IS NOT NULL THEN
    NEW.date_fin_engagement := CASE NEW.engagement_type
      WHEN 'mensuel' THEN (NEW.date_debut + INTERVAL '1 month')::date
      WHEN 'trimestriel' THEN (NEW.date_debut + INTERVAL '3 months')::date
      WHEN 'annuel' THEN (NEW.date_debut + INTERVAL '12 months')::date
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contrats_date_fin_engagement ON contrats;
CREATE TRIGGER trg_contrats_date_fin_engagement
BEFORE INSERT OR UPDATE OF date_debut, engagement_type ON contrats
FOR EACH ROW EXECUTE FUNCTION trg_calc_date_fin_engagement();

-- Trigger 3 : calcul preavis_deadline
CREATE OR REPLACE FUNCTION trg_calc_preavis_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.date_fin_engagement IS NOT NULL AND NEW.engagement_type IS NOT NULL THEN
    NEW.preavis_deadline := CASE NEW.engagement_type
      WHEN 'mensuel' THEN (NEW.date_fin_engagement - INTERVAL '1 month')::date
      WHEN 'trimestriel' THEN (NEW.date_fin_engagement - INTERVAL '1 month')::date
      WHEN 'annuel' THEN (NEW.date_fin_engagement - INTERVAL '2 months')::date
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contrats_preavis_deadline ON contrats;
CREATE TRIGGER trg_contrats_preavis_deadline
BEFORE INSERT OR UPDATE OF date_fin_engagement, engagement_type ON contrats
FOR EACH ROW EXECUTE FUNCTION trg_calc_preavis_deadline();

-- Trigger 4 : calcul planning_niveau via contrat_lignes
CREATE OR REPLACE FUNCTION trg_calc_planning_niveau()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  nb_vehicules_total integer;
  v_contrat_id uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_contrat_id := OLD.contrat_id;
  ELSE
    v_contrat_id := NEW.contrat_id;
    IF (TG_OP = 'UPDATE') THEN
      IF (OLD.nb_vehicules = NEW.nb_vehicules
          AND OLD.statut_ligne = NEW.statut_ligne
          AND OLD.contrat_id = NEW.contrat_id) THEN
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  SELECT COALESCE(SUM(nb_vehicules), 0) INTO nb_vehicules_total
  FROM contrat_lignes
  WHERE contrat_id = v_contrat_id AND statut_ligne = 'actif';

  UPDATE contrats SET planning_niveau = CASE
    WHEN nb_vehicules_total <= 4 THEN 'libre'::planning_niveau_enum
    WHEN nb_vehicules_total <= 8 THEN 'demi_journee'::planning_niveau_enum
    WHEN nb_vehicules_total <= 15 THEN 'journee'::planning_niveau_enum
    ELSE 'recurrent_annuel'::planning_niveau_enum
  END
  WHERE id = v_contrat_id;

  IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_contrat_lignes_planning_niveau ON contrat_lignes;
CREATE TRIGGER trg_contrat_lignes_planning_niveau
AFTER INSERT OR UPDATE OR DELETE ON contrat_lignes
FOR EACH ROW EXECUTE FUNCTION trg_calc_planning_niveau();

-- ============================================================
-- 3.A.1.f — BACKFILL (avant les CHECK pour fournir des valeurs coherentes)
-- ============================================================
UPDATE contrats
SET
  engagement_type = 'trimestriel',
  status_cycle = CASE
    WHEN statut = 'resilie' THEN 'actif'::status_cycle_enum
    WHEN created_at::date < (CURRENT_DATE - INTERVAL '30 days') THEN 'actif'::status_cycle_enum
    ELSE 'onboarding'::status_cycle_enum
  END
WHERE engagement_type IS NULL;

-- Forcer recalcul des champs derives via no-op
UPDATE contrats SET date_debut = date_debut WHERE date_debut IS NOT NULL;
UPDATE contrat_lignes SET nb_vehicules = nb_vehicules + 0;

-- ============================================================
-- 3.A.1.c — CONTRAINTES CHECK (apres backfill)
-- ============================================================
ALTER TABLE contrats DROP CONSTRAINT IF EXISTS chk_multiplicateur_coherent;
ALTER TABLE contrats ADD CONSTRAINT chk_multiplicateur_coherent CHECK (
  (engagement_type IS NULL AND multiplicateur_prix IS NULL)
  OR (engagement_type = 'mensuel' AND multiplicateur_prix = 1.150)
  OR (engagement_type = 'trimestriel' AND multiplicateur_prix = 1.000)
  OR (engagement_type = 'annuel' AND multiplicateur_prix = 0.950)
);

ALTER TABLE contrats DROP CONSTRAINT IF EXISTS chk_paiement_anticipe_coherent;
ALTER TABLE contrats ADD CONSTRAINT chk_paiement_anticipe_coherent CHECK (
  (paiement_anticipe_total = false)
  OR (paiement_anticipe_total = true AND date_paiement_anticipe IS NOT NULL)
);

ALTER TABLE contrats DROP CONSTRAINT IF EXISTS chk_preavis_avant_fin;
ALTER TABLE contrats ADD CONSTRAINT chk_preavis_avant_fin CHECK (
  preavis_deadline IS NULL
  OR date_fin_engagement IS NULL
  OR preavis_deadline < date_fin_engagement
);

-- ============================================================
-- 3.A.1.g — INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contrats_status_cycle
  ON contrats(status_cycle) WHERE statut = 'actif';

CREATE INDEX IF NOT EXISTS idx_contrats_date_fin_engagement
  ON contrats(date_fin_engagement) WHERE statut = 'actif';

CREATE INDEX IF NOT EXISTS idx_contrats_date_dernier_passage
  ON contrats(date_dernier_passage) WHERE statut = 'actif';