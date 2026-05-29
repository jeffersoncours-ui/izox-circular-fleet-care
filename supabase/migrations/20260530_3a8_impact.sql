-- ============================================================
-- Module 3.A.8 — Impact RSE / CSRD
-- Tables impact_coefficients + impact_records
-- Fonctions generate_impact_records + get_client_impact_summary
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLE impact_coefficients (config admin, CSRD-ready)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS impact_coefficients (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  category    TEXT        NOT NULL CHECK (category IN ('water','pollution','circular','ghg')),
  esrs_topic  TEXT,                  -- E1 | E2 | E3 | E5 (nullable MVP)
  ghg_scope   SMALLINT,              -- 1 | 2 | 3 (nullable, futur Scope)
  value       NUMERIC     NOT NULL,  -- coefficient par prestation (multiplicateur = 1)
  unit        TEXT        NOT NULL,
  source      TEXT,
  valid_from  DATE        NOT NULL DEFAULT CURRENT_DATE,
  valid_to    DATE,                  -- NULL = actif indéfiniment
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_impact_coeff_active ON impact_coefficients(code, active);

ALTER TABLE impact_coefficients ENABLE ROW LEVEL SECURITY;

-- Admin/staff : accès complet
CREATE POLICY "impact_coefficients_admin_staff_all" ON impact_coefficients
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','staff'))
  );

-- Client/commercial/operateur : lecture seule des coefficients actifs
CREATE POLICY "impact_coefficients_authenticated_select" ON impact_coefficients
  FOR SELECT TO authenticated
  USING (active = true);

CREATE TRIGGER trg_impact_coeff_updated_at
  BEFORE UPDATE ON impact_coefficients
  FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();


-- ────────────────────────────────────────────────────────────
-- 2. TABLE impact_records (calculé à chaque clôture d'intervention)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS impact_records (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id       UUID        NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  contrat_id            UUID        REFERENCES contrats(id) ON DELETE SET NULL,
  entreprise_id         UUID        NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  coefficient_id        UUID        REFERENCES impact_coefficients(id) ON DELETE SET NULL,
  -- Snapshot JSONB : traçabilité CSRD — le coefficient au moment du calcul
  coefficient_snapshot  JSONB       NOT NULL,
  category              TEXT        NOT NULL CHECK (category IN ('water','pollution','circular','ghg')),
  quantity              NUMERIC     NOT NULL,
  unit                  TEXT        NOT NULL,
  -- estimated = généré auto | validated = validé par admin
  status                TEXT        NOT NULL DEFAULT 'estimated'
                          CHECK (status IN ('estimated','validated')),
  validated_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_impact_records_entreprise    ON impact_records(entreprise_id, category);
CREATE INDEX IF NOT EXISTS idx_impact_records_intervention  ON impact_records(intervention_id);
CREATE INDEX IF NOT EXISTS idx_impact_records_status        ON impact_records(status);

ALTER TABLE impact_records ENABLE ROW LEVEL SECURITY;

-- Admin/staff : accès complet (validation, audit)
CREATE POLICY "impact_records_admin_staff_all" ON impact_records
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','staff'))
  );

-- Client : lecture uniquement SES records VALIDÉS (pas les estimations)
CREATE POLICY "impact_records_client_select_validated" ON impact_records
  FOR SELECT TO authenticated
  USING (
    status = 'validated'
    AND entreprise_id = get_user_entreprise(auth.uid())
  );


-- ────────────────────────────────────────────────────────────
-- 3. SEED des coefficients (valeurs IZOX provisoires, éditables admin)
-- ⚠️  co2_avoided est un PLACEHOLDER — À recalibrer avec la Base
--     Empreinte ADEME avant toute communication client officielle.
-- ────────────────────────────────────────────────────────────
INSERT INTO impact_coefficients (code, label, category, esrs_topic, value, unit, source)
VALUES
  ('water_saved',
   'Eau économisée / prestation',
   'water', 'E3', 140, 'L',
   'IZOX estimate (vs lavage traditionnel ~150 L, récupération via berme)'),

  ('pollution_avoided',
   'Eaux polluées évitées / prestation',
   'pollution', 'E2', 140, 'L',
   'IZOX estimate (eaux non rejetées au réseau — 100% récupérées)'),

  ('compost_produced',
   'Compost / terreau produit / prestation',
   'circular', 'E5', 0.2, 'kg',
   'IZOX estimate (déchets organiques valorisés en compost)'),

  ('co2_avoided',
   'CO2 évité / prestation',
   'ghg', 'E1', 0.5, 'kgCO2e',
   '⚠️ PLACEHOLDER — À recalibrer ADEME Base Empreinte v23 Scope 3 avant communication officielle')
ON CONFLICT (code) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 4. FONCTION generate_impact_records(p_intervention_id)
--    Appelée depuis le frontend après validation admin d'une intervention.
--    Multiplicateur = 1 (1 intervention = 1 véhicule dans le schéma actuel).
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_impact_records(p_intervention_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inter     RECORD;
  v_contrat   UUID;
  v_coeff     RECORD;
  v_inserted  INT := 0;
BEGIN
  SELECT * INTO v_inter FROM interventions WHERE id = p_intervention_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Intervention introuvable: %', p_intervention_id; END IF;
  IF v_inter.statut <> 'validee' THEN RAISE EXCEPTION 'Intervention non validée (statut: %)', v_inter.statut; END IF;
  IF v_inter.entreprise_id IS NULL THEN RAISE EXCEPTION 'Intervention sans entreprise_id'; END IF;

  -- Idempotence : si records existent déjà, on ne régénère pas
  IF EXISTS (SELECT 1 FROM impact_records WHERE intervention_id = p_intervention_id) THEN
    RETURN json_build_object('success', true, 'inserted', 0, 'note', 'already_generated');
  END IF;

  -- Résolution contrat_id via contrat_ligne_id → contrat_lignes
  IF v_inter.contrat_ligne_id IS NOT NULL THEN
    SELECT contrat_id INTO v_contrat FROM contrat_lignes WHERE id = v_inter.contrat_ligne_id;
  END IF;

  -- 1 record par coefficient actif (multiplicateur = 1 : 1 intervention = 1 véhicule)
  FOR v_coeff IN
    SELECT * FROM impact_coefficients WHERE active = true AND valid_to IS NULL
  LOOP
    INSERT INTO impact_records (
      intervention_id, contrat_id, entreprise_id,
      coefficient_id, coefficient_snapshot,
      category, quantity, unit, status
    ) VALUES (
      p_intervention_id,
      v_contrat,
      v_inter.entreprise_id,
      v_coeff.id,
      to_jsonb(v_coeff),
      v_coeff.category,
      v_coeff.value,
      v_coeff.unit,
      'estimated'
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'inserted', v_inserted);
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_impact_records(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_impact_records(UUID) FROM anon;


-- ────────────────────────────────────────────────────────────
-- 5. FONCTION get_client_impact_summary(p_entreprise_id)
--    Retourne totaux par catégorie + série temporelle 12 mois.
--    Accès : admin/staff/commercial ou le client propriétaire.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_client_impact_summary(p_entreprise_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok       BOOLEAN;
  v_totals   JSON;
  v_timeline JSON;
BEGIN
  v_ok := EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','staff','commercial'))
    OR get_user_entreprise(auth.uid()) = p_entreprise_id;

  IF NOT v_ok THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  -- Totaux par catégorie (records validés uniquement)
  SELECT json_agg(t ORDER BY t.category) INTO v_totals FROM (
    SELECT
      category,
      ROUND(SUM(quantity)::NUMERIC, 2) AS total,
      MIN(unit) AS unit,
      COUNT(*)::INT AS records_count
    FROM impact_records
    WHERE entreprise_id = p_entreprise_id AND status = 'validated'
    GROUP BY category
  ) t;

  -- Série temporelle mensuelle — 12 mois glissants, records validés
  SELECT json_agg(tm ORDER BY tm.month) INTO v_timeline FROM (
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
      ROUND(SUM(CASE WHEN category = 'water'      THEN quantity ELSE 0 END)::NUMERIC, 2) AS water,
      ROUND(SUM(CASE WHEN category = 'pollution'  THEN quantity ELSE 0 END)::NUMERIC, 2) AS pollution,
      ROUND(SUM(CASE WHEN category = 'circular'   THEN quantity ELSE 0 END)::NUMERIC, 2) AS circular,
      ROUND(SUM(CASE WHEN category = 'ghg'        THEN quantity ELSE 0 END)::NUMERIC, 2) AS ghg
    FROM impact_records
    WHERE entreprise_id = p_entreprise_id
      AND status = 'validated'
      AND created_at >= now() - INTERVAL '12 months'
    GROUP BY 1
  ) tm;

  RETURN json_build_object(
    'totals',   COALESCE(v_totals,   '[]'::JSON),
    'timeline', COALESCE(v_timeline, '[]'::JSON)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_impact_summary(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_client_impact_summary(UUID) FROM anon;
